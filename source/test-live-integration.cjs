'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),ST=require('./dist/statistics.js'),E=require('./dist/economy.js'),P=require('./dist/cup.js'),H=require('./dist/health.js'),Review=require('./dist/match-review.js');
const copy=value=>JSON.parse(JSON.stringify(value));let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function finish(m,engine=F){while(m.phase!=='full'){if(!engine.running(m))engine.begin(m);engine.finishSegment(m);}return m;}
function plainSettle(s){finish(s.match);return S.settle(s);}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value;}
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
// Project optional migration metadata out of the shipped campaign golden only.
function shippedCampaignFields(value){const out=copy(value);out.version=8;delete out.staff;delete out.europe;delete out.clubLife;for(const row of out.history||[])delete row.europeChampion;return out;}
function replacement(m,pos,protectedId){const outgoing=m.lineup.find(id=>m.players[id].pos===pos&&id!==protectedId),incoming=Object.keys(m.players).find(id=>m.players[id].pos===pos&&!m.lineup.includes(id)&&!m.out.includes(id)&&F.isAvailable(m.players[id]));return outgoing&&incoming?{outgoing,incoming}:null;}
function possible(m,protectedId){return ['FW','MID','GK'].every(pos=>replacement(m,pos,protectedId));}
function assertCoverage(m){
 let end=0;for(const seg of m.segments){assert.equal(seg.start,end);assert.ok(Number.isInteger(seg.end)&&seg.end>seg.start);assert.ok(![45,65].some(boundary=>seg.start<boundary&&seg.end>boundary));end=seg.end;}
 assert.equal(end,90);assert.ok(m.segments.length>3);assert.equal(Object.values(m.players).reduce((n,p)=>n+p.minutes,0),990);
 for(const p of Object.values(m.players))assert.equal(p.minutes,m.segments.reduce((n,seg)=>n+(seg.lineup.includes(p.id)?seg.end-seg.start:0),0));
 for(const event of F.goalAttributions(m)){const seg=m.segments.find(seg=>event.minute>seg.start&&event.minute<=seg.end);assert.ok(seg.lineup.includes(event.scorerId));assert.equal(m.players[event.scorerId].identity,event.scorerIdentity);if(event.assistId!==null){assert.ok(seg.lineup.includes(event.assistId));assert.equal(m.players[event.assistId].identity,event.assistIdentity);}}
}
function playLive(input,{restore=false,protectedId}={}){
 let s=copy(input),swaps=[];F.begin(s.match);
 while(s.match.phase!=='full'){
  const m=s.match;if(!F.running(m)){assert.ok(['half','late'].includes(m.phase));F.begin(m);}
  if([11,31,57,79].includes(m.minute)){const tactic={11:'press',31:'counter',57:'press',79:'balanced'}[m.minute];if(m.minute===31)m.paused=true;F.setTactic(m,tactic);}
  if([23,49,71].includes(m.minute)){const pos={23:'FW',49:'MID',71:'GK'}[m.minute],pair=replacement(m,pos,protectedId);assert.ok(pair,'A healthy same-position reserve must exist.');F.swap(m,pair.outgoing,pair.incoming);swaps.push({...pair,minute:m.minute});}
  if(restore&&[31,49,71].includes(m.minute)){
   const before=copy(s),restored=S.restore(copy(s));assert.deepEqual(restored.match.segments,m.segments);assert.deepEqual(restored.match.decisions,m.decisions);assert.equal(restored.match.rng,m.rng);assert.equal(restored.match.minute,m.minute);assert.equal(restored.match.paused,true);
   assert.equal(JSON.stringify(s),JSON.stringify(before));s=restored;
  }
  s.match.paused=false;F.tick(s.match);
 }
 assertCoverage(s.match);return {season:s,swaps};
}
function leagueScenario(){
 for(let seed=1;seed<=100;seed++){
  let baseline=S.create(seed);for(let n=0;n<2;n++)baseline=plainSettle(baseline);S.train(baseline,'recovery');if(!possible(baseline.match))continue;
  const uninterrupted=playLive(baseline),events=F.goalAttributions(uninterrupted.season.match),fw=uninterrupted.swaps[0];
  if(!events.some(event=>event.minute>fw.minute&&event.scorerId===fw.incoming)||!events.some(event=>event.assistIdentity!==null))continue;
  return {seed,baseline,uninterrupted};
 }
 assert.fail('A deterministic real league scenario must score through the substituted forward and include an assist.');
}
function cupScenario(){
 for(let seed=1;seed<=100;seed++){
  let baseline=S.create(seed),valid=true;
  for(let n=0;n<12;n++){
   if(!F.isAvailable(baseline.match.players.m1)||!F.isAvailable(baseline.match.players.m5)){valid=false;break;}
   S.train(baseline,'recovery');if(!baseline.match.lineup.includes('m1')){const mid=baseline.match.lineup.includes('m5')?'m5':baseline.match.lineup.find(id=>baseline.match.players[id].pos==='MID');F.swap(baseline.match,mid,'m1');}
   F.begin(baseline.match);F.finishSegment(baseline.match);if(n<11){if(baseline.match.lineup.includes('m5')){valid=false;break;}if(baseline.match.discipline.events.some(e=>e.team===0&&e.card==='red'&&e.id==='m1')){valid=false;break;}F.swap(baseline.match,'m1','m5');}finish(baseline.match);baseline=S.settle(baseline);if(baseline.competition==='cup')break;
  }
  if(!valid||!F.isAvailable(baseline.match.players.m1)||!baseline.match.lineup.includes('m1')||!possible(baseline.match,'m1'))continue;
  assert.equal(baseline.competition,'cup');assert.equal(baseline.squad.m1.xp,45*(baseline.cup.calendarRounds[0]-1)+90);
  const uninterrupted=playLive(baseline,{protectedId:'m1'}),fw=uninterrupted.swaps[0];if(!F.goalAttributions(uninterrupted.season.match).some(event=>event.minute>fw.minute&&event.scorerId===fw.incoming))continue;
  return {seed,baseline,uninterrupted};
 }
 assert.fail('A deterministic real Cup scenario must score after the forward substitution.');
}
function assertConfirmed(baseline,finished,confirmed){
 const match=finished.match,record=ST.lastMatch(confirmed),receipt=confirmed.finance.ledger.find(row=>row.id===record.id);
 assert.deepEqual(record.score,match.score);assert.deepEqual(record.segments,match.segments.map(({start,end,lineup})=>({start,end,lineup})));assert.equal(record.unassignedGoals,0);assert.equal(record.minutes,990);assert.equal(record.events.length,match.score[0]);
 assert.equal(confirmed.statistics.records.length,baseline.statistics.records.length+1);assert.equal(confirmed.finance.ledger.filter(row=>row.id===record.id).length,1);assert.equal(confirmed.health.playedGames,baseline.health.playedGames+1);
 for(const p of Object.values(match.players)){
  const old=baseline.squad[p.id],next=confirmed.squad[p.id],key=F.roleKey(p),gain=Math.min(old.potential,old[key]+Math.floor((old.xp+p.minutes)/270)-Math.floor(old.xp/270))-old[key];
  assert.equal(next.xp,old.xp+p.minutes);assert.equal(next[key],old[key]+gain);assert.equal(confirmed.career.minutes[p.identity],baseline.career.minutes[p.identity]+p.minutes);assert.equal(record.players.find(row=>row.id===p.id).minutes,p.minutes);
  if(gain)assert.ok(confirmed.lastReport.changes.some(change=>change.identity===p.identity&&change.gained===gain));
 }
 const delta=confirmed.finance.ledger.slice(baseline.finance.ledger.length).reduce((n,row)=>n+row.amount,0);assert.equal(confirmed.finance.balance,baseline.finance.balance+delta);assert.ok(receipt);
 const pending=Review.read(finished,{source:'pending'}),latest=Review.read(confirmed,{source:'latest'});assert.equal(pending.valid,true);assert.equal(latest.valid,true);assert.deepEqual(latest.score,record.score);assert.equal(latest.players.reduce((n,p)=>n+p.minutes,0),990);assert.equal(latest.cashflow.id,receipt.id);
 assert.deepEqual(S.restore(copy(confirmed)),confirmed);return {record,receipt,pending,latest};
}

