"""Builds the 5 follow-up emails for the free Blueprint guide (day 2, 4, 7, 10, 14).
Run: python3 docs/email-templates/blueprint/build.py  → writes blueprint-<n>.html + subjects.json next to this file.
The live copies are Resend templates "Blueprint <n> – ..." used by the automation on `blueprint.signed_up`."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = "https://vitalfusioncoaching.com"
APPLY = f"{SITE}/?source=blueprint-email"
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
<p style="margin-top:0;margin-bottom:0;font-family:Arial, Helvetica, sans-serif;font-size:12px;line-height:18px;color:#8d939e;">Vital Fusion Coaching &middot; 1802 Charolais Court, Bel Air, MD 21015<br>You're getting this because you asked for The Blueprint at vitalfusioncoaching.com.<br><a href="{{{{{{RESEND_UNSUBSCRIBE_URL}}}}}}" style="color:#8d939e;text-decoration:underline;">Unsubscribe</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>'''


HI = p("Hi {{{NAME}}},")
B = lambda t: f"<strong>{t}</strong>"
I = lambda t: f"<em>{t}</em>"
U = lambda t: f'<span style="text-decoration:underline;">{t}</span>'

EMAILS = [
    ("💪 Did you do Day 1 yet?", "".join([
        HI,
        p("You've had The Blueprint for two days.", 6),
        p(B("So, did you do Day 1 yet?")),
        p("If you did, good. Keep going."),
        p("If you didn't, let me guess why.", 6),
        p("Work ran late. You got home tired.", 6),
        p(f"And you told yourself, {I('“I’ll start Monday.”')}"),
        p("Here's the thing:", 6),
        p(f"{B('Day 1 is 5 exercises.')} You're in and out in under an hour."),
        p("You don't need a perfect week to start.", 6),
        p(f"You need {U(B('one workout.'))}"),
        p("So pick a day in the next 48 hours and put it on your calendar like a meeting."),
        p(f"Then hit reply and tell me: {I('what day are you doing Day 1?')} I read every reply."),
        button("See how 1:1 coaching works"),
    ])),
    ("⏰ You don't have a time problem", "".join([
        HI,
        p("Most guys I talk to tell me the same thing:", 6),
        p(I("“I just don’t have time.”")),
        p("I get it. Full-time job, a commute, maybe kids."),
        p("But look at what The Blueprint actually asks for:", 8),
        bullets([
            "3 workouts",
            "3 to 4 cardio sessions, 20 minutes each",
        ]),
        p(B("That's a few hours out of a 168-hour week.")),
        p("So it's not really about time.", 6),
        p(f"It's that after a long day, {B('the gym is the first thing to go.')}"),
        p("A meeting runs over. A client dinner pops up.", 6),
        p(f"You skip once, then twice, and {U('the week is gone.')}"),
        p("I work a desk job in sales. Long days, work lunches, happy hours.", 6),
        p(f"I still stay in shape, because my training is {B('built around my work week')} instead of fighting it."),
        p(f"{B('That’s what I do for my clients.')} I build the plan around the life you actually have."),
        button("See how 1:1 coaching works"),
    ])),
    ("🍽️ The part most guys skip", "".join([
        HI,
        p("You're one week in.", 6),
        p(f"My guess: {B('the workouts are going better than the meal plan.')}"),
        p("Lifting is the fun part.", 6),
        p("Eating the same four meals when the office orders pizza is the hard part."),
        p("But here's the truth:", 6),
        p(I("You can't out-train your diet.")),
        p("The training builds the muscle.", 6),
        p(B("The meal plan is what makes you lean.")),
        p("Here's where it usually falls apart:", 8),
        bullets([
            "The work lunch you didn't plan for",
            "Drinks on Friday",
            f"The weekend, when there's {U('no routine')}",
        ]),
        p("None of that makes you weak.", 6),
        p(f"It means you need {B('a plan for those moments')}, not just a plan for the perfect day."),
        p("The Blueprint is the fast version. Coaching is the version built around your life.", 6),
        p(f"Charlie lost {B('16 lbs in 8 weeks')} without extreme dieting, still eating the foods he loves. {I('He had a plan for the messy days too.')}"),
        graph(),
        button("Apply for 1:1 coaching"),
        small("Individual results vary."),
    ])),
    ("😤 This is where most guys quit", "".join([
        HI,
        p("It's day 10.", 6),
        p(B("This is right around where most guys quit.")),
        p("The first week is easy. It's new and you're motivated."),
        p("Then real life shows up:", 8),
        bullets([
            "The scale doesn't move for a few days",
            "You're sore and work gets busy",
            f"And {B('nobody notices if you skip')}",
        ]),
        p(I("That last one is the real problem.")),
        p("At work you have a boss, deadlines and people counting on you.", 6),
        p(B("That's why you show up.")),
        p(f"With your body, {U('nobody’s checking.')}", 6),
        p("So it's always the first thing you drop."),
        p("My clients don't have more willpower than you.", 6),
        p(f"They have {B('someone checking in every week')} and a plan that changes when life does."),
        p(f"If the scale is stuck or you've missed a few days, {B('hit reply and tell me where you’re at.')} I'll point you in the right direction."),
        button("Apply for 1:1 coaching"),
    ])),
    ("📅 Two weeks in. Where are you at?", "".join([
        HI,
        p("It's been two weeks since you got The Blueprint.", 6),
        p(B("Be straight with yourself: where are you at?")),
        p("If you've followed it, keep going. You're on the right track."),
        p("If you started strong and fell off, or never started, you're not the only one.", 6),
        p(I("And it's not because the plan is bad.")),
        p(B("You already have the plan. What's missing is:"), 8),
        bullets([
            f"{B('A plan built around your schedule:')} your work week, your gym and the foods you like",
            f"{B('Someone checking in every week,')} so a missed day doesn't turn into a missed month",
            f"{B('Changes when work gets crazy,')} instead of starting over",
        ]),
        p(f"60 days from now you could be {U('leaner, stronger and confident with your shirt off.')}", 6),
        p(f"Or you could be right here, {I('with the same PDF sitting in your downloads.')}"),
        p(f"{B('If you want help doing this for real, apply below.')} It takes about 60 seconds, and I review every application myself."),
        button("Apply for 1:1 coaching"),
        p("This is the last email I'll send you about The Blueprint. Keep it, use it, and you can always just hit reply."),
    ])),
]

if __name__ == "__main__":
    subjects = {}
    for i, (subject, body) in enumerate(EMAILS, start=1):
        open(os.path.join(HERE, f"blueprint-{i}.html"), "w").write(wrap(body))
        subjects[f"blueprint-{i}"] = subject
    json.dump(subjects, open(os.path.join(HERE, "subjects.json"), "w"), indent=2, ensure_ascii=False)
