// V9: experience points = the profile's TOTAL experience points / 30 = 1 score point per 30, capped (Config G5:G6, default 30 and 30). No starting value, any account age. Everything else is V5.
// V5 rules (XP part replaced by V9): shared ties, dated/capped attendance, inclusive event window, average guild score, cached evidence on failures.
/**
 * Google Cloud Learn with Communities - organizer tracker
 *
 * SAFETY RULE:
 * - Form Responses 1 is read-only. This script never writes to it.
 * - All generated data goes to separate organizer tabs.
 *
 * SETUP:
 * 1. Open the responses spreadsheet -> Extensions -> Apps Script.
 * 2. Replace Code.gs with this file and save.
 * 3. Project Settings -> set time zone to Asia/Kolkata.
 * 4. Run refreshAll once and approve permissions.
 * 5. Reload the spreadsheet and use the GCLC Tracker menu.
 * Repeated refreshes update only changed table rows/cells where practical.
 *
 * V4 CHANGES (points score; everything not listed here behaves as before):
 * - NEW FILE Scoring.gs (third file in the same project; Groups.gs must be updated to its V4 too).
 * - Config gets a "Scoring rules" block in columns F:H: every weight, cap and the program end date, plus 5 dummy
 *   activities (names and points) to replace with your own.
 * - Student score = badge points (credits, minimum 4) + experience points GAINED since the student's starting value
 *   + streak points + early-finish points + activity points. The Leaderboard is now ordered by this score.
 * - NEW Tracker column "Starting points" (last column): saved automatically the first time a profile is read; you may overwrite it.
 * - NEW tab Activity Points: one row per award (roll number + activity); points default from Config.
 * - Groups are ranked by group score = average student score per member x participation rate.
 * - The Leaderboard tab no longer carries a group table on the right (the Group Leaderboard tab has it, with heads).
 *
 * V3 CHANGES (groups; everything not listed here behaves as before):
 * - NEW FILE Groups.gs holds all group code. Paste it as a second file in the same Apps Script project.
 * - NEW Groups tab: you type each group number and its head ONCE (columns A and B, row 5 down).
 * - NEW "Group" column (column N) at the end of Follow-up, with a drop-down of your group numbers.
 *   It is saved into the Tracker's "Group (manual)" column on the next refresh.
 * - NEW tabs Group Leaderboard (groups ranked by average badges per member) and Group Members
 *   (pick a group number to see its members). The Dashboard gets a "Groups" block under the badge table.
 * - NEW Tracker column "Badge dates (in window)" (last column): the days each student earned a badge.
 * - The group table on the Leaderboard tab now uses the same ranking as the Group Leaderboard tab.
 * - Backup now also copies the Groups tab.
 *
 * V2 CHANGES (same behaviour everywhere not listed here):
 * - FIX: a non-redeemed student whose profile has not been checked yet
 *   (status "Pending check") no longer shows as "No issues" / Low priority.
 *   They now show as Watch with "Profile not checked yet".
 * - FIX: the Dashboard batch-year table and the credit-redemption block can
 *   no longer collide. The redemption block (and the new event-lead snapshot
 *   below it) now start on the first free row after the batch-year table.
 * - FIX: the redemption block's "profile not readable" row no longer counts
 *   students who are merely waiting for their first check. Those get their
 *   own row, and the percentage row's basis is stated in the block's note.
 * - IMPROVE: profile parsing accepts "Member since Sep 2024" as well as
 *   "Member since 2024", and badge dates written as "14 Sep 2026" as well
 *   as "Sep 14 2026", so a small page-format change no longer silently
 *   zeroes out badges or marks every profile unreachable.
 * - IMPROVE: a failed profile-fetch batch (network error) no longer marks
 *   the whole batch "Unreachable (fetch error)". Those profiles stay
 *   pending and the refresh reports PARTIAL, so the next refresh retries
 *   them instead of poisoning their status for hours.
 * - IMPROVE: duplicate detection for submissions without a profile link now
 *   matches names with words in any order, the same way Follow-up dedup
 *   already did, so a reordered name no longer leaves two active records.
 * - DASHBOARD (event lead): new "Event lead snapshot" block under the
 *   redemption block - waiting for first check, superseded submissions,
 *   redeemed but idle (Watch), verified students with 0 counted badges,
 *   and registrations in the last 7 days. Nothing existing was removed or
 *   moved, because other formulas reference the existing KPI rows.
 */

const SHEETS = {
  RESP: 'Form Responses 1',
  TRACK: 'Tracker',
  CONF: 'Config',
  DASH: 'Dashboard',
  FOLLOW: 'Follow-up',
  REWARDS: 'Reward Eligibility',
  LOG: 'Refresh Log',
  BOARD: 'Leaderboard',
  REFILL: 'Refill Check',
  GROUPS: 'Groups',
  GBOARD: 'Group Leaderboard',
  GMEM: 'Group Members',
  ACTIVITY: 'Activity Points'
};

const FIXED = [
  'Key', 'Submitted', 'Name', 'Roll', 'Email', 'Profile ID', 'Status', 'Flags',
  'Member since', 'Points', 'Started', 'Any badges (in window)', 'Counted badges',
  'Tier', 'Last checked'
];

// Manual fields are preserved on refresh by matching their column headers.
const MANUAL = [
  'Group (manual)',
  'Credits redeemed? (manual)',
  'Notes (manual)',
  'Reward approved? (manual)',
  'Reward collected? (manual)',
  'Collection date (manual)',
  'Follow-up status (manual)',
  'Follow-up owner (manual)',
  'Last follow-up (manual)',
  'Follow-up notes (manual)'
];

const I = {
  KEY: 0, TS: 1, NAME: 2, ROLL: 3, EMAIL: 4, PID: 5, STATUS: 6, FLAGS: 7,
  SINCE: 8, POINTS: 9, STARTED: 10, ANY: 11, COUNTED: 12, TIER: 13, CHECKED: 14
};

const M = {
  GROUP: 0,
  CREDITS: 1,
  NOTES: 2,
  APPROVED: 3,
  COLLECTED: 4,
  COLLECTION_DATE: 5,
  FOLLOW_STATUS: 6,
  FOLLOW_OWNER: 7,
  LAST_FOLLOW: 8,
  FOLLOW_NOTES: 9
};

const FIRST_BADGE_COL = FIXED.length + MANUAL.length + 1;
const DUP = 'Duplicate (superseded)';
const PENDING = 'Pending check';
const FILLED = 'Form filled by us';
const REDEEMED = 'Credits redeemed';     // set when the student confirms they redeemed their credits (shown in green)
const HIDE = 'Hide from list';          // choose this in Follow-up status to remove a student from the Follow-up tab
const EXCLUDED = 'Not eligible';        // choose this in Follow-up status: the student is out of the event (leaderboard, groups, Bingo, counts) and leaves the Follow-up tab. Change it back in the Tracker's "Follow-up status (manual)" column to undo.
const FOLLOW_STATUSES = ['Not started', FILLED, REDEEMED, 'Asked to resubmit', 'Contacted', 'Waiting for response', 'Resolved', HIDE, EXCLUDED];
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)';

const DEFAULT_CURRICULUM = [
  ['The Basics of Google Cloud Compute', '', 4, 'https://www.skills.google/course_templates/754'],
  ['Configure Service Accounts and IAM Roles for Google Cloud', '', 4, 'https://www.skills.google/course_templates/702'],
  ['Implement Speech and Language Solutions with Pre-trained APIs', '', 4, 'https://www.skills.google/course_templates/700'],
  ['Develop AI-Powered Prototypes in Google AI Studio', '', 0, 'https://www.skills.google/course_templates/1426'],
  ['Analyze Images with the Cloud Vision API', '', 12, 'https://www.skills.google/course_templates/633'],
  ['Build a Website on Google Cloud', '', 13, 'https://www.skills.google/course_templates/638'],
  ['Create Your First Gemini Enterprise Application', '', 0, 'https://www.skills.google/course_templates/1586'],
  ['Store, Process, and Manage Data on Google Cloud - Console', '', 3, 'https://www.skills.google/course_templates/658'],
  ['Using the Google Cloud Speech API', '', 4, 'https://www.skills.google/course_templates/756'],
  ['Explore Generative AI in Agent Platform', '', 16, 'https://www.skills.google/course_templates/959']
];

/* --------------------------------------------------------------- menu */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('GCLC Tracker')
    .addItem('Refresh now', 'refreshAll')
    .addItem('Retry failed profiles', 'retryFailedProfiles')
    .addItem('Find a student', 'findStudent')
    .addItem('Check one profile (diagnose)', 'diagnoseProfile')
    .addSeparator()
    .addItem('Back up organizer data', 'backupOrganizerData')
    .addSeparator()
    .addItem('Auto-refresh every 6 hours', 'enableAutoRefresh')
    .addItem('Stop auto-refresh', 'disableAutoRefresh')
    .addToUi();
}

function enableAutoRefresh() {
  removeRefreshTriggers_();
  ScriptApp.newTrigger('refreshAll').timeBased().everyHours(6).create();
  SpreadsheetApp.getActive().toast('Auto-refresh is on (every 6 hours).');
}

function disableAutoRefresh() {
  removeRefreshTriggers_();
  SpreadsheetApp.getActive().toast('Auto-refresh is off.');
}

function removeRefreshTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'refreshAll')
    .forEach(t => ScriptApp.deleteTrigger(t));
}

/* ------------------------------------------------------------- refresh */

function refreshAll() {
  runRefresh_(false);
}

function retryFailedProfiles() {
  runRefresh_(true);
}

function runRefresh_(retryFailures) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    SpreadsheetApp.getActive().toast('A refresh is already running. Try again after it finishes.');
    return;
  }

  const startedAt = new Date();
  let model = [];

  try {
    setDashboardRefreshStatus_('RUNNING - refresh in progress', '#cfe2f3');
    const cfg = readConfig_();
    validateConfig_(cfg);
    const resp = readResponses_();

    // Safety check: an unexpectedly empty form sheet must not erase organizer data.
    const oldTracker = readTracker_();
    if (resp.length === 0 && oldTracker.rows.length > 0) {
      throw new Error('No form responses were found, but the Tracker already has records. Refresh stopped to protect organizer data. Check Form Responses 1 before trying again.');
    }

    // Form responses should be append-only. Stop if a previously tracked response vanished or changed its key.
    const currentKeys = new Set(resp.map(r => r.key));
    const missingRows = oldTracker.rows.filter(r => r[0] && !currentKeys.has(String(r[0])));
    if (missingRows.length) {
      throw new Error(missingRows.length + ' previously tracked response(s) are missing from Form Responses 1 or their timestamp/email changed. Refresh stopped to protect manual organizer data. Review the source sheet before retrying.');
    }

    // Keep edits made in the Follow-up report before rebuilding it.
    try { captureManualBlue_(); } catch (captureError) {}
    syncFollowUpEditsToTracker_();
    model = buildModel_(resp, cfg);
    const checkSummary = checkProfiles_(model, cfg, retryFailures);
    finalize_(model, cfg);
    const scoreNote = '';
    ensureActivitySheet_();
    scoreModel_(model, cfg);

    const pendingCount = model.filter(m => m.status === PENDING).length;
    const failedCount = model.filter(m => String(m.status).indexOf('Unreachable') === 0).length;
    const incomplete = checkSummary.remaining > 0 || pendingCount > 0;
    const refreshStatus = incomplete ? 'PARTIAL' : (failedCount > 0 ? 'COMPLETE WITH ERRORS' : 'SUCCESS');

    writeTracker_(model, cfg);
    let groupNote = '';
    try { ensureGroupsSheet_(); } catch (groupSetupError) { groupNote = 'Groups tab could not be set up: ' + String(groupSetupError.message || groupSetupError).slice(0, 150); }
    buildFollowUp_(model, cfg);
    buildRewardEligibility_(model, cfg);
    buildLeaderboard_(model, cfg);
    try { buildRefillCheck_(model); } catch (refillError) {}
    // Update the dashboard last so it does not claim the refresh is complete
    // if an earlier report failed to rebuild.
    buildGroups_(model, cfg);
    buildDashboard_(cfg, model, refreshStatus, checkSummary);
    buildDashboardGroups_(groupStats_(groupMembers_(model), readGroupsList_(), cfg), cfg);
    try { applyDateFormats_(); } catch (formatError) {}
    try { ensureStatusValidation_(); } catch (validationError) {}

    orderOrganizerTabsV5();
    const logNotes = [retryFailures ? 'Manual retry run' : 'Regular refresh'];
    if (checkSummary.remaining > 0) logNotes.push(checkSummary.remaining + ' profile check(s) not attempted before the time limit');
    if (pendingCount > 0) logNotes.push(pendingCount + ' profile(s) still waiting for a first check');
    if (failedCount > 0) logNotes.push(failedCount + ' profile(s) currently unreachable');
    if (groupNote) logNotes.push(groupNote);
    if (scoreNote) logNotes.push(scoreNote);

    appendRefreshLog_({
      time: new Date(),
      status: refreshStatus,
      submissions: model.length,
      active: model.filter(m => m.status !== DUP && m.status !== EXCLUDED).length,
      verified: model.filter(m => m.status === 'OK').length,
      failed: failedCount,
      seconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
      note: logNotes.join('; ')
    });

    if (incomplete) {
      SpreadsheetApp.getActive().toast('Refresh partially completed. Check Dashboard and Refresh Log for remaining profile checks.');
    } else if (failedCount > 0) {
      SpreadsheetApp.getActive().toast('Tracker refreshed, but some profiles are unreachable. See Follow-up and Refresh Log.');
    } else {
      SpreadsheetApp.getActive().toast('Tracker refreshed: ' + model.length + ' submissions.');
    }
  } catch (e) {
    try {
      setDashboardRefreshStatus_('FAILED - ' + String(e && e.message ? e.message : e).slice(0, 300), '#f4cccc');
    } catch (statusError) {
      // Keep the original refresh error as the main error.
    }
    try {
      appendRefreshLog_({
        time: new Date(), status: 'FAILED', submissions: model.length,
        active: '', verified: '', failed: '',
        seconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
        note: String(e && e.message ? e.message : e).slice(0, 500)
      });
    } catch (logError) {
      // Keep the original refresh error as the main error.
    }
    try { SpreadsheetApp.getActive().toast('Refresh failed: ' + String(e.message || e).slice(0, 180)); } catch (toastError) {}
    throw e;
  } finally {
    lock.releaseLock();
  }
}

function setDashboardRefreshStatus_(message, color) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.DASH);
  if (!sh) return;
  sh.getRange('A3').setValue('Refresh status').setFontWeight('bold');
  sh.getRange('B3').setValue(message);
  sh.getRange('A3:B3').setBackground(color || '#ffffff');
}

function validateConfig_(cfg) {
  if (!(cfg.start instanceof Date) || isNaN(cfg.start.getTime())) {
    throw new Error('The Program start date in Config!B2 is not a valid date.');
  }
  if (!cfg.curriculum.length) {
    throw new Error('No curriculum badges were found in Config. Add at least one badge before refreshing.');
  }
  if (cfg.bottle < 1 || cfg.kit <= cfg.bottle) {
    throw new Error('Check Config: the bottle threshold must be at least 1 and the kit threshold must be greater than the bottle threshold.');
  }
  if (!cfg.onlyCurr) throw new Error('Competition rules require curriculum-only counting.');
  if (!cfg.score || !(cfg.score.end instanceof Date) || isNaN(cfg.score.end.getTime()) || cfg.score.end < cfg.start) throw new Error('Program end must be on or after program start.');
  const names = cfg.curriculum.map(b => normText_(b.name)).filter(Boolean);
  if (names.length !== cfg.curriculum.length) {
    throw new Error('Every curriculum row in Config must have a badge name.');
  }
  if (new Set(names).size !== names.length) {
    throw new Error('Two curriculum badge names are the same after normalizing punctuation/case. Make the names unique in Config.');
  }
}

/* -------------------------------------------------------- common helpers */

function normText_(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function escapeRegExp_(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function htmlToText_(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ').trim();
}

function extractProfileId_(text) {
  const m = String(text || '').match(/public_profiles\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1].toLowerCase() : '';
}

function normRoll_(v) {
  return String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function rollLooksValid_(roll) {
  return /^20\d{2}[A-Z]{2,5}\d{1,3}$/.test(roll);
}

function emailLooksValid_(e) {
  const s = String(e || '').trim();
  return /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(s) && s.indexOf('..') < 0;
}

function isoDay_(d) {
  return d.toISOString().slice(0, 10);
}

function responseTime_(v) {
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function colLetter_(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function tierLabel_(counted, cfg) {
  if (counted >= cfg.kit) return 'Kit (' + cfg.kit + ')';
  if (counted >= cfg.bottle) return 'Bottle (' + cfg.bottle + ')';
  return '';
}

function headerIndex_(headers) {
  const out = {};
  headers.forEach((h, i) => {
    const key = normText_(h);
    if (key && out[key] === undefined) out[key] = i;
  });
  return out;
}

const STYLE = {
  navy: '#1f4e78',
  white: '#ffffff',
  lightBlue: '#eaf3f8',
  lightGray: '#f3f6f9',
  textGray: '#666666',
  lightRed: '#f4cccc',
  lightOrange: '#fce5cd',
  lightGreen: '#d9ead3'
};

function sameCell_(a, b) {
  if (a instanceof Date || b instanceof Date) {
    const ta = a instanceof Date ? a.getTime() : new Date(a).getTime();
    const tb = b instanceof Date ? b.getTime() : new Date(b).getTime();
    return !isNaN(ta) && !isNaN(tb) && ta === tb;
  }
  if (a == null) a = '';
  if (b == null) b = '';
  return a === b;
}

function sameRow_(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!sameCell_(a[i], b[i])) return false;
  }
  return true;
}

function sameMatrix_(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!sameRow_(a[i], b[i])) return false;
  }
  return true;
}

function setValuesIfChanged_(range, values) {
  if (!values.length || !values[0].length) return false;
  const current = range.getValues();
  if (sameMatrix_(current, values)) return false;
  range.setValues(values);
  return true;
}

function setFormulasIfChanged_(range, formulas) {
  if (!formulas.length || !formulas[0].length) return false;
  const current = range.getFormulas();
  if (sameMatrix_(current, formulas)) return false;
  range.setFormulas(formulas);
  return true;
}

// Writes only rows that changed, joining adjacent changed rows into one write.
function writeRowsIfChanged_(sh, startRow, startCol, rows) {
  if (!rows.length || !rows[0].length) return false;
  const width = rows[0].length;
  ensureGridSize_(sh, startRow + rows.length - 1, startCol + width - 1);
  const current = sh.getRange(startRow, startCol, rows.length, width).getValues();
  const changed = [];

  for (let i = 0; i < rows.length; i++) {
    if (!sameRow_(current[i], rows[i])) changed.push(i);
  }
  if (!changed.length) return false;

  let runStart = changed[0];
  let runEnd = changed[0];
  for (let i = 1; i <= changed.length; i++) {
    const next = changed[i];
    if (next !== runEnd + 1) {
      const block = rows.slice(runStart, runEnd + 1);
      sh.getRange(startRow + runStart, startCol, block.length, width).setValues(block);
      if (i < changed.length) runStart = next;
    }
    if (i < changed.length) runEnd = next;
  }
  return true;
}

function syncTable_(sh, headerRow, startCol, headers, rows) {
  const oldLastRow = sh.getLastRow();
  const headerRange = sh.getRange(headerRow, startCol, 1, headers.length);
  const headerChanged = setValuesIfChanged_(headerRange, [headers]);
  const bodyChanged = rows.length
    ? writeRowsIfChanged_(sh, headerRow + 1, startCol, rows)
    : false;
  let staleCleared = false;
  const lastNeeded = headerRow + rows.length;

  if (oldLastRow > lastNeeded) {
    sh.getRange(lastNeeded + 1, startCol, oldLastRow - lastNeeded, headers.length).clearContent();
    staleCleared = true;
  }

  return {
    changed: headerChanged || bodyChanged || staleCleared,
    headerChanged: headerChanged,
    bodyChanged: bodyChanged,
    staleCleared: staleCleared
  };
}

function styleHeaderRange_(range) {
  const backgrounds = range.getBackgrounds();
  const colors = range.getFontColors();
  let needsStyle = false;
  for (let r = 0; r < backgrounds.length; r++) {
    for (let c = 0; c < backgrounds[r].length; c++) {
      if (String(backgrounds[r][c]).toLowerCase() !== STYLE.navy ||
          String(colors[r][c]).toLowerCase() !== STYLE.white) {
        needsStyle = true;
        break;
      }
    }
    if (needsStyle) break;
  }
  if (needsStyle) {
    range.setBackground(STYLE.navy).setFontColor(STYLE.white).setFontWeight('bold');
  }
}

function setColumnWidthIfNeeded_(sh, col, width) {
  if (sh.getColumnWidth(col) !== width) sh.setColumnWidth(col, width);
}

function setRowHeightIfNeeded_(sh, row, height) {
  if (sh.getRowHeight(row) !== height) sh.setRowHeight(row, height);
}

function setRangeBackgroundIfNeeded_(range, color) {
  const values = range.getBackgrounds();
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      if (String(values[r][c]).toLowerCase() !== color.toLowerCase()) {
        range.setBackground(color);
        return true;
      }
    }
  }
  return false;
}

