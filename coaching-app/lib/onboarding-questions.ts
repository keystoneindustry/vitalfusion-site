/**
 * The onboarding questions, shown one per screen. Everything Tyler needs to build a custom
 * nutrition plan and training program. Answers are saved as the client goes.
 */

export type Answers = Record<string, string | string[]>;

export type Question = {
  id: string;
  section: string;
  prompt: string;
  help?: string;
  kind: "choice" | "multi" | "text" | "longtext" | "number" | "height" | "time";
  options?: string[];
  /** Adds an "Other" option with a text box (choice and multi). */
  other?: boolean;
  unit?: string;
  min?: number;
  max?: number;
  optional?: boolean;
  placeholder?: string;
  showIf?: (a: Answers) => boolean;
};

const OTHER = "Other";
const LOSE_OR_GAIN = (a: Answers) => a.goal === "Lose fat" || a.goal === "Build muscle";

export const QUESTIONS: Question[] = [
  // Goals & basics
  { id: "goal", section: "Your goal", kind: "choice", prompt: "What's your main goal?", options: ["Lose fat", "Build muscle", "Maintain my weight and get fitter", "Improve my health and energy"], other: true },
  { id: "why", section: "Your goal", kind: "longtext", prompt: "Why does this goal matter to you right now?", help: "This is your “why”. It shows at the top of your app every day, so be honest. It's what we'll come back to on hard days.", placeholder: "e.g. I want to feel confident at my sister's wedding in June" },
  { id: "sex", section: "About you", kind: "choice", prompt: "What's your sex?", help: "Used for your calorie and macro numbers.", options: ["Male", "Female"] },
  { id: "height", section: "About you", kind: "height", prompt: "How tall are you?" },
  { id: "weight", section: "About you", kind: "number", prompt: "What do you weigh right now?", unit: "lb", min: 70, max: 700 },
  { id: "goalWeight", section: "About you", kind: "number", prompt: "What weight would you like to reach?", unit: "lb", min: 70, max: 700, optional: true, help: "Skip it if you're not sure.", showIf: LOSE_OR_GAIN },
  { id: "timeline", section: "About you", kind: "choice", prompt: "Is there a date you're working toward?", options: ["No set date", "Within 3 months", "3–6 months", "6–12 months"], other: true, help: "Like a wedding, vacation or event. Pick “Other” to tell me." },

  // Training
  { id: "experience", section: "Training", kind: "choice", prompt: "How much strength training have you done?", options: ["New to it", "Some (under 1 year)", "1–3 years", "3+ years"] },
  { id: "daysPerWeek", section: "Training", kind: "choice", prompt: "How many days a week can you realistically train?", options: ["2", "3", "4", "5", "6"] },
  { id: "sessionLength", section: "Training", kind: "choice", prompt: "How long can each workout be?", options: ["30 minutes", "45 minutes", "60 minutes", "75+ minutes"] },
  { id: "trainWhere", section: "Training", kind: "choice", prompt: "Where will you train?", options: ["Commercial gym", "Home gym", "At home with little equipment", "A mix"] },
  { id: "equipment", section: "Training", kind: "multi", prompt: "What equipment do you have access to?", help: "Pick all that apply.", options: ["Barbell and rack", "Dumbbells", "Cable machine", "Weight machines", "Kettlebells", "Resistance bands", "Pull-up bar", "Bench", "Cardio machines", "Just bodyweight"], other: true },
  { id: "injuries", section: "Training", kind: "longtext", prompt: "Any injuries, pain, or movements you need to avoid?", optional: true, placeholder: "e.g. my left knee hurts on deep squats" },
  { id: "exercisePrefs", section: "Training", kind: "longtext", prompt: "Any exercises you love or hate?", optional: true },

  // Schedule
  { id: "wakeTime", section: "Your schedule", kind: "time", prompt: "What time do you usually wake up?" },
  { id: "bedTime", section: "Your schedule", kind: "time", prompt: "What time do you usually go to bed?" },
  { id: "trainTime", section: "Your schedule", kind: "choice", prompt: "When is the best time for you to train?", options: ["Early morning", "Late morning", "Midday", "Afternoon", "Evening", "It changes day to day"] },
  { id: "photoDay", section: "Your schedule", kind: "choice", prompt: "Which day works best for your weekly check-in and progress photos?", help: "You'll be assigned your check-in day based on this. It takes about 10 minutes, first thing in the morning, so pick a day you're usually home.", options: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] },
  { id: "workDay", section: "Your schedule", kind: "longtext", prompt: "What does a typical weekday look like?", help: "Work hours, commute, kids, anything that shapes your day.", placeholder: "e.g. desk job 8–5, gym after work, kids' practice Tue/Thu" },

  // Food
  { id: "foodsLove", section: "Food", kind: "longtext", prompt: "What foods do you love and eat often?", help: "Your plan will be built around these.", placeholder: "e.g. chicken, rice, eggs, Greek yogurt, pasta, tacos" },
  { id: "foodsAvoid", section: "Food", kind: "longtext", prompt: "Any foods you won't eat?", optional: true },
  { id: "allergies", section: "Food", kind: "multi", prompt: "Any allergies or intolerances?", options: ["None", "Dairy", "Gluten", "Nuts", "Shellfish", "Eggs", "Soy"], other: true },
  { id: "dietStyle", section: "Food", kind: "choice", prompt: "Do you follow a particular way of eating?", options: ["No", "Vegetarian", "Vegan", "Pescatarian", "Low-carb or keto", "Halal", "Kosher"], other: true },
  { id: "mealsPerDay", section: "Food", kind: "choice", prompt: "How many meals do you usually eat a day?", options: ["1–2", "3", "4", "5+"] },
  { id: "cookingTime", section: "Food", kind: "choice", prompt: "How much time can you spend cooking a meal?", options: ["Under 15 minutes", "15–30 minutes", "30–60 minutes", "I love to cook"] },
  { id: "cookingSkill", section: "Food", kind: "choice", prompt: "How comfortable are you in the kitchen?", options: ["Beginner", "I can follow a recipe", "Confident cook"] },
  { id: "budget", section: "Food", kind: "choice", prompt: "What's your grocery budget like?", options: ["Tight", "Moderate", "Flexible"] },
  { id: "eatingOut", section: "Food", kind: "choice", prompt: "How often do you eat out or order in?", options: ["Rarely", "1–2 times a week", "3–5 times a week", "Most days"] },
  { id: "trackingHistory", section: "Food", kind: "choice", prompt: "Have you tracked calories before?", options: ["Never", "In the past", "I track now"] },

  // Lifestyle
  { id: "steps", section: "Lifestyle", kind: "choice", prompt: "About how many steps do you get a day?", help: "Your phone's Health app shows this.", options: ["Under 4,000", "4,000–7,000", "7,000–10,000", "10,000+", "Not sure"] },
  { id: "sleep", section: "Lifestyle", kind: "choice", prompt: "How much sleep do you usually get?", options: ["Under 6 hours", "6–7 hours", "7–8 hours", "8+ hours"] },
  { id: "stress", section: "Lifestyle", kind: "choice", prompt: "How stressful is life right now?", options: ["Low", "Moderate", "High", "Very high"] },
  { id: "alcohol", section: "Lifestyle", kind: "choice", prompt: "How many alcoholic drinks do you have in a typical week?", options: ["None", "1–3", "4–7", "8+"] },
  { id: "water", section: "Lifestyle", kind: "choice", prompt: "How much water do you drink a day?", options: ["Under 32 oz", "32–64 oz", "64–100 oz", "100+ oz"] },

  // History
  { id: "howLong", section: "Your history", kind: "choice", prompt: "How long have you been trying to reach this goal?", options: ["Under 6 months", "6–12 months", "1–3 years", "3+ years"] },
  { id: "obstacles", section: "Your history", kind: "multi", prompt: "What usually gets in the way?", help: "Pick all that apply.", options: ["Staying consistent", "Weekends and social events", "Cravings and snacking", "Not knowing what to eat", "Not eating enough protein", "Busy schedule", "Not knowing what to do in the gym", "No accountability"], other: true },
  { id: "triedBefore", section: "Your history", kind: "longtext", prompt: "What have you tried before, and what happened?", optional: true },
  { id: "anythingElse", section: "Your history", kind: "longtext", prompt: "Anything else you want Tyler to know?", optional: true },
];

