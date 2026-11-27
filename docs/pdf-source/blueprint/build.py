"""Build The Busy Professional Blueprint PDF (Letter) from HTML with headless Chrome. Plain, readable layout: no cards or tiles."""
import base64, os, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "The-Blueprint.pdf")
APPLY = "https://vitalfusioncoaching.com/apply?source=blueprint"  # straight to the application
LOGO = "data:image/png;base64," + base64.b64encode(open(os.path.join(HERE, "vf-logo.png"), "rb").read()).decode()
PHOTO = os.path.join(HERE, "straight-arm-pulldown.jpg")  # Tyler's photo; a placeholder shows until it exists
DISCLAIMER = "General information, not medical advice. Check with your doctor before starting a new training, diet or supplement plan."

CSS = """
@page { size: 8.5in 11in; margin: 0 }
* { box-sizing: border-box }
html, body { margin: 0; padding: 0 }
body { font-family: Inter, Arial, sans-serif; color: #2b3038; font-size: 14.5px; line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.page { width: 8.5in; height: 11in; position: relative; overflow: hidden; page-break-after: always; background: #fff; padding: 0.6in 0.9in 0 }
.page:last-child { page-break-after: auto }
.cover { background: #0b0d12; color: #fff; padding: 0.8in 0.9in }
.cover img { width: 50px; height: 50px; border-radius: 11px; display: block }
.cover .mid { position: absolute; left: 0.9in; right: 0.9in; top: 2.9in }
.cover h1 { font-family: "Inter Display", Inter, sans-serif; font-size: 84px; line-height: .95; letter-spacing: -0.04em; font-weight: 800; margin: 0 0 26px }
.cover .sub { font-size: 20px; line-height: 1.4; color: #fff; font-weight: 600; margin: 0 0 10px; max-width: 5.2in }
.cover .desc { color: #9aa3b2; font-size: 15px; margin: 0 }
.cover .foot { position: absolute; left: 0.9in; bottom: 0.7in; color: #7d8594; font-size: 10.5px }
.hdr { display: flex; align-items: center; gap: 8px; font-size: 9.5px; color: #8a91a0; letter-spacing: .12em; text-transform: uppercase; font-weight: 700 }
.hdr img { width: 18px; height: 18px; border-radius: 4px }
.hdr span:last-child { margin-left: auto; font-weight: 500 }
.ftr { position: absolute; left: 0.9in; right: 0.9in; bottom: 0.45in; display: flex; justify-content: space-between; gap: 20px; font-size: 8.5px; color: #9aa1ad }
.eyebrow { color: #3d72a3; font-weight: 700; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; margin: 0.55in 0 6px }
h2 { font-family: "Inter Display", Inter, sans-serif; font-size: 38px; line-height: 1.08; letter-spacing: -0.03em; color: #0f1216; margin: 0 0 12px; font-weight: 800 }
h3 { font-size: 15px; color: #0f1216; font-weight: 700; margin: 26px 0 6px }
p { margin: 0 0 10px }
.lead { font-size: 16px; color: #4a515c; margin: 0 0 8px; max-width: 5.9in }
ul, ol { margin: 0 0 10px; padding-left: 20px }
li { margin-bottom: 5px }
b, strong { color: #0f1216; font-weight: 700 }
/* exercise table: just lines */
table { width: 100%; border-collapse: collapse; margin: 6px 0 4px }
th { text-align: left; font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase; color: #8a91a0; font-weight: 700; padding: 0 0 8px; border-bottom: 1.5px solid #0f1216 }
td { padding: 12px 0; border-bottom: 1px solid #e4e7ec; vertical-align: top }
td.n { width: 30px; color: #3d72a3; font-weight: 700 }
td.x b { font-size: 15px }
td.x span { display: block; color: #5b6370; font-size: 13px; line-height: 1.45; margin-top: 2px }
td.s, th.s { text-align: right; white-space: nowrap; font-weight: 700; color: #0f1216; font-size: 15px; width: 1.9in }
th.s { font-size: 9.5px; color: #8a91a0 }
td.s span { display: block; font-weight: 500; font-size: 12px; color: #5b6370 }
.big { display: flex; gap: 0.5in; margin: 14px 0 6px }
.big div b { display: block; font-family: "Inter Display", Inter, sans-serif; font-size: 40px; line-height: 1; letter-spacing: -0.03em; font-weight: 800 }
.big div span { font-size: 12px; color: #5b6370 }
.meal { margin-top: 13px }
.meal h3 { margin: 0 0 2px; font-size: 16px }
.meal h3 small { color: #3d72a3; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; margin-right: 8px }
.ing { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eceef2; font-size: 13px }
.ing span:last-child { color: #0f1216; font-weight: 600 }
.mac { font-size: 12.5px; color: #5b6370; margin: 4px 0 0 }
.mac b { font-weight: 700 }
.cols { display: flex; gap: 0.5in }
.cols > div { flex: 1 }
.cols h3 { margin-top: 16px }
.photo { float: right; width: 2.7in; margin: 0 0 8px 22px }
.photo img { width: 100%; display: block; border-radius: 6px }
.photo .ph { height: 2.2in; border: 1.5px dashed #b9c0cc; border-radius: 6px; display: flex; align-items: center; justify-content: center; text-align: center; color: #8a91a0; font-size: 11px; padding: 10px }
.photo p { font-size: 10.5px; color: #8a91a0; margin: 5px 0 0; line-height: 1.35 }
.wk { display: grid; grid-template-columns: repeat(7, 1fr); gap: 7px; margin: 10px 0 0 }
.wk .d { border: 1.5px solid #dfe3ea; border-radius: 8px; padding: 9px 8px 10px; min-height: 1.5in }
.wk .dn { display: block; font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase; font-weight: 700; color: #8a91a0; margin-bottom: 10px }
.wk b { display: block; font-size: 15px; line-height: 1.2 }
.wk .ds { display: block; font-size: 11.5px; line-height: 1.4; color: #5b6370; margin-top: 5px }
.wk .ds i { display: block; font-style: normal; font-weight: 700; margin-top: 6px }
.wk .lift { background: #0f1216; border-color: #0f1216 }
.wk .lift b { color: #fff } .wk .lift .dn { color: #8fbddf } .wk .lift .ds { color: #c3c9d4 } .wk .lift .ds i { color: #8fbddf }
.wk .cardio { background: #eaf2f9; border-color: #c9dcec }
.wk .cardio .dn { color: #3d72a3 }
.wk .rest b { color: #8a91a0 }
.btn { display: inline-block; margin: 14px 0 10px; background: #0f1216; color: #fff; font-weight: 700; font-size: 16px; padding: 15px 28px; border-radius: 8px; text-decoration: none }
.small { font-size: 12px; color: #6b7280 }
"""


