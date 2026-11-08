// ─────────────────────────────────────────────────────────────────────────────
// ALL WEBSITE TEXT LIVES HERE. Change the words between the quotes and the site
// updates. Every button on the homepage leads to the coaching application.
// ─────────────────────────────────────────────────────────────────────────────

export const site = {
  brand: "Vital Fusion Coaching",
  logo: "/images/vf-logo.png",
  coachName: "Tyler Kendrick",
  instagram: "", // e.g. "vitalfusioncoaching" (no @). Leave "" to hide the link.
  applyCta: "Apply for Coaching",

  hero: {
    eyebrow: "1:1 Online Coaching for Busy Adults",
    headline: "Achieve Fat Loss With a Sustainable Process",
    sub: "Build muscle and lose fat without crash diets or giving up the foods you love.",
    // The first application question sits right in the hero.
    formTitle: "Start your application",
    formNote: "Question 1 of 6 · Takes about 60 seconds",
    trust: ["Free consultation call", "Personalized to you", "No crash diets"],
    photo: "/images/coach-photo.webp",
  },

  results: {
    eyebrow: "Proven Results",
    headline: "Real people. Real results.",
    featured: {
      name: "Charlie G.",
      headline: "Lost 14 lbs in 12 weeks",
      points: [
        "No extreme dieting",
        "Still enjoyed the foods he loves",
        "Flexible workouts that fit his schedule",
        "Family noticed the transformation",
      ],
    },
    // Client check-ins (real quotes) with their weigh-in charts.
    cards: [
      {
        image: "/images/graph1.webp",
        headline: "Family noticed the weight loss",
        quote: "So far everything's been great. I feel better and I am getting comments from my family about my weight loss",
      },
      {
        image: "/images/graph2.webp",
        headline: "Still eating chips. Still losing weight.",
        quote: "I didn't expect to still be able to eat chips and such and lose weight. But the macro plan and guides actually helped a lot with being able to include things like that.",
      },
      {
        image: "/images/graph3.webp",
        headline: "Never felt hungry",
        quote: "Never felt stuffed or that I wasn't eating enough. Perfect amount to feel full and recover the next day",
      },
    ],
  },

  problem: {
    headline: "You're busy. Your body is paying for it.",
    points: [
      "You've tried diet after diet. None of them survived real life.",
      "The weight comes off, then creeps right back.",
      "Work and family leave no time for 2-hour workouts.",
      "You're guessing what to eat and hoping it works.",
    ],
    closer: "Ready to make it stick?",
  },

  mission: "Real transformation comes from consistency, not perfection.",

  method: {
    eyebrow: "How It Works",
    headline: "The V.I.T.A.L. Method",
    sub: "A proven system for sustainable fat loss, built around your life.",
    steps: [
      { letter: "V", title: "Verify the Barriers", text: "Identify what's actually holding you back from progress." },
      { letter: "I", title: "Install Simple Structure", text: "Create systems that fit YOUR life, not the other way around." },
      { letter: "T", title: "Target Sustainable Fat Loss", text: "Focus on steady progress you can maintain, not crash diets." },
      { letter: "A", title: "Audit and Adapt", text: "Regular check-ins to adjust your plan based on real results." },
      { letter: "L", title: "Learn to Maintain Long-Term", text: "Build habits that last beyond the program." },
    ],
    included: ["Custom training program", "Flexible nutrition plan", "Weekly check-ins", "Direct access through the coaching app"],
  },

  about: {
    eyebrow: "Your Coach",
    headline: "I've been where you are.",
    paragraphs: [
      "After years of trying every diet and workout program, I discovered what actually works: a sustainable, personalized approach that fits your life.",
      "Now I help busy adults build the body and health they deserve, without sacrificing everything they love.",
    ],
    credentials: ["Nutrition Specialist", "5+ Years Experience"],
  },

  faq: {
    eyebrow: "Common Questions",
    headline: "Frequently Asked Questions",
    items: [
      {
        q: "How much time do I need to commit each week?",
        a: "The program is designed for busy adults. Most clients spend 3-4 hours per week on workouts (3-4 sessions of 45-60 minutes). Meal prep typically takes 2-3 hours on weekends. It's about working smarter, not harder.",
      },
      {
        q: "What if I've tried everything and nothing works?",
        a: "You're not alone—this is exactly why I created the V.I.T.A.L. method. Most programs fail because they're not sustainable. We focus on building habits you can maintain for life, not quick fixes that lead to rebound weight gain.",
      },
      {
        q: "Do I need a gym membership?",
        a: "Not necessarily. I can design programs for home workouts with minimal equipment or for full gym access. We'll work with what you have and what fits your lifestyle.",
      },
      {
        q: "How quickly will I see results?",
        a: "Most clients notice changes in energy and strength within 2-3 weeks. Visible physical changes typically appear within 4-6 weeks. Remember, sustainable fat loss is about 1-2 lbs per week for long-term success.",
      },
      {
        q: "What's included in the coaching program?",
        a: "You'll receive personal guidance through our coaching app, including custom workout programs, nutrition, and accountability support. We track your progress together and adjust the plan as needed.",
      },
      {
        q: "Will I have to give up foods I love?",
        a: "Absolutely not. My approach is about learning to eat foods you love in sustainable portions. No elimination diets.",
      },
      {
        q: "Is this program suitable for beginners?",
        a: "Absolutely! The V.I.T.A.L. method is personalized to your current fitness level. Whether you're just starting out or getting back into fitness, we'll create a plan that challenges you appropriately and scales with your progress.",
      },
    ],
  },

  closing: {
    headline: "Your transformation starts with one application.",
    sub: "It takes about 60 seconds. I'll personally review it and reach out to set up your free consultation call.",
  },

  // Email the applicant gets right after applying.
  confirmationEmail: {
    subject: "We got your application 💪",
    heading: "We got your application!",
    body: "Thanks for applying for coaching with Vital Fusion. I'll personally review your answers and reach out soon to set up your free consultation call.",
    linkIntro: "While you wait, take a minute to read what happens next:",
    linkButton: "See what happens next →",
    signOff: "Talk soon,",
  },

  // Hidden page linked from the email above (vitalfusioncoaching.com/next-steps).
  // It isn't in the menu and search engines are told not to list it.
  nextSteps: {
    eyebrow: "Application received",
    headline: "You took the first step.",
    intro:
      "Most people think about changing their body for months, sometimes years, and never actually do anything about it. You just did. Filling out that application meant being honest about where you are and where you want to be, and that's the exact mindset that gets results.",
    stepsTitle: "Here's what happens next",
    steps: [
      { title: "I review your application", text: "I read every application personally, so I know your goals before we ever talk." },
      { title: "We reach out to schedule your call", text: "Keep an eye on your phone and email (check spam too). We'll get your free consultation call on the calendar." },
      { title: "We talk about your goals and fit", text: "On the call we'll go over where you are, where you want to be, and whether 1:1 coaching is the right fit for you. No pressure, just an honest conversation." },
    ],
    closing:
      "Whatever happened with past diets or programs doesn't decide what happens next. You don't need to be perfect to start, you just need to keep showing up, and you already proved you can. I'm looking forward to talking with you.",
    signOff: "Talk soon,",
    // Paste a YouTube link here later to show your video on this page.
    videoUrl: "",
  },

  // The /vital-method promo page (used for ads / bio links)
  promo: {
    headline: "The VITAL Method",
    sub: "A Proven System for Sustainable Fat Loss",
    banner: "🎉 Limited Time: 30% OFF 1:1 Coaching",
    bannerSub: "For the next 5 people that sign up",
    testimonial:
      "Foods been great 👍, I feel like I still have different options for foods I like. Gym has been fine, I will admit that sometimes I don't hit every machine in the workout because the machine is ALWAYS busy. But I have some home workouts that I try to fill the gaps. Overall, I'm feeling great. I'm even getting comments from my family about my weight loss.",
    ctaHeadline: "Ready to Start Your Transformation?",
    ctaSub: "Apply now and get 30% off",
    ctaNote: "Limited spots available • Personalized coaching",
    cta: "Apply Now - Get 30% Off",
    fine: "Offer expires soon • Limited availability",
  },
};
