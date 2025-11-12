# Lead Management & Conversion System

## Overview

Your coaching system now includes a complete lead generation and conversion pipeline. This allows you to:
- Offer free meal demos to prospects
- Track all lead interactions
- Monitor conversion from demo → call → paid client
- Analyze which lead sources work best

---

## How It Works

### The Lead Journey

```
1. Lead fills out "Free Meal Demo" form
   ↓
2. Submission auto-syncs to Lead Pool tab
   ↓
3. Lead Dashboard automatically updates their stats
   ↓
4. Coach reviews meal and sends feedback
   ↓
5. Lead books call (coach marks in dashboard)
   ↓
6. Call happens, lead converts (or doesn't)
   ↓
7. Coach clicks "Convert to Client" button
   ↓
8. Lead now tracked as paid client in Timeline Master
```

---

## Setting Up Your Free Demo Form

### Option 1: Google Forms (Recommended)

**Create a new Google Form with these fields:**

1. **Lead Email** (Email question type)
2. **Lead Name** (Short answer)
3. **Submission Time** (Auto-captured by Google Forms)
4. **Meal Name** (Short answer)
   - Example: "Grilled chicken salad"
5. **Core Ingredients** (Short answer)
   - Example: "Chicken breast, romaine, tomatoes"
6. **Added Ingredients** (Optional - Short answer)
   - Example: "Caesar dressing, parmesan"
7. **Cooking Method** (Dropdown)
   - Options: Raw, Grilled, Baked, Fried, Steamed, Other
8. **Portions** (Short answer)
   - Example: "1 serving" or "350g"
9. **Image URL** (Short answer)
   - Instructions: "Upload your meal photo to Google Drive and paste the link here"
   - Or use Google Form file upload (but URL is cleaner)
10. **Question/Goal** (Paragraph)
    - Example: "What are you trying to achieve with your nutrition?"
11. **Lead Source** (Dropdown)
    - Options: Instagram, Facebook, LinkedIn, Referral, Other

**Form Settings:**
- Title: "Free Meal Analysis by [Your Name]"
- Description: "Get expert feedback on one meal for free!"
- Collect email addresses: ✓
- Response destination: Link to your Master Sheet (new tab)

### Option 2: Jotform or Typeform

Same fields as above. Just ensure the response tab is named something like "Free Demo Submissions" and includes "Lead" in a column header.

---

## Tab Structure

### Lead Pool Tab

**Automatically created by setupCoachMaster()**

Stores all free demo submissions from leads.

**Columns:**
1. Lead Email
2. Lead Name
3. Submission Time
4. Meal Name
5. Core Ingredients
6. Added Ingredients
7. Cooking Method
8. Portions
9. Image URL
10. Question/Goal
11. Submission ID

**What happens here:**
- Auto-populated from any form with "lead" in column headers
- Each row = one free demo request
- Same lead can have multiple rows (if they submit multiple demos)

### Lead Dashboard Tab

**The coach's control center for managing leads.**

**Columns:**
1. **Lead Email** - Unique identifier
2. **Lead Name** - Their name
3. **First Contact** - Date of first demo submission
4. **Free Demos Given** - Count of demos sent (auto-calculated)
5. **Last Demo Date** - Most recent demo submission
6. **Call Booked** - Yes/No (coach manually marks)
7. **Call Date** - When the call is scheduled
8. **Call Completed** - Yes/No (coach marks after call)
9. **Converted to Client** - Yes/No (auto-set when you click "Convert to Client")
10. **Conversion Date** - Date they became a paying client
11. **Lead Source** - Where they came from (Instagram, etc.)
12. **Status** - Dropdown: New Lead, Demo Sent, Call Booked, Call Completed, Converted, Lost
13. **Notes** - Coach's private notes

**What happens here:**
- One row per unique email address
- Auto-updates every hour when sync runs
- Coach manually updates Call Booked, Status, Notes

---

## Coach Workflow

### Step 1: Lead Submits Free Demo

**What you see:**
- New row appears in Lead Pool tab (usually within 1 hour of submission)
- Lead Dashboard updates with their stats

**What you do:**
Nothing yet - automation handles it.

### Step 2: Review and Respond to Demo

**Manual Process (Recommended):**

1. Open Lead Pool tab
2. Find the new submission (sorted by Submission Time, newest first)
3. Look at their meal details and image
4. Write a 2-3 paragraph analysis:

**Email Template:**
```
Subject: Your Free Meal Analysis from [Your Name]

Hi [Lead Name],

Thanks for submitting your [Meal Name] for analysis! Here's what I noticed:

**The Good:**
[Positive feedback - e.g., "Great protein source with the chicken,
and I love that you're including vegetables"]

**Opportunity for Improvement:**
[Constructive feedback - e.g., "The Caesar dressing might be adding
200-300 hidden calories. Try using half the amount, or switch to
a vinaigrette to save 150 calories while boosting flavor."]

**Next Steps:**
If you want personalized meal plans and weekly feedback like this,
I have 2 spots open for new clients this month. Book a free 15-min
call to learn more: [Your Calendly Link]

Best,
[Your Name]
```

5. Send the email manually (or set up Gmail templates)

**Pro Tips:**
- **Speed matters:** Respond within 24 hours max (same day is best)
- **Be specific:** Don't just say "good job" - explain WHY
- **End with CTA:** Always include a call booking link
- **Use images:** If their photo is good, include it in your reply

### Step 3: Mark Status in Lead Dashboard

After sending demo feedback:

1. Go to Lead Dashboard tab
2. Find their row
3. Update **Status** column to "Demo Sent"
4. Add any notes (e.g., "Responded within 2 hours, very engaged")

### Step 4: Lead Books a Call

When a lead responds and wants to book a call:

**Option A: Use the Menu Button**
1. Select the lead's row in Lead Dashboard
2. Click **"Coach Actions"** menu → **"Mark Call Booked"**
3. Enter the call date/time (e.g., "2025-01-20 3:00 PM")
4. System automatically:
   - Sets Call Booked = "Yes"
   - Fills in Call Date
   - Updates Status to "Call Booked"

**Option B: Manual Update**
1. Change **Call Booked** to "Yes"
2. Enter **Call Date**
3. Change **Status** to "Call Booked"

### Step 5: Conduct the Sales Call

**Call Agenda (15 minutes):**

1. **Introduction (2 min):** Build rapport
2. **Their Goals (5 min):** Ask about their nutrition/fitness goals
3. **Demo Discussion (3 min):** Reference the meal you analyzed
4. **Solution Presentation (3 min):** Show them what working together looks like
   - **PRO TIP:** Share your Looker Studio dashboard during the call!
   - "This is what YOUR dashboard will look like - track every meal,
     see your scores improve, get weekly reports..."
5. **Close (2 min):** Ask for the sale
   - "I have 2 options: $250/month for unlimited tracking and weekly calls,
     or $400/month for that plus custom workout programming. Which
     works better for you?"