def page(n, section, body):
    return (f'<section class="page"><div class="hdr"><img src="{LOGO}"><span>The Busy Professional Blueprint</span><span>{section}</span></div>'
            f'{body}<div class="ftr"><span>{DISCLAIMER}</span><span>{n}</span></div></section>')


def ex(rows):
    out = '<table><tr><th></th><th>Exercise</th><th class="s">Sets × reps</th></tr>'
    for i, (name, note, sets, sub) in enumerate(rows, 1):
        out += (f'<tr><td class="n">{i}</td><td class="x"><b>{name}</b>{f"<span>{note}</span>" if note else ""}</td>'
                f'<td class="s">{sets}{f"<span>{sub}</span>" if sub else ""}</td></tr>')
    return out + "</table>"


cover = f'''<section class="page cover"><img src="{LOGO}">
<div class="mid"><h1>The Busy<br>Professional<br>Blueprint</h1>
<p class="sub">Training, nutrition, cardio and recovery for men working a full-time job.</p>
<p class="desc">The best way to get shredded in 90 days.</p></div>
<div class="foot">Tyler · Vital Fusion Coaching · vitalfusioncoaching.com</div></section>'''

overview = page(2, "Start here", '''
<p class="eyebrow">Start here</p><h2>The whole plan<br>on one page</h2>
<p class="lead">You have a full-time job, so this is built to fit around one. Four things, done every week:</p>
<ol>
<li><b>Lift 3 days a week.</b> Day 1 is chest, shoulders and triceps. Day 2 is back and biceps. Day 3 is legs and abs.</li>
<li><b>Do cardio 3 to 4 times a week.</b> 20 minutes on the StairMaster or incline treadmill, plus a 10-minute walk after meals.</li>
<li><b>Eat the 1,800-calorie meal plan.</b> Same four meals every day, with a grocery list for the week.</li>
<li><b>Recover.</b> Sleep, plus a few basic supplements.</li>
</ol>
<p>Do all four and this is the best way to get shredded in 90 days.</p>
<h3>How heavy should you go?</h3>
<p>Pick a weight that makes the last 2 reps of every set hard while your form stays clean. Where it says <b>go heavy</b>, push it: the last rep should be a fight.</p>
<p>When you hit the top of the rep range on every set, add a little weight next time.</p>
<h3>Warm up before every workout</h3>
<ul>
<li>Start with <b>5 minutes of easy cardio</b> (a walk on the treadmill or the bike) to get warm.</li>
<li>Before any exercise marked <b>go heavy</b>, do 1 or 2 lighter sets first. They don't count toward your sets.</li>
<li>Each workout page has warm-up tips for that day.</li>
</ul>
<p>Each workout shouldn't take longer than 45 minutes. Page 7 shows two ways to fit the week around your job.</p>''')