// Google Sheets "Tables" give typed columns (Date, Dropdown...) their own format and list, and a
// script may not change them. These helpers skip such cells instead of stopping the refresh.
function safeFormat_(range, format) {
  // Sheets batches writes: flush inside the guard so a typed-column format error
  // cannot escape later during an unrelated read and abort the refresh.
  try { range.setNumberFormat(format); SpreadsheetApp.flush(); return true; } catch (e) {
    if (/number format.*typed column/i.test(String(e && e.message || e))) return false;
    throw e;
  }
}

function safeValidation_(range, rule) {
  try { range.setDataValidation(rule); return true; } catch (e) { return false; }
}

function setNumberFormatIfNeeded_(range, format) {
  const formats = range.getNumberFormats();
  for (let r = 0; r < formats.length; r++) {
    for (let c = 0; c < formats[r].length; c++) {
      if (formats[r][c] !== format) {
        safeFormat_(range, format);
        return true;
      }
    }
  }
  return false;
}

function setFontColorIfNeeded_(range, color) {
  const colors = range.getFontColors();
  for (let r = 0; r < colors.length; r++) {
    for (let c = 0; c < colors[r].length; c++) {
      if (String(colors[r][c]).toLowerCase() !== color.toLowerCase()) {
        range.setFontColor(color);
        return true;
      }
    }
  }
  return false;
}

/* --------------------------------------------------------- profile parser */

/**
 * Looks for phrases such as "Badge title Earned Sep 14 2026" in the public
 * profile text. Public profile HTML can change, so verify results against
 * real profiles after Google Skills changes its page layout.
 * V2: also accepts "Member since Sep 2024" (month before the year) and
 * badge dates written day-first ("14 Sep 2026"), so small format changes
 * no longer mark every profile unreachable or silently count zero badges.
 */
function parseProfile_(rawText, curriculum, startDate, endDate) {
  const norm = normText_(rawText);
  const since = norm.match(/member since (?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+)?(\d{4})/);
  const pts = String(rawText).match(/([\d,]+)\s+points/i);

  const reAny = new RegExp('earned ' + MONTH_RE + ' (\\d{1,2}) (\\d{4})', 'g');
  let anyAll = 0;
  let anyInWindow = 0;
  const dayStamps = {};
  let m;

  while ((m = reAny.exec(norm))) {
    anyAll++;
    const month = MONTHS[m[1]];
    const d = new Date(Date.UTC(+m[3], month, +m[2]));
    if ((d >= startDate && (!endDate || d <= endDate))) { anyInWindow++; dayStamps[d.getTime()] = 1; }
  }

  // Day-first dates ("earned 14 sep 2026") describe different badges than
  // the month-first pattern above, so they cannot double-count the same one.
  const reAny2 = new RegExp('earned (\\d{1,2}) ' + MONTH_RE + ' (\\d{4})', 'g');
  while ((m = reAny2.exec(norm))) {
    anyAll++;
    const month = MONTHS[m[2]];
    const d = new Date(Date.UTC(+m[3], month, +m[1]));
    if ((d >= startDate && (!endDate || d <= endDate))) { anyInWindow++; dayStamps[d.getTime()] = 1; }
  }

  const perBadge = curriculum.map(b => {
    const names = [b.name, b.alt].filter(Boolean).map(normText_).filter(Boolean);

    for (let k = 0; k < names.length; k++) {
      const title = escapeRegExp_(names[k]);
      const badgeRe = new RegExp('(?:^|\\s)' + title + '\\s+earned\\s+' + MONTH_RE + ' (\\d{1,2}) (\\d{4})');
      const hit = norm.match(badgeRe);
      if (hit) {
        const d = new Date(Date.UTC(+hit[3], MONTHS[hit[1]], +hit[2]));
        return { date: d, inWindow: (d >= startDate && (!endDate || d <= endDate)) };
      }
      const badgeRe2 = new RegExp('(?:^|\\s)' + title + '\\s+earned\\s+(\\d{1,2})\\s+' + MONTH_RE + '\\s+(\\d{4})');
      const hit2 = norm.match(badgeRe2);
      if (hit2) {
        const d = new Date(Date.UTC(+hit2[3], MONTHS[hit2[2]], +hit2[1]));
        return { date: d, inWindow: (d >= startDate && (!endDate || d <= endDate)) };
      }
    }
    return null;
  });

  // Longest run of consecutive days on which at least one badge was earned (inside the program window).
  const days = Array.from(new Set(perBadge.filter(b => b && b.inWindow).map(b => b.date.getTime()))).sort((a, b) => a - b);
  let streak = 0, run = 0, prevDay = null;
  days.forEach(t => {
    run = (prevDay !== null && t - prevDay === 86400000) ? run + 1 : 1;
    if (run > streak) streak = run;
    prevDay = t;
  });

  return {
    activeDays: days.length,
    streak: streak,
    dates: days.map(t => isoDay_(new Date(t))),
    reachable: !!since,
    memberSince: since ? +since[1] : '',
    points: pts ? parseInt(pts[1].replace(/,/g, ''), 10) : 0,
    anyAll: anyAll,
    anyInWindow: anyInWindow,
    perBadge: perBadge
  };
}

function badgeCell_(hit) {
  if (!hit) return '';
  return (hit.inWindow ? '\u2713 ' : '\u26A0 before start ') + isoDay_(hit.date);
}

/* -------------------------------------------------------------- Config */

function ensureConfig_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEETS.CONF);
  if (!sh) {
    sh = ss.insertSheet(SHEETS.CONF);
    const rows = [
      ['Setting', 'Value', 'Note'],
      ['Program start date', new Date(Date.UTC(2026, 8, 14)), 'Badges earned before this date are not counted. Change if the program window differs.'],
      ['Registration deadline', new Date(Date.UTC(2026, 9, 28)), 'Form says 28 Oct (IST); partner email says 31 Oct. Confirm with the program team.'],
      ['Count only curriculum badges (TRUE/FALSE)', 'TRUE', 'TRUE = only listed curriculum badges count toward tiers. FALSE = any badge earned in the window counts.'],
      ['Bottle tier (badges)', 5, 'Water bottle reward'],
      ['Kit tier (badges)', 10, 'Developer kit + T-shirt reward'],
      ['Re-check each profile every (hours)', 5, 'Lower = fresher data, more requests to the platform.'],
      ['Organizer swag level 1 (students at bottle tier)', 50, ''],
      ['Organizer swag level 2 (students at bottle tier)', 100, ''],
      ['Organizer swag level 3 (students at bottle tier)', 250, '']
    ];
    sh.getRange(1, 1, rows.length, 3).setValues(rows);
    sh.getRange(12, 1, 1, 4).setValues([['Badge name (as shown on the profile)', 'Alt name (optional)', 'Credits', 'URL']]);
    sh.getRange(13, 1, DEFAULT_CURRICULUM.length, 4).setValues(DEFAULT_CURRICULUM);
  }

  ensureScoringConfig_(sh);
  styleConfig_(sh);
  return sh;
}

function styleConfig_(sh) {
  const needsCellStyle = String(sh.getRange('B2').getBackground()).toLowerCase() !== STYLE.lightBlue ||
    String(sh.getRange('A1').getBackground()).toLowerCase() !== STYLE.navy ||
    String(sh.getRange('A12').getBackground()).toLowerCase() !== STYLE.navy;
  styleHeaderRange_(sh.getRange('A1:C1'));
  styleHeaderRange_(sh.getRange('A12:D12'));
  setRangeBackgroundIfNeeded_(sh.getRange('B2:B10'), STYLE.lightBlue);
  const last = Math.max(13, sh.getLastRow());
  if (needsCellStyle && last >= 13) {
    sh.getRange(13, 1, last - 12, 4).setVerticalAlignment('middle').setWrap(true);
    setNumberFormatIfNeeded_(sh.getRange('B2:B3'), 'dd/mm/yyyy');
    if (sh.getFrozenRows() !== 1) sh.setFrozenRows(1);
  }
  setColumnWidthIfNeeded_(sh, 1, 380);
  setColumnWidthIfNeeded_(sh, 2, 220);
  setColumnWidthIfNeeded_(sh, 3, 110);
  setColumnWidthIfNeeded_(sh, 4, 340);
}

function toUtcDay_(d) {
  const x = d instanceof Date ? d : new Date(d);
  if (isNaN(x.getTime())) return new Date(NaN);
  return new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
}

function readConfig_() {
  const sh = ensureConfig_();
  ensurePointsCheckRow_(sh);
  const v = sh.getRange('B2:B10').getValues().map(r => r[0]);
  const pointsRaw = sh.getRange('B11').getValue();
  const last = Math.max(sh.getLastRow(), 13);
  const cur = sh.getRange(13, 1, last - 12, 4).getValues()
    .filter(r => String(r[0] || '').trim());

  return {
    start: toUtcDay_(v[0]),
    deadline: v[1] instanceof Date ? v[1] : new Date(v[1]),
    onlyCurr: String(v[2]).trim().toUpperCase() !== 'FALSE',
    bottle: +v[3] || 5,
    kit: +v[4] || 10,
    recheckH: +v[5] || 5,
    pointsUntil: pointsRaw === '' ? null : toUtcDay_(pointsRaw),
    score: readScoring_(sh),
    curriculum: cur.map(r => ({
      name: String(r[0]).trim(),
      alt: String(r[1] || '').trim(),
      credits: r[2],
      url: r[3]
    }))
  };
}

/* --------------------------------------------------------- form responses */

function readResponses_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.RESP);
  if (!sh) throw new Error('Sheet "' + SHEETS.RESP + '" not found. Check the sheet name at the top of the script.');

  const vals = sh.getDataRange().getValues();
  if (!vals.length || !vals[0].length) {
    throw new Error('Form Responses 1 is empty or has no header row. No organizer data was changed.');
  }

  const h = vals[0].map(String);
  const col = (re, fallback) => {
    const i = h.findIndex(x => re.test(x));
    return i >= 0 ? i : fallback;
  };

  const iEmail = col(/^email/i, 1);
  const iName = col(/full name/i, 2);
  const iRoll = col(/roll number/i, 3);
  const iConf = col(/confirm your email/i, 6);
  const iUrl = col(/public profile url/i, 7);

  return vals.slice(1).filter(r => r[0] !== '' && r[0] != null).map(r => {
    const ts = r[0];
    const email = String(r[iEmail] || '').trim();
    return {
      key: (ts instanceof Date ? ts.toISOString() : String(ts)) + '|' + email.toLowerCase(),
      ts: ts,
      name: String(r[iName] || '').replace(/\s+/g, ' ').trim(),
      rollRaw: r[iRoll],
      email: email,
      confirmEmail: String(r[iConf] || '').trim(),
      url: String(r[iUrl] || '').trim()
    };
  });
}

/* --------------------------------------------------------------- Tracker */

function readTracker_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.TRACK);
  if (!sh || sh.getLastRow() < 1 || sh.getLastColumn() < 1) {
    return { map: {}, headers: [], rows: [] };
  }

  const vals = sh.getDataRange().getValues();
  const headers = vals[0].map(String);
  const map = {};
  const rows = [];

  vals.slice(1).forEach(r => {
    if (r[0]) {
      map[String(r[0])] = r;
      rows.push(r);
    }
  });

  return { map: map, headers: headers, rows: rows };
}

// Two columns added at the END of Tracker (after the badge columns), so nothing existing moves.
const EXTRA = ['Badge days active (in window)', 'Longest badge streak (days)', 'Badge dates (in window)', 'Starting points', 'Last successful check'];
// Badge dates are kept as plain text such as "2026-09-14, 2026-09-15". A cell that Sheets turned into a real date
// (it can do this to a single day) is converted back to the same text.
function datesText_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  return v === undefined || v === null ? '' : String(v);
}
function oldExtra_(prev, headerMap, name) {
  const i = headerMap[normText_(name)];
  const v = (i === undefined || !prev) ? '' : prev[i];
  return (v === undefined || v === null) ? '' : v;
}

// Name as a sorted set of words, so "Sri Mahesh Pagadala" and "Pagadala Sri Mahesh" match.
function nameSetKey_(n) {
  return normText_(n).split(' ').filter(Boolean).sort().join(' ');
}

function buildModel_(resp, cfg) {
  const oldData = readTracker_();
  const old = oldData.map;
  const oldHeaderMap = headerIndex_(oldData.headers);
  const oldBadgeCols = {};
  const n = cfg.curriculum.length;
  const activeOld = oldData.rows.filter(r => String(r[I.STATUS] || '') !== DUP);
  const byPid = {};
  const byRoll = {};
  const byEmail = {};

  function addIndex(map, key, row) {
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(row);
  }

  activeOld.forEach(r => {
    addIndex(byPid, String(r[I.PID] || ''), r);
    addIndex(byRoll, normRoll_(r[I.ROLL]), r);
    addIndex(byEmail, String(r[I.EMAIL] || '').trim().toLowerCase(), r);
  });

  const reservedHeaders = {};
  FIXED.concat(MANUAL).forEach(h => { reservedHeaders[normText_(h)] = true; });
  oldData.headers.forEach((h, i) => {
    const key = normText_(h);
    if (i >= FIXED.length && key && !reservedHeaders[key]) oldBadgeCols[key] = i;
  });

  function newest(rows) {
    if (!rows || !rows.length) return null;
    return rows.slice().sort((a, b) => responseTime_(b[I.TS]) - responseTime_(a[I.TS]))[0];
  }

  function oldRowFor(r) {
    if (old[r.key]) return old[r.key];
    const samePid = r.id && byPid[r.id] ? newest(byPid[r.id]) : null;
    if (samePid) return samePid;
    const rollRows = r.roll ? byRoll[r.roll] : null;
    if (rollRows && rollRows.length === 1) return rollRows[0];
    const email = String(r.email || '').trim().toLowerCase();
    const emailRows = email ? byEmail[email] : null;
    if (emailRows && emailRows.length === 1) return emailRows[0];
    return [];
  }

  const latestById = {};
  const latestIdByRoll = {};
  const latestByEmail = {};
  const latestByRollName = {};
  const latestByRollNameLink = {};   // latest submission WITH a profile link, by roll + name (words in any order)

  function saveLatest(map, key, index, timestamp) {
    if (!key) return;
    const oldValue = map[key];
    if (!oldValue || timestamp > oldValue.time ||
        (timestamp === oldValue.time && index > oldValue.index)) {
      map[key] = { index: index, time: timestamp };
    }
  }

  resp.forEach((r, i) => {
    r.id = extractProfileId_(r.url);
    r.roll = normRoll_(r.rollRaw);
    const submitted = responseTime_(r.ts);

    const emailKey = String(r.email || '').trim().toLowerCase();
    if (emailLooksValid_(emailKey)) saveLatest(latestByEmail, emailKey, i, submitted);
    // V2: name words in any order, so a reordered name no longer leaves two
    // active records for the same person (this already matched Follow-up dedup).
    if (rollLooksValid_(r.roll) && nameSetKey_(r.name)) saveLatest(latestByRollName, r.roll + '|' + nameSetKey_(r.name), i, submitted);

    if (r.id && rollLooksValid_(r.roll) && nameSetKey_(r.name)) {
      saveLatest(latestByRollNameLink, r.roll + '|' + nameSetKey_(r.name), i, submitted);
    }

    if (r.id) {
      saveLatest(latestById, r.id, i, submitted);
      if (r.roll) saveLatest(latestIdByRoll, r.roll, i, submitted);
    }
  });

  const model = resp.map((r, i) => {
    const submitted = responseTime_(r.ts);
    const latestLink = r.roll ? latestIdByRoll[r.roll] : null;
    let status;

    let supersededBy = -1;
    if (r.id) {
      status = latestById[r.id].index !== i ? DUP : PENDING;
      if (status === DUP) supersededBy = latestById[r.id].index;
      else {
        // Same student, same roll number and name, but a later submission with a DIFFERENT profile link
        // (for example a new account): the later submission replaces this one.
        const same = rollLooksValid_(r.roll) && nameSetKey_(r.name)
          ? latestByRollNameLink[r.roll + '|' + nameSetKey_(r.name)] : null;
        if (same && same.index !== i && (same.time > submitted || (same.time === submitted && same.index > i))) {
          status = DUP;
          supersededBy = same.index;
        }
      }
    } else if (latestLink &&
      (latestLink.time > submitted || (latestLink.time === submitted && latestLink.index > i))) {
      status = DUP;
      supersededBy = latestLink.index;
    } else {
      // V2: the later-submission check is computed once, not twice.
      const laterIdx = supersededByLaterSubmission_(r, i, latestByEmail, latestByRollName);
      if (laterIdx >= 0) {
        // No usable link in this row, and the same person submitted again later (even if that
        // one is also wrong): keep only the latest submission.
        status = DUP;
        supersededBy = laterIdx;
      } else if (!r.url) {
        status = 'No profile URL';
      } else {
        status = /my_account/i.test(r.url)
          ? 'Invalid URL (account page, not public)'
          : 'Invalid URL';
      }
    }

    const prev = oldRowFor(r);
    const samePid = !!(prev && prev[I.PID] === r.id && r.id);

    if (status === PENDING && samePid && prev[I.STATUS] &&
        prev[I.STATUS] !== PENDING && prev[I.STATUS] !== DUP && prev[I.STATUS] !== EXCLUDED) {
      status = prev[I.STATUS];
    }

    const cells = [];
    for (let k = 0; k < n; k++) {
      const badgeKey = normText_(cfg.curriculum[k].name);
      const oldCol = oldBadgeCols[badgeKey];
      cells.push(samePid && oldCol !== undefined ? (prev[oldCol] || '') : '');
    }

    const manual = MANUAL.map((name, iManual) => {
      const index = oldHeaderMap[normText_(name)];
      if (prev && index !== undefined) return prev[index] || '';
      // Preserve the original three manual columns from an older Tracker.
      if (prev && iManual < 3) return prev[FIXED.length + iManual] || '';
      return '';
    });

    if (status !== DUP && manual[M.FOLLOW_STATUS] === EXCLUDED) status = EXCLUDED;   // out of the event: no profile check, no scoring

    return {
      key: r.key,
      ts: r.ts,
      name: r.name,
      roll: r.roll,
      email: r.email,
      confirmEmail: r.confirmEmail,
      url: r.url,
      pid: r.id,
      status: status,
      since: samePid ? prev[I.SINCE] : '',
      points: samePid ? prev[I.POINTS] : '',
      started: samePid ? prev[I.STARTED] : '',
      any: samePid ? prev[I.ANY] : '',
      active: samePid ? oldExtra_(prev, oldHeaderMap, EXTRA[0]) : '',
      streak: samePid ? oldExtra_(prev, oldHeaderMap, EXTRA[1]) : '',
      dates: samePid ? datesText_(oldExtra_(prev, oldHeaderMap, EXTRA[2])) : '',
      baseline: samePid ? oldExtra_(prev, oldHeaderMap, EXTRA[3]) : '',
      lastGood: samePid ? (oldExtra_(prev, oldHeaderMap, 'Last successful check') || (prev[I.STATUS] === 'OK' ? prev[I.CHECKED] : '')) : '',
      checked: samePid ? prev[I.CHECKED] : '',
      manual: manual,
      cells: cells,
      counted: 0,
      tier: '',
      flags: '',
      supersededBy: supersededBy
    };
  });

  const rollCount = {};
  const emailCount = {};

  model.forEach(m => {
    if (m.status === DUP || m.status === EXCLUDED) return;
    if (m.roll) rollCount[m.roll] = (rollCount[m.roll] || 0) + 1;
    const email = String(m.email || '').trim().toLowerCase();
    if (email) emailCount[email] = (emailCount[email] || 0) + 1;
  });

  model.forEach(m => {
    const f = [];
    const email = String(m.email || '').trim().toLowerCase();

    if (!rollLooksValid_(m.roll)) f.push('Roll format?');
    else if (rollCount[m.roll] > 1 && m.status !== DUP) f.push('Roll used twice');

    if (!emailLooksValid_(m.email) || !emailLooksValid_(m.confirmEmail)) f.push('Email typo?');
    if (emailLooksValid_(m.email) && emailCount[email] > 1 && m.status !== DUP) f.push('Email used twice');

    m.staticFlags = f;
  });

  return model;
}

