import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { AssistantOrb } from "@/components/AssistantOrb";
import { Bell, CheckCheck, Home, Lightbulb, Pencil, Plus, Plug, RefreshCw, RotateCcw, Server, Smartphone, Thermometer, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteChore, getHomeDevices, getDeviceHistory, getDeviceState, setDeviceSwitch, getChores, updateHomeDevice, setChoreCompleted, type HomeDevice, type DeviceState, type Chore, type Measurement } from "@/lib/homeControl";
import { useVoice } from "@/lib/useVoice";
import { responseKind, responseLabels } from "@/lib/assistant";
import { useResponseData } from "@/lib/useResponseData";
import { SearchProgress } from "@/components/SearchProgress";
import { SmartResponse } from "@/components/responses/SmartResponse";
import { SystemHealth } from "@/components/SystemHealth";
import { currentPushState, disablePushNotifications, enablePushNotifications, pushErrorMessage, type PushState } from "@/lib/pushNotifications";

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
  const [filter, setFilter] = useState("all");
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
  const categoryFor = (device: HomeDevice) => device.kind === "temperature_sensor" || device.capabilities.includes("temperature") ? "sensors" : device.kind === "light" || device.capabilities.includes("brightness") ? "lights" : device.kind === "plug" ? "plugs" : "other";
  const categoryLabels: Record<string, string> = { sensors: "Capteurs", lights: "Lumières", plugs: "Prises", other: "Autres" };
  const visibleDevices = devices.filter(device => filter === "all" || categoryFor(device) === filter);
  const categories = Array.from(new Set(devices.map(categoryFor)));
  const saveDevice = async (device: HomeDevice, patch: { name: string; room: string }) => {
    const updated = await updateHomeDevice(device.id, patch);
    setDevices(items => items.map(item => item.id === updated.id ? updated : item));
    setEditingDevice(null);
  };
  if (selectedSensor) return <div className="sensor-history-shell"><Button variant="ghost" size="icon" className="sensor-edit" onClick={() => { setEditingDevice(selectedSensor); setSelectedSensor(null); }} aria-label={`Modifier ${selectedSensor.name}`}><Pencil size={17} /></Button><SensorHistory sensor={selectedSensor} onClose={() => setSelectedSensor(null)} /></div>;
  if (editingDevice) return <DeviceEditor device={editingDevice} rooms={rooms.filter(room => room !== "Sans pièce")} onClose={() => setEditingDevice(null)} onSave={saveDevice} />;
  const renderDevice = (device: HomeDevice) => {
    const state = states[device.id]; const busy = pending.includes(device.id); const controllable = device.capabilities.includes("switch") && state?.online && typeof state.switchOn === "boolean"; const opensHistory = device.kind === "temperature_sensor";
    const details = opensHistory ? <div className="device-metrics"><span className="device-metric"><strong>{state?.temperatureC == null ? "—" : `${state.temperatureC.toFixed(1)}°`}</strong><small>Température</small></span><span className="device-metric"><strong>{state?.humidityPercent == null ? "—" : `${Math.round(state.humidityPercent)}%`}</strong><small>Humidité</small></span><span className="device-metric"><strong>{state?.batteryPercent == null ? "—" : `${Math.round(state.batteryPercent)}%`}</strong><small>Batterie</small></span><span className="device-updated">Dernier relevé {measurementTime(state?.observedAt)}</span></div> : <p>{!state ? "État inconnu" : !state.online ? "Hors ligne" : state.switchOn ? "Allumé" : "Éteint"}</p>;
    const Icon = device.kind === "plug" ? Plug : opensHistory ? Thermometer : Lightbulb;
    return <article className={`device ${state?.online === false ? "device-unavailable" : ""}`} key={device.id} onClick={() => opensHistory && setSelectedSensor(device)} role={opensHistory ? "button" : undefined} tabIndex={opensHistory ? 0 : undefined} onKeyDown={event => { if (opensHistory && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedSensor(device); } }}><div className={"device-icon " + (state?.switchOn ? "on" : "")}><Icon size={21} /></div><div className="device-description"><h2>{device.name}</h2>{details}</div>{device.capabilities.includes("switch") && <button type="button" className={`switch ${state?.switchOn ? "checked" : ""}`} disabled={!controllable || busy} onClick={event => { event.stopPropagation(); void toggle(device); }} role="switch" aria-checked={Boolean(state?.switchOn)} aria-label={`${state?.switchOn ? "Éteindre" : "Allumer"} ${device.name}`}><span /></button>}</article>;
  };
  return <section className="content"><div className="section-heading"><div><p className="eyebrow">Votre maison</p><h1>Domotique</h1><p className="page-subtitle">{rooms.length} pièces · {devices.length} appareils</p></div><Button variant="ghost" size="icon" aria-label="Actualiser les appareils" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={18} /></Button></div>
    {error && <p role="alert" className="notice">{error}</p>}
    {loading ? <p className="empty">Chargement des appareils…</p> : !error && !devices.length ? <div className="empty"><Lightbulb /><h2>Aucun appareil</h2><p>Les appareils autorisés par Home Core apparaîtront ici.</p></div> : null}
    {!loading && !error && devices.length > 0 && <><div className="device-filters" role="tablist" aria-label="Filtrer les appareils"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tous</button>{categories.map(category => <button key={category} className={filter === category ? "active" : ""} onClick={() => setFilter(category)}>{categoryLabels[category] ?? category}</button>)}</div><div className="room-sections">{rooms.map(room => { const roomDevices = visibleDevices.filter(device => roomName(device) === room); if (!roomDevices.length) return null; return <section className="room-section" key={room}><div className="room-section-heading"><div><p className="room-label">Pièce</p><h2>{room}</h2></div><span>{roomDevices.length} appareil{roomDevices.length > 1 ? "s" : ""}</span></div><div className="device-list">{roomDevices.map(renderDevice)}</div></section>; })}</div></>}
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
    void getDeviceHistory(sensor.id, controller.signal).then(measurements => setPoints([...measurements].sort((left, right) => new Date(left.observedAt).getTime() - new Date(right.observedAt).getTime()))).catch(() => setPoints([]));
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
  const temperaturePoints = points.flatMap((point, index) => point.temperatureC == null ? [] : [`${xFor(index)},${valueFor(point.temperatureC, temperature) ?? plotBottom}`]);
  const humidityPoints = points.flatMap((point, index) => point.humidityPercent == null ? [] : [`${xFor(index)},${valueFor(point.humidityPercent, humidity) ?? plotBottom}`]);
  const hasHistory = temperature.length > 0 || humidity.length > 0;
  return <section className="device-detail sensor-history" aria-label={`Historique ${sensor.name}`}><button type="button" className="detail-back" onClick={onClose}>← Retour aux appareils</button><p className="eyebrow">Capteur</p><h1>{sensor.name}</h1><p>Historique sur 24 heures{latest ? ` · dernier relevé à ${measurementTime(latest.observedAt)}` : ""}</p>{hasHistory ? <><svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Historique de température et humidité" onPointerDown={selectFromPointer} onPointerMove={event => { if (event.buttons) selectFromPointer(event); }} onPointerUp={() => setSelectedIndex(selectedIndex)} onPointerLeave={() => setSelectedIndex(null)}>{[0, 1, 2, 3].map(step => { const y = plotTop + step * (plotBottom - plotTop) / 3; return <g key={step}><line x1={plotLeft} x2={plotRight} y1={y} y2={y} className="chart-grid" /><text x={plotLeft - 5} y={y + 3} textAnchor="end" className="chart-axis-label">{step === 0 ? "max" : step === 3 ? "min" : ""}</text></g>; })}<line x1={plotLeft} x2={plotLeft} y1={plotTop} y2={plotBottom} className="chart-axis" /><line x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} className="chart-axis" />{temperaturePoints.length > 0 && <polyline points={temperaturePoints.join(" ")} fill="none" stroke="#a78bfa" strokeWidth="3" />}{humidityPoints.length > 0 && <polyline points={humidityPoints.join(" ")} fill="none" stroke="#67e8f9" strokeWidth="3" />}{selectedPoint && <><line x1={xFor(selectedIndex ?? 0)} x2={xFor(selectedIndex ?? 0)} y1={plotTop} y2={plotBottom} className="chart-crosshair" /><circle cx={xFor(selectedIndex ?? 0)} cy={valueFor(selectedPoint.temperatureC, temperature) ?? plotBottom} r="4" className="chart-dot temperature-dot" /><circle cx={xFor(selectedIndex ?? 0)} cy={valueFor(selectedPoint.humidityPercent, humidity) ?? plotBottom} r="4" className="chart-dot humidity-dot" /></>}<text x={plotLeft} y={chartHeight - 8} className="chart-axis-label">{points[0] ? measurementTime(points[0].observedAt) : ""}</text><text x={plotRight} y={chartHeight - 8} textAnchor="end" className="chart-axis-label">{latest ? measurementTime(latest.observedAt) : ""}</text></svg>{selectedPoint && <div className="chart-tooltip"><strong>{measurementTime(selectedPoint.observedAt)}</strong>{selectedPoint.temperatureC != null && <span className="temperature">{selectedPoint.temperatureC.toFixed(1)} °C</span>}{selectedPoint.humidityPercent != null && <span className="humidity">{Math.round(selectedPoint.humidityPercent)} %</span>}</div>}<p className="history-legend"><span className="temperature">Température · {temperature.length} relevés</span><span className="humidity">Humidité · {humidity.length} relevés</span></p></> : <p>Historique indisponible pour le moment.</p>}</section>;
}

