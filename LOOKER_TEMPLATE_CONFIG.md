# Looker Studio Template - Copy-Paste Configuration

## Quick Setup (30 Minutes)

This guide provides exact configurations you can copy-paste to build professional dashboards fast.

---

## Template 1: Coach Executive Dashboard

### Page Setup
- **Name:** "Coach Dashboard"
- **Canvas Size:** 1600 x 1200 px
- **Theme:** Material (Blue/Green)

### Color Palette
```
Primary: #1976D2 (Blue)
Secondary: #4CAF50 (Green)
Accent 1: #FF9800 (Orange)
Accent 2: #F44336 (Red)
Success: #4CAF50
Warning: #FFC107
Danger: #F44336
Background: #FFFFFF
Text: #212121
```

### Layout Grid (Top to Bottom)

```
┌─────────────────────────────────────────────────────────┐
│ HEADER: Logo + Title + Date Range Filter                │
├─────────────────────────────────────────────────────────┤
│ ROW 1: [Meals] [Workouts] [Avg Fuel] [Pending Reviews] │  ← Scorecards
├─────────────────────────────────────────────────────────┤
│ ROW 2: [Activity Timeline - Line Chart (full width)]    │
├─────────────────────────────────────────────────────────┤
│ ROW 3: [Recent Entries Table - 60% width] [Status Pie - 40%] │
├─────────────────────────────────────────────────────────┤
│ ROW 4: [Top Clients Bar Chart - full width]             │
└─────────────────────────────────────────────────────────┘
```

---

## Calculated Fields (Create These First)

### 1. Meal Count
```
Field Name: Meal Count
Formula: CASE WHEN Type = "Meal" THEN 1 ELSE 0 END
Aggregation: SUM
```

### 2. Workout Count
```
Field Name: Workout Count
Formula: CASE WHEN Type = "Workout" THEN 1 ELSE 0 END
Aggregation: SUM
```

### 3. Fuel Score Category
```
Field Name: Fuel Score Bucket
Formula:
CASE
  WHEN Fuel Score >= 9 THEN "9-10 Excellent"
  WHEN Fuel Score >= 7 THEN "7-9 Good"
  WHEN Fuel Score >= 5 THEN "5-7 Average"
  WHEN Fuel Score >= 3 THEN "3-5 Below Average"
  WHEN Fuel Score >= 0 THEN "0-3 Poor"
  ELSE "Not Scored"
END
```

### 4. Recovery Score Category
```
Field Name: Recovery Score Bucket
Formula:
CASE
  WHEN Recovery Score >= 9 THEN "9-10 Excellent"
  WHEN Recovery Score >= 7 THEN "7-9 Good"
  WHEN Recovery Score >= 5 THEN "5-7 Average"
  WHEN Recovery Score >= 3 THEN "3-5 Below Average"
  WHEN Recovery Score >= 0 THEN "0-3 Poor"
  ELSE "Not Scored"
END
```

### 5. Week Over Week Change
```
Field Name: WoW Change
Formula:
(COUNT(Record Count) - COUNT(Record Count, Previous Period)) / COUNT(Record Count, Previous Period)
Type: Percentage
Comparison Date Range: Previous period
```

### 6. Days Since Last Entry
```
Field Name: Days Since Last Entry
Formula: DATE_DIFF(TODAY(), MAX(DateTime), DAY)
```

---

## Component Configurations

### HEADER ROW

#### Component 1: Logo Image
- **Type:** Image
- **Position:** X: 20, Y: 20
- **Size:** 150 x 80 px
- **Image URL:** [Upload your logo]
- **Link:** Your website URL

#### Component 2: Title Text
- **Type:** Text
- **Position:** X: 200, Y: 30
- **Size:** 600 x 60 px
- **Text:** "Coaching Analytics Dashboard"
- **Font:** Roboto Bold, 32px
- **Color:** #212121

#### Component 3: Date Range Control
- **Type:** Date Range Control
- **Position:** X: 1200, Y: 30
- **Size:** 350 x 60 px
- **Dimension:** DateTime
- **Default Range:** Last 30 days
- **Style:** Dropdown
- **Auto-apply:** ✓

---

### ROW 1: KEY METRICS (4 Scorecards)

#### Scorecard 1: Total Meals
- **Type:** Scorecard
- **Position:** X: 20, Y: 120
- **Size:** 370 x 150 px
- **Data Source:** Timeline Master
- **Metric:** Meal Count (SUM)
- **Filter:** Type = "Meal"
- **Comparison:** Previous period (✓)
- **Style:**
  - Background: #4CAF50 (Green)
  - Text Color: #FFFFFF
  - Font Size: 48px (metric), 16px (label)
  - Label: "Total Meals Logged"
  - Show comparison arrow: ✓