// Returns the index of a later submission by the same person (same email, or same roll AND name
// with words in any order), or -1 when there is none. "Later" means a newer timestamp (ties: lower row first).
function supersededByLaterSubmission_(r, i, latestByEmail, latestByRollName) {
  const email = String(r.email || '').trim().toLowerCase();
  const t = responseTime_(r.ts);
  const picks = [];
  if (emailLooksValid_(email) && latestByEmail[email]) picks.push(latestByEmail[email]);
  const rn = r.roll + '|' + nameSetKey_(r.name);
  if (rollLooksValid_(r.roll) && nameSetKey_(r.name) && latestByRollName[rn]) picks.push(latestByRollName[rn]);
  let best = null;
  picks.forEach(p => {
    const later = p.index !== i && (p.time > t || (p.time === t && p.index > i));
    if (later && (!best || p.time > best.time || (p.time === best.time && p.index > best.index))) best = p;
  });
  return best ? best.index : -1;
}

function checkProfiles_(model, cfg, retryFailures) {
  const startTime = Date.now();
  const staleMs = cfg.recheckH * 3600 * 1000;
  const age = m => (m.checked ? responseTime_(m.checked) : 0);

  const todo = model.filter(m => {
    if (!m.pid || m.status === DUP || m.status === EXCLUDED) return false;
    const isFailed = String(m.status).indexOf('Unreachable') === 0;
    return !m.checked || Date.now() - age(m) > staleMs || m.status === PENDING || (retryFailures && isFailed) ||
      (m.status === 'OK' && m.active === '');       // one-time: fill in the new streak columns
  }).sort((a, b) => age(a) - age(b));

  let attempted = 0;

  for (let i = 0; i < todo.length; i += 20) {
    if (Date.now() - startTime > 270000) break;

    const batch = todo.slice(i, i + 20);
    const requests = batch.map(m => ({
      url: 'https://www.skills.google/public_profiles/' + m.pid,
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'Accept-Language': 'en' }
    }));

    let responses;
    try {
      responses = UrlFetchApp.fetchAll(requests);
    } catch (e) {
      // V2: a transient fetch failure must not poison the whole batch with
      // "Unreachable (fetch error)". Leave these profiles untouched so the
      // next refresh retries them; they stay in `remaining`, so this run
      // honestly reports PARTIAL instead of COMPLETE WITH ERRORS.
      continue;
    }

    attempted += batch.length;

    responses.forEach((res, k) => {
      try {
        applyResult_(batch[k], res, cfg);
      } catch (e) {
        batch[k].checked = new Date();
        batch[k].status = 'Unreachable (parse error)';
      }
    });

    Utilities.sleep(700);
  }

  return {
    planned: todo.length,
    attempted: attempted,
    remaining: Math.max(0, todo.length - attempted)
  };
}

function applyResult_(m, res, cfg) {
  m.checked = new Date();
  const code = res.getResponseCode();

  if (code !== 200) {
    m.status = 'Unreachable (HTTP ' + code + ')';
    return;
  }

  const profile = parseProfile_(htmlToText_(res.getContentText()), cfg.curriculum, cfg.start, cfg.score.end);
  if (!profile.reachable) {
    m.status = 'Unreachable (private or empty)';
    return;
  }

  if ((m.cells || []).some(c => String(c).indexOf('✓') === 0) && !profile.perBadge.some(b => b && b.inWindow)) {
    m.status = 'Unreachable (badge data needs review)';
    return;
  }
  m.status = 'OK';
  m.lastGood = m.checked;
  m.since = profile.memberSince;
  m.points = profile.points;
  m.any = profile.anyInWindow;
  m.active = profile.activeDays;
  m.streak = profile.streak;
  m.dates = profile.dates.join(', ');
  m.started = (profile.points > 0 || profile.anyAll > 0) ? 'Yes' : 'No';
  m.cells = profile.perBadge.map(badgeCell_);
}

function finalize_(model, cfg) {
  model.forEach(m => {
    const currentCount = m.cells.filter(c => String(c).indexOf('\u2713') === 0).length;
    m.counted = cfg.onlyCurr ? currentCount : (+m.any || 0);
    m.tier = m.status === 'OK' ? tierLabel_(m.counted, cfg) : '';

    const f = (m.staticFlags || []).slice();
    if (m.since !== '' && +m.since < 2026) f.push('Old account (member since ' + m.since + ')');
    // Time-limited check: a 2026 account that already has points but no badge inside the
    // program window got those points before the program, so it may be older than it looks.
    // Active only until the date in Config!B11 (default 25 Oct 2026); after that, students
    // legitimately earn points/credits and the flag switches itself off on the next refresh.
    if (pointsCheckActive_(cfg) && m.status === 'OK' && m.since !== '' && +m.since >= 2026 &&
        (+m.points || 0) > 0 && !(+m.any > 0)) {
      f.push('Points before program? (' + m.points + ' pts, no badge in window) - verify account age');
    }
    m.flags = f.join('; ');
  });

  // A newer submission that replaced an earlier one with a problem (bad link, roll or email typo)
  // is marked as "fixed". The follow-up list shows it as Low priority, so it is easy to check.
  model.forEach(m => {
    if (m.status !== DUP || m.supersededBy === undefined || m.supersededBy < 0) return;
    if (model[m.supersededBy]) model[m.supersededBy].replaced = (model[m.supersededBy].replaced || 0) + 1;
    const winner = model[m.supersededBy];
    const hadProblem = !m.pid || (m.staticFlags || []).length > 0 ||
      !!(winner && winner.pid && winner.pid !== m.pid);   // the student replaced it with a different profile
    if (hadProblem && model[m.supersededBy]) model[m.supersededBy].fixed = true;
  });
}

function pointsCheckActive_(cfg) {
  if (!(cfg.pointsUntil instanceof Date) || isNaN(cfg.pointsUntil.getTime())) return false;
  return toUtcDay_(new Date()).getTime() <= cfg.pointsUntil.getTime();
}

// Config row 11 holds the last day of the points check. Added once if it is missing.
function ensurePointsCheckRow_(sh) {
  if (String(sh.getRange('A11').getValue() || '').trim() !== '') return;
  sh.getRange('A11:C11').setValues([[
    'Points check active until (inclusive)', new Date(Date.UTC(2026, 9, 25)),
    'Flags 2026 accounts that already have points. Stops after this date, because students then earn points/credits legitimately. Clear the date to switch the check off.'
  ]]);
  safeFormat_(sh.getRange('B11'), 'dd/mm/yyyy');
  sh.getRange('B11').setBackground(STYLE.lightBlue);
}

function ensureGridSize_(sh, rows, cols) {
  if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
}

function writeTracker_(model, cfg) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.TRACK) || ss.insertSheet(SHEETS.TRACK);
  const header = FIXED.concat(MANUAL, cfg.curriculum.map(b => b.name), EXTRA);
  const rows = model.map(m => [
    m.key, m.ts, m.name, m.roll, m.email, m.pid, m.status, m.flags,
    m.since, m.points, m.started, m.any, m.counted, m.tier, m.checked
  ].concat(m.manual, m.cells, [m.active === undefined ? '' : m.active, m.streak === undefined ? '' : m.streak, m.dates === undefined ? '' : m.dates, m.baseline === undefined ? '' : m.baseline, m.lastGood || '']));
  const output = [header].concat(rows);
  const oldLastRow = sh.getLastRow();
  const oldLastCol = sh.getLastColumn();
  const oldHeader = oldLastRow ? sh.getRange(1, 1, 1, Math.max(oldLastCol, header.length)).getValues()[0] : [];
  const headerChanged = !sameRow_(oldHeader.slice(0, header.length), header) || oldHeader.length < header.length;
  const rowCountChanged = oldLastRow !== output.length;

  ensureGridSize_(sh, output.length, header.length);
  if (headerChanged) sh.getRange(1, 1, 1, header.length).setValues([header]);
  // The badge-dates column is plain text, so Sheets cannot turn "2026-09-14" into a date. Set before writing.
  if (rows.length) setNumberFormatIfNeeded_(sh.getRange(2, header.length - EXTRA.length + 3, rows.length, 1), '@');
  const rowsChanged = rows.length ? writeRowsIfChanged_(sh, 2, 1, rows) : false;

  if (oldLastRow > output.length) {
    sh.getRange(output.length + 1, 1, oldLastRow - output.length, Math.max(oldLastCol, header.length)).clearContent();
  }
  if (oldLastCol > header.length) {
    sh.getRange(1, header.length + 1, Math.max(oldLastRow, output.length), oldLastCol - header.length).clearContent();
  }

  // Apply the visual layout once, then only extend it when new rows arrive.
  const firstManualCol = FIXED.length + 1;
  const styleNeeded = headerChanged || String(sh.getRange(1, 1).getBackground()).toLowerCase() !== STYLE.navy || (rows.length > 0 && String(sh.getRange(2, firstManualCol).getBackground()).toLowerCase() !== STYLE.lightBlue);
  if (styleNeeded) {
    styleHeaderRange_(sh.getRange(1, 1, 1, header.length));
    if (rows.length) {
      sh.getRange(2, firstManualCol, rows.length, MANUAL.length).setBackground(STYLE.lightBlue);
      sh.getRange(2, 1, rows.length, header.length).setVerticalAlignment('middle');
    }
  } else if (rows.length > Math.max(0, oldLastRow - 1)) {
    const newStart = Math.max(2, oldLastRow + 1);
    const newCount = output.length - newStart + 1;
    if (newCount > 0) sh.getRange(newStart, firstManualCol, newCount, MANUAL.length).setBackground(STYLE.lightBlue);
  }

  if (sh.getFrozenRows() !== 1) sh.setFrozenRows(1);
  if (sh.getFrozenColumns() !== 3) sh.setFrozenColumns(3);
  if (!sh.isColumnHiddenByUser(1)) sh.hideColumns(1);

  const widths = [
    [2, 150], [3, 170], [4, 115], [5, 220], [6, 155], [7, 205], [8, 270],
    [9, 100], [10, 90], [11, 85], [12, 145], [13, 115], [14, 125], [15, 150]
  ];
  widths.forEach(item => setColumnWidthIfNeeded_(sh, item[0], item[1]));
  for (let c = FIXED.length + MANUAL.length + 1; c <= header.length; c++) {
    setColumnWidthIfNeeded_(sh, c, 205);
  }

  if (rows.length && (headerChanged || output.length > oldLastRow)) {
    const formatStart = headerChanged ? 2 : oldLastRow + 1;
    const formatCount = headerChanged ? rows.length : output.length - oldLastRow;
    if (formatCount > 0) {
      setNumberFormatIfNeeded_(sh.getRange(formatStart, I.TS + 1, formatCount, 1), 'dd/mm/yyyy hh:mm');
      setNumberFormatIfNeeded_(sh.getRange(formatStart, I.CHECKED + 1, formatCount, 1), 'dd/mm/yyyy hh:mm');
      setNumberFormatIfNeeded_(sh.getRange(formatStart, FIXED.length + M.COLLECTION_DATE + 1, formatCount, 1), 'dd/mm/yyyy');
      setNumberFormatIfNeeded_(sh.getRange(formatStart, FIXED.length + M.LAST_FOLLOW + 1, formatCount, 1), 'dd/mm/yyyy');
      applyTrackerValidation_(sh, formatCount, formatStart);
    }
  }

  ensureTrackerConditionalFormatting_(sh);

  if (!sh.getFilter() && output.length > 1) {
    sh.getRange(1, 1, output.length, header.length).createFilter();
  } else if (sh.getFilter() && (rowCountChanged || headerChanged)) {
    sh.getFilter().remove();
    sh.getRange(1, 1, Math.max(1, output.length), header.length).createFilter();
  }
}