test('live league tactics and three substitutions retain attribution, growth and receipts across multiple restores',()=>{
 const {seed,baseline,uninterrupted}=leagueScenario(),resumed=playLive(baseline,{restore:true});assert.deepEqual(resumed.season,uninterrupted.season);
 assert.equal(ST.summary(resumed.season).matches,baseline.statistics.records.length);assert.equal(resumed.season.finance.balance,baseline.finance.balance);
 const finished=resumed.season,confirmed=S.settle(finished),r=assertConfirmed(baseline,finished,confirmed);assert.deepEqual(confirmed,S.settle(uninterrupted.season));assert.equal(confirmed.round,baseline.round+1);assert.equal(r.record.competition,'league');assert.equal(r.receipt.type,'match');assert.ok(confirmed.lastReport.changes.length>0);
 for(const {outgoing,incoming,minute} of resumed.swaps){assert.equal(finished.match.players[outgoing].minutes,minute);assert.equal(finished.match.players[incoming].minutes,90-minute);assert.equal(r.record.players.find(p=>p.id===incoming).started,false);}
 for(const p of Object.values(finished.match.players)){const pressMinutes=finished.match.segments.filter(seg=>seg.tactic==='press'&&seg.lineup.includes(p.id)).reduce((n,seg)=>n+seg.end-seg.start,0),expected=p.minutes<30?0:Math.min(.20,Math.max(0,(.01+Math.max(0,60-p.energy)*.0025+pressMinutes/90*.02)*(p.minutes/90)));assert.equal(H.riskFor(finished.match,p),expected);}
 const before=JSON.stringify(confirmed);assert.throws(()=>S.settle(confirmed));assert.equal(JSON.stringify(confirmed),before);console.log('  fixture league seed '+seed+' / '+finished.match.segments.length+' real segments');
});