day1 = page(3, "Training", f'''
<p class="eyebrow">Day 1</p><h2>Chest, shoulders<br>and triceps</h2>
<h3>Warm-up</h3>
<ul>
<li>5 minutes of easy cardio.</li>
<li>20 arm circles forward and 20 back, to loosen up your shoulders.</li>
<li>Start the cable flies light. They're first on purpose, to get blood into your chest before the heavy pressing.</li>
<li>Do 1 or 2 lighter sets of incline press before your 3 heavy sets.</li>
</ul>
<h3>The workout</h3>
{ex([
    ("Cable chest fly", "Gets the blood flowing. Squeeze your chest at the end of each rep.", "3 × 12–15", ""),
    ("Incline dumbbell bench press", "", "3 × 10–12", "Go heavy"),
    ("Lateral raise", "", "3 × 12–15", ""),
    ("Machine shoulder press", "", "2 × 8–10", "Go heavy"),
    ("Triceps rope extension", "", "4 × 12", ""),
])}''')

photo = (f'<img src="data:image/jpeg;base64,{base64.b64encode(open(PHOTO, "rb").read()).decode()}">' if os.path.exists(PHOTO)
         else '<div class="ph">Tyler\'s straight-arm pulldown photo goes here</div>')
day2 = page(4, "Training", f'''
<p class="eyebrow">Day 2</p><h2>Back and biceps</h2>
<div class="photo">{photo}<p>Straight-arm pulldown, also called a cable pullover: start (left) and finish (right).</p></div>
<h3 style="margin-top:14px">Warm-up</h3>
<ul>
<li>5 minutes of easy cardio.</li>
<li>Hang from a pull-up bar for 20 to 30 seconds to stretch your lats and shoulders.</li>
<li>Do 1 light set of lat pulldowns before your first real set.</li>
<li>Do 1 or 2 lighter sets of rows before your 3 heavy sets.</li>
</ul>
<h3 style="clear:both">The workout</h3>
{ex([
    ("Lat pulldown", "", "3 × 12–15", ""),
    ("Seated cable row", "A chest-supported row is even better if your gym has one.", "3 × 10", "Go heavy"),
    ("Straight-arm pulldown", "Also called a cable pullover. See the photo above.", "3 × 12", ""),
    ("Rear delt fly (machine)", "", "3 × 12", ""),
    ("Barbell biceps curl", "", "2 × 12", ""),
    ("Hammer curl", "", "2 × 12", ""),
])}''')

