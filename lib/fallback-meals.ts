import { site } from "../content/site";
import { mealName, type QuizInput } from "./macros";
import { avoidClashes } from "./foods";

/** The 3 favourite meals (used when there's no AI sample day), minus any with foods they avoid. */
export function safeFallbackMeals(q: Pick<QuizInput, "avoid" | "goal">) {
  return site.macroQuiz.meals.filter(
    (m) => avoidClashes([mealName(m, q.goal), "detail" in m && m.detail ? m.detail : ""], q.avoid).length === 0,
  );
}