#### Scorecard 2: Total Workouts
- **Position:** X: 410, Y: 120
- **Size:** 370 x 150 px
- **Metric:** Workout Count (SUM)
- **Filter:** Type = "Workout"
- **Background:** #FF9800 (Orange)
- **Label:** "Total Workouts"
- *(Same other settings as Scorecard 1)*

#### Scorecard 3: Average Fuel Score
- **Position:** X: 800, Y: 120
- **Size:** 370 x 150 px
- **Metric:** AVG(Fuel Score)
- **Filter:** Fuel Score IS NOT NULL
- **Number Format:** 0.0
- **Background:** #1976D2 (Blue)
- **Label:** "Avg Fuel Score"
- **Compact numbers:** ✓

#### Scorecard 4: Pending Reviews
- **Position:** X: 1190, Y: 120
- **Size:** 370 x 150 px
- **Metric:** Record Count
- **Filter:** Response Status = "Pending Review"
- **Background:** #F44336 (Red)
- **Label:** "Pending Reviews"
- **Show comparison:** ❌ (no comparison needed)

---

### ROW 2: ACTIVITY TIMELINE

#### Component: Time Series Line Chart
- **Type:** Time series chart
- **Position:** X: 20, Y: 290
- **Size:** 1540 x 300 px
- **Data Source:** Timeline Master
- **Dimension:** DateTime (Date & Hour)
- **Date Range Dimension:** DateTime
- **Breakdown Dimension:** Type
- **Metrics:**
  - Record Count
- **Sort:** DateTime (Ascending)
- **Style:**
  - Line thickness: 3px
  - Show data labels: ✓
  - Color by: Type
    - Meal: #4CAF50
    - Workout: #FF9800
  - Grid lines: ✓
  - X-axis: DateTime
  - Y-axis: Count
  - Legend position: Bottom
  - Missing data: Connect with line

---

### ROW 3: RECENT ENTRIES + STATUS BREAKDOWN

#### Component 1: Recent Entries Table
- **Type:** Table
- **Position:** X: 20, Y: 610
- **Size:** 920 x 400 px
- **Data Source:** Timeline Master
- **Dimensions:**
  1. DateTime (format: MMM d, h:mm a)
  2. Type
  3. Client Name
  4. Details
  5. Image URL (as URL/hyperlink)
  6. Response Status
- **Metrics:** None
- **Rows per page:** 10
- **Sort:** DateTime (Descending)
- **Style:**
  - Header background: #1976D2
  - Header text: #FFFFFF
  - Row height: 40px
  - Alternating rows: ✓
  - Borders: ✓
  - Compact: ✓
- **Conditional Formatting:**
  - Response Status = "Pending Review" → Background #FFEBEE (light red)
  - Response Status = "Sent" → Background #E8F5E9 (light green)

#### Component 2: Status Pie Chart
- **Type:** Pie chart
- **Position:** X: 960, Y: 610
- **Size:** 600 x 400 px
- **Data Source:** Timeline Master
- **Dimension:** Response Status
- **Metric:** Record Count
- **Style:**
  - Donut: ✓ (50% hole)
  - Show labels: ✓
  - Label position: Outside
  - Colors:
    - "Pending Review": #F44336 (Red)
    - "Ready to Send": #FFC107 (Yellow)
    - "Sent": #4CAF50 (Green)
  - Legend position: Right
  - Slice label: Metric

---

### ROW 4: TOP CLIENTS

#### Component: Horizontal Bar Chart
- **Type:** Bar chart (horizontal)
- **Position:** X: 20, Y: 1030
- **Size:** 1540 x 350 px
- **Data Source:** Timeline Master
- **Dimension:** Client Email
- **Metric:** Meal Count (filter Type = "Meal")
- **Sort:** Metric (Descending)
- **Bars to display:** 10
- **Style:**
  - Bar color: #4CAF50 gradient
  - Show data labels: ✓
  - X-axis: Count
  - Y-axis: Client Email
  - Grid lines: ✓
  - Title: "Top 10 Most Active Clients (by Meals)"
  - Background: #FAFAFA

---

## Template 2: Lead Conversion Dashboard

