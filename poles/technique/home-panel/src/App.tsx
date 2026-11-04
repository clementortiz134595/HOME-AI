import { useCallback, useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Home,
  Lightbulb,
  Mic,
  MoreHorizontal,
  Settings,
  Sparkles,
  Plug,
  Thermometer,
  ThermometerSun,
  WalletCards,
  UserRound,
  Utensils,
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

const rooms = [
  { name: "Salon", detail: "2 lumières · 21°", icon: Home, active: true, tone: "bg-amber-100 text-amber-700" },
  { name: "Cuisine", detail: "2 lumières · 20°", icon: Utensils, active: true, tone: "bg-rose-100 text-rose-700" },
  { name: "Chambre", detail: "2 lumières · 19°", icon: Sparkles, active: false, tone: "bg-violet-100 text-violet-700" },
  { name: "Bureau", detail: "1 lumière · 20°", icon: BriefcaseBusiness, active: false, tone: "bg-teal-100 text-teal-700" },
];

const profiles = ["Duo", "Clément", "Lise"] as const;
type Profile = (typeof profiles)[number];
type View = "dashboard" | "home" | "agenda" | "profile" | "cost";

const agendaItems = [
  { time: "20:30", title: "Dîner avec Lise", detail: "À la maison", owner: "Duo", tone: "bg-emerald-400" },
  { time: "Demain · 09:00", title: "Point projet", detail: "Visioconférence", owner: "Clément", tone: "bg-sky-400" },
  { time: "Demain · 18:30", title: "Courses", detail: "Liste partagée", owner: "Duo", tone: "bg-amber-400" },
  { time: "Jeudi · 19:00", title: "Cours de yoga", detail: "Agenda de Lise", owner: "Lise", tone: "bg-violet-400" },
];

function HomeView() {
  const [devices, setDevices] = useState<HomeDevice[]>([]);
  const [states, setStates] = useState<Record<string, DeviceState>>({});
  const [unavailable, setUnavailable] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

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
  const rooms = Array.from(new Set(devices.map((device) => device.room))).map((room) => {
    const roomDevices = devices.filter((device) => device.room === room);
    const roomLights = roomDevices.filter((device) => device.kind === "light");
    const temperature = roomDevices.find((device) => states[device.id]?.temperatureC);
    return { name: room, detail: `${roomLights.length} lumière${roomLights.length > 1 ? "s" : ""}${temperature ? ` · ${Math.round(states[temperature.id].temperatureC!)}°` : ""}`, icon: room === "Cuisine" ? Utensils : room === "Chambre" ? Sparkles : room === "Bureau" ? BriefcaseBusiness : Home, active: roomLights.some((device) => states[device.id]?.switchOn), tone: room === "Cuisine" ? "bg-rose-100 text-rose-700" : room === "Chambre" ? "bg-violet-100 text-violet-700" : room === "Bureau" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700", roomDevices };
  });

  const toggleRoom = async (roomDevices: HomeDevice[], on: boolean) => {
    setPending(roomDevices[0]?.room ?? null);
    try {
      const results = await Promise.all(roomDevices.filter((device) => device.kind === "light").map((device) => setDeviceSwitch(device.id, on).then((state) => [device.id, state] as const)));
      setStates((current) => ({ ...current, ...Object.fromEntries(results) }));
    } catch { setUnavailable(true); } finally { setPending(null); }
  };

  return (
    <div className="home-view mt-8">
      <div><p className="text-sm text-slate-500">Vue de l’appartement</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Maison</h2>{unavailable && <p className="mt-2 text-sm text-amber-300">Home Core est indisponible.</p>}</div>
      <Card className="relative overflow-hidden border-emerald-400/30 bg-gradient-to-br from-emerald-300 via-lime-200 to-sky-200 text-zinc-950"><div className="dot-field absolute inset-y-0 right-0 w-2/5 opacity-50" /><CardContent className="relative flex min-h-40 items-end justify-between p-6"><div><p className="text-sm font-medium text-zinc-700">Ambiance du soir</p><p className="mt-2 text-4xl font-semibold tracking-[-0.06em]">{lightsOn ? "Lumières allumées" : "Lumières éteintes"}</p></div><span className="rounded-full bg-white/70 px-3 py-2 text-xs font-medium text-zinc-700">Commande vocale</span></CardContent></Card>
      <div className="home-rooms grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3">{rooms.map(({ name, detail, icon: Icon, active, tone, roomDevices }) => <Card key={name}><CardContent className="p-3 sm:p-5"><div className="flex items-start justify-between"><div className={"grid size-9 place-items-center rounded-xl sm:size-11 sm:rounded-2xl " + tone}><Icon className="size-4 sm:size-5" /></div><span className={active ? "size-2 rounded-full bg-emerald-400" : "size-2 rounded-full bg-zinc-600"} /></div><div className="mt-4 flex flex-col gap-1 sm:mt-8 sm:flex-row sm:items-end sm:justify-between sm:gap-3"><div><p className="text-sm font-medium sm:text-base">{name}</p><p className="mt-1 text-xs text-slate-500 sm:text-sm">{detail || "Aucun appareil"}</p></div><Button variant="ghost" className="h-8 self-start px-2 text-xs sm:h-10 sm:self-auto sm:px-4 sm:text-sm" disabled={pending === name} onClick={() => toggleRoom(roomDevices, !active)}>{active ? "Éteindre" : "Allumer"}</Button></div></CardContent></Card>)}</div>
      <Card className="max-sm:hidden"><CardHeader><div><p className="text-lg font-semibold">Scènes</p><p className="mt-1 text-sm text-slate-500">Des actions rapides pour le foyer</p></div><Sparkles className="size-5 text-slate-400" /></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><Button variant="secondary" className="h-16 justify-start"><Lightbulb className="size-4 text-amber-300" /> Soirée</Button><Button variant="secondary" className="h-16 justify-start"><Home className="size-4 text-emerald-300" /> Retour</Button><Button variant="secondary" className="h-16 justify-start"><Sparkles className="size-4 text-sky-300" /> Bonne nuit</Button></CardContent></Card>
    </div>
  );
}

function AgendaView({ profile }: { profile: Profile }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncState, setSyncState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [displayMonth, setDisplayMonth] = useState(() => new Date());
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
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = new Date(year, month, 1).getDay();
  const calendarCells = [...Array<null>(leadingDays).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const monthLabel = displayMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const eventByDay = Object.fromEntries(events.map((event) => [new Date(event.startsAt).getDate(), { title: event.title, tone: "bg-emerald-400" }]));
  const visibleItems = events.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 6);
  const changeMonth = (offset: number) => setDisplayMonth(new Date(year, month + offset, 1));

  return (
    <div className="agenda-view cost-view mt-6">
      <div><h2 className="text-3xl font-semibold tracking-[-0.04em]">Agenda</h2></div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4"><Card className="border-sky-400/30 bg-sky-400/10"><CardContent className="p-3 sm:p-5"><p className="text-xs text-slate-400 sm:text-sm">Ce mois-ci</p><p className="mt-1 text-xl font-semibold sm:mt-2 sm:text-3xl">{events.length}</p><p className="mt-1 hidden text-sm text-slate-500 sm:block">événement{events.length > 1 ? "s" : ""}</p></CardContent></Card><Card><CardContent className="p-3 sm:p-5"><p className="text-xs text-slate-400 sm:text-sm">Profil</p><p className="mt-1 text-sm font-semibold sm:mt-2 sm:text-lg">{profile === "Duo" ? "Partagé" : profile}</p><p className="mt-1 hidden text-sm text-slate-500 sm:block">Filtrage local du panneau</p></CardContent></Card><Card><CardContent className="p-3 sm:p-5"><p className="text-xs text-slate-400 sm:text-sm">Sync</p><p className={"mt-1 text-sm font-semibold sm:mt-2 sm:text-lg " + (syncState === "ready" ? "text-emerald-300" : syncState === "loading" ? "text-amber-300" : "text-rose-300")}>{syncState === "ready" ? "OK" : syncState === "loading" ? "…" : "Non"}</p><p className="mt-1 hidden text-sm text-slate-500 sm:block">iCloud Calendar</p></CardContent></Card></div>
      <div className="agenda-content grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)] xl:items-start">
        <Card className="agenda-calendar" onTouchStart={(event) => { swipeStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { const start = swipeStartX.current; const end = event.changedTouches[0]?.clientX; swipeStartX.current = null; if (start === null || end === undefined || Math.abs(end - start) < 48) return; changeMonth(end < start ? 1 : -1); }}><CardHeader><div><p className="text-lg font-semibold capitalize">{monthLabel}</p><p className="mt-1 text-sm text-slate-500">Vue calendrier · {profile === "Duo" ? "foyer partagé" : "agenda de " + profile}</p></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label="Mois précédent" onClick={() => changeMonth(-1)}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label="Mois suivant" onClick={() => changeMonth(1)}><ChevronRight /></Button></div></CardHeader><CardContent className="p-3 sm:p-6"><div className="grid grid-cols-7 gap-1 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500 sm:text-[11px] sm:tracking-[0.12em]">{["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((day) => <span key={day} className="py-1.5 sm:py-2">{day}</span>)}</div><div className="grid grid-cols-7 gap-1">{calendarCells.map((day, index) => { if (day === null) return <div key={`empty-${index}`} aria-hidden="true" />; const event = eventByDay[day]; return <div key={day} className={"min-h-12 rounded-lg border p-1 text-left sm:min-h-16 sm:rounded-xl sm:p-2 " + (event ? "border-sky-400/50 bg-sky-400/10" : "border-white/[0.06] bg-white/[0.02]")}><p className={event ? "text-xs font-semibold text-sky-200 sm:text-sm" : "text-xs text-slate-300 sm:text-sm"}>{day}</p>{event && <div className="mt-1 flex items-start gap-1 sm:mt-2 sm:gap-1.5"><span className={"mt-1 size-1.5 shrink-0 rounded-full " + event.tone} /><p className="hidden line-clamp-2 text-[11px] leading-4 text-slate-400 sm:block">{event.title}</p></div>}</div>; })}</div></CardContent></Card>
        <Card className="max-sm:hidden"><CardHeader><div><p className="text-lg font-semibold">Prochains rendez-vous</p><p className="mt-1 text-sm text-slate-500">Vue {profile === "Duo" ? "partagée" : "de " + profile}</p></div><CalendarDays className="size-5 text-slate-400" /></CardHeader><CardContent className="space-y-2">{visibleItems.length === 0 && syncState === "ready" && <p className="py-4 text-sm text-slate-500">Aucun événement sur la période.</p>}{visibleItems.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-white/[0.04]"><span className="size-2 shrink-0 rounded-full bg-emerald-400" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{item.title || "Sans titre"}</p><Badge>Duo</Badge></div><p className="mt-1 text-sm text-slate-500">{item.allDay ? "Toute la journée" : new Date(item.startsAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</p></div></div>)}</CardContent></Card>
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
    <div className="mt-8 space-y-7">
      <div><p className="text-sm text-slate-500">Pilotage de Home AI</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Coût</h2><p className="cost-description mt-2 max-w-2xl text-sm leading-6 text-slate-500">Suivez les dépenses estimées liées aux modèles IA, à l’hébergement et aux services connectés.</p></div>
      <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><p className="text-sm text-slate-400">Ce mois-ci</p><p className="mt-2 text-3xl font-semibold">12,40 €</p><p className="mt-1 text-sm text-emerald-400">−8 % vs. mois dernier</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-slate-400">Projection</p><p className="mt-2 text-3xl font-semibold">18,70 €</p><p className="mt-1 text-sm text-slate-500">Estimation mensuelle</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-slate-400">Principal poste</p><p className="mt-2 text-lg font-semibold">Modèles IA</p><p className="mt-1 text-sm text-slate-500">72 % du total estimé</p></CardContent></Card></div>
      <Card><CardHeader><div><p className="text-lg font-semibold">Évolution des coûts</p><p className="mt-1 text-sm text-slate-500">12 derniers mois · données estimatives</p></div><WalletCards className="size-5 text-slate-400" /></CardHeader><CardContent><div className="cost-chart" role="img" aria-label="Graphique de l’évolution estimée des coûts sur douze mois">{points.map((height, index) => <div key={index} className="cost-bar" style={{ height: `${height}%` }}><span /></div>)}</div><div className="mt-3 flex justify-between text-[11px] text-slate-500"><span>Déc. 25</span><span>Juin 26</span><span>Nov. 26</span></div></CardContent></Card>
      <Card className="cost-breakdown"><CardHeader><div><p className="text-lg font-semibold">Répartition</p><p className="mt-1 text-sm text-slate-500">À connecter aux métriques Home Core</p></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-sky-400/10 p-4"><p className="text-sm text-sky-200">Modèles IA</p><p className="mt-2 text-xl font-semibold">8,90 €</p></div><div className="rounded-2xl bg-violet-400/10 p-4"><p className="text-sm text-violet-200">Hébergement</p><p className="mt-2 text-xl font-semibold">2,50 €</p></div><div className="rounded-2xl bg-teal-400/10 p-4"><p className="text-sm text-teal-200">Services</p><p className="mt-2 text-xl font-semibold">1,00 €</p></div></CardContent></Card>
    </div>
  );
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

function AssistantOrb() {
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
        const result = await response.json() as { transcript: string; answer: { text: string } };
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

  return <Card className="dashboard-assistant-card overflow-hidden border-sky-400/25 bg-black">
    <button type="button" aria-label="Activer l’assistant vocal" onClick={activate} className="flex h-full w-full items-center justify-center p-4 outline-none transition hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-sky-300">
      <Orb state={listening ? "using" : "waiting"} size={240} dotSize={0.45} speed={listening ? 1 : 0.7} label="Assistant vocal" />
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
    <Card className="dashboard-weather relative overflow-hidden border-sky-400/20 bg-zinc-950 text-sky-50">
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
type Reminder = (typeof agendaItems)[number];

function RoomDetailDialog({ room, onClose }: { room: DashboardRoom; onClose: () => void }) {
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3"><span className={"grid size-12 place-items-center rounded-2xl " + room.tone}><Icon className="size-6" /></span><div><p className="text-sm text-slate-400">Détail de la pièce</p><h2 id="room-dialog-title" className="text-xl font-semibold">{room.name}</h2></div></div>
        <Button variant="ghost" size="icon" aria-label="Fermer" onClick={onClose}><X /></Button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/[0.05] p-4"><div className="flex items-center gap-2 text-slate-500"><Thermometer className="size-4" /><p className="text-xs">Température</p></div><p className="mt-1 text-xl font-semibold">{temperature === undefined ? "—" : `${Math.round(temperature)}°`}</p></div><div className="rounded-2xl bg-white/[0.05] p-4"><p className="text-xs text-slate-500">État de connexion</p><p className="mt-1 font-medium">{unavailable ? "Indisponible" : devices.length === 0 ? "Aucun équipement" : "Connecté"}</p></div></div>
      {([ ["Lumières", lights, Lightbulb], ["Prises", plugs, Plug] ] as const).map(([label, group, DeviceIcon]) => <div key={label} className="mt-5"><div className="mb-2 flex items-center gap-2"><DeviceIcon className="size-4 text-slate-400" /><p className="text-sm font-semibold">{label}</p></div>{group.length === 0 ? <p className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-slate-500">Aucun équipement détecté.</p> : <div className="space-y-2">{group.map((device) => { const isOn = states[device.id]?.switchOn ?? false; return <div key={device.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.05] p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{device.name}</p><p className={isOn ? "mt-0.5 text-xs text-emerald-400" : "mt-0.5 text-xs text-slate-500"}>{isOn ? "Allumée" : "Éteinte"}</p></div><Button variant={isOn ? "secondary" : "default"} className="h-9 shrink-0 px-3 text-xs" disabled={pending === device.id} onClick={() => void setSwitch(device, !isOn)}>{isOn ? "Éteindre" : "Allumer"}</Button></div>; })}</div>}</div>)}
      <div className="mt-5 flex justify-end"><Button onClick={onClose}>Fermer</Button></div>
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

type VoiceStatus = { state: "idle" | "listening" | "transcribing" | "thinking" | "answered" | "error"; transcript?: string; answer?: string; updatedAt?: string };

function VoiceOverlay({ status }: { status: VoiceStatus }) {
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
  const answered = status.state === "answered";
  const orb = listening ? <Orb state="using" variant="record" size={260} speed={1} label="Écoute en cours" /> : answered ? <Orb state="idle" size={260} speed={0.7} label="Réponse prête" /> : <Orb state="reasoning" size={260} speed={1} label="Réflexion en cours" />;
  const label = listening ? "J’attends votre question" : status.state === "transcribing" ? "Je comprends votre question" : status.state === "error" ? "La réponse est indisponible" : answered ? "Réponse prête" : "Création de la réponse";
  return <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950 p-6 text-zinc-100">
    <div role="dialog" aria-modal="true" aria-label="Assistant vocal" className="flex w-full max-w-4xl flex-col items-center justify-center text-center">
      <div className="voice-orb-stage text-sky-300">{orb}</div>
      <p className="mt-12 text-sm font-medium uppercase tracking-[0.28em] text-zinc-300">{label}</p>
      {status.transcript && <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300">« {status.transcript} »</p>}
      {answered && status.answer && <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-400">{status.answer}</p>}
      {!answered && <div className="mt-8 flex items-center gap-1.5"><span className="voice-dot" /><span className="voice-dot voice-dot-delay-1" /><span className="voice-dot voice-dot-delay-2" /></div>}
    </div>
  </div>;
}

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [profile, setProfile] = useState<Profile>("Duo");
  const [profileOpen, setProfileOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<DashboardRoom | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const calendarLabel = profile === "Duo" ? "Partagé" : "Personnel";
  const profileInitial = profile === "Duo" ? "D" : profile === "Clément" ? "C" : "L";
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>({ state: "idle" });
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
      lastVoiceUpdate.current = undefined;
      setVoiceStatus({ state: "idle" });
    }, 20_000);
    return () => window.clearTimeout(timeout);
  }, [voiceStatus.state, voiceStatus.updatedAt]);

  useEffect(() => {
    const handleTranscript = (event: Event) => {
      const transcript = (event as CustomEvent<VoiceTranscriptDetail>).detail?.transcript;
      if (transcript) setVoiceStatus((current) => ({ ...current, state: "listening", transcript, updatedAt: new Date().toISOString() }));
    };
    window.addEventListener(voiceTranscriptEvent, handleTranscript);
    return () => window.removeEventListener(voiceTranscriptEvent, handleTranscript);
  }, []);

  return (
    <main className="h-dvh overflow-hidden bg-zinc-950 text-zinc-100 selection:bg-sky-300 selection:text-zinc-950">
      <div className="mx-auto grid h-full max-w-[1600px] grid-cols-1 lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-white/10 bg-zinc-900/70 px-5 py-6 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between lg:block">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-white text-zinc-950"><Sparkles className="size-5" /></div><div><p className="text-sm font-semibold tracking-wide">HOME AI</p><p className="text-xs text-zinc-500">Appartement</p></div></div>
            <Button variant="ghost" size="icon" aria-label="Ouvrir la navigation" aria-expanded={navOpen} className="lg:hidden" onClick={() => setNavOpen(!navOpen)}><MoreHorizontal /></Button>
          </div>
          <nav className={(navOpen ? "block " : "hidden ") + "mt-6 space-y-1 lg:mt-10 lg:block"}><Button variant={view === "dashboard" ? "secondary" : "ghost"} onClick={() => { setView("dashboard"); setNavOpen(false); }} className={view === "dashboard" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><Home /> Tableau de bord</Button><Button variant={view === "home" ? "secondary" : "ghost"} onClick={() => { setView("home"); setNavOpen(false); }} className={view === "home" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><Lightbulb /> Maison</Button><Button variant={view === "agenda" ? "secondary" : "ghost"} onClick={() => { setView("agenda"); setNavOpen(false); }} className={view === "agenda" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><CalendarDays /> Agenda</Button><Button variant={view === "profile" ? "secondary" : "ghost"} onClick={() => { setView("profile"); setNavOpen(false); }} className={view === "profile" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><UserRound /> Profil</Button><Button variant={view === "cost" ? "secondary" : "ghost"} onClick={() => { setView("cost"); setNavOpen(false); }} className={view === "cost" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><WalletCards /> Coût</Button></nav>
          <Button variant="ghost" className="mt-auto hidden w-full justify-start lg:mt-10 lg:flex"><Settings /> Réglages</Button>
        </aside>

        <section className="app-section flex min-h-0 flex-col overflow-hidden px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <header className="flex flex-wrap items-start justify-between gap-5">
            <div><p className="text-sm text-slate-500">Lundi 3 novembre</p></div>
            <div className="relative flex items-center gap-3">
              <button type="button" aria-label="Changer de profil" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)} className="profile-orb grid size-11 place-items-center rounded-full text-sm font-semibold text-zinc-950 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">{profileInitial}</button>
              {profileOpen && <div className="profile-menu absolute right-12 top-0 z-30 min-w-36 rounded-2xl border border-white/10 bg-zinc-900 p-1.5 shadow-2xl">
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Profil</p>
                {profiles.map((option) => <button key={option} type="button" onClick={() => { setProfile(option); setProfileOpen(false); }} className={profile === option ? "flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left text-sm font-medium text-zinc-950" : "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-300 hover:bg-white/10"}>{option}{profile === option && <span className="text-xs">✓</span>}</button>)}
                <VoiceEnrollment profile={profile} />
              </div>}
            </div>
          </header>

          {view === "home" && <HomeView />}
          {view === "agenda" && <AgendaView profile={profile} />}
          {view === "profile" && <ProfileView profile={profile} />}
          {view === "cost" && <CostView />}
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
            <AssistantOrb />
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
      <VoiceOverlay status={voiceStatus} />
    </main>
  );
}

export default App;
