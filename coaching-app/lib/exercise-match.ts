/** Matches an exercise written in a program ("Dumbbell box step-up (low box)") to the library ("Step-up"). Pure. */

const STOP = new Set(["the", "a", "an", "or", "and", "with", "on", "of", "to"]);

export function normalizeExercise(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(name: string): string[] {
  return normalizeExercise(name)
    .split(" ")
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t));
}

/**
 * Exact name first; otherwise the library item whose words all appear in the program's exercise name,
 * preferring the most specific (most words). Null when nothing fits.
 */
export function matchExercise<T extends { name: string }>(name: string, library: T[]): T | null {
  const norm = normalizeExercise(name);
  const exact = library.find((x) => normalizeExercise(x.name) === norm);
  if (exact) return exact;
  const words = new Set(tokens(name));
  let best: T | null = null;
  let bestLen = 0;
  for (const x of library) {
    const t = tokens(x.name);
    if (t.length === 0 || !t.every((w) => words.has(w))) continue;
    if (t.length > bestLen) {
      best = x;
      bestLen = t.length;
    }
  }
  return best;
}