function ensureTrackerConditionalFormatting_(sh) {
  // Keep any organizer-created conditional formatting rules. Add defaults only once.
  if (sh.getConditionalFormatRules().length) return;
  const statusRange = sh.getRange(2, I.STATUS + 1, sh.getMaxRows() - 1, 1);
  const tierRange = sh.getRange(2, I.TIER + 1, sh.getMaxRows() - 1, 1);
  const rules = [
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('OK')
      .setBackground(STYLE.lightGreen).setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains('Unreachable')
      .setBackground(STYLE.lightRed).setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains('Invalid URL')
      .setBackground(STYLE.lightRed).setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('No profile URL')
      .setBackground(STYLE.lightRed).setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(PENDING)
      .setBackground(STYLE.lightOrange).setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(DUP)
      .setBackground('#e6e6e6').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains('Kit')
      .setBackground(STYLE.lightGreen).setRanges([tierRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains('Bottle')
      .setBackground(STYLE.lightBlue).setRanges([tierRange]).build()
  ];
  sh.setConditionalFormatRules(rules);
}

function applyTrackerValidation_(sh, rowCount, startRow) {
  if (!rowCount) return;
  startRow = startRow || 2;
  const yesNo = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Yes', 'No'], true).setAllowInvalid(false).build();
  const yesNoNA = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Yes', 'No', 'N/A'], true).setAllowInvalid(false).build();
  const approval = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending', 'Yes', 'No'], true).setAllowInvalid(false).build();
  const followStatus = SpreadsheetApp.newDataValidation()
    .requireValueInList(FOLLOW_STATUSES, true)
    .setAllowInvalid(false).build();

  safeValidation_(sh.getRange(startRow, FIXED.length + M.CREDITS + 1, rowCount, 1), yesNoNA);
  safeValidation_(sh.getRange(startRow, FIXED.length + M.APPROVED + 1, rowCount, 1), approval);
  safeValidation_(sh.getRange(startRow, FIXED.length + M.COLLECTED + 1, rowCount, 1), yesNo);
  safeValidation_(sh.getRange(startRow, FIXED.length + M.FOLLOW_STATUS + 1, rowCount, 1), followStatus);
}

/* ------------------------------------------------------------- Dashboard */

function buildDashboard_(cfg, model, refreshStatus, checkSummary) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.DASH) || ss.insertSheet(SHEETS.DASH, 0);
  const T = col => 'Tracker!$' + col + '$2:$' + col;
  const status = T('G');
  const kpis = [
    ['Form submissions', '=COUNTA(' + T('B') + ')', 'All response rows represented in Tracker'],
    ['Non-duplicate records', '=COUNTIFS(' + T('B') + ',"<>",' + status + ',"<>' + DUP + '",' + status + ',"<>' + EXCLUDED + '")', 'Superseded and Not eligible records are excluded'],
    ['Profile verified', '=COUNTIF(' + status + ',"OK")', 'Public profile opened and parsed'],
    ['Missing / invalid profile link', '=COUNTIF(' + status + ',"Invalid URL*")+COUNTIF(' + status + ',"No profile URL")', 'Ask the student to correct the link'],
    ['Profile unreachable', '=COUNTIF(' + status + ',"Unreachable*")', 'May need retry or manual check'],
    ['Waiting for first check', '=COUNTIF(' + status + ',"' + PENDING + '")', 'Includes profiles not yet reached'],
    ['Started (any activity)', '=COUNTIFS(' + T('K') + ',"Yes",' + status + ',"OK")', 'Points or any earned badge detected'],
    ['1+ counted badge', '=COUNTIFS(' + T('M') + ',">=1",' + status + ',"OK")', 'Based on current counting mode'],
    ['Bottle tier reached', '=COUNTIFS(' + T('M') + ',">="&Config!$B$5,' + status + ',"OK")', 'Verified records only'],
    ['Kit tier reached', '=COUNTIFS(' + T('M') + ',">="&Config!$B$6,' + status + ',"OK")', 'Verified records only'],
    ['Accounts from before 2026', '=COUNTIF(' + T('H') + ',"*Old account*")', 'Warning only; not automatic disqualification'],
    ['Days to registration deadline', '=Config!$B$3-TODAY()', 'Confirm the deadline in Config'],
    ['Needs attention (High + Medium priority)', '=COUNTIF(\'Follow-up\'!$A$2:$A,"High")+COUNTIF(\'Follow-up\'!$A$2:$A,"Medium")', 'Students in Follow-up with a wrong link or registration problem (latest submission only)'],
    ['Low priority (ready to go)', '=COUNTIF(\'Follow-up\'!$A$2:$A,"Low")', 'Verified students with no problem (includes those not started yet)']
  ];

  setValuesIfChanged_(sh.getRange('A1'), [['Google Cloud Learn with Communities - Organizer Dashboard']]);
  // This timestamp intentionally changes on each successful refresh.
  sh.getRange('A2').setValue('Last refreshed ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'd MMM yyyy, HH:mm'));

  const statusText = refreshStatus === 'PARTIAL'
    ? 'PARTIAL - ' + checkSummary.remaining + ' profile check(s) not attempted; ' + model.filter(m => m.status === PENDING).length + ' still pending'
    : refreshStatus === 'COMPLETE WITH ERRORS'
      ? 'COMPLETE WITH ERRORS - see Follow-up and Refresh Log'
      : 'COMPLETE';
  setValuesIfChanged_(sh.getRange('A3:B3'), [['Refresh status', statusText]]);
  let statusColor = STYLE.lightGreen;
  if (refreshStatus === 'PARTIAL') statusColor = STYLE.lightOrange;
  if (refreshStatus === 'COMPLETE WITH ERRORS') statusColor = STYLE.lightRed;
  setRangeBackgroundIfNeeded_(sh.getRange('A3:B3'), statusColor);
  if (sh.getRange('A3').getFontWeight() !== 'bold') sh.getRange('A3').setFontWeight('bold');

  styleHeaderRange_(sh.getRange('A4:C4'));
  setValuesIfChanged_(sh.getRange('A5:A18'), kpis.map(k => [k[0]]));
  setFormulasIfChanged_(sh.getRange('B5:B18'), kpis.map(k => [k[1]]));
  setValuesIfChanged_(sh.getRange('C5:C18'), kpis.map(k => [k[2]]));

  setValuesIfChanged_(sh.getRange('F4:G4'), [['Stage', 'Records']]);
  styleHeaderRange_(sh.getRange('F4:G4'));
  setValuesIfChanged_(sh.getRange('F5:F10'), [
    ['Non-duplicate records'], ['Profile verified'], ['Started'],
    ['1+ counted badge'], ['Bottle tier'], ['Kit tier']
  ]);
  setFormulasIfChanged_(sh.getRange('G5:G10'), [['=B6'], ['=B7'], ['=B11'], ['=B12'], ['=B13'], ['=B14']]);

  setValuesIfChanged_(sh.getRange('A19:D19'), [['Organizer swag milestone', 'Target', 'Students at bottle tier', 'Progress']]);
  styleHeaderRange_(sh.getRange('A19:D19'));
  setValuesIfChanged_(sh.getRange('A20:A22'), [['Level 1'], ['Level 2'], ['Level 3']]);
  setFormulasIfChanged_(sh.getRange('B20:D22'), [
    ['=Config!$B$8', '=$B$13', '=IFERROR(MIN(1,C20/B20),0)'],
    ['=Config!$B$9', '=$B$13', '=IFERROR(MIN(1,C21/B21),0)'],
    ['=Config!$B$10', '=$B$13', '=IFERROR(MIN(1,C22/B22),0)']
  ]);
  setNumberFormatIfNeeded_(sh.getRange('D20:D22'), '0%');

  // Students whose latest submission replaced one or more earlier submissions.
  const resubmitted = model.filter(m => m.status !== DUP && m.replaced > 0).length;
  setValuesIfChanged_(sh.getRange('F12:G12'), [['Students who resubmitted the form', resubmitted]]);
  if (sh.getRange('F12').getFontWeight() !== 'bold') sh.getRange('F12:G12').setFontWeight('bold');
  setRangeBackgroundIfNeeded_(sh.getRange('G12'), STYLE.lightBlue);
  // V2: the redemption block (and the snapshot below it) start on the first
  // free row after the batch-year table, so a new batch year can never
  // overwrite them. Nothing above this line moved, so existing KPI
  // references (B6, B7, B11-B14, B17) stay valid.
  const redemptionStart = buildBatchYearTable_(sh, model);
  const redemptionNoteRow = buildRedemptionBlock_(sh, redemptionStart);
  buildLeadSnapshot_(sh, redemptionNoteRow + 2);

  const badgeCount = cfg.curriculum.length;
  setValuesIfChanged_(sh.getRange('A25:D25'), [['Badge', 'Credits', 'Students completed', '% of verified']]);
  styleHeaderRange_(sh.getRange('A25:D25'));
  const badgeFormulas = [];
  for (let i = 0; i < badgeCount; i++) {
    const row = 26 + i;
    const letter = colLetter_(FIRST_BADGE_COL + i);
    badgeFormulas.push([
      '=Config!$A$' + (13 + i),
      '=Config!$C$' + (13 + i),
      '=COUNTIFS(Tracker!$' + letter + '$2:$' + letter + ',"✓*",' + status + ',"OK")',
      '=IFERROR(C' + row + '/$B$7,0)'
    ]);
  }
  const oldBadgeEnd = sh.getRange('A25').getNextDataCell(SpreadsheetApp.Direction.DOWN).getRow();
  const oldBadgeRows = Math.max(0, oldBadgeEnd - 25);
  if (badgeCount) setFormulasIfChanged_(sh.getRange(26, 1, badgeCount, 4), badgeFormulas);
  if (oldBadgeRows > badgeCount) {
    sh.getRange(26 + badgeCount, 1, oldBadgeRows - badgeCount, 4).clearContent();
  }
  if (badgeCount) setNumberFormatIfNeeded_(sh.getRange(26, 4, badgeCount, 1), '0%');

  const stamps = model.map(m => m.ts instanceof Date ? m.ts : new Date(m.ts)).filter(d => !isNaN(d));
  const days = [];
  if (stamps.length) {
    const first = new Date(Math.min.apply(null, stamps));
    first.setHours(0, 0, 0, 0);
    const lastDay = new Date(Math.max(Math.max.apply(null, stamps), Date.now()));
    lastDay.setHours(0, 0, 0, 0);
    for (let d = new Date(first); d <= lastDay; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  }
  setValuesIfChanged_(sh.getRange('T4:U4'), [['Date', 'Registrations']]);
  styleHeaderRange_(sh.getRange('T4:U4'));
  const lastDailyCell = sh.getRange('T4').getNextDataCell(SpreadsheetApp.Direction.DOWN);
  const oldDayCount = Math.max(0, lastDailyCell.getRow() - 4);
  if (days.length) {
    setValuesIfChanged_(sh.getRange(5, 20, days.length, 1), days.map(d => [d]));
    setFormulasIfChanged_(sh.getRange(5, 21, days.length, 1), days.map((d, i) => [
      '=COUNTIFS(' + T('B') + ',">="&T' + (5 + i) + ',' + T('B') + ',"<"&T' + (5 + i) + '+1)'
    ]));
    setNumberFormatIfNeeded_(sh.getRange(5, 20, days.length, 1), 'dd/mm');
  }
  if (oldDayCount > days.length) {
    sh.getRange(5 + days.length, 20, oldDayCount - days.length, 2).clearContent();
  }

  // Apply the dashboard visual theme only if it has not already been applied.
  if (String(sh.getRange('A1').getBackground()).toLowerCase() !== STYLE.navy) {
    sh.getRange('A1:U1').setBackground(STYLE.navy).setFontColor(STYLE.white).setFontWeight('bold');
    sh.getRange('A1').setFontSize(16);
    sh.getRange('B5:B18').setBackground(STYLE.lightBlue).setFontWeight('bold');
    sh.getRange('A5:C18').setVerticalAlignment('middle').setWrap(true);
    sh.getRange('A19:D22').setVerticalAlignment('middle');
    sh.getRange('A25:D' + Math.max(25, 25 + badgeCount)).setVerticalAlignment('middle').setWrap(true);
    setRowHeightIfNeeded_(sh, 1, 32);
  }
  setFontColorIfNeeded_(sh.getRange('C5:C18'), STYLE.textGray);
  setRangeBackgroundIfNeeded_(sh.getRange('B17:B18'), STYLE.lightBlue);
  if (sh.getRange('B17').getFontWeight() !== 'bold') sh.getRange('B17:B18').setFontWeight('bold');
  sh.getRange('A17:C18').setVerticalAlignment('middle').setWrap(true);
  setColumnWidthIfNeeded_(sh, 1, 300);
  setColumnWidthIfNeeded_(sh, 2, 110);
  setColumnWidthIfNeeded_(sh, 3, 260);
  setColumnWidthIfNeeded_(sh, 4, 125);
  setColumnWidthIfNeeded_(sh, 6, 190);
  setColumnWidthIfNeeded_(sh, 7, 100);
  setColumnWidthIfNeeded_(sh, 20, 110);
  setColumnWidthIfNeeded_(sh, 21, 120);

  ensureDashboardCharts_(sh, badgeCount, days.length);
}

function ensureDashboardCharts_(sh, badgeCount, dayCount) {
  const expected = [{ ranges: ['F4:G10'], type: Charts.ChartType.BAR, title: 'Registration funnel', row: 4, col: 9 }];
  if (badgeCount) expected.push({
    ranges: ['A25:A' + (25 + badgeCount), 'C25:C' + (25 + badgeCount)],
    type: Charts.ChartType.BAR, title: 'Students completed, by badge', row: 20, col: 9
  });
  if (dayCount) expected.push({
    ranges: ['T4:U' + (4 + dayCount)],
    type: Charts.ChartType.COLUMN, title: 'Registrations per day', row: 36, col: 9
  });

  const existing = sh.getCharts();
  const used = {};
  expected.forEach((item, i) => {
    const wanted = item.ranges.slice().sort();
    const found = existing.find((chart, index) => {
      if (used[index]) return false;
      const actual = chart.getRanges().map(r => r.getA1Notation()).sort();
      return sameRow_(actual, wanted);
    });

    if (found) {
      const index = existing.indexOf(found);
      used[index] = true;
      return;
    }

    const builder = sh.newChart().setChartType(item.type).setPosition(item.row, item.col, 0, 0)
      .setOption('title', item.title).setOption('legend', { position: 'none' })
      .setOption('width', 520).setOption('height', 280);
    item.ranges.forEach(a1 => builder.addRange(sh.getRange(a1)));
    sh.insertChart(builder.build());
  });

  existing.forEach((chart, index) => {
    if (!used[index]) sh.removeChart(chart);
  });
}

/* ------------------------------------------------------------ Follow-up */

function syncFollowUpEditsToTracker_() {
  const ss = SpreadsheetApp.getActive();
  const follow = ss.getSheetByName(SHEETS.FOLLOW);
  const tracker = ss.getSheetByName(SHEETS.TRACK);
  if (!follow || !tracker || follow.getLastRow() < 2 || tracker.getLastRow() < 2) return;
  if (follow.getLastColumn() < 11) return;

  const followValues = follow.getDataRange().getValues();
  const trackerValues = tracker.getDataRange().getValues();
  if (!followValues.length || !trackerValues.length) return;
  const originalTrackerValues = trackerValues.map(r => r.slice());

  const trackerHeaders = headerIndex_(trackerValues[0].map(String));
  // The Follow-up columns are located by looking at the data (see followUpLayout_), so a status
  // column that was moved by hand, or a header that is out of step with the data, cannot misdirect edits.
  const layout = followUpLayout_(followValues);
  if (!layout) return;
  const keyCol = layout.key;
  const rollCol = layout.roll;
  const emailCol = layout.email;
  const followCols = { owner: layout.owner, status: layout.status, last: layout.last, notes: layout.notes };
  const trackerCols = {
    owner: trackerHeaders[normText_('Follow-up owner (manual)')],
    status: trackerHeaders[normText_('Follow-up status (manual)')],
    last: trackerHeaders[normText_('Last follow-up (manual)')],
    notes: trackerHeaders[normText_('Follow-up notes (manual)')]
  };

  if (Object.values(trackerCols).some(i => i === undefined)) return;
  // The Group column (column N, added in V3) is copied to the Tracker too, but only when the Follow-up tab already
  // has it (its header says "Group"), so the very first refresh after upgrading cannot blank anyone's group.
  const groupFollowCol = (layout === FU_LAYOUTS[0] && String(followValues[0][FU_GROUP_COL] || '').trim() === 'Group') ? FU_GROUP_COL : undefined;
  const groupTrackerCol = trackerHeaders[normText_('Group (manual)')];
  if (groupFollowCol !== undefined && groupTrackerCol !== undefined) {
    trackerCols.group = groupTrackerCol;
    followCols.group = groupFollowCol;
  }

  const trackerRowByKey = {};
  const trackerRowsByPair = {};
  for (let i = 1; i < trackerValues.length; i++) {
    const key = String(trackerValues[i][0] || '');
    if (key) trackerRowByKey[key] = i;

    const roll = normRoll_(trackerValues[i][I.ROLL]);
    const email = String(trackerValues[i][I.EMAIL] || '').trim().toLowerCase();
    const pair = roll + '|' + email;
    if (roll && email) {
      if (!trackerRowsByPair[pair]) trackerRowsByPair[pair] = [];
      trackerRowsByPair[pair].push(i);
    }
  }

  const allowedStatus = FOLLOW_STATUSES;
  followValues.slice(1).forEach(r => {
    let rowIndex;
    if (keyCol !== undefined) {
      const key = String(r[keyCol] || '');
      if (!key || trackerRowByKey[key] === undefined) return;
      rowIndex = trackerRowByKey[key];
    } else {
      // Migrate edits from an older Follow-up tab using only a unique roll+email match.
      const roll = normRoll_(r[rollCol]);
      const email = String(r[emailCol] || '').trim().toLowerCase();
      const matches = trackerRowsByPair[roll + '|' + email] || [];
      if (!roll || !email || matches.length !== 1) return;
      rowIndex = matches[0];
    }

    if (r[followCols.owner] !== undefined) trackerValues[rowIndex][trackerCols.owner] = r[followCols.owner];
    if (allowedStatus.includes(String(r[followCols.status] || ''))) {
      trackerValues[rowIndex][trackerCols.status] = r[followCols.status];
    }
    trackerValues[rowIndex][trackerCols.last] = r[followCols.last] || '';
    trackerValues[rowIndex][trackerCols.notes] = r[followCols.notes] || '';
    if (followCols.group !== undefined) trackerValues[rowIndex][trackerCols.group] = groupCell_(r[followCols.group]);
  });

  // Only write cells whose values actually changed in the Follow-up report.
  const rowCount = trackerValues.length - 1;
  if (!rowCount) return;
  Object.keys(trackerCols).forEach(name => {
    const index = trackerCols[name];
    const oldValues = originalTrackerValues.slice(1).map(r => [r[index] === undefined ? '' : r[index]]);
    const newValues = trackerValues.slice(1).map(r => [r[index] === undefined ? '' : r[index]]);
    if (!sameMatrix_(oldValues, newValues)) writeRowsIfChanged_(tracker, 2, index + 1, newValues);
  });
}

// Follow-up column positions (0-based). Current layout has "Follow-up status" in column F.
// The older layout had it in column I. The right one is chosen by looking at the data:
// the status column only ever contains the allowed statuses (or is blank).
const FU_GROUP_COL = 13;       // 0-based: Follow-up column N holds "Group"
const FU_LAYOUTS = [
  { status: 5, owner: 8, last: 9, notes: 10, key: 11, roll: 2, email: 3 },
  { status: 8, owner: 7, last: 9, notes: 10, key: 11, roll: 2, email: 3 }
];
function followUpLayout_(values) {
  const body = values.slice(1);
  for (let i = 0; i < FU_LAYOUTS.length; i++) {
    const L = FU_LAYOUTS[i];
    const sane = body.every(r => {
      const v = String(r[L.status] === undefined ? '' : r[L.status]);
      return v === '' || FOLLOW_STATUSES.includes(v);
    });
    if (sane) return L;
  }
  return null;                                                    // unrecognised layout: do nothing rather than guess
}
function followUpStatusCol_(sh) {                                // 1-based column number
  const n = sh.getLastRow() - 1;
  if (n < 1) return FU_LAYOUTS[0].status + 1;
  const vals = sh.getRange(2, 1, n, 13).getValues();
  const L = followUpLayout_([[]].concat(vals));
  return L ? L.status + 1 : 0;
}

function applyFollowUpValidation_(sh, rowCount) {
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(FOLLOW_STATUSES, true)
    .setAllowInvalid(false).build();
  // Earlier layouts had the status drop-down in another column: clear it so it cannot reject owner names or notes.
  try { sh.getRange(2, 1, Math.max(rowCount, 1), 14).clearDataValidations(); } catch (e) {}
  safeValidation_(sh.getRange(2, 6, rowCount, 1), statusRule);
  const groupRule = groupDropdownRule_();
  if (groupRule) safeValidation_(sh.getRange(2, FU_GROUP_COL + 1, rowCount, 1), groupRule);
}

function followUpPeople_(model) {
  const people = [];

  // The Follow-up tab shows only the LATEST submission by the same person: same roll number AND same name
  // (words in any order). Two different people who share a roll number (one mistyped it) are BOTH listed.
  // Older rows stay in Form Responses 1 and the Tracker, but are not listed here.
  const personKey = m => m.roll + '|' + nameSetKey_(m.name);
  const latestForRoll = {};
  model.forEach((m, i) => {
    if (m.status === DUP || !rollLooksValid_(m.roll)) return;
    const t = responseTime_(m.ts);
    const k = personKey(m);
    const best = latestForRoll[k];
    if (!best || t > best.time || (t === best.time && i > best.index)) latestForRoll[k] = { time: t, index: i };
  });

  model.forEach((m, i) => {
    if (m.status === DUP) return;
    if (rollLooksValid_(m.roll) && latestForRoll[personKey(m)] && latestForRoll[personKey(m)].index !== i) return;
    if (m.manual[M.FOLLOW_STATUS] === HIDE || m.status === EXCLUDED) return;     // removed from the list (Hide from list / Not eligible)

    // Redeemed = you marked "Credits redeemed", OR the student has earned a curriculum badge (they could not
    // have without redeeming). A redeemed student is past the form-filling stage, so old registration problems
    // no longer decide their priority: only activity does.
    const manualStatus = String(m.manual[M.FOLLOW_STATUS] || '');
    const autoRedeemed = m.status === 'OK' && (+m.counted || 0) > 0;
    if (manualStatus === REDEEMED || autoRedeemed) {
      const earlier = [];
      if (m.status !== 'OK' && m.status !== PENDING) earlier.push('profile: ' + m.status);
      if (m.flags) earlier.push(m.flags);
      let level = 'Low', text;
      if (m.status === PENDING) {
        text = 'Credits redeemed; waiting for profile check';
      } else if (m.status !== 'OK') {
        level = 'Watch';
        text = 'Credits redeemed; profile not readable (' + m.status + ') - activity unknown';
      } else if (m.started === 'No') {
        level = 'Watch';
        text = 'No activity detected; Credits redeemed but no activity yet';
      } else {
        text = (manualStatus === REDEEMED ? 'Credits redeemed' : 'Credits redeemed (earned a curriculum badge)') + '; working';
      }
      if (m.status === 'OK' && earlier.length) text += '; earlier registration issue, no longer a priority: ' + earlier.join('; ');
      people.push({
        key: m.key, priority: level, name: m.name, roll: m.roll,
        email: m.confirmEmail || m.email,
        problems: text, status: m.status, counted: m.counted,
        owner: m.manual[M.FOLLOW_OWNER] || '',
        followStatus: REDEEMED,
        group: groupCell_(m.manual[M.GROUP]),
        lastFollow: m.manual[M.LAST_FOLLOW] || '',
        notes: m.manual[M.FOLLOW_NOTES] || '',
        link: m.pid ? 'https://www.skills.google/public_profiles/' + m.pid : String(m.url || '')
      });
      return;
    }

    const problems = [];
    let priority = '';

    if (m.status !== 'OK' && m.status !== PENDING) {
      problems.push('Profile issue: ' + m.status);
      priority = 'High';
    }
    // V2 FIX: a profile that has not been checked yet is NOT "no issues".
    // Without this, a student skipped by a partial refresh looked fully fine.
    if (m.status === PENDING) {
      problems.push('Profile not checked yet');
      if (!priority) priority = 'Watch';
    }
    // "Roll used twice" is information only: with a verified profile and nothing else wrong it is Low priority.
    const flagList = String(m.flags || '').split('; ').filter(Boolean);
    const otherFlags = flagList.filter(f => f !== 'Roll used twice');
    const rollOnly = flagList.length > 0 && otherFlags.length === 0;
    if (rollOnly && m.status === 'OK') {
      problems.push('Roll number used in more than one submission (profile verified)');
      if (!priority) priority = 'Low';
    } else if (flagList.length) {
      problems.push('Registration details: ' + m.flags);
      if (priority !== 'High') priority = 'Medium';
    }
    if (m.status === 'OK' && m.started === 'No') {
      problems.push('No activity detected');
      if (!priority) priority = 'Low';
    }
    if (m.fixed) {
      problems.unshift('Resubmitted - earlier submission had a problem' +
        (m.status === 'OK' ? '; new one looks correct' : m.status === PENDING ? '; waiting for profile check' : ''));
      if (!priority) priority = 'Low';
    }
    // Every verified student is listed so anyone can be marked; no problem = Low.
    if (!problems.length) {
      problems.push('No issues');
      priority = 'Low';
    }

    people.push({
      key: m.key,
      priority: priority,
      name: m.name,
      roll: m.roll,
      email: m.confirmEmail || m.email,        // the email linked to the Google Skills profile
      problems: problems.join('; '),
      status: m.status,
      counted: m.counted,
      owner: m.manual[M.FOLLOW_OWNER] || '',
      followStatus: m.manual[M.FOLLOW_STATUS] || 'Not started',
      group: groupCell_(m.manual[M.GROUP]),
      lastFollow: m.manual[M.LAST_FOLLOW] || '',
      notes: m.manual[M.FOLLOW_NOTES] || '',
      link: m.pid ? 'https://www.skills.google/public_profiles/' + m.pid : String(m.url || '')
    });
  });
  return people;
}

// Colour guide, shown when you hover over the "Priority" header (the red corner mark on cell A1).
// It is a note, not rows above the table, because the table must start in row 1.
const FOLLOW_LEGEND = [
  'WHAT THE COLOURS MEAN',
  '',
  'YELLOW  - Form filled by us; waiting for the student to redeem credits.',
  'RED  - High: wrong, missing or unreadable profile link (student has not redeemed yet).',
  'ORANGE  - Medium: a registration detail to check, such as an email typo or an old account (not redeemed yet).',
  'BLUE  - Watch: credits redeemed but no activity yet; or profile not readable / not checked yet, so activity is unknown.',
  'GREEN  - Credits redeemed and working.',
  'NO COLOUR  - Low: nothing to fix.',
  '',
  'Redeemed = you set the status to "Credits redeemed", or the student has earned a curriculum badge (detected automatically).',
  'Redeemed students are judged on activity only, so old form problems no longer make them High or Medium.',
  'Colour order if several apply: yellow, red, orange, blue, green.',
  'To remove a student from this tab, set Follow-up status to "Hide from list".'
].join('\n');

function setFollowUpLegend_(sh) {
  try {
    const cell = sh.getRange('A1');
    if (cell.getNote() !== FOLLOW_LEGEND) cell.setNote(FOLLOW_LEGEND);
  } catch (e) {}                                                  // a missing note must never stop a refresh
}

function buildFollowUp_(model, cfg) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.FOLLOW) || ss.insertSheet(SHEETS.FOLLOW);
  const header = [
    'Priority', 'Name', 'Roll', 'Email', 'Problems', 'Follow-up status', 'Profile status',
    'Counted badges', 'Owner', 'Last follow-up', 'Follow-up notes', 'Record Key', 'Google Skills profile link', 'Group'
  ];
  const people = followUpPeople_(model);

  const order = { High: 1, Medium: 2, Watch: 3, Low: 4 };
  people.sort((a, b) => order[a.priority] - order[b.priority] || String(a.roll).localeCompare(String(b.roll)));

  const rows = people.length ? people.map(p => [
    p.priority, p.name, p.roll, p.email, p.problems, p.followStatus, p.status,
    p.counted, p.owner, p.lastFollow, p.notes, p.key, p.link, p.group
  ]) : [['No students to list.', '', '', '', '', '', '', '', '', '', '', '', '', '']];

  const sync = syncTable_(sh, 1, 1, header, rows);
  styleHeaderRange_(sh.getRange(1, 1, 1, header.length));
  setFollowUpLegend_(sh);

  if (sync.changed) {
    if (people.length) {
      safeFormat_(sh.getRange(2, 10, people.length, 1), 'dd/mm/yyyy');
      applyFollowUpValidation_(sh, people.length);
    }
    sh.getRange(1, 1, Math.max(2, people.length + 1), header.length)
      .setVerticalAlignment('middle').setWrap(true);
    sh.getRange(2, 13, Math.max(1, people.length), 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  }
  // Priority and "Asked to resubmit" colours come from rules, so manual fills are never overwritten.
  ensureFollowUpFormatting_(sh);

  if (sh.getFrozenRows() !== 1) sh.setFrozenRows(1);
  if (!sh.isColumnHiddenByUser(12)) sh.hideColumns(12);
  [85, 190, 120, 220, 360, 170, 190, 110, 150, 140, 280, 100, 330, 80]
    .forEach((width, i) => setColumnWidthIfNeeded_(sh, i + 1, width));
}

/* ------------------------------------------------------ Refill Check (temporary) */

// TEMPORARY helper. Follow-up used to show the form's first Email column instead of the email linked to the
// Google Skills profile. If you used that email when filling the main form, the entry is wrong.
// This tab lists every student whose two emails differ, with the ones you marked "Form filled by us" first.
// Type Yes in "Refilled?" once you have fixed one. Delete the tab when you are finished; it is rebuilt on refresh.
function buildRefillCheck_(model) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.REFILL) || ss.insertSheet(SHEETS.REFILL);
  const HEAD = 3;
  const norm = e => String(e || '').trim().toLowerCase();

  // keep what you typed in "Refilled?" (matched by the hidden Record Key)
  const done = {};
  if (sh.getLastRow() > HEAD) {
    sh.getRange(HEAD + 1, 1, sh.getLastRow() - HEAD, 8).getValues().forEach(r => {
      if (r[6]) done[String(r[6])] = String(r[5] || '');
    });
  }

  const rows = [];
  model.forEach(m => {
    if (m.status === DUP || m.status === EXCLUDED) return;
    if (norm(m.email) === norm(m.confirmEmail)) return;           // same email in both places: nothing to fix
    const filled = m.manual[M.FOLLOW_STATUS] === FILLED;
    const refilled = String(done[m.key] || '').toLowerCase() === 'yes' ? 'Yes' : '';
    const check = refilled ? 'Done' : filled ? 'REFILL' : 'Not filled yet';
    const rank = check === 'REFILL' ? 0 : check === 'Not filled yet' ? 1 : 2;
    rows.push({ rank: rank, roll: String(m.roll || ''), row: [
      check, m.name, m.roll,
      m.email,
      m.confirmEmail || '(blank)',
      refilled,
      m.key,
      m.pid ? 'https://www.skills.google/public_profiles/' + m.pid : String(m.url || '')
    ]});
  });
  rows.sort((a, b) => a.rank - b.rank || a.roll.localeCompare(b.roll));

  const header = ['Check', 'Name', 'Roll', 'Form email (not the profile email)', 'Profile email (use this one)', 'Refilled? (type Yes)', 'Record Key', 'Google Skills profile link'];
  const body = rows.length ? rows.map(r => r.row) : [['Nothing to check - every student has the same email in both places.', '', '', '', '', '', '', '']];
  const lastOld = Math.max(sh.getLastRow(), HEAD + 1);
  sh.getRange(1, 1, lastOld, 8).clearContent();
  try { sh.getRange(HEAD + 1, 1, lastOld - HEAD, 8).clearDataValidations(); } catch (e) {}
  sh.getRange(1, 1).setValue('Refill Check - temporary');
  sh.getRange(2, 1).setValue('REFILL = you marked this student "Form filled by us", but the form email differs from the profile email. Check that the main form used the profile email (column E); if not, refill it and type Yes in column F. You can delete this tab when finished.');
  sh.getRange(HEAD, 1, 1, 8).setValues([header]);
  sh.getRange(HEAD + 1, 1, body.length, 8).setValues(body);
  styleHeaderRange_(sh.getRange(HEAD, 1, 1, 8));
  sh.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  if (rows.length) {
    safeValidation_(sh.getRange(HEAD + 1, 6, body.length, 1),
      SpreadsheetApp.newDataValidation().requireValueInList(['Yes'], true).setAllowInvalid(true).build());
  }
  const range = sh.getRange(HEAD + 1, 1, Math.max(1, sh.getMaxRows() - HEAD), 8);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$A4="REFILL"').setBackground(STYLE.lightRed).setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$A4="Done"').setBackground('#d9ead3').setRanges([range]).build()
  ]);
  if (sh.getFrozenRows() !== HEAD) sh.setFrozenRows(HEAD);
  if (!sh.isColumnHiddenByUser(7)) sh.hideColumns(7);
  [110, 190, 120, 260, 260, 130, 100, 330].forEach((w, i) => setColumnWidthIfNeeded_(sh, i + 1, w));
}

