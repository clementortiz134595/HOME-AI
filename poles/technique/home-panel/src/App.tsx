import { useCallback, useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  CloudSun,
  Home,
  Lightbulb,
  Mic,
  MoreHorizontal,
  Settings,
  Sparkles,
  ThermometerSun,
  WalletCards,
  UserRound,
  Utensils,
} from "lucide-react";
import { Orb } from "@yogesharc/thinking-orbs";

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

const calendarDays = Array.from({ length: 35 }, (_, index) => index + 1);
const calendarEvents: Record<number, { title: string; owner: string; tone: string }> = {
  3: { title: "Dîner avec Lise", owner: "Duo", tone: "bg-emerald-400" },
  4: { title: "Point projet", owner: "Clément", tone: "bg-sky-400" },
  5: { title: "Courses", owner: "Duo", tone: "bg-amber-400" },
  8: { title: "Cours de yoga", owner: "Lise", tone: "bg-violet-400" },
};

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
    <div className="mt-8 space-y-7">
      <div><p className="text-sm text-slate-500">Vue de l’appartement</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Maison</h2>{unavailable && <p className="mt-2 text-sm text-amber-300">Home Core est indisponible.</p>}</div>
      <Card className="relative overflow-hidden border-emerald-400/30 bg-gradient-to-br from-emerald-300 via-lime-200 to-sky-200 text-zinc-950"><div className="dot-field absolute inset-y-0 right-0 w-2/5 opacity-50" /><CardContent className="relative flex min-h-40 items-end justify-between p-6"><div><p className="text-sm font-medium text-zinc-700">Ambiance du soir</p><p className="mt-2 text-4xl font-semibold tracking-[-0.06em]">{lightsOn ? "Lumières allumées" : "Lumières éteintes"}</p></div><span className="rounded-full bg-white/70 px-3 py-2 text-xs font-medium text-zinc-700">Commande vocale</span></CardContent></Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rooms.map(({ name, detail, icon: Icon, active, tone, roomDevices }) => <Card key={name}><CardContent className="p-5"><div className="flex items-start justify-between"><div className={"grid size-11 place-items-center rounded-2xl " + tone}><Icon className="size-5" /></div><span className={active ? "size-2 rounded-full bg-emerald-400" : "size-2 rounded-full bg-zinc-600"} /></div><div className="mt-8 flex items-end justify-between gap-3"><div><p className="font-medium">{name}</p><p className="mt-1 text-sm text-slate-500">{detail || "Aucun appareil"}</p></div><Button variant="ghost" disabled={pending === name} onClick={() => toggleRoom(roomDevices, !active)}>{active ? "Éteindre" : "Allumer"}</Button></div></CardContent></Card>)}</div>
      <Card><CardHeader><div><p className="text-lg font-semibold">Scènes</p><p className="mt-1 text-sm text-slate-500">Des actions rapides pour le foyer</p></div><Sparkles className="size-5 text-slate-400" /></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><Button variant="secondary" className="h-16 justify-start"><Lightbulb className="size-4 text-amber-300" /> Soirée</Button><Button variant="secondary" className="h-16 justify-start"><Home className="size-4 text-emerald-300" /> Retour</Button><Button variant="secondary" className="h-16 justify-start"><Sparkles className="size-4 text-sky-300" /> Bonne nuit</Button></CardContent></Card>
    </div>
  );
}

