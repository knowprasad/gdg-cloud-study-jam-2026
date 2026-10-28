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
    'Equal group scores share a rank. XP does not break ties. Members are the students you assigned to the group in Follow-up; ' +
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