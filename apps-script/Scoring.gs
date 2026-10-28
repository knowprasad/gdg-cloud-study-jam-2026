/**
 * V5 event rules adopted 28 Oct 2026.
 * Score = curriculum badge points + best curriculum streak + early completion + attendance.
 * XP is display-only. Attendance is 2 per unique dated session, capped at 10.
 * Failed profile updates retain cached verified evidence. Form Responses 1 is never modified.
 */

const SCORING_RULES = [
  ['Program end date', new Date(Date.UTC(2026, 10, 22)), 'Early-finish points fall evenly to 0 on this date.'],
  ['Minimum points for a badge', 4, 'A badge worth fewer credits (for example 0) still scores at least this.'],
  ['Points per badge credit', 1, 'Badge points = credits x this number (but never below the minimum).'],
  ['Experience points per 1 score point', 30, 'Gained experience points are divided by this.'],
  ['Experience score cap', 0, 'XP is display-only under V5; no competitive points.'],
  ['Old account with no starting value: % of lifetime points counted', 0, 'Unused under V5; XP never affects rank.'],
  ['Points per day of badge streak', 1, 'Longest run of days in a row with a badge.'],
  ['Streak score cap', 7, 'Most score points the streak can give.'],
  ['Early-finish bonus (maximum)', 15, 'Only for finishing all curriculum badges; shrinks the later they finish.']
];
// Dummy activities: replace the names and points with your own (F13:G17; you can add more rows below, up to row 40).
const DEFAULT_ACTIVITIES = []; // Add real attendance sessions only, each worth 2 points.
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
    if (m.status === DUP) return false;
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
    if (!act || defaults[normText_(act)] !== 2) return [m.name, 'Choose a configured attendance session worth 2 points', 0];
    if (typed !== null && (!isFinite(typed) || typed !== 2)) return [m.name, 'Attendance is fixed at 2 points per session', 0];
    if (!(r[3] instanceof Date) || isNaN(r[3].getTime())) return [m.name, 'Enter the actual session date', 0];
    const date = toUtcDay_(r[3]);
    if (date < cfg.start || date > cfg.score.end) return [m.name, 'Session is outside the event window', 0];
    const pts = 2;
    const dupKey = roll + '|' + normText_(act);
    if (act && seen[dupKey] !== undefined) return [m.name, 'Same activity already given in row ' + seen[dupKey] + ' - not counted again', 0];
    if (act) seen[dupKey] = ACT_FIRST_ROW + i;
    const counted = Math.min(pts, Math.max(0, 10 - m.activityPts));
    m.activityPts += counted;
    return [m.name, counted ? 'OK' : 'Attendance cap of 10 reached', counted];
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

function scoreModel_(model, cfg) {
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

      // Lifetime XP is display-only; preserve historical baseline cells untouched.
      m.expPts = 0;

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