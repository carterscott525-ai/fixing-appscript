/**
 * ═══════════════════════════════════════════════════════════════════════
 * COACH MASTER SCRIPT - PRODUCTION READY
 * ═══════════════════════════════════════════════════════════════════════
 *
 * DEPLOYMENT:
 * 1. Open "Official Master Sheet" spreadsheet
 * 2. Extensions > Apps Script
 * 3. Delete any existing code
 * 4. Paste this entire script as CoachMaster.gs
 * 5. Save (Ctrl+S or Cmd+S)
 * 6. Run: setupCoachMaster
 * 7. Grant permissions when prompted
 * 8. Verify tabs created with correct headers
 *
 * FEATURES:
 * - Auto-ingests new form tabs into canonical pools (meals, questions)
 * - Dynamic workout parsing (wide/tall/grouped schemas)
 * - Timezone-safe meal image matching with 19-digit Submission ID preservation
 * - Batch response sending for Timeline and Questions
 * - Auto-archiving of entries >90 days old
 * - Zero code required in child/Jotform sheets
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const ARCHIVE_AFTER_DAYS = 90;
const EMAIL_SUBJECT_PREFIX = 'Response from Your Coach';

// Meal ingest configuration
const DRIVE_FOLDER_NAME = 'Meal Submission Images 6.0';
const MEAL_INFO_SOURCE = 'Client Meal Submissions 6.0';
const MATCH_WINDOW_MINUTES = 1440;

// Known output/managed tabs (will not be auto-ingested as sources)
const OUTPUT_TABS = new Set([
  'Timeline Master',
  'Timeline Archive',
  'Meal Pool',
  'Workout Pool',
  'General Questions and Feedback',
  'Client Details',
  'Exercise Dictionary',
  'Meal Image+Info',
  'ParsedWorkouts',
  'GymScore'
]);

// ═══════════════════════════════════════════════════════════════════════
// TAB HEADERS (exact order required)
// ═══════════════════════════════════════════════════════════════════════

const TIMELINE_HEADERS = [
  'Submission Date', 'Client Email', 'Client Name', 'Type',
  'Strength Score', 'Image',
  'Minutes to Workout', 'Fuel Score', 'Recovery Score', 'Micronutrient Density Score',
  'Daily Micronutrient Coverage Score', 'Daily Ai Suggestion', 'Coach Response', 'Response Status',
  'Workout Notes', 'Week', 'Month', 'Submission ID'
];

const MEAL_POOL_HEADERS = [
  'Submission Date', 'Client Email', 'Image URL', 'Meal Name',
  'Core Ingredients', 'Added Ingredients', 'Cooking Method',
  'Portions', 'Submission ID'
];

const MEAL_IMAGE_INFO_HEADERS = [
  'Submission Date', 'Client Email', 'Image URL', 'Meal Name',
  'Core Ingredients', 'Added Ingredients', 'Cooking Method',
  'Portions', 'Submission ID'
];

const QUESTIONS_HEADERS = [
  'Submission Date', 'Client Email', 'Question',
  'Coach Response', 'Status', 'Submission ID'
];

const CLIENT_DETAILS_HEADERS = [
  'Submission Date', 'Client Email', 'Client Name', 'Age', 'Gender', 'Height (cm)', 'Weight (kg)',
  'BMI', 'Phone Number', 'Medical Conditions', 'Allergies/Intolerances',
  'Current Injuries/Limitations', 'Medications', 'Sleep Quality (hrs/night)',
  'Stress Level', 'Training Experience', 'Fitness Goal', 'Activity Level',
  'Preferred Training Style', 'Dietary Restrictions', 'Food Preferences',
  'Foods to Avoid', 'Protein Target (g/day)', 'Carb Target (g/day)',
  'Fat Target (g/day)', 'Calorie Target', 'Additional Micronutrient Consideration',
  'Emergency Contact', 'Notes/Other', 'Last Updated'
];

const WORKOUT_POOL_HEADERS = [
  'Submission Date', 'Client Email', 'Exercise', 'Sets', 'Reps',
  'Weight', 'Bodyweight', 'Notes', 'Submission ID'
];

const PARSED_WORKOUTS_HEADERS = [
  'Submission Date', 'Client Email', 'Workout Sequence', 'Exercise', 'Set', 'Reps', 'Weight', '1RM', 'Normalized'
];

const GYM_SCORE_HEADERS = [
  'Submission Date', 'Client Email', 'Client BW', 'Total Sets', 'Workout Score', 'Formula'
];

// ═══════════════════════════════════════════════════════════════════════
// LABEL SYNONYMS FOR AUTO-DISCOVERY
// ═══════════════════════════════════════════════════════════════════════

const EMAIL_LABELS = ['client email', 'email', 'email address', 'e-mail'];
const TIMESTAMP_LABELS = ['submission date', 'submission time', 'submitted time', 'timestamp', 'submitted at', 'date time', 'datetime', 'date', 'time'];
const MEAL_NAME_LABELS = ['meal name', 'meal', 'name', 'meal_name'];
const CORE_LABELS = ['core ingredients', 'ingredients', 'main ingredients', 'ingredient list'];
const ADDED_LABELS = ['added ingredients', 'additional ingredients', 'extra ingredients'];
const METHOD_LABELS = ['cooking method', 'method', 'preparation method', 'prep method'];
const PORTIONS_LABELS = ['portions', 'portion', 'serving', 'servings'];
const QUESTION_LABELS = ['question', 'message', 'text'];
const SUBMISSION_ID_LABELS = ['submission id', 'response id', 'id'];
const DATE_LABELS = ['submission date', 'date', 'submitted date'];
const TIME_LABELS = ['time', 'submission time', 'submitted time'];

// ═══════════════════════════════════════════════════════════════════════
// SETUP FUNCTION - RUN THIS FIRST
// ═══════════════════════════════════════════════════════════════════════

function setupCoachMaster() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('COACH MASTER SETUP - PRODUCTION');
  Logger.log('═══════════════════════════════════════════════════════════');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create Timeline Master with new meal tracking columns
  let timeline = getOrCreateSheet_(ss, 'Timeline Master', TIMELINE_HEADERS, '#1976D2');
  addStatusValidation_(timeline, 14); // Response Status column (N) - only dropdown in entire spreadsheet
  formatDateTimeColumn_(timeline, 1); // Submission Date column (A)
  Logger.log(`✓ Timeline Master ready`);

  // Create Meal Pool
  let mealPool = getOrCreateSheet_(ss, 'Meal Pool', MEAL_POOL_HEADERS, '#4CAF50');
  formatDateTimeColumn_(mealPool, 1); // Submission Date column (A)
  Logger.log(`✓ Meal Pool ready`);

  // Create Meal Image+Info (staging)
  let mealImageInfo = getOrCreateSheet_(ss, 'Meal Image+Info', MEAL_IMAGE_INFO_HEADERS, '#4CAF50');
  formatDateTimeColumn_(mealImageInfo, 1); // Submission Date column (A)
  Logger.log(`✓ Meal Image+Info ready`);

  // Create Workout Pool
  let workoutPool = getOrCreateSheet_(ss, 'Workout Pool', WORKOUT_POOL_HEADERS, '#FF9800');
  formatDateTimeColumn_(workoutPool, 1); // Submission Date column (A)
  Logger.log(`✓ Workout Pool ready`);

  // Create Questions tab
  let questions = getOrCreateSheet_(ss, 'General Questions and Feedback', QUESTIONS_HEADERS, '#9C27B0');
  formatDateTimeColumn_(questions, 1); // Submission Date column
  Logger.log(`✓ General Questions and Feedback ready`);

  // Create Client Details
  let clientDetails = getOrCreateSheet_(ss, 'Client Details', CLIENT_DETAILS_HEADERS, '#34A853');
  Logger.log(`✓ Client Details ready`);

  // Create Timeline Archive
  let archive = getOrCreateSheet_(ss, 'Timeline Archive', TIMELINE_HEADERS, '#757575');
  formatDateTimeColumn_(archive, 1); // DateTime column
  formatDateTimeColumn_(archive, 17); // Last Updated column
  Logger.log(`✓ Timeline Archive ready`);

  // Create Exercise Dictionary (optional)
  let exerciseDict = ss.getSheetByName('Exercise Dictionary');
  if (!exerciseDict) {
    exerciseDict = ss.insertSheet('Exercise Dictionary');
    exerciseDict.appendRow(['Alias', 'Canonical']);
    formatHeader_(exerciseDict, 2, '#607D8B');
  }
  Logger.log(`✓ Exercise Dictionary ready`);

  // Remove old triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    const handlerName = trigger.getHandlerFunction();
    if (handlerName === 'runCoachMasterSync' || handlerName === 'runMealSync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create hourly triggers
  ScriptApp.newTrigger('runCoachMasterSync')
    .timeBased()
    .everyHours(1)
    .create();

  ScriptApp.newTrigger('runMealSync')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('✓ Hourly triggers created for runCoachMasterSync and runMealSync');
  Logger.log('');
  Logger.log('Setup complete! All tabs and triggers ready.');
  Logger.log('═══════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════
// CUSTOM MENU
// ═══════════════════════════════════════════════════════════════════════

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Coach Actions')
    .addItem('Mark Selected as "Ready to Send"', 'markReadyToSend')
    .addItem('Send All Ready Responses', 'sendAllReadyResponses')
    .addSeparator()
    .addItem('Run Full Sync', 'runCoachMasterSync')
    .addItem('Run Meal Image Match Now', 'runMealSync')
    .addItem('Parse All Workout Logs', 'parseAllWorkoutLogs')
    .addItem('Prepare Meals For Analysis', 'prepareMealsForAnalysis')
    .addSeparator()
    .addItem('Clear All Logged Data (Create Template)', 'clearAllLoggedData')
    .addToUi();
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PIPELINES
// ═══════════════════════════════════════════════════════════════════════

function runCoachMasterSync() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('COACH MASTER SYNC STARTED');
  Logger.log('═══════════════════════════════════════════════════════════');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Step 1: Auto-discover and ingest new form tabs
  Logger.log('\n[STEP 1] Auto-ingesting source tabs into pools...');
  const ingestCounts = ingestAllSourceTabsIntoPools_(ss);
  Logger.log(`  Meals ingested: ${ingestCounts.meals}`);
  Logger.log(`  Questions ingested: ${ingestCounts.questions}`);

  // Step 2: Build Timeline Master
  Logger.log('\n[STEP 2] Building Timeline Master...');
  buildTimelineMaster(ss);

  // Step 3: Send responses
  Logger.log('\n[STEP 3] Sending pending responses...');
  const emailsSent = sendPendingResponses(ss);
  Logger.log(`  Emails sent: ${emailsSent}`);

  // Step 4: Archive old entries
  Logger.log('\n[STEP 4] Archiving old entries...');
  const archived = archiveOldEntries(ss);
  Logger.log(`  Entries archived: ${archived}`);

  Logger.log('\n═══════════════════════════════════════════════════════════');
  Logger.log('COACH MASTER SYNC COMPLETE');
  Logger.log('═══════════════════════════════════════════════════════════');
}

function runMealSync() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('MEAL IMAGE SYNC STARTED');
  Logger.log('═══════════════════════════════════════════════════════════');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get timezones
  const tz = getTimezones();

  // Build meal index by Submission ID
  Logger.log('\n[STEP 1] Building meal index...');
  const mealIndexResult = buildMealIndex(ss);
  Logger.log(`  Indexed ${mealIndexResult.totalCount} meals by Submission ID`);
  if (mealIndexResult.errors > 0) {
    Logger.log(`  ⚠️ ${mealIndexResult.errors} rows had errors`);
  }

  // Scan Drive and match images
  Logger.log('\n[STEP 2] Scanning Drive and matching images...');
  const matchResults = scanDriveAndMatch(ss, mealIndexResult.data);
  Logger.log(`  Matched: ${matchResults.matched}`);
  Logger.log(`  Unmatched: ${matchResults.unmatched}`);
  Logger.log(`  No Submission ID: ${matchResults.noSubmissionId}`);

  // Mirror from Meal Image+Info to Meal Pool
  Logger.log('\n[STEP 3] Mirroring to Meal Pool...');
  const mirrored = mirrorFromDestinationToMealPool(ss);
  Logger.log(`  Mirrored ${mirrored} new meals to Meal Pool`);

  Logger.log('\n═══════════════════════════════════════════════════════════');
  Logger.log('MEAL IMAGE SYNC COMPLETE');
  Logger.log('═══════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════
// AUTO-DISCOVERY: INGEST NEW FORM TABS INTO POOLS
// ═══════════════════════════════════════════════════════════════════════

function ingestAllSourceTabsIntoPools_(ss) {
  const allSheets = ss.getSheets();
  let mealsIngested = 0;
  let questionsIngested = 0;

  allSheets.forEach(sheet => {
    const sheetName = sheet.getName();

    // Skip output/managed tabs
    if (OUTPUT_TABS.has(sheetName)) return;

    // Skip if no data
    if (sheet.getLastRow() <= 1) return;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headersLower = headers.map(h => String(h).toLowerCase().trim());

    // Check if it's a meal source
    const hasMealName = headersLower.some(h => MEAL_NAME_LABELS.some(label => h.includes(label)));
    const hasEmail = headersLower.some(h => EMAIL_LABELS.some(label => h === label || h.includes(label)));
    const hasTimestamp = headersLower.some(h => TIMESTAMP_LABELS.some(label => h.includes(label)));

    if (hasMealName && hasEmail && hasTimestamp) {
      // It's a meal source
      const count = ingestMealSource_(ss, sheet, headers);
      mealsIngested += count;
      Logger.log(`  Auto-ingested ${count} meals from "${sheetName}"`);
      return;
    }

    // Check if it's a questions source
    const hasQuestion = headersLower.some(h => QUESTION_LABELS.some(label => h.includes(label)));

    if (hasQuestion && hasEmail && hasTimestamp) {
      // It's a questions source
      const count = ingestQuestionsSource_(ss, sheet, headers);
      questionsIngested += count;
      Logger.log(`  Auto-ingested ${count} questions from "${sheetName}"`);
      return;
    }
  });

  return { meals: mealsIngested, questions: questionsIngested };
}

function ingestMealSource_(ss, sourceSheet, headers) {
  const mealPool = ss.getSheetByName('Meal Pool');
  if (!mealPool) return 0;

  // Find columns
  const emailCol = findColumn_(headers, EMAIL_LABELS);
  const timestampCol = findColumn_(headers, TIMESTAMP_LABELS);
  const mealNameCol = findColumn_(headers, MEAL_NAME_LABELS);
  const coreCol = findColumn_(headers, CORE_LABELS);
  const addedCol = findColumn_(headers, ADDED_LABELS);
  const methodCol = findColumn_(headers, METHOD_LABELS);
  const portionsCol = findColumn_(headers, PORTIONS_LABELS);
  const idCol = findColumn_(headers, SUBMISSION_ID_LABELS);

  if (emailCol === -1 || timestampCol === -1 || mealNameCol === -1) return 0;

  // Get existing meals in pool to avoid duplicates
  const existingMeals = new Set();
  if (mealPool.getLastRow() > 1) {
    const existing = mealPool.getRange(2, 1, mealPool.getLastRow() - 1, 4).getValues();
    existing.forEach(row => {
      const key = `${row[0]}_${row[2]}_${row[3]}`; // Email_SubmissionTime_MealName
      existingMeals.add(key);
    });
  }

  // Read source data
  const values = sourceSheet.getRange(2, 1, sourceSheet.getLastRow() - 1, sourceSheet.getLastColumn()).getValues();
  const newMeals = [];
  const spreadsheetTZ = ss.getSpreadsheetTimeZone();

  values.forEach(row => {
    const email = normalizeEmail_(row[emailCol]);
    const timeValue = row[timestampCol];
    const mealName = String(row[mealNameCol] || '').trim();
    const core = coreCol !== -1 ? String(row[coreCol] || '').trim() : '';
    const added = addedCol !== -1 ? String(row[addedCol] || '').trim() : '';
    const method = methodCol !== -1 ? String(row[methodCol] || '').trim() : '';
    const portions = portionsCol !== -1 ? String(row[portionsCol] || '').trim() : '';
    const submissionId = idCol !== -1 ? String(row[idCol] || '').trim() : '';

    if (!email || !mealName) return;

    const submissionTime = parseTimestamp(timeValue, spreadsheetTZ);
    if (!submissionTime) return;

    const key = `${email}_${submissionTime}_${mealName}`;
    if (existingMeals.has(key)) return;

    newMeals.push([
      submissionTime,  // Submission Date (A)
      email,           // Client Email (B)
      '',              // Image URL (C) - will be filled by meal sync
      mealName,        // Meal Name (D)
      core,            // Core Ingredients (E)
      added,           // Added Ingredients (F)
      method,          // Cooking Method (G)
      portions,        // Portions (H)
      submissionId     // Submission ID (I)
    ]);
  });

  if (newMeals.length > 0) {
    const nextRow = mealPool.getLastRow() + 1;
    mealPool.getRange(nextRow, 1, newMeals.length, 9).setValues(newMeals);
    formatDateTimeColumn_(mealPool, 3);
  }

  return newMeals.length;
}

function ingestQuestionsSource_(ss, sourceSheet, headers) {
  const questionsSheet = ss.getSheetByName('General Questions and Feedback');
  if (!questionsSheet) return 0;

  // Find columns
  const emailCol = findColumn_(headers, EMAIL_LABELS);
  const timestampCol = findColumn_(headers, TIMESTAMP_LABELS);
  const questionCol = findColumn_(headers, QUESTION_LABELS);
  const idCol = findColumn_(headers, SUBMISSION_ID_LABELS);

  if (emailCol === -1 || timestampCol === -1 || questionCol === -1) return 0;

  // Get existing questions to avoid duplicates
  const existingQuestions = new Set();
  if (questionsSheet.getLastRow() > 1) {
    const existing = questionsSheet.getRange(2, 1, questionsSheet.getLastRow() - 1, 3).getValues();
    existing.forEach(row => {
      const key = `${row[0]}_${row[1]}_${row[2]}`; // Email_SubmissionTime_Question
      existingQuestions.add(key);
    });
  }

  // Read source data
  const values = sourceSheet.getRange(2, 1, sourceSheet.getLastRow() - 1, sourceSheet.getLastColumn()).getValues();
  const newQuestions = [];
  const spreadsheetTZ = ss.getSpreadsheetTimeZone();

  values.forEach(row => {
    const email = normalizeEmail_(row[emailCol]);
    const timeValue = row[timestampCol];
    const question = String(row[questionCol] || '').trim();
    const submissionId = idCol !== -1 ? String(row[idCol] || '').trim() : '';

    if (!email || !question) return;

    const submissionTime = parseTimestamp(timeValue, spreadsheetTZ);
    if (!submissionTime) return;

    const key = `${email}_${submissionTime}_${question}`;
    if (existingQuestions.has(key)) return;

    newQuestions.push([
      email,
      submissionTime,
      question,
      '', // Coach Response
      'Pending Review', // Status
      submissionId
    ]);
  });

  if (newQuestions.length > 0) {
    const nextRow = questionsSheet.getLastRow() + 1;
    questionsSheet.getRange(nextRow, 1, newQuestions.length, 6).setValues(newQuestions);
    formatDateTimeColumn_(questionsSheet, 2);
  }

  return newQuestions.length;
}

// ═══════════════════════════════════════════════════════════════════════
// MEAL INGEST: BUILD INDEX BY SUBMISSION ID
// ═══════════════════════════════════════════════════════════════════════

function buildMealIndex(ss) {
  const sourceSheet = ss.getSheetByName(MEAL_INFO_SOURCE);
  if (!sourceSheet || sourceSheet.getLastRow() <= 1) {
    return { data: new Map(), totalCount: 0, errors: 0 };
  }

  const spreadsheetTZ = ss.getSpreadsheetTimeZone();
  const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  const values = sourceSheet.getRange(2, 1, sourceSheet.getLastRow() - 1, sourceSheet.getLastColumn()).getValues();

  const emailCol = findColumn_(headers, EMAIL_LABELS);
  const mealCol = findColumn_(headers, MEAL_NAME_LABELS);
  const coreCol = findColumn_(headers, CORE_LABELS);
  const addedCol = findColumn_(headers, ADDED_LABELS);
  const cookingCol = findColumn_(headers, METHOD_LABELS);
  const portionsCol = findColumn_(headers, PORTIONS_LABELS);
  const idCol = findColumn_(headers, SUBMISSION_ID_LABELS);

  let timestampCol = findColumn_(headers, TIMESTAMP_LABELS);
  let dateCol = -1;
  let timeCol = -1;

  if (timestampCol === -1) {
    dateCol = findColumn_(headers, DATE_LABELS);
    timeCol = findColumn_(headers, TIME_LABELS);
  }

  const hasTimestamp = timestampCol !== -1 || (dateCol !== -1 && timeCol !== -1);

  if (emailCol === -1 || mealCol === -1 || !hasTimestamp || idCol === -1) {
    Logger.log('⚠️ Required columns not found in meal source');
    return { data: new Map(), totalCount: 0, errors: 0 };
  }

  // Get Submission IDs using getDisplayValues() to preserve precision
  const idDisplay = sourceSheet
    .getRange(2, idCol + 1, sourceSheet.getLastRow() - 1, 1)
    .getDisplayValues()
    .map(r => (r[0] || '').toString().trim());

  // Build meal history for auto-fill
  const mealHistory = buildMealHistory_(ss);

  const index = new Map();
  let totalCount = 0;
  let errorCount = 0;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const email = normalizeEmail_(row[emailCol]);
    const mealName = String(row[mealCol] || '').trim();
    const submissionId = idDisplay[i].replace(/\D/g, '');

    if (!submissionId) {
      errorCount++;
      continue;
    }

    if (!email || !mealName) {
      errorCount++;
      continue;
    }

    // Get timestamp
    let timeValue;
    if (timestampCol !== -1) {
      timeValue = row[timestampCol];
    } else {
      // Combine date and time
      const dateValue = row[dateCol];
      const timeOnlyValue = row[timeCol];

      let dateObj;
      if (dateValue instanceof Date) {
        dateObj = dateValue;
      } else {
        dateObj = new Date(dateValue);
      }

      if (dateObj && !isNaN(dateObj.getTime()) && timeOnlyValue) {
        const timeStr = String(timeOnlyValue).trim();
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
          const ampm = timeMatch[4];

          if (ampm) {
            if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
          }

          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const hoursStr = String(hours).padStart(2, '0');
          const minutesStr = String(minutes).padStart(2, '0');
          const secondsStr = String(seconds).padStart(2, '0');

          timeValue = `${year}-${month}-${day} ${hoursStr}:${minutesStr}:${secondsStr}`;
        } else {
          timeValue = dateValue;
        }
      } else {
        timeValue = dateValue;
      }
    }

    const submissionTime = parseTimestamp(timeValue, spreadsheetTZ);
    if (!submissionTime) {
      errorCount++;
      continue;
    }

    let coreIngredients = coreCol !== -1 ? String(row[coreCol] || '').trim() : '';
    let addedIngredients = addedCol !== -1 ? String(row[addedCol] || '').trim() : '';
    let cookingMethod = cookingCol !== -1 ? String(row[cookingCol] || '').trim() : '';
    let portions = portionsCol !== -1 ? String(row[portionsCol] || '').trim() : '';

    // Auto-fill from history
    const hasBlankFields = !coreIngredients || !addedIngredients || !cookingMethod || !portions;
    if (hasBlankFields) {
      const previousMeal = mealHistory.get(`${email}|${mealName.toLowerCase()}`);
      if (previousMeal) {
        if (!coreIngredients) coreIngredients = previousMeal.coreIngredients;
        if (!addedIngredients) addedIngredients = previousMeal.addedIngredients;
        if (!cookingMethod) cookingMethod = previousMeal.cookingMethod;
        if (!portions) portions = previousMeal.portions;
      }
    }

    index.set(submissionId, {
      email: email,
      submissionTime: submissionTime,
      mealName: mealName,
      coreIngredients: coreIngredients,
      addedIngredients: addedIngredients,
      cookingMethod: cookingMethod,
      portions: portions,
      submissionId: submissionId
    });

    totalCount++;
  }

  return { data: index, totalCount: totalCount, errors: errorCount };
}

function buildMealHistory_(ss) {
  const destSheet = ss.getSheetByName('Meal Image+Info');
  const history = new Map();

  if (!destSheet || destSheet.getLastRow() <= 1) return history;

  const data = destSheet.getRange(2, 1, destSheet.getLastRow() - 1, 9).getValues();

  data.forEach(row => {
    const email = normalizeEmail_(row[0]);
    const mealName = String(row[3] || '').trim().toLowerCase();
    const coreIngredients = String(row[4] || '').trim();
    const addedIngredients = String(row[5] || '').trim();
    const cookingMethod = String(row[6] || '').trim();
    const portions = String(row[7] || '').trim();

    if (!email || !mealName) return;

    if (coreIngredients || addedIngredients || cookingMethod || portions) {
      const key = `${email}|${mealName}`;
      history.set(key, {
        coreIngredients: coreIngredients,
        addedIngredients: addedIngredients,
        cookingMethod: cookingMethod,
        portions: portions
      });
    }
  });

  return history;
}

// ═══════════════════════════════════════════════════════════════════════
// MEAL INGEST: SCAN DRIVE AND MATCH IMAGES
// ═══════════════════════════════════════════════════════════════════════

function scanDriveAndMatch(ss, mealIndex) {
  const destSheet = getOrCreateSheet_(ss, 'Meal Image+Info', MEAL_IMAGE_INFO_HEADERS, '#4CAF50');

  const existingImages = new Set();
  if (destSheet.getLastRow() > 1) {
    const existing = destSheet.getRange(2, 2, destSheet.getLastRow() - 1, 1).getValues();
    existing.forEach(row => {
      if (row[0]) existingImages.add(String(row[0]));
    });
  }

  let matchedCount = 0;
  let unmatchedCount = 0;
  let noSubmissionIdCount = 0;

  try {
    const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    if (!folders.hasNext()) {
      Logger.log(`⚠️ Drive folder "${DRIVE_FOLDER_NAME}" not found`);
      return { matched: 0, unmatched: 0, noSubmissionId: 0 };
    }

    const rootFolder = folders.next();
    const stats = processFolder_(rootFolder, null, mealIndex, destSheet, existingImages);

    matchedCount = stats.matched;
    unmatchedCount = stats.unmatched;
    noSubmissionIdCount = stats.noSubmissionId;

  } catch (e) {
    Logger.log(`ERROR scanning Drive: ${e.message}`);
  }

  // Sort by Submission Time desc
  if (destSheet.getLastRow() > 2) {
    destSheet.getRange(2, 1, destSheet.getLastRow() - 1, 9)
      .sort({ column: 3, ascending: false });
  }

  return {
    matched: matchedCount,
    unmatched: unmatchedCount,
    noSubmissionId: noSubmissionIdCount
  };
}

function processFolder_(folder, parentSubmissionId, mealIndex, destSheet, existingImages) {
  let stats = {
    total: 0,
    matched: 0,
    unmatched: 0,
    noSubmissionId: 0
  };

  const folderSubmissionId = extractSubmissionIdFromName_(folder.getName()) || parentSubmissionId;

  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();

    if (!file.getMimeType().startsWith('image/')) continue;

    stats.total++;
    const url = file.getUrl();
    const filename = file.getName();

    if (existingImages.has(url)) continue;

    let submissionId = extractSubmissionIdFromName_(filename);
    if (!submissionId && folderSubmissionId) {
      submissionId = folderSubmissionId;
    }

    if (!submissionId) {
      stats.noSubmissionId++;
      stats.unmatched++;

      const fileTime = file.getLastUpdated();
      destSheet.appendRow(['', url, fileTime, '', '', '', '', '', '']);
      existingImages.add(url);
      continue;
    }

    const meal = mealIndex.get(submissionId);

    if (meal) {
      const fileTime = file.getLastUpdated();
      destSheet.appendRow([
        meal.email,
        url,
        meal.submissionTime,
        meal.mealName,
        meal.coreIngredients,
        meal.addedIngredients,
        meal.cookingMethod,
        meal.portions,
        meal.submissionId
      ]);
      existingImages.add(url);
      stats.matched++;
    } else {
      stats.unmatched++;
      const fileTime = file.getLastUpdated();
      destSheet.appendRow(['', url, fileTime, '', '', '', '', '', submissionId]);
      existingImages.add(url);
    }
  }

  // Recurse into subfolders
  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    const subfolder = subfolders.next();
    const subStats = processFolder_(subfolder, folderSubmissionId, mealIndex, destSheet, existingImages);

    stats.total += subStats.total;
    stats.matched += subStats.matched;
    stats.unmatched += subStats.unmatched;
    stats.noSubmissionId += subStats.noSubmissionId;
  }

  return stats;
}

function extractSubmissionIdFromName_(name) {
  const nameWithoutExt = name.replace(/\.[^/.]+$/, '');
  if (/^\d+$/.test(nameWithoutExt)) {
    return nameWithoutExt;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// MEAL INGEST: MIRROR FROM STAGING TO MEAL POOL
// ═══════════════════════════════════════════════════════════════════════

function mirrorFromDestinationToMealPool(ss) {
  const mealImageInfo = ss.getSheetByName('Meal Image+Info');
  const mealPool = ss.getSheetByName('Meal Pool');

  if (!mealImageInfo || mealImageInfo.getLastRow() <= 1) return 0;
  if (!mealPool) return 0;

  // Get existing meals in pool
  const existingMeals = new Set();
  if (mealPool.getLastRow() > 1) {
    const existing = mealPool.getRange(2, 1, mealPool.getLastRow() - 1, 4).getValues();
    existing.forEach(row => {
      const key = `${row[1]}_${row[0]}_${row[3]}`; // Email_SubmissionDate_MealName
      existingMeals.add(key);
    });
  }

  // Read from Meal Image+Info (Submission Date, Client Email, Image URL, Meal Name, ...)
  const data = mealImageInfo.getRange(2, 1, mealImageInfo.getLastRow() - 1, 9).getValues();
  const newMeals = [];

  data.forEach(row => {
    const submissionDate = row[0];
    const email = row[1];
    const imageUrl = row[2];
    const mealName = row[3];

    if (!email || !mealName) return; // Skip incomplete rows

    const key = `${email}_${submissionDate}_${mealName}`;
    if (existingMeals.has(key)) return;

    newMeals.push(row); // All 9 columns
  });

  if (newMeals.length > 0) {
    const nextRow = mealPool.getLastRow() + 1;
    mealPool.getRange(nextRow, 1, newMeals.length, 9).setValues(newMeals);
    formatDateTimeColumn_(mealPool, 1); // Submission Date column (A)
  }

  return newMeals.length;
}

// ═══════════════════════════════════════════════════════════════════════
// WORKOUT INGEST: DYNAMIC SCHEMA-AGNOSTIC PARSER
// ═══════════════════════════════════════════════════════════════════════

function parseWorkoutsDynamic_(workoutSheet) {
  if (!workoutSheet || workoutSheet.getLastRow() <= 1) return [];

  const headers = workoutSheet.getRange(1, 1, 1, workoutSheet.getLastColumn()).getValues()[0];
  const values = workoutSheet.getRange(2, 1, workoutSheet.getLastRow() - 1, workoutSheet.getLastColumn()).getValues();

  const emailCol = findColumn_(headers, EMAIL_LABELS);
  const timestampCol = findColumn_(headers, TIMESTAMP_LABELS);
  const bodyweightCol = findColumn_(headers, ['bodyweight', 'body weight', 'weight']);
  const notesCol = findColumn_(headers, ['notes', 'note', 'comments']);
  const idCol = findColumn_(headers, SUBMISSION_ID_LABELS);

  if (emailCol === -1 || timestampCol === -1) {
    Logger.log('⚠️ Workout sheet missing required columns (Email, Timestamp)');
    return [];
  }

  // Load exercise dictionary for aliasing
  const exerciseDict = loadExerciseDictionary_();

  const results = [];
  const spreadsheetTZ = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();

  values.forEach(row => {
    const email = normalizeEmail_(row[emailCol]);
    const timeValue = row[timestampCol];
    const bodyweight = bodyweightCol !== -1 ? String(row[bodyweightCol] || '').trim() : '';
    const notes = notesCol !== -1 ? String(row[notesCol] || '').trim() : '';
    const submissionId = idCol !== -1 ? String(row[idCol] || '').trim() : '';

    if (!email) return;

    const dateTime = parseTimestamp(timeValue, spreadsheetTZ);
    if (!dateTime) return;

    // Detect exercise columns
    const exercises = detectExercises_(headers, row, exerciseDict);

    exercises.forEach(ex => {
      results.push({
        email: email,
        dateTime: dateTime,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        bodyweight: bodyweight,
        notes: notes,
        submissionId: submissionId
      });
    });
  });

  return results;
}

function detectExercises_(headers, row, exerciseDict) {
  const exercises = [];
  const processedCols = new Set();

  // Pattern 1: Grouped triplets - "Exercise (Sets)", "Exercise (Reps)", "Exercise (Weight)"
  const groupedPattern = /^(.+?)\s*\((sets|reps|weight)\)$/i;
  const grouped = new Map();

  headers.forEach((header, idx) => {
    const match = String(header).match(groupedPattern);
    if (match) {
      const exerciseName = match[1].trim();
      const metric = match[2].toLowerCase();

      if (!grouped.has(exerciseName)) {
        grouped.set(exerciseName, {});
      }
      grouped.get(exerciseName)[metric] = row[idx];
      processedCols.add(idx);
    }
  });

  grouped.forEach((metrics, name) => {
    const canonicalName = exerciseDict.get(name.toLowerCase()) || name;
    exercises.push({
      name: canonicalName,
      sets: String(metrics.sets || '').trim(),
      reps: String(metrics.reps || '').trim(),
      weight: String(metrics.weight || '').trim()
    });
  });

  // Pattern 2: Wide schema - any numeric column not yet processed
  const skipLabels = ['email', 'time', 'date', 'bodyweight', 'body weight', 'notes', 'submission', 'id'];

  headers.forEach((header, idx) => {
    if (processedCols.has(idx)) return;

    const headerLower = String(header).toLowerCase().trim();
    if (skipLabels.some(skip => headerLower.includes(skip))) return;

    const value = row[idx];
    if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value.trim()))) {
      const canonicalName = exerciseDict.get(headerLower) || header;
      exercises.push({
        name: canonicalName,
        sets: '',
        reps: String(value).trim(),
        weight: ''
      });
    }
  });

  return exercises;
}

function loadExerciseDictionary_() {
  const dict = new Map();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dictSheet = ss.getSheetByName('Exercise Dictionary');

  if (!dictSheet || dictSheet.getLastRow() <= 1) return dict;

  const data = dictSheet.getRange(2, 1, dictSheet.getLastRow() - 1, 2).getValues();
  data.forEach(row => {
    const alias = String(row[0] || '').toLowerCase().trim();
    const canonical = String(row[1] || '').trim();
    if (alias && canonical) {
      dict.set(alias, canonical);
    }
  });

  return dict;
}

// ═══════════════════════════════════════════════════════════════════════
// BUILD TIMELINE MASTER
// ═══════════════════════════════════════════════════════════════════════

function buildTimelineMaster(ss) {
  const timeline = ss.getSheetByName('Timeline Master');
  const mealPool = ss.getSheetByName('Meal Pool');
  const workoutPool = ss.getSheetByName('Workout Pool');
  const clientDetails = ss.getSheetByName('Client Details');

  const clientNames = getClientNames_(clientDetails);

  // Get existing entries
  const existing = new Set();
  if (timeline.getLastRow() > 1) {
    const existingData = timeline.getRange(2, 1, timeline.getLastRow() - 1, 25).getValues();
    existingData.forEach(row => {
      const submissionId = String(row[24] || '').trim();
      const email = String(row[2] || '').trim();
      const dateTime = row[0];

      // Primary key: DateTime_Email_SubmissionID
      const key1 = `${dateTime}_${email}_${submissionId}`;
      existing.add(key1);

      // Fallback key if no submission ID
      if (!submissionId) {
        const key2 = `${dateTime}_${email}`;
        existing.add(key2);
      }
    });
  }

  const newEntries = [];

  // Pull meals from Meal Pool
  if (mealPool && mealPool.getLastRow() > 1) {
    const meals = mealPool.getRange(2, 1, mealPool.getLastRow() - 1, 9).getValues();

    meals.forEach(meal => {
      const submissionDate = meal[0] || '';
      const email = normalizeEmail_(meal[1]);
      const imageUrl = meal[2] || '';
      const mealName = meal[3] || '';
      let coreIngredients = meal[4] || '';
      let addedIngredients = meal[5] || '';
      let cookingMethod = meal[6] || '';
      let portions = meal[7] || '';
      const submissionId = String(meal[8] || '').trim();

      const key = submissionId ? `${submissionDate}_${email}_${submissionId}` : `${submissionDate}_${email}`;
      if (existing.has(key)) return;

      // If details are missing, look up most recent complete entry for this meal name + client
      if (mealName && (!coreIngredients && !addedIngredients && !cookingMethod && !portions)) {
        Logger.log(`  Looking up previous details for "${mealName}" (${email})...`);

        // Search Meal Pool for previous complete entries
        for (let i = meals.length - 1; i >= 0; i--) {
          const prevDate = meals[i][0];
          const prevEmail = normalizeEmail_(meals[i][1]);
          const prevName = meals[i][3] || '';
          const prevCore = meals[i][4] || '';
          const prevAdded = meals[i][5] || '';
          const prevMethod = meals[i][6] || '';
          const prevPortions = meals[i][7] || '';

          // Match: same client, same meal name, has details, is earlier than current submission
          if (prevEmail === email &&
              prevName.toLowerCase() === mealName.toLowerCase() &&
              (prevCore || prevAdded || prevMethod || prevPortions) &&
              prevDate < submissionDate) {

            coreIngredients = prevCore;
            addedIngredients = prevAdded;
            cookingMethod = prevMethod;
            portions = prevPortions;
            Logger.log(`  ✓ Found previous entry from ${prevDate}`);
            break;
          }
        }
      }

      const clientName = clientNames.get(email) || '';
      const dateObj = parseDate_(submissionDate);
      const week = getWeekNumber_(dateObj);
      const month = Utilities.formatDate(dateObj, ss.getSpreadsheetTimeZone(), 'MMM yyyy');

      const ingredients = [coreIngredients, addedIngredients].filter(x => x).join(', ');
      const mealInfo = [mealName, ingredients, portions, cookingMethod].filter(x => x).join(' | ');

      // Build row array with header mapping for new 18-column structure
      const mealRow = new Array(TIMELINE_HEADERS.length).fill('');
      mealRow[findTimelineCol('Submission Date')] = submissionDate;
      mealRow[findTimelineCol('Client Email')] = email;
      mealRow[findTimelineCol('Client Name')] = clientName;
      mealRow[findTimelineCol('Type')] = mealInfo;  // Meal name/info in Type column
      mealRow[findTimelineCol('Image')] = imageUrl;
      mealRow[findTimelineCol('Response Status')] = 'Pending Review';
      mealRow[findTimelineCol('Week')] = week;
      mealRow[findTimelineCol('Month')] = month;
      mealRow[findTimelineCol('Submission ID')] = submissionId;

      newEntries.push(mealRow);
    });
  }

  // Pull workouts
  if (workoutPool) {
    const workouts = parseWorkoutsDynamic_(workoutPool);

    workouts.forEach(workout => {
      const email = workout.email;
      const dateTime = workout.dateTime;
      const submissionId = workout.submissionId || '';

      const key = submissionId ? `${dateTime}_${email}_${submissionId}` : `${dateTime}_${email}`;
      if (existing.has(key)) return;

      const clientName = clientNames.get(email) || '';
      const week = getWeekNumber_(dateTime);
      const month = Utilities.formatDate(dateTime, ss.getSpreadsheetTimeZone(), 'MMM yyyy');

      const setsReps = workout.sets && workout.reps ? `${workout.sets}x${workout.reps}` : workout.reps;
      const workoutInfo = [workout.name, setsReps].filter(x => x).join(': ');

      // Build row array with header mapping for new 18-column structure
      const workoutRow = new Array(TIMELINE_HEADERS.length).fill('');
      workoutRow[findTimelineCol('Submission Date')] = dateTime;
      workoutRow[findTimelineCol('Client Email')] = email;
      workoutRow[findTimelineCol('Client Name')] = clientName;
      workoutRow[findTimelineCol('Type')] = workoutInfo;  // Workout name/info in Type column
      workoutRow[findTimelineCol('Workout Notes')] = workout.notes;
      workoutRow[findTimelineCol('Response Status')] = 'Pending Review';
      workoutRow[findTimelineCol('Week')] = week;
      workoutRow[findTimelineCol('Month')] = month;
      workoutRow[findTimelineCol('Submission ID')] = submissionId;

      newEntries.push(workoutRow);
    });
  }

  if (newEntries.length > 0) {
    const nextRow = timeline.getLastRow() + 1;
    timeline.getRange(nextRow, 1, newEntries.length, TIMELINE_HEADERS.length).setValues(newEntries);
    formatDateTimeColumn_(timeline, 1);
    formatDateTimeColumn_(timeline, 17);

    // Sort by DateTime desc
    if (timeline.getLastRow() > 2) {
      timeline.getRange(2, 1, timeline.getLastRow() - 1, 25)
        .sort({ column: 1, ascending: false });
    }

    Logger.log(`  Added ${newEntries.length} new entries to Timeline Master`);
  } else {
    Logger.log(`  No new entries to add`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// BATCH RESPONSE SYSTEM
// ═══════════════════════════════════════════════════════════════════════

function sendPendingResponses(ss) {
  const timeline = ss.getSheetByName('Timeline Master');
  const questions = ss.getSheetByName('General Questions and Feedback');
  let emailsSent = 0;

  // Send Timeline responses
  if (timeline && timeline.getLastRow() > 1) {
    const data = timeline.getRange(2, 1, timeline.getLastRow() - 1, 22).getValues();

    for (let i = 0; i < data.length; i++) {
      const response = String(data[i][20] || '').trim(); // Coach Response column (was 12, now 20)
      const status = String(data[i][21] || '').trim();   // Response Status column (was 13, now 21)

      if (response && status === 'Ready to Send') {
        const email = String(data[i][2] || '').trim();
        const type = String(data[i][1] || '').trim();
        const details = String(data[i][5] || '').trim();
        const dateTime = data[i][0];

        const sent = sendResponseEmail_(email, type, details, dateTime, response);

        if (sent) {
          timeline.getRange(i + 2, 22).setValue('Sent'); // Response Status column
          emailsSent++;
        }
      }
    }
  }

  // Send Question responses
  if (questions && questions.getLastRow() > 1) {
    const qData = questions.getRange(2, 1, questions.getLastRow() - 1, 6).getValues();

    for (let i = 0; i < qData.length; i++) {
      const response = String(qData[i][3] || '').trim();
      const status = String(qData[i][4] || '').trim();

      if (response && status === 'Ready to Send') {
        const email = String(qData[i][0] || '').trim();
        const question = String(qData[i][2] || '').trim();
        const dateTime = qData[i][1];

        const sent = sendQuestionResponse_(email, question, dateTime, response);

        if (sent) {
          questions.getRange(i + 2, 5).setValue('Sent');
          emailsSent++;
        }
      }
    }
  }

  return emailsSent;
}

function sendResponseEmail_(clientEmail, type, details, dateTime, response) {
  try {
    const subject = `${EMAIL_SUBJECT_PREFIX} - ${type} (${dateTime})`;
    const body = `
Hi,

Your ${type.toLowerCase()} from ${dateTime}:
${details}

Coach's Feedback:
${response}

---
This is an automated response from your coaching platform.
    `.trim();

    MailApp.sendEmail(clientEmail, subject, body);
    Logger.log(`  ✓ Email sent to ${clientEmail}`);
    return true;
  } catch (e) {
    Logger.log(`  ✗ Failed to send email to ${clientEmail}: ${e.message}`);
    return false;
  }
}

function sendQuestionResponse_(clientEmail, question, dateTime, response) {
  try {
    const subject = `${EMAIL_SUBJECT_PREFIX} - Answer to Your Question (${dateTime})`;
    const body = `
Hi,

Your question from ${dateTime}:
"${question}"

Coach's Answer:
${response}

---
This is an automated response from your coaching platform.
    `.trim();

    MailApp.sendEmail(clientEmail, subject, body);
    Logger.log(`  ✓ Email sent to ${clientEmail}`);
    return true;
  } catch (e) {
    Logger.log(`  ✗ Failed to send email to ${clientEmail}: ${e.message}`);
    return false;
  }
}

function markReadyToSend() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();
  const sheetName = sheet.getName();

  // Check if it's a valid sheet
  if (sheetName !== 'Timeline Master' && sheetName !== 'General Questions and Feedback') {
    SpreadsheetApp.getUi().alert('This function only works in Timeline Master or General Questions and Feedback tabs');
    return;
  }

  // Determine which columns to check based on sheet
  const statusCol = sheetName === 'Timeline Master' ? 22 : 5; // Response Status was 14, now 22
  const responseCol = sheetName === 'Timeline Master' ? 21 : 4; // Coach Response was 13, now 21

  // Get selection details
  const startRow = range.getRow();
  const numRows = range.getNumRows();

  // Skip if only header selected
  if (startRow === 1 && numRows === 1) {
    SpreadsheetApp.getUi().alert('Please select data rows (not just the header)');
    return;
  }

  // Adjust if header is included in selection
  const firstDataRow = startRow === 1 ? 2 : startRow;
  const rowsToProcess = startRow === 1 ? numRows - 1 : numRows;

  if (rowsToProcess < 1) {
    SpreadsheetApp.getUi().alert('Please select at least one data row');
    return;
  }

  // Read Coach Response and Status columns for selected rows (batch read)
  const responseData = sheet.getRange(firstDataRow, responseCol, rowsToProcess, 1).getValues();
  const statusData = sheet.getRange(firstDataRow, statusCol, rowsToProcess, 1).getValues();

  // Build array of updates
  let updatedCount = 0;
  const newStatusValues = [];

  for (let i = 0; i < rowsToProcess; i++) {
    const coachResponse = String(responseData[i][0] || '').trim();

    if (coachResponse) {
      // Has response, mark as Ready to Send
      newStatusValues.push(['Ready to Send']);
      updatedCount++;
    } else {
      // No response, keep current status (or default to Pending Review)
      const currentStatus = statusData[i][0] || 'Pending Review';
      newStatusValues.push([currentStatus]);
    }
  }

  // Write all updates in one batch operation
  if (newStatusValues.length > 0) {
    sheet.getRange(firstDataRow, statusCol, rowsToProcess, 1).setValues(newStatusValues);
  }

  // Show confirmation alert
  if (updatedCount > 0) {
    SpreadsheetApp.getUi().alert(`✓ Marked ${updatedCount} row(s) as "Ready to Send"!`);
  } else {
    SpreadsheetApp.getUi().alert('No rows updated. Selected rows must have a Coach Response to mark as "Ready to Send".');
  }
}

function sendAllReadyResponses() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const emailsSent = sendPendingResponses(ss);
  SpreadsheetApp.getUi().alert(`✓ Sent ${emailsSent} responses!`);
}

// ═══════════════════════════════════════════════════════════════════════
// CLEAR ALL LOGGED DATA (CREATE TEMPLATE)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Clears all logged data from tracking sheets while preserving:
 * - Sheet structure and headers
 * - Reference data (Client Details, Exercise Dictionary)
 * - Formatting and validation rules
 *
 * This creates a clean template ready for new data entry.
 */
