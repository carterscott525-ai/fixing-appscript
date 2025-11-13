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
  'Meal Image+Info'
]);

// ═══════════════════════════════════════════════════════════════════════
// TAB HEADERS (exact order required)
// ═══════════════════════════════════════════════════════════════════════

const TIMELINE_HEADERS = [
  'Submission Time', 'Type', 'Client Email', 'Client Name', 'Image URL',
  'Details', 'Ingredients', 'Portions', 'Cooking Method',
  'Meal Timing Category', 'Fuel Score', 'Recovery Score', 'Other Score',
  'Meal Notes', 'Timing Minutes', 'Meal Status', 'Last Updated',
  'Exercises', 'Sets/Reps', 'Workout Notes',
  'Coach Response', 'Response Status', 'Week', 'Month', 'Submission ID'
];

const MEAL_POOL_HEADERS = [
  'Submission Time', 'Client Email', 'Image URL', 'Meal Name',
  'Core Ingredients', 'Added Ingredients', 'Cooking Method',
  'Portions', 'Submission ID'
];

const MEAL_IMAGE_INFO_HEADERS = [
  'Submission Time', 'Client Email', 'Image URL', 'Meal Name',
  'Core Ingredients', 'Added Ingredients', 'Cooking Method',
  'Portions', 'Submission ID'
];

const QUESTIONS_HEADERS = [
  'Submission Time', 'Client Email', 'Question',
  'Coach Response', 'Status', 'Submission ID'
];

const CLIENT_DETAILS_HEADERS = [
  'Client Email', 'Client Name', 'Age', 'Gender', 'Height (cm)', 'Weight (kg)',
  'BMI', 'Phone Number', 'Medical Conditions', 'Allergies/Intolerances',
  'Current Injuries/Limitations', 'Medications', 'Sleep Quality (hrs/night)',
  'Stress Level', 'Training Experience', 'Fitness Goal', 'Activity Level',
  'Preferred Training Style', 'Dietary Restrictions', 'Food Preferences',
  'Foods to Avoid', 'Protein Target (g/day)', 'Carb Target (g/day)',
  'Fat Target (g/day)', 'Calorie Target', 'Additional Micronutrient Consideration',
  'Emergency Contact', 'Notes/Other', 'Start Date', 'Last Updated'
];

const WORKOUT_POOL_HEADERS = [
  'Submission Time', 'Client Email', 'Exercise', 'Sets', 'Reps',
  'Weight', 'Bodyweight', 'Notes', 'Submission ID'
];

// ═══════════════════════════════════════════════════════════════════════
// LABEL SYNONYMS FOR AUTO-DISCOVERY
// ═══════════════════════════════════════════════════════════════════════