day3 = page(5, "Training", f'''
<p class="eyebrow">Day 3</p><h2>Legs and abs</h2>
<h3>Warm-up</h3>
<ul>
<li>5 minutes on the bike or an easy incline walk.</li>
<li>15 bodyweight squats and 10 leg swings on each leg.</li>
<li>Your first set of leg press is a light warm-up set of 15. It doesn't count toward your 3 sets.</li>
</ul>
<h3>The workout</h3>
{ex([
    ("Leg press", "Do 1 warm-up set of 15 first.", "3 × 10–12", ""),
    ("Leg extension", "For your quads.", "3 × 10–12", ""),
    ("Leg curl", "For your hamstrings.", "3 × 10–12", ""),
])}
<h3>Ab circuit: 3 rounds</h3>
<p>Do all three back to back. That's one round.</p>
{ex([
    ("Crunches", "", "20", ""),
    ("Leg raises", "Use the leg raise station with the back pad and armrests, not hanging from a bar.", "10–15", ""),
    ("Plank", "", "1 minute", ""),
])}''')

cardio = page(6, "Cardio", '''
<p class="eyebrow" style="font-size:20px;letter-spacing:.14em;margin-bottom:10px">Cardio</p><h2>20 minutes,<br>3 to 4 times a week</h2>
<p class="lead">Pick one of these two.</p>
<table><tr><th></th><th>Machine</th><th class="s">Settings</th></tr>
<tr><td class="n">1</td><td class="x"><b>StairMaster</b><span>A steady pace you can hold for the full 20 minutes.</span></td><td class="s">20 minutes</td></tr>
<tr><td class="n">2</td><td class="x"><b>Incline treadmill</b><span>A walk, not a run. Try not to hold the handrails.</span></td><td class="s">20 minutes<span>Incline 10–12, speed 3 mph</span></td></tr></table>
<p style="margin-top:18px">You can do other forms of cardio, but these are the ones that will get you shredded the fastest.</p>
<h3>When to do it</h3>
<p>Right after you lift, or on a day you don't lift. Either works, so do whichever fits your schedule. The next page has two sample weeks.</p>
<h3>Walk for 10 minutes after meals</h3>
<p>Take a 10-minute walk after you eat. This is on top of your cardio sessions, not instead of them.</p>
<p>It gets you out of your chair and adds extra steps to every day. A lap around the office or the block counts.</p>''')


def wk(days):
    out = '<div class="wk">'
    for d, kind, title, sub in days:
        out += f'<div class="d {kind}"><span class="dn">{d}</span><b>{title}</b><span class="ds">{sub}</span></div>'
    return out + "</div>"


L1, L2, L3 = "Chest, shoulders, triceps", "Back and biceps", "Legs and abs"
week = page(7, "Sample week", f'''
<p class="eyebrow">Sample week</p><h2>Two ways to fit it in</h2>
<p class="lead">Each workout shouldn't take longer than 45 minutes. Cardio is 20 minutes. Pick the week that fits your job.</p>
<h3 style="margin-top:30px">Option 1: Monday, Wednesday, Friday</h3>
<p>Lift three days, and do your cardio right after each workout.</p>
{wk([
    ("Mon", "lift", "Day 1", L1 + "<i>+ 20 min cardio</i>"),
    ("Tue", "rest", "Rest", ""),
    ("Wed", "lift", "Day 2", L2 + "<i>+ 20 min cardio</i>"),
    ("Thu", "rest", "Rest", ""),
    ("Fri", "lift", "Day 3", L3 + "<i>+ 20 min cardio</i>"),
    ("Sat", "rest", "Rest", "Or a 4th cardio session"),
    ("Sun", "rest", "Rest", ""),
])}
<h3 style="margin-top:38px">Option 2: Weekends, if your work week is busy</h3>
<p>Lift Saturday and Sunday, then pick one weekday for Day 3. Do your cardio right after each workout.</p>
{wk([
    ("Mon", "rest", "Rest", ""),
    ("Tue", "rest", "Rest", "Or a 4th cardio session"),
    ("Wed", "lift", "Day 3", L3 + "<i>+ 20 min cardio</i>"),
    ("Thu", "rest", "Rest", ""),
    ("Fri", "rest", "Rest", ""),
    ("Sat", "lift", "Day 1", L1 + "<i>+ 20 min cardio</i>"),
    ("Sun", "lift", "Day 2", L2 + "<i>+ 20 min cardio</i>"),
])}
<p class="small" style="margin-top:12px">Wednesday is an example. Use whichever weekday is lightest at work.</p>
<p style="margin-top:30px">These are examples. Any 3 days work, as long as you get all 3 workouts and 3 to 4 cardio sessions in every week.</p>''')