test('live Cup decisions preserve regulation statistics, real experience growth and one Cup receipt',()=>{
 const {seed,baseline,uninterrupted}=cupScenario(),resumed=playLive(baseline,{restore:true,protectedId:'m1'});assert.deepEqual(resumed.season,uninterrupted.season);
 const finished=resumed.season,preview=P.preview(finished,finished.match),confirmed=S.settle(finished),r=assertConfirmed(baseline,finished,confirmed);assert.deepEqual(confirmed,S.settle(uninterrupted.season));assert.equal(confirmed.round,baseline.round);assert.deepEqual(confirmed.results,baseline.results);assert.deepEqual(S.standings(confirmed),S.standings(baseline));
 assert.equal(r.record.competition,'cup');assert.equal(r.receipt.type,'cup');assert.equal(r.receipt.winner,preview.winner);assert.equal(r.receipt.advanceBonus,preview.winner===S.own?E.rates(baseline).cupBonuses[preview.stage]:0);assert.equal(confirmed.squad.m1.xp,baseline.squad.m1.xp+90);assert.equal(confirmed.squad.m1.passing,Math.min(baseline.squad.m1.potential,baseline.squad.m1.passing+Math.floor((baseline.squad.m1.xp+90)/270)-Math.floor(baseline.squad.m1.xp/270)));assert.equal(r.record.events.length,finished.match.score[0]);assert.equal(ST.summary(confirmed,'cup').matches,1);
 console.log('  fixture Cup seed '+seed+' / '+finished.match.segments.length+' real segments');
});



 console.log('Live integration tests passed: '+checks+' groups.');
