import { useCallback, useEffect, useRef, useState } from "react";
import {
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  CookingPot,
  Home,
  Lightbulb,
  Mail,
  Mic,
  Monitor,
  MoreHorizontal,
  Settings,
  Sofa,
  Sparkles,
  Plug,
  Recycle,
  RobotVacuum,
  Thermometer,
  ThermometerSun,
  TrainFront,
  TrendingUp,
  UtensilsCrossed,
  WalletCards,
  UserRound,
  Paperclip,
  X,
} from "lucide-react";
import { Orb } from "@yogesharc/thinking-orbs";
import { Ascii } from "ascii.rest/react";
import * as earthrise from "ascii.rest/pieces/earthrise";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getWeather, type WeatherReport } from "@/lib/weather";
import { getDeviceState, getHomeDevices, setDeviceSwitch, type DeviceState, type HomeDevice } from "@/lib/homeControl";
import { getCalendarEvents, getCalendars, type CalendarEvent } from "@/lib/calendar";
import { AgentPipeline } from "@/components/ai/agent-pipeline";

GlobalWorkerOptions.workerSrc = pdfWorker;

const rooms = [
  { name: "Salon", detail: "2 lumières · 21°", icon: Sofa, active: true, tone: "bg-sky-100 text-sky-700" },
  { name: "Cuisine", detail: "2 lumières · 20°", icon: CookingPot, active: true, tone: "bg-amber-100 text-amber-700" },
  { name: "Chambre", detail: "2 lumières · 19°", icon: BedDouble, active: false, tone: "bg-violet-100 text-violet-700" },
  { name: "Bureau", detail: "1 lumière · 20°", icon: Monitor, active: false, tone: "bg-teal-100 text-teal-700" },
];

type Profile = "Duo";
type View = "dashboard" | "home" | "agenda" | "profile" | "cost" | "settings";

const agendaItems = [
  { time: "20:30", title: "Dîner avec Lise", detail: "À la maison", owner: "Duo", tone: "bg-emerald-400" },
  { time: "Demain · 09:00", title: "Point projet", detail: "Visioconférence", owner: "Clément", tone: "bg-sky-400" },
  { time: "Demain · 18:30", title: "Courses", detail: "Liste partagée", owner: "Duo", tone: "bg-amber-400" },
  { time: "Jeudi · 19:00", title: "Cours de yoga", detail: "Agenda de Lise", owner: "Lise", tone: "bg-violet-400" },
];

type WeeklyChore = { id: string; dueDate: string; objective: string; assignees: string[]; completed: boolean };
type Market = { symbol: string; name: string; isin: string; change: number; price: number };
type MarketDetail = { etf: Market; history: { label: string | number; value: number }[]; dataStatus: string };
type Train = { id: string; departure: string; arrival?: string; scheduledDeparture: string; lastUpdated?: string; destination: string; trainNumber: string; commercialMode: string; platform?: string; status: "on_time" | "delayed" | "cancelled"; delayMinutes: number; disruption?: { title: string; cause?: string; effect?: string; information?: string } };

function HomeView() {
  const [devices, setDevices] = useState<HomeDevice[]>([]);
  const [states, setStates] = useState<Record<string, DeviceState>>({});
  const [unavailable, setUnavailable] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomDialogRoom | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getHomeDevices(controller.signal).then(async (loaded) => {
      setDevices(loaded);
      const entries = await Promise.all(loaded.map(async (device) => [device.id, await getDeviceState(device.id, controller.signal)] as const));
      setStates(Object.fromEntries(entries));
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setUnavailable(true);
    });
    return () => controller.abort();
  }, []);

  const lights = devices.filter((device) => device.kind === "light");
  const lightsOn = lights.some((device) => states[device.id]?.switchOn);
  const connectedRooms = Array.from(new Set(devices.map((device) => device.room))).map((room) => {
    const roomDevices = devices.filter((device) => device.room === room);
    const roomLights = roomDevices.filter((device) => device.kind === "light");
    const temperature = roomDevices.find((device) => states[device.id]?.temperatureC);
    return { name: room, detail: `${roomLights.length} lumière${roomLights.length > 1 ? "s" : ""}${temperature ? ` · ${Math.round(states[temperature.id].temperatureC!)}°` : ""}`, icon: room === "Cuisine" ? CookingPot : room === "Chambre" ? BedDouble : room === "Bureau" ? Monitor : Sofa, active: roomLights.some((device) => states[device.id]?.switchOn), tone: room === "Cuisine" ? "bg-amber-100 text-amber-700" : room === "Chambre" ? "bg-violet-100 text-violet-700" : room === "Bureau" ? "bg-teal-100 text-teal-700" : "bg-sky-100 text-sky-700", roomDevices, remote: true };
  });
  const displayedRooms = connectedRooms.length > 0 ? connectedRooms : rooms.map((room) => ({ ...room, roomDevices: [] as HomeDevice[], remote: false }));

  const toggleRoom = async (roomDevices: HomeDevice[], on: boolean) => {
    setPending(roomDevices[0]?.room ?? null);
    try {
      const results = await Promise.all(roomDevices.filter((device) => device.kind === "light").map((device) => setDeviceSwitch(device.id, on).then((state) => [device.id, state] as const)));
      setStates((current) => ({ ...current, ...Object.fromEntries(results) }));
    } catch { setUnavailable(true); } finally { setPending(null); }
  };

  return (
    <div className="home-view mt-8">
      <div><h2 className="text-3xl font-semibold tracking-[-0.04em]">Maison</h2>{unavailable && <p className="mt-2 text-sm text-amber-300">Home Core est indisponible.</p>}</div>
      <div className="grid grid-cols-5 gap-2" role="group" aria-label="Presets maison">{["Matin", "Journée de travail", "Soirée", "Lecture", "Dodo"].map((preset) => <button key={preset} type="button" onClick={() => setActivePreset(preset)} className={activePreset === preset ? "h-6 truncate rounded-full bg-white px-2 text-[11px] font-semibold leading-6 text-zinc-950" : "h-6 truncate rounded-full border border-white/10 bg-white/[0.04] px-2 text-[11px] leading-6 text-slate-300 hover:bg-white/[0.1]"}>{preset}</button>)}</div>
      <div className="home-rooms grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3">{displayedRooms.map(({ name, detail, icon: Icon, active, tone, roomDevices, remote }) => <Card key={name} onClick={() => setSelectedRoom({ name, icon: Icon, tone })} className="cursor-pointer transition hover:border-white/25"><CardContent className="p-3 sm:p-5"><div className="flex items-start justify-between"><div className={"grid size-9 place-items-center rounded-xl sm:size-11 sm:rounded-2xl " + tone}><Icon className="size-4 sm:size-5" /></div><span className={active ? "size-2 rounded-full bg-emerald-400" : "size-2 rounded-full bg-zinc-600"} /></div><div className="mt-4 flex flex-col gap-1 sm:mt-8 sm:flex-row sm:items-end sm:justify-between sm:gap-3"><div><p className="text-sm font-medium sm:text-base">{name}</p><p className="mt-1 text-xs text-slate-500 sm:text-sm">{detail || "Aucun appareil"}</p></div>{remote === false ? <span className="text-xs text-slate-500">Hors ligne</span> : <Button variant="ghost" className="h-8 self-start px-2 text-xs sm:h-10 sm:self-auto sm:px-4 sm:text-sm" disabled={pending === name} onClick={(event) => { event.stopPropagation(); void toggleRoom(roomDevices, !active); }}>{active ? "Éteindre" : "Allumer"}</Button>}</div></CardContent></Card>)}</div>
      {selectedRoom && <RoomDetailDialog room={selectedRoom} onClose={() => setSelectedRoom(null)} />}
    </div>
  );
}

