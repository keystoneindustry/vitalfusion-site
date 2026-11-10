// ─────────────────────────────────────────────────────────────────────────────
// ALL WEBSITE TEXT LIVES HERE. Change the words between the quotes and the site
// updates. Every button on the homepage leads to the coaching application.
// ─────────────────────────────────────────────────────────────────────────────

export const site = {
  brand: "Vital Fusion Coaching",
  logo: "/images/vf-logo.png",
  coachName: "Tyler Kendrick",
  instagram: "", // e.g. "vitalfusioncoaching" (no @). Leave "" to hide the link.
  applyCta: "Start Now",

  hero: {
    headline: "Ready to take your goals to the next level?",
    sub: "1:1 online coaching that helps busy adults lose fat and build muscle, without crash diets.",
    button: "Start Now →",
    note: "Free application · Takes about 60 seconds",
    resultsLink: "See client results",
    photo: "/images/coach-photo.webp",
  },

  results: {
    eyebrow: "Client Results",
    headline: "Real clients. Real results.",
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

  method: {
    eyebrow: "How It Works",
    headline: "The V.I.T.A.L. Method",
    sub: "A simple system for fat loss that lasts.",
    steps: [
      { letter: "V", title: "Verify the Barriers", text: "Find what's really holding you back." },
      { letter: "I", title: "Install Simple Structure", text: "A plan that fits YOUR life." },
      { letter: "T", title: "Target Sustainable Fat Loss", text: "Steady progress, no crash diets." },
      { letter: "A", title: "Audit and Adapt", text: "Regular check-ins to adjust your plan." },
      { letter: "L", title: "Learn to Maintain Long-Term", text: "Habits that last beyond the program." },
    ],
  },

  about: {
    eyebrow: "Your Coach",
    headline: "Meet your coach",
    paragraphs: [
      "I've been where you are. After years of trying every diet and workout program, I found what actually works: a sustainable, personalized approach that fits your life.",
      "Now I help busy adults build the body and health they deserve, without giving up everything they love.",
    ],
    credentials: ["Nutrition Specialist", "5+ Years Experience"],
  },

  closing: {
    headline: "Your next level starts today.",
    sub: "Answer 6 quick questions. I'll personally review your application and reach out to set up a free call.",
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

  // Hidden macro calculator quiz at /macros (Instagram "comment MACROS" link).
  macroQuiz: {
    title: "Free Macro Calculator",
    intro: "Answer a few quick questions and get your daily calories, protein, carbs and fat, plus my clients' favorite meals.",
    startButton: "Calculate My Macros →",
    note: "Takes about 60 seconds · 100% free",
    leadTitle: "Where should I send your plan?",
    leadNote: "Your results show on the next screen, and I'll email you a copy.",
    resultsButton: "Show My Results →",
    // Titles and "why it works" change with the goal they pick.
    mealsTitle: {
      lose: "My top 3 fat-loss meals",
      muscle: "My top 3 muscle-building meals",
      maintain: "My top 3 go-to meals",
    },
    mealsSub: "These are the meals my clients eat most. They're not portioned to your macros, just great go-to options.",
    meals: [
      {
        name: "Sockeye salmon, sweet potatoes & vegetables",
        nameFor: { muscle: "Atlantic salmon, sweet potatoes & veggies" },
        why: {
          lose: [
            "Salmon is lean protein packed with omega-3 fats",
            "Sweet potatoes and vegetables add fiber, so you stay full longer",
            "Lots of food on the plate for the calories",
          ],
          muscle: [
            "Atlantic salmon is high-quality protein to build and repair muscle",
            "Its extra omega-3 fats add calories and support recovery",
            "Sweet potatoes refuel your muscles with slow-digesting carbs",
          ],
          maintain: [
            "Lean protein plus omega-3 fats for long-term health",
            "Sweet potatoes and vegetables add fiber for steady energy",
            "A balanced plate that's easy to repeat all week",
          ],
        },
      },
      {
        name: "Nonfat Greek yogurt bowl",
        detail: "with protein powder, fruit, honey & almond butter",
        why: {
          lose: [
            "Greek yogurt + protein powder = a huge hit of protein",
            "Probiotics in the yogurt support healthy digestion",
            "Fruit adds fiber, and it tastes like dessert, which kills cravings",
          ],
          muscle: [
            "Greek yogurt + protein powder = 40g+ of protein in one bowl",
            "Slow-digesting yogurt protein makes it a great pre-bed snack",
            "Fruit, honey and almond butter add the extra calories you need to grow",
          ],
          maintain: [
            "A high-protein breakfast or snack that keeps you full",
            "Probiotics in the yogurt support healthy digestion",
            "Satisfies your sweet tooth without throwing off your week",
          ],
        },
      },
      {
        name: "93/7 ground beef, potatoes & pineapple",
        nameFor: { muscle: "93/7 ground beef, jasmine rice & pineapple" },
        why: {
          lose: [
            "Lean beef is high in protein, iron and B12",
            "Potatoes are one of the most filling foods per calorie",
            "Pineapple adds fiber, vitamin C and natural sweetness",
          ],
          muscle: [
            "Beef is packed with protein, iron, B12 and natural creatine",
            "Jasmine rice is an easy, fast-digesting carb to fuel hard training",
            "Pineapple adds quick carbs and vitamin C for recovery",
          ],
          maintain: [
            "Lean beef is high in protein, iron and B12",
            "Potatoes are filling and great fuel for your workouts",
            "Pineapple adds fiber, vitamin C and natural sweetness",
          ],
        },
      },
    ],
    bridgeTitle: "That's where I come in.",
    bridge: "A plan built around your life, weekly check-ins, and someone in your corner.",
    // Client example, shown on the results page only (not in the email).
    clientExample: {
      label: "Real client example",
      image: "/images/graph2.webp",
      headline: "Charlie G. lost 14 lbs in 12 weeks",
      text: "No extreme dieting, and he still ate the foods he loves.",
    },
    bridgeButton: "Apply for 1:1 Coaching →",
    resultsVary: "Individual results vary.",
    disclaimer: "These numbers are estimates based on the Mifflin-St Jeor formula and are not medical advice. Check with your doctor before changing your diet, especially if you have a medical condition, are pregnant, or are under 18.",
    emailSubject: "Your macro plan 💪",
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
