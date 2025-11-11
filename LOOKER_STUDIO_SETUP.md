# Looker Studio Dashboard Setup Guide

This guide will help you create professional analytics dashboards for your coaching business using Google Looker Studio.

## Prerequisites

- CoachMaster.gs installed and running in your Google Sheet
- At least some data in Timeline Master and Lead Dashboard tabs
- Google account with access to Looker Studio (lookerstudio.google.com)

---

## Part 1: Initial Setup (15 minutes)

### Step 1: Create New Report

1. Go to https://lookerstudio.google.com
2. Click **"Create"** → **"Report"**
3. Click **"Google Sheets"** as your data source
4. Select your coaching spreadsheet
5. Choose **"Timeline Master"** as the main table
6. Click **"Add to Report"**

### Step 2: Add Additional Data Sources

1. Click **"Resource"** → **"Manage added data sources"**
2. Click **"Add a data source"**
3. Select Google Sheets → Your spreadsheet → **"Lead Dashboard"**
4. Click **"Add"**
5. Repeat for **"Client Details"** if you want client-specific dashboards

---

## Part 2: Dashboard Pages Structure

Create **4 main pages** for comprehensive analytics:

### Page 1: Executive Summary (Coach Overview)
### Page 2: Lead Conversion Funnel
### Page 3: Client Meal Analytics
### Page 4: Client Workout Analytics

---

## Page 1: Executive Summary Dashboard

### Global Filters (Add to Every Page)

**Top Navigation Bar:**

1. **Date Range Control**
   - Add Control → Date Range Control
   - Dimension: `DateTime`
   - Position: Top-left

2. **Client Filter**
   - Add Control → Drop-down list
   - Dimension: `Client Email`
   - Allow multiple selections: ✓
   - Position: Top-center

3. **Week Filter**
   - Add Control → Drop-down list
   - Dimension: `Week`
   - Position: Top-right

### Key Metrics Cards

**Row 1: Big Numbers (4 cards across)**

1. **Total Meals Logged**
   - Chart type: Scorecard
   - Metric: `Record Count` (filter Type = "Meal")
   - Style: Large number, green background

2. **Total Workouts**
   - Metric: `Record Count` (filter Type = "Workout")
   - Style: Large number, orange background

3. **Avg Fuel Score**
   - Metric: `AVG(Fuel Score)`
   - Style: Large number, blue background
   - Number format: 0.0

4. **Pending Reviews**
   - Metric: `Record Count` (filter Response Status = "Pending Review")
   - Style: Large number, red background

**Row 2: Trend Lines (2 cards)**

5. **Engagement This Week**
   - Chart type: Scorecard with Compact Number
   - Metric: `Record Count`
   - Date range: Last 7 days
   - Comparison: Previous period
   - Shows: "↑ 15% vs last week"

6. **Active Clients**
   - Metric: `COUNT_DISTINCT(Client Email)`
   - Date range: Last 30 days

### Main Charts