function CustomCalendar({ month, selected, eventDays, onMonthChange, onSelect }: { month: Date; selected?: Date; eventDays: Date[]; onMonthChange: (date: Date) => void; onSelect: (date: Date) => void }) {
  const year = month.getFullYear(); const monthIndex = month.getMonth();
  const leading = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [...Array<null>(leading).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  const hasEvent = (day: number) => eventDays.some((date) => date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day);
  return <div className="custom-calendar"><div className="custom-calendar-header"><button type="button" aria-label="Mois précédent" onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}><ChevronLeft /></button><p>{month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p><button type="button" aria-label="Mois suivant" onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}><ChevronRight /></button></div><div className="custom-calendar-grid custom-calendar-weekdays">{["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((day) => <span key={day}>{day}</span>)}</div><div className="custom-calendar-grid custom-calendar-days">{cells.map((day, index) => day === null ? <span key={`empty-${index}`} /> : <button key={day} type="button" onClick={() => onSelect(new Date(year, monthIndex, day))} className={(hasEvent(day) ? "has-event " : "") + (selected?.getFullYear() === year && selected.getMonth() === monthIndex && selected.getDate() === day ? "selected" : "")}>{day}</button>)}</div></div>;
}

function AgendaView({ profile }: { profile: Profile }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncState, setSyncState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [displayMonth, setDisplayMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const swipeStartX = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const from = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
    const to = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1);
    setSyncState("loading");
    getCalendars("personal", controller.signal)
      .then((calendars) => Promise.all(calendars.map((calendar) => getCalendarEvents("personal", calendar.id, from, to, controller.signal))))
      .then((calendarEvents) => { setEvents(calendarEvents.flat()); setSyncState("ready"); })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSyncState("unavailable");
      });
    return () => controller.abort();
  }, [displayMonth]);

  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const eventDays = events.map((event) => new Date(event.startsAt));
  const visibleItems = events.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 6);
  const selectedEvents = selectedDate ? events.filter((event) => { const date = new Date(event.startsAt); return date.getFullYear() === selectedDate.getFullYear() && date.getMonth() === selectedDate.getMonth() && date.getDate() === selectedDate.getDate(); }) : [];
  const changeMonth = (offset: number) => setDisplayMonth(new Date(year, month + offset, 1));

  return (
    <div className="agenda-view cost-view mt-2">
      <div className="agenda-content grid gap-4 md:grid-cols-[minmax(0,1.45fr)_minmax(230px,0.75fr)]">
        <Card className="agenda-calendar bg-zinc-900/90" onTouchStart={(event) => { swipeStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { const start = swipeStartX.current; const end = event.changedTouches[0]?.clientX; swipeStartX.current = null; if (start === null || end === undefined || Math.abs(end - start) < 48) return; changeMonth(end < start ? 1 : -1); }}><CardHeader><div><p className="text-lg font-semibold">Calendrier</p><p className="mt-1 text-sm text-slate-500">Vue foyer partagé</p></div><span role="status" aria-label={syncState === "ready" ? "Synchronisation connectée" : syncState === "loading" ? "Synchronisation en cours" : "Synchronisation indisponible"} className={"mt-1 size-2.5 shrink-0 rounded-full " + (syncState === "ready" ? "bg-emerald-400" : "bg-rose-400")} /></CardHeader><CardContent className="p-3 sm:p-6"><CustomCalendar month={displayMonth} selected={selectedDate} eventDays={eventDays} onMonthChange={setDisplayMonth} onSelect={setSelectedDate} /></CardContent></Card>
        <Card className={"agenda-events bg-zinc-900/90 " + (selectedDate ? "block" : "hidden md:block")}>{selectedDate && <><CardHeader><div><p className="text-lg font-semibold">{selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p><p className="mt-1 text-sm text-slate-500">Détail des événements</p></div><CalendarDays className="size-5 text-slate-400" /></CardHeader><CardContent className="space-y-2">{selectedEvents.length === 0 ? <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-slate-500">Aucun événement ce jour.</p> : selectedEvents.map((item) => <div key={item.id} className="rounded-2xl bg-white/[0.04] p-3"><p className="text-sm font-medium">{item.title || "Sans titre"}</p><p className="mt-1 text-sm text-slate-500">{item.allDay ? "Toute la journée" : new Date(item.startsAt).toLocaleString("fr-FR", { timeStyle: "short" })}</p></div>)}</CardContent></>}</Card>
      </div>
    </div>
  );
}

function ProfileView({ profile }: { profile: Profile }) {
  return (
    <div className="profile-view mt-8 max-w-3xl">
      <div><p className="text-sm text-slate-500">Espace personnel et partagé</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Profil</h2></div>
      <Card><CardContent className="flex items-center gap-4 p-6"><div className="profile-orb grid size-16 place-items-center rounded-full text-xl font-semibold text-zinc-950">{profile[0]}</div><div><p className="text-lg font-semibold">{profile}</p><p className="mt-1 text-sm text-slate-500">Session active · préférences et données privées protégées</p></div></CardContent></Card>
      <Card><CardHeader><div><p className="text-lg font-semibold">Préférences</p><p className="mt-1 text-sm text-slate-500">Personnalisez l’expérience de l’assistant.</p></div><Settings className="size-5 text-slate-400" /></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-4"><div><p className="font-medium">Voix de l’assistant</p><p className="mt-1 text-sm text-slate-500">Réponses courtes et naturelles</p></div><Badge>Par défaut</Badge></div><div className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-4"><div><p className="font-medium">Mode partagé</p><p className="mt-1 text-sm text-slate-500">Les informations privées restent masquées</p></div><Badge>Activé</Badge></div></CardContent></Card>
    </div>
  );
}

function CostView() {
  const points = [38, 42, 35, 52, 48, 61, 58, 72, 66, 78, 74, 86];
  return (
    <div className="cost-page mt-2">
      <div><p className="text-sm text-slate-500">Pilotage de Home AI</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Coût</h2><p className="cost-description mt-2 max-w-2xl text-sm leading-6 text-slate-500">Suivez les dépenses estimées liées aux modèles IA, à l’hébergement et aux services connectés.</p></div>
      <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><p className="text-sm text-slate-400">Ce mois-ci</p><p className="mt-2 text-3xl font-semibold">12,40 €</p><p className="mt-1 text-sm text-emerald-400">−8 % vs. mois dernier</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-slate-400">Projection</p><p className="mt-2 text-3xl font-semibold">18,70 €</p><p className="mt-1 text-sm text-slate-500">Estimation mensuelle</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-slate-400">Principal poste</p><p className="mt-2 text-lg font-semibold">Modèles IA</p><p className="mt-1 text-sm text-slate-500">72 % du total estimé</p></CardContent></Card></div>
      <Card><CardHeader><div><p className="text-lg font-semibold">Évolution des coûts</p><p className="mt-1 text-sm text-slate-500">12 derniers mois · données estimatives</p></div><WalletCards className="size-5 text-slate-400" /></CardHeader><CardContent><div className="cost-chart" role="img" aria-label="Graphique de l’évolution estimée des coûts sur douze mois">{points.map((height, index) => <div key={index} className="cost-bar" style={{ height: `${height}%` }}><span /></div>)}</div><div className="mt-3 flex justify-between text-[11px] text-slate-500"><span>Déc. 25</span><span>Juin 26</span><span>Nov. 26</span></div></CardContent></Card>
      <Card className="cost-breakdown"><CardHeader><div><p className="text-lg font-semibold">Répartition</p><p className="mt-1 text-sm text-slate-500">À connecter aux métriques Home Core</p></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-sky-400/10 p-4"><p className="text-sm text-sky-200">Modèles IA</p><p className="mt-2 text-xl font-semibold">8,90 €</p></div><div className="rounded-2xl bg-violet-400/10 p-4"><p className="text-sm text-violet-200">Hébergement</p><p className="mt-2 text-xl font-semibold">2,50 €</p></div><div className="rounded-2xl bg-teal-400/10 p-4"><p className="text-sm text-teal-200">Services</p><p className="mt-2 text-xl font-semibold">1,00 €</p></div></CardContent></Card>
    </div>
  );
}

function SettingsView({ lightMode, onThemeChange }: { lightMode: boolean; onThemeChange: (value: boolean) => void }) {
  return <div className="mt-8 max-w-2xl"><div><p className="text-sm text-slate-500">Personnalisation du panneau</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Réglages</h2></div><Card className="mt-6"><CardContent className="flex items-center justify-between gap-4 p-5"><div><p className="font-semibold">Mode clair</p><p className="mt-1 text-sm text-slate-500">Utiliser une interface lumineuse.</p></div><button type="button" role="switch" aria-checked={lightMode} onClick={() => onThemeChange(!lightMode)} className={lightMode ? "relative h-7 w-12 rounded-full bg-sky-500 transition" : "relative h-7 w-12 rounded-full bg-zinc-700 transition"}><span className={lightMode ? "absolute right-1 top-1 size-5 rounded-full bg-white transition" : "absolute left-1 top-1 size-5 rounded-full bg-white transition"} /></button></CardContent></Card></div>;
}

const wakeEvent = "home-ai:wake";
const activateWakeEvent = "home-ai:activate-wake";
const voiceTranscriptEvent = "home-ai:voice-transcript";
type WakeEventDetail = { stream: MediaStream };
type VoiceTranscriptDetail = { transcript: string };
type BrowserRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start: () => void;
  stop: () => void;
};

function createBrowserRecognition(): BrowserRecognition | null {
  const factory = (window as Window & { SpeechRecognition?: new () => BrowserRecognition; webkitSpeechRecognition?: new () => BrowserRecognition }).SpeechRecognition
    ?? (window as Window & { SpeechRecognition?: new () => BrowserRecognition; webkitSpeechRecognition?: new () => BrowserRecognition }).webkitSpeechRecognition;
  if (!factory) return null;
  const recognition = new factory();
  recognition.lang = "fr-FR";
  recognition.continuous = true;
  recognition.interimResults = true;
  return recognition;
}

function downsample(samples: Float32Array, sourceRate: number, targetRate = 16000): Float32Array {
  if (sourceRate === targetRate) return samples.slice();
  const ratio = sourceRate / targetRate;
  const output = new Float32Array(Math.floor(samples.length / ratio));
  for (let index = 0; index < output.length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.max(start + 1, Math.floor((index + 1) * ratio));
    let sum = 0;
    for (let sourceIndex = start; sourceIndex < end && sourceIndex < samples.length; sourceIndex += 1) sum += samples[sourceIndex];
    output[index] = sum / (end - start);
  }
  return output;
}

function WakeWordListener() {
  const activate = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let active = true;
    let starting = false;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    let processor: ScriptProcessorNode | null = null;
    let pending: number[] = [];
    let sending = false;
    let pausedUntil = 0;

    const start = async () => {
      if (starting || processor) return;
      starting = true;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
        if (!active) return;
        context = new AudioContext();
        await context.resume();
        if (context.state !== "running") throw new Error("audio_context_suspended");
        const source = context.createMediaStreamSource(stream);
        processor = context.createScriptProcessor(4096, 1, 1);
        const silentOutput = context.createGain();
        silentOutput.gain.value = 0;
        source.connect(processor);
        processor.connect(silentOutput).connect(context.destination);
        processor.onaudioprocess = (event) => {
          if (!active || Date.now() < pausedUntil) return;
          const frame = downsample(event.inputBuffer.getChannelData(0), context?.sampleRate ?? 48000);
          pending.push(...frame);
          if (pending.length < 3200 || sending) return;
          const payload = new Float32Array(pending.splice(0, 3200));
          sending = true;
          void fetch("/v1/assistant/wake", {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: payload.buffer,
          }).then(async (response) => {
            if (!response.ok) return;
            const result = await response.json() as { detected: boolean };
            if (result.detected) {
              pausedUntil = Date.now() + 15_000;
              pending = [];
              window.dispatchEvent(new CustomEvent<WakeEventDetail>(wakeEvent, { detail: { stream: stream! } }));
            }
          }).finally(() => { sending = false; });
        };
      } catch (error) {
        console.warn("Activation de Bonjour Jarvis impossible", error);
        if (processor) processor.onaudioprocess = null;
        processor?.disconnect();
        processor = null;
        await context?.close();
        context = null;
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
      } finally {
        starting = false;
      }
    };

    activate.current = start;
    const handleActivation = () => { void start(); };
    window.addEventListener(activateWakeEvent, handleActivation);
    return () => {
      active = false;
      activate.current = null;
      window.removeEventListener(activateWakeEvent, handleActivation);
      if (processor) processor.onaudioprocess = null;
      processor?.disconnect();
      void context?.close();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  return null;
}

type AssistantAnswer = { text: string; confirmationId?: string; continueConversation?: boolean };

function MailConfirmation({ id, onAnswer, onCancel }: { id: string; onAnswer: (answer: AssistantAnswer) => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rememberSession, setRememberSession] = useState(true);
  return <div className="workspace-confirmation"><p className="text-sm font-medium text-zinc-200">Cette action nécessite votre confirmation.</p><label className="flex cursor-pointer items-center gap-3 text-left text-sm text-zinc-300"><input type="checkbox" checked={rememberSession} onChange={(event) => setRememberSession(event.target.checked)} className="size-4 accent-zinc-200" />Autoriser Gmail et Drive pour cette session</label><div className="flex gap-2"><Button variant="ghost" disabled={busy} onClick={onCancel}>Refuser</Button><Button className="flex-1" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/v1/assistant/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmationId: id, rememberSession }) });
      if (!response.ok) throw new Error("unavailable");
      onAnswer(await response.json() as AssistantAnswer);
    } catch { setError("Autorisation indisponible. Relancez votre demande."); }
    finally { setBusy(false); }
  }}>{busy ? "Consultation…" : "Confirmer et continuer"}</Button></div>{error && <p role="alert">{error}</p>}</div>;
}

