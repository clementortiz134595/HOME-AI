import { useEffect, useState, type ReactNode } from "react";
import { Activity, HardDrive, MemoryStick, Network, RotateCcw, Server, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSystemMetrics, type SystemMetrics } from "@/lib/systemHealth";
import "./SystemHealth.css";

const formatBytes = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} Go`;
const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}j ${hours}h ${minutes}m`;
};
const tone = (value: number) => value > 85 ? "danger" : value > 70 ? "warning" : "good";

function Metric({ icon, label, value, detail, status }: { icon: ReactNode; label: string; value: string; detail: string; status: "good" | "warning" | "danger" | "neutral" }) {
  return <article className="system-metric"><div className="system-metric-label">{icon}<span>{label}</span></div><strong className={`system-metric-value ${status}`}>{value}</strong><p>{detail}</p></article>;
}

export function SystemHealth() {
  const [metrics, setMetrics] = useState<SystemMetrics>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const next = await getSystemMetrics(controller.signal);
        if (!controller.signal.aborted) { setMetrics(next); setError(false); }
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [attempt]);

  const retry = () => { setLoading(true); setAttempt(value => value + 1); };
  return <section className="content system-health"><div className="section-heading"><div><p className="eyebrow">Infrastructure locale</p><h1>Raspberry Pi</h1></div><Button variant="ghost" size="icon" aria-label="Actualiser les métriques système" onClick={retry}><RotateCcw size={19} /></Button></div>
    {error && <div className="notice" role="alert"><p>Les métriques sont momentanément indisponibles.</p><Button variant="secondary" onClick={retry}>Réessayer</Button></div>}
    {loading && !metrics ? <p className="empty">Lecture des métriques système…</p> : null}
    {metrics && <><div className="system-metrics">
      <Metric icon={<MemoryStick size={18} />} label="RAM" value={`${metrics.memory.usedPercent.toFixed(0)}%`} detail={`${formatBytes(metrics.memory.usedBytes)} utilisés sur ${formatBytes(metrics.memory.totalBytes)}`} status={tone(metrics.memory.usedPercent)} />
      <Metric icon={<HardDrive size={18} />} label="Stockage" value={`${metrics.disk.usedPercent.toFixed(0)}%`} detail={`${formatBytes(metrics.disk.usedBytes)} utilisés · ${formatBytes(metrics.disk.availableBytes)} libres`} status={tone(metrics.disk.usedPercent)} />
      <Metric icon={<Activity size={18} />} label="Charge CPU" value={metrics.load1.toFixed(2)} detail="moyenne sur 1 minute" status="neutral" />
      <Metric icon={<Wifi size={18} />} label="Internet" value={metrics.network.internet ? "Connecté" : "Indisponible"} detail={metrics.network.interfaces.join(", ") || "Aucune interface active"} status={metrics.network.internet ? "good" : "danger"} />
    </div><article className="system-details"><div className="system-details-heading"><div><p className="eyebrow">Serveur local</p><h2>{metrics.hostname}</h2><p>Allumée depuis {formatUptime(metrics.uptimeSeconds)}</p></div><Server size={22} /></div><div className="system-detail-row"><Network size={18} /><div><span>Interfaces réseau actives</span><strong>{metrics.network.interfaces.join(", ") || "Aucune"}</strong></div></div><div className="system-detail-row"><Wifi size={18} /><div><span>Accès internet</span><strong>{metrics.network.internet ? "Opérationnel" : "À vérifier"}</strong></div></div></article></>}
  </section>;
}
