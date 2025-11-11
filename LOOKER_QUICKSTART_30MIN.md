# 30-Minute Looker Studio Dashboard Build (Zero Thinking Required)

Follow this checklist exactly. Don't skip steps. Takes 30 minutes, then you're done forever.

---

## Before You Start

**What you need:**
- [ ] Google account
- [ ] Your Coach Master Google Sheet with sample data
- [ ] 30 minutes of uninterrupted time

**Tip:** Open this guide on your phone/second monitor so you can follow along while building.

---

## Step 1: Create New Report (2 minutes)

1. [ ] Go to https://lookerstudio.google.com
2. [ ] Click blue **"Create"** button (top-left)
3. [ ] Click **"Report"**
4. [ ] You'll see "Add data to report" popup

---

## Step 2: Connect Your Data (3 minutes)

5. [ ] In the popup, click **"Google Sheets"**
6. [ ] Find your "Coach Master Sheet" in the list
7. [ ] Click on it
8. [ ] Click **"Timeline Master"** tab
9. [ ] Click blue **"Add"** button (bottom-right)
10. [ ] Click **"Add to Report"** in the confirmation popup

**You'll see:** A table appears on a blank canvas. That's good!

---

## Step 3: Set Up the Canvas (2 minutes)

11. [ ] Click **"Theme and layout"** in the toolbar (paintbrush icon)
12. [ ] Under "Theme," scroll and click **"Material"**
13. [ ] Under "Canvas size," change to: **Width: 1600, Height: 1200**
14. [ ] Click somewhere outside the panel to close it

---

## Step 4: Delete the Auto-Generated Table (30 seconds)

15. [ ] Click on the table that appeared
16. [ ] Press **Delete** key on your keyboard

**You now have:** A blank white canvas. Perfect.

---

## Step 5: Add Header Text (2 minutes)

17. [ ] Click **"Add a control"** in toolbar → **"Text"**
18. [ ] Click near top-left of canvas to place it
19. [ ] Type: **"Coach Analytics Dashboard"**
20. [ ] With text selected, look at right panel:
    - Font: **Roboto**
    - Size: **32**
    - Style: **Bold**
    - Color: Black
21. [ ] Drag it to top-left corner

---

## Step 6: Add Date Filter (3 minutes)

22. [ ] Click **"Add a control"** → **"Date range control"**
23. [ ] Click top-right area to place it
24. [ ] In right panel:
    - Control field: Select **"DateTime"**
    - Default date range: **"Last 30 days"**
    - Type: **"Fixed size slider"**
25. [ ] Resize to about 300px wide

---

## Step 7: Add First Scorecard - Total Meals (3 minutes)

26. [ ] Click **"Add a chart"** → **"Scorecard"**
27. [ ] Click in upper area (below header) to place it
28. [ ] In right panel under "Setup":
    - Data source: Should say "Timeline Master" ✓
    - Date range dimension: **"DateTime"**
    - Metric: Click pencil icon next to "Record Count"
      - Change aggregation to **"COUNT_DISTINCT"**
      - Click field selector → **"Image URL"**
    - Filter: Click "Add a filter" → "Create a filter"
      - Name: **"Meals Only"**
      - Include: **Type** → **Equals** → **Meal**
      - Click "Save"
29. [ ] Click "STYLE" tab (in right panel):
    - Background color: **#4CAF50** (green)
    - Text color: **#FFFFFF** (white)
    - Metric font size: **48**
    - Label: Type **"Total Meals"**
30. [ ] Resize to about 350 x 150px

---

## Step 8: Duplicate for Other Scorecards (5 minutes)

31. [ ] Click on the scorecard you just made
32. [ ] Press **Ctrl+D** (Windows) or **Cmd+D** (Mac) to duplicate
33. [ ] Drag the copy to the right of the original

**Now modify it for Workouts:**
34. [ ] Click the duplicated scorecard
35. [ ] In right panel → "SETUP" tab:
    - Filter: Delete "Meals Only" (click X)
    - Add new filter: **"Workouts Only"**
      - Type → Equals → **Workout**
36. [ ] Click "STYLE" tab:
    - Background: **#FF9800** (orange)
    - Label: **"Total Workouts"**

**Duplicate again for Avg Fuel Score:**
37. [ ] Select the Workouts scorecard
38. [ ] Press **Ctrl+D** / **Cmd+D**
39. [ ] Drag to the right
40. [ ] In "SETUP" tab:
    - Metric: Click pencil → Change to **"Fuel Score"**
    - Aggregation: **AVG**
    - Filter: Remove "Workouts Only"
    - Add filter: **"Fuel Score exists"**
      - Fuel Score → Is not null
41. [ ] In "STYLE" tab:
    - Background: **#1976D2** (blue)
    - Label: **"Avg Fuel Score"**
    - Metric format: Click number → **0.0** (one decimal)

**One more for Pending Reviews:**
42. [ ] Duplicate the Fuel Score card
43. [ ] Drag to the right
44. [ ] In "SETUP" tab:
    - Metric: **Record Count**
    - Filter: Remove fuel filter
    - Add filter: **"Pending Only"**
      - Response Status → Equals → **Pending Review**
45. [ ] In "STYLE" tab:
    - Background: **#F44336** (red)
    - Label: **"Pending Reviews"**

