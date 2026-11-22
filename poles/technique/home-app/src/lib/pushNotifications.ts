export type PushState = "active" | "default" | "denied" | "unsupported" | "install_required" | "error";

type PushSubscriptionJSON = { endpoint: string; keys: { p256dh: string; auth: string } };

const base64URLToBytes = (value: string) => {
  const padded = value.padEnd(value.length + (4 - value.length % 4) % 4, "=").replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(padded); return Uint8Array.from(bytes, char => char.charCodeAt(0));
};
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
  if (await Notification.requestPermission() !== "granted") throw new Error("permission_denied");
  const config = await fetch("/v1/notifications/push/config", { cache: "no-store" });
  if (!config.ok) throw new Error("push_configuration_unavailable");
  const { publicKey } = await config.json() as { publicKey?: string };
  if (!publicKey) throw new Error("push_configuration_unavailable");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64URLToBytes(publicKey) });
  const payload = subscription.toJSON() as PushSubscriptionJSON;
  const response = await fetch("/v1/notifications/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) { await subscription.unsubscribe(); throw new Error("push_subscription_unavailable"); }
}

export async function disablePushNotifications(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const response = await fetch("/v1/notifications/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
  if (!response.ok) throw new Error("push_unsubscribe_unavailable");
  await subscription.unsubscribe();
}
