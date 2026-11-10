/**
 * Tiny PDF writer for text documents (no extra npm packages). Letter-size pages, Helvetica,
 * automatic word wrapping and page breaks. Good enough for signed agreements.
 */

export type PdfBlock =
  | { kind: "title"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string; bold?: boolean; size?: number; gap?: number }
  | { kind: "pair"; label: string; value: string }
  | { kind: "rule" }
  | { kind: "space"; size?: number };

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** PDF fonts here only cover basic Latin, so swap curly quotes, dashes and the like for plain ones. */
export function toPdfText(s: string): string {
  return s
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/•/g, "*")
    .replace(/ /g, " ")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "");
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Rough Helvetica width per character (in 1/1000 em), erring on the wide side so text never overflows. */
function charWidth(ch: string, bold: boolean): number {
  if (" ".includes(ch)) return 278;
  if ("iljI.,;:'!|".includes(ch)) return bold ? 300 : 260;
  if ("ftr()-[]/".includes(ch)) return bold ? 360 : 340;
  if ("mwMW".includes(ch)) return bold ? 900 : 860;
  if (ch >= "A" && ch <= "Z") return bold ? 740 : 700;
  if (ch >= "0" && ch <= "9") return 556;
  return bold ? 620 : 570;
}

export function textWidth(s: string, size: number, bold = false): number {
  let w = 0;
  for (const ch of s) w += charWidth(ch, bold);
  return (w / 1000) * size;
}

export function wrap(text: string, size: number, maxWidth: number, bold = false): string[] {
  const words = toPdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size, bold) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

type Op = string;

/** Builds the PDF and returns its bytes. `footer` is printed at the bottom of every page with the page number. */
export function buildPdf(blocks: PdfBlock[], footer = ""): Uint8Array {
  const pages: Op[][] = [];
  let ops: Op[] = [];
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    ops = [];
    pages.push(ops);
    y = PAGE_H - MARGIN;
  };
  newPage();

  const ensure = (height: number) => {
    if (y - height < MARGIN + 24) newPage();
  };

  const line = (text: string, size: number, bold: boolean, x = MARGIN) => {
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc(text)}) Tj ET`);
  };

  for (const b of blocks) {
    if (b.kind === "space") {
      y -= b.size ?? 10;
      continue;
    }
    if (b.kind === "rule") {
      ensure(12);
      y -= 4;
      ops.push(`0.6 w ${MARGIN} ${y.toFixed(2)} m ${PAGE_W - MARGIN} ${y.toFixed(2)} l S`);
      y -= 20;
      continue;
    }
    if (b.kind === "pair") {
      const size = 10;
      const label = toPdfText(`${b.label}: `);
      const labelW = textWidth(label, size, true);
      const valueLines = wrap(b.value || "-", size, CONTENT_W - labelW);
      ensure(valueLines.length * 14);
      line(label, size, true);
      valueLines.forEach((v, i) => {
        if (i > 0) y -= 14;
        line(v, size, false, MARGIN + labelW);
      });
      y -= 16;
      continue;
    }
    const size = b.kind === "title" ? 15 : b.kind === "heading" ? 12 : b.size ?? 10;
    const bold = b.kind !== "text" || Boolean(b.bold);
    const leading = size * 1.4;
    const lines = wrap(b.text, size, CONTENT_W, bold);
    if (b.kind === "heading") ensure(leading * Math.min(lines.length, 1) + 40);
    for (const l of lines) {
      ensure(leading);
      line(l, size, bold);
      y -= leading;
    }
    y -= b.kind === "text" ? b.gap ?? 6 : 6;
  }

  // Assemble objects: 1 catalog, 2 pages, 3 Helvetica, 4 Helvetica-Bold, then (content, page) pairs.
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  const pageRefs: string[] = [];
  pages.forEach((pageOps, i) => {
    const contentNum = 5 + i * 2;
    const pageNum = contentNum + 1;
    const footerText = toPdfText(`${footer}${footer ? "  |  " : ""}Page ${i + 1} of ${pages.length}`);
    const footerOp = `BT /F1 8 Tf ${MARGIN} 30 Td (${esc(footerText)}) Tj ET`;
    const stream = [...pageOps, footerOp].join("\n");
    objects[contentNum] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
    objects[pageNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`;
    pageRefs.push(`${pageNum} 0 R`);
  });
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pages.length} >>`;

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let n = 1; n < objects.length; n++) {
    offsets[n] = Buffer.byteLength(out, "latin1");
    out += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xrefAt = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let n = 1; n < objects.length; n++) out += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, "latin1"));
}
