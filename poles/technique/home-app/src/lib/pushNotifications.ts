export type PushState = "active" | "default" | "denied" | "unsupported" | "install_required" | "error";

type PushSubscriptionJSON = { endpoint: string; keys: { p256dh: string; auth: string } };

export type PushErrorCode =
  | "permission_denied"
  | "push_not_available"
  | "push_configuration_unavailable"
  | "push_registration_unavailable"
  | "push_subscription_unavailable"
  | "push_network_unavailable";

const base64URLToBytes = (value: string) => {
  const padded = value.padEnd(value.length + (4 - value.length % 4) % 4, "=").replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(padded); return Uint8Array.from(bytes, char => char.charCodeAt(0));
};
const sameBytes = (left: ArrayBuffer | null, right: Uint8Array) => left !== null && left.byteLength === right.byteLength && new Uint8Array(left).every((value, index) => value === right[index]);
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

export function pushSupport(): PushState {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (isIOS() && !isStandalone()) return "install_required";
  if (Notification.permission === "denied") return "denied";
  return "default";
}

export async function currentPushState(): Promise<PushState> {
  const support = pushSupport(); if (support !== "default") return support;
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription() ? "active" : "default";
}

export async function enablePushNotifications(): Promise<void> {
  if (pushSupport() !== "default") throw new Error("push_not_available");

  // iOS requires this call to remain directly triggered by the user's tap.
  if (await Notification.requestPermission() !== "granted") throw new Error("permission_denied");
  try {
    const config = await fetch("/v1/notifications/push/config", { cache: "no-store" });
    if (!config.ok) throw new Error("push_configuration_unavailable");
    const { publicKey } = await config.json() as { publicKey?: string };
    if (!publicKey) throw new Error("push_configuration_unavailable");

    const applicationServerKey = base64URLToBytes(publicKey);
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    let subscription = await registration.pushManager.getSubscription();
    if (subscription && subscription.options.applicationServerKey && !sameBytes(subscription.options.applicationServerKey, applicationServerKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    const createdSubscription = !subscription;
    if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });

    const payload = subscription.toJSON() as PushSubscriptionJSON;
    if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys.auth) throw new Error("push_registration_unavailable");
    const response = await fetch("/v1/notifications/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) {
      if (createdSubscription) await subscription.unsubscribe();
      throw new Error("push_subscription_unavailable");
    }
  } catch (error) {
    if (error instanceof Error && (error.message as PushErrorCode).startsWith("push_")) throw error;
    throw new Error("push_network_unavailable");
  }
}

export function pushErrorMessage(reason: unknown): string {
  const code = reason instanceof Error ? reason.message : "";
  switch (code) {
    case "permission_denied": return "L’autorisation a été refusée dans les réglages du navigateur.";
    case "push_not_available": return "Installez Home AI sur l’écran d’accueil, puis ouvrez cette application installée.";
    case "push_configuration_unavailable": return "Le serveur de notifications n’est pas prêt. Réessayez dans quelques instants.";
    case "push_registration_unavailable": return "Le navigateur n’a pas pu créer l’abonnement de cet appareil.";
    case "push_subscription_unavailable": return "L’abonnement n’a pas pu être enregistré auprès de Home Core.";
    default: return "La connexion au serveur de notifications a échoué. Vérifiez le réseau puis réessayez.";
  }
}

export async function disablePushNotifications(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const response = await fetch("/v1/notifications/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
  if (!response.ok) throw new Error("push_unsubscribe_unavailable");
  await subscription.unsubscribe();
}
