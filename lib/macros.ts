// Macro quiz: the questions' answer options, input validation, and the
// calorie/macro math. Pure functions only, so the browser (instant results)
// and the server (emails + Google Sheet) compute exactly the same numbers.

export const SEXES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Mostly sitting", detail: "Desk job, little to no exercise", factor: 1.2 },
  { value: "light", label: "Lightly active", detail: "1–3 workouts a week", factor: 1.375 },
  { value: "moderate", label: "Active", detail: "3–5 workouts a week", factor: 1.55 },
  { value: "very", label: "Very active", detail: "6–7 hard workouts a week or a physical job", factor: 1.725 },
] as const;

export const GOALS = [
  { value: "lose", label: "Lose fat" },
  { value: "muscle", label: "Build muscle" },
  { value: "maintain", label: "Maintain my weight" },
] as const;

/** How hard to diet. `deficit` is the share of maintenance calories cut. */
export const PACES = [
  { value: "steady", label: "Steady & sustainable", detail: "About 0.5 lb a week. Easiest to stick to, and you keep the most energy.", deficit: 0.12, badge: "" },
  { value: "balanced", label: "Balanced", detail: "About 1 lb a week. Noticeable progress without feeling deprived.", deficit: 0.2, badge: "Most popular" },
  { value: "aggressive", label: "Aggressive", detail: "About 1.5 lb or more a week. Fastest results, but takes the most discipline.", deficit: 0.25, badge: "" },
] as const;

export const TRYING_FOR = [
  { value: "lt6m", label: "Less than 6 months", phrase: "" },
  { value: "6to12m", label: "6–12 months", phrase: "6–12 months" },
  { value: "1to3y", label: "1–3 years", phrase: "1–3 years" },
  { value: "3yplus", label: "3+ years", phrase: "more than 3 years" },
] as const;

export const OBSTACLES = [
  {
    value: "consistency",
    label: "Staying consistent",
    phrase: "staying consistent",
    tip: "Aim for 80%, not perfect. Hitting your protein and calories most days beats a perfect week followed by quitting.",
  },
  {
    value: "weekends",
    label: "Weekends & social events",
    phrase: "weekends",
    tip: "Plan your weekends ahead: keep earlier meals high-protein and simple so you have room for the dinner or drinks you actually care about.",
  },
  {
    value: "cravings",
    label: "Cravings & snacking",
    phrase: "cravings",
    tip: "Most cravings come from too little protein and fiber. Hit your protein target and add a fruit or vegetable to every meal.",
  },
  {
    value: "food",
    label: "Not knowing what to eat",
    phrase: "knowing what to eat",
    tip: "Build every meal the same way: a palm-size protein, a fist-size carb, and a big handful of fruit or vegetables. Start with the 3 meals below.",
  },
  {
    value: "busy",
    label: "Busy schedule",
    phrase: "a busy schedule",
    tip: "Cook protein in bulk twice a week (chicken, ground beef, salmon) so a good meal is 5 minutes away, not 45.",
  },
  {
    value: "accountability",
    label: "No accountability",
    phrase: "staying accountable",
    tip: "Weigh in at least 3 mornings a week and watch your weekly average, not single days. Seeing the trend keeps you honest.",
  },
] as const;

export type Sex = (typeof SEXES)[number]["value"];
export type Activity = (typeof ACTIVITY_LEVELS)[number]["value"];
export type Goal = (typeof GOALS)[number]["value"];
export type Pace = (typeof PACES)[number]["value"];
export type TryingFor = (typeof TRYING_FOR)[number]["value"];
export type Obstacle = (typeof OBSTACLES)[number]["value"];

export interface QuizInput {
  sex: Sex;
  age: number;
  heightFt: number;
  heightIn: number;
  weightLb: number;
  goalWeightLb: number;
  activity: Activity;
  goal: Goal;
  pace: Pace | ""; // only for "lose"
  tryingFor: TryingFor;
  obstacles: Obstacle[];
  name: string;
  email: string;
  source: string;
}

export type QuizErrors = Partial<Record<keyof QuizInput, string>>;

// Rules agreed with the coach.
export const RULES = {
  proteinPerLb: 0.8,
  proteinMax: 180,
  fatPerLb: 0.35,
  fatMax: 80,
  fatMaxHeavier: 100, // only allowed if carbs stay at or above carbMin
  carbMin: 100,
  fatFloorPerLb: 0.25, // how low fat may go to protect the carb minimum
  fatFloorMin: 40,
  fiberPer1000: 14,
  calorieFloor: { male: 1500, female: 1200 },
  maxDailyDeficit: 1000,
  minAge: 13,
  adultAge: 18,
};

const lbToKg = (lb: number) => lb * 0.45359237;
const inToCm = (inches: number) => inches * 2.54;
const round10 = (n: number) => Math.round(n / 10) * 10;

