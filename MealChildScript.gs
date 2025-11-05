/**
 * ═══════════════════════════════════════════════════════════════════════
 * MEAL CHILD SCRIPT - TIMEZONE FIX V3
 * ═══════════════════════════════════════════════════════════════════════
 *
 * V3 CRITICAL FIX:
 * - String timestamps now parsed in SPREADSHEET timezone (not script timezone)
 * - Calculates timezone offset between script and spreadsheet timezones
 * - Prevents time shifts that caused images to pair with wrong meals
 *
 * V2 FEATURES:
 * - Proper timezone handling between form submissions and Drive files
 * - Explicit timezone normalization for accurate matching
 * - One-to-one matching with used meal tracking
 * - Robust timestamp parsing with validation
 * - Timezone consistency warnings
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

const DRIVE_FOLDER_NAME = 'official image submissions';
const MEAL_INFO_SOURCE = 'Form responses';
const MEAL_DESTINATION = 'Meal Image+Info';
const COACH_MASTER_ID = '10isGpEx75IcGMZTNgkkkx2Cs2toFqYhWXQeMmpjQsAQ';
const COACH_MEAL_POOL = 'Meal Pool';
const MATCH_WINDOW_MINUTES = 1440; // 24 hours

// ═══════════════════════════════════════════════════════════════════════
// COLUMN LABELS
// ═══════════════════════════════════════════════════════════════════════

const EMAIL_LABELS = ['email', 'client email', 'e-mail', 'email address'];
const MEAL_LABELS = ['meal name', 'meal', 'meal_name', 'name'];
const CORE_LABELS = ['core ingredients', 'ingredients', 'main ingredients', 'ingredient list'];
const ADDED_LABELS = ['added ingredients', 'additional ingredients', 'extra ingredients'];
const COOKING_LABELS = ['cooking method', 'method', 'preparation method', 'prep method'];
const PORTIONS_LABELS = ['portions', 'portion', 'serving', 'servings'];
const TIME_LABELS = ['submission date', 'timestamp', 'submission time', 'date', 'time', 'submitted at'];
const SUBMISSION_ID_LABELS = ['submission id', 'id', 'response id'];

const DESTINATION_HEADERS = [
  'Client Email', 'Image URL', 'Submission Time', 'Meal Name',
  'Core Ingredients', 'Added Ingredients', 'Cooking Method',
  'Portions', 'Submission ID'
];

// ═══════════════════════════════════════════════════════════════════════
// TIMEZONE UTILITIES
// ═══════════════════════════════════════════════════════════════════════

function getTimezones() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let spreadsheetTZ = ss.getSpreadsheetTimeZone();
  const scriptTZ = Session.getScriptTimeZone();

  // Fallback to script timezone if spreadsheet timezone is invalid
  if (!spreadsheetTZ || spreadsheetTZ === '') {
    Logger.log('⚠️  WARNING: Spreadsheet timezone is not set, using script timezone');
    spreadsheetTZ = scriptTZ;
  }

  Logger.log(`\n🕐 TIMEZONE INFO:`);
  Logger.log(`  Spreadsheet timezone: ${spreadsheetTZ}`);
  Logger.log(`  Script timezone: ${scriptTZ}`);

  // Warn if timezones differ
  if (spreadsheetTZ !== scriptTZ) {
    Logger.log(`  ⚠️  WARNING: Spreadsheet and script timezones differ!`);
    Logger.log(`  ⚠️  This may cause matching issues if not handled properly.`);
  }

  return { spreadsheetTZ, scriptTZ };
}

function parseTimestamp(value, spreadsheetTZ) {
  /**
   * Robust timestamp parser that handles:
   * 1. Date objects (from Google Sheets cells formatted as dates)
   * 2. String timestamps (from form responses)
   * 3. Numeric timestamps (milliseconds since epoch)
   *
   * CRITICAL: String timestamps are interpreted in the spreadsheet's timezone!
   *
   * Returns: Date object or null if invalid
   */

  if (!value) {
    return null;
  }

  // Get spreadsheet timezone if not provided
  if (!spreadsheetTZ) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    spreadsheetTZ = ss.getSpreadsheetTimeZone();
    if (!spreadsheetTZ || spreadsheetTZ === '') {
      spreadsheetTZ = Session.getScriptTimeZone();
    }
  }

  // Already a Date object - Google Sheets returns these correctly parsed
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return null;
    }
    return value;
  }

  // Numeric timestamp (milliseconds since epoch)
  if (typeof value === 'number') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  }

  // String timestamp - MUST parse in spreadsheet's timezone
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Format: "2025-11-04 11:43:46" (common Google Sheets export format)
    // CRITICAL: This string represents a time in the SPREADSHEET'S timezone
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      const [, year, month, day, hour, minute, second] = match;

      // Calculate timezone offset between script and spreadsheet timezones
      const testDate = new Date('2025-01-15T12:00:00Z'); // Fixed UTC time
      const testFormatted = Utilities.formatDate(testDate, spreadsheetTZ, 'yyyy-MM-dd HH:mm:ss');
      const testParsedLocal = new Date(testFormatted.replace(' ', 'T'));

      // The offset from script TZ to spreadsheet TZ
      const tzOffsetMs = testDate.getTime() - testParsedLocal.getTime();

      // Parse the target string (interprets as script TZ)
      const localParsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);

      // The string is in spreadsheet TZ, but localParsed interpreted it as script TZ
      // We need to correct this
      // If script is UTC and spreadsheet is EST (UTC-5):
      //   - tzOffsetMs = +5 hours (UTC is 5 hours ahead of EST)
      //   - String "11:00" means "11:00 EST" = "16:00 UTC"
      //   - localParsed thinks it's "11:00 UTC"
      //   - Need to ADD 5 hours to get "16:00 UTC"
      const correctedDate = new Date(localParsed.getTime() + tzOffsetMs);

      if (!isNaN(correctedDate.getTime())) {
        return correctedDate;
      }
    }

    // Try standard Date parsing as fallback
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function normalizeToSpreadsheetTime(date) {
  /**
   * Convert any Date object to use spreadsheet timezone.
   * Returns the numeric timestamp (milliseconds since epoch).
   * This is timezone-independent for comparison purposes.
   */
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

function formatDateForDisplay(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let tz = ss.getSpreadsheetTimeZone();
  if (!tz || tz === '') {
    tz = Session.getScriptTimeZone();
  }
  return Utilities.formatDate(date, tz, 'MMM d, yyyy h:mm a');
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

// ═══════════════════════════════════════════════════════════════════════
// DIAGNOSTIC FUNCTION
// ═══════════════════════════════════════════════════════════════════════

function diagnosticCheck() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('DIAGNOSTIC CHECK - Meal Child Script (Timezone Fix V3)');
  Logger.log('═══════════════════════════════════════════════════════════');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetTZ = ss.getSpreadsheetTimeZone();

  getTimezones();

  Logger.log('\n[1] Checking Meal Info source sheet...');
  const sourceSheet = ss.getSheetByName(MEAL_INFO_SOURCE);

  if (sourceSheet) {
    Logger.log(`✓ Found "${MEAL_INFO_SOURCE}" sheet`);
    Logger.log(`  Rows: ${sourceSheet.getLastRow()}`);

    const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
    Logger.log(`  Headers: ${headers.join(', ')}`);

    if (sourceSheet.getLastRow() > 1) {
      const sample = sourceSheet.getRange(2, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
      Logger.log(`  Sample row 2: ${JSON.stringify(sample)}`);

      // Check timestamp format
      const timeCol = findColumn(headers, TIME_LABELS);
      if (timeCol !== -1) {
        const timeValue = sample[timeCol];
        Logger.log(`  Timestamp type: ${typeof timeValue}`);
        Logger.log(`  Timestamp value: ${timeValue}`);

        const parsed = parseTimestamp(timeValue, spreadsheetTZ);
        if (parsed) {
          Logger.log(`  ✓ Parsed successfully: ${formatDateForLog(parsed)}`);
          Logger.log(`  Milliseconds: ${parsed.getTime()}`);
        } else {
          Logger.log(`  ✗ Failed to parse timestamp!`);
        }
      }
    }
  } else {
    Logger.log(`✗ ERROR: "${MEAL_INFO_SOURCE}" sheet not found`);
  }

  Logger.log('\n[2] Checking Google Drive folder...');
  try {
    const folder = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME).next();
    Logger.log(`✓ Found folder: ${folder.getName()}`);

    // Check a sample file's timestamp
    const files = folder.getFiles();
    if (files.hasNext()) {
      const file = files.next();
      const created = file.getDateCreated();
      const modified = file.getLastUpdated();
      Logger.log(`\n  Sample file: ${file.getName()}`);
      Logger.log(`  Created: ${formatDateForLog(created)}`);
      Logger.log(`  Modified: ${formatDateForLog(modified)}`);
      Logger.log(`  Modified (ms): ${modified.getTime()}`);
    }
  } catch (e) {
    Logger.log(`✗ ERROR: Cannot access Drive folder - ${e.message}`);
  }

  Logger.log('\n[3] Checking destination sheet...');
  const destSheet = ss.getSheetByName(MEAL_DESTINATION);
  if (destSheet) {
    Logger.log(`✓ Found "${MEAL_DESTINATION}" sheet`);
    Logger.log(`  Rows: ${destSheet.getLastRow()}`);
  } else {
    Logger.log(`ℹ "${MEAL_DESTINATION}" will be created on first sync`);
  }

  Logger.log('\n[4] Checking Coach Master connection...');
  try {
    const coachSS = SpreadsheetApp.openById(COACH_MASTER_ID);
    Logger.log(`✓ Connected to Coach Master: ${coachSS.getName()}`);
  } catch (e) {
    Logger.log(`✗ ERROR: Cannot access Coach Master - ${e.message}`);
  }

  Logger.log('\n[5] Testing timestamp parsing...');
  const testCases = [
    new Date(),
    '2025-11-04 11:43:46',
    Date.now(),
    '2025-11-04T11:43:46',
  ];

  testCases.forEach((test, idx) => {
    const parsed = parseTimestamp(test, spreadsheetTZ);
    if (parsed) {
      Logger.log(`  Test ${idx + 1}: ✓ ${formatDateForLog(parsed)}`);
    } else {
      Logger.log(`  Test ${idx + 1}: ✗ Failed to parse: ${test}`);
    }
  });

  Logger.log('\n═══════════════════════════════════════════════════════════');
  Logger.log('Diagnostic complete!');
  Logger.log('═══════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN SYNC FUNCTION
// ═══════════════════════════════════════════════════════════════════════

function runMealSync() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('STARTING MEAL SYNC (Timezone Fix V3)');
  Logger.log('═══════════════════════════════════════════════════════════');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  getTimezones();

  const mealIndex = buildMealIndex(ss);
  Logger.log(`\nIndexed ${mealIndex.totalCount} meals from ${mealIndex.emailCount} clients`);

  if (mealIndex.errors > 0) {
    Logger.log(`⚠️  ${mealIndex.errors} rows had invalid timestamps and were skipped`);
  }

  const matchResults = scanDriveAndMatch(ss, mealIndex.data);
  Logger.log(`\nMatching: ${matchResults.matched} matched, ${matchResults.unmatched} unmatched`);

  if (matchResults.matchedRows.length > 0) {
    const transferred = transferToCoachMaster(matchResults.matchedRows);
    Logger.log(`\nTransfer: ${transferred} new meals sent to Coach Master`);
  } else {
    Logger.log('\nTransfer: 0 new meals (nothing to transfer)');
  }

  Logger.log('\n═══════════════════════════════════════════════════════════');
  Logger.log('MEAL SYNC COMPLETE');
  Logger.log('═══════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════
// BUILD MEAL INDEX WITH AUTO-FILL
// ═══════════════════════════════════════════════════════════════════════

function buildMealIndex(ss) {
  const sourceSheet = ss.getSheetByName(MEAL_INFO_SOURCE);
  if (!sourceSheet || sourceSheet.getLastRow() <= 1) {
    return { data: new Map(), totalCount: 0, emailCount: 0, errors: 0 };
  }

  // Get spreadsheet timezone for correct timestamp parsing
  const spreadsheetTZ = ss.getSpreadsheetTimeZone();

  const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  const values = sourceSheet.getRange(2, 1, sourceSheet.getLastRow() - 1, sourceSheet.getLastColumn()).getValues();

  const emailCol = findColumn(headers, EMAIL_LABELS);
  const mealCol = findColumn(headers, MEAL_LABELS);
  const coreCol = findColumn(headers, CORE_LABELS);
  const addedCol = findColumn(headers, ADDED_LABELS);
  const cookingCol = findColumn(headers, COOKING_LABELS);
  const portionsCol = findColumn(headers, PORTIONS_LABELS);
  const timeCol = findColumn(headers, TIME_LABELS);
  const idCol = findColumn(headers, SUBMISSION_ID_LABELS);

  if (emailCol === -1 || mealCol === -1 || timeCol === -1) {
    Logger.log('ERROR: Required columns not found');
    Logger.log(`  Email column: ${emailCol === -1 ? 'MISSING' : 'Found'}`);
    Logger.log(`  Meal column: ${mealCol === -1 ? 'MISSING' : 'Found'}`);
    Logger.log(`  Time column: ${timeCol === -1 ? 'MISSING' : 'Found'}`);
    return { data: new Map(), totalCount: 0, emailCount: 0, errors: 0 };
  }

  const mealHistory = buildMealHistory(ss);

  const index = new Map();
  let totalCount = 0;
  let autoFillCount = 0;
  let errorCount = 0;

  Logger.log(`\n📋 Processing ${values.length} form submissions...`);

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const email = normalizeEmail(row[emailCol]);
    const mealName = String(row[mealCol] || '').trim();
    const timeValue = row[timeCol];

    if (!email || !mealName) {
      Logger.log(`⚠️  Row ${i + 2}: Skipping - missing email or meal name`);
      continue;
    }

    // CRITICAL FIX: Use robust parseTimestamp function with spreadsheet timezone
    const submissionTime = parseTimestamp(timeValue, spreadsheetTZ);

    if (!submissionTime) {
      Logger.log(`⚠️  Row ${i + 2}: Invalid timestamp (${typeof timeValue}): ${timeValue}`);
      errorCount++;
      continue;
    }

    // Normalize to milliseconds for timezone-independent comparison
    const submissionTimeMs = normalizeToSpreadsheetTime(submissionTime);

    if (submissionTimeMs === null) {
      Logger.log(`⚠️  Row ${i + 2}: Failed to normalize timestamp`);
      errorCount++;
      continue;
    }

    Logger.log(`  📝 Row ${i + 2}: "${mealName}" at ${formatDateForLog(submissionTime)}`);

    let coreIngredients = coreCol !== -1 ? String(row[coreCol] || '').trim() : '';
    let addedIngredients = addedCol !== -1 ? String(row[addedCol] || '').trim() : '';
    let cookingMethod = cookingCol !== -1 ? String(row[cookingCol] || '').trim() : '';
    let portions = portionsCol !== -1 ? String(row[portionsCol] || '').trim() : '';

    // AUTO-FILL
    const hasBlankFields = !coreIngredients || !addedIngredients || !cookingMethod || !portions;
    if (hasBlankFields) {
      const previousMeal = lookupPreviousMeal(mealHistory, email, mealName);
      if (previousMeal) {
        if (!coreIngredients) coreIngredients = previousMeal.coreIngredients;
        if (!addedIngredients) addedIngredients = previousMeal.addedIngredients;
        if (!cookingMethod) cookingMethod = previousMeal.cookingMethod;
        if (!portions) portions = previousMeal.portions;
        autoFillCount++;
        Logger.log(`    ✓ Auto-filled from history`);
      }
    }

    if (!index.has(email)) {
      index.set(email, []);
    }

    index.get(email).push({
      submissionTime: submissionTime,
      submissionTimeMs: submissionTimeMs,
      mealName: mealName,
      coreIngredients: coreIngredients,
      addedIngredients: addedIngredients,
      cookingMethod: cookingMethod,
      portions: portions,
      submissionId: idCol !== -1 ? String(row[idCol] || '').trim() : ''
    });

    totalCount++;
  }

  // Sort by timestamp (oldest first)
  for (const [email, meals] of index.entries()) {
    meals.sort((a, b) => a.submissionTimeMs - b.submissionTimeMs);
    Logger.log(`\n📧 ${email}: ${meals.length} submissions indexed`);

    // Log first few timestamps for debugging
    Logger.log(`  Meal timestamps (first 3):`);
    for (let i = 0; i < Math.min(3, meals.length); i++) {
      Logger.log(`    ${i + 1}. ${meals[i].mealName} - ${formatDateForLog(meals[i].submissionTime)}`);
    }
  }

  if (autoFillCount > 0) {
    Logger.log(`\n✓ Auto-filled ${autoFillCount} meals from history!`);
  }

  return {
    data: index,
    totalCount: totalCount,
    emailCount: index.size,
    errors: errorCount
  };
}

// ═══════════════════════════════════════════════════════════════════════
// BUILD MEAL HISTORY
// ═══════════════════════════════════════════════════════════════════════

function buildMealHistory(ss) {
  const destSheet = ss.getSheetByName(MEAL_DESTINATION);
  const history = new Map();

  if (!destSheet || destSheet.getLastRow() <= 1) {
    return history;
  }

  const data = destSheet.getRange(2, 1, destSheet.getLastRow() - 1, 9).getValues();

  for (let i = 0; i < data.length; i++) {
    const email = normalizeEmail(data[i][0]);
    const mealName = String(data[i][3] || '').trim().toLowerCase();
    const coreIngredients = String(data[i][4] || '').trim();
    const addedIngredients = String(data[i][5] || '').trim();
    const cookingMethod = String(data[i][6] || '').trim();
    const portions = String(data[i][7] || '').trim();

    if (!email || !mealName) continue;

    if (coreIngredients || addedIngredients || cookingMethod || portions) {
      const key = `${email}|${mealName}`;
      history.set(key, {
        coreIngredients: coreIngredients,
        addedIngredients: addedIngredients,
        cookingMethod: cookingMethod,
        portions: portions
      });
    }
  }

  Logger.log(`📚 Meal history: ${history.size} unique meals loaded`);

  return history;
}

function lookupPreviousMeal(mealHistory, email, mealName) {
  const key = `${email}|${mealName.toLowerCase()}`;
  return mealHistory.get(key) || null;
}

// ═══════════════════════════════════════════════════════════════════════
// SCAN DRIVE AND MATCH - WITH TIMEZONE FIX
// ═══════════════════════════════════════════════════════════════════════

function scanDriveAndMatch(ss, mealIndex) {
  const destSheet = getOrCreateSheet(ss, MEAL_DESTINATION, DESTINATION_HEADERS);

  const existingImages = new Set();
  if (destSheet.getLastRow() > 1) {
    const existing = destSheet.getRange(2, 2, destSheet.getLastRow() - 1, 1).getValues();
    existing.forEach(row => {
      if (row[0]) existingImages.add(String(row[0]));
    });
  }

  const matchedRows = [];
  let matchedCount = 0;
  let unmatchedCount = 0;

  try {
    const rootFolder = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME).next();
    const clientFolders = rootFolder.getFolders();

    while (clientFolders.hasNext()) {
      const clientFolder = clientFolders.next();
      const email = normalizeEmail(extractEmailFromFolderName(clientFolder.getName()));

      if (!email) {
        Logger.log(`⚠️  Skipping folder (no email found): ${clientFolder.getName()}`);
        continue;
      }

      const clientMeals = mealIndex.get(email) || [];
      const usedMealIndices = new Set();

      // Collect all images
      const allImages = [];
      const files = clientFolder.getFiles();
      while (files.hasNext()) {
        const file = files.next();
        if (file.getMimeType().startsWith('image/')) {
          allImages.push(file);
        }
      }

      const subfolders = clientFolder.getFolders();
      while (subfolders.hasNext()) {
        const subfolder = subfolders.next();
        const subFiles = subfolder.getFiles();
        while (subFiles.hasNext()) {
          const file = subFiles.next();
          if (file.getMimeType().startsWith('image/')) {
            allImages.push(file);
          }
        }
      }

      // Sort images by modification time (oldest first)
      allImages.sort((a, b) => a.getLastUpdated().getTime() - b.getLastUpdated().getTime());

      Logger.log(`  Image timestamps (first 3):`);
      for (let i = 0; i < Math.min(3, allImages.length); i++) {
        Logger.log(`    ${i + 1}. ${formatDateForLog(allImages[i].getLastUpdated())}`);
      }

      Logger.log(`\n📸 Processing ${allImages.length} images for ${email}`);

      // Match each image
      for (const file of allImages) {
        const url = file.getUrl();
        if (existingImages.has(url)) continue;

        // Drive timestamps are always in UTC, convert to our comparison format
        const fileTime = file.getLastUpdated();
        const fileTimeMs = normalizeToSpreadsheetTime(fileTime);

        if (fileTimeMs === null) {
          Logger.log(`  ⚠️  Invalid file timestamp for: ${file.getName()}`);
          continue;
        }

        Logger.log(`\n  🖼️  Image: ${file.getName()}`);
        Logger.log(`     Modified: ${formatDateForLog(fileTime)}`);

        const match = findNearestUnusedMeal(clientMeals, fileTimeMs, usedMealIndices);

        const row = createMealRow(email, url, fileTime, match);
        destSheet.appendRow(row);
        existingImages.add(url);

        if (match) {
          matchedRows.push(row);
          matchedCount++;
          Logger.log(`     ✅ MATCHED to "${match.mealName}"`);
        } else {
          unmatchedCount++;
          Logger.log(`     ❌ NO MATCH (no meals within 24hr window)`);
        }
      }
    }
  } catch (e) {
    Logger.log(`ERROR scanning Drive: ${e.message}`);
    Logger.log(`Stack trace: ${e.stack}`);
  }

  if (destSheet.getLastRow() > 2) {
    destSheet.getRange(2, 1, destSheet.getLastRow() - 1, DESTINATION_HEADERS.length)
      .sort({ column: 3, ascending: false });
  }

  return {
    matchedRows: matchedRows,
    matched: matchedCount,
    unmatched: unmatchedCount
  };
}

// ═══════════════════════════════════════════════════════════════════════
// FIND NEAREST UNUSED MEAL - WITH TIMEZONE-AWARE COMPARISON
// ═══════════════════════════════════════════════════════════════════════

function findNearestUnusedMeal(meals, fileTimeMs, usedMealIndices) {
  if (!meals || meals.length === 0) return null;

  const maxDiff = MATCH_WINDOW_MINUTES * 60 * 1000;
  let bestMatch = null;
  let bestDiff = Infinity;
  let bestIndex = -1;

  Logger.log(`     🔍 Checking ${meals.length} meals:`);

  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i];

    if (usedMealIndices.has(i)) {
      Logger.log(`        - [USED] "${meal.mealName}"`);
      continue;
    }

    // CRITICAL FIX: Compare using millisecond timestamps (timezone-independent)
    // Both fileTimeMs and meal.submissionTimeMs are normalized timestamps
    const diff = Math.abs(meal.submissionTimeMs - fileTimeMs);
    const diffMinutes = Math.round(diff / 60000);

    Logger.log(`        - "${meal.mealName}" (${diffMinutes} min away)`);

    if (diff <= maxDiff && diff < bestDiff) {
      bestMatch = meal;
      bestDiff = diff;
      bestIndex = i;
    }
  }

  if (bestMatch) {
    const finalDiff = Math.round(bestDiff / 60000);
    Logger.log(`     ✓ Best match: "${bestMatch.mealName}" (${finalDiff} min difference)`);
    usedMealIndices.add(bestIndex);
  }

  return bestMatch;
}

