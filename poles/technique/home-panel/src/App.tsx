import { useState } from "react";
import {
  Bot,
  CalendarDays,
  CloudSun,
  Home,
  Lightbulb,
  MoreHorizontal,
  Settings,
  Sparkles,
  ThermometerSun,
  UserRound,
  Utensils,
  Volume2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const rooms = [
  { name: "Salon", detail: "2 lumières · 21°", icon: Home, active: true, tone: "bg-amber-100 text-amber-700" },
  { name: "Cuisine", detail: "2 lumières · 20°", icon: Utensils, active: true, tone: "bg-rose-100 text-rose-700" },
  { name: "Chambre", detail: "2 lumières · 19°", icon: Sparkles, active: false, tone: "bg-violet-100 text-violet-700" },
];

const profiles = ["Duo", "Clément", "Lise"] as const;
type Profile = (typeof profiles)[number];
type View = "dashboard" | "home" | "agenda";

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
  const [lightsOn, setLightsOn] = useState(true);

  return (
    <div className="mt-8 space-y-7">
      <div><p className="text-sm text-slate-500">Vue de l’appartement</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Maison</h2></div>
      <Card className="relative overflow-hidden border-emerald-400/30 bg-gradient-to-br from-emerald-300 via-lime-200 to-sky-200 text-zinc-950"><div className="dot-field absolute inset-y-0 right-0 w-2/5 opacity-50" /><CardContent className="relative flex min-h-40 items-end justify-between p-6"><div><p className="text-sm font-medium text-zinc-700">Ambiance du soir</p><p className="mt-2 text-4xl font-semibold tracking-[-0.06em]">{lightsOn ? "Lumières allumées" : "Lumières éteintes"}</p></div><span className="rounded-full bg-white/70 px-3 py-2 text-xs font-medium text-zinc-700">Commande vocale</span></CardContent></Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rooms.map(({ name, detail, icon: Icon, active, tone }) => <Card key={name}><CardContent className="p-5"><div className="flex items-start justify-between"><div className={"grid size-11 place-items-center rounded-2xl " + tone}><Icon className="size-5" /></div><span className={active && lightsOn ? "size-2 rounded-full bg-emerald-400" : "size-2 rounded-full bg-zinc-600"} /></div><div className="mt-8 flex items-end justify-between gap-3"><div><p className="font-medium">{name}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div><span className="text-xs text-slate-500">À la voix</span></div></CardContent></Card>)}</div>
      <Card><CardHeader><div><p className="text-lg font-semibold">Scènes</p><p className="mt-1 text-sm text-slate-500">Des actions rapides pour le foyer</p></div><Sparkles className="size-5 text-slate-400" /></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><Button variant="secondary" className="h-16 justify-start"><Lightbulb className="size-4 text-amber-300" /> Soirée</Button><Button variant="secondary" className="h-16 justify-start"><Home className="size-4 text-emerald-300" /> Retour</Button><Button variant="secondary" className="h-16 justify-start"><Sparkles className="size-4 text-sky-300" /> Bonne nuit</Button></CardContent></Card>
    </div>
  );
}

