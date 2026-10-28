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
  const key=roll+'|'+task;if(seen.has(key))return[m.name,'Duplicate approval; not awarded twice',0];seen.add(key);(approved[roll]=approved[roll]||new Set()).add(task);return[m.name,'Approved',task==='credits'?0:2];
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
  const count=states.filter(Boolean).length;m.attendancePts=m.activityPts;m.communityPts=(a.has('story')?2:0)+(a.has('community')?2:0);m.bingoBonus=count===9?5:0;
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