function AgendaView({ profile }: { profile: Profile }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncState, setSyncState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    const controller = new AbortController();
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    getCalendars("personal", controller.signal)
      .then((calendars) => Promise.all(calendars.map((calendar) => getCalendarEvents("personal", calendar.id, from, to, controller.signal))))
      .then((calendarEvents) => { setEvents(calendarEvents.flat()); setSyncState("ready"); })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSyncState("unavailable");
      });
    return () => controller.abort();
  }, []);

  const eventByDay = Object.fromEntries(events.map((event) => [new Date(event.startsAt).getDate(), { title: event.title, owner: "Duo", tone: "bg-emerald-400" }]));
  const visibleItems = events.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 6);

  return (
    <div className="cost-view mt-6 space-y-4">
      <div><h2 className="text-3xl font-semibold tracking-[-0.04em]">Agenda</h2></div>
      <div className="grid gap-4 sm:grid-cols-3"><Card className="border-sky-400/30 bg-sky-400/10"><CardContent className="p-5"><p className="text-sm text-slate-400">Ce mois-ci</p><p className="mt-2 text-3xl font-semibold">{events.length}</p><p className="mt-1 text-sm text-slate-500">événement{events.length > 1 ? "s" : ""}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-slate-400">Profil</p><p className="mt-2 text-lg font-semibold">{profile === "Duo" ? "Foyer partagé" : profile}</p><p className="mt-1 text-sm text-slate-500">Filtrage local du panneau</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-slate-400">Synchronisation</p><p className={"mt-2 text-lg font-semibold " + (syncState === "ready" ? "text-emerald-300" : syncState === "loading" ? "text-amber-300" : "text-rose-300")}>{syncState === "ready" ? "Connecté" : syncState === "loading" ? "Chargement…" : "Indisponible"}</p><p className="mt-1 text-sm text-slate-500">iCloud Calendar</p></CardContent></Card></div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)] xl:items-start">
        <Card><CardHeader><div><p className="text-lg font-semibold">Novembre 2026</p><p className="mt-1 text-sm text-slate-500">Vue calendrier · {profile === "Duo" ? "foyer partagé" : "agenda de " + profile}</p></div><CalendarDays className="size-5 text-slate-400" /></CardHeader><CardContent className="p-3 sm:p-6"><div className="grid grid-cols-7 gap-1 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500 sm:text-[11px] sm:tracking-[0.12em]">{["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((day) => <span key={day} className="py-1.5 sm:py-2">{day}</span>)}</div><div className="grid grid-cols-7 gap-1">{calendarDays.map((day) => { const event = eventByDay[day] as (typeof calendarEvents)[number] | undefined; return <div key={day} className={"min-h-12 rounded-lg border p-1 text-left sm:min-h-16 sm:rounded-xl sm:p-2 " + (day === 3 ? "border-sky-400/50 bg-sky-400/10" : "border-white/[0.06] bg-white/[0.02]")}><p className={day === 3 ? "text-xs font-semibold text-sky-200 sm:text-sm" : "text-xs text-slate-300 sm:text-sm"}>{day}</p>{event && <div className="mt-1 flex items-start gap-1 sm:mt-2 sm:gap-1.5"><span className={"mt-1 size-1.5 shrink-0 rounded-full " + event.tone} /><p className="hidden line-clamp-2 text-[11px] leading-4 text-slate-400 sm:block">{event.title}</p></div>}</div>; })}</div></CardContent></Card>
        <Card><CardHeader><div><p className="text-lg font-semibold">Prochains rendez-vous</p><p className="mt-1 text-sm text-slate-500">Vue {profile === "Duo" ? "partagée" : "de " + profile}</p></div><CalendarDays className="size-5 text-slate-400" /></CardHeader><CardContent className="space-y-2">{visibleItems.length === 0 && syncState === "ready" && <p className="py-4 text-sm text-slate-500">Aucun événement sur la période.</p>}{visibleItems.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-white/[0.04]"><span className="size-2 shrink-0 rounded-full bg-emerald-400" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{item.title || "Sans titre"}</p><Badge>Duo</Badge></div><p className="mt-1 text-sm text-slate-500">{item.allDay ? "Toute la journée" : new Date(item.startsAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</p></div></div>)}</CardContent></Card>
      </div>
    </div>
  );
}

function ProfileView({ profile }: { profile: Profile }) {
  return (
    <div className="mt-8 max-w-3xl space-y-7">
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
  const [activationRequired, setActivationRequired] = useState(true);
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
              window.dispatchEvent(new Event(wakeEvent));
            }
          }).finally(() => { sending = false; });
        };
        setActivationRequired(false);
      } catch (error) {
        console.warn("Activation de Bonjour Jarvis impossible", error);
        if (processor) processor.onaudioprocess = null;
        processor?.disconnect();
        processor = null;
        await context?.close();
        context = null;
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
        if (active) setActivationRequired(true);
      } finally {
        starting = false;
      }
    };

    activate.current = start;
    return () => {
      active = false;
      activate.current = null;
      if (processor) processor.onaudioprocess = null;
      processor?.disconnect();
      void context?.close();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (!activationRequired) return null;
  return <button type="button" onClick={() => void activate.current?.()} className="fixed bottom-24 right-6 z-30 rounded-full border border-amber-300/40 bg-zinc-900 px-4 py-2 text-sm font-medium text-amber-100 shadow-xl">
    Activer Bonjour Jarvis
  </button>;
}

