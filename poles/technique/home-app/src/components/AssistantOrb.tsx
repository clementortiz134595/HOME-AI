import { Orb } from "@yogesharc/thinking-orbs";
import type { VoicePhase } from "@/lib/useVoice";

export function AssistantOrb({ phase }: { phase: VoicePhase }) {
  switch (phase) {
    case "requesting": return <Orb state="waiting" size={224} speed={0.7} label="Activation du microphone" />;
    case "listening": return <Orb state="using" variant="record" size={224} speed={1.2} label="Écoute en cours" />;
    case "transcribing": return <Orb state="working" variant="gyro" size={224} speed={1} label="Finalisation de la transcription" />;
    case "thinking": return <Orb state="reasoning" variant="twins" size={224} speed={0.9} label="Réflexion en cours" />;
    case "answered": return <Orb state="idle" variant="blink" size={224} speed={0.8} label="Réponse prête" />;
    case "error": return <Orb state="waiting" size={224} speed={0.45} label="En attente d’une nouvelle tentative" />;
    default: return <Orb state="idle" size={224} speed={0.5} label="Assistant prêt" />;
  }
}
