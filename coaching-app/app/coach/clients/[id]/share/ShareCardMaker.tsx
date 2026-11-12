"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Day = { date: string; poses: Record<string, string> };
type Format = "post" | "story";

const SIZES: Record<Format, { w: number; h: number; label: string }> = {
  post: { w: 1080, h: 1350, label: "Post (4:5)" },
  story: { w: 1080, h: 1920, label: "Story (9:16)" },
};
const POSES = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
];
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function optionDate(iso: string, years: boolean): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(years ? { year: "2-digit" } : {}), timeZone: "UTC" });
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Weigh-in closest to a date (on or before it if there is one). */
function weightOn(list: { date: string; weight: number }[], date: string): number | null {
  const before = list.filter((w) => w.date <= date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (before) return before.weight;
  const after = list.filter((w) => w.date > date).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  return after ? after.weight : null;
}

export function defaultHeadline(
  weighIns: { date: string; weight: number }[],
  from: string,
  to: string,
  direction: "lose" | "gain" | null,
): string {
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 864e5);
  const weeks = Math.max(1, Math.round(days / 7));
  const span = `${weeks} week${weeks === 1 ? "" : "s"}`;
  const a = weightOn(weighIns, from);
  const b = weightOn(weighIns, to);
  if (a !== null && b !== null) {
    const diff = Math.round((b - a) * 10) / 10;
    if (diff <= -1 && direction !== "gain") return `Down ${Math.abs(diff)} lb in ${span}`;
    if (diff >= 1 && direction === "gain") return `Up ${diff} lb in ${span}`;
  }
  return `${span} of hard work`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load a photo"));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws an image into a box, cropped to fill it (like CSS object-fit: cover), with rounded corners. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = Math.max(0, (img.height - sh) * 0.3); // keep heads in frame
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderShareCard(
  canvas: HTMLCanvasElement,
  opts: { format: Format; before: string; after: string; beforeDate: string; afterDate: string; headline: string; subline: string; showDates: boolean },
) {
  const { w, h } = SIZES[opts.format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const [a, b, logo] = await Promise.all([loadImage(opts.before), loadImage(opts.after), loadImage("/icons/icon-192.png").catch(() => null)]);

  // Background.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#152033");
  bg.addColorStop(0.45, "#0b0d12");
  bg.addColorStop(1, "#0b0d12");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Brand line.
  const top = opts.format === "story" ? 250 : 60;
  ctx.textBaseline = "middle";
  let bx = 60;
  if (logo) {
    ctx.save();
    roundRect(ctx, 60, top - 32, 64, 64, 16);
    ctx.clip();
    ctx.drawImage(logo, 60, top - 32, 64, 64);
    ctx.restore();
    bx = 144;
  }
  ctx.fillStyle = "#6a9fc6";
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText("VITAL FUSION COACHING", bx, top);

  // Photos.
  const gap = 20;
  const pw = (w - 60 * 2 - gap) / 2;
  const ph = Math.round(pw * (opts.format === "story" ? 1.75 : 1.33));
  const py = top + 70;
  drawCover(ctx, a, 60, py, pw, ph, 28);
  drawCover(ctx, b, 60 + pw + gap, py, pw, ph, 28);
  for (const [i, label, date] of [
    [0, "BEFORE", opts.beforeDate],
    [1, "AFTER", opts.afterDate],
  ] as const) {
    const x = 60 + i * (pw + gap) + 20;
    const text = opts.showDates ? `${label} · ${shortDate(date)}` : label;
    ctx.font = `800 28px ${FONT}`;
    const tw = ctx.measureText(text).width + 36;
    ctx.fillStyle = i === 0 ? "rgba(11,13,18,0.78)" : "rgba(106,159,198,0.92)";
    roundRect(ctx, x, py + ph - 76, tw, 56, 28);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, x + 18, py + ph - 48);
  }

  // Headline and subline.
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe7ab";
  let size = 92;
  ctx.font = `900 ${size}px ${FONT}`;
  let lines = wrap(ctx, opts.headline, w - 120);
  while (lines.length > 2 && size > 56) {
    size -= 6;
    ctx.font = `900 ${size}px ${FONT}`;
    lines = wrap(ctx, opts.headline, w - 120);
  }
  let y = py + ph + (opts.format === "story" ? 90 : 40) + size * 0.6;
  for (const l of lines.slice(0, 3)) {
    ctx.fillText(l, w / 2, y);
    y += size * 1.1;
  }
  if (opts.subline.trim()) {
    ctx.fillStyle = "#f4f5f7";
    ctx.font = `600 40px ${FONT}`;
    ctx.fillText(opts.subline.trim(), w / 2, y + 6);
  }
  ctx.fillStyle = "#8d939e";
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText("vitalfusioncoaching.com", w / 2, h - (opts.format === "story" ? 260 : 56));
  ctx.textAlign = "left";
}

export default function ShareCardMaker({
  days,
  weighIns,
  firstName,
  direction,
}: {
  days: Day[];
  weighIns: { date: string; weight: number }[];
  firstName: string;
  direction: "lose" | "gain" | null;
}) {
  const [pose, setPose] = useState("front");
  const withPose = useMemo(() => days.filter((d) => d.poses[pose]), [days, pose]);
  const years = new Set(days.map((d) => d.date.slice(0, 4))).size > 1;
  const [beforeDate, setBeforeDate] = useState(days[0].date);
  const [afterDate, setAfterDate] = useState(days[days.length - 1].date);
  const [format, setFormat] = useState<Format>("post");
  const [showDates, setShowDates] = useState(true);
  const [showName, setShowName] = useState(false);
  const autoHeadline = defaultHeadline(weighIns, beforeDate, afterDate, direction);
  const [headline, setHeadline] = useState(autoHeadline);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep the dates valid for the chosen pose.
  useEffect(() => {
    if (!withPose.length) return;
    if (!withPose.some((d) => d.date === beforeDate)) setBeforeDate(withPose[0].date);
    if (!withPose.some((d) => d.date === afterDate)) setAfterDate(withPose[withPose.length - 1].date);
  }, [withPose, beforeDate, afterDate]);

  useEffect(() => {
    if (!edited) setHeadline(autoHeadline);
  }, [autoHeadline, edited]);

  const subline = showName ? `${firstName} · Vital Fusion client` : "";
  const before = days.find((d) => d.date === beforeDate)?.poses[pose];
  const after = days.find((d) => d.date === afterDate)?.poses[pose];

  useEffect(() => {
    if (!canvasRef.current || !before || !after) return;
    let cancelled = false;
    setError("");
    renderShareCard(canvasRef.current, { format, before, after, beforeDate, afterDate, headline, subline, showDates }).catch((e: Error) => {
      if (!cancelled) setError(e.message);
    });
    return () => {
      cancelled = true;
    };
  }, [format, before, after, beforeDate, afterDate, headline, subline, showDates]);

  async function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
      if (!blob) throw new Error("Couldn't make the image.");
      const name = `vital-fusion-${firstName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${afterDate}.jpg`;
      const file = new File([blob], name, { type: "image/jpeg" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
        await navigator.share({ files: [file] }).catch(() => {});
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't make the image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="share-grid">
      <section className="card">
        <div className="field">
          <label>Photo</label>
          <div className="chips" style={{ marginTop: 0 }}>
            {POSES.map((p) => (
              <button key={p.value} type="button" className="chip" aria-pressed={pose === p.value} onClick={() => setPose(p.value)} disabled={!days.some((d) => d.poses[p.value])}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="before">Before</label>
            <select id="before" value={beforeDate} onChange={(e) => setBeforeDate(e.target.value)}>
              {withPose.map((d) => (
                <option key={d.date} value={d.date}>
                  {optionDate(d.date, years)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="after">After</label>
            <select id="after" value={afterDate} onChange={(e) => setAfterDate(e.target.value)}>
              {withPose.map((d) => (
                <option key={d.date} value={d.date}>
                  {optionDate(d.date, years)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="headline">Headline</label>
          <input
            id="headline"
            value={headline}
            maxLength={60}
            onChange={(e) => {
              setHeadline(e.target.value);
              setEdited(true);
            }}
          />
          {edited && (
            <button
              type="button"
              className="btn-link small"
              style={{ marginTop: 6 }}
              onClick={() => {
                setEdited(false);
                setHeadline(autoHeadline);
              }}
            >
              Use “{autoHeadline}”
            </button>
          )}
        </div>
        <div className="field">
          <label>Size</label>
          <div className="chips" style={{ marginTop: 0 }}>
            {(Object.keys(SIZES) as Format[]).map((f) => (
              <button key={f} type="button" className="chip" aria-pressed={format === f} onClick={() => setFormat(f)}>
                {SIZES[f].label}
              </button>
            ))}
          </div>
        </div>
        <label className="row small check-row" style={{ marginBottom: 8 }}>
          <input type="checkbox" checked={showDates} onChange={(e) => setShowDates(e.target.checked)} style={{ width: "auto" }} /> Show the dates
        </label>
        <label className="row small check-row" style={{ marginBottom: 16 }}>
          <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} style={{ width: "auto" }} /> Show {firstName}'s first name
        </label>
        {beforeDate >= afterDate && <p className="err">Pick an “after” day that's later than the “before” day.</p>}
        {error && <p className="err">{error}</p>}
        <button type="button" className="btn btn-wide" onClick={download} disabled={busy || beforeDate >= afterDate}>
          {busy ? "Making the image…" : "⬇ Download image"}
        </button>
      </section>
      <div>
        <p className="eyebrow">Preview</p>
        <canvas ref={canvasRef} className="share-canvas" aria-label="Before and after share card preview" />
      </div>
    </div>
  );
}