const EMAIL_LABELS = ['client email', 'email', 'email address', 'e-mail'];
const TIMESTAMP_LABELS = ['submission time', 'submitted time', 'timestamp', 'submitted at', 'date time', 'datetime', 'date', 'time'];
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
  addStatusValidation_(timeline, 22); // Response Status column
  formatDateTimeColumn_(timeline, 1); // Submission Time column
  formatDateTimeColumn_(timeline, 17); // Last Updated column
  Logger.log(`✓ Timeline Master ready`);

  // Create Meal Pool
  let mealPool = getOrCreateSheet_(ss, 'Meal Pool', MEAL_POOL_HEADERS, '#4CAF50');
  formatDateTimeColumn_(mealPool, 1); // Submission Time column
  Logger.log(`✓ Meal Pool ready`);

  // Create Meal Image+Info (staging)
  let mealImageInfo = getOrCreateSheet_(ss, 'Meal Image+Info', MEAL_IMAGE_INFO_HEADERS, '#4CAF50');
  formatDateTimeColumn_(mealImageInfo, 1); // Submission Time column
  Logger.log(`✓ Meal Image+Info ready`);

  // Create Workout Pool
  let workoutPool = getOrCreateSheet_(ss, 'Workout Pool', WORKOUT_POOL_HEADERS, '#FF9800');
  formatDateTimeColumn_(workoutPool, 1); // Submission Time column
  Logger.log(`✓ Workout Pool ready`);

  // Create Questions tab
  let questions = getOrCreateSheet_(ss, 'General Questions and Feedback', QUESTIONS_HEADERS, '#9C27B0');
  addStatusValidation_(questions, 5); // Status column
  formatDateTimeColumn_(questions, 1); // Submission Time column
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
  Logger.log(`  Workouts ingested: ${ingestCounts.workouts}`);

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
  let workoutsIngested = 0;

  Logger.log('\n[DEBUG] Scanning all sheets for data sources...');

  allSheets.forEach(sheet => {
    const sheetName = sheet.getName();

    Logger.log(`\n[DEBUG] Checking sheet: "${sheetName}"`);

    // Skip output/managed tabs
    if (OUTPUT_TABS.has(sheetName)) {
      Logger.log(`  → Skipped (output tab)`);
      return;
    }

    // Skip if no data
    if (sheet.getLastRow() <= 1) {
      Logger.log(`  → Skipped (no data)`);
      return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headersLower = headers.map(h => String(h).toLowerCase().trim());

    Logger.log(`  → Headers: ${JSON.stringify(headers)}`);

    // Check basic requirements
    const hasEmail = headersLower.some(h => EMAIL_LABELS.some(label => h === label || h.includes(label)));
    const hasTimestamp = headersLower.some(h => TIMESTAMP_LABELS.some(label => h.includes(label)));

    Logger.log(`  → hasEmail: ${hasEmail}`);
    Logger.log(`  → hasTimestamp: ${hasTimestamp}`);

    // Check if it's a meal source
    const hasMealName = headersLower.some(h => MEAL_NAME_LABELS.some(label => h.includes(label)));
    Logger.log(`  → hasMealName: ${hasMealName}`);

    if (hasMealName && hasEmail && hasTimestamp) {
      Logger.log(`  → DETECTED AS MEAL SOURCE`);
      const count = ingestMealSource_(ss, sheet, headers);
      mealsIngested += count;
      Logger.log(`  → Ingested ${count} meals`);
      return;
    }

    // Check if it's a questions source
    const hasQuestion = headersLower.some(h => QUESTION_LABELS.some(label => h.includes(label)));
    Logger.log(`  → hasQuestion: ${hasQuestion}`);

    if (hasQuestion && hasEmail && hasTimestamp) {
      Logger.log(`  → DETECTED AS QUESTION SOURCE`);
      const count = ingestQuestionsSource_(ss, sheet, headers);
      questionsIngested += count;
      Logger.log(`  → Ingested ${count} questions`);
      return;
    }

    // Check if it's a workout source - SIMPLIFIED LOGIC
    // A tab is a workout source if it has: Email + Timestamp + (Bodyweight OR Sets)
    const hasBodyweight = headersLower.some(h =>
      h === 'bodyweight' ||
      h === 'body weight' ||
      h === 'current bodyweight' ||
      h.includes('bodyweight')
    );

    const hasSets = headersLower.some(h =>
      h === 'sets' ||
      h.includes('(sets)') ||
      h.includes('sets')
    );

    const isWorkoutSource = (hasBodyweight || hasSets) && hasEmail && hasTimestamp;

    Logger.log(`  → hasBodyweight: ${hasBodyweight}`);
    Logger.log(`  → hasSets: ${hasSets}`);
    Logger.log(`  → isWorkoutSource: ${isWorkoutSource}`);

    if (isWorkoutSource) {
      Logger.log(`  → DETECTED AS WORKOUT SOURCE`);
      const count = ingestWorkoutSource_(ss, sheet, headers);
      workoutsIngested += count;
      Logger.log(`  → Ingested ${count} workouts`);
      return;
    }

    Logger.log(`  → NOT DETECTED AS ANY SOURCE TYPE`);
  });

  Logger.log(`\n[DEBUG] Ingestion Summary:`);
  Logger.log(`  Meals: ${mealsIngested}`);
  Logger.log(`  Questions: ${questionsIngested}`);
  Logger.log(`  Workouts: ${workoutsIngested}`);

  return { meals: mealsIngested, questions: questionsIngested, workouts: workoutsIngested };
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
      const key = `${row[1]}_${row[0]}_${row[3]}`; // Email_SubmissionTime_MealName (new order: SubmissionTime, Email, ImageURL, MealName)
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
      submissionTime,
      email,
      '', // Image URL (will be filled by meal sync)
      mealName,
      core,
      added,
      method,
      portions,
      submissionId
    ]);
  });

  if (newMeals.length > 0) {
    const nextRow = mealPool.getLastRow() + 1;
    mealPool.getRange(nextRow, 1, newMeals.length, 9).setValues(newMeals);
    formatDateTimeColumn_(mealPool, 1);
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
      const key = `${row[1]}_${row[0]}_${row[2]}`; // Email_SubmissionTime_Question (new order: SubmissionTime, Email, Question)
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
      submissionTime,
      email,
      question,
      '', // Coach Response
      'Pending Review', // Status
      submissionId
    ]);
  });

  if (newQuestions.length > 0) {
    const nextRow = questionsSheet.getLastRow() + 1;
    questionsSheet.getRange(nextRow, 1, newQuestions.length, 6).setValues(newQuestions);
    formatDateTimeColumn_(questionsSheet, 1);
  }

  return newQuestions.length;
}

function ingestWorkoutSource_(ss, sourceSheet, headers) {
  Logger.log(`\n[DEBUG ingestWorkoutSource_] Starting for sheet: ${sourceSheet.getName()}`);

  const workoutPool = ss.getSheetByName('Workout Pool');
  if (!workoutPool) {
    Logger.log(`  [ERROR] Workout Pool sheet not found!`);
    return 0;
  }

  // Get existing workouts to avoid duplicates
  const existingWorkouts = new Set();
  if (workoutPool.getLastRow() > 1) {
    const existing = workoutPool.getRange(2, 1, workoutPool.getLastRow() - 1, 9).getValues();
    existing.forEach(row => {
      const submissionTime = row[0];
      const email = row[1];
      const exercise = row[2];
      const submissionId = String(row[8] || '').trim();
      const key = `${submissionTime}_${email}_${exercise}_${submissionId}`; // SubmissionTime_Email_Exercise_SubmissionID
      existingWorkouts.add(key);
    });
  }
  Logger.log(`  → Found ${existingWorkouts.size} existing workouts in pool`);

  // Use existing parseWorkoutsDynamic_() function to parse workouts
  Logger.log(`  → Calling parseWorkoutsDynamic_()...`);
  const workouts = parseWorkoutsDynamic_(sourceSheet);
  Logger.log(`  → Parsed ${workouts.length} workout entries`);

  if (workouts.length > 0) {
    Logger.log(`  → Sample workout: ${JSON.stringify(workouts[0])}`);
  }

  const newWorkouts = [];

  workouts.forEach(workout => {
    const key = `${workout.dateTime}_${workout.email}_${workout.name}_${workout.submissionId}`;
    if (existingWorkouts.has(key)) return;

    newWorkouts.push([
      workout.dateTime,
      workout.email,
      workout.name,
      workout.sets,
      workout.reps,
      workout.weight,
      workout.bodyweight,
      workout.notes,
      workout.submissionId
    ]);
  });

  if (newWorkouts.length > 0) {
    const nextRow = workoutPool.getLastRow() + 1;
    workoutPool.getRange(nextRow, 1, newWorkouts.length, 9).setValues(newWorkouts);
    formatDateTimeColumn_(workoutPool, 1);
  }

  return newWorkouts.length;
}

