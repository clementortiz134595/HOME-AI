export type ActionStatus = "executed" | "confirmation_required" | "refused" | "unavailable" | "failed";
export type AssistantAnswer = {
  text: string; status?: ActionStatus; confirmationId?: string; gmailQuery?: string;
  provider?: string; generated?: boolean;
};
export type ResponseKind = "general" | "biography" | "mail" | "home" | "reminders" | "chores" | "trains" | "markets";
export const responseLabels: Record<ResponseKind, string> = {
  general: "Votre réponse", biography: "Repères biographiques", mail: "Vos mails", home: "Votre maison",
  reminders: "Vos rappels", chores: "Tâches du foyer", trains: "Vos prochains trains", markets: "Vos ETF suivis",
};
export function responseKind(question: string, answer?: AssistantAnswer | null): ResponseKind {
  if (answer?.gmailQuery) return "mail";
  const text = question.toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\b(mail|mails|gmail|courriel|courriels|email|emails)\b/.test(text)) return "mail";
  if (/\b(etf|etfs|placement|placements|investissement|investissements|financier|financiers|bourse|portefeuille|epargne|nasdaq|cac|bnke|panx|pust|psp5|paasi|c50)\b/.test(text)) return "markets";
  if (/\b(train|trains|sncf|gare|ter|tgv)\b/.test(text)) return "trains";
  if (/\b(rappel|rappels|rappelle|rappelle-moi)\b/.test(text)) return "reminders";
  if (/\b(menage|menageres|vaisselle|corvees|tache|taches)\b/.test(text)) return "chores";
  if (/\b(allume|allumer|eteins|eteindre|lumiere|lumieres|lampe|lampes|prise|prises|domotique|volet|chauffage)\b/.test(text)) return "home";
  if (/\b(qui est|biographie|parcours|personnalite|sa vie|vie de|carriere)\b/.test(text)) return "biography";
  return "general";
}
export function canReadResults(answer: AssistantAnswer) {
  return !answer.confirmationId && !["confirmation_required", "refused", "failed", "unavailable"].includes(answer.status ?? "");
}
export function marketPeriod(question: string): "jour" | "mois" | "année" {
  const text = question.toLowerCase();
  return /ann[ée]|an\b|12 mois/.test(text) ? "année" : /mois|mensuel|semaine|hebdomadaire/.test(text) ? "mois" : "jour";
}
export async function readJSON(path: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const response = await fetch(path, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "L’accès à cette source n’est pas autorisé." : "Cette source est momentanément indisponible.");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("La source a renvoyé un résultat illisible.");
  return data as Record<string, unknown>;
}
export function dateLabel(value: string, withTime = true): string {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? "Date non renseignée" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", ...(withTime && !/^\d{4}-\d{2}-\d{2}$/.test(value) ? { timeStyle: "short" as const } : {}) }).format(date);
}

export function parseAssistantAnswer(value: unknown): AssistantAnswer {
  if (!value || typeof value !== "object" || !("text" in value) || typeof value.text !== "string" || !value.text.trim()) throw new Error("Home Core n’a pas renvoyé de réponse.");
  const raw = value as Record<string, unknown>;
  const answer: AssistantAnswer = { text: value.text };
  if (typeof raw.status === "string") {
    if (!["executed", "confirmation_required", "refused", "failed", "unavailable"].includes(raw.status)) throw new Error("Home Core a renvoyé un statut inconnu.");
    answer.status = raw.status as ActionStatus;
  }
  for (const key of ["confirmationId", "gmailQuery", "provider"] as const) {
    if (typeof raw[key] === "string" && raw[key].trim()) answer[key] = raw[key];
  }
  if (typeof raw.generated === "boolean") answer.generated = raw.generated;
  return answer;
}