export function otherKey(id: string): string {
  return `${id}__other`;
}

/** Questions that apply given the answers so far. */
export function visibleQuestions(a: Answers): Question[] {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(a));
}

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function list(v: string | string[] | undefined): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}

/** Returns an error message, or null when the answer is fine. */
export function checkAnswer(q: Question, a: Answers): string | null {
  const v = a[q.id];
  const other = str(a[otherKey(q.id)]);
  switch (q.kind) {
    case "choice": {
      const s = str(v);
      if (!s) return q.optional ? null : "Pick one.";
      if (s === OTHER) return other ? null : "Tell us what “Other” is.";
      return q.options?.includes(s) ? null : "Pick one of the options.";
    }
    case "multi": {
      const l = list(v);
      if (l.length === 0) return q.optional ? null : "Pick at least one.";
      if (l.includes(OTHER) && !other) return "Tell us what “Other” is.";
      return l.every((x) => x === OTHER || q.options?.includes(x)) ? null : "Pick from the options.";
    }
    case "text":
    case "longtext": {
      const s = str(v);
      if (!s) return q.optional ? null : "Please answer this one.";
      return s.length > 2000 ? "That's a bit long. Keep it under 2,000 characters." : null;
    }
    case "number": {
      const s = str(v);
      if (!s) return q.optional ? null : "Enter a number.";
      const n = Number(s);
      if (!Number.isFinite(n)) return "Enter a number.";
      if ((q.min !== undefined && n < q.min) || (q.max !== undefined && n > q.max)) return "That number looks off. Double-check it.";
      return null;
    }
    case "height": {
      const [ft, inch] = str(v).split(",").map((x) => Number(x));
      if (!str(v)) return q.optional ? null : "Enter your height.";
      if (!Number.isInteger(ft) || ft < 3 || ft > 8 || !Number.isFinite(inch) || inch < 0 || inch >= 12)
        return "Enter feet (3–8) and inches (0–11).";
      return null;
    }
    case "time": {
      const s = str(v);
      if (!s) return q.optional ? null : "Pick a time.";
      return /^\d{2}:\d{2}$/.test(s) ? null : "Pick a time.";
    }
  }
}