### Page Setup
- **Name:** "Lead Funnel"
- **Data Source:** Lead Dashboard
- **Canvas:** 1600 x 1400 px

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ FUNNEL METRICS: [Leads][Demos][Calls][Completed][Conv]  │
├─────────────────────────────────────────────────────────┤
│ CONVERSION RATES: [Demo%] [Call%] [Close%] [Overall%]   │
├─────────────────────────────────────────────────────────┤
│ FUNNEL VISUALIZATION (Stepped Bar Chart)                │
├─────────────────────────────────────────────────────────┤
│ LEAD TABLE (All leads with status)                      │
├─────────────────────────────────────────────────────────┤
│ LEAD SOURCE BREAKDOWN (Pie Chart)                       │
└─────────────────────────────────────────────────────────┘
```

### Calculated Fields for Lead Dashboard

#### 1. Demo Sent Count
```
Formula: CASE WHEN Free Demos Given > 0 THEN 1 ELSE 0 END
Aggregation: SUM
```

#### 2. Call Booked Count
```
Formula: CASE WHEN Call Booked = "Yes" THEN 1 ELSE 0 END
Aggregation: SUM
```

#### 3. Call Completed Count
```
Formula: CASE WHEN Call Completed = "Yes" THEN 1 ELSE 0 END
Aggregation: SUM
```

#### 4. Converted Count
```
Formula: CASE WHEN Converted to Client = "Yes" THEN 1 ELSE 0 END
Aggregation: SUM
```

#### 5. Demo to Call Rate
```
Formula:
COUNT(CASE WHEN Call Booked = "Yes" THEN 1 END) /
COUNT(CASE WHEN Free Demos Given > 0 THEN 1 END)
Type: Percentage
Format: 0.0%
```

#### 6. Call to Conversion Rate
```
Formula:
COUNT(CASE WHEN Converted to Client = "Yes" THEN 1 END) /
COUNT(CASE WHEN Call Completed = "Yes" THEN 1 END)
Type: Percentage
```

#### 7. Overall Conversion Rate
```
Formula:
COUNT(CASE WHEN Converted to Client = "Yes" THEN 1 END) /
COUNT(Lead Email)
Type: Percentage
```

### Component Configs

#### ROW 1: Funnel Metrics (5 Scorecards)

**Scorecard 1: Total Leads**
- Size: 300 x 120 px
- Metric: COUNT_DISTINCT(Lead Email)
- Background: #E3F2FD (light blue)
- Text: #1976D2
- Label: "Total Leads"

**Scorecard 2: Demos Given**
- Metric: SUM(Free Demos Given)
- Background: #E8F5E9 (light green)
- Label: "Demos Given"

**Scorecard 3: Calls Booked**
- Metric: Call Booked Count
- Background: #FFF3E0 (light orange)
- Label: "Calls Booked"

**Scorecard 4: Calls Completed**
- Metric: Call Completed Count
- Background: #F3E5F5 (light purple)
- Label: "Calls Completed"

**Scorecard 5: Converted**
- Metric: Converted Count
- Background: #C8E6C9 (green)
- Text: #2E7D32
- Label: "Converted to Clients"

#### ROW 2: Conversion Rates (4 Scorecards)

**Use Scorecard with Percentage format:**
- Demo to Call Rate: "40.5%" → Yellow if <30%, Green if >40%
- Call to Conversion Rate: "42.0%" → Red if <25%, Green if >35%
- Overall Conversion: "12.5%" → Red if <8%, Green if >12%

**Conditional Formatting:**
```
IF metric >= threshold THEN #4CAF50 (green)
ELSE IF metric >= warning THEN #FFC107 (yellow)
ELSE #F44336 (red)
```

#### ROW 3: Funnel Visualization

**Stacked Bar Chart (Horizontal):**
- Dimension: Status (ordered: New Lead → Demo Sent → Call Booked → Call Completed → Converted → Lost)
- Metric: Record Count
- Stacking: None (side-by-side)
- Colors: Progressive from blue → green
- Show data labels: ✓

#### ROW 4: Lead Table

**Columns:**
1. Lead Email (as hyperlink if possible)
2. Lead Name
3. First Contact (date)
4. Free Demos Given (number)
5. Last Demo Date (date)
6. Call Booked (Yes/No)
7. Call Date (date)
8. Status (with conditional color)
9. Notes (truncated to 50 chars)

**Conditional Formatting:**
- Status = "New Lead" → Blue background
- Status = "Call Booked" → Yellow background
- Status = "Converted" → Green background
- Status = "Lost" → Gray background

---

## Template 3: Client Meal Analytics

### Page Setup
- **Data Source:** Timeline Master
- **Filter:** Type = "Meal" (applied to entire page)

### Key Components

#### 1. Score Trend Line Chart

**Time Series Combo Chart:**
- **Dimension:** Week
- **Metrics:**
  - Line 1: AVG(Fuel Score) - Blue
  - Line 2: AVG(Recovery Score) - Green
  - Bars: Meal Count - Gray (background)
- **Dual Axis:**
  - Left Y: Score (0-10)
  - Right Y: Count
- **Date range:** Last 12 weeks

#### 2. Meal Image Gallery

**Table Configuration:**
- **Columns:**
  1. **Image URL**
     - Type: Image
     - Width: 120px
     - Height: 120px
  2. **Details** (meal name)
  3. **Ingredients** (truncated to 100 chars)
  4. **Fuel Score**
     - Conditional format: <5 red, 5-7 yellow, >7 green
  5. **Recovery Score**
     - Same conditional format
  6. **DateTime**
- **Row height:** 130px (to fit images)
- **Rows per page:** 6
- **Sort:** DateTime desc

#### 3. Score Distribution Histogram

**Bar Chart:**
- **Dimension:** Fuel Score Bucket (use calculated field)
- **Metric:** Record Count
- **Sort:** Manual order (Poor → Excellent)
- **Colors:** Gradient from red (#F44336) to green (#4CAF50)

#### 4. Meal Timing Analysis

**Grouped Bar Chart:**
- **Dimension:** Meal Timing Category
- **Metrics:**
  - AVG(Fuel Score)
  - AVG(Recovery Score)
- **Style:** Grouped (side-by-side)
- **Filter:** Meal Timing Category IS NOT NULL

---

## Template 4: Client Workout Analytics

### Page Setup
- **Data Source:** Timeline Master
- **Filter:** Type = "Workout"

### Key Components

#### 1. Exercise Leaderboard Table

**Configuration:**
- **Dimensions:**
  1. Exercises
  2. Client Name (for multi-client view)
- **Metrics:**
  1. Record Count (labeled "Times Performed")
  2. Most recent date (labeled "Last Performed")
- **Sort:** Record Count desc
- **Rows:** 20

#### 2. Workouts by Day of Week

**Column Chart:**
- **Dimension:** WEEKDAY(DateTime)
  - Custom labels: Mon, Tue, Wed, Thu, Fri, Sat, Sun
- **Metric:** Record Count
- **Sort:** Manual (Mon → Sun)
- **Colors:** Single color (#FF9800)

---

## Quick Import Instructions

### Option 1: Manual Build (30 min)
1. Create new Looker Studio report
2. Add Timeline Master as data source
3. Copy-paste each component config above
4. Create calculated fields first
5. Build components row by row

### Option 2: Template Copy (If you create a master)
1. Build one perfect dashboard
2. File → Make a copy
3. Share link with "Can view" access
4. Coaches click "Use Template"
5. Connect their own Google Sheet
6. Auto-remaps all fields

---

## Pro Tips for Fast Setup

### Use Keyboard Shortcuts
- **Ctrl+C / Ctrl+V:** Copy/paste components
- **Ctrl+D:** Duplicate component
- **Arrow keys:** Nudge position
- **Shift+Arrow:** Resize

### Build Reusable Components
1. Create one perfect scorecard
2. Duplicate it 3 times
3. Just change metric and color
4. Saves 10 min vs building each from scratch

### Use Themes
1. Create custom theme with your colors
2. Apply to all pages
3. Ensures consistency

### Test on Mobile
- View → Mobile layout
- Rearrange for vertical scroll
- Hide less important charts

---

## Sharing Settings (For Coaches to Give to Clients)

### View-Only Link
```
Share → Get Link
Change to: "Anyone with link can VIEW"
Copy link
Send to client via email
```

### Email Schedule
```
Share → Schedule email delivery
Frequency: Every Monday at 8:00 AM
Recipients: [Client emails from Client Details tab]
Format: PDF attachment
Include: Current date range (last 7 days)
```

### Embed on Website
```
Share → Embed report
Copy iframe code
Add to coach website
Note: Viewers still need view access
```

---

## Common Issues & Fixes

### Images Not Showing
**Problem:** Image URL column shows links, not images
**Fix:**
1. Select Image URL column
2. Right panel → Type → Change to "Image" or "URL (Image)"
3. If still broken, check Google Drive sharing settings (must be public)

### Data Not Updating
**Problem:** Dashboard shows old data
**Fix:**
1. Resource → Refresh data
2. Check data source connection
3. Verify Google Sheet has new data

### Filters Not Working
**Problem:** Date range filter doesn't affect charts
**Fix:**
1. Each chart → Setup → Date Range Dimension → Select "DateTime"
2. Enable "Auto date range" on chart

### Slow Performance
**Problem:** Dashboard takes 10+ seconds to load
**Fix:**
1. Reduce date range to last 90 days
2. Use aggregated data (weekly instead of daily)
3. Remove unused calculated fields
4. Limit rows in tables to 100 max

---

## Customization for White-Label (Pro Plan)

### Replace Branding
1. Upload coach logo (top-left)
2. Change title to coach business name
3. Update color palette to match coach brand
4. Add footer with coach contact info

### Custom Domain (Advanced)
- Requires Google Sites or embedded iframe
- Point custom domain to Google Site
- Embed Looker dashboard in site
- Clients see: dashboard.yourcoachname.com

---

This configuration guide allows coaches to build professional dashboards in 30 minutes by copy-pasting exact settings. No guesswork needed.
