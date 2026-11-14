/**
 * "Download my meal plan (PDF)" for the nutrition plan calculator. Runs in the browser only.
 *
 * Styled like the Vital Fusion coaching guides (dark cover with the logo and a gold title line,
 * white pages with a small logo header, blue section labels, bold headings, rounded cards, dark
 * callouts with gold labels, and a "General information, not medical advice" footer), but worded as
 * a free sample plan, not a client document.
 *
 * Each page is drawn on a canvas with the site's own Inter font, then the pages are put into a PDF
 * as images (no extra libraries). The "Apply" box at the end is a clickable link.
 */
import { formatDate, goalDate, tipsFor, type MacroResults, type QuizInput } from "./macros";
import { goalSummary } from "./macro-email";
import type { SampleDay } from "./sample-day";

const W = 612; // Letter, in PDF points
const H = 792;
const SCALE = 2; // canvas pixels per point
const M = 46; // page margin
const CW = W - M * 2;
const BOTTOM = 740; // last y content may reach before the footer

const C = {
  ink: "#0d0f14",
  coverBg: "#0b0d12",
  text: "#14171c",
  body: "#5b6370",
  muted: "#8a919c",
  line: "#e3e6eb",
  soft: "#f4f5f8",
  blueDark: "#2f6a99",
  blue: "#6a9fc6",
  blueHi: "#8fbddf",
  gold: "#ffe7ab",
  carbs: "#e2b955",
  fat: "#7fb38a",
};

const LABEL: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

type Ctx = CanvasRenderingContext2D;
let FAM = "Inter, -apple-system, Helvetica, Arial, sans-serif";

// ───────── drawing helpers (all in PDF points) ─────────

function font(ctx: Ctx, weight: number, size: number) {
  ctx.font = `${weight} ${size}px ${FAM}`;
}

function text(ctx: Ctx, s: string, x: number, y: number, o: { w?: number; s?: number; c?: string; ls?: number; align?: "left" | "right" | "center" } = {}) {
  font(ctx, o.w ?? 400, o.s ?? 10);
  ctx.fillStyle = o.c ?? C.text;
  const ls = o.ls ?? 0;
  if (!ls) {
    ctx.textAlign = o.align ?? "left";
    ctx.fillText(s, x, y);
    ctx.textAlign = "left";
    return;
  }
  // Letter-spaced labels, drawn a character at a time (works in every browser).
  const width = [...s].reduce((a, ch) => a + ctx.measureText(ch).width + ls, -ls);
  let cx = o.align === "right" ? x - width : o.align === "center" ? x - width / 2 : x;
  for (const ch of s) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + ls;
  }
}