export interface MacroResults {
  bmr: number;
  maintenance: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Weekly change in lb implied by the calorie target (negative = loss). */
  weeklyChangeLb: number;
  /** Weeks to reach goal weight; null when not applicable. */
  weeksToGoal: number | null;
  /** True when someone under 18 asked for fat loss and was kept at maintenance. */
  minorAtMaintenance: boolean;
  /** True when the calorie floor raised the target. */
  floorApplied: boolean;
  bmi: number;
}

export function calculate(q: Pick<QuizInput, "sex" | "age" | "heightFt" | "heightIn" | "weightLb" | "goalWeightLb" | "activity" | "goal" | "pace">): MacroResults {
  const kg = lbToKg(q.weightLb);
  const cm = inToCm(q.heightFt * 12 + q.heightIn);
  const bmr = 10 * kg + 6.25 * cm - 5 * q.age + (q.sex === "male" ? 5 : -161);
  const factor = ACTIVITY_LEVELS.find((a) => a.value === q.activity)?.factor ?? 1.2;
  const maintenance = round10(bmr * factor);
  const heightM = cm / 100;
  const bmi = kg / (heightM * heightM);

  const isMinor = q.age < RULES.adultAge;
  const wantsLoss = q.goal === "lose";
  const minorAtMaintenance = isMinor && wantsLoss;

  let calories = maintenance;
  let floorApplied = false;
  if (wantsLoss && !isMinor) {
    const pct = PACES.find((p) => p.value === q.pace)?.deficit ?? PACES[1].deficit;
    const deficit = Math.min(maintenance * pct, RULES.maxDailyDeficit);
    calories = round10(maintenance - deficit);
    const floor = RULES.calorieFloor[q.sex];
    if (calories < floor) {
      // Never prescribe below the floor, and never above maintenance.
      calories = Math.min(floor, maintenance);
      floorApplied = true;
    }
  }

  // People with obesity who want fat loss: base protein & fat on goal weight
  // (a standard "adjusted weight" approach) so the numbers stay realistic.
  const useGoalWeight = wantsLoss && bmi >= 30 && q.goalWeightLb > 0 && q.goalWeightLb < q.weightLb;
  const baseLb = useGoalWeight ? q.goalWeightLb : q.weightLb;

  const protein = Math.min(Math.round(baseLb * RULES.proteinPerLb), RULES.proteinMax);
  const carbsFor = (p: number, f: number) => Math.floor((calories - p * 4 - f * 9) / 4);

  const fatIdeal = baseLb * RULES.fatPerLb;
  let fat = Math.round(Math.min(fatIdeal, RULES.fatMax));
  // Heavier people may go up to 100 g of fat, but only if carbs stay ≥ the minimum.
  if (fatIdeal > RULES.fatMax) {
    const heavier = Math.round(Math.min(fatIdeal, RULES.fatMaxHeavier));
    if (carbsFor(protein, heavier) >= RULES.carbMin) fat = heavier;
  }
  // Protect the carb minimum by lowering fat (down to a healthy floor).
  if (carbsFor(protein, fat) < RULES.carbMin) {
    const fatFloor = Math.max(RULES.fatFloorMin, Math.round(baseLb * RULES.fatFloorPerLb));
    const fatForMinCarbs = Math.floor((calories - protein * 4 - RULES.carbMin * 4) / 9);
    fat = Math.max(fatFloor, Math.min(fat, fatForMinCarbs));
  }
  const carbs = Math.max(0, carbsFor(protein, fat));
  const fiber = Math.round((calories / 1000) * RULES.fiberPer1000);

  const weeklyChangeLb = ((calories - maintenance) * 7) / 3500;
  let weeksToGoal: number | null = null;
  if (wantsLoss && !isMinor && weeklyChangeLb < 0 && q.goalWeightLb < q.weightLb) {
    weeksToGoal = Math.ceil((q.weightLb - q.goalWeightLb) / -weeklyChangeLb);
  }

  return {
    bmr: Math.round(bmr),
    maintenance,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    weeklyChangeLb: Math.round(weeklyChangeLb * 10) / 10,
    weeksToGoal,
    minorAtMaintenance,
    floorApplied,
    bmi: Math.round(bmi * 10) / 10,
  };
}

/** Date they could reach their goal weight, from today. */
export function goalDate(weeks: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
}

/** Hot / Warm / Cold, for sorting leads in the Google Sheet. */
export function leadRating(q: Pick<QuizInput, "tryingFor" | "obstacles">): "Hot" | "Warm" | "Cold" {
  const longTime = q.tryingFor === "1to3y" || q.tryingFor === "3yplus";
  if (longTime && q.obstacles.length >= 2) return "Hot";
  if (q.tryingFor === "lt6m") return "Cold";
  return "Warm";
}

