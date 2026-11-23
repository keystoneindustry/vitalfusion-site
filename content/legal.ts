// Terms of Service and Privacy Policy for vitalfusioncoaching.com and the coaching app.
// Approved by Tyler Nov 23, 2026. Keep in sync with the coaching agreement in the app
// (coaching-app/lib/agreement.ts): no refunds once paid, monthly cancellation by email, Maryland law.
// Text format: a line starting with "- " is a bullet; **bold** works inside lines.

export const LEGAL_UPDATED = "November 23, 2026";
export const LEGAL_CONTACT = "Vital Fusion Coaching LLC, 1802 Charolais Court, Bel Air, MD 21015 · tyler@vitalfusioncoaching.com";

export type LegalSection = { title: string; body: string[] };

export const TERMS_INTRO = [
  "These Terms of Service (“Terms”) are an agreement between you and Vital Fusion Coaching LLC (“Vital Fusion Coaching,” “we,” “us”), a Maryland limited liability company, 1802 Charolais Court, Bel Air, MD 21015. They apply to our website vitalfusioncoaching.com, our coaching app at app.vitalfusioncoaching.com, our free tools and guides, our emails and messages, and all coaching services we sell (together, the “Services”). By using the Services, submitting an application or form, or making a purchase, you agree to these Terms and to our Privacy Policy. If you don’t agree, don’t use the Services.",
  "If you become a coaching client, you will also sign our Client Onboarding, Informed Consent & Personal Training Agreement (the “Coaching Agreement”). If anything in these Terms conflicts with your signed Coaching Agreement, the Coaching Agreement controls for your coaching.",
];

