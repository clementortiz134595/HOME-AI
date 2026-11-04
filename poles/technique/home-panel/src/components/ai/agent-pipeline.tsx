import { AudioLines, Bot, BrainCircuit, CheckCircle2, Circle, LoaderCircle, Route, Wrench, XCircle } from "lucide-react";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";

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

export function AgentPipeline({ status }: { status: AgentStatus }) {
  const active = rank[status.state];
  const completed = Math.max(0, Math.min(steps.length, active + 1));
  return <div className="w-full max-w-xl space-y-4 text-left">
    <Trace className="pipeline-trace">
      <TraceCollapsible defaultOpen>
        <TraceCollapsibleTrigger className="w-full text-left">
          <TraceLine status={status.state === "error" ? "pending" : active >= 0 ? "running" : "pending"}>
            <TraceIcon><Route className="size-4" /></TraceIcon>
            <span className="min-w-0 flex-1"><TraceTitle>Pipeline vocale</TraceTitle><TraceDescription>{completed} sur {steps.length} étapes</TraceDescription></span>
            <Bot className="size-5 text-zinc-400" />
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace className="pipeline-steps">
            {steps.map(({ key, label }, index) => { const Icon = stepIcon[index]; const complete = active > index || status.state === "answered"; const current = active === index; return <TraceLine key={key} status={complete ? "complete" : current ? "running" : "pending"}><TraceIcon>{complete ? <CheckCircle2 className="size-4" /> : current ? <LoaderCircle className="size-4 animate-spin" /> : <Circle className="size-3" />}</TraceIcon><TraceTitle>{label}</TraceTitle><Icon className="ml-auto size-4 opacity-70" /></TraceLine>; })}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
    {status.transcript && <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-4"><p className="text-xs font-medium uppercase tracking-[.14em] text-slate-500">Vous</p><p className="mt-2 text-sm leading-6 text-zinc-200">{status.transcript}</p></div>}
    {status.answer && <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4"><p className="text-xs font-medium uppercase tracking-[.14em] text-zinc-400">Assistant</p><p className="mt-2 text-sm leading-6 text-zinc-200">{status.answer}</p></div>}
    {status.state === "error" && <div className="flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100"><XCircle className="size-4" />La pipeline vocale est indisponible.</div>}
  </div>;
}
