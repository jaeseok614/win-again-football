'use strict';
const expectedMinutes=require('./participation-test-helper.cjs');
const assert=require('node:assert/strict');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),E=require('./dist/economy.js'),U=require('./dist/europe.js'),Staff=require('./dist/staff.js'),ST=require('./dist/statistics.js'),C=require('./dist/career.js');
const copy=value=>JSON.parse(JSON.stringify(value));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function finish(match){while(match.phase!=='full'){if(!F.running(match))F.begin(match);match.paused=false;F.finishSegment(match);}return match;}
function play(s){finish(s.match);return S.settle(s);}
function complete(s){while(s.match)s=play(s);return s;}
function boost(s){for(const p of Object.values(s.squad)){for(const key of ['attack','defense','passing','speed','endurance','keeping'])p[key]=s.match.players[p.id][key]=99;p.potential=s.match.players[p.id].potential=99;s.career.baselines[p.identity]=99;}return s;}
function advance(match,minute){while(match.minute<minute){if(!F.running(match))F.begin(match);match.paused=false;F.tick(match);}return match;}
function rejectAtomic(s,fn){const before=JSON.stringify(s);assert.throws(()=>fn(s));assert.equal(JSON.stringify(s),before);}
const lower=complete(boost(S.create(121))),upperStart=S.nextSeason(lower),upperEnd=complete(copy(upperStart)),qualified=S.nextSeason(upperEnd);
function firstEurope(s=copy(qualified)){while(s.competition!=='europe'){assert(s.match);s=play(s);}return s;}
function ownEurope(s){return s.europe.results.filter(r=>r.home===S.own||r.away===S.own);}

test('European qualification follows an actual previous top division finish and leaves the fifteen league clubs intact',()=>{
 assert.equal(S.create(121).europe.enabled,false);assert.equal(S.movement(lower).rank,1);assert.equal(upperStart.league.division,1);assert.equal(upperStart.europe.enabled,false);
 assert.equal(S.movement(upperEnd).rank,1);assert.equal(qualified.year,3);assert.equal(qualified.europe.enabled,true);assert.deepEqual(qualified.europe.qualification,{year:2,division:1,rank:1});assert.deepEqual(S.restore(copy(qualified)),qualified);
 assert.equal(S.clubs.length,15);for(const club of U.clubs){assert.equal(S.rawClub(club.id),club);assert(!S.clubs.some(c=>c.id===club.id));assert(!S.leagueClubs(qualified).some(c=>c.id===club.id));}
});

test('six group matchdays and knockout gates preserve league rounds and give the domestic cup priority',()=>{
 let s=copy(qualified);const events=[];while(s.match){const competition=s.competition,round=s.round,results=copy(s.results);
  if(globalThis.Cup.due(s))assert.equal(competition,'cup');else if(U.due(s)&&U.fixtureFor(s))assert.equal(competition,'europe');
  if(competition==='europe'){assert.equal(round,U.gates[s.europe.stage]);assert.deepEqual(S.fixtureFor(s),U.fixtureFor(s));assert.equal(S.opponentFor(s).id,s.match.isHome?S.fixtureFor(s).away:S.fixtureFor(s).home);}
  events.push({competition,round,stage:competition==='europe'?s.europe.stage:competition==='cup'?s.cup.stage:null});s=play(s);
  if(competition!=='league'){assert.equal(s.round,round);assert.deepEqual(s.results,results);}else assert.equal(s.round,round+1);
  assert.deepEqual(S.restore(copy(s)),s);
 }
 assert.equal(events.filter(e=>e.competition==='league').length,14);assert.equal(s.results.length,56);assert.equal(s.europe.stage,8);assert.equal(s.europe.results.length,27);assert.equal(S.ready(s),true);
 const european=events.filter(e=>e.competition==='europe');assert.deepEqual(european.slice(0,6).map(e=>e.stage),[0,1,2,3,4,5]);assert.deepEqual(european.slice(0,6).map(e=>e.round),[2,4,6,8,10,12]);
 for(const week of [4,8,12]){const sameWeek=events.filter(e=>e.round===week&&e.competition!=='league');const cup=sameWeek.findIndex(e=>e.competition==='cup'),europe=sameWeek.findIndex(e=>e.competition==='europe');if(cup!==-1&&europe!==-1)assert(cup<europe);}
 assert(U.clubs.some(c=>c.id===s.europe.champion)||s.europe.champion===S.own);
});