**Chart 1: Activity Timeline (Line Chart)**
- Chart type: Time series
- Dimension: `DateTime` (by day)
- Metric: `Record Count`
- Breakdown: `Type` (Meal vs Workout)
- Style:
  - Line thickness: 3px
  - Colors: Meals = Green (#4CAF50), Workouts = Orange (#FF9800)
  - Show data labels: ✓

**Chart 2: Recent Entries (Table)**
- Columns:
  1. `DateTime` (sorted desc)
  2. `Type`
  3. `Client Name`
  4. `Details`
  5. `Image URL` (formatted as Hyperlink)
  6. `Response Status`
- Rows: 10
- Style: Alternating row colors, compact

**Chart 3: Meals by Client (Horizontal Bar)**
- Dimension: `Client Email`
- Metric: `Record Count` (filter Type = "Meal")
- Sort: Descending by count
- Bars: Top 10
- Color: Green gradient

**Chart 4: Response Status Breakdown (Pie Chart)**
- Dimension: `Response Status`
- Metric: `Record Count`
- Colors:
  - Pending Review: Red
  - Ready to Send: Yellow
  - Sent: Green

---

## Page 2: Lead Conversion Funnel

**Data Source:** Lead Dashboard

### Funnel Metrics (5 scorecards in a row)

1. **Total Leads**
   - Metric: `COUNT_DISTINCT(Lead Email)`

2. **Demos Given**
   - Metric: `SUM(Free Demos Given)`

3. **Calls Booked**
   - Metric: `Record Count` (filter Call Booked = "Yes")

4. **Calls Completed**
   - Metric: `Record Count` (filter Call Completed = "Yes")

5. **Converted to Clients**
   - Metric: `Record Count` (filter Converted to Client = "Yes")

### Conversion Rate Calculations

**Add Calculated Fields:**

1. **Demo → Call Rate**
   ```
   (COUNT(Call Booked = "Yes") / COUNT(Lead Email)) * 100
   ```

2. **Call → Conversion Rate**
   ```
   (COUNT(Converted to Client = "Yes") / COUNT(Call Completed = "Yes")) * 100
   ```

3. **Overall Conversion Rate**
   ```
   (COUNT(Converted to Client = "Yes") / COUNT(Lead Email)) * 100
   ```

Display these as **Scorecard with percentage format**.

### Lead Status Table

**Table with all lead details:**
- Columns:
  1. `Lead Email`
  2. `Lead Name`
  3. `First Contact` (date)
  4. `Free Demos Given`
  5. `Last Demo Date`
  6. `Call Booked`
  7. `Call Date`
  8. `Status`
  9. `Notes`
- Sort by: `Last Demo Date` (desc)
- Conditional formatting:
  - Status = "New Lead" → Blue
  - Status = "Call Booked" → Yellow
  - Status = "Converted" → Green
  - Status = "Lost" → Red

### Lead Source Breakdown (Pie Chart)

- Dimension: `Lead Source`
- Metric: `Record Count`
- Filter: Remove blank sources

### Funnel Visualization

**Use Community Visualization: Sankey Diagram** (if available)

Or create a **Stacked Bar Chart:**
- Dimension: `Status`
- Metric: `Record Count`
- Order: New Lead → Demo Sent → Call Booked → Call Completed → Converted

---

## Page 3: Client Meal Analytics

**Data Source:** Timeline Master
**Filter:** Type = "Meal"

### Score Trend Analysis

**Chart 1: Weekly Score Trends (Combo Chart)**
- Chart type: Combo Chart
- Dimension: `Week`
- Metrics:
  - Line 1: `AVG(Fuel Score)` (blue line)
  - Line 2: `AVG(Recovery Score)` (green line)
  - Bars: `Record Count` (gray bars in background)
- Date range: Last 12 weeks

**Chart 2: Daily Score Range (Area Chart)**

First, create **Calculated Fields:**

1. **Daily Min Fuel**
   ```
   MIN(Fuel Score)
   ```
   Aggregation: By DATE(DateTime)

2. **Daily Max Fuel**
   ```
   MAX(Fuel Score)
   ```

3. **Daily Avg Fuel**
   ```
   AVG(Fuel Score)
   ```

Then create Area Chart:
- Dimension: `DATE(DateTime)`
- Metrics: Min, Avg, Max as separate series
- Style: Semi-transparent fill, 3 lines

### Meal Image Gallery

**Chart 3: Image Gallery (Table with Images)**
- Chart type: Table
- Columns:
  1. `Image URL` (set type to "Image")
  2. `Details` (meal name)
  3. `Ingredients`
  4. `Fuel Score` (with conditional formatting: <5=red, 5-7=yellow, >7=green)
  5. `Recovery Score` (same formatting)
  6. `DateTime`
- Rows per page: 6
- Sort: `DateTime` desc
- Style:
  - Row height: 100px (to show images)
  - Header: Bold, colored background

### Top Meals Analysis

**Chart 4: Most Logged Meals (Bar Chart)**
- Dimension: `Details` (meal name)
- Metric: `Record Count`
- Sort: Descending
- Limit: Top 10

**Chart 5: Cooking Method Distribution (Pie Chart)**
- Dimension: `Cooking Method`
- Metric: `Record Count`
- Filter: Exclude blanks

### Meal Timing Analysis

**Chart 6: Pre/Post Workout Scoring (Grouped Bar Chart)**
- Dimension: `Meal Timing Category`
- Metrics:
  - `AVG(Fuel Score)` (blue bars)
  - `AVG(Recovery Score)` (green bars)
- Style: Grouped bars side-by-side

### Score Distribution Histogram

**Create Calculated Field: Fuel Score Bucket**
```
CASE
  WHEN Fuel Score >= 0 AND Fuel Score < 3 THEN "0-3 (Poor)"
  WHEN Fuel Score >= 3 AND Fuel Score < 5 THEN "3-5 (Below Avg)"
  WHEN Fuel Score >= 5 AND Fuel Score < 7 THEN "5-7 (Average)"
  WHEN Fuel Score >= 7 AND Fuel Score < 9 THEN "7-9 (Good)"
  WHEN Fuel Score >= 9 THEN "9-10 (Excellent)"
  ELSE "Not Scored"
END
```

**Chart 7: Score Distribution (Column Chart)**
- Dimension: `Fuel Score Bucket`
- Metric: `Record Count`
- Colors: Red → Yellow → Green gradient

Repeat for Recovery Score.

---

## Page 4: Client Workout Analytics

**Data Source:** Timeline Master
**Filter:** Type = "Workout"

### Workout Summary Cards

1. **Total Exercises**
   - Metric: `Record Count`

2. **Unique Exercises**
   - Metric: `COUNT_DISTINCT(Exercises)`

3. **Workouts This Week**
   - Metric: `Record Count`
   - Date range: Last 7 days
   - Comparison: Previous period

### Charts

**Chart 1: Exercise Frequency Leaderboard (Table)**
- Columns:
  1. `Exercises`
  2. `Record Count` (# of times performed)
  3. `Sets/Reps` (mode/most common)
- Sort: Descending by count
- Rows: Top 20

**Chart 2: Workouts by Day of Week (Column Chart)**

Create Calculated Field: **Day of Week**
```
WEEKDAY(DateTime)
```

Then:
- Dimension: `Day of Week`
- Metric: `Record Count`
- Sort: Monday → Sunday

**Chart 3: Workout Timeline (Timeline/Gantt-style)**
- Chart type: Table with Date
- Dimension: `DateTime` (grouped by day)
- Metrics: `Exercises`, `Sets/Reps`, `Workout Notes`
- Sort: Descending

---

## Part 3: Design & Branding (Polish)

### Theme Customization

1. Click **"Theme and Layout"** in toolbar
2. **Color Palette:**
   - Primary: `#1976D2` (Blue)
   - Secondary: `#4CAF50` (Green)
   - Accent 1: `#FF9800` (Orange)
   - Accent 2: `#F44336` (Red)
3. **Fonts:**
   - Headers: Roboto Bold, 20-24px
   - Body: Roboto Regular, 14px

### Layout Best Practices

- **White space:** Don't cram charts together
- **Alignment:** Use gridlines (View → Show Gridlines)
- **Hierarchy:** Most important = top-left, largest
- **Consistency:** Same chart style across pages

### Add Branding

1. **Logo:** Insert → Image → Upload coach logo (top-left corner)
2. **Header Text:** Insert → Text → "Coaching Dashboard - [Coach Name]"
3. **Footer:** Insert → Text → Contact info, website

---

## Part 4: Interactivity & Drill-Downs

### Enable Click-to-Filter

1. Select any chart
2. Right panel → Interactions
3. Enable **"Apply filter"** ✓
4. Now clicking on that chart filters the entire dashboard

**Recommended for:**
- Client Email (click to see only that client)
- Week (click to filter to that week)
- Meal Timing Category

### Add Navigation

**Create Page Menu:**
1. Insert → Page Navigation
2. Position: Top or Left sidebar
3. Style: Tabs or List

---

## Part 5: Sharing & Automation

### Share with Clients

**Option 1: View-Only Link**
1. Share → Get link
2. Set to "Anyone with link can VIEW"
3. Send link to client

**Option 2: Email Schedule**
1. Share → Schedule email delivery
2. Frequency: Weekly (Mondays at 8am)
3. Recipients: Client emails
4. Include: PDF attachment ✓

**Option 3: Embed in Website**
1. Share → Embed
2. Copy iframe code
3. Paste in coach website

### Permissions

- **Coaches:** Edit access
- **Clients:** View access only
- **Leads:** No access (only share specific reports after conversion)

---

## Part 6: Advanced Features (Optional)

### Calculated Metrics Library

**Meal Consistency Score**
```
COUNT_DISTINCT(Details) / Record Count
```
Lower = more consistent eating

**Weekly Adherence %**
```
(Record Count / 21) * 100
```
Assumes 3 meals/day goal

**Score Improvement Rate**
```
AVG(Fuel Score) - AVG(Fuel Score, Previous 4 weeks)
```

**Days Since Last Meal**
```
DATE_DIFF(TODAY(), MAX(DateTime), DAY)
```
Useful for engagement tracking

### Community Visualizations

Explore additional chart types:
- Sankey Diagram (for funnels)
- Radar Chart (for multi-dimensional scoring)
- Heatmap Calendar (meal frequency by day)
- Gauge Charts (for score targets)

---

## Part 7: Mobile Optimization

1. Click **"View"** → **"Mobile layout"**
2. Rearrange charts vertically
3. Reduce charts per row to 1-2
4. Hide less important charts on mobile
5. Test on your phone before sharing

---

## Troubleshooting

### Data Not Showing

**Check:**
1. Data source connected correctly?
2. Date range filter too restrictive?
3. Filters conflicting (e.g., Type=Meal AND Type=Workout)?
4. Refresh data: Resource → Refresh data

### Images Not Displaying

**Fix:**
1. Ensure `Image URL` field is set to type "URL" or "Image"
2. Check that URLs are publicly accessible
3. Use Google Drive links in format: `https://drive.google.com/uc?id=FILE_ID`

### Slow Performance

**Optimize:**
1. Limit date range to last 90 days
2. Use aggregated data instead of row-level
3. Reduce number of charts per page (max 8)
4. Use extract data source for large datasets

---

## Quick Start Template

**5-Hour Implementation Plan:**

**Hour 1:** Set up data sources, create Page 1 (Executive Summary)
**Hour 2:** Build Page 2 (Lead Funnel)
**Hour 3:** Build Page 3 (Meal Analytics)
**Hour 4:** Build Page 4 (Workout Analytics)
**Hour 5:** Design polish, branding, mobile optimization

---

## Example Client Dashboard Features

**What clients see weekly:**
1. "You logged 18 meals this week (+3 from last week!)"
2. "Your Fuel Score improved from 6.2 to 7.5"
3. Image gallery of all their meals
4. Workout frequency leaderboard
5. Comparison to their 12-week average

**What coaches see:**
1. All clients' engagement metrics
2. Who needs follow-up (low activity)
3. Lead conversion pipeline
4. Revenue metrics (if added to Client Details)

---

## Support Resources

- **Looker Studio Help:** https://support.google.com/looker-studio
- **Community Templates:** https://lookerstudio.google.com/gallery
- **YouTube Tutorials:** Search "Looker Studio nutrition dashboard"

---

## Next Steps

1. ✅ Run `setupCoachMaster()` in your Google Sheet
2. ✅ Ensure you have sample data in Timeline Master
3. ✅ Create your first Looker Studio report
4. ✅ Start with Page 1 (Executive Summary)
5. ✅ Share with your first client for feedback
6. ✅ Iterate based on what they find most valuable

**Pro tip:** The best dashboards show INSIGHTS, not just data. Add text boxes with interpretations like "Your consistency is up 25% - great work!" to make it more engaging.