type Reminder = { id: string; title: string; date: string; details?: string; scheduledAt?: string; timeZone?: string; notificationStatus?: string };

function Reminders() {
  const [items, setItems] = useState<Reminder[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [editing, setEditing] = useState<Reminder | null>(null); const [editorOpen, setEditorOpen] = useState(false); const [title, setTitle] = useState(""); const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [details, setDetails] = useState(""); const [saving, setSaving] = useState(false); const [push, setPush] = useState<PushState>("default"); const [pushError, setPushError] = useState(""); const [testingPush, setTestingPush] = useState(false);
  const load = async () => { setLoading(true); try { const response = await fetch("/v1/reminders", { cache: "no-store" }); if (!response.ok) throw new Error(); const data = await response.json() as { reminders?: Reminder[] }; setItems(data.reminders ?? []); } catch { setError("Impossible de charger les rappels depuis Home Core."); } finally { setLoading(false); } };
  useEffect(() => { void load(); void currentPushState().then(setPush).catch(() => setPush("error")); }, []);
  const reset = () => { setEditing(null); setTitle(""); setDate(""); setTime(""); setDetails(""); setEditorOpen(false); };
  const create = () => { setEditing(null); setTitle(""); setDate(""); setTime(""); setDetails(""); setEditorOpen(true); };
  const edit = (item: Reminder) => { setEditing(item); setTitle(item.title); setDate(item.date); setDetails(item.details ?? ""); if (item.scheduledAt) { const local = new Date(item.scheduledAt); setTime(`${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`); } else setTime(""); setEditorOpen(true); };
  const save = async (event: FormEvent) => { event.preventDefault(); if (!title.trim() || !date) return; setSaving(true); setError(""); const scheduledAt = time ? new Date(`${date}T${time}`).toISOString() : ""; const body = { title: title.trim(), date, details: details.trim(), scheduledAt, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }; try { const response = await fetch(editing ? `/v1/reminders/${encodeURIComponent(editing.id)}` : "/v1/reminders", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (!response.ok) throw new Error(); const saved = await response.json() as Reminder; setItems(current => editing ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved]); reset(); } catch { setError("Le rappel n’a pas été enregistré."); } finally { setSaving(false); } };
  const remove = async (item: Reminder) => { if (!window.confirm(`Supprimer « ${item.title} » ?`)) return; try { const response = await fetch(`/v1/reminders/${encodeURIComponent(item.id)}`, { method: "DELETE" }); if (!response.ok) throw new Error(); setItems(current => current.filter(value => value.id !== item.id)); if (editing?.id === item.id) reset(); } catch { setError("Le rappel n’a pas été supprimé."); } };
  const changePush = async () => { try { setPushError(""); if (push === "active") { await disablePushNotifications(); setPush("default"); } else { await enablePushNotifications(); setPush("active"); } } catch (reason) { const state = reason instanceof Error && reason.message === "permission_denied" ? "denied" : reason instanceof Error && reason.message === "push_not_available" ? "install_required" : "error"; setPush(state); setPushError(pushErrorMessage(reason)); } };
  const testPush = async () => { setTestingPush(true); setPushError(""); try { const response = await fetch("/v1/notifications/push/test", { method: "POST" }); if (!response.ok) throw new Error(); } catch { setPushError("La notification de test n’a pas pu être envoyée."); } finally { setTestingPush(false); } };
  const next = items.filter(item => item.scheduledAt && new Date(item.scheduledAt).getTime() >= Date.now()).sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0];
  const reminders = [...items].sort((a, b) => (a.scheduledAt ?? a.date).localeCompare(b.scheduledAt ?? b.date));
  const pushLabel: Record<PushState, string> = { active: "Notifications activées", default: "Activer les notifications", denied: "Notifications refusées dans le navigateur", unsupported: "Navigateur non compatible", install_required: "Installez d’abord Home AI sur l’écran d’accueil", error: "Erreur réseau ou configuration Push indisponible" };
  return <section className="content reminders-page"><div className="section-heading"><div><p className="eyebrow">Votre quotidien</p><h1>Rappels</h1><p className="page-subtitle">{next ? `Prochain : ${new Date(next.scheduledAt!).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}` : "Aucune échéance planifiée"}</p></div><div className="reminder-actions"><Button variant="ghost" size="icon" aria-label="Actualiser les rappels" onClick={() => void load()}><RefreshCw size={18} /></Button><Button className="reminder-add" size="icon" aria-label="Créer un rappel" onClick={create}><Plus size={21} /></Button></div></div><section className="push-status"><Bell size={16} /><div><strong>{pushLabel[push]}</strong>{(push === "install_required" || pushError) && <small>{pushError || "Safari iOS autorise le Push pour la PWA installée."}</small>}</div>{push === "active" ? <div className="push-actions"><Button variant="secondary" disabled={testingPush} onClick={() => void testPush()}>{testingPush ? "Envoi…" : "Tester"}</Button><Button variant="secondary" onClick={() => void changePush()}>Désactiver</Button></div> : (push === "default" || push === "error") && <Button variant="secondary" onClick={() => void changePush()}>{push === "error" ? "Réessayer" : "Activer"}</Button>}</section>{error && <p className="notice" role="alert">{error}</p>}<section className="reminders-list" aria-label="Tous les rappels"><div className="reminders-list-heading"><h2>Tous les rappels</h2><span>{reminders.length}</span></div>{loading ? <p className="empty">Chargement…</p> : !reminders.length ? <div className="empty reminders-empty"><Bell /><h2>Aucun rappel</h2><p>Utilisez le bouton + pour créer votre premier rappel.</p></div> : <div className="household-list">{reminders.map(item => <article className="household-item" key={item.id}><button type="button" className="reminder-item" onClick={() => edit(item)}><div><h2>{item.title}</h2><p>{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : `${item.date} · sans heure`}{item.details ? ` · ${item.details}` : ""}</p></div><span className="item-state">{item.notificationStatus === "sent" ? "Envoyé" : item.scheduledAt ? "Planifié" : "Date seule"}</span></button><Button variant="ghost" size="icon" aria-label={`Supprimer ${item.title}`} onClick={() => void remove(item)}>×</Button></article>)}</div>}</section>{editorOpen && <div className="reminder-editor-backdrop" role="presentation" onClick={reset}><form className="reminder-form reminder-editor" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="reminder-editor-title" onClick={event => event.stopPropagation()}><div className="reminder-editor-heading"><h2 id="reminder-editor-title">{editing ? "Modifier le rappel" : "Nouveau rappel"}</h2><Button type="button" variant="ghost" size="icon" aria-label="Fermer" onClick={reset}><X size={18} /></Button></div><label>Titre<input value={title} onChange={event => setTitle(event.target.value)} required autoFocus /></label><div className="reminder-date-time"><label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)} required /></label><label>Heure <small>optionnelle</small><input type="time" value={time} onChange={event => setTime(event.target.value)} /></label></div><label>Détails <small>optionnels</small><input value={details} onChange={event => setDetails(event.target.value)} /></label><div className="reminder-editor-buttons"><Button type="button" variant="ghost" onClick={reset}>Annuler</Button><Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}</Button></div></form></div>}</section>;
}

