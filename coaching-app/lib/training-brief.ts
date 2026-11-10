/**
 * Ties a training program to the client's onboarding answers:
 *  - trainingFacts(): the answers that matter for training, in plain words (shown to the coach and the AI)
 *  - trainingBrief(): the must-follow rules given to the AI
 *  - trainingWarnings(): checks a program against those answers (days, session length, equipment)
 * Pure functions, so the coach's builder can run the same checks live in the browser.
 */

import { formatAnswer, QUESTIONS, type Answers } from "./onboarding-questions";
import type { Training } from "./plan";

const FACTS: { id: string; label: string }[] = [
  { id: "goal", label: "Goal" },
  { id: "timeline", label: "Working toward" },
  { id: "experience", label: "Experience" },
  { id: "daysPerWeek", label: "Days a week" },
  { id: "sessionLength", label: "Session length" },
  { id: "trainWhere", label: "Trains at" },
  { id: "equipment", label: "Equipment" },
  { id: "injuries", label: "Injuries / pain" },
  { id: "exercisePrefs", label: "Loves / hates" },
  { id: "trainTime", label: "Best time" },
  { id: "steps", label: "Daily steps" },
  { id: "sleep", label: "Sleep" },
  { id: "stress", label: "Stress" },
];

export function answerText(a: Answers, id: string): string {
  const q = QUESTIONS.find((x) => x.id === id);
  return q ? formatAnswer(q, a) : "—";
}

/** The answers that shape a training program, for display. */
export function trainingFacts(a: Answers): { label: string; value: string }[] {
  return FACTS.map((f) => ({ label: f.label, value: answerText(a, f.id) })).filter((f) => f.value && f.value !== "—");
}