function clearAllLoggedData() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ═══ SAFETY CONFIRMATION 1: Initial Warning ═══
  const warningResponse = ui.alert(
    '⚠️ WARNING: Clear All Logged Data',
    'This will permanently delete all logged data from:\n\n' +
    '• Timeline Master\n' +
    '• Timeline Archive\n' +
    '• Meal Pool\n' +
    '• Meal Image+Info\n' +
    '• Workout Pool\n' +
    '• General Questions and Feedback\n' +
    '• ParsedWorkouts\n' +
    '• GymScore\n\n' +
    'Reference data (Client Details, Exercise Dictionary) will be preserved.\n\n' +
    'This action CANNOT be undone!\n\n' +
    'Do you want to continue?',
    ui.ButtonSet.YES_NO
  );

  if (warningResponse !== ui.Button.YES) {
    ui.alert('✓ Operation cancelled. No data was deleted.');
    return;
  }

  // ═══ SAFETY CONFIRMATION 2: Final Confirmation ═══
  const finalResponse = ui.alert(
    '🔴 FINAL CONFIRMATION',
    'Are you ABSOLUTELY SURE you want to delete all logged data?\n\n' +
    'This is your last chance to cancel.\n\n' +
    'Type YES to proceed:',
    ui.ButtonSet.OK_CANCEL
  );

  if (finalResponse !== ui.Button.OK) {
    ui.alert('✓ Operation cancelled. No data was deleted.');
    return;
  }

  // ═══ EXECUTE DATA CLEARING ═══
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('CLEAR ALL LOGGED DATA - STARTED');
  Logger.log('═══════════════════════════════════════════════════════════');

  const clearResults = {
    clearedSheets: [],
    preservedSheets: [],
    errors: []
  };

  // Sheets to clear (keeping headers only)
  const sheetsToClear = [
    { name: 'Timeline Master', headers: TIMELINE_HEADERS },
    { name: 'Timeline Archive', headers: TIMELINE_HEADERS },
    { name: 'Meal Pool', headers: MEAL_POOL_HEADERS },
    { name: 'Meal Image+Info', headers: MEAL_IMAGE_INFO_HEADERS },
    { name: 'Workout Pool', headers: WORKOUT_POOL_HEADERS },
    { name: 'General Questions and Feedback', headers: QUESTIONS_HEADERS },
    { name: 'ParsedWorkouts', headers: PARSED_WORKOUTS_HEADERS },
    { name: 'GymScore', headers: GYM_SCORE_HEADERS }
  ];

  // Sheets to preserve (reference data)
  const sheetsToPreserve = [
    'Client Details',
    'Exercise Dictionary'
  ];

  // Clear data sheets
  sheetsToClear.forEach(sheetConfig => {
    try {
      const sheet = ss.getSheetByName(sheetConfig.name);

      if (!sheet) {
        Logger.log(`  ⚠️ Sheet "${sheetConfig.name}" not found, skipping`);
        clearResults.errors.push(`Sheet "${sheetConfig.name}" not found`);
        return;
      }

      const lastRow = sheet.getLastRow();

      // Update headers to match current constants
      if (sheetConfig.headers) {
        sheet.getRange(1, 1, 1, sheetConfig.headers.length).setValues([sheetConfig.headers]);

        // Resize sheet to match header count (remove extra columns)
        const currentCols = sheet.getMaxColumns();
        const targetCols = sheetConfig.headers.length;
        if (currentCols > targetCols) {
          sheet.deleteColumns(targetCols + 1, currentCols - targetCols);
          Logger.log(`  ✓ ${sheetConfig.name}: Removed ${currentCols - targetCols} extra column(s)`);
        }

        Logger.log(`  ✓ ${sheetConfig.name}: Updated headers`);
      }

      if (lastRow <= 1) {
        Logger.log(`  ✓ ${sheetConfig.name}: Already empty`);
        clearResults.clearedSheets.push(`${sheetConfig.name} (already empty)`);
        return;
      }

      // Count rows before clearing
      const rowsToDelete = lastRow - 1;

      // Delete all data rows (keep header row)
      if (rowsToDelete > 0) {
        sheet.deleteRows(2, rowsToDelete);
        Logger.log(`  ✓ ${sheetConfig.name}: Cleared ${rowsToDelete} rows`);
        clearResults.clearedSheets.push(`${sheetConfig.name} (${rowsToDelete} rows)`);
      }

      // Reapply formatting and validation
      reapplySheetFormatting_(sheet, sheetConfig.name);

    } catch (e) {
      Logger.log(`  ✗ Error clearing ${sheetConfig.name}: ${e.message}`);
      clearResults.errors.push(`${sheetConfig.name}: ${e.message}`);
    }
  });

  // Log preserved sheets
  sheetsToPreserve.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      const rowCount = sheet.getLastRow() > 1 ? sheet.getLastRow() - 1 : 0;
      clearResults.preservedSheets.push(`${sheetName} (${rowCount} rows preserved)`);
      Logger.log(`  ✓ ${sheetName}: Preserved (${rowCount} data rows)`);
    }
  });

  Logger.log('');
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('CLEAR ALL LOGGED DATA - COMPLETE');
  Logger.log('═══════════════════════════════════════════════════════════');

  // ═══ SHOW RESULTS ═══
  let resultMessage = '✓ Data clearing completed!\n\n';

  if (clearResults.clearedSheets.length > 0) {
    resultMessage += 'CLEARED SHEETS:\n';
    clearResults.clearedSheets.forEach(item => {
      resultMessage += `  • ${item}\n`;
    });
    resultMessage += '\n';
  }

  if (clearResults.preservedSheets.length > 0) {
    resultMessage += 'PRESERVED SHEETS:\n';
    clearResults.preservedSheets.forEach(item => {
      resultMessage += `  • ${item}\n`;
    });
    resultMessage += '\n';
  }

  if (clearResults.errors.length > 0) {
    resultMessage += '⚠️ ERRORS:\n';
    clearResults.errors.forEach(error => {
      resultMessage += `  • ${error}\n`;
    });
  }

  resultMessage += '\nYour spreadsheet is now a clean template ready for new data!';

  ui.alert('Data Clearing Complete', resultMessage, ui.ButtonSet.OK);
}