function HouseholdList({ kind }: { kind: "chores" }) {
  const [items, setItems] = useState<Array<Chore>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const [deleteCandidate, setDeleteCandidate] = useState<Chore | null>(null);
  const longPress = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  useEffect(() => { const controller = new AbortController(); const load = async () => { try { setItems(await getChores(controller.signal)); } catch { if (!controller.signal.aborted) setError("Impossible de charger les tâches depuis Home Core."); } finally { if (!controller.signal.aborted) setLoading(false); } }; void load(); return () => controller.abort(); }, [kind]);
  const toggleChore = async (chore: Chore) => { if (pending.includes(chore.id)) return; setPending(current => [...current, chore.id]); setError(""); try { const updated = await setChoreCompleted(chore.id, !chore.completed); setItems(current => current.map(item => item.id === updated.id ? updated : item)); } catch { setError("La tâche n’a pas pu être mise à jour."); } finally { setPending(current => current.filter(id => id !== chore.id)); } };
  const confirmDelete = async () => { if (!deleteCandidate) return; const id = deleteCandidate.id; setPending(current => [...current, id]); try { await deleteChore(id); setItems(current => current.filter(item => item.id !== id)); setDeleteCandidate(null); } catch { setError("La tâche n’a pas pu être supprimée."); } finally { setPending(current => current.filter(item => item !== id)); } };
  const startLongPress = (chore: Chore) => { longPressTriggered.current = false; longPress.current = window.setTimeout(() => { longPressTriggered.current = true; setDeleteCandidate(chore); }, 650); };
  const cancelLongPress = () => { if (longPress.current !== null) { window.clearTimeout(longPress.current); longPress.current = null; } };
  return <section className="content"><div className="section-heading"><div><p className="eyebrow">Votre quotidien</p><h1>Tâches ménagères</h1></div><Button variant="ghost" size="icon" aria-label="Actualiser" onClick={() => window.location.reload()}><RotateCcw size={19} /></Button></div>{error && <p role="alert" className="notice">{error}</p>}{loading ? <p className="empty">Chargement…</p> : !items.length ? <div className="empty"><CheckCheck /><h2>Aucune tâche</h2><p>Home Core ne renvoie aucune tâche pour le moment.</p></div> : <div className="household-list">{items.map(item => "objective" in item ? <button type="button" className={`household-item chore-item ${item.completed ? "completed" : ""}`} disabled={pending.includes(item.id)} onPointerDown={() => startLongPress(item)} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onPointerLeave={cancelLongPress} onClick={() => { if (!longPressTriggered.current) void toggleChore(item); }} key={item.id}><div><h2>{item.completed ? <s>{item.objective}</s> : item.objective}</h2><p>{item.assignees.join(" · ") || "Foyer"}{item.dueDate ? ` · ${item.dueDate}` : ""}</p></div><span className={item.completed ? "item-state done" : "item-state"}>{pending.includes(item.id) ? "…" : item.completed ? "Terminée" : "À faire"}</span></button> : null)}</div>}{deleteCandidate && <div className="confirm-backdrop" role="presentation" onClick={() => setDeleteCandidate(null)}><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={event => event.stopPropagation()}><h2 id="delete-title">Supprimer cette tâche ?</h2><p>{deleteCandidate.objective}</p><div><Button variant="ghost" onClick={() => setDeleteCandidate(null)}>Annuler</Button><Button variant="destructive" onClick={() => void confirmDelete()}>Supprimer</Button></div></div></div>}</section>;
}

