/**
 * ═══════════════════════════════════════════════════════════════════════
 * COACH MASTER SCRIPT - CONFIGURED & READY
 * ═══════════════════════════════════════════════════════════════════════
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open "Official Master Sheet" (blank sheet you created)
 * 2. Extensions > Apps Script
 * 3. Create File 1: Name it "CoachMaster.gs"
 * 4. Paste this entire script
 * 5. Save
 * 6. Run: setupCoachMaster
 * 7. Grant permissions
 * 8. Verify tabs created (Timeline Master, Meal Pool, etc.)
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

const ANALYSIS_TIER = 'PREMIUM';

// Tab names
const MEAL_POOL = 'Meal Pool';
const WORKOUT_POOL = 'Workout Pool';
const TIMELINE_MASTER = 'Timeline Master';
const TIMELINE_ARCHIVE = 'Timeline Archive';
const CLIENT_DETAILS = 'Client Details';
const QUESTIONS_FEEDBACK = 'General Questions and Feedback';

const ARCHIVE_AFTER_DAYS = 90;

// ═══════════════════════════════════════════════════════════════════════
// HEADERS
// ═══════════════════════════════════════════════════════════════════════

const TIMELINE_HEADERS = [
  'DateTime', 'Type', 'Client Email', 'Client Name', 'Image URL',
  'Details', 'Ingredients', 'Portions', 'Cooking Method',
  'Exercises', 'Sets/Reps', 'Notes',
  'Coach Response', 'Status', 'Week', 'Month', 'Submission ID'
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

const QUESTIONS_HEADERS = [
  'Client Email', 'Submission Time', 'Question',
  'Coach Response', 'Status', 'Submission ID'
];

// ═══════════════════════════════════════════════════════════════════════
// SETUP FUNCTION - RUN THIS FIRST
// ═══════════════════════════════════════════════════════════════════════

function setupCoachMaster() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('COACH MASTER SETUP');
  Logger.log('═══════════════════════════════════════════════════════════');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create Timeline Master
  let timeline = ss.getSheetByName(TIMELINE_MASTER);
  if (!timeline) {
    timeline = ss.insertSheet(TIMELINE_MASTER);
    timeline.appendRow(TIMELINE_HEADERS);
    formatHeader(timeline, TIMELINE_HEADERS.length, '#1976D2');
  }

  // Format DateTime column to show date and time
  if (timeline.getLastRow() > 1) {
    timeline.getRange(2, 1, timeline.getMaxRows() - 1, 1)
      .setNumberFormat('MMM d, yyyy h:mm:ss a');
  }

  Logger.log(`✓ ${TIMELINE_MASTER} ready`);

  // Create Meal Pool
  let mealPool = ss.getSheetByName(MEAL_POOL);
  if (!mealPool) {
    mealPool = ss.insertSheet(MEAL_POOL);
    mealPool.appendRow(['Client Email', 'Image URL', 'Submission Time', 'Meal Name',
                        'Core Ingredients', 'Added Ingredients', 'Cooking Method',
                        'Portions', 'Submission ID']);
    formatHeader(mealPool, 9, '#4CAF50');
  }
  Logger.log(`✓ ${MEAL_POOL} ready`);

  // Create Workout Pool
  let workoutPool = ss.getSheetByName(WORKOUT_POOL);
  if (!workoutPool) {
    workoutPool = ss.insertSheet(WORKOUT_POOL);
    workoutPool.appendRow(['Client Email', 'Submission Time', 'Bodyweight', 'Pull-Ups',
                           'Push-Ups', 'Squats', 'Sit-Ups', 'Notes', 'End Time', 'Submission ID']);
    formatHeader(workoutPool, 10, '#FF9800');
  }
  Logger.log(`✓ ${WORKOUT_POOL} ready`);

  // Create Questions tab
  let questions = ss.getSheetByName(QUESTIONS_FEEDBACK);
  if (!questions) {
    questions = ss.insertSheet(QUESTIONS_FEEDBACK);
    questions.appendRow(QUESTIONS_HEADERS);
    formatHeader(questions, QUESTIONS_HEADERS.length, '#9C27B0');
  }

  // Format Submission Time column in Questions tab
  if (questions.getLastRow() > 1) {
    questions.getRange(2, 2, questions.getMaxRows() - 1, 1)
      .setNumberFormat('MMM d, yyyy h:mm:ss a');
  }

  Logger.log(`✓ ${QUESTIONS_FEEDBACK} ready`);

  // Create Client Details
  let clientDetails = ss.getSheetByName(CLIENT_DETAILS);
  if (!clientDetails) {
    clientDetails = ss.insertSheet(CLIENT_DETAILS);
    clientDetails.appendRow(CLIENT_DETAILS_HEADERS);
    formatHeader(clientDetails, CLIENT_DETAILS_HEADERS.length, '#34A853');
  }
  Logger.log(`✓ ${CLIENT_DETAILS} ready`);

  // Create Timeline Archive
  let archive = ss.getSheetByName(TIMELINE_ARCHIVE);
  if (!archive) {
    archive = ss.insertSheet(TIMELINE_ARCHIVE);
    archive.appendRow(TIMELINE_HEADERS);
    formatHeader(archive, TIMELINE_HEADERS.length, '#757575');
  }

  // Format DateTime column in Archive
  if (archive.getLastRow() > 1) {
    archive.getRange(2, 1, archive.getMaxRows() - 1, 1)
      .setNumberFormat('MMM d, yyyy h:mm:ss a');
  }

  Logger.log(`✓ ${TIMELINE_ARCHIVE} ready`);

  // Remove old triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runCoachMasterSync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new trigger (runs every hour)
  ScriptApp.newTrigger('runCoachMasterSync')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('✓ Trigger created: runCoachMasterSync() runs hourly');
  Logger.log('');
  Logger.log('Setup complete!');
  Logger.log('═══════════════════════════════════════════════════════════');
}

function formatHeader(sheet, colCount, color) {
  sheet.getRange(1, 1, 1, colCount)
    .setFontWeight('bold')
    .setBackground(color)
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN SYNC FUNCTION
// ═══════════════════════════════════════════════════════════════════════

function runCoachMasterSync() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('COACH MASTER SYNC STARTED');
  Logger.log('═══════════════════════════════════════════════════════════');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Step 1: Build Timeline Master from pools
  Logger.log('\n[STEP 1] Building Timeline Master...');
  buildTimelineMaster(ss);

  // Step 2: Send responses
  Logger.log('\n[STEP 2] Checking for responses to send...');
  const emailsSent = sendPendingResponses(ss);
  Logger.log(`Emails sent: ${emailsSent}`);

  // Step 3: Archive old entries
  Logger.log('\n[STEP 3] Archiving old entries...');
  const archived = archiveOldEntries(ss);
  Logger.log(`Entries archived: ${archived}`);

  Logger.log('\n═══════════════════════════════════════════════════════════');
  Logger.log('COACH MASTER SYNC COMPLETE');
  Logger.log('═══════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════
// BUILD TIMELINE MASTER
// ═══════════════════════════════════════════════════════════════════════

function buildTimelineMaster(ss) {
  const timeline = ss.getSheetByName(TIMELINE_MASTER);
  const mealPool = ss.getSheetByName(MEAL_POOL);
  const workoutPool = ss.getSheetByName(WORKOUT_POOL);
  const clientDetails = ss.getSheetByName(CLIENT_DETAILS);

  // Get client name lookup
  const clientNames = getClientNames(clientDetails);

  // Get existing entries to avoid duplicates
  const existing = new Set();
  if (timeline.getLastRow() > 1) {
    const existingData = timeline.getRange(2, 1, timeline.getLastRow() - 1, 17).getValues();
    existingData.forEach(row => {
      const hash = `${row[0]}_${row[2]}_${row[16]}`; // DateTime_Email_SubmissionID
      existing.add(hash);
    });
  }

  const newEntries = [];

  // Pull meals
  if (mealPool && mealPool.getLastRow() > 1) {
    const meals = mealPool.getRange(2, 1, mealPool.getLastRow() - 1, 9).getValues();
    Logger.log(`  Pulled ${meals.length} meals from Meal Pool`);

    meals.forEach(meal => {
      const email = String(meal[0] || '').toLowerCase().trim();
      const imageUrl = meal[1] || '';
      const submissionTime = meal[2] || '';
      const mealName = meal[3] || '';
      const coreIngredients = meal[4] || '';
      const addedIngredients = meal[5] || '';
      const cookingMethod = meal[6] || '';
      const portions = meal[7] || '';
      const submissionId = meal[8] || '';

      const hash = `${submissionTime}_${email}_${submissionId}`;
      if (existing.has(hash)) return;

      const clientName = clientNames.get(email) || '';
      const dateObj = parseDate(submissionTime);
      const week = getWeekNumber(dateObj);
      const month = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'MMM yyyy');

      const ingredients = [coreIngredients, addedIngredients].filter(x => x).join(', ');

      newEntries.push([
        submissionTime,           // DateTime (Date object)
        'Meal',                   // Type
        email,                    // Client Email
        clientName,               // Client Name
        imageUrl,                 // Image URL
        mealName,                 // Details
        ingredients,              // Ingredients
        portions,                 // Portions
        cookingMethod,            // Cooking Method
        '',                       // Exercises
        '',                       // Sets/Reps
        '',                       // Notes
        '',                       // Coach Response
        'Pending Review',         // Status
        week,                     // Week
        month,                    // Month
        submissionId              // Submission ID
      ]);
    });
  }

  // Pull workouts
  if (workoutPool && workoutPool.getLastRow() > 1) {
    const workouts = workoutPool.getRange(2, 1, workoutPool.getLastRow() - 1, 10).getValues();
    Logger.log(`  Pulled ${workouts.length} workouts from Workout Pool`);

    workouts.forEach(workout => {
      const email = String(workout[0] || '').toLowerCase().trim();
      const submissionTime = workout[1] || '';
      const bodyweight = workout[2] || '';
      const pullups = workout[3] || '';
      const pushups = workout[4] || '';
      const squats = workout[5] || '';
      const situps = workout[6] || '';
      const notes = workout[7] || '';
      const endTime = workout[8] || '';
      const submissionId = workout[9] || '';

      const hash = `${submissionTime}_${email}_${submissionId}`;
      if (existing.has(hash)) return;

      const clientName = clientNames.get(email) || '';
      const dateObj = parseDate(submissionTime);
      const week = getWeekNumber(dateObj);
      const month = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'MMM yyyy');

      const exercises = ['Pull-Ups', 'Push-Ups', 'Squats', 'Sit-Ups']
        .map((ex, i) => workout[3+i] ? `${ex}: ${workout[3+i]}` : '')
        .filter(x => x)
        .join(', ');

      const details = `Bodyweight: ${bodyweight}${endTime ? ` | End: ${endTime}` : ''}`;

      newEntries.push([
        submissionTime,           // DateTime (Date object)
        'Workout',                // Type
        email,                    // Client Email
        clientName,               // Client Name
        '',                       // Image URL (workouts don't have images)
        details,                  // Details
        '',                       // Ingredients
        '',                       // Portions
        '',                       // Cooking Method
        exercises,                // Exercises
        '',                       // Sets/Reps
        notes,                    // Notes
        '',                       // Coach Response
        'Pending Review',         // Status
        week,                     // Week
        month,                    // Month
        submissionId              // Submission ID
      ]);
    });
  }

  Logger.log(`  Combined ${newEntries.length} total entries`);

  // Write new entries
  if (newEntries.length > 0) {
    const nextRow = timeline.getLastRow() + 1;
    timeline.getRange(nextRow, 1, newEntries.length, 17).setValues(newEntries);

    // Format DateTime column for new entries to show date and time
    timeline.getRange(nextRow, 1, newEntries.length, 1)
      .setNumberFormat('MMM d, yyyy h:mm:ss a');

    Logger.log(`  Wrote ${newEntries.length} new entries`);

    // Sort by DateTime (newest first)
    if (timeline.getLastRow() > 2) {
      timeline.getRange(2, 1, timeline.getLastRow() - 1, 17)
        .sort({ column: 1, ascending: false });
    }
  } else {
    Logger.log('  No new entries to write');
  }

  Logger.log('[STEP 1] Timeline Master built successfully');
}

// ═══════════════════════════════════════════════════════════════════════
// BATCH RESPONSE SYSTEM
// ═══════════════════════════════════════════════════════════════════════

function sendPendingResponses(ss) {
  const timeline = ss.getSheetByName(TIMELINE_MASTER);
  const questions = ss.getSheetByName(QUESTIONS_FEEDBACK);
  let emailsSent = 0;

  // Send Timeline responses
  if (timeline && timeline.getLastRow() > 1) {
    const data = timeline.getRange(2, 1, timeline.getLastRow() - 1, 14).getValues();

    for (let i = 0; i < data.length; i++) {
      const response = String(data[i][12] || '').trim(); // Coach Response column
      const status = String(data[i][13] || '').trim();   // Status column

      if (response && status === 'Ready to Send') {
        const email = String(data[i][2] || '').trim();
        const type = String(data[i][1] || '').trim();
        const details = String(data[i][5] || '').trim();
        const dateTime = data[i][0];

        const sent = sendResponseEmail(email, type, details, dateTime, response);

        if (sent) {
          timeline.getRange(i + 2, 14).setValue('Sent');
          emailsSent++;
        }
      }
    }
  }

  // Send Question responses
  if (questions && questions.getLastRow() > 1) {
    const qData = questions.getRange(2, 1, questions.getLastRow() - 1, 6).getValues();

    for (let i = 0; i < qData.length; i++) {
      const response = String(qData[i][3] || '').trim(); // Coach Response
      const status = String(qData[i][4] || '').trim();   // Status

      if (response && status === 'Ready to Send') {
        const email = String(qData[i][0] || '').trim();
        const question = String(qData[i][2] || '').trim();
        const dateTime = qData[i][1];

        const sent = sendQuestionResponse(email, question, dateTime, response);

        if (sent) {
          questions.getRange(i + 2, 5).setValue('Sent');
          emailsSent++;
        }
      }
    }
  }

  return emailsSent;
}

function sendResponseEmail(clientEmail, type, details, dateTime, response) {
  try {
    const subject = `Response from Your Coach - ${type} (${dateTime})`;
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
    Logger.log(`✓ Email sent to ${clientEmail}`);
    return true;
  } catch (e) {
    Logger.log(`✗ Failed to send email to ${clientEmail}: ${e.message}`);
    return false;
  }
}

function sendQuestionResponse(clientEmail, question, dateTime, response) {
  try {
    const subject = `Answer to Your Question - ${dateTime}`;
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
    Logger.log(`✓ Email sent to ${clientEmail}`);
    return true;
  } catch (e) {
    Logger.log(`✗ Failed to send email to ${clientEmail}: ${e.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CUSTOM MENU FOR BATCH SENDING
// ═══════════════════════════════════════════════════════════════════════

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Coach Actions')
    .addItem('Mark Selected as "Ready to Send"', 'markReadyToSend')
    .addItem('Send All Ready Responses', 'sendAllReadyResponses')
    .addSeparator()
    .addItem('Run Full Sync', 'runCoachMasterSync')
    .addToUi();
}

function markReadyToSend() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();
  const row = range.getRow();

  if (row < 2) {
    SpreadsheetApp.getUi().alert('Please select a data row (not header)');
    return;
  }

  const sheetName = sheet.getName();

  if (sheetName === TIMELINE_MASTER) {
    sheet.getRange(row, 14).setValue('Ready to Send');
    SpreadsheetApp.getUi().alert('Marked as Ready to Send!');
  } else if (sheetName === QUESTIONS_FEEDBACK) {
    sheet.getRange(row, 5).setValue('Ready to Send');
    SpreadsheetApp.getUi().alert('Marked as Ready to Send!');
  } else {
    SpreadsheetApp.getUi().alert('This function only works in Timeline Master or Questions tab');
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
  const timeline = ss.getSheetByName(TIMELINE_MASTER);
  const archive = ss.getSheetByName(TIMELINE_ARCHIVE);

  if (!timeline || timeline.getLastRow() <= 1) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_AFTER_DAYS);

  const data = timeline.getRange(2, 1, timeline.getLastRow() - 1, 17).getValues();
  const toArchive = [];
  const rowsToDelete = [];

  for (let i = 0; i < data.length; i++) {
    const dateTime = parseDate(data[i][0]);
    if (dateTime < cutoffDate) {
      toArchive.push(data[i]);
      rowsToDelete.push(i + 2); // +2 for header and 0-index
    }
  }

  if (toArchive.length > 0) {
    const nextRow = archive.getLastRow() + 1;
    archive.getRange(nextRow, 1, toArchive.length, 17).setValues(toArchive);

    // Delete from newest to oldest to maintain row numbers
    rowsToDelete.reverse().forEach(row => {
      timeline.deleteRow(row);
    });
  }

  return toArchive.length;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function getClientNames(clientDetails) {
  const map = new Map();
  if (!clientDetails || clientDetails.getLastRow() <= 1) return map;

  const data = clientDetails.getRange(2, 1, clientDetails.getLastRow() - 1, 2).getValues();
  data.forEach(row => {
    const email = String(row[0] || '').toLowerCase().trim();
    const name = String(row[1] || '').trim();
    if (email) map.set(email, name);
  });

  return map;
}

function parseDate(dateStr) {
  if (dateStr instanceof Date) return dateStr;
  return new Date(dateStr);
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `Week ${weekNo}`;
}
