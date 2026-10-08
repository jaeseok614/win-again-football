'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),E=require('./dist/economy.js'),S=require('./dist/season.js'),O=require('./dist/opposition.js');
const P=globalThis.Cup||require('./dist/cup.js');
const copy=x=>JSON.parse(JSON.stringify(x));let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function finish(m,engine=F){while(m.phase!=='full'){if(!engine.running(m))engine.begin(m);engine.finishSegment(m);}return m;}
function settle(s,season=S,engine=F){finish(s.match,engine);return season.settle(s);}
function complete(s,season=S,engine=F){while(s.match)s=settle(s,season,engine);return s;}
function stop(s,minute,engine=F){while(s.match.minute<minute){if(!engine.running(s.match))engine.begin(s.match);engine.tick(s.match);}return s;}
function tune(s,n){assert.equal(s.match.phase,'prep');for(const p of Object.values(s.squad)){for(const key of ['attack','defense','passing','keeping','speed','endurance']){p[key]=n;s.match.players[p.id][key]=n;}if(n===99){p.potential=99;s.match.players[p.id].potential=99;}s.career.baselines[p.identity]=n;}return s;}
function legacy(){const ctx=vm.createContext({}),base=path.join(__dirname,'legacy-v6');for(const file of ['engine.js','economy.js','career.js','cup.js','health.js','season.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),ctx,{filename:'v6-'+file});return {F:ctx.Football,S:ctx.Season};}
function canonicalNames(value){const out=JSON.parse(JSON.stringify(value));const visit=o=>{if(!o||typeof o!=='object')return;if(typeof o.name==='string'){const p=F.identityProfile(o.identity||o.id);if(p)o.name=p.name;}for(const v of Object.values(o))visit(v);};visit(out);return out;}
function displayLogs(logs,players){return JSON.parse(JSON.stringify(logs)).map(e=>({...e,text:F.displayText(e.text,players)}));}
function assertPreserved(a,b){for(const key of ['squad','finance','career','health','results','plan'])assert.deepEqual(a[key],canonicalNames(b[key]),key);const am=copy(a.match),bm=canonicalNames(b.match);if(am&&bm){delete am.paused;delete bm.paused;if(bm.version<5){bm.version=5;bm.statisticsOriginMinute=bm.minute;}for(const m of [am,bm])for(const log of m.logs)for(const key of ['scorerId','scorerIdentity','assistId','assistIdentity'])delete log[key];}if(am&&bm){am.logs=displayLogs(am.logs,am.players);bm.logs=displayLogs(bm.logs,bm.players);}assert.deepEqual(am,bm,'all numeric gameplay fields and displayed log names survive, including original RNG and minutes');for(const key of ['year','round','seed','competition','trained'])assert.equal(a[key],b[key],key);}
function assertSchedule(s){const clubs=S.leagueClubs(s).map(c=>c.id),rounds=S.fixturesFor(s),pairs=new Set(),size=clubs.length;assert.ok([8,20,24].includes(size));assert.equal(new Set(clubs).size,size);assert.ok(clubs.includes(S.own));assert.equal(rounds.length,S.leagueRoundCount(s));for(const round of rounds){assert.equal(round.length,size/2);assert.deepEqual(round.flatMap(g=>[g.home,g.away]).sort(),[...clubs].sort());for(const f of round){const k=f.home+'/'+f.away;assert.notEqual(f.home,f.away);assert.ok(!pairs.has(k));pairs.add(k);}}assert.equal(pairs.size,size*(size-1));for(const id of clubs){assert.equal(rounds.flat().filter(f=>f.home===id).length,size-1);assert.equal(rounds.flat().filter(f=>f.away===id).length,size-1);}assert.deepEqual([...s.cup.bracket].sort(),[...clubs].sort());}

test('the legacy rules fixture remains an eight-club two-leg second division',()=>{
 const s=S.create(1207);assert.equal(s.version,9);assert.deepEqual(s.league,{version:1,division:2,rules:'pyramid'});assert.equal(S.divisionInfo(s).division,2);assertSchedule(s);assert.equal(S.standings(s).length,8);assert.equal(S.leagueForYear(s,1).division,2);assert.equal(S.movement(s).from,2);assert.equal(S.movement(s).rank,S.standings(s).find(c=>c.id===S.own).rank);assert.deepEqual(S.restore(copy(s)),s);
});

test('fresh Tottunham careers use five balanced tiers and climb one level per promoted season',()=>{
 let s=S.create(1208,{startingClub:true});assert.equal(s.version,9);assert.deepEqual(s.league,{version:1,division:5,rules:'five-tier',clubIds:S.leagueClubs({league:{division:5,rules:'five-tier'}}).map(c=>c.id)});assert.equal(S.leagueClubs(s).length,24);assert.deepEqual([5,4,3,2,1].map(d=>S.leagueClubs({league:{division:d,rules:'five-tier'}}).length),[24,24,24,24,20]);assert.deepEqual([5,4,3,2,1].map(d=>S.fixturesFor({league:{division:d,rules:'five-tier'}}).length),[46,46,46,46,38]);assert.equal(S.divisionInfo(5).name,S.divisionInfo({division:5,rules:'five-tier'}).name);assert.equal(E.scoutCost(s),8000);assert.equal(E.scoutCost(S.create(1209)),12000);assertSchedule(s);
 s=S.scout(s,'FW');assert.equal(s.finance.balance,152000);assert.equal(s.finance.ledger.find(e=>e.type==='scout').amount,-8000);assert.deepEqual(S.restore(copy(s)),s);
 s=S.create(1210,{startingClub:true});for(const division of [4,3,2,1]){const previousOpponents=S.leagueClubs(s).filter(c=>c.id!==S.own).map(c=>c.id).sort();s=complete(tune(s,99));assert.ok(S.standings(s).find(c=>c.id===S.own).rank<=2);assert.equal(S.movement(s).to,division);s=S.nextSeason(s);assert.equal(s.league.rules,'five-tier');assert.equal(s.league.division,division);const nextOpponents=S.leagueClubs(s).filter(c=>c.id!==S.own).map(c=>c.id).sort();assert.ok(nextOpponents.every(id=>!previousOpponents.includes(id)),'promotion refreshes every opponent club');const opponent=S.opponentFor(s),reference=S.clubReferences[opponent.id];assert.equal(reference.division,division);assert.equal(s.match.version,6);assert.deepEqual(s.match.opponent,O.competitionProfile(S.rawClub(opponent.id),division,'five-tier'));const roster=O.roster(opponent,s.match.opponent);assert.equal(roster.length,11);assert.equal(new Set(roster.map(p=>p.identity)).size,11);assert.deepEqual(S.restore(copy(s)),s);}
 assert.equal(s.history.length,4);assert.deepEqual(s.history.map(h=>h.division),[5,4,3,2]);assert.ok(s.history.every(h=>h.rules==='five-tier'&&h.nextDivision===h.division-1));
});

test('modern Tottenham match receipts resume identically through all decision points',()=>{
 const initial=S.create(1213,{startingClub:true});for(const minute of [0,17,45,65,90]){const raw=stop(copy(initial),minute),resumed=S.restore(copy(raw));assert.equal(raw.match.version,6);assert.equal(resumed.match.version,6);assert.deepEqual(resumed.match.opponent,raw.match.opponent);const uninterrupted=settle(raw),restored=settle(resumed);assert.deepEqual(restored,uninterrupted);}
});

const old=legacy();
const firstLegacy=complete(tune(old.S.create(1221),99),old.S,old.F);
const oldSecond=old.S.nextSeason(firstLegacy);

test('v6 league saves at 0, 17, 45, 65 and 90 minutes keep contracts, finances, history and RNG',()=>{
 let league=copy(oldSecond);for(let i=0;i<3;i++)league=settle(league,old.S,old.F);assert.equal(league.competition,'league');assert.equal(league.year,2);assert.equal(league.history.length,1);
 for(const minute of [0,17,45,65,90]){const raw=stop(copy(league),minute,old.F),migrated=S.restore(copy(raw));assert.equal(migrated.version,9);assert.deepEqual(migrated.league,{version:1,division:2,rules:'legacy'});assertPreserved(migrated,raw);for(const key of ['year','rank','points','champion','cupChampion'])assert.equal(migrated.history[0][key],raw.history[0][key]);assert.equal(S.leagueForYear(migrated,1).division,2);assert.equal(S.leagueForYear(migrated,1).rules,'legacy');assert.deepEqual(S.restore(copy(migrated)),migrated);const next=settle(migrated),oldNext=settle(raw,old.S,old.F);assertPreserved(next,oldNext);assert.deepEqual(next.cup,copy(oldNext.cup));}
});

test('v6 cup saves preserve every decision point and the original division income',()=>{
 let cup=copy(oldSecond);while(cup.competition!=='cup')cup=settle(cup,old.S,old.F);assert.equal(cup.round,4);
 for(const minute of [0,17,45,65,90]){const raw=stop(copy(cup),minute,old.F),s=S.restore(copy(raw));assertPreserved(s,raw);assert.equal(s.league.rules,'legacy');assert.deepEqual(s.cup,copy(raw.cup));const n=settle(s),oldNext=settle(raw,old.S,old.F);assertPreserved(n,oldNext);assert.deepEqual(n.cup,copy(oldNext.cup));assert.deepEqual(S.restore(copy(n)),n);}
});

let promoted;
test('a completed top-two lower season promotes once and records the source division',()=>{
 const s=complete(tune(S.create(1221),99));const rank=S.standings(s).find(c=>c.id===S.own).rank;assert.ok(rank<=2,'deterministic high-quality squad earns promotion');const movement=S.movement(s);assert.equal(movement.from,2);assert.equal(movement.to,1);assert.equal(movement.kind,'promotion');assert.equal(movement.rank,rank);assert.equal(S.ready(s),true);assert.equal(s.league.division,2);const n=S.nextSeason(s);assert.equal(n.league.division,1);assert.equal(n.league.rules,'pyramid');assert.equal(n.history[0].division,2);assert.equal(n.history[0].nextDivision,1);assert.equal(n.history[0].rules,'pyramid');assert.equal(n.history[0].champion,S.standings(s)[0].id);assert.equal(n.history[0].cupChampion,s.cup.champion);assert.equal(n.finance.balance,s.finance.balance);for(const p of Object.values(n.squad)){assert.equal(p.xp,s.squad[p.id].xp);assert.equal(p[F.roleKey(p)],s.squad[p.id][F.roleKey(p)]);assert.equal(p.injury,null);assert.equal(p.energy,100);}assertSchedule(n);assert.deepEqual(S.restore(copy(n)),n);promoted=n;
});

test('promotion replaces all seven league opponents and the cup field with stronger fictional clubs',()=>{
 const n=copy(promoted),lower=S.leagueClubs(S.create()).filter(c=>c.id!==S.own),upper=S.leagueClubs(n).filter(c=>c.id!==S.own);assert.equal(upper.length,7);assert.ok(upper.every(c=>!lower.some(d=>d.id===c.id)));const mean=cs=>cs.reduce((v,c)=>v+c.attack+c.defense+c.middle,0)/(cs.length*3);assert.ok(mean(upper)>mean(lower));for(const round of S.fixturesFor(n)){const f=round.find(f=>f.home===S.own||f.away===S.own);assert.ok(upper.some(c=>c.id===(f.home===S.own?f.away:f.home)));}assert.equal(S.divisionInfo(n).division,1);assert.notEqual(S.divisionInfo(n).name,S.divisionInfo(2).name);assert.ok(n.match.opponent.attack>=80);assert.ok(P.fixturesFor(n,0).every(f=>[f.home,f.away].every(id=>id===S.own||upper.some(c=>c.id===id))));
});

test('upper division league and cup replays remain deterministic and preserve historical ledger validation',()=>{
 for(const minute of [0,17,45,65,90]){const a=stop(copy(promoted),minute),b=S.restore(copy(a));finish(a.match);finish(b.match);assert.deepEqual(a.match.score,b.match.score);assert.deepEqual(a.match.logs,b.match.logs);assert.deepEqual(S.settle(a),S.settle(b));}
 let a=copy(promoted);while(a.competition!=='cup')a=settle(a);assert.equal(a.league.division,1);for(const minute of [0,45,65,90]){const running=stop(copy(a),minute),restored=S.restore(copy(running));assertPreserved(restored,running);assert.deepEqual(settle(running),settle(restored));}const completeUpper=complete(copy(a));assert.deepEqual(S.restore(copy(completeUpper)),completeUpper);const year3=S.nextSeason(completeUpper);assert.deepEqual(S.restore(copy(year3)),year3);assert.equal(year3.history.length,2);assert.equal(year3.history[1].division,1);assert.equal(S.leagueForYear(year3,1).division,2);assert.equal(S.leagueForYear(year3,2).division,1);
});

test('a relegated bottom-two upper squad returns to the lower schedule without losing money or experience',()=>{
 const s=complete(tune(copy(promoted),0)),rank=S.standings(s).find(c=>c.id===S.own).rank;assert.ok(rank>=7,'deterministic weak squad finishes in the relegation places');assert.equal(S.movement(s).kind,'relegation');assert.equal(S.movement(s).to,2);assert.deepEqual(S.restore(copy(s)),s);const n=S.nextSeason(s);assert.equal(n.league.division,2);assert.equal(n.history[1].division,1);assert.equal(n.history[1].nextDivision,2);assert.equal(n.finance.balance,s.finance.balance);assertSchedule(n);assert.deepEqual(S.leagueClubs(n).map(c=>c.id),S.leagueClubs(S.create()).map(c=>c.id));for(const p of Object.values(n.squad))assert.equal(p.xp,s.squad[p.id].xp);assert.deepEqual(S.restore(copy(n)),n);
});

test('legacy historical results remain in the lower division until the upgraded current season ends',()=>{
 const raw=copy(oldSecond);assert.ok(firstLegacy.history.length===0);assert.ok(S.standings(S.restore(copy(firstLegacy))).find(c=>c.id===S.own).rank<=2);const s=S.restore(raw);assert.equal(s.league.division,2);assert.equal(s.history[0].division,2);assert.equal(s.history[0].rules,'legacy');assert.equal(s.history[0].nextDivision,2);assert.deepEqual(s.finance,copy(raw.finance));const completed=complete(s),n=S.nextSeason(completed);assert.equal(n.history[1].rules,'legacy');assert.equal(n.league.rules,'pyramid');assert.equal(n.league.division,S.movement(completed).to);assert.deepEqual(S.restore(copy(n)),n);
});

test('corrupt divisions, impossible history transitions and cross-division results are rejected',()=>{
 const n=copy(promoted);for(const mutate of [s=>s.league.division=3,s=>s.league.version=2,s=>s.league.rules='unknown',s=>s.league.rules='legacy',s=>s.history[0].division=1,s=>s.history[0].nextDivision=2,s=>s.history[0].rules='legacy',s=>s.history[0].champion='calderwick',s=>s.history[0].cupChampion='valedoro',s=>s.cup.bracket[1]='aldermere']){const bad=copy(n);mutate(bad);assert.throws(()=>S.restore(bad));}const after=settle(copy(n)),bad=copy(after);bad.results[0].away='aldermere';assert.throws(()=>S.restore(bad));assert.deepEqual(S.restore(copy(after)),after);
});

test('a previewed promotion never advances a career before both competitions are complete',()=>{
 const s=copy(promoted),before=JSON.stringify(s);assert.throws(()=>S.nextSeason(s));assert.equal(JSON.stringify(s),before);const lower=S.create(1331),preview=S.movement(lower);assert.equal(lower.league.division,2);assert.equal(lower.year,1);assert.equal(lower.history.length,0);assert.equal(preview.from,2);assert.equal(JSON.stringify(lower),JSON.stringify(S.create(1331)));assert.throws(()=>S.nextSeason(lower));
});

console.log('Progression integration tests passed: '+checks+' groups.');