/* ------------------------------------------------ Follow-up colours (persistent) */

function isBlueish_(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
  if (!m) return false;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return b >= 180 && b > r + 15 && b >= g;
}

// Colours by rule, so they stay with the right student when the list re-sorts:
//   yellow = Follow-up status "Form filled by us" (or the older "Asked to resubmit"), not redeemed yet
//   red = High priority      orange = Medium priority
//   blue = Watch (credits redeemed, no activity yet)      green = credits redeemed and working
// A row you paint blue by hand is still saved as "Form filled by us" (see captureManualBlue_), which now shows yellow.
function ensureFollowUpFormatting_(sh) {
  const ours = /\$[FI]2="Asked to resubmit"|\$[FI]2="Form filled by us"|\$[FI]2="Credits redeemed"|\$A2="High"|\$A2="Medium"|\$A2="Watch"|Resubmitted/;
  const isOurs = r => {
    const c = r.getBooleanCondition();
    return !!c && c.getCriteriaValues().some(v => ours.test(String(v)));
  };
  // formula text -> colour. Darker shades for orange, blue and green so they stand out.
  const COLOURS = [
    ['=OR($F2="Form filled by us",$F2="Asked to resubmit")', '#fff2cc', 'Form filled'],   // yellow: form filled, not redeemed yet
    ['=$A2="High"', STYLE.lightRed, '$A2="High"'],
    ['=$A2="Medium"', '#f6b26b', '$A2="Medium"'],                                          // orange
    ['=$A2="Watch"', '#6fa8dc', '$A2="Watch"'],                                            // blue: redeemed, no activity
    ['=$F2="Credits redeemed"', '#93c47d', 'Credits redeemed']                             // green: redeemed and working
  ];
  const rules = sh.getConditionalFormatRules();
  const mine = rules.filter(isOurs);
  const colourOf = r => { try { return String(r.getBooleanCondition().getBackground() || '').toLowerCase(); } catch (e) { return ''; } };
  const formulaOf = r => r.getBooleanCondition().getCriteriaValues().join(' ');
  const current = mine.length === COLOURS.length && COLOURS.every(c => {
    const hit = mine.filter(r => formulaOf(r).indexOf(c[2]) >= 0)[0];
    return !!hit && colourOf(hit) === c[1].toLowerCase();
  });
  const order = mine.map(formulaOf).join(' ');
  if (current && order.indexOf('Form filled') < order.indexOf('$A2="High"') &&
      order.indexOf('$A2="Medium"') < order.indexOf('$A2="Watch"') && order.indexOf('$A2="Watch"') < order.indexOf('Credits redeemed')) return;   // up to date
  const range = sh.getRange(2, 1, Math.max(1, sh.getMaxRows() - 1), 13);
  const mk = (formula, color) => SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(formula).setBackground(color).setRanges([range]).build();
  sh.setConditionalFormatRules(COLOURS.map(c => mk(c[0], c[1])).concat(rules.filter(r => !isOurs(r))));   // keep any rules you added yourself
}

// Runs at the start of every refresh, BEFORE the list is rebuilt. Any student row you have painted
// blue by hand is saved as the status "Form filled by us" (which is stored per student), and the
// painted fill is removed because the rule now draws the blue. To un-mark a student, change the status.
function captureManualBlue_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.FOLLOW);
  if (!sh || sh.getLastRow() < 2) return 0;
  try { ensureStatusValidation_(); } catch (e) {}                 // the drop-down must know the new status before we write it
  const n = sh.getLastRow() - 1;
  const bg = sh.getRange(2, 1, n, 3).getBackgrounds();            // columns A-C, painted fills only
  const keys = sh.getRange(2, 12, n, 1).getValues();              // Record Key (hidden column)
  const statusCol = followUpStatusCol_(sh);
  if (!statusCol) return 0;                                       // layout not recognised: leave the painted blue alone
  const statusRange = sh.getRange(2, statusCol, n, 1);
  const status = statusRange.getValues();
  const paintedRows = [];
  let changed = 0;
  for (let i = 0; i < n; i++) {
    if (!String(keys[i][0] || '').trim()) continue;               // not a student row
    if (!bg[i].some(isBlueish_)) continue;
    paintedRows.push('A' + (i + 2) + ':M' + (i + 2));
    const st = String(status[i][0] || '');
    if (st !== FILLED && st !== REDEEMED && st !== 'Asked to resubmit') { status[i][0] = FILLED; changed++; }
  }
  if (changed) {
    try { statusRange.setValues(status); }
    catch (e) { return 0; }                                       // could not save the marks: leave the painted blue exactly as it is
  }
  if (paintedRows.length) sh.getRangeList(paintedRows).setBackground(null);
  return paintedRows.length;
}

// The status drop-down list gained "Asked to resubmit". Refresh the list on existing rows once.
function ensureStatusValidation_() {
  const ss = SpreadsheetApp.getActive();
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(FOLLOW_STATUSES, true).setAllowInvalid(false).build();
  const stale = (sh, col) => {
    if (!sh || sh.getLastRow() < 2) return false;
    const dv = sh.getRange(2, col).getDataValidation();
    if (!dv) return true;
    const vals = dv.getCriteriaValues();
    const list = (vals && vals[0]) || [];
    return !(list.includes(HIDE) && list.includes(REDEEMED) && list.includes(EXCLUDED));
  };
  const tr = ss.getSheetByName(SHEETS.TRACK);
  const tc = FIXED.length + M.FOLLOW_STATUS + 1;
  if (stale(tr, tc)) safeValidation_(tr.getRange(2, tc, tr.getLastRow() - 1, 1), rule);
  const fu = ss.getSheetByName(SHEETS.FOLLOW);
  if (fu && fu.getLastRow() >= 2) {
    const col = followUpStatusCol_(fu);
    if (col && stale(fu, col)) safeValidation_(fu.getRange(2, col, fu.getLastRow() - 1, 1), rule);
  }
}

/* ---------------------------------------------------- Reward eligibility */

function buildRewardEligibility_(model, cfg) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.REWARDS) || ss.insertSheet(SHEETS.REWARDS);
  const title = 'Verified reward eligibility';
  const subtitle = 'Eligibility is calculated from verified profiles and the thresholds in Config. Approval and collection fields are manual fields on Tracker.';
  setValuesIfChanged_(sh.getRange('A1'), [[title]]);
  setValuesIfChanged_(sh.getRange('A2'), [[subtitle]]);

  const header = ['Name', 'Roll', 'Email', 'Counted badges', 'Reward tier', 'Group', 'Credits redeemed?', 'Reward approved?', 'Reward collected?', 'Collection date', 'Notes'];
  const eligible = model.filter(m => m.status === 'OK' && m.counted >= cfg.bottle)
    .sort((a, b) => b.counted - a.counted || String(a.roll).localeCompare(String(b.roll)));
  const rows = eligible.length ? eligible.map(m => [
    m.name, m.roll, m.email, m.counted, m.tier,
    m.manual[M.GROUP], m.manual[M.CREDITS], m.manual[M.APPROVED],
    m.manual[M.COLLECTED], m.manual[M.COLLECTION_DATE], m.manual[M.NOTES]
  ]) : [['No verified students have reached the bottle threshold yet.', '', '', '', '', '', '', '', '', '', '']];

  const sync = syncTable_(sh, 4, 1, header, rows);
  styleHeaderRange_(sh.getRange(4, 1, 1, header.length));

  if (String(sh.getRange('A1').getBackground()).toLowerCase() !== STYLE.navy) {
    sh.getRange('A1:K1').setBackground(STYLE.navy).setFontColor(STYLE.white).setFontWeight('bold').setFontSize(14);
    sh.getRange('A2:K2').setFontColor(STYLE.textGray).setWrap(true);
    sh.setRowHeight(1, 28);
  }
  if (sync.changed && eligible.length) {
    safeFormat_(sh.getRange(5, 10, eligible.length, 1), 'dd/mm/yyyy');
    sh.getRange(5, 1, eligible.length, header.length).setVerticalAlignment('middle').setWrap(true);
  }
  if (sh.getFrozenRows() !== 4) sh.setFrozenRows(4);
  [190, 120, 220, 120, 140, 150, 150, 150, 150, 140, 260]
    .forEach((width, i) => setColumnWidthIfNeeded_(sh, i + 1, width));
}

/* ------------------------------------------------------------ Leaderboard */