type DebugMail = {
  id: string;
  sender: string;
  senderEmail: string;
  recipients: string[];
  date: string;
  subject: string;
  preview: string;
  body: string[];
  attachments: { id?: string; name: string; size: string; type: string }[];
  unread?: boolean;
};

const debugMails: DebugMail[] = [
  {
    id: "design-review",
    sender: "Lise Martin",
    senderEmail: "lise.martin@example.com",
    recipients: ["Clément", "Équipe maison"],
    date: "Aujourd’hui · 09:42",
    subject: "Re: Revue de l’interface Home AI",
    preview: "J’ai ajouté mes retours sur la nouvelle vue des mails…",
    body: ["Salut Clément,", "J’ai ajouté mes retours sur la nouvelle vue des mails. La lecture en deux colonnes fonctionne bien sur tablette, surtout avec les pièces jointes visibles dès le premier regard.", "On peut en reparler ce soir si tu veux. À bientôt !\nLise"],
    attachments: [{ name: "retours-interface.pdf", size: "1,2 Mo", type: "PDF" }],
    unread: true,
  },
  {
    id: "delivery",
    sender: "Maison & Confort",
    senderEmail: "suivi@maison-confort.example",
    recipients: ["Clément"],
    date: "Hier · 16:18",
    subject: "Votre livraison est prévue demain",
    preview: "Votre commande arrivera entre 14 h et 16 h…",
    body: ["Bonjour Clément,", "Votre commande arrivera demain entre 14 h et 16 h à l’adresse indiquée lors de votre commande.", "Vous pouvez suivre la livraison depuis votre espace client."],
    attachments: [{ name: "bon-de-commande.pdf", size: "284 ko", type: "PDF" }],
  },
  {
    id: "calendar",
    sender: "Clément Dubois",
    senderEmail: "clement.dubois@example.com",
    recipients: ["Lise Martin", "Clément"],
    date: "Lundi · 11:07",
    subject: "Préparation du week-end",
    preview: "Voici la liste des choses à prévoir pour samedi…",
    body: ["Bonjour,", "Voici la liste des choses à prévoir pour samedi. J’ai mis à jour le calendrier partagé et ajouté les horaires de train.", "Bonne journée"],
    attachments: [],
  },
];

type GmailMessageResponse = {
  id: string;
  threadId?: string;
  from: string;
  subject: string;
  receivedAt: string;
  snippet: string;
  body: string;
  attachments?: { id: string; name: string; mimeType: string; size: number }[];
};

function useGmailMails(query = "", enabled = true) {
  const [mails, setMails] = useState<DebugMail[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!enabled || !query) { setMails([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/v1/workspace/google/gmail/messages?q=${encodeURIComponent(query)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Gmail indisponible");
        return response.json() as Promise<{ messages: GmailMessageResponse[] }>;
      })
      .then((payload) => {
        if (cancelled) return;
        const formatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
        setMails((payload.messages ?? []).map((mail) => {
          const match = mail.from.match(/^(.*?)\s*<([^>]+)>$/);
          const sender = match?.[1]?.trim() || mail.from;
          const senderEmail = match?.[2] || mail.from;
          return { id: mail.id, sender, senderEmail, recipients: ["vous"], date: formatter.format(new Date(mail.receivedAt)), subject: mail.subject || "(sans objet)", preview: mail.snippet, body: mail.body ? mail.body.split(/\n{2,}/) : [mail.snippet], attachments: (mail.attachments ?? []).map((attachment) => ({ id: attachment.id, name: attachment.name, size: attachment.size >= 1_000_000 ? `${(attachment.size / 1_000_000).toFixed(1)} Mo` : `${Math.max(1, Math.round(attachment.size / 1_000))} Ko`, type: attachment.mimeType })) };
        }));
        setError("");
      })
      .catch((reason: Error) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, enabled]);
  return { mails, loading, error };
}

function gmailQueryFromTranscript(transcript?: string) {
  const match = transcript?.match(/\b(?:de|avec|pour)\s+([A-ZÀ-ÖØ-Ý][\p{L}'-]+(?:\s+[A-ZÀ-ÖØ-Ý][\p{L}'-]+){1,2})/u);
  return match?.[1] ?? "newer_than:30d";
}

function MailDebugDialog({ onClose }: { onClose: () => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; type: string; size: string } | null>(null);
  const [dragX, setDragX] = useState(0);
  const live = useGmailMails("newer_than:30d");
  const dragStart = useRef<number | null>(null);
  const debugMails = live.mails;
  const move = (direction: number) => setSelectedIndex((current) => (current + direction + debugMails.length) % debugMails.length);
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => { dragStart.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); };
  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    const delta = event.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(delta) > 48) move(delta < 0 ? 1 : -1);
    setDragX(0);
  };
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const attachmentKind = (name: string) => name.endsWith(".pdf") ? "PDF" : name.match(/\.(png|jpe?g|gif|webp)$/i) ? "Image" : name.match(/\.(mp4|mov|webm)$/i) ? "Vidéo" : name.match(/\.(xlsx?|csv)$/i) ? "Tableur" : "Document";
  return <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/80 p-3 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="mail-debug-title" className="mail-debug-dialog flex h-[min(760px,calc(100dvh-1.5rem))] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-sky-400/15 text-sky-200"><Mail className="size-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-200">Debug · conversation</p><h2 id="mail-debug-title" className="text-lg font-semibold">Recherche de mails</h2></div></div><Button variant="ghost" size="icon" aria-label="Fermer la prévisualisation des mails" onClick={onClose}><X /></Button></header>
      <div className="mail-debug-layout grid min-h-0 flex-1 md:grid-cols-[minmax(240px,.8fr)_minmax(340px,1.2fr)]">
        <section className="flex min-h-0 flex-col justify-center p-6 sm:p-10"><p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-200">Assistant · Gmail</p><p className="mt-4 max-w-md text-2xl font-semibold tracking-tight sm:text-3xl">J’ai trouvé {debugMails.length} mails correspondant à votre recherche.</p><p className="mt-4 max-w-md text-sm leading-6 text-slate-400">Faites glisser la carte pour parcourir les résultats. Les informations restent dans la conversation.</p><div className="mt-8 flex items-center gap-2 text-xs text-slate-500"><span className="size-2 rounded-full bg-sky-300" />{selectedIndex + 1} sur {debugMails.length}</div></section>
        <section className="flex min-h-0 flex-col justify-center overflow-hidden px-5 pb-8 sm:px-10 sm:pb-10">{live.loading ? <p className="text-sm text-slate-400">Lecture des vrais mails Gmail…</p> : live.error ? <p className="text-sm text-rose-300">{live.error}. Connectez Gmail pour afficher les messages.</p> : debugMails.length === 0 ? <p className="text-sm text-slate-400">Aucun mail trouvé sur les 30 derniers jours.</p> : <><div className="mail-stack" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerMove={(event) => { if (dragStart.current !== null) setDragX(event.clientX - dragStart.current); }} aria-label="Résultats mails, faites glisser pour naviguer">{debugMails.map((mail, index) => { const offset = (index - selectedIndex + debugMails.length) % debugMails.length; const isSelected = offset === 0; return <article key={mail.id} className={`mail-card ${isSelected ? "mail-card-active" : ""}`} style={{ transform: isSelected ? `translateX(${dragX}px) rotate(${dragX * 0.025}deg)` : `translateY(${offset * 10}px) rotate(${offset === 1 ? 6 : -6}deg) scale(${1 - offset * .035})`, zIndex: debugMails.length - offset, opacity: offset > 2 ? 0 : 1 }}><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{mail.date}</p><h3 className="mt-2 text-lg font-semibold leading-tight">{mail.subject}</h3></div><Badge className="shrink-0 bg-sky-400/15 text-sky-200">{mail.unread ? "Nouveau" : "Lu"}</Badge></div><div className="mt-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-sky-300 to-violet-300 text-sm font-bold text-zinc-950">{mail.sender.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{mail.sender}</p><p className="truncate text-xs text-slate-500">À {mail.recipients.join(", ")}</p></div></div><div className="mail-debug-body mt-6 space-y-3 text-sm leading-6 text-slate-300">{mail.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>{mail.attachments.length > 0 && <button type="button" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setPreviewAttachment({ ...mail.attachments[0], type: attachmentKind(mail.attachments[0].name) }); }} className="mt-6 flex w-full items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-left text-xs text-sky-100 transition hover:bg-white/[0.1]"><Paperclip className="size-3.5" />{mail.attachments[0].name}<span className="text-slate-500">· {mail.attachments[0].size}</span></button>}<div className="mt-6 flex gap-2"><Button variant="secondary" className="h-9 text-xs">Répondre</Button><Button variant="ghost" className="h-9 text-xs">Ouvrir</Button></div></article>; })}</div><div className="mt-6 flex justify-center gap-2"><Button variant="ghost" size="icon" aria-label="Mail précédent" onClick={() => move(-1)}><ChevronLeft /></Button><div className="flex items-center gap-1.5">{debugMails.map((mail, index) => <button key={mail.id} type="button" aria-label={`Afficher ${mail.subject}`} onClick={() => setSelectedIndex(index)} className={`size-1.5 rounded-full ${index === selectedIndex ? "bg-sky-300" : "bg-zinc-700"}`} />)}</div><Button variant="ghost" size="icon" aria-label="Mail suivant" onClick={() => move(1)}><ChevronRight /></Button></div></>}</section>
      </div>
      {previewAttachment && <div className="attachment-drawer-backdrop fixed inset-0 z-[60] bg-zinc-950/65" role="presentation" onMouseDown={() => setPreviewAttachment(null)}><section role="dialog" aria-modal="true" aria-labelledby="attachment-preview-title" className="attachment-drawer fixed inset-y-0 right-0 w-full max-w-[50vw] min-w-[360px] overflow-y-auto border-l border-white/10 bg-zinc-900 p-5 shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.16em] text-sky-200">Aperçu · {previewAttachment.type}</p><h2 id="attachment-preview-title" className="mt-2 text-xl font-semibold">{previewAttachment.name}</h2><p className="mt-1 text-xs text-slate-500">{previewAttachment.size} · lecture intégrée, aucun téléchargement</p></div><Button variant="ghost" size="icon" aria-label="Fermer l’aperçu" onClick={() => setPreviewAttachment(null)}><X /></Button></div><div className="attachment-document mt-6"><div className="attachment-document-toolbar"><span>{previewAttachment.type}</span><span>1 / 1</span></div><div className="attachment-document-page"><h3>Revue de l’interface Home AI</h3><p>Document affiché directement dans le panneau de lecture.</p><p>La pièce jointe est consultable sans quitter la conversation. Le viewer final pourra afficher le contenu fourni par Home Core : PDF, image, vidéo, document texte ou tableur.</p><div className="attachment-document-lines"><span /><span /><span /><span /><span /></div></div></div></section></div>}
    </section>
  </div>;
}

