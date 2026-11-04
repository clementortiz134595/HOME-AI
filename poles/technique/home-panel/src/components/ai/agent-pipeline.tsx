import { AudioLines, Bot, BrainCircuit, CheckCircle2, LoaderCircle, Wrench, XCircle } from "lucide-react";

type AgentState = "idle" | "listening" | "transcribing" | "thinking" | "answered" | "error";
type AgentStatus = { state: AgentState; transcript?: string; answer?: string };

const steps = [
  { key: "listening", label: "Écoute" },
  { key: "transcribing", label: "Transcription" },
  { key: "thinking", label: "Routage Gemini" },
  { key: "answered", label: "Exécution" },
] as const;

const stepIcon = [AudioLines, BrainCircuit, Bot, Wrench];
const rank: Record<AgentState, number> = { idle: -1, listening: 0, transcribing: 1, thinking: 2, answered: 3, error: -1 };

// Shadcn-style AI status primitives: pipeline, reasoning and assistant message.
export function AgentPipeline({ status }: { status: AgentStatus }) {
  const active = rank[status.state];
  return <div className="w-full max-w-2xl space-y-5 text-left">
    <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-sky-400/15 text-sky-200"><Bot className="size-5" /></span><div><p className="text-sm font-semibold">Agent HOME AI</p><p className="text-xs text-slate-400">Pipeline vocale</p></div></div>
      <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{steps.map(({ key, label }, index) => { const Icon = stepIcon[index]; const complete = active > index; const current = active === index; return <li key={key} className={"rounded-2xl border p-3 " + (current ? "border-sky-400/50 bg-sky-400/10" : complete ? "border-emerald-400/30 bg-emerald-400/5" : "border-white/[0.06] bg-white/[0.02]")}><div className="flex items-center gap-2">{complete ? <CheckCircle2 className="size-4 text-emerald-400" /> : current ? <LoaderCircle className="size-4 animate-spin text-sky-300" /> : <Icon className="size-4 text-slate-500" />}</div><p className="mt-2 text-xs font-medium">{label}</p></li>; })}</ol>
    </div>
    {status.transcript && <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-4"><p className="text-xs font-medium uppercase tracking-[.14em] text-slate-500">Vous</p><p className="mt-2 text-sm leading-6 text-zinc-200">{status.transcript}</p></div>}
    {status.answer && <div className="rounded-3xl border border-sky-400/20 bg-sky-400/10 p-4"><p className="text-xs font-medium uppercase tracking-[.14em] text-sky-200">Assistant</p><p className="mt-2 text-sm leading-6 text-sky-50">{status.answer}</p></div>}
    {status.state === "error" && <div className="flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100"><XCircle className="size-4" />La pipeline vocale est indisponible.</div>}
  </div>;
}