MEALS = [
    ("Meal 1", "Overnight oats", "Make it the night before.", [("Rolled oats (dry)", "60 g · about ⅔ cup"), ("Whey protein", "1 scoop (30 g)"), ("Chia seeds", "12 g · 1 tbsp"), ("Kiwi, sliced", "1 medium"), ("Almond butter", "16 g · 1 tbsp")], (550, 38, 63, 18)),
    ("Meal 2", "Desk lunch", "Pack it ahead.", [("Chicken breast (cooked)", "200 g · about 7 oz"), ("White rice (cooked)", "75 g · just over ⅓ cup"), ("Veggies of your choice", "150 g · about 1½ cups")], (480, 68, 32, 8)),
    ("Meal 3", "Dinner", "", [("93/7 lean ground beef (cooked)", "150 g · about 5.3 oz"), ("Sweet potato (baked)", "200 g · 1 medium"), ("Veggies of your choice", "150 g · about 1½ cups")], (522, 48, 52, 15)),
    ("Meal 4", "Greek yogurt bowl", "", [("2% plain Greek yogurt", "250 g · about 1 cup"), ("Mixed berries", "125 g · about ¾ cup"), ("Honey", "1 tsp")], (269, 26, 30, 5)),
]
tot = [sum(m[4][i] for m in MEALS) for i in range(4)]
assert tot == [1821, 180, 177, 46], tot  # the 9-to-5 plan with more chicken and less rice at lunch (Tyler, Nov 26): 180 g protein


def meal(m):
    lab, name, note, ings, (cal, p, c, f) = m
    rows = "".join(f'<div class="ing"><span>{a}</span><span>{b}</span></div>' for a, b in ings)
    return (f'<div class="meal"><h3><small>{lab}</small>{name}</h3>{rows}'
            f'<p class="mac"><b>{cal} calories</b> · {p} g protein · {c} g carbs · {f} g fat</p></div>')


nutrition = page(8, "Nutrition", f'''
<p class="eyebrow" style="margin-top:0.4in">Nutrition</p><h2>The 1,800-calorie meal plan</h2>
<p class="lead">This meal plan is 1,800 calories, and it's made to get you shredded fast. It's not sustainable long term, but follow it exactly and you will get lean.</p>
<p>Same four meals every day: about <b>1,820 calories</b> and <b>180 g of protein</b>. Amounts are cooked weights unless it says dry.</p>
{"".join(meal(m) for m in MEALS)}
<p class="small" style="margin-top:10px">Season everything however you like. Spices, hot sauce, mustard and salsa are free.</p>''')

grocery = page(9, "Nutrition", '''
<p class="eyebrow">Grocery list</p><h2>What to buy<br>for one week</h2>
<p class="lead">Everything for 7 days of the meal plan. Raw meat shrinks about 25% when you cook it, and these amounts already account for that.</p>
<div class="cols"><div>
<h3>Protein</h3>
<ul><li>Chicken breast: about 4 lb raw</li><li>93/7 lean ground beef: about 3 lb raw</li><li>Whey protein: 7 scoops</li><li>2% plain Greek yogurt: two 32 oz tubs</li></ul>
<h3>Carbs</h3>
<ul><li>Rolled oats: one 18 oz canister</li><li>White rice: about ½ lb dry</li><li>Sweet potatoes: 7 medium (about 3 lb)</li></ul>
</div><div>
<h3>Fruit and veggies</h3>
<ul><li>Kiwis: 7</li><li>Mixed berries: about 2 lb (frozen is fine)</li><li>Veggies of your choice: about 4½ lb (fresh or frozen)</li></ul>
<h3>Other</h3>
<ul><li>Chia seeds: one small bag</li><li>Almond butter: one jar</li><li>Honey</li><li>Seasonings you like</li></ul>
</div></div>
<h3 style="margin-top:30px">Prep twice a week</h3>
<p>Sunday and Wednesday, about an hour each.</p>
<ol>
<li>Cook the chicken and ground beef for the next 3 to 4 days.</li>
<li>Cook a big batch of rice and bake the sweet potatoes.</li>
<li>Roast or steam the veggies. Frozen bags save time.</li>
<li>Pack lunches (chicken, rice, veggies) and dinners (beef, sweet potato, veggies).</li>
</ol>
<p>Each night, mix tomorrow's oats, protein powder and chia with about 1 cup of water or milk. Add the kiwi and almond butter in the morning.</p>''')