function AssistantOrb({ compact = false }: { compact?: boolean }) {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Touchez pour parler");

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const ownsStream = useRef(false);
  const silenceTimer = useRef<number | null>(null);
  const startedAt = useRef(0);

  const stop = useCallback(() => {
    if (silenceTimer.current) window.clearInterval(silenceTimer.current);
    silenceTimer.current = null;
    recorder.current?.stop();
    if (ownsStream.current) stream.current?.getTracks().forEach((track) => track.stop());
    recorder.current = null;
    stream.current = null;
    setListening(false);
  }, []);

  const start = useCallback(async (existingStream?: MediaStream) => {
    try {
      const capturedStream = existingStream ?? await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      stream.current = capturedStream;
      ownsStream.current = !existingStream;
      const chunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(capturedStream);
      recorder.current = mediaRecorder;
      const recognition = createBrowserRecognition();
      try { recognition?.start(); } catch { /* Browser interim STT is optional. */ }
      if (recognition) recognition.onresult = (event) => {
        let transcript = "";
        for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
        window.dispatchEvent(new CustomEvent<VoiceTranscriptDetail>(voiceTranscriptEvent, { detail: { transcript } }));
      };
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      mediaRecorder.onstop = async () => {
        recognition?.stop();
        setStatus("Transcription…");
        const response = await fetch("/v1/assistant/voice", { method: "POST", headers: { "Content-Type": mediaRecorder.mimeType || "audio/webm" }, body: new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" }) });
        if (!response.ok) { setStatus("La voix est indisponible"); return; }
        const result = await response.json() as { transcript: string; answer: AssistantAnswer };
        setStatus(result.answer.text);

      };
      mediaRecorder.start();
      startedAt.current = Date.now();
      setListening(true);
      setStatus("Je t’écoute…");
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(capturedStream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const graceUntil = startedAt.current + 800;
      let speechFrames = 0;
      let heardSpeech = false;
      let quietSince = 0;
      silenceTimer.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        const level = samples.reduce((sum, value) => sum + Math.abs(value - 128), 0) / samples.length;
        const now = Date.now();
        if (now < graceUntil) {
          speechFrames = 0;
          quietSince = 0;
          return;
        }
        if (level >= 3) {
          speechFrames += 1;
          if (speechFrames >= 2) heardSpeech = true;
          quietSince = 0;
        } else {
          speechFrames = 0;
          if (heardSpeech) quietSince ||= now;
        }
        if ((heardSpeech && quietSince && now - quietSince > 1200) || now - startedAt.current > 15000) {
          context.close();
          stop();
        }
      }, 100);
    } catch {
      setStatus("Microphone non disponible");
      stop();
    }
  }, [stop]);

  useEffect(() => {
    const handleWake = (event: Event) => {
      if (!recorder.current) void start((event as CustomEvent<WakeEventDetail>).detail?.stream);
    };
    window.addEventListener(wakeEvent, handleWake);
    return () => window.removeEventListener(wakeEvent, handleWake);
  }, [start]);

  const activate = () => {
    setStatus("Activation du micro…");
    window.dispatchEvent(new Event(activateWakeEvent));
  };

  return <Card className={(compact ? "sidebar-assistant-card " : "dashboard-assistant-card ") + "overflow-hidden border-white/10 bg-black"}>
    <button type="button" aria-label="Activer l’assistant vocal" onClick={activate} className="flex h-full w-full items-center justify-center p-4 outline-none transition hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-sky-300">
      <Orb state={listening ? "using" : "waiting"} size={compact ? 112 : 240} dotSize={0.45} speed={listening ? 1 : 0.7} label="Assistant vocal" />
      <span className="sr-only">{status}</span>
    </button>
  </Card>;
}

function VoiceEnrollment({ profile }: { profile: Profile }) {
  const [enrolling, setEnrolling] = useState(false);
  const [status, setStatus] = useState("");

  const enroll = async () => {
    setEnrolling(true);
    setStatus("Parlez pendant 4 secondes…");
    let capturedStream: MediaStream | null = null;
    try {
      capturedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(capturedStream);
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
      recorder.start();
      await new Promise((resolve) => window.setTimeout(resolve, 4000));
      recorder.stop();
      await stopped;
      const profileID = profile.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const response = await fetch(`/v1/assistant/voice-profiles/${encodeURIComponent(profileID)}`, { method: "POST", headers: { "Content-Type": recorder.mimeType || "audio/webm" }, body: new Blob(chunks, { type: recorder.mimeType || "audio/webm" }) });
      if (!response.ok) throw new Error("enrollment_failed");
      setStatus("Voix enregistrée");
    } catch {
      setStatus("Enrôlement indisponible");
    } finally {
      capturedStream?.getTracks().forEach((track) => track.stop());
      setEnrolling(false);
    }
  };

  return <button type="button" disabled={enrolling} onClick={enroll} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-zinc-400 hover:bg-white/10 disabled:opacity-60"><Mic className="size-3.5" />{enrolling ? status : status || "Enrôler ma voix"}</button>;
}

function WeatherCard() {
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getWeather(controller.signal).then(setWeather).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setUnavailable(true);
    });
    return () => controller.abort();
  }, []);

  return (
    <Card className="dashboard-weather relative overflow-hidden border-white/10 bg-zinc-950 text-sky-50">
      <div className="weather-landscape" aria-hidden="true">
        <Ascii piece={earthrise} options={{ fps: 8 }} className="weather-landscape-art" style={{ width: "max(100%, 360px)" }} />
      </div>
      <CardContent className="weather-content relative flex min-h-[220px] flex-col justify-between p-6">
        <div className="flex items-start justify-between"><div><p className="text-sm font-medium text-sky-50">{weather?.location.name ?? "Météo locale"}</p><p className="mt-2 text-5xl font-semibold tracking-[-0.06em]">{weather ? `${Math.round(weather.current.temperatureCelsius)}°` : "—"}</p></div><CloudSun className="size-12 text-sky-100/80" /></div>
        <div className="flex items-end justify-between gap-4"><p className="weather-detail max-w-64 text-sm leading-5 text-sky-50">{weather?.current.summary ?? (unavailable ? "La météo est momentanément indisponible." : "Chargement de la météo…")}</p><span className="shrink-0 rounded-full bg-white/15 px-3 py-2 text-xs font-medium text-sky-50">{weather ? `Ressenti ${Math.round(weather.current.apparentCelsius)}°` : "Home Core"}</span></div>
      </CardContent>
    </Card>
  );
}

type DashboardRoom = (typeof rooms)[number];
type RoomDialogRoom = Pick<DashboardRoom, "name" | "icon" | "tone">;
type Reminder = { id: string; time: string; title: string; detail: string; owner: string; tone: string; date: string };
type ReminderRecord = { id: string; title: string; date: string; details?: string };