**You now have:** 4 colorful scorecards in a row. Looks professional already!

---

## Step 9: Add Activity Timeline Chart (4 minutes)

46. [ ] Click **"Add a chart"** → **"Time series chart"**
47. [ ] Click below the scorecards to place it
48. [ ] Stretch it to full width (about 1540px wide, 300px tall)
49. [ ] In "SETUP" tab:
    - Date range dimension: **DateTime**
    - Dimension: **DateTime** (should auto-populate)
    - Breakdown dimension: **Type**
    - Metric: **Record Count**
50. [ ] In "STYLE" tab:
    - Line thickness: **3**
    - Show data labels: **✓** (check it)
    - Line color by: **Type**
    - Grid color: Light gray
    - X-axis title: **"Date"**
    - Y-axis title: **"Count"**

**You now have:** A nice line chart showing meals vs workouts over time.

---

## Step 10: Add Recent Entries Table (3 minutes)

51. [ ] Click **"Add a chart"** → **"Table"**
52. [ ] Place below the timeline chart (left side, about 60% width)
53. [ ] In "SETUP" tab:
    - Dimensions (in this order):
      1. **DateTime**
      2. **Type**
      3. **Client Name**
      4. **Details**
      5. **Response Status**
    - Sort: **DateTime** descending
    - Rows per page: **10**
54. [ ] In "STYLE" tab:
    - Header background: **#1976D2**
    - Header text: **White**
    - Alternating rows: **✓**
    - Compact: **✓**

---

## Step 11: Add Status Pie Chart (2 minutes)

55. [ ] Click **"Add a chart"** → **"Pie chart"**
56. [ ] Place to the right of the table
57. [ ] In "SETUP" tab:
    - Dimension: **Response Status**
    - Metric: **Record Count**
58. [ ] In "STYLE" tab:
    - Donut: **✓** (50% hole)
    - Show labels: **✓**
    - Legend position: **Right**

---

## Step 12: Name and Save (1 minute)

59. [ ] Click "Untitled Report" at top
60. [ ] Rename to: **"Coach Dashboard Template - DO NOT EDIT"**
61. [ ] File → Save

---

## Step 13: Make it a Template (2 minutes)

62. [ ] Click **Share** button (top-right)
63. [ ] Change sharing to: **"Anyone with the link can VIEW"**
64. [ ] Click **"Get shareable link"**
65. [ ] At the bottom of the share popup, enable: **"Use as template"** toggle
66. [ ] Copy the link

**DONE!** This is the link coaches will click to copy your dashboard.

---

## Step 14: Test It (2 minutes)

67. [ ] Open the link you just copied in a new incognito window
68. [ ] You should see a **"Use Template"** button
69. [ ] Click it
70. [ ] Select your Coach Master Sheet
71. [ ] Click **"Copy Report"**

**If it works:** You'll see the dashboard with your data. Perfect!

---

## What You Just Built

✅ **Executive dashboard with:**
- 4 key metric scorecards (color-coded)
- Activity timeline (meals + workouts over time)
- Recent entries table
- Status breakdown pie chart
- Date range filter

**Time invested:** 30 minutes (one time)

**Now coaches can:** Click your link → Select their sheet → Get instant dashboard

---

## Next Steps

### Option A: Stop Here (Minimum Viable Product)
This one dashboard is enough to launch. Coaches get:
- Visual proof the system works
- Basic analytics
- Professional appearance

### Option B: Add Lead Dashboard (20 more minutes)
Follow these same steps to create a second dashboard page for Lead Dashboard data source.

Just click **"Page"** → **"New Page"** and repeat the process with Lead Dashboard fields instead.

---

## Troubleshooting

**"I don't see Timeline Master when connecting data"**
- Make sure you've run setupCoachMaster() in your sheet
- Check that Timeline Master tab exists and has data

**"Charts are showing weird numbers"**
- Click the chart
- Setup tab → Date range dimension → Change to "DateTime"
- This tells Looker which field controls time filters

**"Copy as Template doesn't work"**
- Make sure sharing is set to "Anyone with link can VIEW"
- Toggle "Use as template" must be ON
- Try the link in incognito to test

**"Colors don't match what you said"**
- Click the chart → Style tab
- Find "Background color" or "Series colors"
- Click the color box → Paste hex code (like #4CAF50)

---

## Save This Link!

**Your template link:** [Paste it here after Step 13]

**What to send coaches:**
```
Here's your dashboard template:
[Your link]

1. Click the link
2. Click "Use Template"
3. Select your Coach Master Sheet
4. Click "Copy Report"

Done! You'll see your dashboard instantly.
```

---

## Cost

**$0.** Looker Studio is completely free.

---

## What's Missing (But Not Critical)

This basic dashboard doesn't include:
- Meal image gallery (requires table with image type columns)
- Score trend analysis (needs calculated fields)
- Lead funnel visualization
- Workout analytics page

**Reality:** The basic dashboard above is enough to:
- Impress prospects on sales calls
- Show clients their progress
- Track coach KPIs

You can add advanced features later AFTER you get your first 10 paying coaches.

**Don't let perfect be the enemy of launched.**

---

That's it. 30 minutes, one time, then you have an infinitely copyable professional dashboard.

Want me to walk you through it live, or is this clear enough to follow?
