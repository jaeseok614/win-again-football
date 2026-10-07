'use strict';
const expectedMinutes=require('./participation-test-helper.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),ST=require('./dist/statistics.js'),P=require('./dist/cup.js'),MP=require('./dist/match-performance.js'),R=require('./dist/match-review.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function finish(m,engine=F){while(m.phase!=='full'){if(!engine.running(m))engine.begin(m);engine.finishSegment(m);}return m;}
function play(s,season=S,engine=F){finish(s.match,engine);return season.settle(s);}
function pure(s,source='latest'){const before=JSON.stringify(s),r=R.read(s,{source});assert.equal(JSON.stringify(s),before);return r;}
function firstCup(seed=549){let s=S.create(seed);while(s.competition!=='cup')s=play(s);return s;}
function legacy(version=7){const ctx=vm.createContext({}),names=['engine'];if(version>=3)names.push('economy');if(version>=4)names.push('career');if(version>=5)names.push('cup');if(version>=6)names.push('health');names.push('season');for(const name of names)vm.runInContext(fs.readFileSync(path.join(__dirname,'legacy-v'+version,name+'.js'),'utf8'),ctx);return {F:ctx.Football,S:ctx.Season};}
function playersMatch(review,record){for(const p of record.players){const row=review.players.find(r=>r.id===p.id&&r.identity===p.identity);assert.ok(row);for(const key of ['minutes','goals','assists','cleanSheets'])assert.equal(row[key],p[key]);assert.equal(row.started,p.started);assert.equal(row.apps,p.minutes>0?1:0);assert.equal(row.name,F.identityProfile(p.identity).name);}}

test('fresh, unfinished and unknown sources return honest unavailable reasons',()=>{
 const s=S.create(1401);assert.equal(pure(s).valid,false);assert.match(pure(s).reason,/아직 확정/);assert.equal(pure(s,'pending').valid,false);F.begin(s.match);F.finishSegment(s.match);assert.equal(pure(s,'pending').valid,false);assert.equal(R.read(s,{source:'unknown'}).valid,false);assert.equal(R.read(null).valid,false);
});

test('pending ninety-minute reviews expose actual contributions but no applied cash, growth or injuries',()=>{
 const s=S.create(121);finish(s.match);const r=pure(s,'pending');assert.equal(r.valid,true);assert.equal(r.pending,true);assert.equal(r.confirmed,false);assert.equal(r.legacy,false);assert.equal(r.id,'match-1-1');assert.deepEqual(r.score,s.match.score);assert.equal(r.cashflow,null);assert.equal(r.rank,null);assert.equal(r.points,null);assert.deepEqual(r.growth,[]);assert.deepEqual(r.injuries,[]);assert.deepEqual(r.recovered,[]);assert.equal(r.healthAligned,false);assert.equal(r.players.reduce((n,p)=>n+p.minutes,0),expectedMinutes(s.match));assert.equal(r.events.length,F.goalAttributions(s.match).length);assert.equal(r.players.reduce((n,p)=>n+p.goals,0),s.match.score[0]);assert.equal(ST.summary(s).matches,0);assert.equal(s.finance.ledger.length,0);
});

test('confirmation aligns league score, fixture, rank, receipt and real individual records',()=>{
 let s=S.create(1402);finish(s.match);const full=copy(s.match);s=S.settle(s);const r=pure(s),record=ST.lastMatch(s);assert.equal(r.valid,true);assert.equal(r.confirmed,true);assert.equal(r.pending,false);assert.equal(r.legacy,false);assert.equal(r.limited,false);assert.deepEqual(r.score,full.score);assert.equal(r.id,record.id);assert.equal(r.opponent.id,s.lastReport.opponent);assert.equal(r.venue.isHome,record.home===S.own);assert.equal(r.rank,s.lastReport.rank);assert.equal(r.points,s.lastReport.points);assert.deepEqual(r.cashflow,s.finance.ledger.find(e=>e.id===record.id));playersMatch(r,record);assert.deepEqual(r.events,record.events);assert.equal(r.healthAligned,true);assert.deepEqual(r.injuries,s.health.lastReport.incidents.map(row=>({...row,name:F.identityProfile(row.identity).name,pos:F.identityProfile(row.identity).pos,no:F.roster.find(p=>p.id===row.id).no,owned:true,slot:row.id})));
});

test('substitution minutes, starts and display-only ratings remain exact without player awards',()=>{
 let s=S.create(128);F.begin(s.match);F.finishSegment(s.match);F.swap(s.match,'f1','f3');F.begin(s.match);F.finishSegment(s.match);F.swap(s.match,'m4','m5');F.swap(s.match,'g1','g2');finish(s.match);const pending=pure(s,'pending');assert.equal(pending.substitutions.length,3);assert.deepEqual(pending.substitutions.map(change=>[change.minute,change.out.id,change.incoming.id]),[[45,'f1','f3'],[65,'m4','m5'],[65,'g1','g2']]);s=S.settle(s);const r=pure(s);for(const [id,minutes,started] of [['f1',45,true],['f3',45,false],['m4',65,true],['m5',25,false],['g1',65,true],['g2',25,false]]){const p=r.players.find(p=>p.id===id);assert.equal(p.minutes,minutes);assert.equal(p.started,started);assert.equal(pending.players.find(p=>p.id===id).minutes,minutes);assert.ok(pending.performance.rows.find(row=>row.id===id).rating>=3);assert.equal('rating' in p,false);}assert.equal(r.players.filter(p=>p.played).length,14);assert.equal(r.performance.rows.length,14);assert.deepEqual(r.substitutions,[]);assert.equal('motm' in r,false);
});

test('Cup shootouts are oriented to our club and do not become individual goals',()=>{
 let s=firstCup(549);finish(s.match);assert.deepEqual(s.match.score,[1,1]);const result=P.preview(s,s.match),pending=pure(s,'pending'),oriented=result.home===S.own?result.penalties:[result.penalties[1],result.penalties[0]];assert.equal(pending.competition,'cup');assert.equal(pending.round,4);assert.equal(pending.stage,0);assert.deepEqual(pending.penalties,oriented);assert.equal(pending.winner,result.winner);assert.equal(pending.players.reduce((n,p)=>n+p.goals,0),1);s=S.settle(s);const r=pure(s);assert.equal(r.valid,true);assert.equal(r.id,'cup-1-0');assert.deepEqual(r.penalties,oriented);assert.equal(r.winner,result.winner);assert.equal(r.cashflow.type,'cup');assert.equal(r.players.reduce((n,p)=>n+p.goals,0),1);assert.equal(r.events.length,1);assert.equal(r.healthAligned,true);
});

test('growth is shown only for a matching played identity in the same confirmed report',()=>{
 let s=S.create(1403);for(const p of Object.values(s.squad))p.xp=180;s=play(s);const r=pure(s);assert.equal(r.growth.length,11);for(const change of r.growth){assert.equal(change.gained,1);assert.equal(change.key,F.roleKey(F.identityProfile(change.identity)));assert.ok(r.players.some(p=>p.id===change.id&&p.identity===change.identity&&p.minutes===90));}
 const wrong=copy(s);wrong.lastReport.changes=[{id:'f2',identity:'t_f2',key:'attack',gained:1},{id:'f3',identity:'f3',key:'attack',gained:1},{id:'f1',identity:'f1',key:'attack',gained:2}];assert.deepEqual(pure(wrong).growth,[]);const cross=copy(s);cross.lastReport.round++;assert.equal(pure(cross).valid,false);
});

test('a departed player keeps their actual match identity and face mapping without becoming their replacement',()=>{
 let s=S.create(1404);s.squad.f1.xp=180;s=play(s);const old=pure(s).players.find(p=>p.identity==='f1');s=S.recruit(s,'t_f2','f1');const r=pure(s),departed=r.players.find(p=>p.identity==='f1');assert.equal(departed.name,F.identityProfile('f1').name);assert.equal(departed.owned,false);assert.equal(departed.slot,null);assert.equal(departed.minutes,old.minutes);assert.equal(r.players.some(p=>p.identity==='t_f2'),false);const growth=r.growth.find(p=>p.identity==='f1');assert.ok(growth);assert.equal(growth.owned,false);assert.equal(growth.slot,null);
});

test('cross-match league, Cup, receipt and score mismatches are rejected instead of mixed',()=>{
 const s=play(S.create(1405));for(const mutate of [x=>x.lastReport.competition='cup',x=>x.lastReport.round++,x=>x.lastReport.opponent='norhaven',x=>x.lastReport.fixturehome=x.lastReport.fixturehome===S.own?'norhaven':S.own,x=>x.lastReport.score[0]++,x=>x.lastReport.cashflow.id='cup-1-0',x=>x.statistics.records[0].score[0]++,x=>x.lastReport.year=2]){const bad=copy(s);mutate(bad);assert.equal(pure(bad).valid,false);}
 let cup=firstCup();cup=play(cup);const bad=copy(cup);bad.lastReport.stage++;assert.equal(pure(bad).valid,false);const stale=copy(cup);stale.statistics.records.pop();assert.equal(pure(stale).valid,false);
});

test('legacy completed league and Cup results expose limited facts without inventing old scorers',()=>{
 const old=legacy();let league=old.S.create(1406);for(let i=0;i<3;i++)league=play(league,old.S,old.F);const migrated=S.restore(copy(league)),r=pure(migrated);assert.equal(r.valid,true);assert.equal(r.legacy,true);assert.equal(r.limited,true);assert.equal(r.confirmed,true);assert.deepEqual(r.score,migrated.lastReport.score);assert.deepEqual(r.players,[]);assert.deepEqual(r.events,[]);assert.equal(r.leader,null);assert.equal(r.coverage.unassignedGoals,r.score[0]);assert.deepEqual(r.cashflow,migrated.lastReport.cashflow);assert.equal(ST.summary(migrated).matches,0);
 let cup=old.S.create(549);while(cup.competition!=='cup')cup=play(cup,old.S,old.F);cup=play(cup,old.S,old.F);const oldCup=S.restore(copy(cup)),cupReview=pure(oldCup);assert.equal(cupReview.valid,true);assert.equal(cupReview.legacy,true);assert.equal(cupReview.competition,'cup');assert.equal(cupReview.stage,0);assert.deepEqual(cupReview.penalties,oldCup.lastReport.penalties);assert.deepEqual(cupReview.cashflow,oldCup.lastReport.cashflow);assert.deepEqual(cupReview.players,[]);
});

test('saves predating finance retain a confirmed result while unknown cash stays empty',()=>{
 const old=legacy(2);let raw=old.S.create(1407);for(let i=0;i<3;i++)raw=play(raw,old.S,old.F);const s=S.restore(copy(raw));assert.equal(s.finance.ledger.length,0);const r=pure(s);assert.equal(r.valid,true);assert.equal(r.legacy,true);assert.equal(r.id,'match-1-3');assert.deepEqual(r.score,s.lastReport.score);assert.equal(r.cashflow,null);assert.deepEqual(r.players,[]);
});

test('migrated halftime goals remain unassigned while resumed attributions stay real',()=>{
 const old=legacy();const raw=old.S.create(121);old.F.begin(raw.match);old.F.finishSegment(raw.match);let s=S.restore(copy(raw));finish(s.match);const pending=pure(s,'pending');assert.equal(pending.coverage.statisticsOriginMinute,45);assert.equal(pending.limited,true);assert.equal(pending.coverage.unassignedGoals,raw.match.score[0]);assert.equal(pending.events.length,s.match.score[0]-raw.match.score[0]);s=S.settle(s);const r=pure(s);assert.equal(r.legacy,false);assert.equal(r.limited,true);assert.equal(r.coverage.statisticsOriginMinute,45);assert.equal(r.coverage.unassignedGoals,raw.match.score[0]);assert.equal(r.players.reduce((n,p)=>n+p.goals,0),r.events.length);
});

test('health events are aligned by completed-match context and never leak into pending games',()=>{
 let s=S.create(604);for(const p of Object.values(s.squad)){p.energy=5;s.match.players[p.id].energy=5;s.match.players[p.id].initialEnergy=5;}F.setTactic(s.match,'press');s=play(s);const r=pure(s);assert.ok(r.injuries.length>0);assert.equal(r.healthAligned,true);assert.equal(r.injuries.length,s.health.lastReport.incidents.length);const stale=copy(s);stale.health.lastReport.round--;assert.equal(pure(stale).healthAligned,false);assert.deepEqual(pure(stale).injuries,[]);finish(s.match);const pending=pure(s,'pending');assert.deepEqual(pending.injuries,[]);assert.deepEqual(pending.recovered,[]);assert.deepEqual(pending.growth,[]);s=S.settle(s);if(!s.health.lastReport.recovered.length)s=play(s);const returned=pure(s);assert.ok(returned.recovered.length>0);assert.equal(returned.recovered.length,s.health.lastReport.recovered.length);for(const p of returned.recovered)assert.equal(p.name,F.identityProfile(p.identity).name);const mismatched=copy(s);mismatched.health.lastReport.competition='cup';assert.deepEqual(pure(mismatched).recovered,[]);
});

test('positive contribution leaders preserve every tie and never invent a sole best player',()=>{
 let tied=null,empty=null,keeper=null;for(let seed=1450;seed<1550&&(!tied||!empty||!keeper);seed++){const s=S.create(seed);finish(s.match);const r=pure(s,'pending');if(r.leader?.kind==='goals'&&r.leader.tied)tied=r;if(!r.leader)empty=r;if(r.leader?.kind==='cleanSheets')keeper=r;}assert.ok(tied);assert.ok(tied.leader.players.length>1);assert.ok(tied.leader.players.every(p=>p.goals===tied.leader.value));assert.ok(empty);assert.equal(empty.score[0],0);assert.equal(empty.leader,null);assert.ok(keeper);assert.equal(keeper.score[0],0);assert.equal(keeper.score[1],0);assert.equal(keeper.leader.players[0].pos,'GK');
});

test('new seasons clear latest reports and returned recap objects are detached in browser UMD',()=>{
 let s=play(S.create(1408));const r=pure(s),before=JSON.stringify(s);r.score[0]=999;r.cashflow.amount=999;r.players[0].minutes=999;r.events.push({});r.coverage.partial=true;assert.equal(JSON.stringify(s),before);const ctx=vm.createContext({Football:F,Season:S,Statistics:ST,Cup:P,MatchPerformance:MP});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/match-review.js'),'utf8'),ctx);assert.deepEqual(JSON.parse(JSON.stringify(ctx.MatchReview.read(s))),R.read(s));while(s.match)s=play(s);s=S.nextSeason(s);assert.equal(pure(s).valid,false);assert.equal(pure(s,'pending').valid,false);assert.equal(s.version,10);assert.equal(s.match.version,5);
});
console.log('Validated '+groups+' match review groups, including confirmed context alignment, honest legacy coverage and pending previews.');