function RoomDetailDialog({ room, onClose }: { room: RoomDialogRoom; onClose: () => void }) {
  const [devices, setDevices] = useState<HomeDevice[]>([]);
  const [states, setStates] = useState<Record<string, DeviceState>>({});
  const [unavailable, setUnavailable] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    getHomeDevices(controller.signal).then(async (allDevices) => {
      const roomDevices = allDevices.filter((device) => device.room.toLocaleLowerCase("fr-FR") === room.name.toLocaleLowerCase("fr-FR"));
      setDevices(roomDevices);
      const entries = await Promise.all(roomDevices.map(async (device) => [device.id, await getDeviceState(device.id, controller.signal)] as const));
      setStates(Object.fromEntries(entries));
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setUnavailable(true);
    });
    return () => controller.abort();
  }, [room.name]);

  const switchableDevices = devices.filter((device) => device.capabilities.includes("switch"));
  const lights = switchableDevices.filter((device) => device.kind === "light");
  const plugs = switchableDevices.filter((device) => device.kind === "plug");
  const temperature = devices.map((device) => states[device.id]?.temperatureC).find((value): value is number => value !== undefined);
  const setSwitch = async (device: HomeDevice, on: boolean) => {
    setPending(device.id);
    try {
      const state = await setDeviceSwitch(device.id, on);
      setStates((current) => ({ ...current, [device.id]: state }));
    } catch { setUnavailable(true); } finally { setPending(null); }
  };

  const Icon = room.icon;
  return <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="room-dialog-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900 p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-start gap-4"><span className={"grid size-12 place-items-center rounded-2xl " + room.tone}><Icon className="size-6" /></span><div><p className="text-sm text-slate-400">Détail de la pièce</p><h2 id="room-dialog-title" className="text-xl font-semibold">{room.name}</h2></div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/[0.05] p-4"><div className="flex items-center gap-2 text-slate-500"><Thermometer className="size-4" /><p className="text-xs">Température</p></div><p className="mt-1 text-xl font-semibold">{temperature === undefined ? "—" : `${Math.round(temperature)}°`}</p></div><div className="rounded-2xl bg-white/[0.05] p-4"><p className="text-xs text-slate-500">État de connexion</p><p className="mt-1 font-medium">{unavailable ? "Indisponible" : devices.length === 0 ? "Aucun équipement" : "Connecté"}</p></div></div>
      {([ ["Lumières", lights, Lightbulb], ["Prises", plugs, Plug] ] as const).map(([label, group, DeviceIcon]) => <div key={label} className="mt-5"><div className="mb-2 flex items-center gap-2"><DeviceIcon className="size-4 text-slate-400" /><p className="text-sm font-semibold">{label}</p></div>{group.length === 0 ? <p className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-slate-500">Aucun équipement détecté.</p> : <div className="space-y-2">{group.map((device) => { const isOn = states[device.id]?.switchOn ?? false; return <div key={device.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.05] p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{device.name}</p><p className={isOn ? "mt-0.5 text-xs text-emerald-400" : "mt-0.5 text-xs text-slate-500"}>{isOn ? "Allumée" : "Éteinte"}</p></div><Button variant={isOn ? "secondary" : "default"} className="h-9 shrink-0 px-3 text-xs" disabled={pending === device.id} onClick={() => void setSwitch(device, !isOn)}>{isOn ? "Éteindre" : "Allumer"}</Button></div>; })}</div>}</div>)}
    </section>
  </div>;
}

function ReminderDetailDialog({ reminder, onClose }: { reminder: Reminder; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="reminder-dialog-title" className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-sky-400/15 text-sky-200"><CalendarDays className="size-6" /></span><div><p className="text-sm text-slate-400">Détail du rappel</p><h2 id="reminder-dialog-title" className="text-xl font-semibold">{reminder.title}</h2></div></div><Button variant="ghost" size="icon" aria-label="Fermer" onClick={onClose}><X /></Button></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/[0.05] p-4"><p className="text-xs text-slate-500">Quand</p><p className="mt-1 font-medium">{reminder.time}</p></div><div className="rounded-2xl bg-white/[0.05] p-4"><p className="text-xs text-slate-500">Agenda</p><p className="mt-1 font-medium">{reminder.owner}</p></div></div>
      <div className="mt-3 rounded-2xl bg-white/[0.05] p-4"><p className="text-xs text-slate-500">Lieu / précision</p><p className="mt-1 font-medium">{reminder.detail}</p></div>
      <div className="mt-5 flex justify-end"><Button onClick={onClose}>Fermer</Button></div>
    </section>
  </div>;
}

function WeeklyChoresCard() {
  const [tasks, setTasks] = useState<WeeklyChore[]>([]); const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { const controller = new AbortController(); const today = new Date().toISOString().slice(0, 10); fetch(`/v1/chores/?day=${today}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setTasks(Array.isArray(data.chores) ? data.chores : [])).catch(() => setUnavailable(true)); return () => controller.abort(); }, []);
  const toggle = (id: string) => { const task = tasks.find((item) => item.id === id); if (!task) return; setTasks((current) => current.map((item) => item.id === id ? { ...item, completed: !item.completed } : item)); void fetch(`/v1/chores/${encodeURIComponent(id)}/completion`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: !task.completed }) }); };
  const assigneeTone = (task: WeeklyChore) => task.assignees.length > 1 ? "chore-duo" : task.assignees[0] === "Lise" ? "chore-lise" : "chore-clement";
  const completedCount = tasks.filter((task) => task.completed).length;
  return <Card className="dashboard-chores-card"><CardHeader><div><p className="text-lg font-semibold">Tâches ménagères</p><p className="mt-1 text-sm text-slate-500">{completedCount} tâche{completedCount > 1 ? "s" : ""} réalisée{completedCount > 1 ? "s" : ""} sur {tasks.length} aujourd’hui</p></div><Sparkles className="size-5 text-slate-400" /></CardHeader><CardContent className="space-y-2">{unavailable ? <p className="text-sm text-amber-300">Tâches ménagères indisponibles.</p> : tasks.length === 0 ? <p className="text-sm text-slate-500">Aucune tâche aujourd’hui.</p> : tasks.map((task) => <button type="button" onClick={() => toggle(task.id)} key={`${task.id}-${task.dueDate}`} className={(task.completed ? "chore-complete " : "") + "chore-item flex w-full items-center gap-2 rounded-xl bg-white/[0.04] px-2 py-2 text-left"}><span className={`chore-person-icon grid size-7 shrink-0 place-items-center rounded-lg ${assigneeTone(task)}`}><UtensilsCrossed className="size-4 text-white" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{task.objective}</p><p className="text-xs text-slate-500">{new Date(`${task.dueDate}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })} · {task.assignees.join(" & ")}</p></div></button>)}</CardContent></Card>;
}

function TrainsCard() {
  const [trains, setTrains] = useState<Train[]>([]); const [error, setError] = useState(false); const [selected, setSelected] = useState<Train | null>(null);
  useEffect(() => { const controller = new AbortController(); fetch("/v1/insights/trains", { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { if (Array.isArray(data.trains)) setTrains(data.trains); }).catch(() => setError(true)); return () => controller.abort(); }, []);
  const format = (value: string) => new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const formatUpdated = (value?: string) => value ? new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Non communiquée";
  const dayLabel = (value: string) => { const date = new Date(value); const today = new Date(); const delta = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime(); return delta === 86400000 ? "Demain" : delta === 0 ? "Aujourd’hui" : date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }); };
  return <><Card className="dashboard-trains-card"><CardHeader><div><p className="text-lg font-semibold">{trains.length || 0} prochains trains</p><p className="mt-1 text-sm text-slate-500">La Ciotat-Ceyreste → Marseille · SNCF</p></div><TrainFront className="size-5 text-slate-400" /></CardHeader><CardContent className="space-y-2">{error ? <p className="text-sm text-amber-300">Informations SNCF indisponibles.</p> : trains.length === 0 ? <p className="text-sm text-slate-500">Chargement des départs en temps réel…</p> : trains.map((train) => <button type="button" onClick={() => setSelected(train)} key={train.id} className="flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-2 py-2 text-left hover:bg-white/[0.08]"><span><span className="flex items-baseline gap-2"><span className="text-sm font-semibold">{format(train.departure)}</span><span className="text-xs text-slate-400">départ</span>{train.arrival && <><span className="text-sm font-semibold">{format(train.arrival)}</span><span className="text-xs text-slate-400">arrivée</span></>}</span><span className="text-xs text-slate-500">{dayLabel(train.departure)} · {train.trainNumber || train.commercialMode}</span></span><Badge className={train.status === "cancelled" ? "bg-rose-400/15 text-rose-200" : train.status === "delayed" ? "bg-amber-400/15 text-amber-200" : "bg-emerald-400/15 text-emerald-200"}>{train.status === "cancelled" ? "Supprimé" : train.status === "delayed" ? `+${train.delayMinutes} min` : "À l’heure"}</Badge></button>)}</CardContent></Card>{selected && <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/75 p-4" onMouseDown={() => setSelected(null)}><section role="dialog" aria-modal="true" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900 p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-sky-400/15 text-sky-200"><TrainFront className="size-6" /></span><div><p className="text-sm text-slate-400">{selected.commercialMode || "Train SNCF"} · {selected.trainNumber}</p><h2 className="text-xl font-semibold">{selected.destination}</h2></div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/[0.05] p-3"><p className="text-xs text-slate-500">Départ</p><p className="mt-1 font-semibold">{dayLabel(selected.departure)} · {format(selected.departure)} <span className="text-xs text-slate-500">(prévu {format(selected.scheduledDeparture)})</span></p></div><div className="rounded-2xl bg-white/[0.05] p-3"><p className="text-xs text-slate-500">Arrivée</p><p className="mt-1 font-semibold">{selected.arrival ? `${dayLabel(selected.arrival)} · ${format(selected.arrival)}` : "Non communiquée"}</p></div><div className="rounded-2xl bg-white/[0.05] p-3"><p className="text-xs text-slate-500">Quai</p><p className="mt-1 font-semibold">{selected.platform || "Non communiqué"}</p></div><div className="rounded-2xl bg-white/[0.05] p-3"><p className="text-xs text-slate-500">Mise à jour</p><p className="mt-1 font-semibold">{formatUpdated(selected.lastUpdated)}</p></div></div>{selected.disruption && <div className="mt-3 rounded-2xl bg-amber-400/10 p-3 text-sm text-amber-100"><p className="font-semibold">{selected.disruption.title}</p>{selected.disruption.cause && <p className="mt-1">Cause : {selected.disruption.cause}</p>}{selected.disruption.information && <p className="mt-1">{selected.disruption.information}</p>}</div>}<div className="mt-5 flex justify-end"><Button onClick={() => setSelected(null)}>Fermer</Button></div></section></div>}</>;
}