// Pure data step (easy to test): who is ahead, and how groups compare.
// Order: 1) most curriculum badges, 2) most experience points, 3) longest badge streak,
// 4) whoever reached their latest badge earlier. Same values on all four = shared rank.
function leaderboardData_(model, cfg) {
  const day = c => {
    const t = String(c || '');
    return t.indexOf('✓') === 0 ? t.slice(2).trim() : '';
  };
  const total = (cfg.curriculum || []).length;
  const people = model
    .filter(m => hasScoringEvidence_(m))
    .map(m => {
      const days = (m.cells || []).map(day).filter(Boolean).sort();
      const ticks = (m.cells || []).filter(c => String(c).indexOf('✓') === 0).length;
      return {
        name: m.name, roll: m.roll, group: String(m.manual[M.GROUP] || '').trim(),
        score: +m.score || 0, badgePts: +m.badgePts || 0, expPts: +m.expPts || 0,
        streakPts: +m.streakPts || 0, earlyPts: +m.earlyPts || 0, activityPts: +m.activityPts || 0,
        counted: m.counted, points: +m.points || 0, bingo: +m.bingoCount || 0,
        done: total > 0 && ticks >= total,
        any: +m.any || 0, streak: +m.streak || 0, active: +m.active || 0,
        since: m.since === undefined || m.since === null ? '' : m.since,
        latest: days.length ? days[days.length - 1] : '',
        toNext: m.counted >= cfg.kit ? 0 : m.counted >= cfg.bottle ? cfg.kit - m.counted : cfg.bottle - m.counted,
        tier: m.tier,
        redeemed: m.manual[M.FOLLOW_STATUS] === REDEEMED || m.counted > 0
      };
    })
    // V10 ranking order (a fixed sort, not bonus points): most curriculum badges first, then most Bingo squares,
    // then the most raw experience points on the profile. Score is shown but does not decide the rank.
    .sort((a, b) => b.counted - a.counted || b.bingo - a.bingo || b.points - a.points || String(a.name).localeCompare(String(b.name)));

  const same = (a, b) => a.counted === b.counted && a.bingo === b.bingo && a.points === b.points;
  let rank = 0, prev = null;
  const rows = people.map((p, i) => {
    if (!prev || !same(p, prev)) rank = i + 1;
    prev = p;
    return [rank, p.name, p.roll, p.group || '-', p.score, p.badgePts, p.expPts, p.streakPts, p.earlyPts, p.activityPts,
      p.counted, total ? Math.min(1, p.counted / total) : 0, p.done ? 'Yes' : 'No',
      p.points, p.streak, p.active, p.tier || '', p.toNext, p.latest, p.since, p.redeemed ? 'Yes' : 'No', p.any, p.bingo];
  });
  // Groups are ranked on the Group Leaderboard tab (see Groups.gs).
  return { rows: rows };
}

function buildLeaderboard_(model, cfg) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.BOARD) || ss.insertSheet(SHEETS.BOARD);
  const data = leaderboardData_(model, cfg);

  setValuesIfChanged_(sh.getRange('A1'), [['Leaderboard - who is ahead']]);
  setValuesIfChanged_(sh.getRange('A2'), [[
    'Score = badge points (credits, minimum ' + cfg.score.badgeMin + ') + experience points (total on the profile, 1 point per ' + cfg.score.expPer + ', max ' + cfg.score.expCap + ') + best curriculum streak points (max ' + cfg.score.streakCap + ') + early-finish points + attendance points (no cap). ' +
    'RANK ORDER: most curriculum badges first, then most Bingo squares complete, then the most experience points on the profile. Score is shown for information and does not decide the rank. ' +
    'All verified students are shown, including zero scores. Delayed updates retain cached verified evidence. Students equal on badges, Bingo and experience points share a rank. ' +
    'Groups are ranked on the Group Leaderboard tab. The rules and weights are in Config (columns F:H).']]);

  const header = ['Rank', 'Name', 'Roll', 'Group', 'Score', 'Badge points', 'Experience points (scored)', 'Streak points', 'Early-finish points', 'Activity points',
    'Curriculum badges', 'Progress', 'All curriculum done?', 'Experience points (lifetime)', 'Longest badge streak (days)', 'Active days',
    'Tier', 'Badges to next reward', 'Latest badge date', 'Member since', 'Credits redeemed?', 'All badges (in window)', 'Bingo squares complete (of 9)'];
  const rows = data.rows.length ? data.rows : [['No verified student has a counted badge yet.'].concat(new Array(header.length - 1).fill(''))];
  // One-time: the group table used to sit on the right of this tab (column R from v23). It now lives on the Group Leaderboard tab.
  try {
    if (String(sh.getRange(4, 18).getValue()) === 'Rank') sh.getRange(4, 18, Math.max(1, sh.getMaxRows() - 3), 7).clear();
    if (String(sh.getRange(4, 17).getValue()) === 'Rank') sh.getRange(4, 17, Math.max(1, sh.getMaxRows() - 3), 7).clear();
    if (String(sh.getRange(4, 12).getValue()) === 'Rank') sh.getRange(4, 12, Math.max(1, sh.getMaxRows() - 3), 7).clear();
  } catch (e) {}
  const sync = syncTable_(sh, 4, 1, header, rows);
  styleHeaderRange_(sh.getRange(4, 1, 1, header.length));

  if (sync.changed && data.rows.length) {
    const n = data.rows.length;
    sh.getRange(5, 1, n, header.length).setBackground(STYLE.white).setVerticalAlignment('middle');
    safeFormat_(sh.getRange(5, 5, n, 6), '0.0');
    safeFormat_(sh.getRange(5, 14, n, 3), '0');
    safeFormat_(sh.getRange(5, 12, n, 1), '0%');
    safeFormat_(sh.getRange(5, 19, n, 1), 'dd/mm/yyyy');
    const medal = ['#fff2cc', '#eeeeee', '#fce5cd'];
    data.rows.forEach((r, i) => { if (r[0] <= 3) sh.getRange(5 + i, 1, 1, header.length).setBackground(medal[r[0] - 1]); });
  }

  if (sh.getFrozenRows() !== 4) sh.setFrozenRows(4);
  if (String(sh.getRange('A1').getBackground()).toLowerCase() !== STYLE.navy) {
    sh.getRange('A1:Y1').setBackground(STYLE.navy).setFontColor(STYLE.white).setFontWeight('bold').setFontSize(14);
    sh.getRange('A2').setFontColor(STYLE.textGray);
    setRowHeightIfNeeded_(sh, 1, 28);
  }
  [60, 200, 120, 80, 80, 90, 120, 90, 110, 100, 100, 90, 110, 130, 130, 80, 110, 130, 120, 100, 120, 110, 130]
    .forEach((w, i) => setColumnWidthIfNeeded_(sh, i + 1, w));
}

/* ------------------------------------------------- Registrations by batch year */

// Year of the batch, read from the roll number. Messy values are handled:
//   "2024IMT019", "IMT2024019", "2024-25", "2024 IMT" -> 2024
// A year that cannot be a real batch (for example 2032) is shown on its own line so it can be checked.
function batchLabel_(roll) {
  const m = /20\d{2}/.exec(String(roll || ''));
  if (!m) return { sort: 9999, label: 'Roll number unreadable' };
  const y = +m[0];
  const thisYear = new Date().getFullYear();
  if (y >= 2015 && y <= thisYear) return { sort: y, label: y + ' batch' };
  return { sort: 5000 + y, label: 'Check: ' + y + ' (typo?)' };
}

// One row per batch year (non-duplicate students only), plus a total.
function batchYearRows_(model) {
  const g = {};
  model.forEach(m => {
    if (m.status === DUP || m.status === EXCLUDED) return;
    const b = batchLabel_(m.roll);
    const x = g[b.label] || (g[b.label] = { sort: b.sort, students: 0, verified: 0 });
    x.students++;
    if (m.status === 'OK') x.verified++;
  });
  const keys = Object.keys(g).sort((a, b) => g[a].sort - g[b].sort);
  const rows = keys.map(k => [k, g[k].students, g[k].verified]);
  rows.push(['Total (non-duplicate)', keys.reduce((t, k) => t + g[k].students, 0), keys.reduce((t, k) => t + g[k].verified, 0)]);
  return rows;
}

// Credit redemption block (below the batch-year table; the charts start at column I).
// "Redeemed" = marked "Credits redeemed" in Follow-up, OR the student has earned a curriculum badge.
// Counted live from the Tracker, so it never depends on which students are listed in Follow-up.
// V2: the block starts at `startRow` (the first free row after the batch-year
// table) instead of a fixed row, and returns its note row so the snapshot
// below it can follow. Row offsets inside the block, relative to startRow:
//   +1 verified | +2 redeemed (= +3 working + +4 no activity + +5 not readable
//   + +6 waiting) | +7 % of verified redeemed | +8 not redeemed yet |
//   +9 form filled by us | +10 form not filled yet | +11 needs a fix | +12 note.
function buildRedemptionBlock_(sh, startRow) {
  startRow = startRow || 22;
  // v23/v24 put this block at I4:J10, underneath the first chart. Remove that copy once.
  try {
    if (String(sh.getRange('I4').getValue()) === 'Credit redemption') sh.getRange('I4:J10').clear();
  } catch (e) {}
  const T = col => 'Tracker!$' + col + '$2:$' + col;
  const G = T('G'), K = T('K'), Mc = T('M');
  const V = T(colLetter_(FIXED.length + M.FOLLOW_STATUS + 1));       // Follow-up status (manual)
  const R = '"' + REDEEMED + '"';
  const g = r => 'G' + (startRow + r);
  const working = 'COUNTIFS(' + G + ',"OK",' + V + ',' + R + ',' + K + ',"Yes")+COUNTIFS(' + G + ',"OK",' + Mc + ',">=1",' + V + ',"<>"&' + R + ')';
  const idle = 'COUNTIFS(' + G + ',"OK",' + V + ',' + R + ',' + K + ',"No")';
  // V2: "not readable" no longer includes students merely waiting for a first
  // check; those get their own row below.
  const unread = 'COUNTIFS(' + V + ',' + R + ',' + G + ',"<>OK",' + G + ',"<>' + DUP + '",' + G + ',"<>' + PENDING + '")';
  const waiting = 'COUNTIFS(' + V + ',' + R + ',' + G + ',"' + PENDING + '")';
  const rows = [
    ['Verified students', '=$B$7'],
    ['Credits redeemed', '=' + g(3) + '+' + g(4) + '+' + g(5) + '+' + g(6)],
    ['   working (points or badges)', '=' + working],
    ['   no activity yet (Watch)', '=' + idle],
    ['   profile not readable', '=' + unread],
    ['   waiting for first check', '=' + waiting],
    ['% of verified students redeemed', '=IFERROR((' + g(3) + '+' + g(4) + ')/' + g(1) + ',0)'],
    ['Not redeemed yet', '=' + g(1) + '-' + g(3) + '-' + g(4)],
    ['   form filled by us (waiting)', '=COUNTIFS(' + G + ',"OK",' + V + ',"' + FILLED + '",' + Mc + ',"<1")'],
    ['   form not filled yet', '=' + g(8) + '-' + g(9)],
    ['Need a registration fix (not redeemed)', '=$B$17']
  ];
  setValuesIfChanged_(sh.getRange(startRow, 6, 1, 2), [['Credit redemption', 'Students']]);
  styleHeaderRange_(sh.getRange(startRow, 6, 1, 2));
  setValuesIfChanged_(sh.getRange(startRow + 1, 6, rows.length, 1), rows.map(r => [r[0]]));
  setFormulasIfChanged_(sh.getRange(startRow + 1, 7, rows.length, 1), rows.map(r => [r[1]]));
  setNumberFormatIfNeeded_(sh.getRange(startRow + 7, 7), '0%');
  setValuesIfChanged_(sh.getRange(startRow + 12, 6), [['Redeemed = you marked it, or the student earned a curriculum badge. Percent counts verified students only.']]);
  setRangeBackgroundIfNeeded_(sh.getRange(startRow + 2, 6, 1, 2), STYLE.lightGreen);
  return startRow + 12;
}

function buildBatchYearTable_(sh, model) {
  setValuesIfChanged_(sh.getRange('F13'), [['Registrations by batch year (from roll number)']]);
  if (sh.getRange('F13').getFontWeight() !== 'bold') sh.getRange('F13').setFontWeight('bold');
  const rows = batchYearRows_(model);
  syncTable_(sh, 14, 6, ['Batch', 'Students', 'Verified'], rows);
  styleHeaderRange_(sh.getRange(14, 6, 1, 3));
  setColumnWidthIfNeeded_(sh, 8, 110);
  // First free row after the table: header row 14 + data rows + 1.
  return 14 + rows.length + 1;
}

// V2 (event lead): a small live snapshot under the redemption block, so the
// questions an event lead asks every day - who is stuck, what is new - are
// answered without opening Tracker. Pure Tracker formulas; it adds cells
// below the redemption block and moves nothing that already exists.
function buildLeadSnapshot_(sh, startRow) {
  const T = col => 'Tracker!$' + col + '$2:$' + col;
  const G = T('G'), K = T('K'), Mc = T('M');
  const V = T(colLetter_(FIXED.length + M.FOLLOW_STATUS + 1));       // Follow-up status (manual)
  const R = '"' + REDEEMED + '"';
  const rows = [
    ['Waiting for first profile check', '=COUNTIF(' + G + ',"' + PENDING + '")'],
    ['Superseded (duplicate) submissions', '=COUNTIF(' + G + ',"' + DUP + '")'],
    ['Redeemed but no activity (Watch)', '=COUNTIFS(' + G + ',"OK",' + V + ',' + R + ',' + K + ',"No")'],
    ['Verified students with 0 counted badges', '=COUNTIFS(' + G + ',"OK",' + Mc + ',"=0")'],
    ['Registrations in the last 7 days', '=COUNTIFS(' + T('B') + ',">="&TODAY()-7)']
  ];
  setValuesIfChanged_(sh.getRange(startRow, 6, 1, 2), [['Event lead snapshot', 'Students']]);
  styleHeaderRange_(sh.getRange(startRow, 6, 1, 2));
  setValuesIfChanged_(sh.getRange(startRow + 1, 6, rows.length, 1), rows.map(r => [r[0]]));
  setFormulasIfChanged_(sh.getRange(startRow + 1, 7, rows.length, 1), rows.map(r => [r[1]]));
  setValuesIfChanged_(sh.getRange(startRow + 1 + rows.length, 6), [['Live formulas from Tracker. This block moves automatically if the batch-year table grows.']]);
}

/* ---------------------------------------------------------- refresh log */

function appendRefreshLog_(item) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEETS.LOG);
  if (!sh) {
    sh = ss.insertSheet(SHEETS.LOG);
    sh.getRange(1, 1, 1, 8).setValues([[
      'Time', 'Result', 'Submissions', 'Non-duplicate records', 'Verified profiles',
      'Unreachable profiles', 'Duration (seconds)', 'Note'
    ]]).setFontWeight('bold').setBackground('#1f4e78').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    [160, 100, 110, 160, 130, 150, 140, 420].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  }
  sh.appendRow([item.time, item.status, item.submissions, item.active, item.verified, item.failed, item.seconds, item.note]);
  const row = sh.getLastRow();
  safeFormat_(sh.getRange(row, 1), 'dd/mm/yyyy hh:mm:ss');
  if (row % 2 === 0) sh.getRange(row, 1, 1, 8).setBackground(STYLE.lightGray);
}

/* ------------------------------------------------- date display (language-proof) */

// Month names in number formats follow the Google account language (e.g. Hindi).
// Numeric formats look the same for everyone. Only rewrites formats that differ.
function applyDateFormats_() {
  const ss = SpreadsheetApp.getActive();
  const DT = 'dd/mm/yyyy hh:mm', D = 'dd/mm/yyyy';
  const apply = (sheetName, col, firstRow, format) => {
    const sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < firstRow) return;
    setNumberFormatIfNeeded_(sh.getRange(firstRow, col, sh.getLastRow() - firstRow + 1, 1), format);
  };
  apply(SHEETS.TRACK, I.TS + 1, 2, DT);
  apply(SHEETS.TRACK, I.CHECKED + 1, 2, DT);
  apply(SHEETS.TRACK, FIXED.length + M.COLLECTION_DATE + 1, 2, D);
  apply(SHEETS.TRACK, FIXED.length + M.LAST_FOLLOW + 1, 2, D);
  apply(SHEETS.FOLLOW, 10, 2, D);
  apply(SHEETS.REWARDS, 10, 5, D);
  apply(SHEETS.LOG, 1, 2, 'dd/mm/yyyy hh:mm:ss');
  apply(SHEETS.DASH, 20, 5, 'dd/mm');
  const conf = ss.getSheetByName(SHEETS.CONF);
  if (conf) setNumberFormatIfNeeded_(conf.getRange('B2:B3'), D);
}

/* ----------------------------------------------------------- find student */

function findStudent() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.prompt('Find a student', 'Enter part of a name, roll number, email, or profile ID:', ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;

  const query = String(answer.getResponseText() || '').trim().toLowerCase();
  if (!query) {
    ui.alert('Enter a search term.');
    return;
  }

  const data = readTracker_();
  const matches = data.rows.filter(r => [r[I.NAME], r[I.ROLL], r[I.EMAIL], r[I.PID]]
    .some(v => String(v || '').toLowerCase().indexOf(query) >= 0))
    .slice(0, 10);

  if (!matches.length) {
    ui.alert('No matching student was found in Tracker. Run Refresh now if the Tracker is out of date.');
    return;
  }

  const lines = matches.map(r =>
    'Name: ' + r[I.NAME] + '\nRoll: ' + r[I.ROLL] + '\nEmail: ' + r[I.EMAIL] +
    '\nStatus: ' + r[I.STATUS] + '\nCounted badges: ' + r[I.COUNTED] +
    '\nTier: ' + r[I.TIER] + '\n'
  );
  ui.alert('Student search results (up to 10)', lines.join('\n--------------------\n'), ui.ButtonSet.OK);
}

/* --------------------------------------------------------------- backups */

function backupOrganizerData() {
  const ss = SpreadsheetApp.getActive();
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const names = [SHEETS.TRACK, SHEETS.CONF, SHEETS.REWARDS, SHEETS.GROUPS, SHEETS.ACTIVITY];
  let copied = 0;

  names.forEach(originalName => {
    const source = ss.getSheetByName(originalName);
    if (!source) return;

    let name = 'Backup ' + originalName + ' ' + stamp;
    let suffix = 2;
    while (ss.getSheetByName(name)) {
      name = 'Backup ' + originalName + ' ' + stamp + ' ' + suffix;
      suffix++;
    }

    source.copyTo(ss).setName(name).hideSheet();
    copied++;
  });

  ss.toast(copied + ' organizer sheet(s) backed up. Form Responses 1 was not copied or changed.');
}

/* --------------------------------------------------------------- diagnose */

function diagnoseProfile() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Paste a public profile URL');
  if (r.getSelectedButton() !== ui.Button.OK) return;

  const id = extractProfileId_(r.getResponseText());
  if (!id) {
    ui.alert('That is not a public_profiles link.');
    return;
  }

  try {
    const res = UrlFetchApp.fetch('https://www.skills.google/public_profiles/' + id, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'Accept-Language': 'en' }
    });
    const text = htmlToText_(res.getContentText());
    const lines = [];
    const re = /(.{0,70}?)\s*(Earned\s+[A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})/g;
    let m;
    while ((m = re.exec(text))) lines.push(m[1].slice(-70) + '  ->  ' + m[2]);

    ui.alert('HTTP ' + res.getResponseCode() + '\n\n' +
      (lines.join('\n') || 'No "Earned <date>" entries found.') +
      '\n\nIf a badge appears here but is not counted, add its exact title to the Alt name column on Config.');
  } catch (e) {
    ui.alert('The profile request failed: ' + String(e.message || e));
  }
}