/** All visible questions answered correctly? Returns the first problem, if any. */
export function firstProblem(a: Answers): { index: number; message: string } | null {
  const qs = visibleQuestions(a);
  for (let i = 0; i < qs.length; i++) {
    const m = checkAnswer(qs[i], a);
    if (m) return { index: i, message: m };
  }
  return null;
}

/** Keeps only known keys with sensible types, so stored answers stay clean. */
export function sanitizeAnswers(input: unknown): Answers {
  const out: Answers = {};
  if (!input || typeof input !== "object") return out;
  const src = input as Record<string, unknown>;
  for (const q of QUESTIONS) {
    for (const key of [q.id, otherKey(q.id)]) {
      const v = src[key];
      if (typeof v === "string") out[key] = v.slice(0, 2000);
      else if (Array.isArray(v)) out[key] = v.filter((x): x is string => typeof x === "string").slice(0, 30);
    }
  }
  return out;
}

function to12h(t: string): string {
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return t;
  const suffix = h >= 12 ? "p.m." : "a.m.";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Human-readable answer for the coach. */
export function formatAnswer(q: Question, a: Answers): string {
  const v = a[q.id];
  const other = str(a[otherKey(q.id)]);
  switch (q.kind) {
    case "choice": {
      const s = str(v);
      return s === OTHER ? `Other: ${other}` : s || "—";
    }
    case "multi": {
      const l = list(v).map((x) => (x === OTHER ? `Other: ${other}` : x));
      return l.length ? l.join(", ") : "—";
    }
    case "height": {
      const [ft, inch] = str(v).split(",");
      return ft ? `${ft}′${inch || 0}″` : "—";
    }
    case "number":
      return str(v) ? `${str(v)}${q.unit ? ` ${q.unit}` : ""}` : "—";
    case "time":
      return str(v) ? to12h(str(v)) : "—";
    default:
      return str(v) || "—";
  }
}

/** Answers grouped by section, in question order. */
export function summarize(a: Answers): { section: string; items: { prompt: string; answer: string }[] }[] {
  const out: { section: string; items: { prompt: string; answer: string }[] }[] = [];
  for (const q of visibleQuestions(a)) {
    let group = out.find((g) => g.section === q.section);
    if (!group) {
      group = { section: q.section, items: [] };
      out.push(group);
    }
    group.items.push({ prompt: q.prompt, answer: formatAnswer(q, a) });
  }
  return out;
}

export const OTHER_OPTION = OTHER;