test('European participation adds real experience and recovery without advancing league wages, contracts or weekly actions',()=>{
 let s=copy(qualified);Staff.hire(s,Staff.candidates(s).find(c=>c.role==='FW'&&c.tier===1).id);s=firstEurope(s);finish(s.match);
 const before=copy(s),table=S.standings(s),wins=C.progress(s).wins,result=U.preview(s,s.match),next=S.settle(s);
 assert.equal(next.round,before.round);assert.deepEqual(next.results,before.results);assert.deepEqual(S.standings(next),table);assert.deepEqual(next.staff,before.staff);assert.equal(next.trained,before.trained);assert.equal(next.finance.transferWeek,before.finance.transferWeek);assert.equal(C.progress(next).wins,wins);
 assert.deepEqual(ownEurope(next).at(-1),result);assert.equal(next.finance.ledger.filter(e=>e.type==='match').length,before.finance.ledger.filter(e=>e.type==='match').length);
 const receipt=next.finance.ledger.at(-1);assert.equal(receipt.type,'europe');assert(!Object.hasOwn(receipt,'payroll'));assert(!Object.hasOwn(receipt,'staffPayroll'));assert.equal(next.finance.balance,before.finance.balance+receipt.amount);
 for(const p of Object.values(next.squad)){const played=before.match.players[p.id];assert.equal(p.energy,Math.min(100,played.energy+20));assert.equal(p.xp,before.squad[p.id].xp+played.minutes);assert.equal(next.career.minutes[p.identity],before.career.minutes[p.identity]+played.minutes);}
 assert.equal(next.health.playedGames,before.health.playedGames+1);assert.equal(next.health.lastReport.competition,'europe');assert.equal(ST.summary(next,'europe').minutes,expectedMinutes(before.match));assert.equal(next.lastReport.competition,'europe');assert.deepEqual(S.restore(copy(next)),next);
});

test('European preparation forbids training, recruitment, scouting and staff changes without partial mutation',()=>{
 const s=firstEurope();rejectAtomic(s,x=>S.train(x,'technique'));rejectAtomic(s,x=>S.train(x,'recovery'));rejectAtomic(s,x=>S.recruit(x,'t_f2','f1'));rejectAtomic(s,x=>S.scout(x,'FW'));rejectAtomic(s,x=>E.payScout(x,'FW',1));rejectAtomic(s,x=>Staff.hire(x,Staff.candidates(x)[0].id));
 const next=play(s);assert.equal(next.competition,'league');assert.equal(next.round,2);assert.doesNotThrow(()=>S.train(next,'recovery'));
});

test('European saves preserve the exact minute, substitutions, decisions and match RNG through completion',()=>{
 const base=firstEurope();for(const minute of [0,1,23,45,65,89,90]){const original=copy(base);advance(original.match,minute);if(minute===45){const outgoing=original.match.lineup.find(id=>original.match.players[id].pos==='FW'),incoming=Object.values(original.match.players).find(p=>p.pos==='FW'&&!original.match.lineup.includes(p.id)&&!p.injuryRemaining);F.swap(original.match,outgoing,incoming.id);F.setTactic(original.match,'counter');}original.match.paused=F.running(original.match);
  const restored=S.restore(copy(original));assert.deepEqual(restored.match,original.match);finish(original.match);finish(restored.match);assert.deepEqual(S.settle(original),S.settle(restored));
 }
});

