import { useEffect, useRef, useState } from "react";

type VoiceSession = { recorder?: MediaRecorder; stream?: MediaStream; timer?: number; request?: AbortController; cancelled: boolean };

export function useVoice(enabled: boolean) {
  const [phase, setPhase] = useState<"idle" | "listening" | "thinking" | "answered" | "error">("idle");
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const session = useRef<VoiceSession | null>(null);
  const cancel = () => {
    const current = session.current;
    session.current = null;
    if (current) {
      current.cancelled = true;
      clearTimeout(current.timer);
      current.request?.abort();
      if (current.recorder?.state === "recording") current.recorder.stop();
      current.stream?.getTracks().forEach(track => track.stop());
    }
    setPhase("idle");
  };
  useEffect(() => {
    if (!enabled) cancel();
    const hide = () => { if (document.hidden || window.matchMedia("(orientation: landscape)").matches) cancel(); };
    const orientation = window.matchMedia("(orientation: landscape)");
    document.addEventListener("visibilitychange", hide);
    orientation.addEventListener("change", hide);
    window.addEventListener("pagehide", cancel);
    return () => { cancel(); document.removeEventListener("visibilitychange", hide); orientation.removeEventListener("change", hide); window.removeEventListener("pagehide", cancel); };
  }, [enabled]);
  const toggle = async () => {
    if (session.current?.recorder?.state === "recording") { session.current.recorder.stop(); return; }
    if (session.current || !enabled) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setPhase("error"); setMessage("Le microphone nécessite un navigateur compatible et une connexion HTTPS."); return; }
    const current: VoiceSession = { cancelled: false };
    session.current = current;
    setTranscript(""); setMessage("");
    try {
      current.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (current.cancelled) { current.stream.getTracks().forEach(track => track.stop()); return; }
      const recorder = new MediaRecorder(current.stream);
      current.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { cancel(); setPhase("error"); setMessage("L’enregistrement a échoué. Réessayez."); };
      recorder.onstop = async () => {
        clearTimeout(current.timer);
        current.stream?.getTracks().forEach(track => track.stop());
        if (current.cancelled) return;
        setPhase("thinking");
        current.request = new AbortController();
        current.timer = window.setTimeout(() => current.request?.abort(), 45000);
        try {
          const response = await fetch("/v1/assistant/voice", { method: "POST", headers: { "Content-Type": recorder.mimeType || "audio/webm" }, body: new Blob(chunks, { type: recorder.mimeType || "audio/webm" }), signal: current.request.signal });
          if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Votre connexion à Home Core doit être autorisée." : "Home Core est indisponible. Réessayez dans un instant.");
          const result = await response.json() as { transcript: string; answer: { text: string } };
          if (!result.answer?.text) throw new Error("Home Core n’a pas renvoyé de réponse.");
          if (!current.cancelled) { setTranscript(result.transcript); setMessage(result.answer.text); setPhase("answered"); }
        } catch (error) {
          if (!current.cancelled) { setPhase("error"); setMessage(error instanceof Error && error.name !== "AbortError" ? error.message : "Le délai de réponse est dépassé. Réessayez."); }
        } finally { clearTimeout(current.timer); if (session.current === current) session.current = null; }
      };
      recorder.start(); setPhase("listening");
      current.timer = window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 20000);
    } catch {
      current.stream?.getTracks().forEach(track => track.stop());
      if (!current.cancelled) { session.current = null; setPhase("error"); setMessage("Accès au microphone impossible. Vérifiez les permissions du navigateur."); }
    }
  };
  return { phase, message, transcript, toggle };
}
