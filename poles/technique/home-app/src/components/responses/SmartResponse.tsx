import { Bell, BookOpen, CheckCheck, CircleAlert, Lightbulb, Mail, Sparkles, TrainFront, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateLabel, responseLabels, type AssistantAnswer, type ResponseKind } from "@/lib/assistant";
import type { useResponseData } from "@/lib/useResponseData";
import { AnswerText } from "./AnswerText";
import { MailResponse } from "./MailResponse";
import { ChoresResponse, HomeResponse, MarketsResponse, RemindersResponse, TrainsResponse } from "./DomainResponses";
const icons = { general: Sparkles, biography: BookOpen, mail: Mail, home: Lightbulb, reminders: Bell, chores: CheckCheck, trains: TrainFront, markets: TrendingUp };
const statuses = { executed: "Confirmé par Home Core", confirmation_required: "À confirmer", refused: "Demande refusée", unavailable: "Service indisponible", failed: "Action échouée" };
export function SmartResponse({ kind, answer, question, source, onConfirm, confirming, onDismiss }: {
  kind: ResponseKind; answer: AssistantAnswer; question: string; source: ReturnType<typeof useResponseData>;
  onConfirm: () => void; confirming: boolean; onDismiss: () => void;
}) {
  const Icon = icons[kind]; const data = source.data;
  return <section className={`smart-response response-${kind}`} aria-label={responseLabels[kind]} data-response-kind={kind}>
    <header className="response-heading"><span className="response-symbol"><Icon size={19} strokeWidth={1.6} /></span><div><p className="eyebrow">Résultat</p><h2>{responseLabels[kind]}</h2></div></header>
    {answer.status && <p className={`answer-status status-${answer.status}`}>{answer.status === "executed" && answer.generated !== false ? "Réponse reçue" : statuses[answer.status]}</p>}
    <AnswerText text={answer.text} timeline={kind === "biography"} />
    {answer.confirmationId && <div className="confirmation-card"><CircleAlert size={18} /><p>Home Core demande votre confirmation avant de poursuivre.</p><div><Button disabled={confirming} onClick={onConfirm}>{confirming ? "Confirmation…" : "Confirmer"}</Button><Button variant="ghost" disabled={confirming} onClick={onDismiss}>Refuser</Button></div></div>}
    {source.state === "loading" && <div className="source-loading" role="status"><span className="loading-dot" />Chargement des résultats…</div>}
    {source.state === "error" && <div className="source-error" role="alert"><p>{source.error}</p><Button variant="secondary" onClick={source.retry}>Réessayer</Button></div>}
    {source.state === "ready" && <div className="response-details">
      {kind === "mail" && data.mails && <MailResponse mails={data.mails} />}
      {kind === "home" && data.devices && <HomeResponse devices={data.devices} />}
      {kind === "reminders" && data.reminders && <RemindersResponse reminders={data.reminders} />}
      {kind === "chores" && data.chores && <ChoresResponse chores={data.chores} />}
      {kind === "trains" && data.trains && <TrainsResponse trains={data.trains} station={data.station} source={data.source} />}
      {kind === "markets" && data.etfs && <MarketsResponse etfs={data.etfs} question={question} />}
      {source.fetchedAt && <p className="fetched-at">Données reçues · {dateLabel(source.fetchedAt)}</p>}
    </div>}
    {kind === "mail" && source.state === "idle" && !answer.gmailQuery && !answer.confirmationId && <p className="source-caption">Aucune sélection de mails n’a été fournie par Home Core.</p>}
  </section>;
}