/**
 * Reapplies formatting and validation rules after clearing data
 */
function reapplySheetFormatting_(sheet, sheetName) {
  try {
    // Reapply date/time formatting
    if (sheetName === 'Timeline Master' || sheetName === 'Timeline Archive') {
      formatDateTimeColumn_(sheet, 1);   // Submission Date column (A)
      addStatusValidation_(sheet, 14);   // Response Status column (N) - only dropdown in entire spreadsheet
    } else if (sheetName === 'Meal Pool' || sheetName === 'Meal Image+Info') {
      formatDateTimeColumn_(sheet, 1);  // Submission Date column
    } else if (sheetName === 'Workout Pool') {
      formatDateTimeColumn_(sheet, 1);  // Submission Date column
    } else if (sheetName === 'General Questions and Feedback') {
      formatDateTimeColumn_(sheet, 1);  // Submission Date column
    } else if (sheetName === 'ParsedWorkouts' || sheetName === 'GymScore') {
      formatDateTimeColumn_(sheet, 1);  // Submission Date column
    }

    Logger.log(`    → Formatting reapplied to ${sheetName}`);
  } catch (e) {
    Logger.log(`    ⚠️ Warning: Could not reapply formatting to ${sheetName}: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ARCHIVE OLD ENTRIES
// ═══════════════════════════════════════════════════════════════════════

function archiveOldEntries(ss) {
  const timeline = ss.getSheetByName('Timeline Master');
  const archive = ss.getSheetByName('Timeline Archive');

  if (!timeline || timeline.getLastRow() <= 1) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_AFTER_DAYS);

  const data = timeline.getRange(2, 1, timeline.getLastRow() - 1, 21).getValues(); // 21 columns
  const toArchive = [];
  const rowsToDelete = [];

  for (let i = 0; i < data.length; i++) {
    const dateTime = parseDate_(data[i][0]);
    if (dateTime < cutoffDate) {
      toArchive.push(data[i]);
      rowsToDelete.push(i + 2);
    }
  }

  if (toArchive.length > 0) {
    const nextRow = archive.getLastRow() + 1;
    archive.getRange(nextRow, 1, toArchive.length, 21).setValues(toArchive); // 21 columns
    formatDateTimeColumn_(archive, 1);

    // Delete from timeline in reverse order
    rowsToDelete.reverse().forEach(row => {
      timeline.deleteRow(row);
    });
  }

  return toArchive.length;
}

// ═══════════════════════════════════════════════════════════════════════
// WORKOUT LOG PARSING - GROUPED COLUMN FORMAT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Parses all "Workout Log" tabs (both simple and grouped formats):
 * - Simple: Pull-Ups=20 (uses bodyweight)
 * - Grouped: Exercise (Sets), Exercise (Reps,Reps...), Exercise (Weight,Weight...)
 *
 * Outputs to:
 * - Timeline Master (always)
 * - ParsedWorkouts (one row per set with 1RM calculations)
 * - GymScore (normalized score using Epley formula)
 */
function parseAllWorkoutLogs() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('WORKOUT LOG PARSING STARTED');
  Logger.log('═══════════════════════════════════════════════════════════');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const parsedSheet = getOrCreateSheet_(ss, 'ParsedWorkouts', PARSED_WORKOUTS_HEADERS, '#FF5722');
  const scoreSheet = getOrCreateSheet_(ss, 'GymScore', GYM_SCORE_HEADERS, '#9C27B0');
  const timeline = ss.getSheetByName('Timeline Master');

  let totalRowsParsed = 0;
  let totalSetsProcessed = 0;

  const allSheets = ss.getSheets();
  const workoutLogSheets = allSheets.filter(sheet =>
    sheet.getName().toLowerCase().includes('workout log')
  );

  if (workoutLogSheets.length === 0) {
    Logger.log('⚠️ No "Workout Log" sheets found');
    SpreadsheetApp.getUi().alert('No sheets found with "Workout Log" in the name');
    return;
  }

  Logger.log(`Found ${workoutLogSheets.length} workout log sheet(s)`);

  // Get Timeline Master header mapping
  const timelineHeaders = timeline ? timeline.getRange(1, 1, 1, timeline.getLastColumn()).getDisplayValues()[0] : [];
  const findTimelineCol = (name) => timelineHeaders.findIndex(h => String(h).toLowerCase() === name.toLowerCase());

  workoutLogSheets.forEach(sheet => {
    Logger.log(`\nProcessing: ${sheet.getName()}`);

    if (sheet.getLastRow() <= 1) {
      Logger.log('  No data rows, skipping');
      return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const dataRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getDisplayValues();

    const dateCol = findColumn_(headers, ['submission date', 'date', 'timestamp']);
    const emailCol = findColumn_(headers, EMAIL_LABELS);
    const bwCol = findColumn_(headers, ['current bodyweight', 'bodyweight', 'body weight', 'bw']);
    const notesCol = findColumn_(headers, ['notes', 'symptoms', 'workout notes', 'comments']);

    if (dateCol === -1 || emailCol === -1 || bwCol === -1) {
      Logger.log('  ⚠️ Missing required columns');
      return;
    }

    const exerciseGroups = detectExerciseGroups_(headers);
    const isGroupedFormat = exerciseGroups.length > 0;

    Logger.log(`  Layout: ${isGroupedFormat ? 'Grouped' : 'Simple'} (${exerciseGroups.length} groups)`);

    dataRows.forEach((row, rowIdx) => {
      const dateStr = row[dateCol];
      const date = parseTimestamp(dateStr, ss.getSpreadsheetTimeZone());
      const email = normalizeEmail_(row[emailCol]);
      const bodyweight = parseFloat(row[bwCol]) || 0;
      const clientNotes = notesCol >= 0 ? String(row[notesCol] || '').trim() : '';

      if (!date || !email || !bodyweight) {
        Logger.log(`  ⚠️ Row ${rowIdx + 2}: Missing required data`);
        return;
      }

      const allSets = [];
      const exerciseDetails = [];

      // Split function per requirements
      const split = s => String(s||'')
        .replace(/\(failed\)/gi, '')
        .split(/[,.]+/)
        .map(t => t.trim())
        .filter(t => t && !['BW', 'AMRAP', 'RIR'].includes(t.toUpperCase()))
        .map(Number)
        .filter(n => !isNaN(n));

      if (isGroupedFormat) {
        // GROUPED FORMAT
        exerciseGroups.forEach(group => {
          const setsValue = row[group.setsCol] || '';
          const repsRaw = row[group.repsCol] || '';
          const weightRaw = row[group.weightCol] || '';

          const repsList = split(repsRaw);
          const weightList = split(weightRaw);

          let numSets = parseInt(setsValue) || Math.max(repsList.length, weightList.length) || 1;

          for (let setNum = 1; setNum <= numSets; setNum++) {
            const reps = repsList[setNum - 1] || 0;
            const weight = weightList[setNum - 1] || bodyweight;

            const oneRM = reps > 0 ? weight * (1 + reps / 30) : 0;
            const normalized = bodyweight > 0 && oneRM > 0 ? oneRM / bodyweight : 0;

            allSets.push({ exercise: group.name, setNum, reps, weight, oneRM, normalized });

            parsedSheet.appendRow([
              date, email, sheet.getName(), group.name, setNum,
              reps || '', weight || '',
              oneRM ? oneRM.toFixed(2) : '',
              normalized ? normalized.toFixed(3) : ''
            ]);

            totalSetsProcessed++;
          }

          const setsSummary = repsList.length > 0 ? `${numSets}x${repsList.join('/')}` : `${numSets} sets`;
          exerciseDetails.push(`${group.name}: ${setsSummary}`);
        });

      } else {
        // SIMPLE FORMAT
        // Skip non-exercise columns (metadata, IDs, notes, timestamps)
        const skipCols = new Set([dateCol, emailCol, bwCol]);

        // Add additional metadata columns to skip
        headers.forEach((header, idx) => {
          const headerLower = String(header).toLowerCase();
          if (headerLower.includes('submission id') ||
              headerLower.includes('submissionid') ||
              headerLower.includes('notes') ||
              headerLower.includes('symptoms') ||
              headerLower.includes('end time') ||
              headerLower.includes('start time') ||
              headerLower.includes('duration') ||
              headerLower.includes('timestamp') ||
              headerLower.includes('id')) {
            skipCols.add(idx);
          }
        });

        headers.forEach((header, colIdx) => {
          if (skipCols.has(colIdx)) return;

          const cellValue = row[colIdx];
          const exerciseName = String(header).trim();

          if (!exerciseName || exerciseName === '') return;

          const reps = parseFloat(cellValue);
          if (isNaN(reps) || reps <= 0) return;

          const oneRM = bodyweight * (1 + reps / 30);
          const normalized = bodyweight > 0 ? oneRM / bodyweight : 0;

          allSets.push({ exercise: exerciseName, setNum: 1, reps, weight: bodyweight, oneRM, normalized });

          parsedSheet.appendRow([
            date, email, sheet.getName(), exerciseName, 1,
            reps, bodyweight,
            oneRM.toFixed(2),
            normalized.toFixed(3)
          ]);

          totalSetsProcessed++;
          exerciseDetails.push(`${exerciseName}: ${reps}`);
        });
      }

      // Calculate Workout Score as average 1RM (absolute strength)
      const validSets = allSets.filter(s => {
        const oneRM = Number(s.oneRM);
        return !isNaN(oneRM) && isFinite(oneRM) && oneRM > 0;
      });

      const workoutScore = validSets.length > 0 ?
        validSets.reduce((sum, s) => Number(sum) + Number(s.oneRM), 0) / validSets.length : 0;

      // Validate final workoutScore
      const safeWorkoutScore = (!isNaN(workoutScore) && isFinite(workoutScore)) ? Number(workoutScore.toFixed(2)) : 0;

      scoreSheet.appendRow([
        date, email, bodyweight, validSets.length,
        safeWorkoutScore, 'Σ(1RM)/N'
      ]);

      // Add to Timeline Master - write only essential columns
      if (timeline && exerciseDetails.length > 0) {
        // Check for duplicates before adding
        if (isDuplicateEntry_(timeline, date, email, 'Workout')) {
          Logger.log(`  ⚠️ Skipping duplicate workout: ${email} at ${date}`);
          totalRowsParsed++;
          return;
        }

        const clientDetails = ss.getSheetByName('Client Details');
        const clientName = getClientNames_(clientDetails).get(email) || '';
        const dateObj = parseDate_(date);
        const week = getWeekNumber_(dateObj);
        const month = Utilities.formatDate(dateObj, ss.getSpreadsheetTimeZone(), 'MMM yyyy');

        const workoutSummary = exerciseDetails.join('; ');

        // Build row array with header mapping (only populate essential columns)
        const timelineRow = new Array(timelineHeaders.length).fill('');
        timelineRow[findTimelineCol('Submission Date')] = date;
        timelineRow[findTimelineCol('Client Email')] = email;
        timelineRow[findTimelineCol('Client Name')] = clientName;
        timelineRow[findTimelineCol('Type')] = workoutSummary;  // Workout name/summary in Type column
        timelineRow[findTimelineCol('Strength Score')] = safeWorkoutScore;
        timelineRow[findTimelineCol('Response Status')] = 'Pending Review';
        timelineRow[findTimelineCol('Workout Notes')] = clientNotes;
        timelineRow[findTimelineCol('Week')] = week;
        timelineRow[findTimelineCol('Month')] = month;

        timeline.appendRow(timelineRow);
      }

      totalRowsParsed++;
    });

    Logger.log(`  ✓ Processed ${dataRows.length} row(s)`);
  });

  formatDateTimeColumn_(parsedSheet, 1);
  formatDateTimeColumn_(scoreSheet, 1);

  Logger.log('');
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log(`WORKOUT LOG PARSING COMPLETE`);
  Logger.log(`  Total rows parsed: ${totalRowsParsed}`);
  Logger.log(`  Total sets processed: ${totalSetsProcessed}`);
  Logger.log('═══════════════════════════════════════════════════════════');

  SpreadsheetApp.getUi().alert(
    '✓ Workout Parsing Complete',
    `Processed ${totalRowsParsed} workout submission(s)\n` +
    `Created ${totalSetsProcessed} set record(s)\n\n` +
    `Check these sheets:\n` +
    `• Timeline Master\n` +
    `• ParsedWorkouts\n` +
    `• GymScore`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PREPARE MEALS FOR ANALYSIS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Prepares meals for future Claude API analysis by calculating meal timing
 * based on workout proximity:
 * - pre-workout: within 1 hour before workout start
 * - post-workout: within 2 hours after workout end
 * - other: all other meals
 */
function prepareMealsForAnalysis() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timeline = ss.getSheetByName('Timeline Master');

  if (!timeline || timeline.getLastRow() <= 1) {
    SpreadsheetApp.getUi().alert('No data in Timeline Master');
    return;
  }

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('PREPARE MEALS FOR ANALYSIS STARTED');
  Logger.log('═══════════════════════════════════════════════════════════');

  const headers = timeline.getRange(1, 1, 1, timeline.getLastColumn()).getValues()[0];
  const dateCol = headers.indexOf('Submission Date');
  const emailCol = headers.indexOf('Client Email');
  const strengthScoreCol = headers.indexOf('Strength Score');
  const imageCol = headers.indexOf('Image');
  const minutesCol = headers.indexOf('Minutes to Workout');

  if (dateCol === -1 || emailCol === -1 || strengthScoreCol === -1 || imageCol === -1 || minutesCol === -1) {
    Logger.log('ERROR: Required columns not found');
    SpreadsheetApp.getUi().alert('Error: Missing required columns in Timeline Master');
    return;
  }

  const data = timeline.getRange(2, 1, timeline.getLastRow() - 1, timeline.getLastColumn()).getValues();

  // Separate meals and workouts based on which columns have data
  const meals = [];
  const workouts = [];

  data.forEach((row, idx) => {
    const dateTime = row[dateCol];
    const email = normalizeEmail_(row[emailCol]);
    const hasStrengthScore = row[strengthScoreCol] && String(row[strengthScoreCol]).trim() !== '';
    const hasImage = row[imageCol] && String(row[imageCol]).trim() !== '';

    if (hasImage && dateTime instanceof Date) {
      // Has image = meal row
      meals.push({ row: idx + 2, dateTime, email, currentMinutes: row[minutesCol] });
    } else if (hasStrengthScore && dateTime instanceof Date) {
      // Has strength score = workout row
      workouts.push({ dateTime, email });
    }
  });

  Logger.log(`Found ${meals.length} meals and ${workouts.length} workouts`);

  let mealsUpdated = 0;
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

  // For each meal, find closest workout and calculate timing
  meals.forEach(meal => {
    let closestWorkoutBefore = null;
    let closestWorkoutAfter = null;
    let minTimeBefore = Infinity;
    let minTimeAfter = Infinity;

    // Find closest workouts before and after for this client
    workouts.forEach(workout => {
      if (workout.email !== meal.email) return;

      const timeDiff = meal.dateTime.getTime() - workout.dateTime.getTime();

      if (timeDiff > 0) {
        // Meal is after workout
        if (timeDiff < minTimeAfter) {
          minTimeAfter = timeDiff;
          closestWorkoutAfter = workout;
        }
      } else if (timeDiff < 0) {
        // Meal is before workout
        const absTimeDiff = Math.abs(timeDiff);
        if (absTimeDiff < minTimeBefore) {
          minTimeBefore = absTimeDiff;
          closestWorkoutBefore = workout;
        }
      }
    });

    // Calculate minutes to nearest workout
    // Negative = before workout, Positive = after workout
    let minutesToWorkout = '';

    if (closestWorkoutAfter !== null || closestWorkoutBefore !== null) {
      let closestTime = Infinity;
      let isAfter = false;

      if (closestWorkoutAfter && minTimeAfter < closestTime) {
        closestTime = minTimeAfter;
        isAfter = true;
      }
      if (closestWorkoutBefore && minTimeBefore < closestTime) {
        closestTime = minTimeBefore;
        isAfter = false;
      }

      const minutes = Math.round(closestTime / (60 * 1000));
      minutesToWorkout = isAfter ? minutes : -minutes;
    }

    // Update only if different from current value
    if (minutesToWorkout !== meal.currentMinutes) {
      timeline.getRange(meal.row, minutesCol + 1).setValue(minutesToWorkout);
      mealsUpdated++;
      Logger.log(`  Updated meal for ${meal.email} at ${meal.dateTime} → ${minutesToWorkout} min`);
    }
  });

  Logger.log('');
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log(`PREPARE MEALS FOR ANALYSIS COMPLETE`);
  Logger.log(`  Meals analyzed: ${meals.length}`);
  Logger.log(`  Meals updated: ${mealsUpdated}`);
  Logger.log('═══════════════════════════════════════════════════════════');

  SpreadsheetApp.getUi().alert(
    '✓ Meal Analysis Preparation Complete',
    `Analyzed ${meals.length} meal(s)\n` +
    `Updated ${mealsUpdated} meal timing(s)\n\n` +
    `Minutes to Workout:\n` +
    `• Negative values = meal before workout\n` +
    `• Positive values = meal after workout\n` +
    `• Empty = no nearby workouts\n\n` +
    `Ready for future Claude API scoring!`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Parses numeric lists from strings with improved handling:
 * - Splits on commas, dots, spaces, slashes, pipes
 * - Handles "BW" as bodyweight marker
 * - Detects concatenated numbers (e.g., "405405405405")
 * - Ignores "AMRAP", "RIR", "(failed)"
 */
function parseNumericList_(rawStr, bodyweight) {
  bodyweight = bodyweight || 0;

  if (!rawStr || rawStr.trim() === '') return [];

  const str = String(rawStr).trim().toUpperCase();

  // Handle "BW" marker
  if (str === 'BW' && bodyweight > 0) return [bodyweight];

  // Ignore text markers
  if (str.includes('AMRAP') || str.includes('RIR') || str.includes('FAILED')) return [];

  // Try splitting on common delimiters
  let tokens = str.split(/[,\s/|.]+/);

  // Clean and parse each token
  let numbers = tokens
    .map(t => t.replace(/[^\d.]/g, ''))
    .filter(t => t !== '')
    .map(t => parseFloat(t))
    .filter(n => !isNaN(n) && n > 0);

  // If we got valid numbers, return them
  if (numbers.length > 0) return numbers;

  // Handle concatenated numbers (e.g., "405405405405")
  const cleanStr = rawStr.replace(/[^\d]/g, '');
  if (cleanStr.length >= 9 && cleanStr.length % 3 === 0) {
    const chunks = cleanStr.match(/\d{3}/g);
    if (chunks && chunks.length > 1) {
      numbers = chunks.map(c => parseFloat(c)).filter(n => !isNaN(n));
      if (numbers.length > 0) return numbers;
    }
  }

  return [];
}

/**
 * Detects exercise groups from headers with format:
 * - "Exercise Name (Sets)"
 * - "Exercise Name (Reps,Reps,Reps,Reps)" or "Exercise Name (Reps...)"
 * - "Exercise Name (Weight,Weight,Weight,Weight)" or "Exercise Name (Weight...)"
 */
function detectExerciseGroups_(headers) {
  const groups = new Map();

  headers.forEach((header, idx) => {
    const headerStr = String(header).trim();

    // Match patterns like "Exercise Name (Sets)", "Exercise Name (Reps...)", etc.
    const setsMatch = headerStr.match(/^(.+?)\s*\(sets\)\s*$/i);
    const repsMatch = headerStr.match(/^(.+?)\s*\(reps[,\s\)]/i);
    const weightMatch = headerStr.match(/^(.+?)\s*\(weight[,\s\)]/i);

    if (setsMatch) {
      const exerciseName = setsMatch[1].trim();
      if (!groups.has(exerciseName)) {
        groups.set(exerciseName, { name: exerciseName, setsCol: -1, repsCol: -1, weightCol: -1 });
      }
      groups.get(exerciseName).setsCol = idx;
    }

    if (repsMatch) {
      const exerciseName = repsMatch[1].trim();
      if (!groups.has(exerciseName)) {
        groups.set(exerciseName, { name: exerciseName, setsCol: -1, repsCol: -1, weightCol: -1 });
      }
      groups.get(exerciseName).repsCol = idx;
    }

    if (weightMatch) {
      const exerciseName = weightMatch[1].trim();
      if (!groups.has(exerciseName)) {
        groups.set(exerciseName, { name: exerciseName, setsCol: -1, repsCol: -1, weightCol: -1 });
      }
      groups.get(exerciseName).weightCol = idx;
    }
  });

  // Convert to array and filter valid groups (must have at least reps or weight column)
  return Array.from(groups.values()).filter(g => g.repsCol !== -1 || g.weightCol !== -1);
}

// ═══════════════════════════════════════════════════════════════════════
// WORKOUT LOG DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Diagnostic function to reveal parsing bugs in workout logs.
 * Does NOT modify any sheets - only logs structure and sample data.
 */
function debugParseStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let debugLog = [];

  debugLog.push('═══════════════════════════════════════════════════════════');
  debugLog.push('WORKOUT LOG STRUCTURE DIAGNOSTIC');
  debugLog.push('═══════════════════════════════════════════════════════════\n');

  // Find all workout log sheets
  const allSheets = ss.getSheets();
  const workoutLogSheets = allSheets.filter(sheet =>
    sheet.getName().toLowerCase().includes('workout log')
  );

  if (workoutLogSheets.length === 0) {
    debugLog.push('❌ NO WORKOUT LOG SHEETS FOUND');
    Logger.log(debugLog.join('\n'));
    SpreadsheetApp.getUi().alert('No sheets found with "Workout Log" in the name');
    return;
  }

  debugLog.push(`✓ Found ${workoutLogSheets.length} workout log sheet(s)\n`);

  // Process each sheet
  workoutLogSheets.forEach((sheet, sheetIdx) => {
    debugLog.push(`\n${'='.repeat(60)}`);
    debugLog.push(`SHEET ${sheetIdx + 1}: "${sheet.getName()}"`);
    debugLog.push('='.repeat(60));

    if (sheet.getLastRow() <= 1) {
      debugLog.push('⚠️  No data rows');
      return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const firstDataRow = sheet.getLastRow() > 1 ?
      sheet.getRange(2, 1, 1, sheet.getLastColumn()).getDisplayValues()[0] : null;

    // 1. HEADERS AND INDICES
    debugLog.push('\n📋 HEADERS (with column indices):');
    headers.forEach((header, idx) => {
      const headerStr = String(header).substring(0, 50); // Truncate long headers
      debugLog.push(`  [${idx}] "${headerStr}"`);
    });

    // 2. DETECT REQUIRED COLUMNS
    debugLog.push('\n🔍 REQUIRED COLUMNS:');
    const dateCol = findColumn_(headers, ['submission date', 'date', 'timestamp']);
    const emailCol = findColumn_(headers, EMAIL_LABELS);
    const bwCol = findColumn_(headers, ['current bodyweight', 'bodyweight', 'body weight', 'bw']);

    debugLog.push(`  Date Column: ${dateCol} ${dateCol !== -1 ? '✓' : '❌'}`);
    debugLog.push(`  Email Column: ${emailCol} ${emailCol !== -1 ? '✓' : '❌'}`);
    debugLog.push(`  Bodyweight Column: ${bwCol} ${bwCol !== -1 ? '✓' : '❌'}`);

    if (dateCol === -1 || emailCol === -1 || bwCol === -1) {
      debugLog.push('  ❌ MISSING REQUIRED COLUMNS - CANNOT PARSE');
      return;
    }

    // 3. DETECT EXERCISE GROUPS
    debugLog.push('\n🏋️ EXERCISE GROUPS DETECTED:');
    const exerciseGroups = detectExerciseGroups_(headers);

    if (exerciseGroups.length === 0) {
      debugLog.push('  ⚠️  No exercise groups found with (Sets), (Reps...), or (Weight...) pattern');
    } else {
      exerciseGroups.forEach((group, idx) => {
        debugLog.push(`  ${idx + 1}. "${group.name}"`);
        debugLog.push(`     Sets Col: ${group.setsCol >= 0 ? group.setsCol : 'N/A'}`);
        debugLog.push(`     Reps Col: ${group.repsCol >= 0 ? group.repsCol : 'N/A'}`);
        debugLog.push(`     Weight Col: ${group.weightCol >= 0 ? group.weightCol : 'N/A'}`);
      });
    }

    // 4. SAMPLE ROW DATA
    if (firstDataRow) {
      debugLog.push('\n📊 FIRST DATA ROW (Row 2):');
      debugLog.push(`  Date: "${firstDataRow[dateCol]}" (type: ${typeof firstDataRow[dateCol]})`);
      debugLog.push(`  Email: "${firstDataRow[emailCol]}"`);
      debugLog.push(`  Bodyweight: "${firstDataRow[bwCol]}" → Parsed: ${parseFloat(firstDataRow[bwCol]) || 'FAILED'}`);

      // Split function matching parseAllWorkoutLogs()
      const split = s => String(s||'')
        .replace(/\(failed\)/gi, '')
        .split(/[,.]+/)
        .map(t => t.trim())
        .filter(t => t && !['BW', 'AMRAP', 'RIR'].includes(t.toUpperCase()))
        .map(Number)
        .filter(n => !isNaN(n));

      debugLog.push('\n  Exercise Data:');
      exerciseGroups.forEach(group => {
        debugLog.push(`    ${group.name}:`);

        // Declare variables outside blocks to avoid scope issues
        let repsList = [];
        let weightList = [];

        if (group.setsCol >= 0) {
          const setsValue = firstDataRow[group.setsCol];
          debugLog.push(`      Sets: "${setsValue}" (type: ${typeof setsValue})`);
        }

        if (group.repsCol >= 0) {
          const repsValue = String(firstDataRow[group.repsCol] || '');
          debugLog.push(`      Reps Raw: "${repsValue}"`);

          // Use matching split function
          repsList = split(repsValue);
          debugLog.push(`      Reps Parsed: [${repsList.join(', ')}] (${repsList.length} values)`);
        }

        if (group.weightCol >= 0) {
          const weightValue = String(firstDataRow[group.weightCol] || '');
          debugLog.push(`      Weight Raw: "${weightValue}"`);

          // Use matching split function
          weightList = split(weightValue);
          debugLog.push(`      Weight Parsed: [${weightList.join(', ')}] (${weightList.length} values)`);

          // Test 1RM calculation with first set
          if (weightList.length > 0 && repsList.length > 0) {
            const reps = repsList[0];
            const weight = weightList[0];
            const oneRM = weight * (1 + reps / 30);
            const bodyweight = parseFloat(firstDataRow[bwCol]) || 0;
            const normalized = bodyweight > 0 ? oneRM / bodyweight : 0;

            debugLog.push(`      🧮 CALCULATION TEST (Set 1):`);
            debugLog.push(`         Reps: ${reps}, Weight: ${weight}`);
            debugLog.push(`         1RM = ${weight} × (1 + ${reps}/30) = ${oneRM.toFixed(2)}`);
            debugLog.push(`         Normalized = ${oneRM.toFixed(2)} / ${bodyweight} = ${normalized.toFixed(3)}`);
          }
        }
      });
    }

    // 5. COMMA/DOT PARSING TESTS (using same split function as parser)
    debugLog.push('\n🧪 COMMA/DOT PARSING TESTS:');
    const testCases = [
      '405,405,405,405',
      '8,9,7,6',
      '110.120.140',  // Period separator (common bug)
      '3x5@315',      // Common format
      'BW',           // Bodyweight marker
      '20',           // Single value
      '',             // Empty
      'AMRAP',        // Text marker
      'RIR'           // Reps in Reserve marker
    ];

    // Use same split function as parser
    const testSplit = s => String(s||'')
      .replace(/\(failed\)/gi, '')
      .split(/[,.]+/)
      .map(t => t.trim())
      .filter(t => t && !['BW', 'AMRAP', 'RIR'].includes(t.toUpperCase()))
      .map(Number)
      .filter(n => !isNaN(n));

    testCases.forEach(testCase => {
      const parsed = testSplit(testCase);
      const expected = ['', 'BW', 'AMRAP', 'RIR'].includes(testCase) ? '❌ (Expected)' : parsed.length === 0 ? '❌ FAILED' : '✓';
      debugLog.push(`  "${testCase}" → [${parsed.join(', ')}] ${expected}`);
    });

    // 6. PATTERN MATCHING TESTS
    debugLog.push('\n🔎 HEADER PATTERN MATCHING:');
    const testHeaders = [
      'Incline Barbell Bench-Press (Sets)',
      'Incline Barbell Bench-Press (Reps,Reps,Reps,Reps)',
      'Incline Barbell Bench-Press (Weight,Weight,Weight,Weight)',
      'Pull-Ups',  // Old format without parentheses
      'Squats (Sets)',
      'Deadlift (Weight)'
    ];

    testHeaders.forEach(testHeader => {
      const setsMatch = testHeader.match(/^(.+?)\s*\(sets\)\s*$/i);
      const repsMatch = testHeader.match(/^(.+?)\s*\(reps[,\s\)]/i);
      const weightMatch = testHeader.match(/^(.+?)\s*\(weight[,\s\)]/i);

      const matches = [];
      if (setsMatch) matches.push('Sets');
      if (repsMatch) matches.push('Reps');
      if (weightMatch) matches.push('Weight');

      debugLog.push(`  "${testHeader}" → ${matches.length > 0 ? matches.join(', ') : '❌ NO MATCH'}`);
    });
  });

  debugLog.push('\n═══════════════════════════════════════════════════════════');
  debugLog.push('END DIAGNOSTIC');
  debugLog.push('═══════════════════════════════════════════════════════════');

  // Output to Logger
  const fullLog = debugLog.join('\n');
  Logger.log(fullLog);

  // Output to UI (first 3000 chars due to alert length limit)
  const truncatedLog = fullLog.substring(0, 3000);
  const alertMessage = truncatedLog +
    (fullLog.length > 3000 ? `\n\n... (${fullLog.length - 3000} more chars in Logger)` : '');

  SpreadsheetApp.getUi().alert(
    '🔍 Workout Log Diagnostic Complete',
    'Check the Execution Log (View → Execution log) for full details.\n\nSummary:\n\n' + alertMessage,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TIMEZONE UTILITIES
// ═══════════════════════════════════════════════════════════════════════

function getTimezones() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let spreadsheetTZ = ss.getSpreadsheetTimeZone();
  const scriptTZ = Session.getScriptTimeZone();

  if (!spreadsheetTZ || spreadsheetTZ === '') {
    Logger.log('⚠️ WARNING: Spreadsheet timezone not set, using script timezone');
    spreadsheetTZ = scriptTZ;
  }

  Logger.log(`  Spreadsheet timezone: ${spreadsheetTZ}`);
  Logger.log(`  Script timezone: ${scriptTZ}`);

  if (spreadsheetTZ !== scriptTZ) {
    Logger.log(`  ⚠️ WARNING: Timezones differ!`);
  }

  return { spreadsheetTZ, scriptTZ };
}

function parseTimestamp(value, spreadsheetTZ) {
  if (!value) return null;

  if (!spreadsheetTZ) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    spreadsheetTZ = ss.getSpreadsheetTimeZone();
    if (!spreadsheetTZ || spreadsheetTZ === '') {
      spreadsheetTZ = Session.getScriptTimeZone();
    }
  }

  // Already a Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value;
  }

  // Numeric timestamp
  if (typeof value === 'number') {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  }

  // String timestamp - parse in SPREADSHEET timezone
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Format: "YYYY-MM-DD HH:mm:SS"
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      const [, year, month, day, hour, minute, second] = match;

      // Calculate timezone offset
      const testDate = new Date('2025-01-15T12:00:00Z');
      const testFormatted = Utilities.formatDate(testDate, spreadsheetTZ, 'yyyy-MM-dd HH:mm:ss');
      const testParsedLocal = new Date(testFormatted.replace(' ', 'T'));
      const tzOffsetMs = testDate.getTime() - testParsedLocal.getTime();

      const localParsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
      const correctedDate = new Date(localParsed.getTime() - tzOffsetMs);

      if (!isNaN(correctedDate.getTime())) {
        return correctedDate;
      }
    }

    // Fallback
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function formatDateForLog(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return 'INVALID DATE';
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let tz = ss.getSpreadsheetTimeZone();
  if (!tz || tz === '') {
    tz = Session.getScriptTimeZone();
  }
  return Utilities.formatDate(date, tz, 'MMM d, yyyy h:mm:ss a z');
}

function normalizeToSpreadsheetTime(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  return date.getTime();
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function getOrCreateSheet_(ss, name, headers, color) {
  let sheet = ss.getSheetByName(name);
  const isNewSheet = !sheet;

  if (isNewSheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    formatHeader_(sheet, headers.length, color);
  }

  return sheet;
}

function formatHeader_(sheet, colCount, color) {
  sheet.getRange(1, 1, 1, colCount)
    .setFontWeight('bold')
    .setBackground(color)
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

function formatDateTimeColumn_(sheet, colNum) {
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, colNum, sheet.getMaxRows() - 1, 1)
      .setNumberFormat('MMM d, yyyy h:mm:ss a');
  }
}

function addStatusValidation_(sheet, colNum) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending Review', 'Ready to Send', 'Sent'], true)
    .setAllowInvalid(false)
    .build();

  if (sheet.getMaxRows() > 1) {
    sheet.getRange(2, colNum, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
  }
}

function addMealTimingValidation_(sheet, colNum) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['pre-workout', 'post-workout', 'other'], true)
    .setAllowInvalid(false)
    .build();

  if (sheet.getMaxRows() > 1) {
    sheet.getRange(2, colNum, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
  }
}

function findColumn_(headers, labels) {
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]).toLowerCase().trim();
    if (labels.some(label => header === label || header.includes(label))) {
      return i;
    }
  }
  return -1;
}

function normalizeEmail_(str) {
  return String(str || '').toLowerCase().trim();
}

function getClientNames_(clientDetails) {
  const map = new Map();
  if (!clientDetails || clientDetails.getLastRow() <= 1) return map;

  const data = clientDetails.getRange(2, 1, clientDetails.getLastRow() - 1, 2).getValues();
  data.forEach(row => {
    const email = normalizeEmail_(row[0]);
    const name = String(row[1] || '').trim();
    if (email) map.set(email, name);
  });

  return map;
}

/**
 * Checks if an entry already exists in Timeline Master
 * @param {Sheet} timeline - Timeline Master sheet
 * @param {Date} dateTime - Entry datetime
 * @param {string} email - Client email
 * @param {string} type - Entry type (Workout/Meal)
 * @returns {boolean} - True if duplicate exists
 */
function isDuplicateEntry_(timeline, dateTime, email, type) {
  if (!timeline || timeline.getLastRow() <= 1) return false;

  const headers = timeline.getRange(1, 1, 1, timeline.getLastColumn()).getValues()[0];
  const dateCol = headers.indexOf('Submission Date');
  const emailCol = headers.indexOf('Client Email');
  const strengthScoreCol = headers.indexOf('Strength Score');
  const imageCol = headers.indexOf('Image');

  if (dateCol === -1 || emailCol === -1 || strengthScoreCol === -1 || imageCol === -1) return false;

  const data = timeline.getRange(2, 1, timeline.getLastRow() - 1, timeline.getLastColumn()).getValues();

  for (let i = 0; i < data.length; i++) {
    const rowDate = data[i][dateCol];
    const rowEmail = normalizeEmail_(data[i][emailCol]);
    const hasStrengthScore = data[i][strengthScoreCol] && String(data[i][strengthScoreCol]).trim() !== '';
    const hasImage = data[i][imageCol] && String(data[i][imageCol]).trim() !== '';

    // Determine if this row matches the type we're checking for
    let isMatchingType = false;
    if (type === 'Workout' && hasStrengthScore) {
      isMatchingType = true;
    } else if (type === 'Meal' && hasImage) {
      isMatchingType = true;
    }

    // Compare datetime (within 1 minute tolerance), email, and type
    if (rowDate instanceof Date && dateTime instanceof Date && isMatchingType) {
      const timeDiff = Math.abs(rowDate.getTime() - dateTime.getTime());
      if (timeDiff < 60000 && rowEmail === normalizeEmail_(email)) {
        return true;
      }
    }
  }

  return false;
}

function parseDate_(dateStr) {
  if (dateStr instanceof Date) return dateStr;
  return new Date(dateStr);
}

function getWeekNumber_(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `Week ${weekNo}`;
}

// ═══════════════════════════════════════════════════════════════════════
// DIAGNOSTIC FUNCTIONS - READ-ONLY
// ═══════════════════════════════════════════════════════════════════════

/**
 * Diagnostic 1: Compare getValues() vs getDisplayValues() for Workout Log 2
 * Proves whether Sheets is coercing Jotform-imported cells
 */
function diagValuesVsDisplay() {
  console.log('═══ DIAGNOSTIC 1: Values vs Display ═══');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Workout Log 2');

  if (!sheet) {
    console.log('❌ Sheet "Workout Log 2" not found');
    return;
  }

  if (sheet.getLastRow() < 2) {
    console.log('❌ No data in row 2');
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row2Values = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row2Display = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const row2Formats = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getNumberFormats()[0];

  console.log('\n📋 Headers:');
  headers.forEach((h, i) => console.log(`  [${i}] "${h}"`));

  // Find first exercise group
  let repsCol = -1;
  let weightCol = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toLowerCase();
    if (h.includes('(reps') && repsCol === -1) repsCol = i;
    if (h.includes('(weight') && weightCol === -1) weightCol = i;
  }

  if (repsCol === -1 || weightCol === -1) {
    console.log('❌ No exercise columns found with (Reps or (Weight patterns');
    return;
  }

  console.log('\n🏋️ First Exercise Group:');
  console.log(`  Reps Column: [${repsCol}] "${headers[repsCol]}"`);
  console.log(`  Weight Column: [${weightCol}] "${headers[weightCol]}"`);

  // Reps analysis
  console.log('\n📊 REPS ANALYSIS:');
  console.log(`  getValues(): ${JSON.stringify(row2Values[repsCol])} (type: ${typeof row2Values[repsCol]})`);
  console.log(`  getDisplayValues(): "${row2Display[repsCol]}" (type: ${typeof row2Display[repsCol]})`);
  console.log(`  Number Format: "${row2Formats[repsCol]}"`);

  const split = s => String(s||'').split(/[,\s/|.]+/).filter(Boolean);
  console.log(`  Split(getValues Reps) -> [${split(row2Values[repsCol]).join(', ')}]`);
  console.log(`  Split(getDisplayValues Reps) -> [${split(row2Display[repsCol]).join(', ')}]`);

  // Weight analysis
  console.log('\n⚖️ WEIGHT ANALYSIS:');
  console.log(`  getValues(): ${JSON.stringify(row2Values[weightCol])} (type: ${typeof row2Values[weightCol]})`);
  console.log(`  getDisplayValues(): "${row2Display[weightCol]}" (type: ${typeof row2Display[weightCol]})`);
  console.log(`  Number Format: "${row2Formats[weightCol]}"`);
  console.log(`  Split(getValues Weight) -> [${split(row2Values[weightCol]).join(', ')}]`);
  console.log(`  Split(getDisplayValues Weight) -> [${split(row2Display[weightCol]).join(', ')}]`);

  console.log('\n✅ Diagnostic 1 complete\n');
}

/**
 * Diagnostic 2: Check locale and number formats
 * Explains why "110.120.140" may become 110.12 or why commas are dropped
 */
function diagLocaleAndFormats() {
  console.log('═══ DIAGNOSTIC 2: Locale and Formats ═══');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const locale = ss.getSpreadsheetLocale();

  console.log(`\n🌍 Spreadsheet Locale: "${locale}"`);
  console.log(`   (Determines how numbers are interpreted)`);
  console.log(`   - en_US: period=decimal, comma=thousands`);
  console.log(`   - de_DE: comma=decimal, period=thousands`);

  const sheet = ss.getSheetByName('Workout Log 2');

  if (!sheet) {
    console.log('\n❌ Sheet "Workout Log 2" not found');
    return;
  }

  if (sheet.getLastRow() < 2) {
    console.log('\n❌ No data in row 2');
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row2Formats = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getNumberFormats()[0];

  console.log('\n📐 Number Formats for Exercise Columns:');

  headers.forEach((h, i) => {
    const headerStr = String(h).toLowerCase();
    if (headerStr.includes('(reps') || headerStr.includes('(weight')) {
      console.log(`\n  [${i}] "${h}"`);
      console.log(`      Format: "${row2Formats[i]}"`);
      console.log(`      Explanation: ${row2Formats[i] === '' ? 'Automatic (Sheets decides)' : 'Custom format applied'}`);
    }
  });

  console.log('\n💡 Why "110.120.140" might become 110.12:');
  console.log(`   - If locale is "${locale}" and format is automatic:`);
  console.log(`   - Sheets may interpret periods as decimal separators`);
  console.log(`   - Result: "110.120.140" → 110.12 (truncated after 2nd decimal)`);
  console.log(`   - Or: interpreted as thousands → 110120.14`);

  console.log('\n✅ Diagnostic 2 complete\n');
}

/**
 * Diagnostic 3: Verify Timeline Master column mapping
 * Confirms Workout Score and other columns are correctly targeted
 */
function diagTimelineMappingAndLastRows() {
  console.log('═══ DIAGNOSTIC 3: Timeline Mapping ═══');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timeline = ss.getSheetByName('Timeline Master');

  if (!timeline) {
    console.log('❌ Sheet "Timeline Master" not found');
    return;
  }

  if (timeline.getLastRow() < 1) {
    console.log('❌ Timeline Master has no headers');
    return;
  }

  const headers = timeline.getRange(1, 1, 1, timeline.getLastColumn()).getDisplayValues()[0];

  console.log('\n📋 Timeline Master Headers:');
  headers.forEach((h, i) => console.log(`  [${i}] "${h}"`));

  // Find key columns (case-insensitive)
  const findCol = (name) => {
    const nameLower = name.toLowerCase();
    return headers.findIndex(h => String(h).toLowerCase() === nameLower);
  };

  const dateTimeCol = findCol('datetime');
  const workoutScoreCol = findCol('workout score');
  const emailCol = findCol('client email');
  const ingredientsCol = findCol('ingredients');
  const cookingMethodCol = findCol('cooking method');
  const notesCol = findCol('notes');
  const workoutNotesCol = findCol('workout notes');

  console.log('\n🎯 Key Column Indices:');
  console.log(`  DateTime: ${dateTimeCol >= 0 ? `[${dateTimeCol}] ✓` : '❌ NOT FOUND'}`);
  console.log(`  Workout Score: ${workoutScoreCol >= 0 ? `[${workoutScoreCol}] ✓` : '❌ NOT FOUND'}`);
  console.log(`  Client Email: ${emailCol >= 0 ? `[${emailCol}] ✓` : '❌ NOT FOUND'}`);
  console.log(`  Ingredients: ${ingredientsCol >= 0 ? `[${ingredientsCol}]` : '(not found)'}`);
  console.log(`  Cooking Method: ${cookingMethodCol >= 0 ? `[${cookingMethodCol}]` : '(not found)'}`);
  console.log(`  Workout Notes: ${workoutNotesCol >= 0 ? `[${workoutNotesCol}]` : '(not found)'}`);

  if (timeline.getLastRow() < 2) {
    console.log('\n⚠️ No data rows in Timeline Master');
    console.log('✅ Diagnostic 3 complete\n');
    return;
  }

  // Get last 1-2 rows
  const numRows = Math.min(2, timeline.getLastRow() - 1);
  const startRow = timeline.getLastRow() - numRows + 1;
  const lastRows = timeline.getRange(startRow, 1, numRows, timeline.getLastColumn()).getValues();

  console.log(`\n📊 Last ${numRows} Data Row(s):`);

  lastRows.forEach((row, idx) => {
    console.log(`\n  Row ${startRow + idx}:`);
    console.log(`    DateTime: ${dateTimeCol >= 0 ? row[dateTimeCol] : 'N/A'}`);
    console.log(`    Client Email: ${emailCol >= 0 ? row[emailCol] : 'N/A'}`);
    console.log(`    Workout Score: ${workoutScoreCol >= 0 ? row[workoutScoreCol] : 'N/A'}`);

    // Find narrative (first non-empty from Ingredients, Cooking Method, Workout Notes)
    let narrative = '';
    if (ingredientsCol >= 0 && row[ingredientsCol]) narrative = row[ingredientsCol];
    else if (cookingMethodCol >= 0 && row[cookingMethodCol]) narrative = row[cookingMethodCol];
    else if (workoutNotesCol >= 0 && row[workoutNotesCol]) narrative = row[workoutNotesCol];

    console.log(`    Narrative: ${narrative ? String(narrative).substring(0, 100) : '(empty)'}`);
  });

  console.log('\n✅ Diagnostic 3 complete\n');
}
