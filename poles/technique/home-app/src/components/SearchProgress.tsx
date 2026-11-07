import { Check, ChevronDown, Circle, LoaderCircle, X } from "lucide-react";
import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import type { VoicePhase } from "@/lib/useVoice";
import type { SourceState } from "@/lib/useResponseData";
export function SearchProgress({ phase, source, hasTranscript, hasAnswer }: { phase: VoicePhase; source: SourceState; hasTranscript: boolean; hasAnswer: boolean }) {
  const failed = phase === "error";
  const steps = [
    { label: "Votre demande", detail: "Transcription reçue", done: hasTranscript, running: !hasTranscript && !failed, error: false },
    { label: "Home Core", detail: hasAnswer ? "Réponse reçue" : "Traitement de la demande", done: hasAnswer, running: phase === "thinking", error: failed },
    { label: "Résultats", detail: source === "loading" ? "Lecture de la source" : source === "error" ? "Source indisponible" : hasAnswer ? "Affichage prêt" : "En attente de la réponse", done: hasAnswer && source !== "loading" && source !== "error", running: source === "loading", error: source === "error" },
  ];
  const complete = hasAnswer && source !== "loading" && source !== "error" && !failed;
  return <details className="progress-disclosure" open={!complete}><summary><span>{complete ? <Check size={13} /> : failed || source === "error" ? <X size={13} /> : <LoaderCircle className="step-spinner" size={13} />}{complete ? "Réponse prête · voir les étapes" : failed || source === "error" ? "Une étape est indisponible" : "Suivre votre demande"}</span><ChevronDown size={13} /></summary><Trace className="search-progress" role="status" aria-label="Progression de la demande" aria-live="polite">{steps.map(step => <TraceLine key={step.label} status={step.done ? "complete" : step.running ? "running" : "pending"} className={step.error ? "step-error" : ""}><TraceIcon>{step.error ? <X size={14} /> : step.done ? <Check size={14} /> : step.running ? <LoaderCircle className="step-spinner" size={14} /> : <Circle size={10} />}</TraceIcon><span><TraceTitle>{step.label}</TraceTitle><small>{step.detail}</small></span></TraceLine>)}</Trace></details>;
}