function MarketsCard() {
  const [period, setPeriod] = useState("Jour");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketsError, setMarketsError] = useState(false);
  const [selected, setSelected] = useState<Market | null>(null);
  const [detail, setDetail] = useState<MarketDetail | null>(null);
  const [detailError, setDetailError] = useState(false);
  const [news, setNews] = useState(["Les marchés européens ouvrent en hausse.", "La BCE maintient ses taux directeurs.", "Les valeurs technologiques restent soutenues."]);
  useEffect(() => { const controller = new AbortController(); setMarketsError(false); fetch(`/v1/insights/markets?period=${period.toLowerCase()}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { if (!Array.isArray(data.etfs) || data.etfs.length !== 6) throw new Error("invalid market response"); setMarkets(data.etfs); if (Array.isArray(data.news)) setNews(data.news); }).catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) { setMarkets([]); setSelected(null); setMarketsError(true); } }); return () => controller.abort(); }, [period]);
  useEffect(() => { if (!selected) { setDetail(null); setDetailError(false); return; } const controller = new AbortController(); setDetail(null); setDetailError(false); fetch(`/v1/insights/markets/${selected.symbol}?period=${period.toLowerCase()}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then((data: MarketDetail) => { setDetail(data); setDetailError(data.dataStatus === "unavailable" || data.history.length === 0); }).catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setDetailError(true); }); return () => controller.abort(); }, [selected, period]);
  return <><Card className="dashboard-markets-card"><CardHeader><div><p className="text-lg font-semibold">Marchés & actualités</p><div className="mt-2 flex gap-1">{["Jour", "Mois", "Année"].map((item) => <Button key={item} type="button" variant={period === item ? "secondary" : "ghost"} className="h-6 px-2 text-[10px]" onClick={() => setPeriod(item)}>{item}</Button>)}</div></div><TrendingUp className="size-5 text-slate-400" /></CardHeader><CardContent>{marketsError ? <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-xs text-rose-200">Backend marchés indisponible.</p> : <div className="grid grid-cols-2 gap-1">{markets.map((market) => <button type="button" key={market.symbol} onClick={() => setSelected(market)} className="rounded-lg bg-white/[0.04] p-1.5 text-left transition hover:bg-white/[0.1]"><p className="truncate text-[10px] text-slate-300">{market.symbol}</p><p className="truncate text-[9px] text-slate-500">{market.name.replace("Amundi ", "")}</p><p className={market.change >= 0 ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-rose-400"}>{market.change >= 0 ? "+" : ""}{market.change}%</p></button>)}</div>}<ol className="mt-2 space-y-1.5">{news.slice(0, 3).map((item) => <li key={item} className="text-xs leading-4 text-slate-300">• {item}</li>)}</ol></CardContent></Card>{selected && <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/75 p-4" onMouseDown={() => setSelected(null)}><section role="dialog" aria-modal="true" aria-labelledby="market-dialog-title" className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-400">ETF suivi · {selected.symbol}</p><h2 id="market-dialog-title" className="mt-1 text-xl font-semibold">{selected.name}</h2><p className="mt-1 text-xs text-slate-500">ISIN {selected.isin}</p></div><Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setSelected(null)}><X /></Button></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/[0.05] p-3"><p className="text-xs text-slate-500">Cours indicatif</p><p className="mt-1 font-semibold">{selected.price.toFixed(2)} €</p></div><div className="rounded-2xl bg-white/[0.05] p-3"><p className="text-xs text-slate-500">Variation</p><p className={selected.change >= 0 ? "mt-1 font-semibold text-emerald-400" : "mt-1 font-semibold text-rose-400"}>{selected.change >= 0 ? "+" : ""}{selected.change}%</p></div></div><div className="mt-5 rounded-2xl bg-white/[0.04] p-3"><p className="mb-2 text-xs text-slate-500">Évolution · {period.toLowerCase()}</p>{detailError ? <p role="alert" className="py-10 text-center text-sm text-amber-200">Historique indisponible avec la source de données actuelle.</p> : detail?.history?.length ? <svg viewBox="0 0 360 120" className="h-32 w-full" role="img" aria-label={`Évolution de ${selected.symbol}`}><polyline fill="none" stroke="rgb(110 231 183)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={detail.history.map((point, index) => `${(index / (detail.history.length - 1)) * 340 + 10},${110 - ((point.value - Math.min(...detail.history.map((item) => item.value))) / (Math.max(...detail.history.map((item) => item.value)) - Math.min(...detail.history.map((item) => item.value)) || 1)) * 90}`).join(" ")} /></svg> : <p className="py-10 text-center text-sm text-slate-500">Chargement de l’historique…</p>}</div></section></div>}</>;
}

type VoiceStatus = { confirmationId?: string; continueConversation?: boolean; gmailQuery?: string; state: "idle" | "listening" | "transcribing" | "thinking" | "answered" | "error"; transcript?: string; answer?: string; updatedAt?: string };

type VoiceSource = { id: string; label: string; detail: string; mark: string };

const voiceSources: VoiceSource[] = [
  { id: "gmail", label: "Gmail", detail: "Recherche et lecture", mark: "G" },
  { id: "drive", label: "Drive", detail: "Fichiers et documents", mark: "D" },
  { id: "home", label: "Maison", detail: "Commandes locales", mark: "⌁" },
  { id: "call", label: "Appel", detail: "Conversation en cours", mark: "☎" },
  { id: "assistant", label: "Assistant", detail: "Réflexion et réponse", mark: "✦" },
];

function getActiveVoiceSource(status: VoiceStatus) {
  const request = `${status.transcript ?? ""} ${status.answer ?? ""}`.toLocaleLowerCase("fr-FR");
  if (/(mail|gmail|courriel|email|message)/.test(request)) return "gmail";
  if (/(drive|fichier|document|pdf)/.test(request)) return "drive";
  if (/(maison|salon|lumière|prise|chauffage|volet|domotique)/.test(request)) return "home";
  if (status.state === "listening" || status.state === "transcribing") return "call";
  return "assistant";
}

function isConversationStop(text: string) {
  return /\b(fin de la conversation|arrête(?:-toi)?|stop|annule(?:r)?|cancel|merci beaucoup|merci)\b/i.test(text.trim());
}

