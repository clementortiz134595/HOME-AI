import { useEffect, useState } from "react";
import { AssistantOrb } from "@/components/AssistantOrb";
import { Bell, CheckCheck, ChevronRight, Home, Lightbulb, RotateCcw, Server, Smartphone, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHomeDevices, getDeviceHistory, getDeviceState, setDeviceSwitch, getChores, type HomeDevice, type DeviceState, type Chore, type Measurement } from "@/lib/homeControl";
import { useVoice } from "@/lib/useVoice";
import { responseKind, responseLabels } from "@/lib/assistant";
import { useResponseData } from "@/lib/useResponseData";
import { SearchProgress } from "@/components/SearchProgress";
import { SmartResponse } from "@/components/responses/SmartResponse";
import { SystemHealth } from "@/components/SystemHealth";

type View = "home" | "devices" | "chores" | "reminders" | "system";
const navigation = [
  { id: "home", label: "Accueil", icon: Home },
  { id: "devices", label: "Domotique", icon: Lightbulb },
  { id: "chores", label: "Tâches ménagères", icon: CheckCheck },
  { id: "reminders", label: "Rappels", icon: Bell },
  { id: "system", label: "Système", icon: Server },
] as const;

function Devices() {
  const [devices, setDevices] = useState<HomeDevice[]>([]);
  const [states, setStates] = useState<Record<string, DeviceState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<HomeDevice | null>(null);
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
  // Home Assistant's state endpoint does not always include an area. Keep
  // these devices reachable instead of producing an empty, untappable room.
  const roomName = (device: HomeDevice) => device.room?.trim() || "Tous les appareils";
  const rooms = Array.from(new Set(devices.map(roomName))).sort();
  const visibleDevices = selectedRoom === null ? [] : devices.filter(device => roomName(device) === selectedRoom);
  return <section className="content"><div className="section-heading"><div><p className="eyebrow">Votre maison</p><h1>Domotique</h1></div><Button variant="ghost" size="icon" aria-label="Actualiser les appareils" onClick={() => setAttempt(value => value + 1)}><RotateCcw size={19} /></Button></div>
    {error && <p role="alert" className="notice">{error}</p>}
    {loading ? <p className="empty">Chargement des appareils…</p> : !error && !devices.length ? <div className="empty"><Lightbulb /><h2>Aucun appareil</h2><p>Les appareils autorisés par Home Core apparaîtront ici.</p></div> : null}
    {!loading && !error && devices.length > 0 && selectedRoom === null && <div className="room-list">{rooms.map(room => <button type="button" className="room-card" key={room} onClick={() => setSelectedRoom(room)} aria-label={`Ouvrir ${room}`}><div><p className="room-label">Pièce</p><h2>{room}</h2><span>{devices.filter(device => roomName(device) === room).length} appareils</span></div><ChevronRight aria-hidden="true" size={20} /></button>)}</div>}
    {selectedRoom !== null && <><button type="button" className="back-link" onClick={() => setSelectedRoom(null)}>← Toutes les pièces</button><h2 className="room-title">{selectedRoom}</h2></>}
    <div className="device-list">{visibleDevices.map(device => {
      const state = states[device.id]; const busy = pending.includes(device.id);
      const controllable = device.capabilities.includes("switch") && state?.online && typeof state.switchOn === "boolean";
      const sensorDetails = state?.temperatureC == null ? "Mesure indisponible" : `${state.temperatureC.toFixed(1)} °C${state.humidityPercent == null ? "" : ` · ${Math.round(state.humidityPercent)} %`}${state.batteryPercent == null ? "" : ` · batterie ${Math.round(state.batteryPercent)} %`}`;
      const opensHistory = device.kind === "temperature_sensor";
      return <article className="device" key={device.id} onClick={() => opensHistory && setSelectedSensor(device)} role={opensHistory ? "button" : undefined} tabIndex={opensHistory ? 0 : undefined} onKeyDown={event => { if (opensHistory && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedSensor(device); } }}><div className={"device-icon " + (state?.switchOn ? "on" : "")}><Lightbulb size={22} /></div><div className="device-description"><h2>{device.name}</h2><p>{device.kind === "temperature_sensor" ? sensorDetails : !state ? "État inconnu" : !state.online ? "Hors ligne" : state.switchOn === undefined ? "Connecté" : state.switchOn ? "Allumé" : "Éteint"}</p></div>{device.capabilities.includes("switch") && <button type="button" className={"switch " + (state?.switchOn ? "checked" : "")} disabled={!controllable || busy} onClick={() => void toggle(device)} role="switch" aria-checked={Boolean(state?.switchOn)} aria-label={`${state?.switchOn ? "Éteindre" : "Allumer"} ${device.name}`}><span /></button>}</article>;
    })}</div>
    {selectedSensor && <SensorHistory sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />}
  </section>;
}