export const TERMS: LegalSection[] = [
  {
    title: "1. Who can use the Services",
    body: [
      "You must be at least 18 years old to buy coaching or use the coaching app. By using the Services you confirm that you are 18 or older and that the information you give us is true and complete.",
    ],
  },
  {
    title: "2. What we provide",
    body: [
      "We provide online fitness programming, coaching guidance, accountability support and general nutrition education, delivered remotely through our app, email and video calls. We also offer free tools and guides, such as our Nutrition Plan Calculator and meal plan downloads. Coaching is personal to you; you may not share your account, plans or materials with anyone else.",
    ],
  },
  {
    title: "3. Not medical advice",
    body: [
      "The Services are for general fitness and nutrition education only. We do not provide medical advice, diagnosis, treatment, physical therapy or medical nutrition therapy, and we are not licensed dietitians or medical professionals. Nothing we provide is a substitute for professional medical care. Talk to your doctor before starting any exercise or nutrition program, especially if you are pregnant, take medication, or have a medical condition, injury, or a history of disordered eating. Stop exercising and seek medical help if you feel pain, dizziness, chest pain, shortness of breath or any unusual symptom. In an emergency, call 911.",
      "Nutrition guidance, calorie and macro targets, meal plans, calculator results and AI-generated answers are estimates for healthy adults and are educational only. They are not intended to diagnose, treat, cure or prevent any disease. All dietary decisions remain your responsibility. Always check food labels yourself for allergies and intolerances.",
    ],
  },
  {
    title: "4. Assumption of risk and release",
    body: [
      "Exercise and changes to your diet carry inherent risks, including muscle strains, joint and ligament injuries, dizziness, fainting, abnormal blood pressure responses, cardiovascular events and other injuries. Because coaching is online, we are not physically present, cannot watch every movement, and cannot guarantee your safety. You choose your own weights, intensity, equipment and training environment, and you participate voluntarily and at your own risk.",
      "To the fullest extent the law allows, you release and hold harmless Vital Fusion Coaching LLC and its owners, officers, employees, contractors and agents from all claims, damages, losses and injuries arising out of or related to your use of the Services, except in cases of gross negligence or willful misconduct.",
    ],
  },
  {
    title: "5. Results are not guaranteed",
    body: [
      "Results depend on your effort, consistency, sleep, nutrition, health and other factors outside our control. We do not promise any specific result, weight loss or timeline. Client results and testimonials we share are real, but they are individual experiences, not typical or guaranteed results.",
    ],
  },
  {
    title: "6. Payments",
    body: [
      "Prices are shown before you pay. Payments are processed securely by Stripe or another payment method we agree to in writing. Payment is due in advance. You authorize us to charge your payment method for the coaching you choose, including recurring monthly charges if you choose monthly coaching. If a payment fails, we may pause or end your coaching until it is paid.",
    ],
  },
  {
    title: "7. No refunds",
    body: [
      "**All payments are final and non-refundable.** This applies to coaching packages, monthly coaching and any digital products, including if you stop using the Services, miss check-ins or calls, or end your coaching early. We do not give partial refunds or credits for unused time. The only exception is in section 10: if we end your coaching for reasons that are not caused by you, we will refund the unused part of what you paid.",
      "If you pay for a package in installments, you agree to pay every installment for the full package, even if you stop using the Services.",
    ],
  },
  {
    title: "8. Coaching packages (paid in full)",
    body: [
      "A coaching package covers the number of weeks you buy, from your start date to your end date, as shown at checkout and in your Coaching Agreement. Packages do not renew automatically. Coaching ends on the end date unless we both agree in writing to renew. Any pause, extension or change must be agreed in writing (email counts).",
    ],
  },
  {
    title: "9. Monthly coaching (cancel anytime)",
    body: [
      "If you choose monthly coaching:",
      "- **It renews automatically.** You will be charged the monthly price shown at checkout on the same date each month until you cancel. There is no minimum commitment.",
      "- **How to cancel.** Email tyler@vitalfusioncoaching.com at any time before your next billing date and say you want to cancel. We will confirm your cancellation by email. You don’t need to give a reason.",
      "- **What happens after you cancel.** You will not be charged again. Your coaching continues through the end of the month you already paid for. That month is not refunded.",
      "- **Price changes.** If the monthly price changes, we will tell you by email before the new price applies, and you can cancel before then.",
    ],
  },
  {
    title: "10. Ending coaching",
    body: [
      "We may suspend or end your coaching if you don’t pay, don’t follow safety instructions, give false or misleading information, or behave in a way that puts you or us at unreasonable risk or is abusive. In those cases no refund is owed. If we end your coaching for any other reason, we will refund the unused part of what you paid.",
    ],
  },
  {
    title: "11. Chargebacks",
    body: [
      "If you have a problem with a charge, please contact us first at tyler@vitalfusioncoaching.com so we can help. If you dispute a valid charge with your bank instead, we may pause your coaching and will share your signed Coaching Agreement, these Terms and your account activity with the payment processor.",
    ],
  },
  {
    title: "12. Your account and the app",
    body: [
      "You sign in to the app with a code sent to your email. Keep your email account secure and don’t share sign-in codes. You are responsible for activity on your account. The app may change, be updated, or be unavailable at times. We are not responsible for problems caused by your device, internet connection or third-party apps.",
    ],
  },
  {
    title: "13. AI features",
    body: [
      "Some features use artificial intelligence, including help drafting your plans and check-in feedback (which your coach reviews before you see it) and the AI Nutrition Assistant (which answers you directly). AI answers can be wrong or incomplete. Use them as general information, double-check anything important, and don’t rely on them for allergies or medical questions.",
    ],
  },
  {
    title: "14. Your content and photos",
    body: [
      "You own the information, photos, notes and messages you give us (“Your Content”). You allow us to use Your Content only to provide and improve your coaching and to run our business as described in our Privacy Policy. **We will not publicly share your photos, name, story or results (for example as a testimonial or before/after) without your separate written permission,** which you can withdraw for future posts at any time.",
    ],
  },
  {
    title: "15. Our content",
    body: [
      "Our programs, meal plans, guides, videos, app, website and branding belong to Vital Fusion Coaching LLC and are protected by copyright and other laws. You may use them for your own personal, non-commercial use only. You may not copy, share, resell, publish or create products from them.",
    ],
  },
  {
    title: "16. Emails, texts and notifications",
    body: [
      "By giving us your email you agree to receive emails about your request, your coaching and our services. You can unsubscribe from marketing emails at any time using the link in the email. Clients will still receive emails needed for their coaching (such as sign-in codes and check-in replies). Push notifications can be turned off in the app or on your phone.",
    ],
  },
  {
    title: "17. Third-party services",
    body: [
      "The Services link to or work with third-party services such as Stripe, Cal.com, Google Meet, Cronometer and MyFitnessPal. Their own terms and privacy policies apply, and we are not responsible for them.",
    ],
  },
  {
    title: "18. Disclaimers",
    body: [
      "The Services are provided “as is” and “as available.” To the fullest extent the law allows, we disclaim all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose and non-infringement.",
    ],
  },
  {
    title: "19. Limitation of liability",
    body: [
      "To the fullest extent the law allows, Vital Fusion Coaching LLC will not be liable for any indirect, incidental, special, consequential or punitive damages, or for lost profits, data or goodwill. Our total liability for any claim related to the Services is limited to the amount you paid us in the 12 months before the claim. Nothing in these Terms limits liability that cannot be limited by law, including for gross negligence or willful misconduct.",
    ],
  },
  {
    title: "20. Indemnity",
    body: [
      "You agree to defend and hold harmless Vital Fusion Coaching LLC from claims, losses and costs (including reasonable attorneys’ fees) arising from your breach of these Terms or your misuse of the Services.",
    ],
  },
  {
    title: "21. Governing law",
    body: [
      "These Terms are governed by the laws of the State of Maryland. Any dispute arising out of or related to these Terms or the Services will be brought in the state or federal courts located in Maryland.",
    ],
  },
  {
    title: "22. Changes to these Terms",
    body: [
      "We may update these Terms. We will post the new version here with a new “Last updated” date, and tell clients about important changes by email or in the app. Changes apply from the date they’re posted and don’t change a Coaching Agreement you already signed.",
    ],
  },
  {
    title: "23. Other terms",
    body: [
      "If any part of these Terms is found invalid or unenforceable, the rest stays in effect. If we don’t enforce a term right away, we can still enforce it later. These Terms, our Privacy Policy and (for clients) the Coaching Agreement are the entire agreement between you and us about the Services.",
    ],
  },
  { title: "24. Contact", body: [LEGAL_CONTACT] },
];