/** One-time, auditable migration. Run only after all three V5 files are saved. */
function applyEventRulesV5() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('A refresh is running. Retry after it completes.');
  try {
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('EVENT_RULES_VERSION') !== '2026-10-28-v5') {
      const ss = SpreadsheetApp.getActive();
      const conf = ss.getSheetByName(SHEETS.CONF);
      if (!conf) throw new Error('Config missing');
      const heading = String(conf.getRange('F1').getValue()).trim();
      if (heading && heading !== 'Scoring rule') throw new Error('Unexpected Config layout');
      if (!heading && conf.getRange('F1:H40').getValues().some(r=>r.some(v=>v!=='' && v!==null))) throw new Error('Scoring area is occupied');
      const activity = ss.getSheetByName(SHEETS.ACTIVITY);
      if (activity && activity.getLastRow() >= 5 && activity.getRange(5,1,activity.getLastRow()-4,5).getValues().some(r=>r.some(v=>v!=='' && v!==null))) throw new Error('Activity awards already exist; review them before changing the rules.');
      const sessions = conf.getRange('F13:H40').getValues();
      if (sessions.some(r=>r[0] && String(r[0]).toLowerCase().indexOf('(dummy)')<0)) throw new Error('Real session configuration exists; migration stopped to preserve it.');
      backupOrganizerData();
      ensureScoringConfig_(conf);
      conf.getRange('G3:G10').setValues([[4],[1],[100],[30],[0],[1],[7],[15]]);
      conf.getRange('H5:H7').setValues([['Total experience points on the profile divided by this (absolute points, any account age).'],['Most score points experience can give.'],['Unused: total experience points count for every account.']]);
      conf.getRange('F13:H40').clearContent();
      conf.getRange('F12:H12').setValues([['Attendance session ID','Points','Session title / note']]);
      props.setProperty('EVENT_RULES_VERSION','2026-10-28-v5');
      appendRefreshLog_({time:new Date(),status:'RULES UPDATED',submissions:'',active:'',verified:'',failed:'',seconds:0,note:'V5 adopted: curriculum streak; 2/session capped 10; shared ties; average guild scores; event cutoff. Existing organizer tabs backed up before changing Config.'});
    }
  } finally { lock.releaseLock(); }
  runRefresh_(false);
}

/** V5: fixed assigned roster, average student score including zeroes.
 * Participation is informational. Equal scores share rank. Follow-up hiding does not remove eligibility.
 * Form Responses 1 is never modified. */

const GROUP_FIRST_ROW = 5;      // Groups tab: data starts here
const GROUP_LAST_ROW = 200;     // Groups tab: drop-down looks this far down

function groupCell_(v) {
  if (v === undefined || v === null) return '';
  return typeof v === 'string' ? v.trim() : v;
}

function groupKey_(v) {
  return String(groupCell_(v));
}

function groupCompare_(a, b) {
  const na = Number(a), nb = Number(b);
  if (a !== '' && b !== '' && !isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/* ------------------------------------------------------------ Groups tab */

function ensureGroupsSheet_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.GROUPS) || ss.insertSheet(SHEETS.GROUPS);
  setValuesIfChanged_(sh.getRange('A1'), [['Groups - type each group number and its head']]);
  setValuesIfChanged_(sh.getRange('A2'), [[
    'Type one group per row from row 5 down: the group number in column A and the group head in column B. ' +
    'Then pick each student\'s group in the Follow-up tab (Group column). Nothing in rows 5 and below is ever overwritten by the script.']]);
  setValuesIfChanged_(sh.getRange('A4:B4'), [['Group', 'Group head']]);
  styleHeaderRange_(sh.getRange('A4:B4'));
  if (String(sh.getRange('A1').getBackground()).toLowerCase() !== STYLE.navy) {
    sh.getRange('A1:H1').setBackground(STYLE.navy).setFontColor(STYLE.white).setFontWeight('bold').setFontSize(14);
    sh.getRange('A2').setFontColor(STYLE.textGray);
  }
  if (sh.getFrozenRows() !== 4) sh.setFrozenRows(4);
  setColumnWidthIfNeeded_(sh, 1, 90);
  setColumnWidthIfNeeded_(sh, 2, 240);
  return sh;
}

// [{group, head}] in the order typed; blank group cells are skipped and a repeated group number keeps its first head.
function readGroupsList_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.GROUPS);
  if (!sh || sh.getLastRow() < GROUP_FIRST_ROW) return [];
  const vals = sh.getRange(GROUP_FIRST_ROW, 1, sh.getLastRow() - GROUP_FIRST_ROW + 1, 2).getValues();
  const seen = {}, out = [];
  vals.forEach(r => {
    const g = groupKey_(r[0]);
    if (!g || seen[g]) return;
    seen[g] = true;
    out.push({ group: g, head: String(r[1] === undefined || r[1] === null ? '' : r[1]).trim() });
  });
  return out;
}

function groupDropdownRule_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.GROUPS);
  if (!sh) return null;
  return SpreadsheetApp.newDataValidation()
    .requireValueInRange(sh.getRange(GROUP_FIRST_ROW, 1, GROUP_LAST_ROW - GROUP_FIRST_ROW + 1, 1), true)
    .setAllowInvalid(false).build();
}

/* --------------------------------------------------------------- members */

function latestBadgeDay_(m) {
  const days = (m.cells || []).map(c => String(c).indexOf('✓') === 0 ? String(c).slice(2).trim() : '').filter(Boolean).sort();
  return days.length ? days[days.length - 1] : '';
}

// One entry per person who has a group. Same "one row per person" rule as the Follow-up tab (see latestPersonRows_):
// the latest submission by the same roll number and name wins; superseded and hidden rows are left out.
function groupMembers_(model) {
  const out = [];
  latestPersonRows_(model).forEach(m => {
    // Follow-up visibility does not determine competitive eligibility.
    const g = groupKey_(m.manual[M.GROUP]);
    if (!g) return;
    const ok = hasScoringEvidence_(m);
    out.push({
      group: g, name: m.name, roll: m.roll, status: m.status,
      score: +m.score || 0,
      counted: ok ? (+m.counted || 0) : 0,
      points: ok ? (+m.points || 0) : 0,
      streak: ok ? (+m.streak || 0) : 0,
      latest: ok ? latestBadgeDay_(m) : ''
    });
  });
  return out;
}

function sortMembers_(list) {
  return list.slice().sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)));
}

/* ----------------------------------------------------------- group stats */

// Ranked list of groups. `defined` is the Groups tab list (gives heads and lets empty groups appear).
// Group score = average student score per member x participation rate (members with 1+ badge / members).
// Order: group score, then average experience points per member, then members with 1+ badge (all high to low).
function groupStats_(members, defined, cfg) {
  const g = {};
  const add = (key, head) => {
    if (!g[key]) g[key] = { group: key, head: head || '', list: [] };
    else if (head && !g[key].head) g[key].head = head;
    return g[key];
  };
  (defined || []).forEach(d => add(d.group, d.head));
  members.forEach(m => add(m.group, '').list.push(m));

  const r6 = x => Math.round(x * 1e6);
  const stats = Object.keys(g).map(k => {
    const x = g[k], n = x.list.length;
    const scoreSum = x.list.reduce((s, m) => s + (m.score || 0), 0);
    const badges = x.list.reduce((s, m) => s + m.counted, 0);
    const pts = x.list.reduce((s, m) => s + m.points, 0);
    const active = x.list.filter(m => m.counted > 0).length;
    const avgScore = n ? scoreSum / n : 0;
    const part = n ? active / n : 0;
    return {
      group: k, head: x.head, members: n,
      verified: x.list.filter(m => m.status === 'OK').length,
      active: active, part: part, avgScore: avgScore, gscore: Math.round(avgScore * 10) / 10,
      total: badges, avg: n ? badges / n : 0, avgPoints: n ? pts / n : 0,
      bottle: x.list.filter(m => m.counted >= cfg.bottle).length,
      kit: x.list.filter(m => m.counted >= cfg.kit).length
    };
  }).sort((a, b) => (b.members > 0) - (a.members > 0) ||
    r6(b.gscore) - r6(a.gscore) || groupCompare_(a.group, b.group));

  let rank = 0, prev = null;
  stats.forEach((s, i) => {
    if (s.members === 0) { s.rank = '-'; return; }
    if (!prev || r6(prev.gscore) !== r6(s.gscore)) rank = i + 1;
    prev = s;
    s.rank = rank;
  });
  return stats;
}

/* --------------------------------------------------------------- reports */

function buildGroups_(model, cfg) {
  const defined = readGroupsList_();
  const members = groupMembers_(model);
  const stats = groupStats_(members, defined, cfg);
  const errors = [];
  [
    ['Group Leaderboard', () => buildGroupLeaderboard_(stats)],
    ['Group Members', () => buildGroupMembers_(members, defined)],
    ['Dashboard groups', () => buildDashboardGroups_(stats, cfg)]
  ].forEach(step => {
    try { step[1](); } catch (e) { errors.push(step[0] + ': ' + String(e && e.message ? e.message : e).slice(0, 120)); }
  });
  if (errors.length) throw new Error(errors.join(' | '));
}

function styleTitle_(sh, lastCol) {
  if (String(sh.getRange('A1').getBackground()).toLowerCase() !== STYLE.navy) {
    sh.getRange('A1:' + lastCol + '1').setBackground(STYLE.navy).setFontColor(STYLE.white).setFontWeight('bold').setFontSize(14);
    sh.getRange('A2').setFontColor(STYLE.textGray);
    setRowHeightIfNeeded_(sh, 1, 28);
  }
}

function buildGroupLeaderboard_(stats) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.GBOARD) || ss.insertSheet(SHEETS.GBOARD);
  setValuesIfChanged_(sh.getRange('A1'), [['Group Leaderboard - which group is ahead']]);
  setValuesIfChanged_(sh.getRange('A2'), [[
    'Group score = average student score across the assigned eligible roster, including zero scores. Participation is shown separately. ' +
    'Equal group scores share a rank. Members are the students you assigned to the group in Follow-up; ' +
    'an unverified profile counts as a member with a score of 0 (plus any activity points). Groups with no members are listed last.']]);
  const header = ['Rank', 'Group', 'Group head', 'Members', 'Verified members', 'Members with 1+ badge', 'Participation',
    'Avg score per member', 'Group score', 'Avg badges per member', 'Avg experience points', 'At bottle tier+', 'At kit tier'];
  const rows = stats.length ? stats.map(s => [s.rank, s.group, s.head, s.members, s.verified, s.active,
    Math.round(s.part * 1000) / 1000, Math.round(s.avgScore * 10) / 10, Math.round(s.gscore * 10) / 10,
    Math.round(s.avg * 100) / 100, Math.round(s.avgPoints), s.bottle, s.kit])
    : [['', 'No groups yet - add them in the Groups tab', '', '', '', '', '', '', '', '', '', '', '']];
  const sync = syncTable_(sh, 4, 1, header, rows);
  styleHeaderRange_(sh.getRange(4, 1, 1, header.length));
  if (sync.changed && stats.length) {
    const n = stats.length;
    sh.getRange(5, 1, n, header.length).setBackground(STYLE.white).setVerticalAlignment('middle');
    safeFormat_(sh.getRange(5, 7, n, 1), '0%');
    safeFormat_(sh.getRange(5, 8, n, 2), '0.0');
    safeFormat_(sh.getRange(5, 10, n, 1), '0.00');
    const medal = ['#fff2cc', '#eeeeee', '#fce5cd'];
    stats.forEach((s, i) => { if (s.rank >= 1 && s.rank <= 3) sh.getRange(5 + i, 1, 1, header.length).setBackground(medal[s.rank - 1]); });
  }
  if (sh.getFrozenRows() !== 4) sh.setFrozenRows(4);
  styleTitle_(sh, 'M');
  [60, 110, 200, 90, 110, 130, 110, 140, 110, 140, 140, 110, 100].forEach((w, i) => setColumnWidthIfNeeded_(sh, i + 1, w));
}

// Group Members: B3 is a drop-down you choose (kept between refreshes). The table is plain formulas that look the
// chosen group up in a hidden helper block (columns K:S) which the script rewrites on every refresh.
const GM_HELP_COL = 11;          // column K
const GM_LAST = 2000;
function buildGroupMembers_(members, defined) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.GMEM) || ss.insertSheet(SHEETS.GMEM);
  setValuesIfChanged_(sh.getRange('A1'), [['Group Members - pick a group number']]);
  setValuesIfChanged_(sh.getRange('A2'), [[
    'Choose the group in the yellow cell. Members are listed best first (score, then badges, experience points, streak). Columns K to T are the data behind this table; leave them alone.']]);
  setValuesIfChanged_(sh.getRange('A3'), [['Group:']]);
  if (!sh.getRange('B3').getDataValidation()) {
    const rule = groupDropdownRule_();
    if (rule) safeValidation_(sh.getRange('B3'), rule);
  }
  setValuesIfChanged_(sh.getRange('C3'), [['Group head:']]);
  setFormulasIfChanged_(sh.getRange('D3'), [['=IF($B$3="","",IFERROR(VLOOKUP($B$3,' + SHEETS.GROUPS + '!$A$' + GROUP_FIRST_ROW + ':$B$' + GROUP_LAST_ROW + ',2,FALSE),""))']]);
  setValuesIfChanged_(sh.getRange('E3'), [['Members:']]);
  setFormulasIfChanged_(sh.getRange('F3'), [['=IF($B$3="","",SUMPRODUCT(--($K$6:$K$' + GM_LAST + '&""=$B$3&"")))']]);
  setRangeBackgroundIfNeeded_(sh.getRange('B3'), '#fff2cc');
  sh.getRange('A3:F3').setFontWeight('bold');

  // Helper block: one row per member, sorted by group then rank, with a "group|position" key.
  const byGroup = {};
  members.forEach(m => { (byGroup[m.group] = byGroup[m.group] || []).push(m); });
  const helper = [];
  let biggest = 0;
  Object.keys(byGroup).sort(groupCompare_).forEach(g => {
    const list = sortMembers_(byGroup[g]);
    biggest = Math.max(biggest, list.length);
    list.forEach((m, i) => {
      const parts = m.latest ? m.latest.split('-') : null;     // ISO day -> dd/mm/yyyy text
      helper.push([g, g + '|' + (i + 1), m.name, m.roll, m.status, m.score, m.counted, m.points, m.streak,
        parts ? parts[2] + '/' + parts[1] + '/' + parts[0] : '']);
    });
  });
  const hHeader = ['Group', 'Key', 'Name', 'Roll', 'Profile status', 'Score', 'Curriculum badges', 'Experience points', 'Longest streak (days)', 'Latest badge date'];
  // Text format first, so Sheets cannot turn "1|2" or "14/09/2026" into other types.
  const hRows = Math.max(1, helper.length);
  ensureGridSize_(sh, Math.max(GM_LAST, 5 + hRows), GM_HELP_COL + hHeader.length);
  setNumberFormatIfNeeded_(sh.getRange(6, GM_HELP_COL + 1, hRows, 1), '@');
  setNumberFormatIfNeeded_(sh.getRange(6, GM_HELP_COL + 9, hRows, 1), '@');
  syncTable_(sh, 5, GM_HELP_COL, hHeader, helper);
  styleHeaderRange_(sh.getRange(5, GM_HELP_COL, 1, hHeader.length));

  // Visible table: row k shows member k of the chosen group.
  const visibleRows = Math.max(30, biggest + 5);
  const col = n => '$' + colLetter_(GM_HELP_COL + n);
  // text=true appends &"" so an empty helper cell shows blank instead of 0 (used for the date column).
  const pick = (n, r, text) => '=IF($A' + r + '="","",INDEX(' + col(n) + '$6:' + col(n) + '$' + GM_LAST +
    ',MATCH($B$3&"|"&$A' + r + ',' + col(1) + '$6:' + col(1) + '$' + GM_LAST + ',0))' + (text ? '&""' : '') + ')';
  const formulas = [];
  for (let k = 1; k <= visibleRows; k++) {
    const r = 5 + k;
    formulas.push(['=IF($B$3="","",IF(' + k + '<=$F$3,' + k + ',""))', pick(2, r), pick(3, r), pick(4, r), pick(5, r), pick(6, r), pick(7, r), pick(8, r), pick(9, r, true)]);
  }
  setValuesIfChanged_(sh.getRange('A5:I5'), [['#', 'Name', 'Roll', 'Profile status', 'Score', 'Curriculum badges', 'Experience points', 'Longest streak (days)', 'Latest badge date']]);
  styleHeaderRange_(sh.getRange('A5:I5'));
  setFormulasIfChanged_(sh.getRange(6, 1, visibleRows, 9), formulas);
  safeFormat_(sh.getRange(6, 5, visibleRows, 1), '0.0');
  const below = Math.min(200, sh.getMaxRows() - (5 + visibleRows));
  if (below > 0) sh.getRange(6 + visibleRows, 1, below, 9).clearContent();

  if (!sh.isColumnHiddenByUser(GM_HELP_COL)) sh.hideColumns(GM_HELP_COL, hHeader.length);
  if (sh.getFrozenRows() !== 5) sh.setFrozenRows(5);
  styleTitle_(sh, 'I');
  [50, 200, 120, 190, 80, 120, 120, 130, 120].forEach((w, i) => setColumnWidthIfNeeded_(sh, i + 1, w));
}

// Dashboard: group, members, head, group score - best group first, under the badge table (columns A:D).
function buildDashboardGroups_(stats, cfg) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.DASH);
  if (!sh) return;
  const start = Math.max(38, 25 + (cfg.curriculum || []).length + 3);
  setValuesIfChanged_(sh.getRange(start, 1), [['Groups and their heads (best group first)']]);
  sh.getRange(start, 1).setFontWeight('bold');
  setValuesIfChanged_(sh.getRange(start + 1, 1, 1, 4), [['Group', 'Members', 'Group head', 'Group score']]);
  styleHeaderRange_(sh.getRange(start + 1, 1, 1, 4));
  const rows = stats.length ? stats.map(s => [s.group, s.members, s.head, Math.round(s.gscore * 10) / 10])
    : [['No groups yet', '', 'Add them in the Groups tab', '']];
  const first = start + 2;
  setValuesIfChanged_(sh.getRange(first, 1, rows.length, 4), rows);
  safeFormat_(sh.getRange(first, 4, rows.length, 1), '0.0');
  sh.getRange(first, 1, rows.length, 1).setHorizontalAlignment('left');
  const below = Math.min(60, sh.getMaxRows() - (first + rows.length) + 1);
  if (below > 0) sh.getRange(first + rows.length, 1, below, 4).clearContent();
}
/**
 * V5 event rules adopted 28 Oct 2026.
 * Score = curriculum badge points + best curriculum streak + early completion + attendance.
 * V9: total experience points count, 1 score point per 100, capped at 30. Streak capped at 7. Attendance is 10 per unique dated session, no cap.
 * Failed profile updates retain cached verified evidence. Form Responses 1 is never modified.
 */