test('corrupt Europe qualification, brackets, fixtures, minute RNG and completed receipts cannot restore',()=>{
 const s=firstEurope();const corrupt=fn=>{const raw=copy(s);fn(raw);assert.throws(()=>S.restore(raw));};
 corrupt(x=>x.europe.qualification.rank=3);corrupt(x=>x.europe.groups[0][0]=x.europe.groups[0][1]);corrupt(x=>x.europe.enabled=false);corrupt(x=>x.europe.stage++);corrupt(x=>x.europe.champion=S.own);corrupt(x=>x.competition='league');corrupt(x=>x.match.seed++);corrupt(x=>x.match.rng++);corrupt(x=>x.match.isHome=!x.match.isHome);corrupt(x=>x.match.opponent.attack++);
 const settled=play(s),bad=fn=>{const raw=copy(settled);fn(raw);assert.throws(()=>S.restore(raw));};bad(x=>{delete x.europe;});bad(x=>x.europe.results[0].index=99);bad(x=>x.europe.results.find(r=>r.home===S.own||r.away===S.own).goals[0]++);bad(x=>{const e=x.finance.ledger.find(r=>r.type==='europe');e.amount++;e.income++;x.finance.balance++;});bad(x=>x.health.playedGames--);bad(x=>x.career.minutes.g1--);
});

test('older qualifying saves stay inactive this season and preserve their exact campaign and ledger',()=>{
 let current=copy(qualified);current=play(current);advance(current.match,23);F.setTactic(current.match,'counter');current.match.paused=true;const raw=copy(current);delete raw.europe;delete raw.health.originEuropeGames;for(const h of raw.history)delete h.europeChampion;
 const before=copy(raw),migrated=S.restore(raw);assert.deepEqual(raw,before);assert.equal(migrated.europe.enabled,false);assert.equal(migrated.europe.legacy,true);assert.equal(migrated.europe.originRound,1);assert.deepEqual(migrated.match,before.match);assert.deepEqual(migrated.finance,before.finance);assert.deepEqual(migrated.squad,before.squad);assert.deepEqual(migrated.results,before.results);assert.deepEqual(migrated.history,before.history);assert.deepEqual(S.restore(copy(migrated)),migrated);
 const ended=complete(migrated);assert.equal(ended.europe.results.length,0);assert.equal(ended.finance.ledger.filter(e=>e.type==='europe').length,0);assert(S.ready(ended));const next=S.nextSeason(ended);assert.equal(next.europe.legacy,false);assert.equal(next.europe.enabled,S.movement(ended).rank<=2);assert.deepEqual(S.restore(copy(next)),next);
});

test('the final international fixture blocks next year until confirmed and records its champion once',()=>{
 let s=boost(S.create(43));F.setFormation(s.match,'433');F.setTactic(s.match,'press');s=S.nextSeason(complete(s));s=S.nextSeason(complete(s));assert(s.europe.enabled);
 let finalSeen=false;while(s.match){if(s.competition==='europe'&&s.europe.stage===7){finalSeen=true;assert.equal(s.round,14);rejectAtomic(s,x=>S.nextSeason(x));finish(s.match);const resume=S.restore(copy(s));assert.deepEqual(resume.match,s.match);const a=S.settle(s),b=S.settle(resume);assert.deepEqual(a,b);s=a;}else s=play(s);}
 assert(finalSeen,'the actual seeded campaign must reach the final');assert(S.ready(s));const next=S.nextSeason(s);assert.equal(next.history.at(-1).europeChampion,s.europe.champion);assert.equal(next.finance.balance,s.finance.balance);assert.equal(next.europe.stage,0);assert.deepEqual(next.europe.results,[]);assert.deepEqual(S.restore(copy(next)),next);
 const bad=copy(next);bad.history.at(-1).europeChampion='unknown';assert.throws(()=>S.restore(bad));
});
console.log('Validated '+groups+' European season integration groups.');