export function daysPerWeek(a: Answers): number | null {
  const n = parseInt(typeof a.daysPerWeek === "string" ? a.daysPerWeek : "", 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function sessionMinutes(a: Answers): number | null {
  const n = parseInt(typeof a.sessionLength === "string" ? a.sessionLength : "", 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function equipmentList(a: Answers): string[] {
  return Array.isArray(a.equipment) ? a.equipment : [];
}

function fullGym(a: Answers): boolean {
  return a.trainWhere === "Commercial gym";
}

/** The must-follow rules for the AI, built from their answers. */
export function trainingBrief(a: Answers): string {
  const days = daysPerWeek(a);
  const mins = sessionMinutes(a);
  const lines = ["TRAINING REQUIREMENTS FROM THEIR ONBOARDING ANSWERS (must follow):"];
  lines.push(`- Goal: ${answerText(a, "goal")}. Build the whole program around this goal${a.timeline && a.timeline !== "No set date" ? ` (working toward: ${answerText(a, "timeline")})` : ""}.`);
  if (days) lines.push(`- Exactly ${days} training day${days === 1 ? "" : "s"} in the program (one day object per session).`);
  if (mins) lines.push(`- Every session, including the warm-up, must fit in about ${mins} minutes. Count sets × (about 45 sec of work + the rest time).`);
  lines.push(`- Experience: ${answerText(a, "experience")}. Pick exercises, volume and technique demands that suit this level.`);
  if (fullGym(a)) {
    lines.push("- They train at a commercial gym: any standard gym equipment is fine.");
  } else {
    lines.push(
      `- They train at: ${answerText(a, "trainWhere")}. ONLY use this equipment: ${answerText(a, "equipment")}. If they have very little, use bodyweight, bands and dumbbells creatively; never prescribe equipment they don't have.`,
    );
  }
  const injuries = answerText(a, "injuries");
  if (injuries !== "—") lines.push(`- Injuries / pain: ${injuries}. Leave out movements that could aggravate this and say which swap you made in the exercise notes.`);
  const prefs = answerText(a, "exercisePrefs");
  if (prefs !== "—") lines.push(`- Exercises they love or hate: ${prefs}. Include the ones they love where sensible; avoid the ones they hate.`);
  lines.push(`- Best time to train: ${answerText(a, "trainTime")}. Daily steps: ${answerText(a, "steps")}. Sleep: ${answerText(a, "sleep")}. Stress: ${answerText(a, "stress")}. Use these for recovery advice and a realistic step or cardio suggestion in notes.`);
  return lines.join("\n");
}

// ───────── Checks ─────────

/** Rest written like "90 sec", "2 min", "60–90s" → minutes. */
export function restMinutes(rest: string): number {
  const m = /(\d+(?:\.\d+)?)/.exec(rest);
  if (!m) return 1.5;
  const n = parseFloat(m[1]);
  return /min/i.test(rest) ? n : n / 60;
}

/** Rough length of a training day in minutes (sets × (45 s work + rest), plus an 8-minute warm-up). */
export function estimateMinutes(day: Training["days"][number]): number {
  let total = 8;
  for (const e of day.exercises) {
    const sets = parseInt(e.sets, 10);
    const n = Number.isFinite(sets) && sets > 0 ? sets : 3;
    total += n * (0.75 + restMinutes(e.rest || ""));
  }
  return Math.round(total);
}

const NEEDS: { test: RegExp; items: string[]; label: string }[] = [
  { test: /barbell|\bbb\b/i, items: ["Barbell and rack"], label: "a barbell" },
  { test: /kettlebell|\bkb\b/i, items: ["Kettlebells"], label: "kettlebells" },
  { test: /cable|pulldown|pull-down|face pull|tricep pushdown|triceps pushdown/i, items: ["Cable machine", "Weight machines"], label: "a cable machine" },
  { test: /machine|leg press|smith|leg extension|leg curl|pec deck|hack squat/i, items: ["Weight machines", "Cable machine"], label: "machines" },
  { test: /pull-?up|chin-?up|hanging/i, items: ["Pull-up bar"], label: "a pull-up bar" },
  { test: /dumbbell|\bdb\b/i, items: ["Dumbbells"], label: "dumbbells" },
  { test: /treadmill|bike|rower|elliptical|stair ?master|stairmill/i, items: ["Cardio machines"], label: "a cardio machine" },
];

/** Plain-English warnings when a program doesn't match their answers. Empty = all good. */
export function trainingWarnings(t: Training, a: Answers): string[] {
  const out: string[] = [];
  const days = daysPerWeek(a);
  if (days && t.days.length !== days) {
    out.push(`The program has ${t.days.length} training day${t.days.length === 1 ? "" : "s"}, but they said ${days} days a week.`);
  }
  const mins = sessionMinutes(a);
  if (mins) {
    for (const d of t.days) {
      const est = estimateMinutes(d);
      if (est > mins * 1.2 + 5) out.push(`${d.name} looks like about ${est} minutes; they have ${mins}.`);
    }
  }
  if (!fullGym(a) && a.trainWhere) {
    const have = equipmentList(a);
    // "A mix" may include a gym, so only flag what's clearly missing for home setups.
    if (a.trainWhere !== "A mix") {
      const flagged = new Set<string>();
      for (const d of t.days) {
        for (const e of d.exercises) {
          for (const need of NEEDS) {
            if (need.test.test(e.name) && !need.items.some((i) => have.includes(i)) && !flagged.has(e.name)) {
              flagged.add(e.name);
              out.push(`${d.name}: “${e.name}” needs ${need.label}, which they didn't list.`);
              break;
            }
          }
        }
      }
    }
  }
  return out;
}

const TRAINING_NOTE = "Training: ";

/** Coach notes with the latest training checks (older training warnings replaced). */
export function withTrainingNotes(notes: string[], training: Training, a: Answers): string[] {
  const kept = notes.filter((n) => !n.startsWith(TRAINING_NOTE));
  return [...kept, ...trainingWarnings(training, a).map((w) => `${TRAINING_NOTE}${w}`)];
}
