import type { TourStep } from "./FeatureTour";

/** The Nutrition tab tour (after Tyler publishes their meal plan). */
export const NUTRITION_TOUR: TourStep[] = [
  {
    target: '[data-tour="n-targets"]',
    title: "🎯 Your daily targets",
    text: "Your calories, protein, carbs, fat and fiber for each day. Protein and calories matter most: hit those and you're winning.",
  },
  {
    target: '[data-tour="n-perfect"]',
    title: "🍽️ Your perfect day of eating",
    text: "A full day of meals built to hit your targets, with portions and how to make each one. Tap a meal to open it. Eat it as is, or use it as your blueprint.",
  },
  {
    target: '[data-tour="n-grocery"]',
    title: "🛒 Your grocery list",
    text: "Everything you need for your perfect day, added up for 3, 5 or 7 days and sorted by store aisle. Tick things off as you shop.",
  },
  {
    target: '[data-tour="n-tracking"]',
    title: "📱 Track your calories",
    text: "Download Cronometer or MyFitnessPal here and log what you eat each day, aiming for the targets at the top.",
  },
  {
    target: '[data-tour="more"]',
    title: "📖 Meal library & AI assistant",
    text: "Under ☰ More: your meal library (more meals you can swap in, all sized for you) and the AI Nutrition Assistant for eating out and quick food questions.",
  },
];

/** The Training tab tour (after Tyler publishes their program). */
export const TRAINING_TOUR: TourStep[] = [
  {
    target: '[data-tour="t-meta"]',
    title: "🏋️ Your program",
    text: "How many days a week you train, about how long each workout takes, and what it's built for.",
  },
  {
    target: ".workouts",
    title: "📋 One card per workout",
    text: "Each card is one training day. Tap a card to open it. Today's workout opens by itself.",
  },
  {
    target: ".workout[open] .warmup-line",
    title: "🔥 Warm up first",
    text: "Start every session with the warm-up. It takes a few minutes and gets you ready to lift.",
  },
  {
    target: ".workout[open] .ex-list li",
    title: "💪 Sets, reps and rest",
    text: "Do the exercises in order. “3 sets · 8–12 reps” means 3 rounds of 8 to 12 reps. Rest the time shown between sets.",
  },
  {
    target: ".workout[open] .demo-btn",
    title: "▶ Watch the demo",
    text: "Not sure how to do a move? Tap “Watch demo” to see Tyler show the form.",
  },
  {
    target: ".notes-card",
    title: "📝 Program notes",
    text: "How to progress week to week, and Tyler's tips. Worth a read before your first workout.",
  },
  {
    target: '[data-tour="calendar"]',
    title: "📅 It's on your calendar",
    text: "Your workout days show up on your Calendar and on Today, so you always know what's next. Tap a workout there to jump straight to it.",
  },
];
