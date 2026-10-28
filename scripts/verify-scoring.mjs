import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {scoreProgress} from '../src/scoring.js';
import {courses,participants} from '../src/data.js';
const c=vm.createContext({console,SpreadsheetApp:{getActive:()=>({getSheetByName:()=>null})}});
for(const f of ['Code.gs','Group.gs','Scoring.gs'])vm.runInContext(fs.readFileSync('apps-script/'+f,'utf8'),c);
const result=vm.runInContext(`(()=>{
 const cfg={start:new Date(Date.UTC(2026,8,14)),onlyCurr:true,bottle:5,kit:10,curriculum:[{name:'Test Badge',credits:4}],score:{end:new Date(Date.UTC(2026,10,22)),badgeMin:4,perCredit:1,expPer:30,expCap:0,oldPct:0,streakPer:1,streakCap:7,earlyMax:15,activities:[]}};
 const make=(v={})=>Object.assign({status:'OK',roll:'2026IMT001',name:'Test',manual:Array(10).fill(''),cells:['✓ 2026-10-20'],counted:1,points:1800,baseline:0,any:1,since:2026,checked:new Date(),streak:3},v);
 const a=make(),b=make({status:'Unreachable (HTTP 503)'}),z=make({cells:[],counted:0});scoreModel_([a,b,z],cfg);
 const after=parseProfile_('Member since 2026 100 points Test Badge Earned Nov 23 2026',cfg.curriculum,cfg.start,cfg.score.end);
 const groups=groupStats_([{group:'A',score:100,counted:1,points:0,status:'OK'},{group:'A',score:0,counted:0,points:0,status:'OK'}],[],cfg);
 return {score:a.score,cached:b.score,xp:a.expPts,after:after.perBadge[0].inWindow,zeroIncluded:leaderboardData_([a,b,z],cfg).rows.length,groupAverage:groups[0].gscore};
})()`,c);
assert.equal(result.score,result.cached);assert.equal(result.xp,0);assert.equal(result.after,false);assert.equal(result.zeroIncluded,3);assert.equal(result.groupAverage,50);
const completions=courses.map(c=>({id:c.id,date:'2026-10-20'}));
const full=scoreProgress(completions,Array.from({length:8},(_,i)=>({id:'s'+i,date:'2026-10-21'})),courses);
assert.equal(full.badges,69);assert.equal(full.attendance,10);assert.equal(full.xp,0);
assert.equal(scoreProgress([{id:courses[0].id,date:'2026-11-23'}],[],courses).total,0);
assert.equal(scoreProgress([{id:courses[0].id,date:'2026-11-22'}],[],courses).badges,4);
assert.equal(scoreProgress([],[],courses).total,0);
assert.equal(scoreProgress([], [{id:'same',date:'2026-10-20'},{id:'same',date:'2026-10-21'}],courses).attendance,2);
for(const p of participants)assert.equal(p.points,Number((p.scoreBreakdown.badges+p.scoreBreakdown.streak+p.scoreBreakdown.earlyFinish+p.scoreBreakdown.attendance).toFixed(1)));
console.log('PASS: cached results, end cutoff, zero learners, guild average, XP off, badge minimum, attendance dedup/cap, all500 breakdown totals',result);

const attendanceResult=vm.runInContext(`(()=>{
 const rows=Array.from({length:7},(_,i)=>['2026IMT001','Session '+i,'',new Date(Date.UTC(2026,9,20)),'']);
 rows.push(rows[0].slice());rows.push(['2026IMT001','Session 7','',new Date(Date.UTC(2026,10,23)),'']);
 const reports=[];SpreadsheetApp={getActive:()=>({getSheetByName:()=>({getLastRow:()=>4+rows.length,getRange:()=>({getValues:()=>rows})})})};
 setValuesIfChanged_=(_r,values)=>reports.push(values);
 const m={status:'OK',roll:'2026IMT001',name:'Test Learner',ts:new Date(),activityPts:0};
 applyActivityPoints_([m],{start:new Date(Date.UTC(2026,8,14)),score:{end:new Date(Date.UTC(2026,10,22)),activities:Array.from({length:8},(_,i)=>({name:'Session '+i,points:2}))}});
 return {points:m.activityPts,reports:reports[0]};
})()`,c);
assert.equal(attendanceResult.points,10);assert.equal(attendanceResult.reports[7][2],0);assert.match(attendanceResult.reports[8][1],/outside/);
console.log('PASS Apps Script attendance: session IDs deduplicated, date cutoff enforced, cap10');