function wrap(ctx: Ctx, s: string, maxW: number, weight: number, size: number): string[] {
  font(ctx, weight, size);
  const out: string[] = [];
  let line = "";
  for (const word of s.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxW && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

function para(ctx: Ctx, s: string, x: number, y: number, maxW: number, o: { w?: number; s?: number; c?: string; lh?: number } = {}): number {
  const size = o.s ?? 10;
  const lh = o.lh ?? size * 1.5;
  const lines = wrap(ctx, s, maxW, o.w ?? 400, size);
  lines.forEach((ln, i) => text(ctx, ln, x, y + i * lh, { w: o.w, s: size, c: o.c }));
  return lines.length * lh;
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function bullets(ctx: Ctx, items: string[], x: number, y: number, maxW: number): number {
  let yy = y;
  for (const it of items) {
    ctx.fillStyle = C.blue;
    ctx.beginPath();
    ctx.arc(x + 2.5, yy - 3.2, 2, 0, Math.PI * 2);
    ctx.fill();
    yy += para(ctx, it, x + 11, yy, maxW - 11, { s: 9.5, c: "#3d434c", lh: 13.5 }) + 4;
  }
  return yy - y;
}

// ───────── pages ─────────

type Page = { canvas: HTMLCanvasElement; ctx: Ctx; links: { x: number; y: number; w: number; h: number; url: string }[] };

function newPage(bg = "#ffffff"): Page {
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  return { canvas, ctx, links: [] };
}

function logo(ctx: Ctx, img: HTMLImageElement | null, x: number, y: number, size: number) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.22);
  ctx.clip();
  if (img) ctx.drawImage(img, x, y, size, size);
  else {
    ctx.fillStyle = C.ink;
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

function header(p: Page, img: HTMLImageElement | null, section: string) {
  const { ctx } = p;
  logo(ctx, img, M, 30, 15);
  text(ctx, "YOUR NUTRITION PLAN", M + 22, 41.5, { w: 600, s: 8, c: "#4a505a", ls: 1.4 });
  text(ctx, section, W - M, 41.5, { s: 8, c: "#6b727d", align: "right" });
  ctx.fillStyle = "#d9dde3";
  ctx.fillRect(M, 55, CW, 0.8);
}

function footer(p: Page, n: number) {
  text(p.ctx, "Vital Fusion Coaching · General information, not medical advice.", M, 772, { s: 7.5, c: "#9aa1ab" });
  text(p.ctx, String(n), W - M, 772, { s: 7.5, c: "#9aa1ab", align: "right" });
}

function titleBlock(p: Page, kicker: string, title: string, sub: string): number {
  const { ctx } = p;
  text(ctx, kicker, M, 88, { w: 800, s: 8.5, c: C.blueDark, ls: 1.6 });
  text(ctx, title, M, 118, { w: 800, s: 27, c: C.ink });
  return 138 + para(ctx, sub, M, 138, CW, { s: 10.5, c: C.body, lh: 15.5 });
}

function cover(img: HTMLImageElement | null, first: string, r: MacroResults): Page {
  const p = newPage(C.coverBg);
  const { ctx } = p;
  let g = ctx.createRadialGradient(470, 95, 0, 470, 95, 300);
  g.addColorStop(0, "rgba(106,159,198,0.20)");
  g.addColorStop(1, "rgba(106,159,198,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(0, 792, 0, 0, 792, 190);
  g.addColorStop(0, "rgba(255,231,171,0.10)");
  g.addColorStop(1, "rgba(255,231,171,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  logo(ctx, img, 58, 60, 32);
  text(ctx, "VITAL FUSION COACHING", 107, 81, { w: 600, s: 11, c: "#d6dae0", ls: 2.6 });

  text(ctx, "FREE NUTRITION PLAN", 58, 304, { w: 800, s: 9, c: C.blue, ls: 2 });
  const owner = first ? `${first}'s` : "Your";
  font(ctx, 800, 44);
  text(ctx, owner, 58, 356, { w: 800, s: 44, c: "#f2f4f7" });
  text(ctx, "nutrition plan", 58, 404, { w: 800, s: 44, c: C.gold });
  para(ctx, "Your daily targets and a sample day of meals built around foods you love, portioned to your numbers.", 58, 444, 380, {
    s: 12.5,
    c: "#aab1bb",
    lh: 19,
  });

  ctx.fillStyle = "#2a2f38";
  ctx.fillRect(58, 672, W - 116, 0.8);
  const stats = [
    ["CALORIES", r.calories.toLocaleString(), "a day"],
    ["PROTEIN", `${r.protein} g`, "a day"],
    ["CARBS", `${r.carbs} g`, "a day"],
    ["FAT", `${r.fat} g`, "a day"],
  ];
  stats.forEach(([l, v, s], i) => {
    const x = 58 + i * 126;
    text(ctx, l, x, 698, { w: 800, s: 8, c: C.blue, ls: 1.2 });
    text(ctx, v, x, 721, { w: 800, s: 17, c: "#ffffff" });
    text(ctx, s, x, 738, { s: 8.5, c: "#8b929c" });
  });
  return p;
}

function numbersPage(img: HTMLImageElement | null, q: QuizInput, r: MacroResults): Page {
  const p = newPage();
  const { ctx } = p;
  header(p, img, "01 · Your numbers");
  let y = titleBlock(p, "YOUR NUMBERS", "Your daily targets", `${goalSummary(q, r)}. Your maintenance is about ${r.maintenance.toLocaleString()} calories a day.`);
  y += 14;

  // Four macro cards with a coloured top bar, like the guides' term cards.
  const cards: [string, string, string, string][] = [
    [r.calories.toLocaleString(), "Calories", "Your daily total", C.ink],
    [`${r.protein} g`, "Protein", "Keeps you full, protects muscle", C.blue],
    [`${r.carbs} g`, "Carbs", "Fuel for training and energy", C.carbs],
    [`${r.fat} g`, "Fat", "Hormones and flavour", C.fat],
  ];
  const cw = (CW - 3 * 10) / 4;
  box(ctx, M, y, CW, 104, 10, "#ffffff", C.line);
  cards.forEach(([v, l, s, col], i) => {
    const x = M + 14 + i * ((CW - 28 - 30) / 4 + 10);
    const w = (CW - 28 - 30) / 4;
    ctx.fillStyle = col;
    ctx.fillRect(x, y + 16, w, 2.5);
    text(ctx, v, x, y + 44, { w: 800, s: 19, c: C.ink });
    text(ctx, l, x, y + 62, { w: 700, s: 10, c: C.text });
    para(ctx, s, x, y + 77, w, { s: 8.5, c: C.body, lh: 11.5 });
  });
  void cw;
  y += 104 + 12;
  text(ctx, `Plus ${r.fiber}+ g of fiber a day from fruit, vegetables, beans and whole grains.`, M, y + 6, { s: 9.5, c: C.body });
  y += 22;

  // Goal date, as a dark callout with a gold label.
  if (r.weeksToGoal) {
    const date = formatDate(goalDate(r.weeksToGoal));
    box(ctx, M, y, CW, 62, 10, C.ink);
    text(ctx, "AT THIS PACE", M + 16, y + 22, { w: 800, s: 8.5, c: C.gold, ls: 1.2 });
    text(ctx, `You could reach ${q.goalWeightLb} lbs by ${date}`, M + 108, y + 23, { w: 700, s: 12.5, c: "#ffffff" });
    text(ctx, `About ${r.weeksToGoal} weeks. Progress is never a straight line, but consistency gets you there.`, M + 108, y + 41, { s: 9, c: "#aab1bb" });
    y += 62 + 14;
  }

  // Two cards of how-to.
  const half = (CW - 12) / 2;
  const left = ["Hit your protein target every day. It's the number that matters most.", "Build every meal around protein first, then add carbs, fruit and vegetables.", "Weigh in a few mornings a week and watch your weekly average."];
  const right = ["Repeat meals you like. Variety is optional.", "Swap foods for similar ones and keep the portions close.", "Track for 2 weeks to learn your portions, then keep it simple."];
  const hL = 40 + measureBullets(ctx, left, half - 32);
  const hR = 40 + measureBullets(ctx, right, half - 32);
  const hh = Math.max(hL, hR);
  [["Hitting your numbers", left, M], ["Making it easy", right, M + half + 12]].forEach(([t, items, x]) => {
    box(ctx, x as number, y, half, hh, 10, "#ffffff", C.line);
    text(ctx, t as string, (x as number) + 16, y + 26, { w: 700, s: 12, c: C.ink });
    bullets(ctx, items as string[], (x as number) + 16, y + 46, half - 32);
  });
  y += hh + 14;

  // Personal focus from what usually gets in their way.
  const tip = tipsFor(q.obstacles, q.avoid)[0];
  if (tip && y + 60 < BOTTOM) {
    const lines = wrap(ctx, tip.tip, CW - 120, 400, 9.5);
    const h = 24 + lines.length * 13.5;
    box(ctx, M, y, CW, h, 10, "#e9f1f8", "#d3e2ef");
    text(ctx, "YOUR FOCUS", M + 16, y + 21, { w: 800, s: 8.5, c: C.blueDark, ls: 1.2 });
    lines.forEach((ln, i) => text(ctx, ln, M + 100, y + 21 + i * 13.5, { s: 9.5, c: "#2b3138" }));
  }
  return p;
}

function measureBullets(ctx: Ctx, items: string[], maxW: number): number {
  return items.reduce((a, it) => a + wrap(ctx, it, maxW - 11, 400, 9.5).length * 13.5 + 4, 0);
}

type MealLayout = { h: number; whyLines: string[]; stepLines: string[][]; foodLines: string[][] };

const AMT_W = 150;

function layoutMeal(ctx: Ctx, m: SampleDay["meals"][number]): MealLayout {
  const inner = CW - 32;
  const whyLines = m.why ? wrap(ctx, m.why, inner, 400, 9.5) : [];
  const foodLines = m.items.map((it) => wrap(ctx, it.food, inner - AMT_W, 400, 9.5));
  const stepLines = m.instructions.map((s) => wrap(ctx, s, inner - 16, 400, 9));
  let h = 14 + 46 + 10; // padding + dark bar + gap
  h += whyLines.length * 13 + (whyLines.length ? 6 : 0);
  h += foodLines.reduce((a, l) => a + Math.max(1, l.length) * 13 + 9, 0);
  if (stepLines.length) h += 22 + stepLines.reduce((a, l) => a + l.length * 12.5 + 3, 0);
  return { h: h + 12, whyLines, stepLines, foodLines };
}

function drawMeal(ctx: Ctx, m: SampleDay["meals"][number], L: MealLayout, y: number) {
  box(ctx, M, y, CW, L.h, 10, "#ffffff", C.line);
  const x = M + 14;
  const w = CW - 28;
  // Dark bar: label + name on the left, macro chips on the right (like the guides' example bar).
  box(ctx, x, y + 14, w, 46, 8, C.ink);
  text(ctx, `${(LABEL[m.category] ?? m.category).toUpperCase()}${m.time ? ` · ${m.time}` : ""}`, x + 14, y + 31, { w: 800, s: 7.5, c: C.blueHi, ls: 1.1 });
  const chips = [`${m.macros.calories} cal`, `${m.macros.protein}g P`, `${m.macros.carbs}g C`, `${m.macros.fat}g F`];
  font(ctx, 600, 8.5);
  let cx = x + w - 12;
  const widths = chips.map((c) => ctx.measureText(c).width + 16);
  const chipsW = widths.reduce((a, b) => a + b + 5, -5);
  const nameMax = w - 28 - chipsW - 12;
  let name = m.name;
  font(ctx, 800, 12.5);
  while (ctx.measureText(name).width > nameMax && name.length > 4) name = name.slice(0, -2).trimEnd() + "…";
  text(ctx, name, x + 14, y + 49, { w: 800, s: 12.5, c: "#ffffff" });
  for (let i = chips.length - 1; i >= 0; i--) {
    cx -= widths[i];
    box(ctx, cx, y + 27, widths[i], 20, 10, i === 0 ? "rgba(106,159,198,0.18)" : "#1c2029", i === 0 ? C.blue : "#2c313b");
    text(ctx, chips[i], cx + widths[i] / 2, y + 40.5, { w: 600, s: 8.5, c: i === 0 ? "#d7e7f4" : "#e6e8eb", align: "center" });
    cx -= 5;
  }
  let yy = y + 14 + 46 + 18;
  L.whyLines.forEach((ln, i) => text(ctx, ln, x, yy + i * 13, { s: 9.5, c: C.body }));
  yy += L.whyLines.length * 13 + (L.whyLines.length ? 6 : 0);
  // Ingredients: amount | food, with thin separators.
  m.items.forEach((it, i) => {
    text(ctx, it.amount, x, yy, { w: 700, s: 9.5, c: C.ink });
    L.foodLines[i].forEach((ln, k) => text(ctx, ln, x + AMT_W, yy + k * 13, { s: 9.5, c: "#3d434c" }));
    const rows = Math.max(1, L.foodLines[i].length);
    yy += rows * 13 + 9;
    if (i < m.items.length - 1) {
      ctx.fillStyle = "#eceef2";
      ctx.fillRect(x, yy - 13, w, 0.7);
    }
  });
  if (L.stepLines.length) {
    yy += 6;
    text(ctx, "HOW TO MAKE IT", x, yy, { w: 800, s: 7.5, c: C.muted, ls: 1.1 });
    yy += 15;
    L.stepLines.forEach((lines, i) => {
      text(ctx, `${i + 1}`, x, yy, { w: 800, s: 9, c: C.blueDark });
      lines.forEach((ln, k) => text(ctx, ln, x + 16, yy + k * 12.5, { s: 9, c: "#3d434c" }));
      yy += lines.length * 12.5 + 3;
    });
  }
}

function dayPages(img: HTMLImageElement | null, q: QuizInput, day: SampleDay, startNum: number, applyUrl: string): Page[] {
  const pages: Page[] = [];
  const loves = [...q.likes.map((f) => f.toLowerCase()), ...(q.likesOther ? [q.likesOther] : [])].slice(0, 5);
  const sub = loves.length
    ? `Built around foods you love (${loves.join(", ")}) and portioned to hit your numbers.`
    : "Built from simple, everyday foods and portioned to hit your numbers.";
  let p = newPage();
  header(p, img, "02 · Sample day");
  let y = titleBlock(p, "SAMPLE DAY", "Your sample day", sub) + 8;

  // Day totals as small pills.
  const t = day.totals;
  const pills = [`${t.calories.toLocaleString()} calories`, `${t.protein} g protein`, `${t.carbs} g carbs`, `${t.fat} g fat`];
  font(p.ctx, 700, 9);
  let px = M;
  for (const s of pills) {
    const w = p.ctx.measureText(s).width + 20;
    box(p.ctx, px, y, w, 22, 11, C.soft, C.line);
    text(p.ctx, s, px + w / 2, y + 14.5, { w: 700, s: 9, c: C.ink, align: "center" });
    px += w + 6;
  }
  y += 22 + 14;

  for (const m of day.meals) {
    const L = layoutMeal(p.ctx, m);
    if (y + L.h > BOTTOM) {
      pages.push(p);
      p = newPage();
      header(p, img, "02 · Sample day");
      y = 76;
    }
    drawMeal(p.ctx, m, L, y);
    y += L.h + 12;
  }

  // Next step: dark callout with a gold label, clickable.
  const msg = "This is a sample. With 1:1 coaching, I build your full plan around your schedule and the foods you like, check in every week, and adjust as you go.";
  const lines = wrap(p.ctx, msg, CW - 120, 400, 10);
  const h = 44 + lines.length * 14.5 + 26;
  if (y + h > BOTTOM) {
    pages.push(p);
    p = newPage();
    header(p, img, "02 · Sample day");
    y = 76;
  }
  box(p.ctx, M, y, CW, h, 10, C.ink);
  text(p.ctx, "NEXT STEP", M + 16, y + 24, { w: 800, s: 8.5, c: C.gold, ls: 1.2 });
  text(p.ctx, "Want this done for you?", M + 100, y + 25, { w: 800, s: 13, c: "#ffffff" });
  lines.forEach((ln, i) => text(p.ctx, ln, M + 100, y + 44 + i * 14.5, { s: 10, c: "#c3c8cf" }));
  const ly = y + 44 + lines.length * 14.5 + 6;
  text(p.ctx, "Apply for 1:1 coaching at vitalfusioncoaching.com/apply →", M + 100, ly, { w: 700, s: 10, c: C.blueHi });
  p.links.push({ x: M, y, w: CW, h, url: applyUrl });
  pages.push(p);
  pages.forEach((pg, i) => footer(pg, startNum + i));
  return pages;
}

// ───────── PDF file (pages as JPEG images) ─────────

async function jpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.9));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function pagesToPdf(pages: { jpg: Uint8Array; pxW: number; pxH: number; links: Page["links"] }[]): Promise<Blob> {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === "string" ? enc.encode(b) : b;
    chunks.push(u);
    size += u.length;
  };
  const obj = (n: number, body: (Uint8Array | string)[]) => {
    offsets[n] = size;
    push(`${n} 0 obj\n`);
    body.forEach(push);
    push("\nendobj\n");
  };
  const n = pages.length;
  // 1 catalog, 2 pages, then per page: page, content, image, then link annotations.
  let next = 3;
  const ids = pages.map((pg) => {
    const page = next++;
    const content = next++;
    const image = next++;
    const links = pg.links.map(() => next++);
    return { page, content, image, links };
  });
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, [`<< /Type /Pages /Count ${n} /Kids [${ids.map((i) => `${i.page} 0 R`).join(" ")}] >>`]);
  pages.forEach((pg, i) => {
    const id = ids[i];
    const annots = id.links.length ? ` /Annots [${id.links.map((l) => `${l} 0 R`).join(" ")}]` : "";
    obj(id.page, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${id.image} 0 R >> >> /Contents ${id.content} 0 R${annots} >>`]);
    const stream = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`;
    obj(id.content, [`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`]);
    obj(id.image, [
      `<< /Type /XObject /Subtype /Image /Width ${pg.pxW} /Height ${pg.pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpg.length} >>\nstream\n`,
      pg.jpg,
      "\nendstream",
    ]);
    pg.links.forEach((l, k) => {
      const rect = [l.x, H - l.y - l.h, l.x + l.w, H - l.y].map((v) => v.toFixed(1)).join(" ");
      obj(id.links[k], [`<< /Type /Annot /Subtype /Link /Rect [${rect}] /Border [0 0 0] /A << /S /URI /URI (${l.url.replace(/[()\\]/g, "")}) >> >>`]);
    });
  });
  const xref = size;
  const total = next;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/** Builds the PDF for this person's results and sample day. */
export async function buildNutritionPdf(q: QuizInput, r: MacroResults, day: SampleDay, siteUrl: string): Promise<Blob> {
  FAM = `${getComputedStyle(document.body).fontFamily || "Inter"}, Helvetica, Arial, sans-serif`;
  try {
    await Promise.all([800, 700, 600, 400].map((w) => document.fonts.load(`${w} 12px ${FAM}`)));
  } catch {
    /* fall back to whatever font is available */
  }
  const img = await loadImage("/images/vf-logo.png");
  const first = q.name.trim().split(/\s+/)[0] ?? "";
  const applyUrl = `${siteUrl.replace(/\/$/, "")}/apply?source=nutrition-plan-pdf`;
  const pages = [cover(img, first, r), numbersPage(img, q, r), ...dayPages(img, q, day, 3, applyUrl)];
  footer(pages[1], 2);
  const out = [];
  for (const p of pages) out.push({ jpg: await jpeg(p.canvas), pxW: p.canvas.width, pxH: p.canvas.height, links: p.links });
  return pagesToPdf(out);
}

/** Builds the PDF and starts the download (or opens it on phones that don't download). */
export async function downloadNutritionPdf(q: QuizInput, r: MacroResults, day: SampleDay): Promise<void> {
  const blob = await buildNutritionPdf(q, r, day, window.location.origin);
  const first = (q.name.trim().split(/\s+/)[0] ?? "").replace(/[^A-Za-z0-9-]/g, "");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Vital-Fusion-Nutrition-Plan${first ? `-${first}` : ""}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
