# Obsidian Concepts Index - TrainerPro System

This document lists all named concepts from the TrainerPro/Coach Master automation system, formatted for Obsidian vault organization.

---

## 📦 Core System Components

- [[Meal Child Script]]
- [[Coach Master]]
- [[CoachMaster.gs]]
- [[MealChildScript.gs]]
- [[Google Apps Script]]
- [[Timeline Master]]

---

## 📋 Data Sheets & Storage

### Primary Sheets
- [[Form Responses]]
- [[Meal Image+Info]]
- [[Meal Pool]]
- [[Timeline Master]]
- [[Timeline Archive]]
- [[Workout Pool]]
- [[General Questions and Feedback]]
- [[Client Details]]
- [[Exercise Dictionary]]

### Configuration Constants
- [[DRIVE_FOLDER_NAME]]
- [[MEAL_INFO_SOURCE]]
- [[MEAL_DESTINATION]]
- [[COACH_MASTER_ID]]
- [[COACH_MEAL_POOL]]
- [[MATCH_WINDOW_MINUTES]]

---

## 🕐 Timezone & Timestamp Concepts

### Core Timezone Concepts
- [[Timezone Handling]]
- [[Timezone-Independent Matching]]
- [[Timezone-Independent Comparison]]
- [[Timezone Settings]]
- [[Timezone Offset]]
- [[Timezone Validation]]
- [[Timezone Mismatches]]
- [[Timezone Confusion]]
- [[Spreadsheet Timezone]]
- [[Script Timezone]]
- [[Script Local Timezone]]

### Timestamp Types & Formats
- [[Timestamp]]
- [[Timestamps]]
- [[String Timestamps]]
- [[Millisecond Timestamps]]
- [[Milliseconds Since Epoch]]
- [[Unix Timestamp]]
- [[Date Objects]]
- [[Date Object]]
- [[Formatted Strings]]
- [[ISO Format]]
- [[Display Times]]
- [[Time Offsets]]
- [[Time Offset]]
- [[Absolute Point in Time]]

---

## 🐛 Bugs & Fixes

### Version History
- [[V1]]
- [[V2]]
- [[V2 Bug]]
- [[V3]]
- [[V3 Critical Update]]
- [[V3 Fix]]
- [[Timezone Fix V3]]
- [[Critical Update V3]]

### Specific Bugs
- [[Wrong Meal Pairing]]
- [[Wrong Meals]]
- [[Wrong Meal Matching]]
- [[Timestamp Display Bug]]
- [[21:34 → 1:34 Display Bug]]
- [[Timezone Parsing Bug]]
- [[Parsing Bug]]
- [[Display Bug]]
- [[String Parsing Ambiguity]]

---

## 🔧 Functions & Operations

### Core Functions
- [[parseTimestamp]]
- [[createMealRow]]
- [[getTimezones]]
- [[normalizeToSpreadsheetTime]]
- [[buildMealIndex]]
- [[scanDriveAndMatch]]
- [[findNearestUnusedMeal]]
- [[formatDateForDisplay]]
- [[getOrCreateSheet]]

### Setup & Diagnostic Functions
- [[setupMealChild]]
- [[diagnosticCheck]]
- [[runMealSync]]

---

## ✨ Features & Capabilities

### Matching Features
- [[One-to-One Matching]]
- [[24-Hour Window]]
- [[Match Window]]
- [[Meal Matching]]

### Data Processing
- [[Auto-fill]]
- [[Auto-fill from History]]
- [[Auto-fills]]
- [[Build Meal Index]]
- [[Scan Drive and Match]]
- [[Transfer to Coach Master]]
- [[Deduplicates]]

### System Features
- [[Robust Error Handling]]
- [[Detailed Logging]]
- [[Diagnostic Tools]]
- [[Robust Parser]]
- [[Hourly Trigger]]

---

## 📊 Data Fields & Attributes

### Meal Data
- [[Email]]
- [[Meal Name]]
- [[Core Ingredients]]
- [[Added Ingredients]]
- [[Cooking Method]]
- [[Portions]]
- [[Submission ID]]
- [[Image URLs]]

### Form & File Data
- [[Form Submission]]
- [[Form Submissions]]
- [[Google Form Submissions]]
- [[Meal Submission Forms]]
- [[File Upload]]
- [[File Modification Times]]
- [[Form Submission Time]]
- [[Drive File Time]]

---

## 🗂️ Storage & Infrastructure

### Google Drive
- [[Google Drive]]
- [[Drive]]
- [[Drive Folder]]
- [[Drive Folder Structure]]

### Google Sheets
- [[Google Sheets]]
- [[Number Formatting]]
- [[Number Format]]
- [[Column Formatting]]

---

## 🔍 Technical Concepts

### Parsing & Formatting
- [[Parsing]]
- [[Timestamp Parsing]]
- [[Display]]
- [[Comparison]]
- [[Display vs Comparison]]
- [[Time Difference Calculations]]
- [[Timezone-Independent Milliseconds]]
- [[Timezone-Independent Millisecond Timestamps]]
- [[spreadsheetTZ Parameter]]

### Programming Concepts
- [[JavaScript]]
- [[Robust Timestamp Parsing Function]]

---

## 📈 System Metrics & Calculations

- [[Strength Scores]]
- [[Epley Formula]]
- [[1RM Estimation]]
- [[Minutes to Workout]]
- [[Micronutrient Tracking]]
- [[Daily Micronutrient Coverage]]
- [[Micronutrient Density]]

---

## 🔄 Processes & Workflows

- [[Meal Sync]]
- [[Automatic Syncing]]
- [[Meal Image Matching]]
- [[Deduplication]]
- [[Auto-archiving]]
- [[Batch Response Sending]]

---

## 📝 Documentation Files

- [[README.md]]
- [[TIMEZONE_FIX_CHANGELOG.md]]
- [[test_timezone_issue.gs]]

---

## 🎯 Use Cases & Scenarios

- [[Coaching Platform]]
- [[Timeline Tracking]]
- [[Workout Tracking]]
- [[Meal Tracking]]
- [[Client Management]]
- [[Form Response Processing]]

---

## Total Concepts: 150+

**Categories Breakdown:**
- Core System Components: 6
- Data Sheets & Storage: 17
- Timezone & Timestamp Concepts: 29
- Bugs & Fixes: 18
- Functions & Operations: 13
- Features & Capabilities: 13
- Data Fields & Attributes: 17
- Storage & Infrastructure: 8
- Technical Concepts: 13
- System Metrics: 7
- Processes & Workflows: 7
- Documentation: 3
- Use Cases: 6

---

## Usage Notes for Obsidian

1. **Create individual notes** for high-priority concepts (especially functions, bugs, and core components)
2. **Link related concepts** using the graph view to visualize system architecture
3. **Tag concepts by category** (e.g., #timezone, #function, #bug, #feature)
4. **Add code snippets** to function concept notes
5. **Document fixes** in bug concept notes with before/after examples

---

**Last Updated:** 2026-03-09
**System:** TrainerPro / Coach Master Automation
**Repository:** fixing-appscript