function PDFPreview({ url, name }: { url: string; name: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<{ pages?: number; error?: boolean }>({});
  useEffect(() => {
    let active = true;
    const task = getDocument(url);
    void task.promise.then(async (document) => {
      const page = await document.getPage(1);
      const canvas = canvasRef.current;
      if (!canvas || !active) return;
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas unavailable");
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      if (active) setState({ pages: document.numPages });
    }).catch(() => { if (active) setState({ error: true }); });
    return () => { active = false; void task.destroy(); };
  }, [url]);
  if (state.error) return <p role="alert" className="mt-6 rounded-xl bg-rose-400/10 p-4 text-sm text-rose-200">Impossible d’afficher ce PDF.</p>;
  return <div className="mt-6"><canvas ref={canvasRef} className="min-h-48 w-full rounded-xl bg-white shadow-sm" aria-label={`Première page de ${name}`} />{state.pages && <p className="mt-2 text-center text-xs text-slate-500">Page 1 sur {state.pages}</p>}</div>;
}

function VoiceOverlay({ status, open, onAnswer, onClose }: { status: VoiceStatus; open: boolean; onAnswer: (answer: AssistantAnswer) => void; onClose: () => void }) {
  const gmailQuery = status.gmailQuery || "";
  const liveGmail = useGmailMails(gmailQuery, Boolean(status.answer));
  const debugMails = liveGmail.mails;
  const [selectedMailIndex, setSelectedMailIndex] = useState(0);
  const [mailDragX, setMailDragX] = useState(0);
  const [attachmentPreview, setAttachmentPreview] = useState<{ name: string; size: string; type: string; sourceURL: string; previewURL?: string; error?: boolean } | null>(null);
  const mailDragStart = useRef<number | null>(null);
  const moveMail = (direction: number) => {
    if (debugMails.length < 2) return;
    setSelectedMailIndex((current) => (current + direction + debugMails.length) % debugMails.length);
  };
  const startMailSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    mailDragStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const endMailSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mailDragStart.current === null) return;
    const delta = event.clientX - mailDragStart.current;
    mailDragStart.current = null;
    if (Math.abs(delta) > 44) moveMail(delta < 0 ? 1 : -1);
    setMailDragX(0);
  };
  const previewAttachment = (messageID: string, attachment: DebugMail["attachments"][number]) => {
    if (!attachment.id) return;
    setAttachmentPreview({ ...attachment, sourceURL: `/v1/workspace/google/gmail/messages/${encodeURIComponent(messageID)}/attachments/${encodeURIComponent(attachment.id)}?mime=${encodeURIComponent(attachment.type)}` });
  };
  useEffect(() => {
    if (!attachmentPreview?.sourceURL) return;
    const controller = new AbortController();
    let previewURL: string | undefined;
    void fetch(attachmentPreview.sourceURL, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("attachment unavailable");
        const content = await response.blob();
        previewURL = URL.createObjectURL(new Blob([content], { type: attachmentPreview.type || content.type }));
        setAttachmentPreview((current) => current?.sourceURL === attachmentPreview.sourceURL ? { ...current, previewURL } : current);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setAttachmentPreview((current) => current?.sourceURL === attachmentPreview.sourceURL ? { ...current, error: true } : current);
        }
      });
    return () => { controller.abort(); if (previewURL) URL.revokeObjectURL(previewURL); };
  }, [attachmentPreview?.sourceURL]);
  useEffect(() => { setSelectedMailIndex(0); }, [gmailQuery]);
  useEffect(() => {
    if (status.state !== "answered" || !status.answer) return;
    let audioURL: string | undefined;
    let audio: HTMLAudioElement | undefined;
    const speak = async () => {
      try {
        const response = await fetch("/v1/assistant/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: status.answer }) });
        if (!response.ok) throw new Error("speech unavailable");
        audioURL = URL.createObjectURL(await response.blob());
        audio = new Audio(audioURL);
        await audio.play();
      } catch {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(status.answer);
        utterance.lang = "fr-FR";
        window.speechSynthesis.speak(utterance);
      }
    };
    void speak();
    return () => { audio?.pause(); window.speechSynthesis?.cancel(); if (audioURL) URL.revokeObjectURL(audioURL); };
  }, [status.state, status.answer, status.updatedAt]);

  useEffect(() => {
    if (status.state !== "listening") return;
    const audioContext = new AudioContext();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.setValueAtTime(1175, now + 0.11);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
    void oscillator.addEventListener("ended", () => void audioContext.close());
    return () => { void audioContext.close(); };
  }, [status.state]);
  if (!open) return null;
  const orb = status.state === "listening"
    ? <Orb state="using" variant="record" size={180} speed={1} label="Écoute en cours" />
    : status.state === "transcribing"
      ? <Orb state="working" variant="gyro" size={180} speed={1.1} label="Transcription en cours" />
      : status.state === "thinking"
        ? <Orb state="reasoning" variant="twins" size={180} speed={.9} label="Routage Gemini en cours" />
        : <Orb state="using" variant="tap" size={180} speed={1} label="Exécution en cours" />;
  const stageLabel = status.state === "listening" ? "Je vous écoute" : status.state === "transcribing" ? "Je transcris votre demande" : status.state === "thinking" ? "Je route votre demande vers Gemini" : status.state === "answered" ? "Réponse prête" : "J’exécute votre demande";
  const activeSource = getActiveVoiceSource(status);
  return <div className="voice-overlay fixed inset-0 z-50 grid place-items-center p-6 text-zinc-100"><Button variant="ghost" size="icon" aria-label="Arrêter la conversation et fermer" className="absolute left-6 top-6 z-10 text-zinc-400 hover:bg-white/10 hover:text-white" onClick={onClose}><X /></Button>
    <div role="dialog" aria-modal="true" aria-label="Assistant vocal" className="voice-overlay-content relative grid w-full max-w-7xl gap-5 text-center lg:grid-cols-3 lg:items-stretch">
      <section className="workspace-column workspace-interaction"><p className="workspace-eyebrow">Interaction</p><div className="voice-orb-stage text-zinc-300">{orb}</div><p className="mt-2 text-sm text-zinc-400 transition-opacity duration-300">{stageLabel}</p><div className={`workspace-transcript ${status.transcript ? "workspace-content-visible" : ""}`}>{status.transcript && <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left text-sm text-zinc-300">« {status.transcript} »</p>}</div></section>
      <section className="workspace-column workspace-questions text-left"><p className="workspace-eyebrow">Questions et validation</p><AgentPipeline status={status} />{activeSource === "gmail" && status.answer && <div className="mail-inline-result mt-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-sky-200"><Mail className="size-4" /> Résultats Gmail · {debugMails.length} mails</div><div className="mail-inline-stack mt-3">{debugMails.map((mail, index) => <article key={mail.id} className={`mail-inline-card mail-inline-card-${index}`}><p className="text-[11px] text-slate-500">{mail.date}</p><p className="mt-1 text-sm font-semibold">{mail.subject}</p><p className="mt-1 truncate text-xs text-slate-400">{mail.preview}</p>{mail.attachments.length > 0 && <div className="mt-2 flex items-center gap-1 text-[11px] text-sky-200"><Paperclip className="size-3" />{mail.attachments[0].name}</div>}</article>)}</div><p className="mt-3 text-xs text-slate-500">Dites « merci », « stop » ou « fin de la conversation » pour terminer.</p></div>}{status.confirmationId && <MailConfirmation key={status.confirmationId} id={status.confirmationId} onAnswer={onAnswer} onCancel={() => onAnswer({ text: "Action refusée." })} />}</section>
      <section className="workspace-column workspace-mail-panel text-left">
        <p className="workspace-eyebrow">Résultats</p>
        {activeSource === "gmail" && status.answer ? !gmailQuery ? <p className="mt-4 text-sm text-slate-400">Je prépare la recherche Gmail demandée…</p> : liveGmail.loading ? <p className="mt-4 text-sm text-slate-400">Recherche Gmail en cours…</p> : liveGmail.error ? <p className="mt-4 text-sm text-rose-300">Impossible de lire Gmail.</p> : <>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-sky-200"><Mail className="size-4" /> Gmail · {debugMails.length} mails · {gmailQuery}</div>
          {debugMails.length > 0 ? <><div className="mail-inline-stack mt-3" onPointerDown={startMailSwipe} onPointerMove={(event) => { if (mailDragStart.current !== null) setMailDragX(event.clientX - mailDragStart.current); }} onPointerUp={endMailSwipe} onPointerCancel={() => { mailDragStart.current = null; setMailDragX(0); }} aria-label="Résultats Gmail, faites glisser horizontalement pour changer de mail">
            {debugMails.map((mail, index) => { const offset = (index - selectedMailIndex + debugMails.length) % debugMails.length; const selected = offset === 0; return <article key={mail.id} className={`mail-inline-card ${selected ? "mail-inline-card-active" : ""}`} style={{ transform: selected ? `translateX(${mailDragX}px) rotate(${mailDragX * .025}deg)` : `translateY(${offset * 12}px) rotate(${offset === 1 ? 7 : -7}deg) scale(${1 - offset * .035})`, zIndex: debugMails.length - offset, opacity: offset > 2 ? 0 : 1 }}><p className="text-[11px] text-slate-500">{mail.date}</p><p className="mt-2 text-base font-semibold leading-snug">{mail.subject}</p><p className="mt-2 line-clamp-3 text-sm text-slate-400">{mail.preview}</p><p className="mt-4 text-xs font-medium text-sky-200">{mail.sender}</p>{mail.attachments.length > 0 && <button type="button" className="mt-3 flex items-center gap-1.5 text-left text-xs text-sky-200 hover:text-sky-100" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); previewAttachment(mail.id, mail.attachments[0]); }}><Paperclip className="size-3.5" />{mail.attachments[0].name}<span className="text-slate-500">· {mail.attachments[0].size}</span>{mail.attachments.length > 1 && <span className="text-slate-500">+{mail.attachments.length - 1}</span>}</button>}</article>; })}
          </div><div className="mt-3 flex items-center justify-center gap-3"><Button variant="ghost" size="icon" aria-label="Mail précédent" onClick={() => moveMail(-1)}><ChevronLeft /></Button><span className="text-xs text-slate-400">{selectedMailIndex + 1} / {debugMails.length}</span><Button variant="ghost" size="icon" aria-label="Mail suivant" onClick={() => moveMail(1)}><ChevronRight /></Button></div></> : <p className="mt-4 text-sm text-slate-400">Aucun mail pour cette recherche.</p>}
        </> : <p className="text-sm text-slate-500">Les résultats d’outil apparaîtront ici.</p>}
      </section>
    </div>
    {attachmentPreview && <div className="attachment-drawer-backdrop fixed inset-0 z-[60] bg-zinc-950/65" role="presentation" onMouseDown={() => setAttachmentPreview(null)}><section role="dialog" aria-modal="true" aria-label={`Aperçu de ${attachmentPreview.name}`} className="attachment-drawer fixed inset-y-0 right-0 w-full max-w-[50vw] min-w-[360px] overflow-y-auto border-l border-white/10 bg-zinc-900 p-5 shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.16em] text-sky-200">Pièce jointe · {attachmentPreview.type}</p><h2 className="mt-2 text-xl font-semibold">{attachmentPreview.name}</h2><p className="mt-1 text-xs text-slate-500">{attachmentPreview.size} · aperçu intégré</p></div><Button variant="ghost" size="icon" aria-label="Fermer l’aperçu" onClick={() => setAttachmentPreview(null)}><X /></Button></div>{attachmentPreview.error ? <p role="alert" className="mt-6 rounded-xl bg-rose-400/10 p-4 text-sm text-rose-200">Impossible de charger cette pièce jointe.</p> : !attachmentPreview.previewURL ? <p className="mt-6 text-sm text-slate-400">Chargement de l’aperçu…</p> : attachmentPreview.type.startsWith("image/") ? <img className="mt-6 max-h-[calc(100vh-11rem)] w-full rounded-xl object-contain" src={attachmentPreview.previewURL} alt={attachmentPreview.name} /> : attachmentPreview.type === "application/pdf" ? <PDFPreview url={attachmentPreview.previewURL} name={attachmentPreview.name} /> : <div className="attachment-document mt-6"><div className="attachment-document-toolbar"><span>{attachmentPreview.type}</span></div><div className="attachment-document-page"><h3>{attachmentPreview.name}</h3><p>Ce format est bien attaché au mail. Son aperçu natif sera ajouté pour les documents Office et les vidéos.</p></div></div>}</section></div>}
  </div>;
}

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [lightMode, setLightMode] = useState(() => window.localStorage.getItem("home-ai:theme") === "light");
  const profile: Profile = "Duo";
  const todayLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const [navOpen, setNavOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<DashboardRoom | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const calendarLabel = "Partagé";
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>({ state: "idle" });
  const [overlayOpen, setOverlayOpen] = useState(false);
  const voiceStatusRef = useRef<VoiceStatus>({ state: "idle" });
  const [mailDebugOpen, setMailDebugOpen] = useState(false);
  const changeTheme = (value: boolean) => { setLightMode(value); window.localStorage.setItem("home-ai:theme", value ? "light" : "dark"); };
  const lastVoiceUpdate = useRef<string | undefined>(undefined);
  voiceStatusRef.current = voiceStatus;

  const refreshReminders = useCallback(async () => {
    const response = await fetch("/v1/reminders", { cache: "no-store" });
    if (!response.ok) throw new Error("reminders_unavailable");
    const data = await response.json() as { reminders?: ReminderRecord[] };
    setReminders((data.reminders ?? []).map((reminder) => ({
      id: reminder.id,
      date: reminder.date,
      time: new Date(`${reminder.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }),
      title: reminder.title,
      detail: reminder.details ?? "Rappel personnel",
      owner: "Duo",
      tone: "bg-sky-400",
    })));
  }, []);

  useEffect(() => { void refreshReminders(); }, [refreshReminders]);

  useEffect(() => {
    let active = true;
    const resetVoiceState = async () => {
      try {
        await fetch("/v1/assistant/voice/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: "idle" }),
        });
      } catch { /* Home Core may be restarting. */ }
    };
    const poll = async () => {
      try {
        const response = await fetch("/v1/assistant/voice/state", { cache: "no-store" });
        if (active && response.ok) {
          const nextStatus = await response.json() as VoiceStatus;
          // An idle response from the shared backend must not dismiss an
          // active overlay. Only an explicit local close or stop phrase may
          // transition the visible conversation to idle.
          if (nextStatus.state === "idle" && voiceStatusRef.current.state !== "idle") return;
          if (nextStatus.state !== "idle") setOverlayOpen(true);
          if (nextStatus.updatedAt !== lastVoiceUpdate.current) {
            lastVoiceUpdate.current = nextStatus.updatedAt;
            setVoiceStatus(nextStatus);
          }
        }
      } catch { /* Home Core may be restarting. */ }
    };
    void resetVoiceState().then(() => { if (active) void poll(); });
    const timer = window.setInterval(poll, 300);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (voiceStatus.state !== "answered") return;
    void refreshReminders();
    const mailConversation = getActiveVoiceSource(voiceStatus) === "gmail";
    if (voiceStatus.continueConversation) {
      const timer = window.setTimeout(() => {
        setVoiceStatus((current) => ({ ...current, state: "listening", answer: undefined, transcript: undefined, updatedAt: new Date().toISOString() }));
        window.dispatchEvent(new Event(activateWakeEvent));
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [voiceStatus.state, voiceStatus.updatedAt, voiceStatus.continueConversation, refreshReminders]);

  useEffect(() => {
    const handleTranscript = (event: Event) => {
      const transcript = (event as CustomEvent<VoiceTranscriptDetail>).detail?.transcript;
      if (!transcript) return;
      if (isConversationStop(transcript)) {
        setOverlayOpen(false);
        setVoiceStatus({ state: "idle" });
        void fetch("/v1/assistant/voice/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: "idle" }) });
        return;
      }
      setVoiceStatus((current) => ({ ...current, state: "listening", transcript, updatedAt: new Date().toISOString() }));
    };
    window.addEventListener(voiceTranscriptEvent, handleTranscript);
    return () => window.removeEventListener(voiceTranscriptEvent, handleTranscript);
  }, []);

  return (
    <main className={(lightMode ? "light-mode " : "") + "h-dvh overflow-hidden bg-zinc-950 text-zinc-100 selection:bg-sky-300 selection:text-zinc-950"}>
      <div className="mx-auto grid h-full max-w-[1600px] grid-cols-1 lg:grid-cols-[248px_1fr]">
        <aside className="flex h-auto flex-col border-b border-white/10 bg-zinc-900/70 px-5 py-6 lg:h-full lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between lg:block">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-white text-zinc-950"><Sparkles className="size-5" /></div><div><p className="text-sm font-semibold tracking-wide">HOME AI</p><p className="text-xs capitalize text-zinc-500">{todayLabel}</p></div></div>
            <div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label="Ouvrir la prévisualisation des mails" className="lg:hidden" onClick={() => setMailDebugOpen(true)}><Mail /></Button><Button variant="ghost" size="icon" aria-label="Ouvrir la navigation" aria-expanded={navOpen} className="lg:hidden" onClick={() => setNavOpen(!navOpen)}><MoreHorizontal /></Button></div>
          </div>
          <nav className={(navOpen ? "block " : "hidden ") + "mt-6 space-y-1 lg:mt-10 lg:block"}><Button variant={view === "dashboard" ? "secondary" : "ghost"} onClick={() => { setView("dashboard"); setNavOpen(false); }} className={view === "dashboard" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><Home /> Tableau de bord</Button><Button variant={view === "home" ? "secondary" : "ghost"} onClick={() => { setView("home"); setNavOpen(false); }} className={view === "home" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><Lightbulb /> Maison</Button><Button variant={view === "agenda" ? "secondary" : "ghost"} onClick={() => { setView("agenda"); setNavOpen(false); }} className={view === "agenda" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><CalendarDays /> Agenda</Button><Button variant={view === "profile" ? "secondary" : "ghost"} onClick={() => { setView("profile"); setNavOpen(false); }} className={view === "profile" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><UserRound /> Profil</Button><Button variant={view === "cost" ? "secondary" : "ghost"} onClick={() => { setView("cost"); setNavOpen(false); }} className={view === "cost" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><WalletCards /> Coût</Button></nav>
          <div className="mt-5 hidden lg:block"><AssistantOrb compact /></div>
          <Button variant="ghost" onClick={() => setMailDebugOpen(true)} className="mt-3 w-full justify-start"><Mail /> Debug mails</Button>
          <Button variant={view === "settings" ? "secondary" : "ghost"} onClick={() => { setView("settings"); setNavOpen(false); }} className="mt-auto hidden w-full justify-start lg:flex"><Settings /> Réglages</Button>
        </aside>

        <section className="app-section flex min-h-0 flex-col overflow-hidden px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          {view === "home" && <HomeView />}
          {view === "agenda" && <AgendaView profile={profile} />}
          {view === "profile" && <ProfileView profile={profile} />}
          {view === "cost" && <CostView />}
          {view === "settings" && <SettingsView lightMode={lightMode} onThemeChange={changeTheme} />}
          <div className={view === "dashboard" ? "dashboard-page block" : "hidden"}>
          <div className="dashboard-overview hidden">
            <WeatherCard />
            <Card className="dashboard-next"><CardHeader><div><p className="text-sm font-medium">Rappel</p><p className="mt-1 text-sm text-slate-400">Aujourd’hui · 20:30</p></div><CalendarDays className="size-5 text-slate-400" /></CardHeader><CardContent><p className="text-lg font-medium">Dîner avec Lise</p><p className="mt-1 text-sm text-slate-500">À la maison</p><div className="mt-5 flex items-center gap-2"><Badge>{calendarLabel}</Badge><span className="next-detail text-xs text-slate-400">Connecté bientôt à iCloud</span></div></CardContent></Card>
          </div>

          <Card className="dashboard-room-summary hidden"><CardContent className="flex items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="text-sm font-semibold">Maison</p><p className="mt-0.5 text-xs text-slate-500">{rooms.length} pièces · {rooms.filter((room) => room.active).length} éclairées</p></div><Button variant="ghost" className="h-8 shrink-0 px-2 text-xs" onClick={() => setView("home")}>Voir</Button></CardContent></Card>

          <div className="dashboard-compact-grid grid">
            <WeatherCard />
            <Card className="dashboard-rooms-card"><CardHeader><div><p className="text-lg font-semibold">Pièces</p><p className="mt-1 text-sm text-slate-500">État instantané</p></div><Home className="size-5 text-slate-400" /></CardHeader><CardContent className="grid grid-cols-2 gap-2">{rooms.map((room) => { const Icon = room.icon; return <button key={room.name} type="button" onClick={() => setSelectedRoom(room)} className="flex min-w-0 items-center gap-2 rounded-xl bg-white/[0.04] p-2 text-left hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"><span className={"grid size-8 shrink-0 place-items-center rounded-lg " + room.tone}><Icon className="size-4" /></span><span className="min-w-0"><span className="flex items-center gap-1 text-sm font-medium"><span className={room.active ? "size-1.5 rounded-full bg-emerald-400" : "size-1.5 rounded-full bg-zinc-600"} />{room.name}</span><span className="block truncate text-xs text-slate-500">{room.detail}</span></span></button>; })}</CardContent></Card>
            <Card className="dashboard-reminder-card"><CardHeader><div><p className="text-lg font-semibold">Rappels</p><p className="mt-1 text-sm text-slate-400">À venir</p></div><CalendarDays className="size-5 text-slate-400" /></CardHeader><CardContent className="space-y-2">{reminders.length === 0 ? <p className="text-sm text-slate-500">Aucun rappel enregistré.</p> : reminders.slice(0, 3).map((reminder) => <button key={reminder.id} type="button" onClick={() => setSelectedReminder(reminder)} className="flex w-full items-center gap-2 rounded-xl bg-white/[0.04] px-2 py-2 text-left transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"><span className={"size-2 shrink-0 rounded-full " + reminder.tone} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{reminder.title}</span><span className="block text-xs text-slate-500">{reminder.time}</span></span></button>)}</CardContent></Card>
            <WeeklyChoresCard />
            <TrainsCard />
            <MarketsCard />
          </div>

          <div className="hidden"><div><p className="text-lg font-semibold tracking-[-0.02em]">Pièces</p><p className="mt-1 text-sm text-slate-500">Vue instantanée de l’appartement</p></div><span className="text-xs text-slate-500">État vocal disponible</span></div>
          <div className="hidden">{rooms.map(({ name, detail, icon: Icon, active, tone }) => <Card key={name} className="transition-shadow hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-start justify-between"><div className={"grid size-10 place-items-center rounded-2xl " + tone}><Icon className="size-5" /></div><div className={active ? "size-2 rounded-full bg-emerald-500" : "size-2 rounded-full bg-slate-200"} /></div><p className="mt-8 text-base font-medium">{name}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></CardContent></Card>)}</div>

          <div className="hidden"><Card><CardHeader><div><p className="text-lg font-semibold">Routines</p></div><MoreHorizontal className="size-5 text-slate-400" /></CardHeader></Card></div>
          </div>
        </section>
      </div>
      <WakeWordListener />
      {selectedRoom && <RoomDetailDialog room={selectedRoom} onClose={() => setSelectedRoom(null)} />}
      {selectedReminder && <ReminderDetailDialog reminder={selectedReminder} onClose={() => setSelectedReminder(null)} />}
      <VoiceOverlay status={voiceStatus} open={overlayOpen} onAnswer={(answer) => setVoiceStatus({ state: "answered", answer: answer.text, confirmationId: answer.confirmationId })} onClose={() => { setOverlayOpen(false); setVoiceStatus({ state: "idle" }); void fetch("/v1/assistant/voice/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: "idle" }) }); }} />
      {mailDebugOpen && <MailDebugDialog onClose={() => setMailDebugOpen(false)} />}
    </main>
  );
}

export default App;
