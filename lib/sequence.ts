// Content for the macro-quiz follow-up emails (Resend Automation).
// The website builds these personalized pieces when someone finishes the quiz
// and sends them with the "macro_quiz.completed" event; Resend fills them into
// the day 2 / day 4 templates. Edit wording here.

import { formatDate, goalDate, GOALS, labelOf, leadRating, OBSTACLES, TRYING_FOR, type MacroResults, type Obstacle, type QuizInput } from "./macros";
import { fillFoods } from "./foods";

/** Three practical steps per obstacle (day 2 email). */
export const OBSTACLE_STEPS: Record<Obstacle, string[]> = {
  consistency: [
    "Pick 2 non-negotiables (hit your protein, and 3 workouts a week). Everything else is a bonus.",
    "Plan tomorrow's meals tonight. In-the-moment decisions are where consistency breaks.",
    "Missed a day? Your next meal is the reset, not next Monday.",
  ],
  weekends: [
    "Keep breakfast and lunch high-protein and light, so you have room for the dinner or drinks you actually care about.",
    "Pick your one treat for the weekend ahead of time instead of grazing all day.",
    "Keep your normal wake-up time and get a walk in. A Saturday routine makes Sunday easier.",
  ],
  cravings: [
    "Get 30+ grams of protein at every meal. It's the most filling thing you can eat.",
    "Add a fruit or vegetable to every meal for fiber and volume.",
    "Plan one small treat a day so it doesn't turn into a binge at night.",
  ],
  food: [
    "Build every plate the same way: a palm of protein, a fist of carbs, and half the plate vegetables.",
    "Rotate 3 or 4 go-to meals (like the ones in your plan) instead of reinventing every day.",
    "Keep easy protein on hand: {protein:4}.",
  ],
  protein: [
    "Get 30–50 grams of protein at every meal instead of cramming it all in at dinner.",
    "Lean on easy wins: {protein:4}.",
    "Plan your protein first, then build the rest of the meal around it.",
  ],
  eatingEnough: [
    "Add calories you don't have to chew much: {calories:4}.",
    "Eat every 3–4 hours instead of 2 big meals.",
    "A shake with {shake:5} adds 500+ calories in two minutes.",
  ],
  gym: [
    "Pick 3 set training days and treat them like appointments.",
    "Pack your gym bag the night before, or go straight from work before you get home.",
    "Short on time? A 30-minute full-body workout still counts.",
  ],
  program: [
    "Build around a few big lifts: squats, presses, rows and deadlift variations.",
    "Log every workout and add a rep or a little weight each week.",
    "Stick with the same program for 8–12 weeks. Progress beats variety.",
  ],
  busy: [
    "Cook protein in bulk twice a week so a good meal is 5 minutes away, not 45.",
    "Keep 2 grab-and-go options ready ({grab:2}) for chaotic days.",
    "Three 45-minute workouts a week is enough. Put them in your calendar like meetings.",
  ],
  accountability: [
    "Weigh in at least 3 mornings a week and watch your weekly average, not single days.",
    "Tell one person your goal and send them a quick update every week.",
    "Pick 2 daily non-negotiables (like hitting your protein and a 20-minute walk) and check them off every day.",
  ],
};

/** The "biggest mistake" (day 4 email), by goal. */
export const MISTAKES: Record<QuizInput["goal"], { title: string; paragraphs: string[]; fixes: string[] }> = {
  lose: {
    title: "Eating “clean” but not knowing how much",
    paragraphs: [
      "Healthy food still has calories. Cooking oil, nut butter, salad dressing, smoothies, and “just a handful” of something can add 300–500 calories a day without you noticing.",
      "Then the weekend hits. Say you're 500 calories under your target Monday through Friday. That's 2,500 calories, about 0.7 lb of fat. Two weekend days at 1,000 over erase most of it. You “ate clean” all week and the scale barely moved.",
    ],
    fixes: [
      "Track everything for 2 weeks, including oils, sauces and drinks. Just to learn, not forever.",
      "Keep weekend days within a few hundred calories of your target.",
      "Weigh in most mornings and go by your weekly average, not one day.",
    ],
  },
  muscle: {
    title: "Training hard but not eating (or progressing) enough",
    paragraphs: [
      "Most people trying to build muscle under-eat without realizing it, especially protein. A big dinner doesn't make up for a 600-calorie day before it.",
      "The other half: doing the same weights for months. Your muscles only grow when you give them a reason to, which means slowly lifting more over time.",
    ],
    fixes: [
      "Hit your protein target every day, and track your calories for 2 weeks to see where you really are.",
      "Log your workouts and add a rep or a little weight each week.",
      "Weigh in weekly. If your weight isn't slowly going up, eat a bit more.",
    ],
  },
  maintain: {
    title: "Not noticing the slow creep",
    paragraphs: [
      "Weight rarely jumps. It creeps. An extra 100–200 calories a day from snacks, drinks and bigger portions is easy to miss, and it adds up to a few pounds a year.",
      "Most people don't notice until their clothes feel tight, and by then it feels like starting over.",
    ],
    fixes: [
      "Weigh in a few mornings a week and watch your weekly average.",
      "If your average goes up 2 lbs, tighten things up for a week or two.",
      "Keep your protein high. It makes it much easier to stay on track.",
    ],
  },
};

