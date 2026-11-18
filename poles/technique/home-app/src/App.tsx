import { useEffect, useState, type FormEvent, type PointerEvent } from "react";
import { AssistantOrb } from "@/components/AssistantOrb";
import { Bell, CheckCheck, Home, Lightbulb, Pencil, RotateCcw, Server, Smartphone, Thermometer, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHomeDevices, getDeviceHistory, getDeviceState, setDeviceSwitch, getChores, updateHomeDevice, type HomeDevice, type DeviceState, type Chore, type Measurement } from "@/lib/homeControl";
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

const measurementTime = (value?: string) => {
  if (!value) return "heure inconnue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "heure inconnue";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
};

function Devices() {
  const [devices, setDevices] = useState<HomeDevice[]>([]);
  const [states, setStates] = useState<Record<string, DeviceState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [selectedSensor, setSelectedSensor] = useState<HomeDevice | null>(null);
  const [editingDevice, setEditingDevice] = useState<HomeDevice | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = devices.length === 0;
    setLoading(initialLoad); setError("");
    if (initialLoad) { setDevices([]); setStates({}); }
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
  useEffect(() => {
    const refresh = () => setAttempt(value => value + 1);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh(); };
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refreshWhenVisible); };
  }, []);
  const toggle = async (device: HomeDevice) => {
    setPending(items => [...items, device.id]); setError("");
    try { const state = await setDeviceSwitch(device.id, !states[device.id]?.switchOn); setStates(items => ({ ...items, [device.id]: state })); }
    catch { setError("La commande n’a pas été confirmée. Actualisez l’état avant de réessayer."); setStates(items => { const next = { ...items }; delete next[device.id]; return next; }); }
    finally { setPending(items => items.filter(id => id !== device.id)); }
  };
  // Home Assistant's state endpoint does not always include an area. Keep
  // these devices reachable instead of producing an empty, untappable room.
  const roomName = (device: HomeDevice) => device.room?.trim() || "Sans pièce";
  const rooms = Array.from(new Set(devices.map(roomName))).sort();
  const saveDevice = async (device: HomeDevice, patch: { name: string; room: string }) => {
    const updated = await updateHomeDevice(device.id, patch);
    setDevices(items => items.map(item => item.id === updated.id ? updated : item));
    setEditingDevice(null);
  };
  if (selectedSensor) return <div className="sensor-history-shell"><Button variant="ghost" size="icon" className="sensor-edit" onClick={() => { setEditingDevice(selectedSensor); setSelectedSensor(null); }} aria-label={`Modifier ${selectedSensor.name}`}><Pencil size={17} /></Button><SensorHistory sensor={selectedSensor} onClose={() => setSelectedSensor(null)} /></div>;
  if (editingDevice) return <DeviceEditor device={editingDevice} rooms={rooms.filter(room => room !== "Sans pièce")} onClose={() => setEditingDevice(null)} onSave={saveDevice} />;
  const renderDevice = (device: HomeDevice) => {
    const state = states[device.id]; const busy = pending.includes(device.id); const controllable = device.capabilities.includes("switch") && state?.online && typeof state.switchOn === "boolean"; const opensHistory = device.kind === "temperature_sensor";
    const details = opensHistory ? <div className="device-metrics"><span className="device-metric"><strong>{state?.temperatureC == null ? "—" : `${state.temperatureC.toFixed(1)} °C`}</strong><small>Température</small></span><span className="device-metric"><strong>{state?.humidityPercent == null ? "—" : `${Math.round(state.humidityPercent)} %`}</strong><small>Humidité</small></span><span className="device-metric"><strong>{state?.batteryPercent == null ? "—" : `${Math.round(state.batteryPercent)} %`}</strong><small>Batterie</small></span><span className="device-updated">Dernier relevé {measurementTime(state?.observedAt)}</span></div> : <p>{!state ? "État inconnu" : !state.online ? "Hors ligne" : state.switchOn ? "Allumé" : "Éteint"}</p>;
    return <article className="device" key={device.id} onClick={() => opensHistory && setSelectedSensor(device)} role={opensHistory ? "button" : undefined} tabIndex={opensHistory ? 0 : undefined} onKeyDown={event => { if (opensHistory && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedSensor(device); } }}><div className={"device-icon " + (state?.switchOn ? "on" : "")}>{opensHistory ? <Thermometer size={22} /> : <Lightbulb size={22} />}</div><div className="device-description"><h2>{device.name}</h2>{details}</div>{device.capabilities.includes("switch") && <button type="button" className={"switch " + (state?.switchOn ? "checked" : "")} disabled={!controllable || busy} onClick={event => { event.stopPropagation(); void toggle(device); }} role="switch" aria-checked={Boolean(state?.switchOn)} aria-label={`${state?.switchOn ? "Éteindre" : "Allumer"} ${device.name}`}><span /></button>}</article>;
  };
  return <section className="content"><div className="section-heading"><h1>Domotique</h1><Button variant="ghost" size="icon" aria-label="Actualiser les appareils" onClick={() => setAttempt(value => value + 1)}><RotateCcw size={19} /></Button></div>
    {error && <p role="alert" className="notice">{error}</p>}
    {loading ? <p className="empty">Chargement des appareils…</p> : !error && !devices.length ? <div className="empty"><Lightbulb /><h2>Aucun appareil</h2><p>Les appareils autorisés par Home Core apparaîtront ici.</p></div> : null}
    {!loading && !error && devices.length > 0 && <div className="room-sections">{rooms.map(room => <section className="room-section" key={room}><div className="room-section-heading"><h2>{room}</h2><span>{devices.filter(device => roomName(device) === room).length} appareil(s)</span></div><div className="device-list">{devices.filter(device => roomName(device) === room).map(renderDevice)}</div></section>)}</div>}
  </section>;
}