function AssistantOrb() {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Touchez pour parler");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const silenceTimer = useRef<number | null>(null);
  const startedAt = useRef(0);

  const stop = useCallback(() => {
    if (silenceTimer.current) window.clearInterval(silenceTimer.current);
    silenceTimer.current = null;
    recorder.current?.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    recorder.current = null;
    stream.current = null;
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    try {
      const capturedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = capturedStream;
      const chunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(capturedStream);
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      mediaRecorder.onstop = async () => {
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
      let quietSince = 0;
      silenceTimer.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        const level = samples.reduce((sum, value) => sum + Math.abs(value - 128), 0) / samples.length;
        if (level < 3) quietSince ||= Date.now(); else quietSince = 0;
        if ((quietSince && Date.now() - quietSince > 1000) || Date.now() - startedAt.current > 10000) {
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
    const handleWake = () => { if (!recorder.current) void start(); };
    window.addEventListener(wakeEvent, handleWake);
    return () => window.removeEventListener(wakeEvent, handleWake);
  }, [start]);

  // Capture is triggered exclusively by the wake word. The manual control
  // stays removed, but this component must remain mounted to handle wakeEvent.
  return null;
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
    <Card className="relative overflow-hidden border-sky-400/30 bg-gradient-to-br from-sky-300 via-cyan-200 to-violet-300 text-zinc-950">
      <div className="dot-field absolute inset-y-0 right-0 w-2/5 opacity-60" />
      <CardContent className="relative flex min-h-[220px] flex-col justify-between p-6">
        <div className="flex items-start justify-between"><div><p className="text-sm font-medium text-zinc-700">{weather?.location.name ?? "Météo locale"}</p><p className="mt-2 text-5xl font-semibold tracking-[-0.06em]">{weather ? `${Math.round(weather.current.temperatureCelsius)}°` : "—"}</p></div><CloudSun className="size-12 text-sky-700/80" /></div>
        <div className="flex items-end justify-between gap-4"><p className="max-w-64 text-sm leading-5 text-zinc-700">{weather?.current.summary ?? (unavailable ? "La météo est momentanément indisponible." : "Chargement de la météo…")}</p><span className="shrink-0 rounded-full bg-white/70 px-3 py-2 text-xs font-medium text-zinc-700">{weather ? `Ressenti ${Math.round(weather.current.apparentCelsius)}°` : "Home Core"}</span></div>
      </CardContent>
    </Card>
  );
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
  }, [status.state, status.updatedAt]);
  if (status.state === "idle") return null;
  const listening = status.state === "listening";
  const answered = status.state === "answered";
  const orb = listening ? <Orb state="using" variant="record" size={260} speed={1} label="Écoute en cours" /> : answered ? <Orb state="idle" size={260} speed={0.7} label="Réponse prête" /> : <Orb state="reasoning" size={260} speed={1} label="Réflexion en cours" />;
  const label = listening ? "J’attends votre question" : status.state === "transcribing" ? "Je comprends votre question" : answered ? "Réponse prête" : "Création de la réponse";
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

  return (
    <main className="h-screen overflow-hidden bg-zinc-950 text-zinc-100 selection:bg-sky-300 selection:text-zinc-950">
      <div className="mx-auto grid h-full min-h-0 max-w-[1600px] grid-cols-1 lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-white/10 bg-zinc-900/70 px-5 py-6 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between lg:block">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-white text-zinc-950"><Sparkles className="size-5" /></div><div><p className="text-sm font-semibold tracking-wide">HOME AI</p><p className="text-xs text-zinc-500">Appartement</p></div></div>
            <Button variant="ghost" size="icon" aria-label="Ouvrir la navigation" aria-expanded={navOpen} className="lg:hidden" onClick={() => setNavOpen(!navOpen)}><MoreHorizontal /></Button>
          </div>
          <nav className={(navOpen ? "block " : "hidden ") + "mt-6 space-y-1 lg:mt-10 lg:block"}><Button variant={view === "dashboard" ? "secondary" : "ghost"} onClick={() => { setView("dashboard"); setNavOpen(false); }} className={view === "dashboard" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><Home /> Tableau de bord</Button><Button variant={view === "home" ? "secondary" : "ghost"} onClick={() => { setView("home"); setNavOpen(false); }} className={view === "home" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><Lightbulb /> Maison</Button><Button variant={view === "agenda" ? "secondary" : "ghost"} onClick={() => { setView("agenda"); setNavOpen(false); }} className={view === "agenda" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><CalendarDays /> Agenda</Button><Button variant={view === "profile" ? "secondary" : "ghost"} onClick={() => { setView("profile"); setNavOpen(false); }} className={view === "profile" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><UserRound /> Profil</Button><Button variant={view === "cost" ? "secondary" : "ghost"} onClick={() => { setView("cost"); setNavOpen(false); }} className={view === "cost" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><WalletCards /> Coût</Button></nav>
          <div className="mt-10 hidden rounded-2xl bg-white/[0.04] p-4 lg:block"><p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Assistant vocal</p><div className="mt-3 flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-sky-400/10 text-sky-200"><Orb state="idle" size={36} speed={0.7} label="Assistant vocal prêt" /></div><div><p className="text-sm">Prêt à échanger</p><p className="mt-0.5 text-xs text-zinc-500">Dites « Bonjour Jarvis »</p></div></div></div>
          <Button variant="ghost" className="mt-auto hidden w-full justify-start lg:mt-10 lg:flex"><Settings /> Réglages</Button>
        </aside>

        <section className="min-h-0 overflow-hidden px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
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
          <div className={view === "dashboard" ? "block" : "hidden"}>
          <div className="mt-8 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
            <WeatherCard />
            <Card><CardHeader><div><p className="text-sm font-medium">Prochain rendez-vous</p><p className="mt-1 text-sm text-slate-400">Aujourd’hui · 20:30</p></div><CalendarDays className="size-5 text-slate-400" /></CardHeader><CardContent><p className="text-lg font-medium">Dîner avec Lise</p><p className="mt-1 text-sm text-slate-500">À la maison</p><div className="mt-5 flex items-center gap-2"><Badge>{calendarLabel}</Badge><span className="text-xs text-slate-400">Connecté bientôt à iCloud</span></div></CardContent></Card>
          </div>

          <div className="mt-7 flex items-center justify-between"><div><p className="text-lg font-semibold tracking-[-0.02em]">Pièces</p><p className="mt-1 text-sm text-slate-500">Vue instantanée de l’appartement</p></div><span className="text-xs text-slate-500">État vocal disponible</span></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{rooms.map(({ name, detail, icon: Icon, active, tone }) => <Card key={name} className="transition-shadow hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-start justify-between"><div className={"grid size-10 place-items-center rounded-2xl " + tone}><Icon className="size-5" /></div><div className={active ? "size-2 rounded-full bg-emerald-500" : "size-2 rounded-full bg-slate-200"} /></div><p className="mt-8 text-base font-medium">{name}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></CardContent></Card>)}</div>

          <div className="mt-7 grid gap-4 lg:grid-cols-2"><Card><CardHeader><div><p className="text-lg font-semibold">Routines</p><p className="mt-1 text-sm text-slate-500">Préparer la maison en un geste</p></div><MoreHorizontal className="size-5 text-slate-400" /></CardHeader><CardContent className="grid grid-cols-2 gap-3"><div className="routine-card routine-evening"><span className="routine-icon"><Lightbulb className="size-4" /></span> Soirée</div><div className="routine-card routine-night"><span className="routine-icon"><Sparkles className="size-4" /></span> Bonne nuit</div></CardContent></Card><Card><CardHeader><div><p className="text-lg font-semibold">Confort</p><p className="mt-1 text-sm text-slate-500">Données indicatives — non connectées</p></div><ThermometerSun className="size-5 text-slate-400" /></CardHeader><CardContent><div className="flex items-end justify-between"><div><p className="text-4xl font-semibold tracking-[-0.04em]">21°</p><p className="mt-1 text-sm text-slate-500">Température moyenne</p></div><div className="text-right"><p className="text-sm font-medium">Tout est normal</p><p className="mt-1 text-sm text-emerald-600">Aucune alerte</p></div></div></CardContent></Card></div>
          </div>
        </section>
      </div>
      <WakeWordListener />
      <AssistantOrb />
      <VoiceOverlay status={voiceStatus} />
    </main>
  );
}

export default App;
