"""Builds the 6 follow-up email templates for the free 60-day meal plans (3 per plan).
Run: python3 docs/email-templates/meal-plan/build.py  → writes <plan>-<n>.html next to this file.
The live copies are Resend templates "Meal plan <Plan> <n> – ..." used by the two automations."""
import html, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = "https://vitalfusioncoaching.com"
GRAPH = f"{SITE}/images/email/charlie-graph.jpg"
P = "margin-top:0;margin-bottom:16px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;"


def p(t, mb=16, bold=False):
    return f'<p style="{P.replace("margin-bottom:16px", f"margin-bottom:{mb}px")}{"font-weight:bold;" if bold else ""}">{t}</p>'


def button(label, href):
    return f'''<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr><td bgcolor="#5a8bb3" style="background-color:#5a8bb3;border-radius:10px;">
<a href="{href}" style="display:inline-block;padding-top:14px;padding-bottom:14px;padding-left:24px;padding-right:24px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;">{label}</a>
</td></tr></table>'''


def graph():
    return f'''<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px;"><tr><td align="center" bgcolor="#f4f5f7" style="background-color:#f4f5f7;border-radius:10px;padding-top:16px;padding-bottom:12px;padding-left:16px;padding-right:16px;">
<img src="{GRAPH}" width="260" height="365" alt="Charlie's weigh-ins: up and down day to day, 16 lbs down over 8 weeks" border="0" style="display:block;width:260px;height:365px;border-radius:8px;">
<p style="margin-top:10px;margin-bottom:0;font-family:Arial, Helvetica, sans-serif;font-size:13px;line-height:18px;color:#5b6370;">Charlie G.'s weigh-ins. Up and down plenty of days, 16 lbs down in 8 weeks.</p>
</td></tr></table>'''


def bullets(items):
    return "".join(f'<p style="margin-top:0;margin-bottom:8px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:24px;color:#1f2328;">&bull; {t}</p>' for t in items) + '<div style="height:8px;line-height:8px;font-size:8px;">&nbsp;</div>'


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
<p style="margin-top:0;margin-bottom:0;font-family:Arial, Helvetica, sans-serif;font-size:12px;line-height:18px;color:#8d939e;">Vital Fusion Coaching &middot; 1802 Charolais Court, Bel Air, MD 21015<br>You're getting this because you asked for the free 60-day meal plan at vitalfusioncoaching.com.<br><a href="{{{{{{RESEND_UNSUBSCRIBE_URL}}}}}}" style="color:#8d939e;text-decoration:underline;">Unsubscribe</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>'''


PLANS = {
    "workday": {
        "name": "The 9-to-5 Plan",
        "prep": [
            "<strong>Cook both proteins at once.</strong> Chicken on one sheet pan, beef in a pan on the stove. One cleanup, 3–4 days of lunches and dinners.",
            "<strong>Make 3 jars of overnight oats at a time.</strong> Oats, protein powder and chia in each, then add the kiwi and almond butter in the morning.",
            "<strong>Frozen veggies and microwave rice cups count.</strong> Same food, half the work. Weigh them once and you're set.",
        ],
        "miss": "Stuck in a meeting and missed lunch? Don't double up at dinner. Just eat the next meal like normal. One missed meal changes nothing.",
        "life": "a packed workday",
    },
    "everyday": {
        "name": "The Everyday Plan",
        "prep": [
            "<strong>Batch the burrito bowls.</strong> Cook 3–4 days of chicken and rice at once, then build the bowls in containers with the salsa on the side.",
            "<strong>Salmon is a 20-minute sheet pan.</strong> Potatoes in first, salmon in for the last 12–15 minutes at 400&deg;F. Air fryer works too.",
            "<strong>Breakfast takes 10 minutes.</strong> Eggs and egg whites in one pan while the sourdough toasts. Frozen berries are fine for the yogurt bowl.",
        ],
        "miss": "Missed a meal? Don't double up at the next one. Just eat the next meal like normal. One missed meal changes nothing.",
        "life": "a busy week",
    },
}


def emails(slug, c):
    apply = f"{SITE}/?source=meal-plan-{slug}-email"
    e1 = wrap("".join([
        p("Hi {{{NAME}}},"),
        p("You've had the 1,800-calorie meal plan for a couple of days now. How's it going so far?"),
        p("The meals usually aren't the hard part. Prep is. Here are three shortcuts that make it a lot easier:"),
        bullets(c["prep"]),
        p(c["miss"]),
        p("Hit reply and tell me which meal has been the hardest to stick to. I read every reply and I'll help you fix it."),
        p("And if you'd rather have someone build all of this around your schedule and check in every week:", 12),
        button("See how 1:1 coaching works &rarr;", apply),
    ]))
    e2 = wrap("".join([
        p("Hi {{{NAME}}},"),
        p("Quick heads up before you step on the scale this week."),
        p("It's going to go up some days. A salty dinner, a hard workout, a bad night of sleep or a few more carbs can all hold water and push the number up a pound or two overnight. That's water, not fat."),
        p("Here's what that looks like on a real client:"),
        graph(),
        p("That's Charlie. Look at all the days it went up. If he'd quit on any one of them, he wouldn't have lost 16 lbs in 8 weeks. He kept going, and the trend kept going down."),
        p("So weigh in a few mornings a week, look at the weekly average, and pay attention to how your clothes fit and how much energy you have."),
        p("Want help reading your own numbers and knowing when to adjust? That's exactly what I do with my coaching clients.", 12),
        button("Apply for 1:1 coaching &rarr;", apply),
        p("Individual results vary.", 16).replace("color:#1f2328;", "color:#8d939e;").replace("font-size:16px", "font-size:13px"),
    ]))
    e3 = wrap("".join([
        p("Hi {{{NAME}}},"),
        p("You're a week into the plan. Be honest with me: is it getting easier or harder?"),
        p("If it's getting easier, awesome. Keep going. The next 7 weeks are where the real changes show up."),
        p(f"If it's getting harder, that's normal. You already know what to eat now. The hard part is sticking to it when life gets in the way: {c['life']}, a weekend away, a night you just don't feel like it. That's where most diets fall apart, and it's not because you're lazy."),
        p("That's what 1:1 coaching fixes:", 8),
        bullets([
            "Meals built around your schedule and the foods you actually like",
            "Workouts that fit the time you really have",
            "A weekly check-in, so someone notices before you fall off",
            "Changes when you plateau, travel or have a rough week",
        ]),
        p("It's how Charlie lost 16 lbs in 8 weeks without extreme dieting. If you want the same kind of help, apply below. It takes about 60 seconds and I review every application myself.", 20),
        button("Apply for 1:1 coaching &rarr;", apply),
        p("This is the last email I'll send you about the meal plan. Keep the PDF and keep going. And you can always just hit reply."),
    ]))
    return [e1, e2, e3]


META = {}
SUBJECTS = ["🍽️ How's it going so far? (+ 3 prep shortcuts)", "📉 Don't trust the scale this week", "🤔 Be honest with me…"]
for slug, c in PLANS.items():
    for i, h in enumerate(emails(slug, c), 1):
        open(os.path.join(HERE, f"{slug}-{i}.html"), "w").write(h)
        META[f"{slug}-{i}"] = SUBJECTS[i - 1]
json.dump(META, open(os.path.join(HERE, "subjects.json"), "w"), ensure_ascii=False, indent=1)
print("ok", list(META))
