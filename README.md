# [[Meal Child Script]] - [[Timezone Fix V3]]

A [[Google Apps Script]] that automatically matches [[Meal Submission Forms]] with uploaded images from [[Google Drive]], with robust [[Timezone Handling]] for accurate matching.

## 🔴 [[V3 Critical Update]]

**Fixed TWO Critical Bugs:**
1. **[[Wrong Meal Pairing]]:** Images were pairing with incorrect meals
2. **[[Timestamp Display Bug]]:** Times showed incorrectly (e.g., 21:34 → 1:34)

**The Issues:**
1. [[String Timestamps]] like "2025-11-04 11:43:46" were interpreted in the [[Script Timezone]] instead of the [[Spreadsheet Timezone]], causing [[Time Offsets]]
2. [[Formatted Strings]] were written to the sheet instead of [[Date Objects]], causing [[Google Sheets]] to misinterpret the timezone

**The Fixes:**
1. [[V3]] explicitly calculates [[Timezone Offset]] and parses strings in the [[Spreadsheet Timezone]]
2. [[V3]] writes [[Date Objects]] directly (not [[Formatted Strings]]) and sets proper [[Number Formatting]] on the timestamp column

See [TIMEZONE_FIX_CHANGELOG.md](TIMEZONE_FIX_CHANGELOG.md) for full technical details.

## 🎯 Purpose

This script solves the problem of matching meal information from Google Forms submissions with images uploaded to Google Drive, even when:
- Form submissions and file uploads happen in different timezones
- Timestamps are stored in different formats
- Users are located across multiple time zones

## ✨ Key Features

- **🕐 [[Timezone-Independent Matching]]** - Uses [[Millisecond Timestamps]] for accurate comparison
- **📝 [[Auto-fill from History]]** - Reuses meal details from previous submissions
- **🔄 [[One-to-One Matching]]** - Each image matched to exactly one meal submission
- **⚠️ [[Robust Error Handling]]** - Continues processing even with invalid data
- **📊 [[Detailed Logging]]** - Complete visibility into matching process
- **🔍 [[Diagnostic Tools]]** - Built-in testing and validation

## 🚀 Quick Start

### 1. Setup

```javascript
// In Google Apps Script editor
[[setupMealChild]]()
```

This will:
- Create an [[Hourly Trigger]] for automatic syncing
- Validate your configuration
- Set up the necessary sheets

### 2. Run Diagnostics

```javascript
[[diagnosticCheck]]()
```

This checks:
- [[Timezone Settings]]
- Source data availability
- [[Drive Folder]] access
- [[Timestamp Parsing]]
- [[Coach Master]] connection

### 3. Manual Sync

```javascript
[[runMealSync]]()
```

This performs:
- Index meal submissions from forms
- Scan [[Drive Folder]] for images
- Match images to submissions
- Transfer to [[Coach Master]]

## 📋 Configuration

Edit these constants at the top of the script:

```javascript
const [[DRIVE_FOLDER_NAME]] = 'official image submissions';
const [[MEAL_INFO_SOURCE]] = 'Form responses';
const [[MEAL_DESTINATION]] = 'Meal Image+Info';
const [[COACH_MASTER_ID]] = '10isGpEx75IcGMZTNgkkkx2Cs2toFqYhWXQeMmpjQsAQ';
const [[COACH_MEAL_POOL]] = 'Meal Pool';
const [[MATCH_WINDOW_MINUTES]] = 1440; // 24 hours
```

## 🔧 What's Fixed in V3

### V3 Critical Fixes (Latest):

1. **Correct Timezone-Aware String Parsing**
   - Calculates timezone offset between script and spreadsheet
   - Parses string timestamps in spreadsheet's timezone
   - Prevents time shifts that caused wrong meal matching
   - **Images now pair with correct meals!**

2. **Fix Timestamp Display (21:34 → 1:34 Bug)**
   - Writes Date objects instead of formatted strings
   - Google Sheets displays times correctly in spreadsheet timezone
   - Added proper number formatting to timestamp column
   - **Times now display correctly: 21:34 stays 21:34!**

### V2 Features (Retained):

3. **Robust Timestamp Parsing**
   - Handles Date objects, strings, and numeric timestamps
   - Proper error handling with null returns
   - Null checks for invalid data

4. **Timezone Validation**
   - Warns when spreadsheet/script timezones differ
   - Better error messages for configuration issues

5. **Proper Millisecond Normalization**
   - All comparisons use timezone-independent timestamps
   - Consistent behavior across all timezones

6. **Enhanced Error Handling**
   - Tracks and reports invalid timestamps
   - Stack traces for debugging
   - Graceful degradation

See [TIMEZONE_FIX_CHANGELOG.md](TIMEZONE_FIX_CHANGELOG.md) for full technical details.

## 📊 How It Works

### Step 1: [[Build Meal Index]]
- Reads form submissions from "[[Form Responses]]" sheet
- Parses timestamps using [[Robust Parser]]
- Normalizes to [[Millisecond Timestamps]]
- [[Auto-fills]] missing data from history
- Sorts by submission time

### Step 2: [[Scan Drive and Match]]
- Scans client folders in [[Drive]]
- Extracts [[File Modification Times]]
- Finds nearest unused meal within [[24-Hour Window]]
- Uses [[Timezone-Independent Comparison]]
- Creates matched rows

