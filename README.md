# Meal Child Script - Timezone Fix V2

A Google Apps Script that automatically matches meal submission forms with uploaded images from Google Drive, with robust timezone handling for accurate matching.

## 🎯 Purpose

This script solves the problem of matching meal information from Google Forms submissions with images uploaded to Google Drive, even when:
- Form submissions and file uploads happen in different timezones
- Timestamps are stored in different formats
- Users are located across multiple time zones

## ✨ Key Features

- **🕐 Timezone-independent matching** - Uses millisecond timestamps for accurate comparison
- **📝 Auto-fill from history** - Reuses meal details from previous submissions
- **🔄 One-to-one matching** - Each image matched to exactly one meal submission
- **⚠️ Robust error handling** - Continues processing even with invalid data
- **📊 Detailed logging** - Complete visibility into matching process
- **🔍 Diagnostic tools** - Built-in testing and validation

## 🚀 Quick Start

### 1. Setup

```javascript
// In Google Apps Script editor
setupMealChild()
```

This will:
- Create an hourly trigger for automatic syncing
- Validate your configuration
- Set up the necessary sheets

### 2. Run Diagnostics

```javascript
diagnosticCheck()
```

This checks:
- Timezone settings
- Source data availability
- Drive folder access
- Timestamp parsing
- Coach Master connection

### 3. Manual Sync

```javascript
runMealSync()
```

This performs:
- Index meal submissions from forms
- Scan Drive folder for images
- Match images to submissions
- Transfer to Coach Master

## 📋 Configuration

Edit these constants at the top of the script:

```javascript
const DRIVE_FOLDER_NAME = 'official image submissions';
const MEAL_INFO_SOURCE = 'Form responses';
const MEAL_DESTINATION = 'Meal Image+Info';
const COACH_MASTER_ID = '10isGpEx75IcGMZTNgkkkx2Cs2toFqYhWXQeMmpjQsAQ';
const COACH_MEAL_POOL = 'Meal Pool';
const MATCH_WINDOW_MINUTES = 1440; // 24 hours
```

## 🔧 What's Fixed in V2

### Critical Fixes:

1. **Robust Timestamp Parsing**
   - Handles Date objects, strings, and numeric timestamps
   - Proper ISO format conversion
   - Null checks for invalid data

2. **Timezone Validation**
   - Warns when spreadsheet/script timezones differ
   - Better error messages for configuration issues

3. **Proper Millisecond Normalization**
   - All comparisons use timezone-independent timestamps
   - Consistent behavior across all timezones

4. **Enhanced Error Handling**
   - Tracks and reports invalid timestamps
   - Stack traces for debugging
   - Graceful degradation

See [TIMEZONE_FIX_CHANGELOG.md](TIMEZONE_FIX_CHANGELOG.md) for full details.

## 📊 How It Works

### Step 1: Build Meal Index
- Reads form submissions from "Form responses" sheet
- Parses timestamps using robust parser
- Normalizes to millisecond timestamps
- Auto-fills missing data from history
- Sorts by submission time

### Step 2: Scan Drive and Match
- Scans client folders in Drive
- Extracts file modification times
- Finds nearest unused meal within 24-hour window
- Uses timezone-independent comparison
- Creates matched rows

### Step 3: Transfer to Coach Master
- Sends matched meals to Coach Master spreadsheet
- Deduplicates based on email + time + meal name
- Preserves all meal details and image URLs

## 🔍 Understanding Timezone Handling

### The Problem:
```
Form submission: "2025-11-04 11:43:46" (which timezone?)
File upload:     "2025-11-04 16:43:46 UTC"
Are these 24 hours apart or 0 hours apart?
```

### The Solution:
```javascript
// Both converted to milliseconds since epoch
formTime:  1699103026000  (absolute point in time)
fileTime:  1699103026000  (absolute point in time)
diff = |formTime - fileTime| = 0 ms ✅
```

### Key Insight:
- **Display times** can differ by timezone
- **Millisecond timestamps** are universal
- Comparison uses milliseconds = timezone-independent

## 📝 Required Sheet Columns

### Form Responses Sheet:
- Email (required)
- Meal Name (required)
- Timestamp (required)
- Core Ingredients (optional, auto-filled)
- Added Ingredients (optional, auto-filled)
- Cooking Method (optional, auto-filled)
- Portions (optional, auto-filled)
- Submission ID (optional)

### Drive Folder Structure:
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

**Current Version:** V2 (Timezone Fix)
**Last Updated:** 2025-11-05
**Status:** Production Ready ✅