function createMealRow(email, imageUrl, fileTime, match) {
  const submissionTime = match ? match.submissionTime : fileTime;

  // CRITICAL FIX: Write the Date object directly, not a formatted string
  // This lets Google Sheets display it correctly in the spreadsheet's timezone
  return [
    email,
    imageUrl,
    submissionTime,  // Date object, not string!
    match ? match.mealName : '',
    match ? match.coreIngredients : '',
    match ? match.addedIngredients : '',
    match ? match.cookingMethod : '',
    match ? match.portions : '',
    match ? match.submissionId : ''
  ];
}

// ═══════════════════════════════════════════════════════════════════════
// TRANSFER TO COACH MASTER
// ═══════════════════════════════════════════════════════════════════════

function transferToCoachMaster(matchedRows) {
  try {
    const coachSS = SpreadsheetApp.openById(COACH_MASTER_ID);
    let mealPool = coachSS.getSheetByName(COACH_MEAL_POOL);

    if (!mealPool) {
      mealPool = coachSS.insertSheet(COACH_MEAL_POOL);
      mealPool.appendRow(DESTINATION_HEADERS);
      mealPool.getRange(1, 1, 1, DESTINATION_HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#4CAF50')
        .setFontColor('#ffffff');
      mealPool.setFrozenRows(1);
    }

    const existingMeals = new Set();
    if (mealPool.getLastRow() > 1) {
      const existing = mealPool.getRange(2, 1, mealPool.getLastRow() - 1, 9).getValues();
      existing.forEach(row => {
        const hash = `${row[0]}_${row[2]}_${row[3]}`;
        existingMeals.add(hash);
      });
    }

    const newMeals = matchedRows.filter(row => {
      const hash = `${row[0]}_${row[2]}_${row[3]}`;
      return !existingMeals.has(hash);
    });

    if (newMeals.length > 0) {
      const nextRow = mealPool.getLastRow() + 1;
      mealPool.getRange(nextRow, 1, newMeals.length, 9).setValues(newMeals);
      Logger.log(`✓ Transferred ${newMeals.length} new meals to Coach Master`);
    }

    return newMeals.length;

  } catch (e) {
    Logger.log(`ERROR transferring to Coach Master: ${e.message}`);
    Logger.log(`Stack trace: ${e.stack}`);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function findColumn(headers, labels) {
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]).toLowerCase().trim();
    if (labels.some(label => header.includes(label))) {
      return i;
    }
  }
  return -1;
}

