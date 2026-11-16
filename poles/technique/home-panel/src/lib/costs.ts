export type CostCategory = { category: string; amountCents: number };
export type CostMonth = { start: string; amountCents: number };
export type CostSummary = {
  currency: "EUR";
  monthAmountCents: number;
  previousMonthCents: number;
  projectionCents: number;
  largestCategory?: CostCategory;
  breakdown: CostCategory[];
  history: CostMonth[];
  dataStatus: "available" | "empty";
};

export async function getCostSummary(signal?: AbortSignal): Promise<CostSummary> {
  const response = await fetch("/v1/costs/summary", { signal });
  if (!response.ok) throw new Error("costs_unavailable");
  return response.json() as Promise<CostSummary>;
}
