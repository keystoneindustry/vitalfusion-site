import { daysBetween } from "@/lib/dates";

type Point = { date: string; y: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function short(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/**
 * Weight over time (SVG, no libraries): every weigh-in as a dot, spaced by date, with the weekly
 * average as a line through them. Points oldest → newest.
 */
export default function WeightChart({ daily, weekly }: { daily: Point[]; weekly: Point[] }) {
  if (daily.length === 0) return null;
  // A small drawing size keeps the labels readable on a phone (the SVG is scaled to fit the card).
  const W = 380;
  const H = 200;
  const pad = { l: 36, r: 10, t: 12, b: 26 };
  const ys = [...daily.map((p) => p.y), ...weekly.map((p) => p.y)];
  let min = Math.floor(Math.min(...ys) - 1);
  let max = Math.ceil(Math.max(...ys) + 1);
  if (max - min < 6) {
    const mid = (max + min) / 2;
    min = Math.floor(mid - 3);
    max = Math.ceil(mid + 3);
  }
  const first = daily[0].date;
  const last = daily[daily.length - 1].date;
  const span = Math.max(1, daysBetween(first, last));
  const x = (d: string) => (daily.length === 1 ? (W + pad.l - pad.r) / 2 : pad.l + (daysBetween(first, d) / span) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const line = (pts: Point[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const ticks = [max, Math.round((max + min) / 2), min];
  const wk = weekly.filter((p) => p.date >= first && p.date <= last);
  return (
    <figure className="chart" aria-label="Weight over time">
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="chart-label">
              {t}
            </text>
          </g>
        ))}
        {daily.length > 1 && <path d={line(daily)} className="chart-line-light" />}
        {wk.length > 1 && <path d={line(wk)} className="chart-line" />}
        {daily.map((p) => (
          <circle key={p.date} cx={x(p.date)} cy={y(p.y)} r={4} className="chart-dot">
            <title>{`${short(p.date)}: ${p.y} lb`}</title>
          </circle>
        ))}
        <text x={daily.length === 1 ? x(first) : pad.l} y={H - 8} textAnchor={daily.length === 1 ? "middle" : "start"} className="chart-label">
          {short(first)}
        </text>
        {daily.length > 1 && (
          <text x={W - pad.r} y={H - 8} textAnchor="end" className="chart-label">
            {short(last)}
          </text>
        )}
      </svg>
      <figcaption className="chart-key">
        <span>
          <i className="key-dot" /> Weigh-ins
        </span>
        {wk.length > 1 && (
          <span>
            <i className="key-line" /> Weekly average
          </span>
        )}
        {daily.length < 3 && <span className="muted">Your graph fills in as you weigh in.</span>}
      </figcaption>
    </figure>
  );
}
