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
  X,
} from "lucide-react";
import { Orb } from "@yogesharc/thinking-orbs";
import { Ascii } from "ascii.rest/react";
import * as earthrise from "ascii.rest/pieces/earthrise";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getWeather, type WeatherReport } from "@/lib/weather";
import { getDeviceState, getHomeDevices, setDeviceSwitch, type DeviceState, type HomeDevice } from "@/lib/homeControl";
import { getCalendarEvents, getCalendars, type CalendarEvent } from "@/lib/calendar";
import { AgentPipeline } from "@/components/ai/agent-pipeline";

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

const weeklyChores = [
  { id: "chore-1", date: "Lun. 3", objective: "Passer l’aspirateur", person: "Clément", icon: RobotVacuum, tone: "bg-sky-400", completed: false },
  { id: "chore-2", date: "Mer. 5", objective: "Sortir le recyclage", person: "Lise", icon: Recycle, tone: "bg-amber-400", completed: false },
  { id: "chore-3", date: "Sam. 8", objective: "Nettoyer la cuisine", person: "Duo", icon: UtensilsCrossed, tone: "bg-emerald-400", completed: false },
];
const fallbackTrains = [{ time: "07:42", arrival: "08:18", status: "on_time", message: "À l’heure" }, { time: "08:42", arrival: "09:18", status: "delayed", message: "Retard estimé : 10 min" }, { time: "09:42", arrival: "10:18", status: "on_time", message: "À l’heure" }];
type Market = { symbol: string; name: string; isin: string; change: number; price: number };
type MarketDetail = { etf: Market; history: { label: number; value: number }[]; dataStatus: string };
const fallbackMarkets: Market[] = [{ symbol: "BNKE", name: "Amundi Euro Stoxx Banks UCITS ETF", isin: "LU1829219390", change: 4.91, price: 4.6005 }, { symbol: "PANX", name: "Amundi PEA US Tech Screened UCITS ETF", isin: "FR0013412269", change: 1.43, price: 81.03 }, { symbol: "PUST", name: "Amundi PEA Nasdaq-100 UCITS ETF", isin: "FR0011871110", change: .81, price: 101.78 }, { symbol: "PSP5", name: "Amundi PEA S&P 500 UCITS ETF", isin: "FR0011871128", change: 1.19, price: 60.19 }, { symbol: "PAASI", name: "Amundi PEA Asie Emergente (MSCI Emerging Asia) Screened UCITS ETF", isin: "FR0013412012", change: .26, price: 36.985 }, { symbol: "C50", name: "Amundi Core Euro STOXX 50 UCITS ETF EUR Acc", isin: "LU1681047236", change: 2.17, price: 168.86 }];

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

type AssistantAnswer = { text: string; confirmationId?: string };

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
type Reminder = (typeof agendaItems)[number];

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
  const [tasks, setTasks] = useState(() => { try { const saved = JSON.parse(window.localStorage.getItem("home-ai:weekly-chores") ?? "{}") as Record<string, boolean>; return weeklyChores.map((task) => ({ ...task, completed: saved[task.id] ?? task.completed })); } catch { return weeklyChores; } });
  const toggle = (id: string) => { const next = tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task); setTasks(next); try { window.localStorage.setItem("home-ai:weekly-chores", JSON.stringify(Object.fromEntries(next.map((task) => [task.id, task.completed])))); } catch { /* Storage is optional. */ } const task = next.find((item) => item.id === id)!; void fetch(`/v1/chores/${encodeURIComponent(id)}/completion`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: task.completed }) }).catch(() => { /* The locally saved state remains usable offline. */ }); };
  return <Card className="dashboard-chores-card"><CardHeader><div><p className="text-lg font-semibold">Tâches ménagères</p><p className="mt-1 text-sm text-slate-500">Cette semaine</p></div><Sparkles className="size-5 text-slate-400" /></CardHeader><CardContent className="space-y-2">{tasks.map((task) => { const Icon = task.icon; return <button type="button" onClick={() => toggle(task.id)} key={task.id} className={(task.completed ? "chore-complete " : "") + "chore-item flex w-full items-center gap-2 rounded-xl bg-white/[0.04] px-2 py-2 text-left"}><span className={"grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 " + task.tone}><Icon className="size-4 text-white" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{task.objective}</p><p className="text-xs text-slate-500">{task.date} · {task.person}</p></div></button>; })}</CardContent></Card>;
}