**After the call:**
1. Update **Call Completed** to "Yes"
2. Update **Status**:
   - If they said yes: Keep as "Call Completed" (you'll convert next)
   - If they said no: "Lost"
   - If they need time: "Call Completed" + add note "Follow up in 3 days"

### Step 6: Convert Lead to Client

**When they agree to become a paying client:**

1. Go to Lead Dashboard
2. Select the lead's row
3. Click **"Coach Actions"** menu → **"Convert Lead to Client"**
4. System automatically:
   - Sets Converted to Client = "Yes"
   - Fills in Conversion Date (today)
   - Changes Status to "Converted"

**Then:**
5. Add them to **Client Details** tab (manually)
   - Copy their email
   - Fill in all client onboarding info (age, goals, macros, etc.)
6. Send them your client onboarding email with instructions

**Now they're in the system as a paying client!**

---

## Lead Source Tracking

### Why It Matters

You need to know which marketing channels actually work.

**Example:**
- Instagram free demos: 40 leads → 8 conversions (20% rate)
- Facebook free demos: 60 leads → 6 conversions (10% rate)
- Referrals: 10 leads → 5 conversions (50% rate)

**Insight:** Focus more on Instagram + referrals, less on Facebook.

### How to Track

**Option 1: Form Field**
Add "Lead Source" dropdown to your free demo form.

**Option 2: Use Different Forms**
- Instagram leads → Form 1 (auto-labeled)
- Facebook leads → Form 2
- Etc.

**Option 3: Manual Entry**
After each demo, manually fill in Lead Source column in Lead Dashboard.

---

## Automation & Sync

### How Often Does Data Update?

**Automatic hourly sync:**
- Every hour, `runCoachMasterSync()` runs
- Pulls new leads from forms into Lead Pool
- Updates Lead Dashboard stats (demo count, last demo date)

**Manual sync:**
- Click "Coach Actions" → "Run Full Sync"
- Forces immediate update

### What's Automated vs Manual?

**✅ Automated:**
- Lead form submissions → Lead Pool
- Lead Pool → Lead Dashboard stats calculation
- Demo count, first/last contact dates
- Free Demos Given column

**❌ Manual (Coach must do):**
- Sending demo feedback emails
- Marking Call Booked
- Marking Call Completed
- Converting to Client
- Filling in Lead Source (unless in form)
- Status updates
- Notes

---

## Marketing Strategies for Lead Gen

### Social Media Content Ideas

**Instagram/TikTok Posts:**

**Post 1: Before/After Meal Scoring**
```
"I analyzed this 'healthy' smoothie bowl and found 3 mistakes
costing 400+ calories 🍓

Want me to analyze YOUR meal? Free demo - link in bio!"

[Include image of the meal with annotations]
```

**Post 2: Common Mistakes Series**
```
"5 'healthy' foods that are sabotaging your fat loss:
1. Granola (500 cal/cup!)
2. Acai bowls
3. Trail mix
4. ...

DM me for a free meal analysis ✉️"
```

**Post 3: Client Transformation**
```
"Sarah lost 15 lbs in 8 weeks by fixing her 'healthy' breakfast

Here's what we changed... [explain]

Want results like this? I'm taking 3 new clients - free demo
to see if we're a fit. Link in bio 🔗"
```

### Lead Magnet Landing Page

**Simple Google Site or Carrd.co page:**

**Headline:** "Get a Free Meal Analysis from [Coach Name]"

**Subhead:** "Find out what's secretly sabotaging your progress"

**Bullets:**
- ✓ Expert feedback on one meal
- ✓ Personalized calorie & macro breakdown
- ✓ Specific improvements you can make today
- ✓ No strings attached

**CTA Button:** "Get My Free Analysis" → Links to Google Form

### Paid Ads (If Budget Allows)

**Facebook/Instagram Ads:**
- Audience: 25-45, interested in fitness, nutrition, weight loss
- Creative: Before/after meal images with text overlay
- CTA: "Get Free Meal Analysis"
- Budget: $10/day = ~20 leads/week at $3.50 cost per lead
- If you convert 15% = 3 new clients/week @ $250/mo = $750/mo revenue
- Ad spend: $300/mo → ROI: 2.5x

---

## Looker Studio Lead Dashboard

### Key Metrics to Display

**Funnel Visualization:**
```
100 Leads
  ↓
50 Demos Sent (50% response rate)
  ↓
20 Calls Booked (40% call booking rate)
  ↓
15 Calls Completed (75% show rate)
  ↓
6 Converted (40% close rate)

Overall: 6% conversion rate
```

**Lead Source ROI Table:**

| Source    | Leads | Converted | Rate | Revenue |
|-----------|-------|-----------|------|---------|
| Instagram | 40    | 8         | 20%  | $2,000  |
| Referral  | 10    | 5         | 50%  | $1,250  |
| Facebook  | 60    | 6         | 10%  | $1,500  |

### Real-Time Lead Tracker

**Table showing:**
- Leads with status "Demo Sent" but no call booked (follow up!)
- Leads with call booked in next 48 hours (prepare!)
- Leads stuck at "Call Completed" for 5+ days (close or mark lost!)

---

## Troubleshooting

### Lead not showing up in Lead Pool

**Check:**
1. Does the form response tab have "lead" in a column header?
2. Is there an Email and Timestamp column?
3. Has the hourly sync run? (Check last modified time on Lead Pool tab)
4. Run manual sync: Coach Actions → Run Full Sync

### Lead Dashboard not updating stats

**Fix:**
1. Check Lead Pool has data
2. Email addresses must match exactly (case-insensitive)
3. Run manual sync

### Can't mark call booked

**Check:**
1. Are you on the Lead Dashboard tab?
2. Did you select a row (not just click on the sheet)?
3. Selected row 2+ (not header row 1)?

---

## Best Practices

### Response Time
- **Goal:** Respond to free demos within 4 hours
- **Why:** Speed = conversion. Leads who wait 24+ hours are 3x less likely to book a call.

### Follow-Up Sequence

**Day 1:** Send demo feedback with call booking link
**Day 3:** If no response, send follow-up email
**Day 7:** Final follow-up ("Just checking if you got my analysis...")
**Day 14:** Mark as "Lost" if still no response

### Conversion Benchmarks

**Industry averages for nutrition coaching:**
- Free demo → Call booking: 30-50%
- Call booking → Call show: 60-80%
- Call show → Conversion: 30-50%
- Overall: 10-20% free demo → paid client

**If you're below these, check:**
- Is your demo feedback actually helpful?
- Are you responding fast enough?
- Is your call-to-action clear?
- Are you qualifying leads (some people just want free stuff)?

---

## Template Emails

### Demo Response Template

**Subject:** Your Free Meal Analysis - [Meal Name]

```
Hi [Name],

I just reviewed your [Meal Name] and wanted to share some insights:

**What You're Doing Right:**
[Specific positive - "The chicken breast is a great lean protein source,
and you're getting fiber from the vegetables"]

**One Quick Win:**
[Specific actionable tip - "Swap the ranch dressing for a vinaigrette and
save 150 calories without losing any flavor"]

**Why It Matters:**
[Connect to their goal from the form - "Since you mentioned wanting to lose
15 lbs, this one change across 5 salads per week = 750 calories saved =
0.2 lbs per week = 10 lbs per year from this ONE swap"]

If you want this level of detail on ALL your meals + weekly accountability,
I have 2 coaching spots open this month.

Book a quick 15-min call to see if it's a fit: [Calendly Link]

Best,
[Your Name]

P.S. - No pressure if it's not the right time. Happy to answer any
quick questions via email!
```

### Follow-Up Day 3

**Subject:** Re: Your Free Meal Analysis

```
Hey [Name],

Just wanted to make sure you got my meal analysis from Tuesday!

Did you try the [specific tip you gave]? Curious how it went.

Still have those 2 coaching spots open if you want to dive deeper.

- [Your Name]
```

### Follow-Up Day 7 (Last Attempt)

**Subject:** Last call for [Month] coaching spots

```
[Name],

My [Month] coaching roster is almost full (1 spot left).

Since you requested the free meal analysis, wanted to give you
first dibs before I open it up to my waitlist.

15-min call to chat: [Calendly Link]

Either way, hope the meal feedback was helpful!

[Your Name]
```

---

## Advanced: Automating Email Responses

### Option 1: Gmail + Google Sheets Add-On

Use **"Yet Another Mail Merge"** add-on:
1. Install from Google Workspace Marketplace
2. Connect to Lead Pool tab
3. Create email template with {{Lead Name}}, {{Meal Name}} placeholders
4. Set trigger: When new row added
5. Auto-sends personalized demo response

### Option 2: Zapier

1. Trigger: New row in Google Sheet (Lead Pool)
2. Action: Send Gmail with template
3. Personalization: Use Lead Name, Meal Name from row

**Cost:** $20/month for Zapier Starter

**Trade-off:** Saves time but loses personalization. Only use if you're getting 50+ leads/week.

---

## Success Metrics to Track

### Weekly Review (Every Monday)

**Check these numbers:**
1. New leads this week: ___
2. Demos sent: ___
3. Calls booked: ___
4. Calls completed: ___
5. Conversions: ___
6. Overall conversion rate: ___%

**Goal:** Improve one metric each week.

**Example:**
- Week 1: Focus on response time (get demos sent faster)
- Week 2: Focus on call booking rate (improve demo quality)
- Week 3: Focus on show rate (send reminder emails)
- Week 4: Focus on close rate (improve call script)

---

## ROI Calculator

**If you send 20 free demos per week:**

Assumptions:
- 15 demos sent (75% response rate)
- 6 calls booked (40% call booking)
- 4 calls completed (67% show rate)
- 2 conversions (50% close rate)

**Result:**
- 2 new clients/week × $250/month = $500/month new revenue
- × 4 weeks = $2,000/month new client revenue
- × 6 months avg retention = $12,000 LTV from 8 clients

**Time investment:**
- 15 demos × 10 min = 2.5 hours/week
- 4 calls × 20 min = 1.3 hours/week
- **Total: 3.8 hours/week → $3,158/hour effective rate**

---

You're now set up with a complete lead generation and conversion system. The key is consistency - post content daily, respond to demos fast, and track your metrics.

Good luck!