// ═══════════════════════════════════════════════════════════════════════
// TEST FUNCTION: WORKOUT DETECTION
// ═══════════════════════════════════════════════════════════════════════

function testWorkoutDetection() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Workout Log 1');

  if (!sheet) {
    Logger.log('ERROR: "Workout Log 1" sheet not found!');
    Logger.log('Available sheets:');
    ss.getSheets().forEach(s => Logger.log(`  - ${s.getName()}`));
    return;
  }

  Logger.log('Testing "Workout Log 1" detection...\n');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headersLower = headers.map(h => String(h).toLowerCase().trim());

  Logger.log('Headers: ' + JSON.stringify(headers));
  Logger.log('\nHeaders (lowercase): ' + JSON.stringify(headersLower));

  // Test Email
  const hasEmail = headersLower.some(h => EMAIL_LABELS.some(label => h === label || h.includes(label)));
  Logger.log('\n✓ Has Email: ' + hasEmail);
  if (hasEmail) {
    const emailCol = headersLower.findIndex(h => EMAIL_LABELS.some(label => h === label || h.includes(label)));
    Logger.log('  Email column: ' + headers[emailCol]);
  }

  // Test Timestamp
  const hasTimestamp = headersLower.some(h => TIMESTAMP_LABELS.some(label => h.includes(label)));
  Logger.log('✓ Has Timestamp: ' + hasTimestamp);
  if (hasTimestamp) {
    const tsCol = headersLower.findIndex(h => TIMESTAMP_LABELS.some(label => h.includes(label)));
    Logger.log('  Timestamp column: ' + headers[tsCol]);
  }

  // Test Bodyweight
  const hasBodyweight = headersLower.some(h =>
    h === 'bodyweight' ||
    h === 'body weight' ||
    h === 'current bodyweight' ||
    h.includes('bodyweight')
  );
  Logger.log('✓ Has Bodyweight: ' + hasBodyweight);
  if (hasBodyweight) {
    const bwCol = headersLower.findIndex(h => h.includes('bodyweight'));
    Logger.log('  Bodyweight column: ' + headers[bwCol]);
  }

  // Test Sets
  const hasSets = headersLower.some(h =>
    h === 'sets' ||
    h.includes('(sets)') ||
    h.includes('sets')
  );
  Logger.log('✓ Has Sets: ' + hasSets);
  if (hasSets) {
    const setCols = headersLower
      .map((h, i) => ({ header: h, index: i }))
      .filter(item => item.header.includes('sets'));
    Logger.log('  Sets columns: ' + JSON.stringify(setCols.map(c => headers[c.index])));
  }

  Logger.log('\n=== DETECTION RESULT ===');
  const isWorkoutSource = (hasBodyweight || hasSets) && hasEmail && hasTimestamp;

  if (isWorkoutSource) {
    Logger.log('✓✓✓ WOULD BE DETECTED AS WORKOUT SOURCE ✓✓✓');
  } else {
    Logger.log('✗✗✗ WOULD NOT BE DETECTED AS WORKOUT SOURCE ✗✗✗');
    Logger.log('\nMissing requirements:');
    if (!hasEmail) Logger.log('  ✗ Email column');
    if (!hasTimestamp) Logger.log('  ✗ Timestamp column');
    if (!hasBodyweight && !hasSets) Logger.log('  ✗ Bodyweight OR Sets column');
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TEST FUNCTION: COMPLETE WORKOUT PIPELINE
// ═══════════════════════════════════════════════════════════════════════

function testWorkoutPipeline() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'Workout Log 2'; // Test the specific sheet user mentioned
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    Logger.log(`ERROR: "${sheetName}" sheet not found!`);
    Logger.log('Available sheets:');
    ss.getSheets().forEach(s => Logger.log(`  - ${s.getName()}`));
    return;
  }

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log(`TESTING COMPLETE WORKOUT PIPELINE FOR: "${sheetName}"`);
  Logger.log('═══════════════════════════════════════════════════════════\n');

  // STEP 1: Test Detection
  Logger.log('[STEP 1] TESTING DETECTION LOGIC');
  Logger.log('─────────────────────────────────');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headersLower = headers.map(h => String(h).toLowerCase().trim());

  Logger.log(`Headers: ${JSON.stringify(headers)}\n`);

  const hasEmail = headersLower.some(h => EMAIL_LABELS.some(label => h === label || h.includes(label)));
  const hasTimestamp = headersLower.some(h => TIMESTAMP_LABELS.some(label => h.includes(label)));
  const hasBodyweight = headersLower.some(h =>
    h === 'bodyweight' || h === 'body weight' || h === 'current bodyweight' || h.includes('bodyweight')
  );
  const hasSets = headersLower.some(h => h === 'sets' || h.includes('(sets)') || h.includes('sets'));
  const isWorkoutSource = (hasBodyweight || hasSets) && hasEmail && hasTimestamp;

  Logger.log(`✓ Has Email: ${hasEmail}`);
  Logger.log(`✓ Has Timestamp: ${hasTimestamp}`);
  Logger.log(`✓ Has Bodyweight: ${hasBodyweight}`);
  Logger.log(`✓ Has Sets: ${hasSets}`);
  Logger.log(`✓ Would be detected: ${isWorkoutSource}\n`);

  if (!isWorkoutSource) {
    Logger.log('❌ FAILED: Sheet would NOT be detected as workout source!');
    return;
  }

  // STEP 2: Test Parsing
  Logger.log('[STEP 2] TESTING parseWorkoutsDynamic_()');
  Logger.log('─────────────────────────────────');

  const workouts = parseWorkoutsDynamic_(sheet);
  Logger.log(`Parsed ${workouts.length} workout entries`);

  if (workouts.length === 0) {
    Logger.log('❌ FAILED: parseWorkoutsDynamic_() returned 0 workouts!');
    Logger.log('This means the parsing logic failed to extract exercises.');
    return;
  }

  Logger.log(`\nFirst 3 workouts:`);
  for (let i = 0; i < Math.min(3, workouts.length); i++) {
    Logger.log(`  ${i + 1}. ${JSON.stringify(workouts[i])}`);
  }

  // STEP 3: Check Workout Pool
  Logger.log('\n[STEP 3] CHECKING WORKOUT POOL');
  Logger.log('─────────────────────────────────');

  const workoutPool = ss.getSheetByName('Workout Pool');
  if (!workoutPool) {
    Logger.log('❌ FAILED: Workout Pool sheet does not exist!');
    return;
  }

  const poolRows = workoutPool.getLastRow();
  Logger.log(`Workout Pool has ${poolRows - 1} rows of data (excluding header)`);

  if (poolRows > 1) {
    const poolData = workoutPool.getRange(2, 1, Math.min(3, poolRows - 1), 9).getValues();
    Logger.log(`\nFirst 3 rows in Workout Pool:`);
    poolData.forEach((row, i) => {
      Logger.log(`  ${i + 1}. Time: ${row[0]}, Email: ${row[1]}, Exercise: ${row[2]}, Reps: ${row[4]}, Weight: ${row[5]}, BW: ${row[6]}`);
    });
  }

  // STEP 4: Test Gym Score Calculation
  Logger.log('\n[STEP 4] TESTING GYM SCORE CALCULATION');
  Logger.log('─────────────────────────────────');

  const sampleWorkouts = workouts.slice(0, 4); // Take first 4 exercises
  const defaultBodyweight = sampleWorkouts[0]?.bodyweight || 0;
  const gymScore = calculateGymScore_(sampleWorkouts, defaultBodyweight);

  Logger.log(`Sample: ${sampleWorkouts.length} exercises`);
  Logger.log(`Default Bodyweight: ${defaultBodyweight}`);
  Logger.log(`Calculated Gym Score: ${gymScore}`);

  if (gymScore === 0) {
    Logger.log('⚠️ WARNING: Gym Score is 0! This might indicate a calculation issue.');
  }

  // STEP 5: Check Timeline Master
  Logger.log('\n[STEP 5] CHECKING TIMELINE MASTER');
  Logger.log('─────────────────────────────────');

  const timeline = ss.getSheetByName('Timeline Master');
  if (!timeline) {
    Logger.log('❌ FAILED: Timeline Master sheet does not exist!');
    return;
  }

  const timelineRows = timeline.getLastRow();
  Logger.log(`Timeline Master has ${timelineRows - 1} rows of data`);

  if (timelineRows > 1) {
    // Search for workout entries
    const timelineData = timeline.getRange(2, 1, timelineRows - 1, 6).getValues();
    const workoutEntries = timelineData.filter(row => row[1] === 'Workout');

    Logger.log(`Found ${workoutEntries.length} workout entries in Timeline Master`);

    if (workoutEntries.length > 0) {
      Logger.log(`\nLatest 3 workout entries:`);
      workoutEntries.slice(0, 3).forEach((row, i) => {
        Logger.log(`  ${i + 1}. Time: ${row[0]}, Email: ${row[2]}, Details: ${row[5]}`);
      });
    } else {
      Logger.log('❌ NO WORKOUT ENTRIES FOUND IN TIMELINE MASTER!');
      Logger.log('   This means workouts are not being transferred from Workout Pool to Timeline.');
    }
  }

  // STEP 6: Recommendations
  Logger.log('\n[STEP 6] RECOMMENDATIONS');
  Logger.log('─────────────────────────────────');

  if (isWorkoutSource && workouts.length > 0 && timelineRows > 1) {
    const timelineData = timeline.getRange(2, 1, timelineRows - 1, 2).getValues();
    const workoutCount = timelineData.filter(row => row[1] === 'Workout').length;

    if (workoutCount === 0) {
      Logger.log('❌ ISSUE IDENTIFIED: Workouts parse correctly but are NOT in Timeline Master');
      Logger.log('   → Run: runCoachMasterSync()');
      Logger.log('   → This will trigger buildTimelineMaster() to transfer from Workout Pool');
    } else {
      Logger.log('✅ Pipeline appears to be working!');
      Logger.log(`   → ${workouts.length} exercises parsed`);
      Logger.log(`   → ${workoutCount} workout entries in Timeline Master`);
    }
  }

  Logger.log('\n═══════════════════════════════════════════════════════════');
  Logger.log('PIPELINE TEST COMPLETE');
  Logger.log('═══════════════════════════════════════════════════════════');
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
    const email = normalizeEmail_(row[1]); // Column 1 is now Email (new order: SubmissionTime, Email, ImageURL...)
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
    const existing = destSheet.getRange(2, 3, destSheet.getLastRow() - 1, 1).getValues(); // Column 3 is now Image URL
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
      .sort({ column: 1, ascending: false }); // Column 1 is now Submission Time
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
      destSheet.appendRow([fileTime, '', url, '', '', '', '', '', '']);
      existingImages.add(url);
      continue;
    }

    const meal = mealIndex.get(submissionId);

    if (meal) {
      const fileTime = file.getLastUpdated();
      destSheet.appendRow([
        meal.submissionTime,
        meal.email,
        url,
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
      destSheet.appendRow([fileTime, '', url, '', '', '', '', '', submissionId]);
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
      const key = `${row[1]}_${row[0]}_${row[3]}`; // Email_SubmissionTime_MealName (new order: SubmissionTime, Email, ImageURL, MealName)
      existingMeals.add(key);
    });
  }

  // Read from Meal Image+Info
  const data = mealImageInfo.getRange(2, 1, mealImageInfo.getLastRow() - 1, 9).getValues();
  const newMeals = [];

  data.forEach(row => {
    const submissionTime = row[0];
    const email = row[1];
    const imageUrl = row[2];
    const mealName = row[3];

    if (!email || !mealName) return; // Skip incomplete rows

    const key = `${email}_${submissionTime}_${mealName}`;
    if (existingMeals.has(key)) return;

    newMeals.push(row); // All 9 columns
  });

  if (newMeals.length > 0) {
    const nextRow = mealPool.getLastRow() + 1;
    mealPool.getRange(nextRow, 1, newMeals.length, 9).setValues(newMeals);
    formatDateTimeColumn_(mealPool, 1);
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

function calculateGymScore_(workouts, defaultBodyweight) {
  // Calculate Gym Score using Epley formula: 1RM = weight × (1 + reps/30)
  // Average all 1RMs across all exercises and sets

  if (!workouts || workouts.length === 0) return 0;

  const all1RMs = [];

  workouts.forEach(workout => {
    const sets = String(workout.sets || '').trim();
    const reps = String(workout.reps || '').trim();
    const weight = String(workout.weight || '').trim();
    const bodyweight = workout.bodyweight || defaultBodyweight || 0;

    // Determine which weight to use for this exercise
    const effectiveWeight = weight ? parseFloat(weight.replace(/[^\d.]/g, '')) : parseFloat(bodyweight);

    if (!effectiveWeight || effectiveWeight <= 0) return; // Skip if no valid weight

    // Parse reps (can be comma-separated for multiple sets)
    const repsArray = reps.split(',').map(r => {
      const parsed = parseFloat(r.trim().replace(/[^\d.]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }).filter(r => r > 0);

    // Parse weights if comma-separated (for grouped format)
    const weightsArray = weight ? weight.split(',').map(w => {
      const parsed = parseFloat(w.trim().replace(/[^\d.]/g, ''));
      return isNaN(parsed) ? effectiveWeight : parsed;
    }) : [];

    // Calculate 1RM for each set
    repsArray.forEach((repCount, index) => {
      const setWeight = weightsArray.length > index ? weightsArray[index] : effectiveWeight;
      if (setWeight > 0 && repCount > 0) {
        const oneRM = setWeight * (1 + repCount / 30);
        all1RMs.push(oneRM);
      }
    });
  });

  // Average all 1RMs
  if (all1RMs.length === 0) return 0;

  const sum = all1RMs.reduce((acc, val) => acc + val, 0);
  const average = sum / all1RMs.length;

  return Math.round(average * 100) / 100; // Round to 2 decimal places
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
      const submissionTime = meal[0] || '';
      const email = normalizeEmail_(meal[1]);
      const imageUrl = meal[2] || '';
      const mealName = meal[3] || '';
      const coreIngredients = meal[4] || '';
      const addedIngredients = meal[5] || '';
      const cookingMethod = meal[6] || '';
      const portions = meal[7] || '';
      const submissionId = String(meal[8] || '').trim();

      const key = submissionId ? `${submissionTime}_${email}_${submissionId}` : `${submissionTime}_${email}`;
      if (existing.has(key)) return;

      const clientName = clientNames.get(email) || '';
      const dateObj = parseDate_(submissionTime);
      const week = getWeekNumber_(dateObj);
      const month = Utilities.formatDate(dateObj, ss.getSpreadsheetTimeZone(), 'MMM yyyy');

      const ingredients = [coreIngredients, addedIngredients].filter(x => x).join(', ');

      // 25 columns total (added 8 new meal tracking columns after Cooking Method)
      newEntries.push([
        submissionTime,           // 1. DateTime
        'Meal',                   // 2. Type
        email,                    // 3. Client Email
        clientName,               // 4. Client Name
        imageUrl,                 // 5. Image URL
        mealName,                 // 6. Details
        ingredients,              // 7. Ingredients
        portions,                 // 8. Portions
        cookingMethod,            // 9. Cooking Method
        '',                       // 10. Meal Timing Category (NEW)
        '',                       // 11. Fuel Score (NEW)
        '',                       // 12. Recovery Score (NEW)
        '',                       // 13. Other Score (NEW)
        '',                       // 14. Meal Notes (NEW)
        '',                       // 15. Timing Minutes (NEW)
        '',                       // 16. Meal Status (NEW)
        '',                       // 17. Last Updated (NEW)
        '',                       // 18. Exercises
        '',                       // 19. Sets/Reps
        '',                       // 20. Workout Notes
        '',                       // 21. Coach Response
        'Pending Review',         // 22. Response Status
        week,                     // 23. Week
        month,                    // 24. Month
        submissionId              // 25. Submission ID
      ]);
    });
  }

  // Pull workouts and calculate Gym Score
  if (workoutPool) {
    const workouts = parseWorkoutsDynamic_(workoutPool);

    // Group workouts by submission (dateTime_email_submissionId)
    const workoutGroups = new Map();

    workouts.forEach(workout => {
      const email = workout.email;
      const dateTime = workout.dateTime;
      const submissionId = workout.submissionId || '';
      const key = submissionId ? `${dateTime}_${email}_${submissionId}` : `${dateTime}_${email}`;

      if (!workoutGroups.has(key)) {
        workoutGroups.set(key, {
          email: email,
          dateTime: dateTime,
          submissionId: submissionId,
          exercises: []
        });
      }

      workoutGroups.get(key).exercises.push(workout);
    });

    // Create one Timeline entry per workout submission with Gym Score
    workoutGroups.forEach((group, key) => {
      if (existing.has(key)) return;

      const clientName = clientNames.get(group.email) || '';
      const week = getWeekNumber_(group.dateTime);
      const month = Utilities.formatDate(group.dateTime, ss.getSpreadsheetTimeZone(), 'MMM yyyy');

      // Calculate Gym Score using Epley formula
      const defaultBodyweight = group.exercises[0]?.bodyweight || 0;
      const gymScore = calculateGymScore_(group.exercises, defaultBodyweight);

      // Build exercise summary for Exercises column
      const exerciseNames = group.exercises.map(ex => ex.name).join(', ');

      // Build detailed notes for Workout Notes column
      const workoutDetails = group.exercises.map(ex => {
        const weightValue = String(ex.weight || '').trim();
        const weightDisplay = weightValue ? weightValue : 'Bodyweight';
        const setsReps = ex.sets && ex.reps ? `${ex.sets}x${ex.reps}` : ex.reps;
        return `${ex.name} (${weightDisplay}): ${setsReps}`;
      }).join(' | ');

      // 25 columns total
      newEntries.push([
        group.dateTime,           // 1. Submission Time
        'Workout',                // 2. Type
        group.email,              // 3. Client Email
        clientName,               // 4. Client Name
        '',                       // 5. Image URL
        `Gym Score: ${gymScore}`, // 6. Details (Gym Score)
        '',                       // 7. Ingredients
        '',                       // 8. Portions
        '',                       // 9. Cooking Method
        '',                       // 10. Meal Timing Category
        '',                       // 11. Fuel Score
        '',                       // 12. Recovery Score
        '',                       // 13. Other Score
        '',                       // 14. Meal Notes
        '',                       // 15. Timing Minutes
        '',                       // 16. Meal Status
        '',                       // 17. Last Updated
        exerciseNames,            // 18. Exercises (comma-separated list)
        '',                       // 19. Sets/Reps (left empty, details in Workout Notes)
        workoutDetails,           // 20. Workout Notes (detailed breakdown)
        '',                       // 21. Coach Response
        'Pending Review',         // 22. Response Status
        week,                     // 23. Week
        month,                    // 24. Month
        group.submissionId        // 25. Submission ID
      ]);
    });
  }

  if (newEntries.length > 0) {
    const nextRow = timeline.getLastRow() + 1;
    timeline.getRange(nextRow, 1, newEntries.length, 25).setValues(newEntries);
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
        const submissionTime = qData[i][0];
        const email = String(qData[i][1] || '').trim();
        const question = String(qData[i][2] || '').trim();

        const sent = sendQuestionResponse_(email, question, submissionTime, response);

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
// ARCHIVE OLD ENTRIES
// ═══════════════════════════════════════════════════════════════════════

function archiveOldEntries(ss) {
  const timeline = ss.getSheetByName('Timeline Master');
  const archive = ss.getSheetByName('Timeline Archive');

  if (!timeline || timeline.getLastRow() <= 1) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_AFTER_DAYS);

  const data = timeline.getRange(2, 1, timeline.getLastRow() - 1, 25).getValues(); // 25 columns now
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
    archive.getRange(nextRow, 1, toArchive.length, 25).setValues(toArchive); // 25 columns
    formatDateTimeColumn_(archive, 1);
    formatDateTimeColumn_(archive, 17);

    // Delete from timeline in reverse order
    rowsToDelete.reverse().forEach(row => {
      timeline.deleteRow(row);
    });
  }

  return toArchive.length;
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
// DIAGNOSTIC FUNCTION - DEBUG WORKOUT PARSING STRUCTURE
// ═══════════════════════════════════════════════════════════════════════

function debugParseStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();

  let log = [];
  log.push('═══════════════════════════════════════════════════════════');
  log.push('WORKOUT LOG PARSING DIAGNOSTICS');
  log.push('═══════════════════════════════════════════════════════════\n');

  // Find all workout log sheets
  const workoutSheets = allSheets.filter(sheet =>
    sheet.getName().toLowerCase().includes('workout log')
  );

  log.push(`Found ${workoutSheets.length} workout log sheet(s):\n`);

  workoutSheets.forEach(sheet => {
    const sheetName = sheet.getName();
    log.push(`\n${'='.repeat(60)}`);
    log.push(`SHEET: "${sheetName}"`);
    log.push('='.repeat(60));

    // Get headers
    const lastCol = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      log.push('  ⚠️ No data rows found\n');
      return;
    }

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    log.push(`\n[1] HEADERS (${headers.length} columns):`);
    log.push('-'.repeat(60));

    headers.forEach((header, idx) => {
      log.push(`  Col ${idx}: "${header}"`);
    });

    // Detect exercise groups
    log.push(`\n[2] EXERCISE GROUP DETECTION:`);
    log.push('-'.repeat(60));

    const exerciseGroups = new Map();
    const setsPattern = /^(.+?)\s*\(sets\)\s*$/i;
    const repsPattern = /^(.+?)\s*\((reps[,\s]*)+\)\s*$/i;
    const weightPattern = /^(.+?)\s*\((weight[,\s]*)+\)\s*$/i;

    headers.forEach((header, idx) => {
      const headerStr = String(header).trim();

      // Check for (Sets)
      let match = headerStr.match(setsPattern);
      if (match) {
        const exerciseName = match[1].trim();
        if (!exerciseGroups.has(exerciseName)) {
          exerciseGroups.set(exerciseName, { sets: -1, reps: -1, weight: -1 });
        }
        exerciseGroups.get(exerciseName).sets = idx;
        log.push(`  ✓ Found (Sets) for "${exerciseName}" at col ${idx}`);
        return;
      }

      // Check for (Reps,Reps,...) or (Reps...)
      if (headerStr.toLowerCase().includes('(reps') ||
          headerStr.match(/\(reps[,\s)]/i)) {
        const exerciseName = headerStr.split('(')[0].trim();
        if (!exerciseGroups.has(exerciseName)) {
          exerciseGroups.set(exerciseName, { sets: -1, reps: -1, weight: -1 });
        }
        exerciseGroups.get(exerciseName).reps = idx;
        log.push(`  ✓ Found (Reps...) for "${exerciseName}" at col ${idx}`);
        return;
      }

      // Check for (Weight,Weight,...) or (Weight...)
      if (headerStr.toLowerCase().includes('(weight') ||
          headerStr.match(/\(weight[,\s)]/i)) {
        const exerciseName = headerStr.split('(')[0].trim();
        if (!exerciseGroups.has(exerciseName)) {
          exerciseGroups.set(exerciseName, { sets: -1, reps: -1, weight: -1 });
        }
        exerciseGroups.get(exerciseName).weight = idx;
        log.push(`  ✓ Found (Weight...) for "${exerciseName}" at col ${idx}`);
        return;
      }
    });

    log.push(`\n  Total exercise groups detected: ${exerciseGroups.size}`);

    if (exerciseGroups.size > 0) {
      log.push('\n  Exercise group summary:');
      exerciseGroups.forEach((cols, exerciseName) => {
        log.push(`    "${exerciseName}":`);
        log.push(`      Sets col: ${cols.sets === -1 ? 'NOT FOUND' : cols.sets}`);
        log.push(`      Reps col: ${cols.reps === -1 ? 'NOT FOUND' : cols.reps}`);
        log.push(`      Weight col: ${cols.weight === -1 ? 'NOT FOUND' : cols.weight}`);
      });
    }

    // Get sample row (row 2)
    log.push(`\n[3] SAMPLE ROW (Row 2):`);
    log.push('-'.repeat(60));

    const sampleRow = sheet.getRange(2, 1, 1, lastCol).getValues()[0];

    // Find Email and Bodyweight columns
    const emailCol = headers.findIndex(h =>
      String(h).toLowerCase().includes('email')
    );
    const bodyweightCol = headers.findIndex(h =>
      String(h).toLowerCase().includes('bodyweight') ||
      String(h).toLowerCase().includes('current bodyweight')
    );

    if (emailCol !== -1) {
      log.push(`  Email (col ${emailCol}): "${sampleRow[emailCol]}"`);
    }
    if (bodyweightCol !== -1) {
      log.push(`  Bodyweight (col ${bodyweightCol}): ${sampleRow[bodyweightCol]} (type: ${typeof sampleRow[bodyweightCol]})`);
    }

    // Show exercise data with raw values
    log.push('\n  Exercise data:');
    exerciseGroups.forEach((cols, exerciseName) => {
      log.push(`\n    "${exerciseName}":`);

      if (cols.sets !== -1) {
        const setsValue = sampleRow[cols.sets];
        log.push(`      Sets (col ${cols.sets}): ${setsValue} (type: ${typeof setsValue})`);
      }

      if (cols.reps !== -1) {
        const repsValue = sampleRow[cols.reps];
        log.push(`      Reps (col ${cols.reps}): "${repsValue}" (type: ${typeof repsValue})`);
      }

      if (cols.weight !== -1) {
        const weightValue = sampleRow[cols.weight];
        log.push(`      Weight (col ${cols.weight}): "${weightValue}" (type: ${typeof weightValue})`);
      }
    });

    // Test comma parsing
    log.push(`\n[4] COMMA PARSING TESTS:`);
    log.push('-'.repeat(60));

    const testCases = [
      '405,405,405,405',
      '110.120.140',
      '8,9,7,6',
      '20',
      'BW',
      '3x5@315'
    ];

    testCases.forEach(testCase => {
      log.push(`\n  Input: "${testCase}"`);

      // Test 1: Split by comma
      const commaSplit = testCase.split(',').map(v => v.trim());
      log.push(`    Split by comma: [${commaSplit.join(', ')}]`);

      // Test 2: Split by period (for decimal confusion)
      const periodSplit = testCase.split('.').map(v => v.trim());
      log.push(`    Split by period: [${periodSplit.join(', ')}]`);

      // Test 3: Parse as numbers
      const parsedComma = commaSplit.map(v => {
        const num = parseFloat(v.replace(/[^\d.]/g, ''));
        return isNaN(num) ? 'NaN' : num;
      });
      log.push(`    Parsed (comma): [${parsedComma.join(', ')}]`);

      // Test 4: Check for actual values in sample row
      exerciseGroups.forEach((cols, exerciseName) => {
        if (cols.reps !== -1) {
          const repsValue = String(sampleRow[cols.reps] || '');
          if (repsValue === testCase) {
            log.push(`    ✓ MATCH: Found in "${exerciseName}" Reps column`);
          }
        }
        if (cols.weight !== -1) {
          const weightValue = String(sampleRow[cols.weight] || '');
          if (weightValue === testCase) {
            log.push(`    ✓ MATCH: Found in "${exerciseName}" Weight column`);
          }
        }
      });
    });

    // Test Epley formula
    log.push(`\n[5] EPLEY 1RM CALCULATION TEST:`);
    log.push('-'.repeat(60));
    log.push('  Formula: weight × (1 + reps/30)\n');

    const epleyTests = [
      { weight: 405, reps: 8, expected: 513 },
      { weight: 315, reps: 5, expected: 367.5 },
      { weight: 202, reps: 20, expected: 336.67 }
    ];

    epleyTests.forEach(test => {
      const calculated = test.weight * (1 + test.reps / 30);
      const rounded = Math.round(calculated * 100) / 100;
      log.push(`  ${test.weight} lbs × ${test.reps} reps:`);
      log.push(`    Calculated: ${rounded}`);
      log.push(`    Expected: ~${test.expected}`);
      log.push(`    Match: ${Math.abs(rounded - test.expected) < 1 ? '✓' : '✗'}\n`);
    });

    // Real exercise calculation
    log.push('  Real data from sample row:');
    exerciseGroups.forEach((cols, exerciseName) => {
      if (cols.reps !== -1 && cols.weight !== -1) {
        const repsValue = String(sampleRow[cols.reps] || '').trim();
        const weightValue = String(sampleRow[cols.weight] || '').trim();

        log.push(`\n    "${exerciseName}":`);
        log.push(`      Raw reps: "${repsValue}"`);
        log.push(`      Raw weight: "${weightValue}"`);

        // Parse comma-separated values
        const repsArray = repsValue.split(',').map(r => {
          const parsed = parseFloat(r.trim().replace(/[^\d.]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        }).filter(r => r > 0);

        const weightsArray = weightValue.split(',').map(w => {
          const parsed = parseFloat(w.trim().replace(/[^\d.]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        }).filter(w => w > 0);

        log.push(`      Parsed reps: [${repsArray.join(', ')}]`);
        log.push(`      Parsed weights: [${weightsArray.join(', ')}]`);

        if (repsArray.length > 0 && weightsArray.length > 0) {
          const all1RMs = [];
          repsArray.forEach((rep, idx) => {
            const weight = weightsArray.length > idx ? weightsArray[idx] : weightsArray[0];
            const oneRM = weight * (1 + rep / 30);
            all1RMs.push(Math.round(oneRM * 100) / 100);
          });
          log.push(`      Calculated 1RMs: [${all1RMs.join(', ')}]`);
          log.push(`      Average 1RM: ${Math.round((all1RMs.reduce((a, b) => a + b, 0) / all1RMs.length) * 100) / 100}`);
        }
      }
    });
  });

  log.push('\n\n═══════════════════════════════════════════════════════════');
  log.push('END DIAGNOSTICS');
  log.push('═══════════════════════════════════════════════════════════');

  // Output to console
  const fullLog = log.join('\n');
  Logger.log(fullLog);

  // Output to UI (first 3000 chars)
  const preview = fullLog.substring(0, 3000);
  SpreadsheetApp.getUi().alert(
    'Diagnostic Complete (see execution log for full output)\n\n' +
    preview +
    (fullLog.length > 3000 ? '\n\n... (truncated, see logs for full output)' : '')
  );

  return fullLog;
}
