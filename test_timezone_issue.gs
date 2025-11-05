/**
 * TEST SCRIPT - Diagnose Timezone Parsing Issue
 *
 * This demonstrates the timezone parsing problem and validates the fix.
 */

function testTimezoneParsingIssue() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('TIMEZONE PARSING ISSUE TEST');
  Logger.log('═══════════════════════════════════════════════════════════');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheetTZ = ss.getSpreadsheetTimeZone();
  const scriptTZ = Session.getScriptTimeZone();

  Logger.log(`Spreadsheet timezone: ${spreadsheetTZ}`);
  Logger.log(`Script timezone: ${scriptTZ}`);

  // Simulate a form submission timestamp string
  const testString = "2025-11-04 11:43:46";

  Logger.log(`\nTest string: "${testString}"`);
  Logger.log(`This string is in the spreadsheet's timezone: ${spreadsheetTZ}`);

  // WRONG WAY (current buggy code):
  const isoString = "2025-11-04T11:43:46";
  const wrongDate = new Date(isoString);
  Logger.log(`\n❌ WRONG: new Date("${isoString}")`);
  Logger.log(`   Result: ${wrongDate.toString()}`);
  Logger.log(`   Interpreted as: ${Utilities.formatDate(wrongDate, scriptTZ, 'yyyy-MM-dd HH:mm:ss z')}`);
  Logger.log(`   Milliseconds: ${wrongDate.getTime()}`);

  // RIGHT WAY (corrected):
  const correctDate = parseTimestampInSpreadsheetTZ(testString, spreadsheetTZ);
  Logger.log(`\n✅ CORRECT: parseTimestampInSpreadsheetTZ("${testString}", "${spreadsheetTZ}")`);
  Logger.log(`   Result: ${correctDate.toString()}`);
  Logger.log(`   In spreadsheet TZ: ${Utilities.formatDate(correctDate, spreadsheetTZ, 'yyyy-MM-dd HH:mm:ss z')}`);
  Logger.log(`   In script TZ: ${Utilities.formatDate(correctDate, scriptTZ, 'yyyy-MM-dd HH:mm:ss z')}`);
  Logger.log(`   Milliseconds: ${correctDate.getTime()}`);

  const diffMs = Math.abs(wrongDate.getTime() - correctDate.getTime());
  const diffHours = diffMs / (1000 * 60 * 60);

  Logger.log(`\n⚠️  DIFFERENCE: ${diffHours} hours (${diffMs} milliseconds)`);
  Logger.log(`   This is why images are paired with the wrong meals!`);

  Logger.log('\n═══════════════════════════════════════════════════════════');
}

function parseTimestampInSpreadsheetTZ(dateString, timezone) {
  /**
   * Parse a date string explicitly in the specified timezone.
   *
   * The key insight: "2025-11-04 11:43:46" means 11:43:46 in the
   * SPREADSHEET'S timezone, not the script's timezone.
   */

  // Match the format: "2025-11-04 11:43:46"
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;

  // Create a formatted string in the target timezone
  const formattedForTZ = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

  // Use Utilities.formatDate in reverse - we need to parse in the given timezone
  // Trick: Create a reference date, format it in both timezones, calculate offset
  const referenceDate = new Date(2025, 0, 1, 12, 0, 0); // Jan 1, 2025 12:00:00

  // Format reference in both timezones
  const refInScript = Utilities.formatDate(referenceDate, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const refInSpreadsheet = Utilities.formatDate(referenceDate, timezone, 'yyyy-MM-dd HH:mm:ss');

  // Parse both back as local time
  const refScriptParsed = new Date(refInScript.replace(' ', 'T'));
  const refSpreadsheetParsed = new Date(refInSpreadsheet.replace(' ', 'T'));

  // Calculate timezone offset in milliseconds
  const tzOffset = refScriptParsed.getTime() - refSpreadsheetParsed.getTime();

  // Now parse the target date string as local time
  const localParsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);

  // Adjust by the timezone offset
  const correctedDate = new Date(localParsed.getTime() - tzOffset);

  return correctedDate;
}
