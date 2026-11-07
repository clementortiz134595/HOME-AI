import { Bell, Check, CheckCheck, Lightbulb, TrainFront } from "lucide-react";
import { dateLabel, marketPeriod } from "@/lib/assistant";
import type { Chore, ETF, HomeItem, Reminder, Train } from "@/lib/useResponseData";

export function HomeResponse({ devices }: { devices: HomeItem[] }) {
  return <div className="result-list" aria-label="État des appareils">{!devices.length && <p className="response-empty">Aucun appareil disponible.</p>}{devices.map(device => <article className="result-row" key={device.id}><span className={`result-icon ${device.on ? "warm" : ""}`}><Lightbulb size={19} /></span><div><h3>{device.name}</h3><p>{device.room}</p></div><span className="state-pill">{device.online === undefined ? "État inconnu" : !device.online ? "Hors ligne" : device.on === undefined ? "Connecté" : device.on ? "Allumé" : "Éteint"}</span></article>)}</div>;
}
export function RemindersResponse({ reminders }: { reminders: Reminder[] }) {
  return <div className="result-list" aria-label="Rappels actuels">{!reminders.length && <p className="response-empty">Aucun rappel enregistré.</p>}{reminders.map(item => <article className="result-row" key={item.id}><span className="result-icon"><Bell size={18} /></span><div><h3>{item.title}</h3><p>{dateLabel(item.date)}</p>{item.details && <p>{item.details}</p>}</div></article>)}</div>;
}
export function ChoresResponse({ chores }: { chores: Chore[] }) {
  return <div className="result-list" aria-label="Tâches actuelles">{!chores.length && <p className="response-empty">Aucune tâche prévue aujourd’hui.</p>}{chores.map(item => <article className="result-row" key={item.id}><span className="result-icon">{item.completed ? <Check size={18} /> : <CheckCheck size={18} />}</span><div><h3>{item.objective}</h3><p>{item.assignees.join(" & ")}{item.dueDate && ` · ${dateLabel(item.dueDate, false)}`}</p></div><span className="state-pill">{item.completed ? "Fait" : "À faire"}</span></article>)}</div>;
}
export function TrainsResponse({ trains, station, source }: { trains: Train[]; station?: string; source?: string }) {
  return <div className="trains-response">{station && <p className="source-caption">Départs de {station}</p>}{!trains.length && <p className="response-empty">Aucun départ annoncé par cette source.</p>}{trains.map(train => <article key={train.id} className="train-result"><div className="train-route"><TrainFront size={18} /><h3>{train.destination}</h3><span className={`state-pill ${train.status === "cancelled" || train.status === "delayed" ? "warning" : ""}`}>{train.status === "cancelled" ? "Supprimé" : train.status === "delayed" ? `+${train.delayMinutes ?? "?"} min` : train.status === "on_time" ? "À l’heure" : "État inconnu"}</span></div><div className="train-time"><strong>{dateLabel(train.departure)}</strong><span>{train.commercialMode} {train.trainNumber}</span></div>{train.platform && <p>Voie {train.platform}</p>}{train.disruption?.title && <p className="disruption">{train.disruption.title}</p>}</article>)}{source && <p className="source-caption">Source : {source}</p>}</div>;
}
function HistoryChart({ etf }: { etf: ETF }) {
  const values = etf.history.map(point => point.value), min = Math.min(...values), max = Math.max(...values);
  const points = values.map((value, i) => `${(i / Math.max(1, values.length - 1)) * 280},${60 - ((value - min) / (max - min || 1)) * 48}`).join(" ");
  return <svg className="etf-history" viewBox="0 0 280 72" role="img" aria-label={`Historique ${etf.symbol}, du ${etf.history[0].label} au ${etf.history.at(-1)!.label}`}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}
export function MarketsResponse({ etfs, question }: { etfs: ETF[]; question: string }) {
  const period = marketPeriod(question);
  return <div className="markets-response"><p className="source-caption">ETF configurés dans Home Core · {period}</p>{!etfs.length && <p className="response-empty">Aucun ETF configuré.</p>}{etfs.map(etf => {
    const first = etf.history[0], last = etf.history.at(-1); const change = etf.available && first && last ? (last.value / first.value - 1) * 100 : null;
    return <article className="etf-result" key={etf.symbol}><div className="etf-heading"><div><h3>{etf.symbol}</h3><p>{etf.name}</p></div><strong className={change === null ? "" : change >= 0 ? "positive" : "negative"}>{change === null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)} %`}</strong></div>{etf.available ? <><HistoryChart etf={etf} /><p className="source-caption">Du {dateLabel(first.label, false)} au {dateLabel(last!.label, false)} · {etf.history.length} points</p></> : <p className="source-caption">Historique indisponible · aucune performance calculée.</p>}<p className="etf-isin">{etf.isin}</p></article>;
  })}<p className="source-caption">Variation entre le premier et le dernier point disponibles. Les ETF suivis ne décrivent pas les positions ni le rendement de votre portefeuille.</p></div>;
}