function SensorHistory({ sensor, onClose }: { sensor: HomeDevice; onClose: () => void }) {
  const [points, setPoints] = useState<Measurement[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void getDeviceHistory(sensor.id, controller.signal).then(setPoints).catch(() => setPoints([]));
    return () => controller.abort();
  }, [sensor.id]);
  const temperature = points.flatMap(point => point.temperatureC == null ? [] : [point.temperatureC]);
  const humidity = points.flatMap(point => point.humidityPercent == null ? [] : [point.humidityPercent]);
  const polyline = (values: number[]) => {
    const min = Math.min(...values); const max = Math.max(...values);
    return values.map((value, index) => `${10 + index * 320 / Math.max(values.length - 1, 1)},${100 - (value - min) * 80 / (max - min || 1)}`).join(" ");
  };
  const hasHistory = temperature.length > 0 || humidity.length > 0;
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Historique ${sensor.name}`}><section className="sensor-history"><Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer"><X /></Button><h2>{sensor.name}</h2><p>Historique sur 24 heures</p>{hasHistory ? <><svg viewBox="0 0 340 120" role="img" aria-label="Historique de température et humidité">{temperature.length > 0 && <polyline points={polyline(temperature)} fill="none" stroke="#a78bfa" strokeWidth="3" />}{humidity.length > 0 && <polyline points={polyline(humidity)} fill="none" stroke="#67e8f9" strokeWidth="3" />}</svg><p className="history-legend"><span className="temperature">Température · {temperature.length} relevés</span><span className="humidity">Humidité · {humidity.length} relevés</span></p></> : <p>Historique indisponible pour le moment.</p>}</section></div>;
}

function HouseholdList({ kind }: { kind: "chores" | "reminders" }) {
  const [items, setItems] = useState<Array<Chore | { id: string; title: string; date: string; details?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { const controller = new AbortController(); const load = async () => { try { if (kind === "chores") setItems(await getChores(controller.signal)); else { const response = await fetch("/v1/reminders", { signal: controller.signal }); if (!response.ok) throw new Error(); const data = await response.json() as { reminders?: Array<{ id: string; title: string; date: string; details?: string }> }; setItems(data.reminders ?? []); } } catch { if (!controller.signal.aborted) setError(`Impossible de charger ${kind === "chores" ? "les tâches" : "les rappels"} depuis Home Core.`); } finally { if (!controller.signal.aborted) setLoading(false); } }; void load(); return () => controller.abort(); }, [kind]);
  return <section className="content"><div className="section-heading"><div><p className="eyebrow">Votre quotidien</p><h1>{kind === "chores" ? "Tâches ménagères" : "Rappels"}</h1></div><Button variant="ghost" size="icon" aria-label="Actualiser" onClick={() => window.location.reload()}><RotateCcw size={19} /></Button></div>{error && <p role="alert" className="notice">{error}</p>}{loading ? <p className="empty">Chargement…</p> : !items.length ? <div className="empty"><CheckCheck /><h2>Aucun élément</h2><p>Home Core ne renvoie aucun élément pour le moment.</p></div> : <div className="household-list">{items.map(item => "objective" in item ? <article className="household-item" key={item.id}><div><h2>{item.objective}</h2><p>{item.assignees.join(" · ") || "Foyer"}{item.dueDate ? ` · ${item.dueDate}` : ""}</p></div><span className={item.completed ? "item-state done" : "item-state"}>{item.completed ? "Fait" : "À faire"}</span></article> : <article className="household-item" key={item.id}><div><h2>{item.title}</h2><p>{item.date}{item.details ? ` · ${item.details}` : ""}</p></div></article>)}</div>}</section>;
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [online, setOnline] = useState(navigator.onLine);
  const voice = useVoice(view === "home");
  const kind = responseKind(voice.transcript, voice.answer);
  const source = useResponseData(kind, view === "home" ? voice.answer : null, voice.transcript);
  const workspace = voice.phase === "thinking" || voice.phase === "answered" || Boolean(voice.answer) || (voice.phase === "error" && Boolean(voice.transcript));
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  const listening = voice.phase === "listening";
  const thinking = voice.phase === "thinking";
  const busy = thinking || voice.phase === "requesting" || voice.phase === "transcribing";
  return <><div className="app-shell">
    {!online && <div className="offline" role="status"><WifiOff size={14} /> Hors connexion · Home Core inaccessible</div>}
    {view === "home" ? workspace ? <main className="home-workspace" aria-label="Recherche et réponse">
      <header className="workspace-header"><Button variant="ghost" className={`compact-orb orb-${voice.phase}`} disabled={busy} onClick={() => void voice.toggle()} aria-label="Nouvelle demande vocale"><AssistantOrb phase={source.state === "loading" ? "thinking" : voice.phase} size={52} /></Button><div><p className="eyebrow">{source.state === "loading" ? "Lecture des résultats" : voice.phase === "thinking" ? "Recherche en cours" : voice.phase === "error" ? "Demande interrompue" : "Votre assistant"}</p><h1>{responseLabels[kind]}</h1></div><Button variant="ghost" size="icon" onClick={voice.reset} aria-label="Fermer la recherche"><X size={19} /></Button></header>
      {voice.transcript && <section className="request-summary" aria-label="Transcription audio"><p className="transcript-label">Votre demande</p><p>{voice.transcript}</p></section>}
      <SearchProgress phase={voice.phase} source={source.state} hasTranscript={Boolean(voice.transcript)} hasAnswer={Boolean(voice.answer)} />
      {voice.phase === "thinking" && !voice.answer && <div className="search-waiting"><span className="loading-dot" /><p>Home Core traite votre demande.<br /><span>Les résultats apparaîtront ici.</span></p></div>}
      {voice.phase === "error" && <div className="source-error" role="alert"><p>{voice.message}</p><Button variant="secondary" onClick={() => void voice.toggle()}>Reformuler</Button></div>}
      {voice.answer && <SmartResponse key={voice.answer.text + (voice.answer.gmailQuery ?? "")} kind={kind} answer={voice.answer} question={voice.transcript} source={source} onConfirm={() => void voice.confirm()} confirming={busy} onDismiss={voice.dismiss} />}
      {voice.answer && !busy && <Button variant="secondary" className="new-request" onClick={() => void voice.toggle()}>Une autre question</Button>}
    </main> : <main className="home-stage"><Button variant="ghost" className={`orb-button orb-${voice.phase}`} data-phase={voice.phase} disabled={busy} aria-label={listening ? "Terminer et envoyer l’enregistrement" : "Parler à Home Core"} aria-pressed={listening} onClick={() => void voice.toggle()}><AssistantOrb phase={voice.phase} /></Button>{(voice.transcript || ["requesting", "listening", "transcribing"].includes(voice.phase)) && <section className="transcript-panel" aria-label="Transcription audio" role="status" aria-live="polite" aria-atomic="true"><p className="transcript-label">Transcription audio{listening && voice.mode === "browser" && <span> · En direct</span>}</p><p className={voice.transcript ? "transcript" : "transcript transcript-placeholder"}>{voice.transcript || (voice.mode === "browser" ? "Vos paroles s’afficheront ici…" : listening || voice.phase === "requesting" ? "La transcription apparaîtra après l’enregistrement." : "Transcription de l’audio en cours…")}</p></section>}<div className="voice-feedback" role="status" aria-live="polite"><p className="voice-hint">{listening ? "Je vous écoute…" : voice.phase === "requesting" ? "Activation du micro…" : voice.phase === "transcribing" ? "Je termine la transcription…" : "Touchez pour parler"}</p>{listening && <p className="voice-detail">Touchez à nouveau pour envoyer</p>}{listening && <p className="voice-privacy">{voice.mode === "browser" ? "Dictée du navigateur · l’audio peut être traité par son fournisseur." : "Audio transmis à Home Core à la fin de l’écoute."}</p>}{voice.phase === "error" && <p className="voice-detail error">{voice.message}</p>}</div></main> : <main className="page" key={view}>{view === "devices" ? <Devices /> : view === "chores" ? <HouseholdList kind="chores" /> : view === "reminders" ? <HouseholdList kind="reminders" /> : view === "system" ? <SystemHealth /> : null}</main>}
    <nav className="bottom-bar" aria-label="Navigation principale">{navigation.map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" className={"nav-item " + (view === id ? "active" : "")} aria-label={label} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}><Icon size={21} strokeWidth={1.65} /><span>{id === "chores" ? "Tâches" : label}</span></Button>)}</nav>
  </div><div className="landscape-guard" role="alert"><Smartphone size={38} strokeWidth={1.2} /><h1>Tout simplement, en portrait.</h1><p>Remettez votre téléphone à la verticale<br />pour retrouver votre maison.</p></div></>;
}