export default function App() {
  const [view, setView] = useState<View>(() => new URLSearchParams(window.location.search).get("view") === "reminders" ? "reminders" : "home");
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
    </main> : <main className="home-stage"><Button variant="ghost" className={`orb-button orb-${voice.phase}`} data-phase={voice.phase} disabled={busy} aria-label={listening ? "Terminer et envoyer l’enregistrement" : "Parler à Home Core"} aria-pressed={listening} onClick={() => void voice.toggle()}><AssistantOrb phase={voice.phase} /></Button>{(voice.transcript || ["requesting", "listening", "transcribing"].includes(voice.phase)) && <section className="transcript-panel" aria-label="Transcription audio" role="status" aria-live="polite" aria-atomic="true"><p className="transcript-label">Transcription audio{listening && voice.mode === "browser" && <span> · En direct</span>}</p><p className={voice.transcript ? "transcript" : "transcript transcript-placeholder"}>{voice.transcript || (voice.mode === "browser" ? "Vos paroles s’afficheront ici…" : listening || voice.phase === "requesting" ? "La transcription apparaîtra après l’enregistrement." : "Transcription de l’audio en cours…")}</p></section>}<div className="voice-feedback" role="status" aria-live="polite"><p className="voice-hint">{listening ? "Je vous écoute…" : voice.phase === "requesting" ? "Activation du micro…" : voice.phase === "transcribing" ? "Je termine la transcription…" : "Touchez pour parler"}</p>{listening && <p className="voice-detail">Touchez à nouveau pour envoyer</p>}{listening && <p className="voice-privacy">{voice.mode === "browser" ? "Dictée du navigateur · l’audio peut être traité par son fournisseur." : "Audio transmis à Home Core à la fin de l’écoute."}</p>}{voice.phase === "error" && <p className="voice-detail error">{voice.message}</p>}</div></main> : <main className="page" key={view}>{view === "devices" ? <Devices /> : view === "chores" ? <HouseholdList kind="chores" /> : view === "reminders" ? <Reminders /> : view === "system" ? <SystemHealth /> : null}</main>}
    <nav className="bottom-bar" aria-label="Navigation principale">{navigation.map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" className={"nav-item " + (view === id ? "active" : "")} aria-label={label} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}><Icon size={21} strokeWidth={1.65} /><span>{id === "chores" ? "Tâches" : label}</span></Button>)}</nav>
  </div><div className="landscape-guard" role="alert"><Smartphone size={38} strokeWidth={1.2} /><h1>Tout simplement, en portrait.</h1><p>Remettez votre téléphone à la verticale<br />pour retrouver votre maison.</p></div></>;
}
