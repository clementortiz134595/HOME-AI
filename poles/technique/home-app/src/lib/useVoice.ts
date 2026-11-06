import { useEffect, useRef, useState } from "react";

type RecognitionResult = { isFinal: boolean; [index: number]: { transcript: string } };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type RecognitionConstructor = new () => Recognition;
const browserRecognition = () => {
  const browser = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
};
export type VoicePhase = "idle" | "requesting" | "listening" | "transcribing" | "thinking" | "answered" | "error";
type VoiceSession = {
  recorder?: MediaRecorder; recognition?: Recognition; stream?: MediaStream;
  timer?: number; request?: AbortController; cancelled: boolean; text: string;
};

export function useVoice(enabled: boolean) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [mode, setMode] = useState<"browser" | "core">(() => browserRecognition() ? "browser" : "core");
  const session = useRef<VoiceSession | null>(null);
  const release = (current: VoiceSession) => {
    clearTimeout(current.timer);
    current.stream?.getTracks().forEach(track => track.stop());
  };
  const cancel = () => {
    const current = session.current;
    session.current = null;
    if (current) {
      current.cancelled = true;
      current.request?.abort();
      current.recognition?.abort();
      if (current.recorder?.state === "recording") current.recorder.stop();
      release(current);
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

  const fail = (current: VoiceSession, text: string) => {
    if (current.cancelled) return;
    current.cancelled = true;
    release(current);
    if (session.current === current) session.current = null;
    setPhase("error"); setMessage(text);
  };
  const send = async (current: VoiceSession, audio?: Blob) => {
    if (current.cancelled) return;
    release(current);
    setPhase("thinking");
    current.request = new AbortController();
    current.timer = window.setTimeout(() => current.request?.abort(), 45000);
    try {
      const response = await fetch(audio ? "/v1/assistant/voice" : "/v1/assistant/questions", {
        method: "POST", headers: { "Content-Type": audio ? audio.type || "audio/webm" : "application/json" },
        body: audio ?? JSON.stringify({ text: current.text }), signal: current.request.signal,
      });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Votre connexion à Home Core doit être autorisée." : audio ? "Home Core est indisponible pour transcrire et répondre." : "Transcription conservée à l’écran. Home Core est indisponible pour répondre.");
      const result = await response.json() as { text?: string; transcript?: string; answer?: { text: string } };
      if (!current.cancelled && audio && result.transcript) setTranscript(result.transcript);
      const answer = audio ? result.answer?.text : result.text;
      if (!answer) throw new Error("Home Core n’a pas renvoyé de réponse.");
      if (!current.cancelled) { setMessage(answer); setPhase("answered"); }
    } catch (error) {
      fail(current, error instanceof Error && error.name !== "AbortError" ? error.message : "Le délai de réponse est dépassé. Réessayez.");
    } finally { release(current); if (session.current === current) session.current = null; }
  };

  const toggle = async () => {
    const active = session.current;
    if (active?.recognition && phase === "listening") { setPhase("transcribing"); active.recognition.stop(); return; }
    if (active?.recorder?.state === "recording") { setPhase("transcribing"); active.recorder.stop(); return; }
    if (active || !enabled) return;
    const current: VoiceSession = { cancelled: false, text: "" };
    session.current = current;
    setTranscript(""); setMessage(""); setPhase("requesting");
    const Recognition = browserRecognition();
    if (Recognition && mode === "browser") {
      try {
        const recognition = new Recognition();
        current.recognition = recognition;
        recognition.lang = "fr-FR"; recognition.continuous = false; recognition.interimResults = true;
        recognition.onstart = () => {
          if (current.cancelled) { recognition.abort(); return; }
          setPhase("listening");
          current.timer = window.setTimeout(() => { if (!current.cancelled) { setPhase("transcribing"); recognition.stop(); } }, 20000);
        };
        recognition.onresult = event => {
          if (current.cancelled) return;
          current.text = Array.from(event.results).map(result => result[0]?.transcript ?? "").join(" ").trim();
          setTranscript(current.text);
        };
        recognition.onerror = event => {
          if (current.cancelled) return;
          if (["network", "service-not-allowed", "language-not-supported"].includes(event.error)) {
            setMode("core"); fail(current, "La dictée du navigateur est indisponible. Touchez l’orb pour réessayer via Home Core.");
          } else fail(current, event.error === "no-speech" ? "Je n’ai rien entendu. Touchez l’orb pour réessayer." : "Accès au microphone impossible. Vérifiez les permissions du navigateur.");
          recognition.abort();
        };
        recognition.onend = () => {
          if (current.cancelled) return;
          if (!current.text) { fail(current, "Je n’ai rien entendu. Touchez l’orb pour réessayer."); return; }
          void send(current);
        };
        recognition.start();
      } catch { fail(current, "Impossible de démarrer la dictée. Vérifiez les permissions du navigateur."); }
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      fail(current, "Le microphone nécessite un navigateur compatible et une connexion HTTPS."); return;
    }
    try {
      current.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (current.cancelled) { release(current); return; }
      const recorder = new MediaRecorder(current.stream);
      current.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { fail(current, "L’enregistrement a échoué. Réessayez."); if (recorder.state === "recording") recorder.stop(); };
      recorder.onstop = () => { release(current); if (!current.cancelled) void send(current, new Blob(chunks, { type: recorder.mimeType || "audio/webm" })); };
      recorder.start(); setPhase("listening");
      current.timer = window.setTimeout(() => { if (recorder.state === "recording") { setPhase("transcribing"); recorder.stop(); } }, 20000);
    } catch { release(current); fail(current, "Accès au microphone impossible. Vérifiez les permissions du navigateur."); }
  };
  return { phase, message, transcript, mode, toggle };
}
