import { daysBetween, formatDate } from "@/lib/dates";
import type { Best } from "@/lib/workout-log";

/** One lift over time: the best set each day it was logged (weight, or reps / time for bodyweight & holds). */
export default function LiftChart({ points }: { points: { date: string; best: Best }[] }) {
  if (points.length === 0) return null;
  const W = 380;
  const H = 180;
  const pad = { l: 40, r: 12, t: 14, b: 26 };
  const vals = points.map((p) => p.best.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  const spread = Math.max(4, (max - min) * 0.15);
  min = Math.max(0, Math.floor(min - spread));
  max = Math.ceil(max + spread);
  const first = points[0].date;
  const span = Math.max(1, daysBetween(first, points[points.length - 1].date));
  const x = (d: string) => (points.length === 1 ? (W + pad.l - pad.r) / 2 : pad.l + (daysBetween(first, d) / span) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.best.value).toFixed(1)}`).join(" ");
  const unit = points[points.length - 1].best.metric === "weight" ? "lb" : points[points.length - 1].best.metric === "time" ? "sec" : "reps";
  const ticks = [max, Math.round((max + min) / 2), min];
  return (
    <figure className="chart" aria-label="Lift progress">
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text className="chart-label" x={pad.l - 6} y={y(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}
        {points.length > 1 && <path className="chart-line" d={path} />}
        {points.map((p) => (
          <circle key={p.date} className="chart-dot" cx={x(p.date)} cy={y(p.best.value)} r={4.5} />
        ))}
        <text className="chart-label" x={pad.l} y={H - 6}>{formatDate(first, false)}</text>
        {points.length > 1 && (
          <text className="chart-label" x={W - pad.r} y={H - 6} textAnchor="end">{formatDate(points[points.length - 1].date, false)}</text>
        )}
      </svg>
      <figcaption className="small muted">Best set each workout ({unit})</figcaption>
    </figure>
  );
}
