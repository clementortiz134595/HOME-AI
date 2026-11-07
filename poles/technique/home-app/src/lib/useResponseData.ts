import { useEffect, useState } from "react";
import { canReadResults, marketPeriod, readJSON, type AssistantAnswer, type ResponseKind } from "./assistant";
import { getHomeDevices, getDeviceState } from "./homeControl";

export type Mail = { id: string; from: string; subject: string; receivedAt: string; snippet: string; body?: string; attachments?: { id: string; name: string; mimeType: string; size: number }[] };
export type Train = { id: string; departure: string; scheduledDeparture: string; destination: string; trainNumber: string; commercialMode?: string; platform?: string; status: string; delayMinutes: number; disruption?: { title: string; information?: string } };
export type Reminder = { id: string; title: string; date: string; details?: string };
export type Chore = { id: string; objective: string; dueDate?: string; assignees: string[]; completed: boolean };
export type HomeItem = { id: string; name: string; room: string; online?: boolean; on?: boolean };
export type ETF = { symbol: string; name: string; isin: string; history: { label: string; value: number }[]; available: boolean };
export type ResponseData = { mails?: Mail[]; trains?: Train[]; station?: string; source?: string; reminders?: Reminder[]; chores?: Chore[]; devices?: HomeItem[]; etfs?: ETF[] };
export type SourceState = "idle" | "loading" | "ready" | "error";

function array<T>(data: Record<string, unknown>, key: string, valid: (item: Record<string, unknown>) => boolean): T[] {
  if (!Array.isArray(data[key])) throw new Error("Le résultat de la source est incomplet.");
  const values = data[key] as unknown[];
  if (values.some(item => !item || typeof item !== "object" || !valid(item as Record<string, unknown>))) throw new Error("Le résultat de la source est incomplet.");
  return values as T[];
}
export function useResponseData(kind: ResponseKind, answer: AssistantAnswer | null, question: string) {
  const [result, setResult] = useState<{ state: SourceState; data: ResponseData; error: string; fetchedAt?: string }>({ state: "idle", data: {}, error: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    if (!answer || !canReadResults(answer) || kind === "general" || kind === "biography" || (kind === "mail" && !answer.gmailQuery)) {
      setResult({ state: "idle", data: {}, error: "" }); return;
    }
    setResult({ state: "loading", data: {}, error: "" });
    const load = async (): Promise<ResponseData> => {
      switch (kind) {
        case "mail": return { mails: array<Mail>(await readJSON(`/v1/workspace/google/gmail/messages?q=${encodeURIComponent(answer.gmailQuery!)}`, signal), "messages", x => typeof x.id === "string" && typeof x.subject === "string" && typeof x.from === "string" && typeof x.receivedAt === "string") };
        case "trains": {
          const data = await readJSON("/v1/insights/trains", signal);
          return { trains: array<Train>(data, "trains", x => typeof x.id === "string" && typeof x.destination === "string" && typeof x.departure === "string"), station: typeof data.station === "string" ? data.station : undefined, source: typeof data.source === "string" ? data.source : undefined };
        }
        case "reminders": return { reminders: array<Reminder>(await readJSON("/v1/reminders", signal), "reminders", x => typeof x.id === "string" && typeof x.title === "string" && typeof x.date === "string") };
        case "chores": {
          const today = new Date(); const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          return { chores: array<Chore>(await readJSON(`/v1/chores/?day=${day}`, signal), "chores", x => typeof x.id === "string" && typeof x.objective === "string" && Array.isArray(x.assignees)) };
        }
        case "home": {
          const devices = await getHomeDevices(signal);
          return { devices: await Promise.all(devices.map(async device => {
            try { const state = await getDeviceState(device.id, signal); return { ...device, online: state.online, on: state.switchOn }; }
            catch { return { ...device }; }
          })) };
        }
        case "markets": {
          const period = encodeURIComponent(marketPeriod(question));
          const inventory = array<{ symbol: string; name: string; isin: string }>(await readJSON(`/v1/insights/markets?period=${period}`, signal), "etfs", x => typeof x.symbol === "string" && typeof x.name === "string" && typeof x.isin === "string");
          const matches = inventory.filter(etf => new RegExp(`\\b${etf.symbol.replace(/[^a-z0-9]/gi, "")}\\b`, "i").test(question));
          return { etfs: await Promise.all((matches.length ? matches : inventory).map(async etf => {
            try {
              const data = await readJSON(`/v1/insights/markets/${encodeURIComponent(etf.symbol)}?period=${period}`, signal);
              const history = array<{ label: string; value: number }>(data, "history", x => typeof x.label === "string" && Number.isFinite(x.value) && Number(x.value) > 0).sort((a, b) => a.label.localeCompare(b.label));
              return { ...etf, history, available: data.dataStatus !== "unavailable" && data.dataStatus !== "simulated" && data.dataStatus !== "demo" && history.length > 1 };
            } catch { return { ...etf, history: [], available: false }; }
          })) };
        }
        default: return {};
      }
    };
    void load().then(data => { if (!signal.aborted) setResult({ state: "ready", data, error: "", fetchedAt: new Date().toISOString() }); }).catch(error => {
      if (!signal.aborted) setResult({ state: "error", data: {}, error: error instanceof Error ? error.message : "La source est indisponible." });
    });
    return () => controller.abort();
  }, [kind, answer, question, attempt]);
  return { ...result, retry: () => setAttempt(value => value + 1) };
}
