"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { addDays, isIsoDate, todayIn } from "@/lib/dates";
import { getPublishedPlan, hasContent } from "@/lib/plans";
import { workoutName } from "@/lib/client-days";
import { cleanExercises } from "@/lib/workout-log";
import { saveSession } from "@/lib/workouts";

export type SaveWorkoutResult = { ok: true; records: { title: string }[] } | { ok: false; error: string };

/** Saves a logged workout (any day in the last 2 weeks, or today). */
export async function saveWorkoutAction(input: { day: number; date: string; exercises: unknown }): Promise<SaveWorkoutResult> {
  const { client } = await requireClient("/train");
  const today = todayIn(client.timezone);
  if (!isIsoDate(input.date) || input.date > today || input.date < addDays(today, -14)) return { ok: false, error: "Pick a day in the last 2 weeks." };
  const plan = await getPublishedPlan(client.id);
  const days = hasContent(plan) ? (plan.content.training?.days ?? []) : [];
  const day = Number(input.day);
  if (!Number.isInteger(day) || day < 0 || day >= days.length) return { ok: false, error: "That workout isn't in your program anymore." };
  const exercises = cleanExercises(input.exercises);
  try {
    const { records } = await saveSession(client.id, { date: input.date, workout_day: day, workout_name: workoutName(days, day), exercises });
    revalidatePath("/", "layout");
    return { ok: true, records: records.map((r) => ({ title: r.title })) };
  } catch (err) {
    console.error("Workout save failed", err);
    return { ok: false, error: "Couldn't save. Check your connection and try again." };
  }
}