const P = "margin-top:0;margin-bottom:12px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function bullets(items: string[]): string {
  return items
    .map(
      (t) =>
        `<tr><td valign="top" style="padding-top:0;padding-bottom:8px;padding-right:8px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#5a8bb3;">&#10003;</td><td style="padding-top:0;padding-bottom:8px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;">${esc(t)}</td></tr>`,
    )
    .join("");
}

/** Everything the follow-up emails need, sent with the macro_quiz.completed event. */
export function sequencePayload(q: QuizInput, r: MacroResults, now: Date = new Date()): Record<string, string> {
  const picked = OBSTACLES.filter((o) => q.obstacles.includes(o.value)).slice(0, 3);
  const obstaclesText = joinList(picked.map((o) => o.phrase));

  const tipsHtml = picked
    .map(
      (o) =>
        `<p style="margin-top:20px;margin-bottom:8px;font-family:Arial, Helvetica, sans-serif;font-size:17px;line-height:24px;font-weight:bold;color:#1f2328;">${esc(o.label)}</p><table width="100%" cellpadding="0" cellspacing="0" border="0">${bullets(OBSTACLE_STEPS[o.value].map((t) => fillFoods(t, q.avoid)))}</table>`,
    )
    .join("");

  const date = r.weeksToGoal ? formatDate(goalDate(r.weeksToGoal, now)) : "";
  let payoff: string;
  if (q.goal === "lose" && date)
    payoff = `Picture this: you follow this most weeks, and by ${date} you're down to ${q.goalWeightLb} lbs. Your clothes fit better, you have more energy, and you're done starting over every Monday.`;
  else if (q.goal === "muscle" && date)
    payoff = `Picture this: you follow this most weeks, and by ${date} you're up to ${q.goalWeightLb} lbs, stronger in the gym, and your shirts fit the way you want them to.`;
  else
    payoff = "Picture this: a few months from now you're stronger, you have more energy, and you're not stressing about food every day.";

  const time = TRYING_FOR.find((t) => t.value === q.tryingFor)?.phrase ?? "";
  const reality = time
    ? `But here's the honest part. You've been working on this for ${time}. You probably knew some of these tips already. The problem was never information. It's doing it week after week, when work gets busy, the weekend comes, and motivation fades. That's really hard to do alone.`
    : "But here's the honest part. Most people start strong and fade around week three, when motivation runs out and life gets busy. Knowing what to do isn't the problem. Doing it when you don't feel like it is.";

  // Their favourite foods (from the calculator), for a personal line in the day 2 email.
  const loves = [...q.likes.map((f) => f.toLowerCase()), ...(q.likesOther ? [q.likesOther] : [])].slice(0, 4);
  const foodsLine = loves.length
    ? `One more thing: you told me you love ${joinList(loves)}. Use that. The easiest plan to stick to is the one built from foods you already enjoy, so make them the base of 3 or 4 go-to meals this week, like the sample day I sent you.`
    : "One more thing: the easiest plan to stick to is the one built from foods you already enjoy. Pick 3 or 4 meals you actually like and rotate them this week.";

  const m = MISTAKES[q.goal];
  const mistakeHtml =
    m.paragraphs.map((p) => `<p style="${P}">${esc(p)}</p>`).join("") +
    `<p style="${P}font-weight:bold;margin-top:16px;">Here's the fix:</p><table width="100%" cellpadding="0" cellspacing="0" border="0">${bullets(m.fixes)}</table>`;

  return {
    first_name: esc(q.name.split(/\s+/)[0]),
    goal: labelOf(GOALS, q.goal),
    lead_rating: leadRating(q),
    obstacles_text: esc(obstaclesText || "staying consistent"),
    tips_html: tipsHtml,
    payoff: esc(payoff),
    reality: esc(reality),
    mistake_title: esc(m.title),
    mistake_html: mistakeHtml,
    foods_line: esc(foodsLine),
  };
}