recovery = page(10, "Recovery", '''
<p class="eyebrow">Recovery</p><h2>Recovery, supplements<br>and sleep</h2>
<p class="lead">You don't get leaner in the gym. You get leaner when you recover from it.</p>
<h3>Recovery</h3>
<ul>
<li><b>Sleep at least 7 hours.</b> It's when your muscles repair, and being short on sleep makes you hungrier the next day.</li>
<li><b>Drink water all day.</b> Keep a bottle at your desk.</li>
<li><b>Walk on the days you don't lift.</b> It helps with soreness and burns a few more calories.</li>
</ul>
<h3>Daily supplements</h3>
<table><tr><th></th><th>Supplement</th><th class="s">How much</th></tr>
<tr><td class="n">1</td><td class="x"><b>Multivitamin</b></td><td class="s">1 a day</td></tr>
<tr><td class="n">2</td><td class="x"><b>Fish oil</b></td><td class="s">3 g a day</td></tr>
<tr><td class="n">3</td><td class="x"><b>Creatine</b><span>It doesn't matter when you take it. Just take it every day.</span></td><td class="s">5 g a day</td></tr>
<tr><td class="n">4</td><td class="x"><b>Caffeine (optional)</b><span>It can help suppress your appetite and give you better gym performance.</span></td><td class="s">200–400 mg a day<span>Don't go over 400 mg</span></td></tr></table>
<h3>For sleep</h3>
<p>I recommend taking both of these before bed.</p>
<table><tr><th></th><th>Supplement</th><th class="s">How much</th></tr>
<tr><td class="n">1</td><td class="x"><b>Magnesium glycinate</b></td><td class="s">400–600 mg</td></tr>
<tr><td class="n">2</td><td class="x"><b>L-theanine</b></td><td class="s">400 mg</td></tr></table>''')

cta = page(11, "What's next", f'''
<p class="eyebrow">What's next</p><h2>Want this built<br>around you?</h2>
<p class="lead">The Busy Professional Blueprint works if you follow it. Following it by yourself, with a full-time job, is the hard part.</p>
<p>With 1:1 coaching, I build the plan around your schedule and check in with you every week:</p>
<ul>
<li>Training that fits the days and time you actually have</li>
<li>Meals built around the foods you like and your workday</li>
<li>Weekly check-ins, so someone notices before you fall off</li>
<li>Changes when you plateau, travel or have a rough week</li>
</ul>
<a class="btn" href="{APPLY}">Apply for 1:1 coaching →</a>
<p class="small">Takes about 60 seconds. I review every application myself.</p>
<p style="margin-top:40px">Tyler<br><span class="small">Vital Fusion Coaching</span></p>''')

html = (f'<!doctype html><html><head><meta charset="utf-8"><title>The Busy Professional Blueprint · Vital Fusion Coaching</title>'
        f'<style>{CSS}</style></head><body>{cover}{overview}{day1}{day2}{day3}{cardio}{week}{nutrition}{grocery}{recovery}{cta}</body></html>')
open(os.path.join(HERE, "blueprint.html"), "w").write(html)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto("file://" + os.path.join(HERE, "blueprint.html"))
    pg.evaluate("document.fonts.ready")
    gaps = pg.evaluate("""() => [...document.querySelectorAll('.page')].map((p, i) => {
        const f = p.querySelector('.ftr'); if (!f) return null;
        const last = [...p.children].filter(c => !c.classList.contains('ftr')).pop();
        return [i + 1, Math.round(f.getBoundingClientRect().top - last.getBoundingClientRect().bottom)]; })""")
    print("space above footer (px):", gaps)
    assert all(g is None or g[1] > 12 for g in gaps), "overflow"
    pg.pdf(path=OUT, width="8.5in", height="11in", print_background=True, margin={k: "0" for k in ("top", "bottom", "left", "right")})
    b.close()
print("wrote", OUT)