function normalizeEmail(str) {
  return String(str || '').toLowerCase().trim();
}

function extractEmailFromFolderName(name) {
  const match = String(name).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  const isNewSheet = !sheet;

  if (isNewSheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#2196F3')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    Logger.log(`✓ Created sheet: ${name}`);
  }

  // Format the timestamp column (column 3) as date/time
  // This ensures timestamps display correctly in the spreadsheet's timezone
  // Apply to both new and existing sheets to fix any legacy string data
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 3, sheet.getLastRow() - 1, 1)
      .setNumberFormat('MMM d, yyyy h:mm:ss a');
  }

  return sheet;
}

// ═══════════════════════════════════════════════════════════════════════
// SETUP & TRIGGERS
// ═══════════════════════════════════════════════════════════════════════

function setupMealChild() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('MEAL CHILD SETUP (Timezone Fix V3)');
  Logger.log('═══════════════════════════════════════════════════════════');

  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runMealSync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('runMealSync')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('✓ Trigger created: runMealSync() will run every hour');
  Logger.log('✓ Timezone-aware matching enabled!');
  Logger.log('✓ Robust timestamp parsing enabled!');
  Logger.log('✓ Setup complete!');
  Logger.log('═══════════════════════════════════════════════════════════');
}

function removeMealTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runMealSync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  Logger.log('✓ All meal sync triggers removed');
}
