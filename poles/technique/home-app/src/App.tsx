import { useEffect, useState } from "react";
import { Orb } from "@yogesharc/thinking-orbs";
import { Bell, CheckCheck, Home, Lightbulb, RotateCcw, Smartphone, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHomeDevices, getDeviceState, setDeviceSwitch, type HomeDevice, type DeviceState } from "@/lib/homeControl";
import { useVoice } from "@/lib/useVoice";

type View = "home" | "devices" | "chores" | "reminders";
const navigation = [
  { id: "home", label: "Accueil", icon: Home },
  { id: "devices", label: "Domotique", icon: Lightbulb },
  { id: "chores", label: "Tâches ménagères", icon: CheckCheck },
  { id: "reminders", label: "Rappels", icon: Bell },
] as const;

function Devices() {
  const [devices, setDevices] = useState<HomeDevice[]>([]);
  const [states, setStates] = useState<Record<string, DeviceState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setDevices([]); setStates({});
    void getHomeDevices(controller.signal).then(async inventory => {
      if (controller.signal.aborted) return;
      setDevices(inventory);
      const results = await Promise.allSettled(inventory.map(device => getDeviceState(device.id, controller.signal)));
      if (controller.signal.aborted) return;
      const next: Record<string, DeviceState> = {};
      results.forEach(result => { if (result.status === "fulfilled") next[result.value.deviceId] = result.value; });
      setStates(next);
    }).catch(() => { if (!controller.signal.aborted) setError("Impossible de joindre Home Core. Vérifiez votre connexion et vos autorisations."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  const toggle = async (device: HomeDevice) => {
    setPending(items => [...items, device.id]); setError("");
    try { const state = await setDeviceSwitch(device.id, !states[device.id]?.switchOn); setStates(items => ({ ...items, [device.id]: state })); }
    catch { setError("La commande n’a pas été confirmée. Actualisez l’état avant de réessayer."); setStates(items => { const next = { ...items }; delete next[device.id]; return next; }); }
    finally { setPending(items => items.filter(id => id !== device.id)); }
  };
  return <section className="content"><div className="section-heading"><div><p className="eyebrow">Votre maison</p><h1>Domotique</h1></div><Button variant="ghost" size="icon" aria-label="Actualiser les appareils" onClick={() => setAttempt(value => value + 1)}><RotateCcw size={19} /></Button></div>
    {error && <p role="alert" className="notice">{error}</p>}
    {loading ? <p className="empty">Chargement des appareils…</p> : !error && !devices.length ? <div className="empty"><Lightbulb /><h2>Aucun appareil</h2><p>Les appareils autorisés par Home Core apparaîtront ici.</p></div> : null}
    <div className="device-list">{devices.map(device => {
      const state = states[device.id]; const busy = pending.includes(device.id);
      const controllable = device.capabilities.includes("switch") && state?.online && typeof state.switchOn === "boolean";
      return <article className="device" key={device.id}><div className={"device-icon " + (state?.switchOn ? "on" : "")}><Lightbulb size={22} /></div><div className="device-description"><h2>{device.name}</h2><p>{device.room} · {!state ? "État inconnu" : !state.online ? "Hors ligne" : state.switchOn === undefined ? "Connecté" : state.switchOn ? "Allumé" : "Éteint"}</p></div><Button variant="secondary" disabled={!controllable || busy} onClick={() => void toggle(device)} aria-label={`${state?.switchOn ? "Éteindre" : "Allumer"} ${device.name}`}>{busy ? "…" : state?.switchOn ? "Éteindre" : "Allumer"}</Button></article>;
    })}</div>
  </section>;
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [online, setOnline] = useState(navigator.onLine);
  const voice = useVoice(view === "home");
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  const listening = voice.phase === "listening";
  const thinking = voice.phase === "thinking";
  return <><div className="app-shell">
    {!online && <div className="offline" role="status"><WifiOff size={14} /> Hors connexion · Home Core inaccessible</div>}
    {view === "home" ? <main className="home-stage"><Button variant="ghost" className="orb-button" disabled={thinking} aria-label={listening ? "Terminer et envoyer l’enregistrement" : "Parler à Home Core"} aria-pressed={listening} onClick={() => void voice.toggle()}>{listening ? <Orb state="using" variant="record" size={224} speed={1} label="Écoute en cours" /> : thinking ? <Orb state="reasoning" size={224} label="Traitement en cours" /> : <Orb state="idle" size={224} speed={0.65} label="Assistant Home Core" />}</Button><div className="voice-feedback" role="status" aria-live="polite"><p className="voice-hint">{listening ? "Je vous écoute…" : thinking ? "Un instant…" : "Touchez pour parler"}</p>{listening && <p className="voice-detail">Touchez à nouveau pour envoyer</p>}{voice.transcript && <p className="transcript">« {voice.transcript} »</p>}{voice.message && <p className={voice.phase === "error" ? "voice-detail error" : "voice-answer"}>{voice.message}</p>}</div></main> : <main className="page" key={view}>{view === "devices" ? <Devices /> : <section className="content"><p className="eyebrow">Votre quotidien</p><h1>{view === "chores" ? "Tâches ménagères" : "Rappels"}</h1><div className="empty">{view === "chores" ? <CheckCheck /> : <Bell />}<h2>Un peu de place pour l’essentiel.</h2><p>{view === "chores" ? "Les tâches du foyer seront réunies ici." : "Vos prochains rappels seront réunis ici."}</p><span className="coming">Connexion à Home Core à venir</span></div></section>}</main>}
    <nav className="bottom-bar" aria-label="Navigation principale">{navigation.map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" className={"nav-item " + (view === id ? "active" : "")} aria-label={label} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}><Icon size={21} strokeWidth={1.65} /><span>{id === "chores" ? "Tâches" : label}</span></Button>)}</nav>
  </div><div className="landscape-guard" role="alert"><Smartphone size={38} strokeWidth={1.2} /><h1>Tout simplement, en portrait.</h1><p>Remettez votre téléphone à la verticale<br />pour retrouver votre maison.</p></div></>;
}
