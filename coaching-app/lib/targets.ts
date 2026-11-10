/**
 * Daily targets for a client's plan, from their onboarding answers. Calories and macros use the
 * same formulas as the macro quiz (lib/macros.ts), so the numbers are always consistent and easy
 * to explain. The coach can change activity level and pace, or type in his own numbers.
 */

import { ACTIVITY_LEVELS, PACES, calculate, type Activity, type Goal, type Pace } from "./macros";
import type { Answers } from "./onboarding-questions";

export type TargetInputs = {
  sex: "male" | "female";
  age: number;
  heightFt: number;
  heightIn: number;
  weightLb: number;
  goalWeightLb: number;
  activity: Activity;
  goal: Goal;
  pace: Pace | "";
};

export type Targets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  waterOz: number;
  maintenance: number;
  weeklyChangeLb: number;
  inputs: TargetInputs;
  /** True when the coach typed the numbers in himself. */
  manual: boolean;
  /** Plain-English notes, e.g. "kept at maintenance (under 18)". */
  notes: string[];
};

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

export function goalFromAnswer(goal: string): Goal {
  if (goal === "Lose fat") return "lose";
  if (goal === "Build muscle") return "muscle";
  return "maintain";
}

const LEVELS: Activity[] = ["sedentary", "light", "moderate", "very"];

/** Activity level from training days plus daily steps. */
export function activityFromAnswers(daysPerWeek: string, steps: string): Activity {
  const days = parseInt(daysPerWeek, 10) || 3;
  let i = days <= 2 ? 1 : days <= 3 ? 1 : days <= 5 ? 2 : 3;
  if (steps === "Under 4,000") i -= 1;
  if (steps === "10,000+") i += 1;
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, i))];
}

/** Daily water goal: half their body weight in ounces, rounded to a cup, between 64 and 128 oz. */
export function waterGoalOz(weightLb: number): number {
  const oz = Math.round((weightLb * 0.5) / 8) * 8;
  return Math.max(64, Math.min(128, oz));
}

/** Builds the calculator inputs from onboarding answers and the age from their signed agreement. */
export function inputsFromAnswers(a: Answers, age: number | null): { inputs: TargetInputs; missing: string[] } {
  const missing: string[] = [];
  const sex = str(a.sex) === "Female" ? "female" : "male";
  if (!str(a.sex)) missing.push("sex");
  const [ft, inch] = str(a.height).split(",").map((x) => Number(x));
  if (!Number.isFinite(ft) || !ft) missing.push("height");
  const weightLb = Number(str(a.weight));
  if (!Number.isFinite(weightLb) || weightLb <= 0) missing.push("weight");
  if (age === null) missing.push("age");
  const goal = goalFromAnswer(str(a.goal));
  const goalWeightRaw = Number(str(a.goalWeight));
  const goalWeightLb = Number.isFinite(goalWeightRaw) && goalWeightRaw > 0 ? goalWeightRaw : weightLb;
  return {
    inputs: {
      sex,
      age: age ?? 30,
      heightFt: Number.isFinite(ft) && ft ? ft : 5,
      heightIn: Number.isFinite(inch) ? inch : 0,
      weightLb: Number.isFinite(weightLb) && weightLb > 0 ? weightLb : 170,
      goalWeightLb,
      activity: activityFromAnswers(str(a.daysPerWeek), str(a.steps)),
      goal,
      pace: goal === "lose" ? "balanced" : "",
    },
    missing,
  };
}

export function computeTargets(inputs: TargetInputs): Targets {
  const r = calculate(inputs);
  const notes: string[] = [];
  if (r.minorAtMaintenance) notes.push("Under 18, so fat loss is kept at maintenance calories.");
  if (r.floorApplied) notes.push("Raised to the minimum safe calorie floor.");
  return {
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    fiber: r.fiber,
    waterOz: waterGoalOz(inputs.weightLb),
    maintenance: r.maintenance,
    weeklyChangeLb: r.weeklyChangeLb,
    inputs,
    manual: false,
    notes,
  };
}

export function activityLabel(a: string): string {
  const l = ACTIVITY_LEVELS.find((x) => x.value === a);
  return l ? `${l.label} (${l.detail.toLowerCase()})` : a;
}

export function paceLabel(p: string): string {
  return PACES.find((x) => x.value === p)?.label ?? "—";
}

export function isActivity(v: string): v is Activity {
  return ACTIVITY_LEVELS.some((a) => a.value === v);
}

export function isPace(v: string): v is Pace {
  return PACES.some((p) => p.value === v);
}

/** One line summary, e.g. "1,850 kcal · 160P · 180C · 55F". */
export function targetLine(t: Pick<Targets, "calories" | "protein" | "carbs" | "fat">): string {
  return `${t.calories.toLocaleString("en-US")} kcal · ${t.protein}P · ${t.carbs}C · ${t.fat}F`;
}