export const PRIVACY_INTRO = [
  "This Privacy Policy explains how Vital Fusion Coaching LLC (“we,” “us”), 1802 Charolais Court, Bel Air, MD 21015, collects, uses and protects your information when you use vitalfusioncoaching.com, our coaching app at app.vitalfusioncoaching.com, our free tools and guides, our emails, and our Instagram messages (the “Services”). **We do not sell your personal information, and we do not use it for targeted advertising.**",
];

export const PRIVACY: LegalSection[] = [
  {
    title: "1. Information you give us",
    body: [
      "- **Free tools and guides:** your name, email, and answers to the Nutrition Plan Calculator (such as goal, age, sex, height, weight and activity level).",
      "- **Coaching applications:** your contact details and answers about your goals, history and schedule.",
      "- **Coaching clients:** your full name, address, email, phone, date of birth and emergency contact; your answers to the health questionnaire (PAR-Q) and onboarding questions (including health, injuries, food preferences, allergies and lifestyle); your signed Coaching Agreement; and what you log in the app, such as weigh-ins, progress photos, meal photos and notes, habits and check-in answers.",
      "- **Messages:** what you send us by email, in forms, or in Instagram messages.",
      "Some of this is health information. We treat it as sensitive: we collect it only to coach you safely and well, and we use it only for that.",
    ],
  },
  {
    title: "2. Information we collect automatically",
    body: [
      "- **Sign-in cookies** that keep you signed in to the app. We don’t use advertising or tracking cookies.",
      "- **Basic usage information,** such as pages visited, device and browser type, and when you last opened the app, collected through privacy-friendly analytics that don’t track you across other websites.",
      "- **Notification settings:** if you turn on push notifications, your device’s notification address.",
    ],
  },
  {
    title: "3. Information from other sources",
    body: [
      "- **Payments:** Stripe tells us whether a payment went through and the amount. We never see or store your full card number.",
      "- **Bookings:** Cal.com tells us when you book, move or cancel a call.",
      "- **Instagram:** if you comment on or message our account, we receive your username and messages through Instagram and our messaging tool (ManyChat).",
    ],
  },
  {
    title: "4. How we use your information",
    body: [
      "- To provide your coaching: build your nutrition and training plans, review your check-ins, track your progress, and send reminders.",
      "- To send what you asked for, such as your calculator results or a meal plan.",
      "- To reply to you and contact you about coaching you applied for.",
      "- To send marketing emails about our services. You can unsubscribe any time.",
      "- To keep the Services secure, fix problems and improve them.",
      "- To meet legal, tax and accounting requirements and protect our rights.",
    ],
  },
  {
    title: "5. Who we share it with",
    body: [
      "We share information only with service providers who help us run the Services, and only what they need. They may use it only to provide their services to us:",
      "- **Supabase** (app database and private file storage)",
      "- **Vercel** (website and app hosting, analytics)",
      "- **Resend** (email delivery)",
      "- **Anthropic** (AI features)",
      "- **Stripe** (payments)",
      "- **Cal.com, Google Calendar and Google Meet** (call scheduling and video calls)",
      "- **Google Workspace** (business email and lead spreadsheets)",
      "- **ManyChat and Instagram** (Instagram messages)",
      "We may also share information when the law requires it, to protect someone’s safety, to enforce our agreements, or as part of selling or transferring our business (the new owner would have to follow this policy).",
    ],
  },
  {
    title: "6. Photos",
    body: [
      "Progress photos and meal photos are stored in private storage and shown only through temporary secure links. Only you and your coach can see them. We will never post your photos, name or results publicly without your separate written permission.",
    ],
  },
  {
    title: "7. How long we keep it",
    body: [
      "- **Leads (free tools, applications):** until you unsubscribe or ask us to delete it, or about 2 years after we last hear from you.",
      "- **Clients:** while you are coached, and for a reasonable time after so we can support you if you return.",
      "- **Records we must keep:** your signed Coaching Agreement and payment records are kept as long as needed for legal, tax and dispute purposes.",
      "After that, we delete or de-identify it.",
    ],
  },
  {
    title: "8. How we protect it",
    body: [
      "Information is encrypted in transit, stored with access controls, and photos and documents are kept in private storage. No system is perfectly secure, but we work to protect your information and will tell you if a breach affects you as the law requires.",
    ],
  },
  {
    title: "9. Your choices and rights",
    body: [
      "You can:",
      "- **See, correct or download** the information we have about you.",
      "- **Delete** your information (except records we must keep, such as your signed agreement).",
      "- **Unsubscribe** from marketing emails with the link in any email.",
      "- **Turn off** push notifications in the app or on your phone.",
      "To make a request, email tyler@vitalfusioncoaching.com. We’ll confirm it’s you and respond within 45 days. Depending on where you live, you may have additional privacy rights under your state’s law; we will honor them, and you can appeal a decision by replying to our response.",
    ],
  },
  {
    title: "10. Children",
    body: [
      "Coaching and the app are for adults 18 and over. We don’t knowingly collect information from children under 13. If you believe a child has given us information, contact us and we’ll delete it.",
    ],
  },
  {
    title: "11. Changes",
    body: [
      "We may update this policy. We’ll post the new version here with a new “Last updated” date and tell clients about important changes by email or in the app.",
    ],
  },
  { title: "12. Contact", body: [LEGAL_CONTACT] },
];
