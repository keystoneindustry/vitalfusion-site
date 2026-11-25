"""Builds the 3 follow-up emails for the free Fat Loss Grocery List (day 2, 4, 7).
Run: python3 docs/email-templates/grocery-list/build.py  → writes grocery-<n>.html + subjects.json next to this file.
The live copies are Resend templates "Grocery list <n> – ..." used by the automation on `grocery_list.signed_up`."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = "https://vitalfusioncoaching.com"
APPLY = f"{SITE}/?source=grocery-list-email"
GRAPH = f"{SITE}/images/email/charlie-graph.jpg"
FONT = "font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;"


def p(t, mb=16):
    return f'<p style="margin-top:0;margin-bottom:{mb}px;{FONT}">{t}</p>'


def button(label):
    return f'''<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr><td bgcolor="#5a8bb3" style="background-color:#5a8bb3;border-radius:10px;">
<a href="{APPLY}" style="display:inline-block;padding-top:14px;padding-bottom:14px;padding-left:24px;padding-right:24px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;">{label} &rarr;</a>
</td></tr></table>'''


def graph():
    return f'''<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px;"><tr><td align="center" bgcolor="#f4f5f7" style="background-color:#f4f5f7;border-radius:10px;padding-top:16px;padding-bottom:12px;padding-left:16px;padding-right:16px;">
<img src="{GRAPH}" width="260" height="365" alt="Charlie's weigh-ins: up and down day to day, 16 lbs down over 8 weeks" border="0" style="display:block;width:260px;height:365px;border-radius:8px;">
<p style="margin-top:10px;margin-bottom:0;font-family:Arial, Helvetica, sans-serif;font-size:13px;line-height:18px;color:#5b6370;">Charlie G.'s weigh-ins. Up and down plenty of days, 16 lbs down in 8 weeks.</p>
</td></tr></table>'''


def bullets(items):
    return "".join(f'<p style="margin-top:0;margin-bottom:8px;{FONT}">&bull; {t}</p>' for t in items) + '<div style="height:8px;line-height:8px;font-size:8px;">&nbsp;</div>'


def small(t):
    return f'<p style="margin-top:0;margin-bottom:16px;font-family:Arial, Helvetica, sans-serif;font-size:13px;line-height:20px;color:#8d939e;">{t}</p>'


def wrap(body):
    return f'''<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Vital Fusion Coaching</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f5f7" style="background-color:#f4f5f7;">
<tr><td align="center" style="padding-top:24px;padding-bottom:24px;padding-left:12px;padding-right:12px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:12px;padding-top:28px;padding-bottom:28px;padding-left:24px;padding-right:24px;">
{body}
{p("Tyler", 0)}
</td></tr>
<tr><td align="center" style="padding-top:16px;padding-bottom:0;padding-left:12px;padding-right:12px;">
<p style="margin-top:0;margin-bottom:0;font-family:Arial, Helvetica, sans-serif;font-size:12px;line-height:18px;color:#8d939e;">Vital Fusion Coaching &middot; 1802 Charolais Court, Bel Air, MD 21015<br>You're getting this because you asked for the free Fat Loss Grocery List at vitalfusioncoaching.com.<br><a href="{{{{{{RESEND_UNSUBSCRIBE_URL}}}}}}" style="color:#8d939e;text-decoration:underline;">Unsubscribe</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>'''


HI = p("Hi {{{NAME}}},")

EMAILS = [
    ("🛒 You bought the food. So why is it still in the fridge?", "".join([
        HI,
        p("You've had the grocery list for a couple of days. Let me guess how this week goes."),
        p("Sunday, you shop. The fridge is full of chicken, Greek yogurt, berries and potatoes. You feel good. This is the week."),
        p("Then Wednesday happens. Work runs late. There's a team lunch you didn't plan for. You get home at 7:30, the chicken is still raw, and you're too tired to care. So you order something, and tell yourself you'll start fresh Monday."),
        p("If that sounds familiar, I want you to hear this: <strong>you don't have a food problem.</strong> You already knew most of that list before I sent it. You have a plan-for-real-life problem. Nobody ever showed you how to make this work when your week doesn't go the way you planned."),
        p("That's the part I fix with my clients."),
        p("Hit reply and tell me: what day of the week does your eating usually fall apart? I read every reply."),
        button("See how 1:1 coaching works"),
    ])),
    ("😬 The real reason you keep starting over every Monday", "".join([
        HI,
        p("Most people I talk to aren't starting. They're <strong>restarting.</strong> For the fifth time this year."),
        p("It goes like this. You go all in: no carbs, no sweets, workouts every day. You're perfect for 9 days. Then one bad meal turns into \"screw it,\" a weekend, and a \"Monday I'll start again.\""),
        p("Every restart costs you more than the scale shows. Another month of clothes that don't fit. Another round of photos you'd rather not be in. Another few weeks of feeling like you can't trust yourself."),
        p("Here's what nobody tells you: the diet didn't fail because you're weak. It failed because it was built for someone with no job, no kids and no happy hours."),
        p("I work a desk job in sales. Work lunches, happy hours, long days. I still stay in shape, because my plan was built around that life instead of fighting it."),
        p("That's what I build for my clients. Charlie lost 16 lbs in 8 weeks without extreme dieting, still eating the foods he loves. His scale went up plenty of days. The difference was he never had to restart."),
        graph(),
        button("Apply for 1:1 coaching"),
        small("Individual results vary."),
    ])),
    ("🤔 Be honest with me…", "".join([
        HI,
        p("It's been a week since you grabbed the grocery list. Be honest: has anything actually changed?"),
        p("If it has, that's awesome. Keep going, and use the sample meals to keep it simple."),
        p("If it hasn't, I'm not judging. But I want you to notice something. You've known what to eat for years. Chicken over fast food. More protein. Fewer late-night snacks. Knowing has never been the problem."),
        p("What's missing is:", 8),
        bullets([
            "A plan built around your schedule, your work lunches and the foods you actually like",
            "Someone checking in every week, so a bad day doesn't turn into a bad month",
            "Changes when life gets busy, instead of starting over",
        ]),
        p("A year from now you could feel confident in your clothes and like yourself again. Or you could be right here, waiting for the right Monday to start."),
        p("If you're done starting over, apply below. It takes about 60 seconds, and I review every application myself."),
        button("Apply for 1:1 coaching"),
        p("This is the last email I'll send you about the grocery list. Keep it, use it, and you can always just hit reply."),
    ])),
]

if __name__ == "__main__":
    subjects = {}
    for i, (subject, body) in enumerate(EMAILS, start=1):
        open(os.path.join(HERE, f"grocery-{i}.html"), "w").write(wrap(body))
        subjects[f"grocery-{i}"] = subject
    json.dump(subjects, open(os.path.join(HERE, "subjects.json"), "w"), indent=2, ensure_ascii=False)
    print("wrote", list(subjects))
