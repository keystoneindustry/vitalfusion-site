/** A simple line chart of weight over time (SVG, no libraries). Points oldest → newest. */
export default function WeightChart({ points, label = "Weekly average (lb)" }: { points: { x: string; y: number }[]; label?: string }) {
  if (points.length < 2) return null;
  const W = 600;
  const H = 180;
  const pad = { l: 40, r: 12, t: 12, b: 26 };
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (max - min < 4) {
    const mid = (max + min) / 2;
    min = mid - 2;
    max = mid + 2;
  }
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const ticks = [max, (max + min) / 2, min];
  const short = (iso: string) => {
    const [, m, dd] = iso.split("-").map(Number);
    return `${m}/${dd}`;
  };
  return (
    <figure className="chart" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="chart-label">
              {Math.round(t)}
            </text>
          </g>
        ))}
        <path d={d} className="chart-line" />
        {points.map((p, i) => (
          <circle key={p.x} cx={x(i)} cy={y(p.y)} r={3.5} className="chart-dot">
            <title>
              {short(p.x)}: {p.y} lb
            </title>
          </circle>
        ))}
        <text x={pad.l} y={H - 6} className="chart-label">
          {short(points[0].x)}
        </text>
        <text x={W - pad.r} y={H - 6} textAnchor="end" className="chart-label">
          {short(points[points.length - 1].x)}
        </text>
      </svg>
      <figcaption className="muted small">{label}</figcaption>
    </figure>
  );
}
