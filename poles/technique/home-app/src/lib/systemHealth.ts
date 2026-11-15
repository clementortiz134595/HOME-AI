export type SystemMetrics = {
  hostname: string;
  uptimeSeconds: number;
  load1: number;
  memory: { totalBytes: number; usedBytes: number; availableBytes: number; usedPercent: number };
  disk: { totalBytes: number; usedBytes: number; availableBytes: number; usedPercent: number };
  network: { interfaces: string[]; internet: boolean };
  collectedAt: string;
};

export async function getSystemMetrics(signal?: AbortSignal): Promise<SystemMetrics> {
  const response = await fetch("/v1/system/metrics", { signal, cache: "no-store" });
  if (!response.ok) throw new Error("system_metrics_unavailable");
  return response.json() as Promise<SystemMetrics>;
}