function joinPhrases(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** The gentle "reality" paragraph, written from their own answers. */
export function realityMessage(q: Pick<QuizInput, "tryingFor" | "obstacles">): string {
  const phrases = OBSTACLES.filter((o) => q.obstacles.includes(o.value)).map((o) => o.phrase);
  const obstacleText = phrases.length ? joinPhrases(phrases.slice(0, 3)) : "";
  const time = TRYING_FOR.find((t) => t.value === q.tryingFor)?.phrase ?? "";

  const struggle = phrases.length > 1 ? "your biggest struggles are" : "your biggest struggle is";
  const opener =
    time && obstacleText
      ? `You've been working toward this for ${time}, and you said ${struggle} ${obstacleText}.`
      : time
        ? `You've been working toward this for ${time}.`
        : obstacleText
          ? `You're early in this, and you said ${struggle} ${obstacleText}.`
          : "You're early in this, which is the best time to build the right habits.";

  return `${opener} Here's the honest truth: these numbers were never the hard part. Hitting them on a busy Tuesday, after a weekend out, or when motivation is gone — that's where most plans fall apart.`;
}

/** Tips for the obstacles they picked (max 2). */
export function tipsFor(obstacles: Obstacle[]): { label: string; tip: string }[] {
  return OBSTACLES.filter((o) => obstacles.includes(o.value))
    .slice(0, 2)
    .map((o) => ({ label: o.label, tip: o.tip }));
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : NaN;
}

/** Validates untrusted input. `partial` limits checks to the given fields (for per-step checks). */
export function validateQuiz(
  input: unknown,
  only?: (keyof QuizInput)[],
): { ok: true; data: QuizInput } | { ok: false; errors: QuizErrors } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const errors: QuizErrors = {};
  const check = (k: keyof QuizInput) => !only || only.includes(k);

  const sex = str(raw.sex) as Sex;
  if (check("sex") && !SEXES.some((s) => s.value === sex)) errors.sex = "Please choose one.";

  const age = Math.round(num(raw.age));
  if (check("age")) {
    if (!Number.isFinite(age)) errors.age = "Please enter your age.";
    else if (age < RULES.minAge) errors.age = `This calculator is for ages ${RULES.minAge} and up.`;
    else if (age > 100) errors.age = "Please enter a valid age.";
  }

  const heightFt = Math.round(num(raw.heightFt));
  const heightIn = num(raw.heightIn);
  const hIn = Number.isFinite(heightIn) ? heightIn : 0;
  if (check("heightFt")) {
    const total = heightFt * 12 + hIn;
    if (!Number.isFinite(heightFt) || heightFt < 4 || heightFt > 7 || hIn < 0 || hIn >= 12 || total < 48 || total > 90)
      errors.heightFt = "Please enter your height in feet and inches.";
  }

  const weightLb = num(raw.weightLb);
  if (check("weightLb") && (!Number.isFinite(weightLb) || weightLb < 80 || weightLb > 700))
    errors.weightLb = "Please enter your weight in pounds.";

  const goalWeightLb = num(raw.goalWeightLb);
  if (check("goalWeightLb") && (!Number.isFinite(goalWeightLb) || goalWeightLb < 80 || goalWeightLb > 700))
    errors.goalWeightLb = "Please enter your goal weight in pounds.";

  const activity = str(raw.activity) as Activity;
  if (check("activity") && !ACTIVITY_LEVELS.some((a) => a.value === activity)) errors.activity = "Please choose one.";

  const goal = str(raw.goal) as Goal;
  if (check("goal") && !GOALS.some((g) => g.value === goal)) errors.goal = "Please choose one.";

  let pace = str(raw.pace) as Pace | "";
  if (goal !== "lose") pace = "";
  else if (check("pace") && !PACES.some((p) => p.value === pace)) errors.pace = "Please choose one.";

  const tryingFor = str(raw.tryingFor) as TryingFor;
  if (check("tryingFor") && !TRYING_FOR.some((t) => t.value === tryingFor)) errors.tryingFor = "Please choose one.";

  const obstacles = (Array.isArray(raw.obstacles) ? [...new Set(raw.obstacles.map(str))] : []).filter((o) =>
    OBSTACLES.some((x) => x.value === o),
  ) as Obstacle[];
  if (check("obstacles") && obstacles.length === 0) errors.obstacles = "Pick at least one.";

  const name = str(raw.name);
  if (check("name") && (name.length < 2 || name.length > 120)) errors.name = "Please enter your name.";

  const email = str(raw.email).toLowerCase();
  if (check("email") && (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254))
    errors.email = "Please enter a valid email address.";

  const source = str(raw.source).slice(0, 60) || "Macro Quiz";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      sex,
      age,
      heightFt,
      heightIn: hIn,
      weightLb: Math.round(weightLb * 10) / 10,
      goalWeightLb: Math.round(goalWeightLb * 10) / 10,
      activity,
      goal,
      pace,
      tryingFor,
      obstacles,
      name,
      email,
      source,
    },
  };
}

/** Maps an exact age onto the application's age-range buttons. */
export function ageRangeFor(age: number): string {
  if (age >= 30) return "30+";
  if (age >= 26) return "26-29";
  if (age >= 22) return "22-25";
  if (age >= 16) return "16-21";
  return "";
}

export function labelOf<T extends { value: string; label: string }>(list: readonly T[], v: string): string {
  return list.find((x) => x.value === v)?.label ?? v;
}