### Step 3: [[Transfer to Coach Master]]
- Sends matched meals to [[Coach Master]] spreadsheet
- [[Deduplicates]] based on email + time + meal name
- Preserves all meal details and [[Image URLs]]

## 🔍 Understanding [[Timezone Handling]]

### The Problem:
```
[[Form Submission]]: "2025-11-04 11:43:46" (which timezone?)
[[File Upload]]:     "2025-11-04 16:43:46 UTC"
Are these 24 hours apart or 0 hours apart?
```

### The Solution:
```javascript
// Both converted to [[Milliseconds Since Epoch]]
formTime:  1699103026000  (absolute point in time)
fileTime:  1699103026000  (absolute point in time)
diff = |formTime - fileTime| = 0 ms ✅
```

### Key Insight:
- **[[Display Times]]** can differ by timezone
- **[[Millisecond Timestamps]]** are universal
- Comparison uses milliseconds = [[Timezone-Independent]]

## 📝 Required Sheet Columns

### [[Form Responses]] Sheet:
- [[Email]] (required)
- [[Meal Name]] (required)
- [[Timestamp]] (required)
- [[Core Ingredients]] (optional, auto-filled)
- [[Added Ingredients]] (optional, auto-filled)
- [[Cooking Method]] (optional, auto-filled)
- [[Portions]] (optional, auto-filled)
- [[Submission ID]] (optional)

### [[Drive Folder Structure]]:
```
official image submissions/
  ├── client1@example.com/
  │   ├── meal1.jpg
  │   └── meal2.jpg
  └── client2@example.com/
      └── meal3.jpg
```

## 🧪 Testing

### Test with Sample Data:

1. **Create test submission:**
   ```
   Email: test@example.com
   Meal: Test Meal
   Timestamp: [current time]
   ```

2. **Upload test image:**
   - Create folder: `test@example.com`
   - Upload image within 24 hours of submission

3. **Run sync:**
   ```javascript
   runMealSync()
   ```

4. **Verify:**
   - Check "Meal Image+Info" sheet
   - Should have matched row
   - Check Coach Master "Meal Pool"

## 📊 Logging Output

### Successful Match:
```
📸 Processing 3 images for client@example.com

  🖼️  Image: meal_photo.jpg
     Modified: Nov 4, 2025 4:43:46 PM EST
     🔍 Checking 5 meals:
        - "Chicken Salad" (15 min away)
        - "Pasta Bowl" (120 min away)
        - [USED] "Smoothie"
     ✓ Best match: "Chicken Salad" (15 min difference)
     ✅ MATCHED to "Chicken Salad"
```

### No Match:
```
  🖼️  Image: unknown_meal.jpg
     Modified: Nov 3, 2025 9:00:00 AM EST
     🔍 Checking 5 meals:
        - "Chicken Salad" (1450 min away)
        - "Pasta Bowl" (1560 min away)
     ❌ NO MATCH (no meals within 24hr window)
```

### Invalid Data:
```
⚠️  Row 5: Invalid timestamp (string): "invalid date"
⚠️  3 rows had invalid timestamps and were skipped
```

## ⚙️ Advanced Usage

### Custom Match Window:
```javascript
const MATCH_WINDOW_MINUTES = 720; // 12 hours instead of 24
```

### Remove Triggers:
```javascript
removeMealTriggers()
```

### Check Timezone Settings:
```javascript
getTimezones()
```

## 🐛 Troubleshooting

### No matches found:
1. Run `diagnosticCheck()`
2. Check timezone warnings
3. Verify 24-hour window includes uploads
4. Check Drive folder structure
5. Verify email format matches

### Invalid timestamp errors:
1. Check form response format
2. Verify timestamp column
3. Test with `parseTimestamp(yourValue)`
4. Check spreadsheet timezone settings

### Duplicate transfers:
1. Check Coach Master deduplication
2. Verify hash format: `email_time_mealname`
3. Check for manual edits in destination sheet

### Timezone warnings:
1. Set spreadsheet timezone: File > Settings > Time zone
2. Run `getTimezones()` to verify
3. Script will still work, but display times may confuse

## 📦 Files

- `MealChildScript.gs` - Main script file
- `TIMEZONE_FIX_CHANGELOG.md` - Detailed changelog
- `README.md` - This file

## 🔐 Permissions Required

- Google Sheets: Read/Write (for source and destination sheets)
- Google Drive: Read (for accessing image folders)
- Google Apps Script: Triggers (for hourly automation)
- External spreadsheet: Read/Write (for Coach Master)

## 📄 License

This script is provided as-is for meal tracking automation.

## 🆘 Support

If you encounter issues:

1. Run `diagnosticCheck()` and review output
2. Check execution transcript in Apps Script editor
3. Verify timezone settings match expectations
4. Test with small dataset first
5. Review [TIMEZONE_FIX_CHANGELOG.md](TIMEZONE_FIX_CHANGELOG.md) for migration guide

## 🔄 Version

**Current Version:** V3 (Critical Timezone Fix)
**Last Updated:** 2025-11-05
**Status:** Production Ready ✅

**V3 Changes:**
- Fixed timezone parsing bug that caused wrong meal pairing
- String timestamps now correctly parsed in spreadsheet timezone
- See TIMEZONE_FIX_CHANGELOG.md for migration guide