function DeviceEditor({ device, rooms, onClose, onSave }: { device: HomeDevice; rooms: string[]; onClose: () => void; onSave: (device: HomeDevice, patch: { name: string; room: string }) => Promise<void> }) {
  const [name, setName] = useState(device.name); const [room, setRoom] = useState(device.room ?? ""); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { await onSave(device, { name: name.trim(), room: room.trim() }); } catch { setError("La modification n’a pas été confirmée par Home Assistant."); } finally { setSaving(false); } };
  return <section className="device-detail"><button type="button" className="detail-back" onClick={onClose}>← Retour aux appareils</button><p className="eyebrow">Appareil</p><h1>Modifier l’appareil</h1><form className="device-form" onSubmit={submit}><label>Nom<input value={name} onChange={event => setName(event.target.value)} required autoFocus /></label><label>Pièce<input value={room} onChange={event => setRoom(event.target.value)} list="rooms" placeholder="Ex. Chambre" /><datalist id="rooms">{rooms.map(item => <option key={item} value={item} />)}</datalist></label><p>Les modifications sont enregistrées dans Home Assistant.</p>{error && <p className="notice" role="alert">{error}</p>}<Button type="submit" disabled={saving || !name.trim()}>{saving ? "Enregistrement…" : "Enregistrer"}</Button></form></section>;
}