const SCORING_RULES = [
  ['Program end date', new Date(Date.UTC(2026, 10, 22)), 'Early-finish points fall evenly to 0 on this date.'],
  ['Minimum points for a badge', 4, 'A badge worth fewer credits (for example 0) still scores at least this.'],
  ['Points per badge credit', 1, 'Badge points = credits x this number (but never below the minimum).'],
  ['Experience points per 1 score point', 100, 'Total experience points on the profile divided by this (absolute points, any account age).'],
  ['Experience score cap', 30, 'Most score points experience can give.'],
  ['Old account with no starting value: % of lifetime points counted', 0, 'Unused (V9): total experience points count for every account.'],
  ['Points per day of badge streak', 1, 'Longest run of days in a row with a badge.'],
  ['Streak score cap', 7, 'Most score points the streak can give.'],
  ['Early-finish bonus (maximum)', 15, 'Only for finishing all curriculum badges; shrinks the later they finish.']
];
// Dummy activities: replace the names and points with your own (F13:G17; you can add more rows below, up to row 40).
const DEFAULT_ACTIVITIES = []; // Add real attendance sessions only, each worth 10 points.
const ACT_FIRST_ROW = 5;
const ACT_LAST_ROW = 1000;

function ensureScoringConfig_(sh) {
  if (String(sh.getRange('F1').getValue()).trim() !== 'Scoring rule') {
    const existing = sh.getRange('F1:H17').getValues();
    if (existing.some(r => r.some(v => v !== '' && v !== null))) return;   // something else is there: never overwrite
    sh.getRange('F1:H1').setValues([['Scoring rule', 'Value', 'Note']]);
    sh.getRange(2, 6, SCORING_RULES.length, 3).setValues(SCORING_RULES);
    sh.getRange('F12:H12').setValues([['Activity', 'Points', 'Note']]);
    if (DEFAULT_ACTIVITIES.length) sh.getRange(13, 6, DEFAULT_ACTIVITIES.length, 3).setValues(DEFAULT_ACTIVITIES);
  }
  styleHeaderRange_(sh.getRange('F1:H1'));
  styleHeaderRange_(sh.getRange('F12:H12'));
  setRangeBackgroundIfNeeded_(sh.getRange('G2:G10'), STYLE.lightBlue);
  setRangeBackgroundIfNeeded_(sh.getRange('F13:G40'), STYLE.lightBlue);
  // The existing typed Config column owns its date format; do not reformat G2.
  setColumnWidthIfNeeded_(sh, 6, 400);
  setColumnWidthIfNeeded_(sh, 7, 110);
  setColumnWidthIfNeeded_(sh, 8, 430);
}

function readScoring_(sh) {
  const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
  const r = sh.getRange('G2:G10').getValues().map(x => x[0]);
  const endOk = r[0] instanceof Date && !isNaN(r[0].getTime());
  const acts = sh.getRange('F13:G40').getValues()
    .filter(x => String(x[0] === null || x[0] === undefined ? '' : x[0]).trim())
    .map(x => ({ name: String(x[0]).trim(), points: num(x[1], 0) }));
  return {
    end: endOk ? toUtcDay_(r[0]) : new Date(Date.UTC(2026, 10, 22)),
    badgeMin: num(r[1], 4),
    perCredit: num(r[2], 1),
    expPer: Math.max(0.0001, num(r[3], 30)),
    expCap: num(r[4], 30),
    oldPct: Math.min(100, Math.max(0, num(r[5], 50))),
    streakPer: num(r[6], 1),
    streakCap: num(r[7], 7),
    earlyMax: num(r[8], 15),
    activities: acts
  };
}

/* --------------------------------------------------------- Activity Points */

function ensureActivitySheet_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEETS.ACTIVITY) || ss.insertSheet(SHEETS.ACTIVITY);
  setValuesIfChanged_(sh.getRange('A1'), [['Activity Points - one row per award']]);
  setValuesIfChanged_(sh.getRange('A2'), [[
    'Type the roll number (column A) and pick the activity (column B) from row 5 down. Points come from the activity\'s value in Config unless you type a number in column C. ' +
    'Columns F to H are filled in by the script. The same activity is counted once per student.']]);
  setValuesIfChanged_(sh.getRange('A4:H4'), [['Roll', 'Activity', 'Points (blank = Config value)', 'Session date (required)', 'Note (optional)', 'Student (auto)', 'Check (auto)', 'Points counted (auto)']]);
  styleHeaderRange_(sh.getRange('A4:H4'));
  if (String(sh.getRange('A1').getBackground()).toLowerCase() !== STYLE.navy) {
    sh.getRange('A1:H1').setBackground(STYLE.navy).setFontColor(STYLE.white).setFontWeight('bold').setFontSize(14);
    sh.getRange('A2').setFontColor(STYLE.textGray);
  }
  if (!sh.getRange(ACT_FIRST_ROW, 2).getDataValidation()) {
    const conf = ss.getSheetByName(SHEETS.CONF);
    if (conf) {
      const rule = SpreadsheetApp.newDataValidation().requireValueInRange(conf.getRange('F13:F40'), true).setAllowInvalid(false).build();
      safeValidation_(sh.getRange(ACT_FIRST_ROW, 2, ACT_LAST_ROW - ACT_FIRST_ROW + 1, 1), rule);
    }
    safeFormat_(sh.getRange(ACT_FIRST_ROW, 4, ACT_LAST_ROW - ACT_FIRST_ROW + 1, 1), 'dd/mm/yyyy');
    sh.getRange(ACT_FIRST_ROW, 6, ACT_LAST_ROW - ACT_FIRST_ROW + 1, 3).setBackground(STYLE.lightGray);
  }
  if (sh.getFrozenRows() !== 4) sh.setFrozenRows(4);
  [120, 270, 150, 110, 220, 190, 330, 120].forEach((w, i) => setColumnWidthIfNeeded_(sh, i + 1, w));
  return sh;
}

// One row per person: the latest submission by the same roll number and name (the Follow-up rule).
// Superseded rows are left out. Hidden students are kept: they can still be awarded points.
function latestPersonRows_(model) {
  const personKey = m => m.roll + '|' + nameSetKey_(m.name);
  const latest = {};
  model.forEach((m, i) => {
    if (m.status === DUP || !rollLooksValid_(m.roll)) return;
    const t = responseTime_(m.ts), k = personKey(m), best = latest[k];
    if (!best || t > best.time || (t === best.time && i > best.index)) latest[k] = { time: t, index: i };
  });
  return model.filter((m, i) => {
    if (m.status === DUP || m.status === EXCLUDED) return false;
    return !(rollLooksValid_(m.roll) && latest[personKey(m)] && latest[personKey(m)].index !== i);
  });
}

function applyActivityPoints_(model, cfg) {
  model.forEach(m => { m.activityPts = 0; });
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.ACTIVITY);
  if (!sh || sh.getLastRow() < ACT_FIRST_ROW) return;
  const people = {};
  latestPersonRows_(model).forEach(m => { (people[m.roll] = people[m.roll] || []).push(m); });
  const defaults = {};
  (cfg.score.activities || []).forEach(a => { defaults[normText_(a.name)] = a.points; });
  const n = sh.getLastRow() - ACT_FIRST_ROW + 1;
  const rows = sh.getRange(ACT_FIRST_ROW, 1, n, 5).getValues();
  const seen = {};
  const report = rows.map((r, i) => {
    const roll = normRoll_(r[0]);
    const act = String(r[1] === null || r[1] === undefined ? '' : r[1]).trim();
    const typed = r[2] === '' || r[2] === null || r[2] === undefined ? null : parseFloat(r[2]);
    if (!roll && !act && typed === null) return ['', '', ''];
    const found = people[roll] || [];
    if (!roll) return ['', 'Roll number missing', 0];
    if (!found.length) return ['', 'Roll number not found', 0];
    if (found.length > 1) return ['', 'Roll shared by ' + found.length + ' students - not applied', 0];
    const m = found[0];
    if (!act || defaults[normText_(act)] !== 10) return [m.name, 'Choose a configured attendance session worth 10 points', 0];
    if (typed !== null && (!isFinite(typed) || typed !== 10)) return [m.name, 'Attendance is fixed at 10 points per session', 0];
    if (!(r[3] instanceof Date) || isNaN(r[3].getTime())) return [m.name, 'Enter the actual session date', 0];
    const date = toUtcDay_(r[3]);
    if (date < cfg.start || date > cfg.score.end) return [m.name, 'Session is outside the event window', 0];
    const pts = 10;
    const dupKey = roll + '|' + normText_(act);
    if (act && seen[dupKey] !== undefined) return [m.name, 'Same activity already given in row ' + seen[dupKey] + ' - not counted again', 0];
    if (act) seen[dupKey] = ACT_FIRST_ROW + i;
    m.activityPts += pts;
    return [m.name, 'OK', pts];
  });
  setValuesIfChanged_(sh.getRange(ACT_FIRST_ROW, 6, n, 3), report);
}

/* ----------------------------------------------------------------- scoring */

function hasScoringEvidence_(m) {
  return m.status === 'OK' || (String(m.status).indexOf('Unreachable') === 0 && m.since !== '' && m.since !== undefined && m.checked);
}

function round1_(x) { return Math.round(x * 10) / 10; }
function isoToUtc_(s) {
  const p = String(s || '').split('-');
  return p.length === 3 ? new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])) : new Date(NaN);
}

function scoreModelBase_(model, cfg) {
  const rules = cfg.score;
  const total = cfg.curriculum.length;
  const startMs = cfg.start.getTime();
  const spanMs = Math.max(86400000, rules.end.getTime() - startMs);
  model.forEach(m => {
    m.badgePts = 0; m.expPts = 0; m.streakPts = 0; m.earlyPts = 0;
  });
  applyActivityPoints_(model, cfg);
  model.forEach(m => {
    const ok = hasScoringEvidence_(m);
    if (ok) {
      // badge points
      let ticks = 0, pts = 0, last = '';
      (m.cells || []).forEach((c, k) => {
        if (String(c).indexOf('✓') !== 0) return;
        const earned = isoToUtc_(String(c).slice(2).trim());
        if (isNaN(earned.getTime()) || earned < cfg.start || earned > rules.end) return;
        ticks++;
        const credits = parseFloat(cfg.curriculum[k] && cfg.curriculum[k].credits) || 0;
        pts += Math.max(rules.badgeMin, credits * rules.perCredit);
        const d = String(c).slice(2).trim();
        if (d > last) last = d;
      });
      pts += Math.max(0, (+m.counted || 0) - ticks) * rules.badgeMin;     // extra badges when "count only curriculum" is off
      m.badgePts = pts;

      // V9 experience points: the profile's total (absolute) experience points, 1 score point per N points
      // (Config G5, default 30), up to the cap (Config G6, default 30). No starting value, any account age. Nothing is stored.
      m.expPts = Math.min(rules.expCap, (+m.points || 0) / rules.expPer);

      // Recompute from cached eligible curriculum dates, never non-curriculum activity.
      const days = Array.from(new Set((m.cells || []).filter(c => String(c).indexOf('✓') === 0)
        .map(c => isoToUtc_(String(c).slice(2).trim()).getTime())
        .filter(t => isFinite(t) && t >= startMs && t <= rules.end.getTime()))).sort((a,b) => a-b);
      let best = 0, run = 0, prev = null;
      days.forEach(t => { run = prev !== null && t-prev === 86400000 ? run+1 : 1; best = Math.max(best,run); prev=t; });
      m.streak = best;
      m.streakPts = Math.min(rules.streakCap, best * rules.streakPer);
      m.counted = ticks;
      m.tier = tierLabel_(ticks, cfg);

      // early finish: only when every curriculum badge is done
      if (total > 0 && ticks >= total && last) {
        const frac = Math.min(1, Math.max(0, (rules.end.getTime() - isoToUtc_(last).getTime()) / spanMs));
        m.earlyPts = rules.earlyMax * frac;
      }
    }
    m.activityPts = m.activityPts || 0;
    m.score = round1_(m.badgePts + m.expPts + m.streakPts + m.earlyPts + m.activityPts);
    m.badgePts = round1_(m.badgePts); m.expPts = round1_(m.expPts); m.streakPts = round1_(m.streakPts);
    m.earlyPts = round1_(m.earlyPts); m.activityPts = round1_(m.activityPts);
  });
}
function orderOrganizerTabsV5() {
 const ss=SpreadsheetApp.getActive();
 const current=ss.getActiveSheet();
 const order=['Dashboard','Leaderboard','Group Leaderboard','Groups','Group Members','Follow-up','Form Responses 1','Activity Points','Reward Eligibility','Tracker','Config','Refresh Log','Refill Check','Bingo Approvals','Bingo Progress'];
 let position=1;
 order.forEach(name=>{const sh=ss.getSheetByName(name);if(sh){ss.setActiveSheet(sh);ss.moveActiveSheet(position++);}});
 if(current)ss.setActiveSheet(current);
}

/** V6 community approvals and nine-square Bingo. Private organizer inputs never belong in public JSON. */
const BINGO_APPROVALS='Bingo Approvals';
function ensureBingoApprovals_(){
 const ss=SpreadsheetApp.getActive();const sh=ss.getSheetByName(BINGO_APPROVALS)||ss.insertSheet(BINGO_APPROVALS);
 setValuesIfChanged_(sh.getRange('A1:H1'),[['Roll','Task ID','Status','Completion date','Private organizer note','Student (auto)','Check (auto)','Community points (auto)']]);
 sh.setFrozenRows(1);sh.getRange('A2:E1001').setBackground(STYLE.lightBlue);
 safeValidation_(sh.getRange('B2:B1001'),SpreadsheetApp.newDataValidation().requireValueInList(['credits','story','community'],true).setAllowInvalid(false).build());
 safeValidation_(sh.getRange('C2:C1001'),SpreadsheetApp.newDataValidation().requireValueInList(['Pending','Approved','Rejected'],true).setAllowInvalid(false).build());
 return sh;
}
function scoreModel_(model,cfg){
 scoreModelBase_(model,cfg);
 const ss=SpreadsheetApp.getActive();const sh=ss.getSheetByName(BINGO_APPROVALS);const approved={},people={};
 latestPersonRows_(model).forEach(m=>{(people[m.roll]=people[m.roll]||[]).push(m);});
 const seen=new Set();
 if(sh&&sh.getLastRow()>1){const rows=sh.getRange(2,1,sh.getLastRow()-1,5).getValues();const report=rows.map(r=>{
  if(!r.some(v=>v!==''&&v!==null))return['','',''];const roll=normRoll_(r[0]),task=String(r[1]||'').trim(),status=String(r[2]||'').trim();const found=people[roll]||[];
  if(found.length!==1)return['','Roll missing, unknown or ambiguous',0];const m=found[0];if(!['credits','story','community'].includes(task))return[m.name,'Choose a task ID',0];
  if(status!=='Approved')return[m.name,status==='Rejected'?'Rejected':'Pending approval',0];
  if(!(r[3] instanceof Date)||isNaN(r[3].getTime()))return[m.name,'Completion date required',0];const date=toUtcDay_(r[3]);if(date<cfg.start||date>cfg.score.end)return[m.name,'Outside event window',0];
  const key=roll+'|'+task;if(seen.has(key))return[m.name,'Duplicate approval; not awarded twice',0];seen.add(key);(approved[roll]=approved[roll]||new Set()).add(task);return[m.name,'Approved',task==='credits'?0:20];
 });setValuesIfChanged_(sh.getRange(2,6,report.length,3),report);}
 const sessions={};const act=ss.getSheetByName(SHEETS.ACTIVITY);if(act&&act.getLastRow()>=5){act.getRange(5,1,act.getLastRow()-4,8).getValues().forEach(r=>{
  if(!['OK','Attendance cap of 10 reached'].includes(String(r[6])))return;const roll=normRoll_(r[0]);(sessions[roll]=sessions[roll]||new Set()).add(String(r[1]||'').trim());
 });}
 const progress=[];
 latestPersonRows_(model).forEach(m=>{
  if(!hasScoringEvidence_(m))return;const a=approved[m.roll]||new Set(),att=sessions[m.roll]||new Set();
  const credit=a.has('credits')||m.manual[M.FOLLOW_STATUS]===REDEEMED;
  const ai=cfg.curriculum.findIndex(b=>String(b.url).indexOf('/1426')>=0);const aiDone=ai>=0&&String(m.cells[ai]||'').indexOf('✓')===0;
  const states=[m.counted>=1,credit,aiDone,att.has('kickoff-2026-10-25'),m.counted>=5,a.has('story'),Array.from(att).some(id=>id!=='kickoff-2026-10-25'),a.has('community'),m.counted>=10];
  const count=states.filter(Boolean).length;m.bingoCount=count;m.attendancePts=m.activityPts;m.communityPts=(a.has('story')?20:0)+(a.has('community')?20:0);m.bingoBonus=count===9?5:0;
  m.activityPts=round1_(m.activityPts+m.communityPts+m.bingoBonus);m.score=round1_(m.score+m.communityPts+m.bingoBonus);
  progress.push([m.name,m.roll,count,...states.map(x=>x?'Complete':'Not verified'),m.attendancePts,m.communityPts,m.bingoBonus,m.score]);
 });
 const out=ss.getSheetByName('Bingo Progress')||ss.insertSheet('Bingo Progress');
 syncTable_(out,1,1,['Name','Roll','Squares complete','First badge','Credits redeemed','AI Studio','25 October session','Five badges','Story card','Another session','GDG membership','Ten badges','Attendance points','Community points','Bingo bonus','Total score'],progress);
 out.setFrozenRows(1);
}
function enableBingoV6(){
 backupOrganizerData();ensureBingoApprovals_();const conf=SpreadsheetApp.getActive().getSheetByName(SHEETS.CONF);
 const entries=conf.getRange('F13:H40').getValues();if(!entries.some(r=>r[0]==='kickoff-2026-10-25')){const free=entries.findIndex(r=>!r[0]);if(free<0)throw new Error('No free session configuration row');conf.getRange(13+free,6,1,3).setValues([['kickoff-2026-10-25',2,'Credential redemption session,25 October2026']]);}
 runRefresh_(false);
}

/** V9: experience points score 1 per 100 of the profile's total points, capped at 30 (streak cap 7). Run once from the editor in a sheet that already ran applyEventRulesV5; it then refreshes. */
function enableExperiencePointsV9() {
  const conf = SpreadsheetApp.getActive().getSheetByName(SHEETS.CONF);
  if (!conf) throw new Error('Config missing');
  if (String(conf.getRange('F1').getValue()).trim() !== 'Scoring rule') throw new Error('Scoring rules block not found in Config F1');
  conf.getRange('G5:G7').setValues([[100], [30], [0]]);
  conf.getRange('G8:G9').setValues([[1], [7]]);
  conf.getRange('H5:H7').setValues([['Total experience points on the profile divided by this (absolute points, any account age).'], ['Most score points experience can give.'], ['Unused: total experience points count for every account.']]);
  conf.getRange('H8:H9').setValues([['Longest run of days in a row with a badge.'], ['Most score points the streak can give.']]);
  runRefresh_(false);
}