function TrainsCard() {
  const [trains, setTrains] = useState(fallbackTrains);
  const [selected, setSelected] = useState<typeof fallbackTrains[number] | null>(null);
  useEffect(() => { const controller = new AbortController(); fetch("/v1/insights/trains", { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { if (Array.isArray(data.trains)) setTrains(data.trains); }).catch(() => {}); return () => controller.abort(); }, []);
  return <><Card className="dashboard-trains-card"><CardHeader><div><p className="text-lg font-semibold">Prochain train</p><p className="mt-1 text-sm text-slate-500">La Ciotat → Marseille</p></div><TrainFront className="size-5 text-slate-400" /></CardHeader><CardContent className="space-y-2">{trains.map((train) => <button type="button" onClick={() => setSelected(train)} key={train.time} className="flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-2 py-2 text-left hover:bg-white/[0.08]"><span className="text-sm font-semibold">{train.time}</span><Badge className={train.status === "delayed" ? "bg-amber-400/15 text-amber-200" : "bg-emerald-400/15 text-emerald-200"}>{train.message}</Badge></button>)}</CardContent></Card>{selected && <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/75 p-4 backdrop-blur-sm" onMouseDown={() => setSelected(null)}><section role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-sky-400/15 text-sky-200"><TrainFront className="size-6" /></span><div><p className="text-sm text-slate-400">La Ciotat → Marseille</p><h2 className="text-xl font-semibold">Départ {selected.time}</h2></div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/[0.05] p-3"><p className="text-xs text-slate-500">Arrivée prévue</p><p className="mt-1 font-semibold">{selected.arrival}</p></div><div className="rounded-2xl bg-white/[0.05] p-3"><p className="text-xs text-slate-500">Info trafic</p><p className={selected.status === "delayed" ? "mt-1 font-semibold text-amber-300" : "mt-1 font-semibold text-emerald-400"}>{selected.message}</p></div></div></section></div>}</>;
}

function MarketsCard() {
  const [period, setPeriod] = useState("Jour");
  const [markets, setMarkets] = useState(fallbackMarkets);
  const [selected, setSelected] = useState<Market | null>(null);
  const [detail, setDetail] = useState<MarketDetail | null>(null);
  const [news, setNews] = useState(["Les marchés européens ouvrent en hausse.", "La BCE maintient ses taux directeurs.", "Les valeurs technologiques restent soutenues."]);
  useEffect(() => { const controller = new AbortController(); fetch(`/v1/insights/markets?period=${period.toLowerCase()}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { if (Array.isArray(data.etfs) && data.etfs.length >= fallbackMarkets.length) setMarkets(data.etfs.slice(0, fallbackMarkets.length)); if (Array.isArray(data.news)) setNews(data.news); }).catch(() => {}); return () => controller.abort(); }, [period]);
  useEffect(() => { if (!selected) { setDetail(null); return; } const controller = new AbortController(); fetch(`/v1/insights/markets/${selected.symbol}?period=${period.toLowerCase()}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then(setDetail).catch(() => {}); return () => controller.abort(); }, [selected, period]);
  return <><Card className="dashboard-markets-card"><CardHeader><div><p className="text-lg font-semibold">Marchés & actualités</p><div className="mt-2 flex gap-1">{["Jour", "Mois", "Année"].map((item) => <Button key={item} type="button" variant={period === item ? "secondary" : "ghost"} className="h-6 px-2 text-[10px]" onClick={() => setPeriod(item)}>{item}</Button>)}</div></div><TrendingUp className="size-5 text-slate-400" /></CardHeader><CardContent><div className="grid grid-cols-2 gap-1">{markets.map((market) => <button type="button" key={market.symbol} onClick={() => setSelected(market)} className="rounded-lg bg-white/[0.04] p-1.5 text-left transition hover:bg-white/[0.1]"><p className="truncate text-[10px] text-slate-300">{market.symbol}</p><p className="truncate text-[9px] text-slate-500">{market.name.replace("Amundi ", "")}</p><p className={market.change >= 0 ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-rose-400"}>{market.change >= 0 ? "+" : ""}{market.change}%</p></button>)}</div><ol className="mt-2 space-y-1.5">{news.slice(0, 3).map((item) => <li key={item} className="text-xs leading-4 text-slate-300">• {item}</li>)}</ol></CardContent></Card>{selected && <div className="fixed inset-0 z-40 grid place-items-center bg-zinc-950/75 p-4 backdrop-blur-sm" onMouseDown={() => setSelected(null)}><section role="dialog" aria-modal="true" aria-labelledby="market-dialog-title" className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-900 p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-400">ETF suivi · {selected.symbol}</p><h2 id="market-dialog-title" className="mt-1 text-xl font-semibold">{selected.name}</h2><p className="mt-1 text-xs text-slate-500">ISIN {selected.isin} · données de démonstration</p></div><Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setSelected(null)}><X /></Button></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/[0.05] p-3"><p className="text-xs text-slate-500">Cours indicatif</p><p className="mt-1 font-semibold">{selected.price.toFixed(2)} €</p></div><div className="rounded-2xl bg-white/[0.05] p-3"><p className="text-xs text-slate-500">Variation</p><p className={selected.change >= 0 ? "mt-1 font-semibold text-emerald-400" : "mt-1 font-semibold text-rose-400"}>{selected.change >= 0 ? "+" : ""}{selected.change}%</p></div></div><div className="mt-5 rounded-2xl bg-white/[0.04] p-3"><p className="mb-2 text-xs text-slate-500">Évolution · {period.toLowerCase()}</p>{detail?.history?.length ? <svg viewBox="0 0 360 120" className="h-32 w-full" role="img" aria-label={`Évolution de ${selected.symbol}`}><polyline fill="none" stroke="rgb(110 231 183)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={detail.history.map((point, index) => `${(index / (detail.history.length - 1)) * 340 + 10},${110 - ((point.value - Math.min(...detail.history.map((item) => item.value))) / (Math.max(...detail.history.map((item) => item.value)) - Math.min(...detail.history.map((item) => item.value)) || 1)) * 90}`).join(" ")} /></svg> : <p className="py-10 text-center text-sm text-slate-500">Chargement de l’historique…</p>}</div></section></div>}</>;
}

type VoiceStatus = { confirmationId?: string; state: "idle" | "listening" | "transcribing" | "thinking" | "answered" | "error"; transcript?: string; answer?: string; updatedAt?: string };

function VoiceOverlay({ status, onAnswer }: { status: VoiceStatus; onAnswer: (answer: AssistantAnswer) => void }) {
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
  if (status.state === "idle") return null;
  const listening = status.state === "listening";
  const orb = listening ? <Orb state="using" variant="record" size={180} speed={1} label="Écoute en cours" /> : <Orb state="reasoning" size={180} speed={1} label="Réflexion en cours" />;
  return <div className="voice-overlay fixed inset-0 z-50 grid place-items-center p-6 text-zinc-100">
    <div role="dialog" aria-modal="true" aria-label="Assistant vocal" className="voice-overlay-content relative grid w-full max-w-7xl gap-5 text-center lg:grid-cols-[minmax(220px,.8fr)_minmax(280px,1.2fr)_minmax(260px,.9fr)] lg:items-center">
      <section className="workspace-column workspace-list text-left"><p className="workspace-eyebrow">Sources</p><div className="workspace-list-item workspace-list-item-active"><span className="workspace-source-mark">G</span><span><strong>Gmail</strong><small>Recherche et lecture</small></span></div><div className="workspace-list-item"><span className="workspace-source-mark">D</span><span><strong>Drive</strong><small>Fichiers et documents</small></span></div><div className="workspace-list-item workspace-list-item-muted"><span className="workspace-source-mark">⌁</span><span><strong>Maison</strong><small>Commandes locales</small></span></div></section>
      <section className="workspace-column workspace-interaction"><p className="workspace-eyebrow">Interaction</p><div className="voice-orb-stage text-zinc-300">{orb}</div><p className="mt-2 text-sm text-zinc-400">{status.state === "listening" ? "Je vous écoute" : status.state === "answered" ? "Réponse prête" : "Je traite votre demande"}</p>{status.transcript && <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left text-sm text-zinc-300">« {status.transcript} »</p>}</section>
      <section className="workspace-column workspace-questions text-left"><p className="workspace-eyebrow">Questions et validation</p><AgentPipeline status={status} />{status.confirmationId && <MailConfirmation key={status.confirmationId} id={status.confirmationId} onAnswer={onAnswer} onCancel={() => onAnswer({ text: "Action refusée." })} />}{status.state === "answered" && !status.confirmationId && status.answer && <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-200">{status.answer}</div>}</section>
    </div>
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
  const calendarLabel = "Partagé";
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>({ state: "idle" });
  const changeTheme = (value: boolean) => { setLightMode(value); window.localStorage.setItem("home-ai:theme", value ? "light" : "dark"); };
  const lastVoiceUpdate = useRef<string | undefined>(undefined);

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
    if (voiceStatus.state === "idle") return;
    const timeout = window.setTimeout(() => {
      setVoiceStatus({ state: "idle" });
    }, voiceStatus.confirmationId ? 300_000 : 20_000);
    return () => window.clearTimeout(timeout);
  }, [voiceStatus.state, voiceStatus.updatedAt, voiceStatus.confirmationId]);

  useEffect(() => {
    const handleTranscript = (event: Event) => {
      const transcript = (event as CustomEvent<VoiceTranscriptDetail>).detail?.transcript;
      if (transcript) setVoiceStatus((current) => ({ ...current, state: "listening", transcript, updatedAt: new Date().toISOString() }));
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
            <Button variant="ghost" size="icon" aria-label="Ouvrir la navigation" aria-expanded={navOpen} className="lg:hidden" onClick={() => setNavOpen(!navOpen)}><MoreHorizontal /></Button>
          </div>
          <nav className={(navOpen ? "block " : "hidden ") + "mt-6 space-y-1 lg:mt-10 lg:block"}><Button variant={view === "dashboard" ? "secondary" : "ghost"} onClick={() => { setView("dashboard"); setNavOpen(false); }} className={view === "dashboard" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><Home /> Tableau de bord</Button><Button variant={view === "home" ? "secondary" : "ghost"} onClick={() => { setView("home"); setNavOpen(false); }} className={view === "home" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><Lightbulb /> Maison</Button><Button variant={view === "agenda" ? "secondary" : "ghost"} onClick={() => { setView("agenda"); setNavOpen(false); }} className={view === "agenda" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><CalendarDays /> Agenda</Button><Button variant={view === "profile" ? "secondary" : "ghost"} onClick={() => { setView("profile"); setNavOpen(false); }} className={view === "profile" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><UserRound /> Profil</Button><Button variant={view === "cost" ? "secondary" : "ghost"} onClick={() => { setView("cost"); setNavOpen(false); }} className={view === "cost" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><WalletCards /> Coût</Button></nav>
          <div className="mt-5 hidden lg:block"><AssistantOrb compact /></div>
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
            <Card className="dashboard-reminder-card"><CardHeader><div><p className="text-lg font-semibold">Rappels</p><p className="mt-1 text-sm text-slate-400">À venir</p></div><CalendarDays className="size-5 text-slate-400" /></CardHeader><CardContent className="space-y-2">{agendaItems.slice(0, 3).map((reminder) => <button key={reminder.title} type="button" onClick={() => setSelectedReminder(reminder)} className="flex w-full items-center gap-2 rounded-xl bg-white/[0.04] px-2 py-2 text-left transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"><span className={"size-2 shrink-0 rounded-full " + reminder.tone} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{reminder.title}</span><span className="block text-xs text-slate-500">{reminder.time}</span></span></button>)}</CardContent></Card>
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
      <VoiceOverlay status={voiceStatus} onAnswer={(answer) => setVoiceStatus({ state: "answered", answer: answer.text, confirmationId: answer.confirmationId })} />
    </main>
  );
}

export default App;