function AgendaView({ profile }: { profile: Profile }) {
  const visibleItems = agendaItems.filter((item) => profile === "Duo" || item.owner === "Duo" || item.owner === profile);
  const visibleCalendarEvents = Object.entries(calendarEvents).filter(([, item]) => profile === "Duo" || item.owner === "Duo" || item.owner === profile);
  const eventByDay = Object.fromEntries(visibleCalendarEvents);

  return (
    <div className="mt-8 space-y-7">
      <div><h2 className="text-3xl font-semibold tracking-[-0.04em]">Agenda</h2></div>
      <div className="grid gap-4 sm:grid-cols-3"><Card className="border-sky-400/30 bg-sky-400/10"><CardContent className="p-5"><p className="text-sm text-slate-400">Aujourd’hui</p><p className="mt-2 text-3xl font-semibold">1</p><p className="mt-1 text-sm text-slate-500">événement partagé</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-slate-400">Cette semaine</p><p className="mt-2 text-3xl font-semibold">4</p><p className="mt-1 text-sm text-slate-500">rendez-vous</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-slate-400">Synchronisation</p><p className="mt-2 text-lg font-semibold text-amber-300">Bientôt</p><p className="mt-1 text-sm text-slate-500">iCloud Calendar</p></CardContent></Card></div>
      <Card><CardHeader><div><p className="text-lg font-semibold">Novembre 2026</p><p className="mt-1 text-sm text-slate-500">Vue calendrier · {profile === "Duo" ? "foyer partagé" : "agenda de " + profile}</p></div><CalendarDays className="size-5 text-slate-400" /></CardHeader><CardContent className="p-3 sm:p-6"><div className="grid grid-cols-7 gap-1 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500 sm:text-[11px] sm:tracking-[0.12em]">{["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((day) => <span key={day} className="py-1.5 sm:py-2">{day}</span>)}</div><div className="grid grid-cols-7 gap-1">{calendarDays.map((day) => { const event = eventByDay[day] as (typeof calendarEvents)[number] | undefined; return <div key={day} className={"min-h-12 rounded-lg border p-1 text-left sm:min-h-16 sm:rounded-xl sm:p-2 " + (day === 3 ? "border-sky-400/50 bg-sky-400/10" : "border-white/[0.06] bg-white/[0.02]")}><p className={day === 3 ? "text-xs font-semibold text-sky-200 sm:text-sm" : "text-xs text-slate-300 sm:text-sm"}>{day}</p>{event && <div className="mt-1 flex items-start gap-1 sm:mt-2 sm:gap-1.5"><span className={"mt-1 size-1.5 shrink-0 rounded-full " + event.tone} /><p className="hidden line-clamp-2 text-[11px] leading-4 text-slate-400 sm:block">{event.title}</p></div>}</div>; })}</div></CardContent></Card>
      <Card><CardHeader><div><p className="text-lg font-semibold">Prochains rendez-vous</p><p className="mt-1 text-sm text-slate-500">Vue {profile === "Duo" ? "partagée" : "de " + profile}</p></div><CalendarDays className="size-5 text-slate-400" /></CardHeader><CardContent className="space-y-2">{visibleItems.map((item) => <div key={item.title} className="flex items-center gap-4 rounded-2xl px-3 py-4 transition hover:bg-white/[0.04]"><span className={"size-2 shrink-0 rounded-full " + item.tone} /><div className="w-28 shrink-0 text-sm text-slate-400">{item.time}</div><div className="min-w-0 flex-1"><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.detail}</p></div><Badge>{item.owner}</Badge></div>)}</CardContent></Card>
    </div>
  );
}

function AssistantOrb() {
  const [listening, setListening] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={listening}
      onClick={() => setListening(!listening)}
      className="group fixed bottom-6 right-6 z-20 flex items-center gap-3 rounded-full border border-sky-200 bg-white/90 py-2 pl-2 pr-4 text-left shadow-[0_16px_50px_rgba(56,189,248,0.18)] backdrop-blur transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
    >
      <span className={listening ? "orb orb-listening" : "orb"}>
        <span className="orb-core"><Bot className="size-5" /></span>
      </span>
      <span>
        <span className="block text-sm font-semibold">{listening ? "Je t’écoute" : "À l’écoute"}</span>
        <span className="block text-xs text-slate-500">{listening ? "Parle-moi" : "Touchez pour parler"}</span>
      </span>
    </button>
  );
}

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [profile, setProfile] = useState<Profile>("Duo");
  const [profileOpen, setProfileOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const calendarLabel = profile === "Duo" ? "Partagé" : "Personnel";
  const profileInitial = profile === "Duo" ? "D" : profile === "Clément" ? "C" : "L";

  return (
    <main className="h-screen overflow-hidden bg-zinc-950 text-zinc-100 selection:bg-sky-300 selection:text-zinc-950">
      <div className="mx-auto grid h-full min-h-0 max-w-[1600px] grid-cols-1 lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-white/10 bg-zinc-900/70 px-5 py-6 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between lg:block">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-white text-zinc-950"><Sparkles className="size-5" /></div><div><p className="text-sm font-semibold tracking-wide">HOME AI</p><p className="text-xs text-zinc-500">Appartement</p></div></div>
            <Button variant="ghost" size="icon" aria-label="Ouvrir la navigation" aria-expanded={navOpen} className="lg:hidden" onClick={() => setNavOpen(!navOpen)}><MoreHorizontal /></Button>
          </div>
          <nav className={(navOpen ? "block " : "hidden ") + "mt-6 space-y-1 lg:mt-10 lg:block"}><Button variant={view === "dashboard" ? "secondary" : "ghost"} onClick={() => { setView("dashboard"); setNavOpen(false); }} className={view === "dashboard" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><Home /> Tableau de bord</Button><Button variant={view === "home" ? "secondary" : "ghost"} onClick={() => { setView("home"); setNavOpen(false); }} className={view === "home" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><Lightbulb /> Maison</Button><Button variant={view === "agenda" ? "secondary" : "ghost"} onClick={() => { setView("agenda"); setNavOpen(false); }} className={view === "agenda" ? "w-full justify-start bg-white/10 text-white hover:bg-white/15" : "w-full justify-start"}><CalendarDays /> Agenda</Button><Button variant="ghost" className="w-full justify-start"><UserRound /> Profils</Button></nav>
          <div className="mt-10 hidden rounded-2xl bg-white/[0.04] p-4 lg:block"><p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Assistant</p><div className="mt-3 flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-white/10 text-zinc-300 shadow-sm"><Volume2 className="size-4" /></div><p className="text-sm">Orb disponible</p></div></div>
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
              </div>}
            </div>
          </header>

          {view === "home" && <HomeView />}
          {view === "agenda" && <AgendaView profile={profile} />}
          <div className={view === "dashboard" ? "block" : "hidden"}>
          <div className="mt-8 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
            <Card className="relative overflow-hidden border-sky-400/30 bg-gradient-to-br from-sky-300 via-cyan-200 to-violet-300 text-zinc-950"><div className="dot-field absolute inset-y-0 right-0 w-2/5 opacity-60" /><CardContent className="relative flex min-h-[220px] flex-col justify-between p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-zinc-700">À la maison</p><p className="mt-2 text-5xl font-semibold tracking-[-0.06em]">21°</p></div><CloudSun className="size-12 text-amber-600" /></div><div className="flex items-end justify-between"><p className="max-w-64 text-sm leading-5 text-zinc-700">Une soirée calme. La maison est prête pour vous.</p><span className="rounded-full bg-white/70 px-3 py-2 text-xs font-medium text-zinc-700">Commande vocale</span></div></CardContent></Card>
            <Card><CardHeader><div><p className="text-sm font-medium">Prochain rendez-vous</p><p className="mt-1 text-sm text-slate-400">Aujourd’hui · 20:30</p></div><CalendarDays className="size-5 text-slate-400" /></CardHeader><CardContent><p className="text-lg font-medium">Dîner avec Lise</p><p className="mt-1 text-sm text-slate-500">À la maison</p><div className="mt-5 flex items-center gap-2"><Badge>{calendarLabel}</Badge><span className="text-xs text-slate-400">Connecté bientôt à iCloud</span></div></CardContent></Card>
          </div>

          <div className="mt-7 flex items-center justify-between"><div><p className="text-lg font-semibold tracking-[-0.02em]">Pièces</p><p className="mt-1 text-sm text-slate-500">Vue instantanée de l’appartement</p></div><span className="text-xs text-slate-500">État vocal disponible</span></div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">{rooms.map(({ name, detail, icon: Icon, active, tone }) => <Card key={name} className="transition-shadow hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"><CardContent className="p-5"><div className="flex items-start justify-between"><div className={"grid size-10 place-items-center rounded-2xl " + tone}><Icon className="size-5" /></div><div className={active ? "size-2 rounded-full bg-emerald-500" : "size-2 rounded-full bg-slate-200"} /></div><p className="mt-8 text-base font-medium">{name}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></CardContent></Card>)}</div>

          <div className="mt-7 grid gap-4 lg:grid-cols-2"><Card><CardHeader><div><p className="text-lg font-semibold">Routines</p><p className="mt-1 text-sm text-slate-500">Préparer la maison en un geste</p></div><MoreHorizontal className="size-5 text-slate-400" /></CardHeader><CardContent className="grid grid-cols-2 gap-3"><div className="flex h-20 items-center gap-3 rounded-xl bg-amber-50 px-4 text-sm text-slate-800"><span className="grid size-9 place-items-center rounded-xl bg-amber-200 text-amber-800"><Lightbulb className="size-4" /></span> Soirée</div><div className="flex h-20 items-center gap-3 rounded-xl bg-sky-50 px-4 text-sm text-slate-800"><span className="grid size-9 place-items-center rounded-xl bg-sky-200 text-sky-800"><Sparkles className="size-4" /></span> Bonne nuit</div></CardContent></Card><Card><CardHeader><div><p className="text-lg font-semibold">Confort</p><p className="mt-1 text-sm text-slate-500">Données indicatives — non connectées</p></div><ThermometerSun className="size-5 text-slate-400" /></CardHeader><CardContent><div className="flex items-end justify-between"><div><p className="text-4xl font-semibold tracking-[-0.04em]">21°</p><p className="mt-1 text-sm text-slate-500">Température moyenne</p></div><div className="text-right"><p className="text-sm font-medium">Tout est normal</p><p className="mt-1 text-sm text-emerald-600">Aucune alerte</p></div></div></CardContent></Card></div>
          </div>
        </section>
      </div>
      <AssistantOrb />
    </main>
  );
}

export default App;