function SensorHistory({ sensor, onClose }: { sensor: HomeDevice; onClose: () => void }) {
  const [points, setPoints] = useState<Measurement[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void getDeviceHistory(sensor.id, controller.signal).then(setPoints).catch(() => setPoints([]));
    return () => controller.abort();
  }, [sensor.id]);
  const temperature = points.flatMap(point => point.temperatureC == null ? [] : [point.temperatureC]);
  const humidity = points.flatMap(point => point.humidityPercent == null ? [] : [point.humidityPercent]);
  const latest = points.at(-1);
  const chartWidth = 340; const chartHeight = 150; const plotLeft = 34; const plotRight = 326; const plotTop = 14; const plotBottom = 116;
  const xFor = (index: number) => plotLeft + index * (plotRight - plotLeft) / Math.max(points.length - 1, 1);
  const valueFor = (value: number | undefined, values: number[]) => { if (value == null || !values.length) return null; const min = Math.min(...values); const max = Math.max(...values); return plotBottom - (value - min) * (plotBottom - plotTop) / (max - min || 1); };
  const selectFromPointer = (event: PointerEvent<SVGSVGElement>) => { const rect = event.currentTarget.getBoundingClientRect(); const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)); setSelectedIndex(Math.round(ratio * Math.max(points.length - 1, 0))); };
  const selectedPoint = selectedIndex == null ? null : points[selectedIndex];
  const hasHistory = temperature.length > 0 || humidity.length > 0;
  return <section className="device-detail sensor-history" aria-label={`Historique ${sensor.name}`}><button type="button" className="detail-back" onClick={onClose}>← Retour aux appareils</button><p className="eyebrow">Capteur</p><h1>{sensor.name}</h1><p>Historique sur 24 heures{latest ? ` · dernier relevé à ${measurementTime(latest.observedAt)}` : ""}</p>{hasHistory ? <><svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Historique de température et humidité" onPointerDown={selectFromPointer} onPointerMove={event => { if (event.buttons) selectFromPointer(event); }} onPointerUp={() => setSelectedIndex(selectedIndex)} onPointerLeave={() => setSelectedIndex(null)}>{[0, 1, 2, 3].map(step => { const y = plotTop + step * (plotBottom - plotTop) / 3; return <g key={step}><line x1={plotLeft} x2={plotRight} y1={y} y2={y} className="chart-grid" /><text x={plotLeft - 5} y={y + 3} textAnchor="end" className="chart-axis-label">{step === 0 ? "max" : step === 3 ? "min" : ""}</text></g>; })}<line x1={plotLeft} x2={plotLeft} y1={plotTop} y2={plotBottom} className="chart-axis" /><line x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} className="chart-axis" />{temperature.length > 0 && <polyline points={temperature.map((value, index) => `${xFor(index)},${valueFor(value, temperature) ?? plotBottom}`).join(" ")} fill="none" stroke="#a78bfa" strokeWidth="3" />}{humidity.length > 0 && <polyline points={humidity.map((value, index) => `${xFor(index)},${valueFor(value, humidity) ?? plotBottom}`).join(" ")} fill="none" stroke="#67e8f9" strokeWidth="3" />}{selectedPoint && <><line x1={xFor(selectedIndex ?? 0)} x2={xFor(selectedIndex ?? 0)} y1={plotTop} y2={plotBottom} className="chart-crosshair" /><circle cx={xFor(selectedIndex ?? 0)} cy={valueFor(selectedPoint.temperatureC, temperature) ?? plotBottom} r="4" className="chart-dot temperature-dot" /><circle cx={xFor(selectedIndex ?? 0)} cy={valueFor(selectedPoint.humidityPercent, humidity) ?? plotBottom} r="4" className="chart-dot humidity-dot" /></>}<text x={plotLeft} y={chartHeight - 8} className="chart-axis-label">{points[0] ? measurementTime(points[0].observedAt) : ""}</text><text x={plotRight} y={chartHeight - 8} textAnchor="end" className="chart-axis-label">{latest ? measurementTime(latest.observedAt) : ""}</text></svg>{selectedPoint && <div className="chart-tooltip"><strong>{measurementTime(selectedPoint.observedAt)}</strong>{selectedPoint.temperatureC != null && <span className="temperature">{selectedPoint.temperatureC.toFixed(1)} °C</span>}{selectedPoint.humidityPercent != null && <span className="humidity">{Math.round(selectedPoint.humidityPercent)} %</span>}</div>}<p className="history-legend"><span className="temperature">Température · {temperature.length} relevés</span><span className="humidity">Humidité · {humidity.length} relevés</span></p></> : <p>Historique indisponible pour le moment.</p>}</section>;
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
