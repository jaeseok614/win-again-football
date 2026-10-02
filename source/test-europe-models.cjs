'use strict';
const assert=require('node:assert/strict');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),U=require('./dist/europe.js'),E=require('./dist/economy.js'),C=require('./dist/career.js'),H=require('./dist/health.js'),ST=require('./dist/statistics.js'),K=require('./dist/staff.js'),MR=require('./dist/match-review.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function finish(m){while(m.phase!=='full'){if(!F.running(m))F.begin(m);F.finishSegment(m);}return m;}
function play(s){finish(s.match);return S.settle(s);}
function complete(s){while(s.match)s=play(s);return s;}
function minute(s,target){while(s.match.minute<target){if(!F.running(s.match))F.begin(s.match);F.tick(s.match);}return s;}
function ownResults(s){return s.europe.results.filter(r=>r.home===S.own||r.away===S.own);}
 function normalizedSummary(sum){return {...sum,players:sum.players.filter(p=>p.apps).sort((a,b)=>a.identity.localeCompare(b.identity))};}
function atomic(s,action){const before=JSON.stringify(s);assert.throws(()=>action(s));assert.equal(JSON.stringify(s),before);}
function qualify(){
 let s=S.create(12);for(const p of Object.values(s.squad)){for(const key of ['attack','defense','passing','speed','endurance','keeping'])p[key]=s.match.players[p.id][key]=99;p.potential=s.match.players[p.id].potential=99;s.career.baselines[p.identity]=99;}
 F.setFormation(s.match,'433');F.setTactic(s.match,'press');s=S.nextSeason(complete(s));assert.equal(s.league.division,1);s=S.nextSeason(complete(s));assert.equal(s.year,3);assert.equal(s.europe.enabled,true);assert.doesNotThrow(()=>S.restore(copy(s)));return s;
}
const qualified=qualify();
function firstEurope(staff=false){let s=copy(qualified);if(staff)for(const role of ['FW','MED'])K.hire(s,K.candidates(s).find(p=>p.role===role&&p.tier===1).id);while(s.competition!=='europe')s=play(s);return s;}

test('qualification follows a real upper-division season and keeps old campaigns intact',()=>{
 assert.equal(qualified.history[0].division,2);assert.equal(qualified.history[1].division,1);assert.ok(qualified.history[1].rank<=2);assert.deepEqual(qualified.europe.qualification,{year:2,division:1,rank:qualified.history[1].rank});
 const raw=copy(qualified);delete raw.europe;delete raw.health.originEuropeGames;const s=S.restore(raw);assert.equal(s.europe.enabled,false);assert.equal(s.europe.legacy,true);for(const key of ['match','cup','finance','career','health','statistics','squad'])assert.deepEqual(s[key],raw[key]);assert.equal(s.version,8);
});

test('European preparation blocks weekly training, scouting, transfers and staff actions atomically',()=>{
 const s=firstEurope();assert.equal(s.round,2);assert.equal(s.europe.stage,0);atomic(s,x=>S.train(x,'technique'));atomic(s,x=>E.recruit(x,'t_f2','f1'));atomic(s,x=>C.scout(x,'FW'));atomic(s,x=>E.payScout(x,'FW',1));atomic(s,x=>K.hire(x,K.candidates(x)[0].id));assert.equal(ST.summary(s,'europe').matches,0);
});

test('a pending international review has actual player contributions without premature receipts',()=>{
 const s=firstEurope(),before=copy(s);finish(s.match);const d=MR.read(s,{source:'pending'});assert.equal(d.valid,true);assert.equal(d.competition,'europe');assert.equal(d.stage,0);assert.equal(d.round,2);assert.equal(d.cashflow,null);assert.equal(d.players.reduce((n,p)=>n+p.minutes,0),990);assert.deepEqual(d.score,s.match.score);assert.equal(s.finance.ledger.length,before.finance.ledger.length);assert.equal(ST.summary(s,'europe').matches,0);assert.equal(s.health.playedGames,before.health.playedGames);
});

test('confirmation adds exact gate and prize income without domestic rounds or payroll',()=>{
 let s=firstEurope(true);finish(s.match);const before=copy(s),result=U.preview(s,s.match),ownScore=result.home===S.own?result.goals:[result.goals[1],result.goals[0]];s=S.settle(s);const receipt=s.finance.ledger.find(e=>e.id==='europe-3-0');assert.equal(receipt.type,'europe');assert.equal(receipt.stage,result.stage);assert.equal(receipt.index,result.index);assert.deepEqual(receipt.goals,result.goals);assert.deepEqual(receipt.penalties,result.penalties);assert.deepEqual(receipt.kicks,result.kicks);assert.equal(receipt.gate,result.home===S.own?26000:9000);assert.equal(receipt.matchBonus,ownScore[0]>ownScore[1]?20000:ownScore[0]===ownScore[1]?8000:0);assert.equal(receipt.advanceBonus,0);assert.equal(receipt.amount,receipt.gate+receipt.matchBonus);assert.equal(s.finance.balance-before.finance.balance,receipt.amount);assert.ok(!Object.hasOwn(receipt,'payroll'));
 assert.equal(s.round,before.round);assert.deepEqual(s.results,before.results);assert.deepEqual(s.staff,before.staff);assert.equal(s.finance.ledger.filter(e=>e.type==='staff-wages').length,before.finance.ledger.filter(e=>e.type==='staff-wages').length);assert.equal(K.active(s,'FW').remaining,K.active(before,'FW').remaining);assert.equal(C.progress(s).wins,C.progress(before).wins);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('actual international minutes and experience reconcile health, career and player statistics',()=>{
 let s=firstEurope();finish(s.match);const before=copy(s),played=copy(s.match.players);s=S.settle(s);assert.equal(s.health.playedGames,before.health.playedGames+1);assert.equal(s.health.lastReport.competition,'europe');assert.equal(s.health.lastReport.round,2);assert.equal(ST.summary(s,'europe').matches,1);assert.equal(ST.summary(s,'europe').minutes,990);assert.equal(Object.values(s.career.minutes).reduce((n,v)=>n+v,0)-Object.values(before.career.minutes).reduce((n,v)=>n+v,0),990);
 for(const p of Object.values(before.squad)){assert.equal(s.squad[p.id].xp-p.xp,played[p.id].minutes);if(p.injury){assert.equal(played[p.id].minutes,0);assert.equal(s.squad[p.id].injury?.remaining??0,p.injury.remaining-1);}}assert.equal(ST.summary(s,'europe').players.reduce((n,p)=>n+p.goals,0),before.match.score[0]);assert.doesNotThrow(()=>H.validate(s));assert.doesNotThrow(()=>C.validate(s));assert.doesNotThrow(()=>ST.validate(s));
});

test('European minute zero, live play, halftime, coach pause and full time resume identically',()=>{
 const base=firstEurope(true);for(const target of [0,17,45,65,90]){const raw=minute(copy(base),target),restored=S.restore(copy(raw));assert.equal(restored.match.rng,raw.match.rng);assert.deepEqual(restored.match.score,raw.match.score);assert.deepEqual(play(restored),play(copy(raw)));}
});

test('confirmed reviews align foreign opponents, player scores, health and the exact receipt',()=>{
 let s=firstEurope();finish(s.match);const pending=MR.read(s,{source:'pending'});s=S.settle(s);const d=MR.read(s);assert.equal(d.valid,true);assert.equal(d.confirmed,true);assert.equal(d.competition,'europe');assert.equal(d.id,'europe-3-0');assert.equal(d.opponent.id,pending.opponent.id);assert.deepEqual(d.score,pending.score);assert.deepEqual(d.cashflow,s.lastReport.cashflow);assert.equal(d.healthAligned,true);assert.equal(d.players.reduce((n,p)=>n+p.minutes,0),990);assert.deepEqual(MR.read(S.restore(copy(s))),d);
 const raw=copy(s);raw.lastReport.stage++;assert.equal(MR.read(raw).valid,false);
});

test('international payout rejects a false result and duplicate settlement before mutation',()=>{
 const s=firstEurope();atomic(s,x=>E.applyEurope(x,{}));finish(s.match);const result=U.preview(s,s.match);atomic(s,x=>E.applyEurope(x,{...result,goals:[99,0]}));E.applyEurope(s,result);atomic(s,x=>E.applyEurope(x,result));assert.equal(s.finance.ledger.filter(e=>e.id==='europe-3-0').length,1);
});

test('all six group results and domestic cups retain canonical calendar order',()=>{
 let s=copy(qualified),previous=null;while(s.match){const comp=s.competition,round=s.round,stage=comp==='europe'?s.europe.stage:null;if(comp==='europe'){finish(s.match);const result=U.preview(s,s.match);s=S.settle(s);const receipt=s.finance.ledger.find(e=>e.id==='europe-3-'+stage);if(stage>=6){assert.equal(receipt.matchBonus,0);assert.equal(receipt.advanceBonus,result.winner===S.own?(stage===6?60000:150000):0);}assert.equal(s.round,round);}else s=play(s);assert.doesNotThrow(()=>S.restore(copy(s)));if(previous?.competition==='cup'&&s.lastReport.competition==='europe'&&previous.round===s.lastReport.round)assert.equal(s.finance.ledger.filter(e=>e.year===3&&e.round===s.lastReport.round&&['cup','europe'].includes(e.type)).at(-1).type,'europe');previous=copy(s.lastReport);}
 assert.equal(ownResults(s).filter(r=>r.stage<6).length,6);assert.equal(ST.summary(s,'league').matches,14);assert.equal(ST.summary(s,'europe').matches,ownResults(s).length);assert.equal(s.health.playedGames,ST.summary(s).matches);assert.ok(s.health.playedGames<=25);assert.equal(ST.summary(s).minutes,s.health.playedGames*990);assert.equal(S.ready(s),true);
});

test('a real knockout shootout records ninety-minute goals and one appearance per player',()=>{
 let s=copy(qualified);while(!(s.competition==='europe'&&s.europe.stage===6)){assert.ok(s.match);if(s.competition==='league')S.train(s,'recovery');H.rotate(s);F.setTactic(s.match,'counter');s=play(s);}H.rotate(s);F.setTactic(s.match,'counter');finish(s.match);const result=U.preview(s,s.match),before=ST.summary(s,'europe'),pending=MR.read(s,{source:'pending'});assert.deepEqual(result.goals,[3,3]);assert.ok(result.penalties);assert.equal(pending.valid,true);assert.deepEqual(pending.score,[3,3]);assert.ok(pending.penalties);const round=s.round,health=s.health.playedGames;s=S.settle(s);const record=ST.lastMatch(s),d=MR.read(s),receipt=s.finance.ledger.find(e=>e.id==='europe-3-6');assert.equal(record.competition,'europe');assert.equal(record.goals,3);assert.equal(record.players.reduce((n,p)=>n+p.goals,0),3);assert.equal(record.players.reduce((n,p)=>n+p.minutes,0),990);assert.equal(ST.summary(s,'europe').goals-before.goals,3);assert.equal(ST.summary(s,'europe').matches-before.matches,1);assert.equal(receipt.matchBonus,0);assert.equal(receipt.advanceBonus,result.winner===S.own?60000:0);assert.equal(s.health.playedGames,health+1);assert.equal(s.round,round);assert.equal(d.valid,true);assert.deepEqual(d.penalties,pending.penalties);assert.deepEqual(d.score,pending.score);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('international archives retain real scores and receipts after a new season',()=>{
 const ended=complete(copy(qualified)),sum=ST.summary(ended,'europe'),next=S.nextSeason(ended);assert.ok(sum.matches>=6);assert.equal(ST.summary(next,'europe').matches,0);assert.deepEqual(normalizedSummary(ST.summary(next,'europe',3)),normalizedSummary(sum));assert.equal(next.history[2].europeChampion,ended.europe.champion);assert.equal(next.health.playedGames,0);assert.doesNotThrow(()=>S.restore(copy(next)));
});

test('forged international money, scores, fixtures, health and records reject even if cash balances',()=>{
 const s=play(firstEurope()),corrupt=fn=>{const raw=copy(s);fn(raw);assert.throws(()=>S.restore(raw));},entry=x=>x.finance.ledger.find(e=>e.type==='europe');
 corrupt(x=>{entry(x).gate++;entry(x).income++;entry(x).amount++;x.finance.balance++;});corrupt(x=>{entry(x).payroll=0;});corrupt(x=>{entry(x).goals[0]++;});corrupt(x=>{entry(x).index=(entry(x).index+1)%4;});corrupt(x=>{delete x.europe;});corrupt(x=>{x.health.playedGames--;});corrupt(x=>{x.health.originEuropeGames=null;});corrupt(x=>{x.statistics.records.find(r=>r.competition==='europe').stage++;});corrupt(x=>{x.statistics.records=x.statistics.records.filter(r=>r.competition!=='europe');});corrupt(x=>{x.career.minutes.f1--;});
});

test('archived international bracket tampering is rejected without rewriting old league history',()=>{
 const s=S.nextSeason(complete(copy(qualified))),corrupt=fn=>{const raw=copy(s);fn(raw);assert.throws(()=>S.restore(raw));};corrupt(x=>x.history.find(h=>h.year===3).europeChampion='unknown');corrupt(x=>{const e=x.finance.ledger.find(e=>e.type==='europe');e.away=e.away==='meridian'?'steinbruck':'meridian';});corrupt(x=>{x.statistics.archive.find(a=>a.year===3).records.find(r=>r.competition==='europe').score[0]++;});
});
console.log('European model tests passed: '+groups+' groups.');
