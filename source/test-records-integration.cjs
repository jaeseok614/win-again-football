'use strict';
const expectedMinutes=require('./participation-test-helper.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),ST=require('./dist/statistics.js');
const copy=x=>JSON.parse(JSON.stringify(x));let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function finish(m,engine=F){while(m.phase!=='full'){if(!engine.running(m))engine.begin(m);engine.finishSegment(m);}return m;}
function settle(s,season=S,engine=F){finish(s.match,engine);return season.settle(s);}
function complete(s,season=S,engine=F){while(s.match)s=settle(s,season,engine);return s;}
function stop(s,minute,engine=F){while(s.match.minute<minute){if(!engine.running(s.match))engine.begin(s.match);engine.tick(s.match);}return s;}
function tune(s,n=99){for(const p of Object.values(s.squad)){for(const key of ['attack','defense','passing','keeping','speed','endurance']){p[key]=n;s.match.players[p.id][key]=n;}p.potential=99;s.match.players[p.id].potential=99;if(s.career)s.career.baselines[p.identity]=n;}return s;}
function legacy(version=7){const ctx=vm.createContext({}),files=['engine.js'];if(version>=3)files.push('economy.js');if(version>=4)files.push('career.js');if(version>=5)files.push('cup.js');if(version>=6)files.push('health.js');files.push('season.js');for(const file of files)vm.runInContext(fs.readFileSync(path.join(__dirname,'legacy-v'+version,file),'utf8'),ctx,{filename:'v'+version+'-'+file});return {F:ctx.Football,S:ctx.Season};}
function canonicalNames(value){const out=JSON.parse(JSON.stringify(value));const visit=o=>{if(!o||typeof o!=='object')return;if(typeof o.name==='string'){const p=F.identityProfile(o.identity||o.id);if(p)o.name=p.name;}for(const v of Object.values(o))visit(v);};visit(out);return out;}
function displayLogs(logs,players){return JSON.parse(JSON.stringify(logs)).map(e=>({...e,text:F.displayText(e.text,players)}));}
function coreLogs(logs){return copy(logs).map(e=>{for(const key of ['scorerId','scorerIdentity','assistId','assistIdentity'])delete e[key];return e;});}
function assertCoreMatch(a,b){for(const key of ['seed','rng','phase','minute','formation','tactic','isHome','score','shots','chances','xg','lineup','out','subs','decisions','segments'])assert.deepEqual(a[key],copy(b[key]),key);assert.deepEqual(displayLogs(coreLogs(a.logs),a.players),displayLogs(coreLogs(b.logs),b.players));const players=Object.fromEntries(Object.entries(copy(b.players)).map(([id,p])=>{const profile=F.profileForSlot(id,p.identity||id);return [id,{...profile,...p,name:profile.name,potential:p.potential??Math.max(profile.potential,p[F.roleKey(profile)]),injuryRemaining:p.injuryRemaining??0}];}));assert.deepEqual(a.players,players);}
function assertV7State(a,b){for(const key of ['squad','finance','career','health','results','plan','history','cup','league'])assert.deepEqual(a[key],canonicalNames(b[key]),key);for(const key of ['year','round','seed','competition','trained'])assert.equal(a[key],b[key],key);if(a.match&&b.match)assertCoreMatch(a.match,b.match);else assert.equal(a.match,b.match);}
const person=(summary,identity)=>summary.players.find(p=>p.identity===identity),total=(summary,key)=>summary.players.reduce((n,p)=>n+p[key],0);

test('v2 through v7 saves initialize empty records without changing active match outcomes',()=>{
 for(const version of [2,3,4,5,6,7]){const old=legacy(version),start=old.S.create(991);for(const minute of [0,45,90]){const raw=stop(copy(start),minute,old.F),s=S.restore(copy(raw));assert.equal(s.version,9);assert.equal(s.match.version,5);assert.equal(s.match.statisticsOriginMinute,minute);assert.equal(ST.summary(s).matches,0);assert.equal(ST.summary(s).minutes,0);assert.equal(ST.summary(s).goals,0);assertCoreMatch(s.match,raw.match);if(version>=3)assert.deepEqual(s.finance,copy(raw.finance));if(version>=4)assert.deepEqual(s.career,copy(raw.career));if(version>=6)assert.deepEqual(s.health,canonicalNames(raw.health));finish(raw.match,old.F);finish(s.match);assertCoreMatch(s.match,raw.match);const n=S.settle(s);assert.equal(ST.summary(n).matches,1);assert.equal(ST.summary(n).minutes,990);assert.equal(ST.summary(n).goals,raw.match.score[0]);assert.deepEqual(S.restore(copy(n)),n);}}
});

const old=legacy();
const oldFirst=complete(tune(old.S.create(1221)),old.S,old.F),oldSecond=old.S.nextSeason(oldFirst);

test('upper-division v7 league saves preserve finances and count pre-upgrade goals as unassigned',()=>{
 assert.equal(oldSecond.league.division,1);let observedOldGoals=0;
 for(const minute of [0,17,45,65,90]){const raw=stop(copy(oldSecond),minute,old.F),s=S.restore(copy(raw));assertV7State(s,raw);assert.equal(s.match.statisticsOriginMinute,minute);assert.equal(ST.summary(s).matches,0);assert.equal(ST.summary(s).minutes,0);const unknown=raw.match.score[0];observedOldGoals+=unknown;assert.equal(F.goalAttributions(s.match).length,0);finish(raw.match,old.F);finish(s.match);assertCoreMatch(s.match,raw.match);const ownNew=F.goalAttributions(s.match),n=S.settle(s),oldNext=old.S.settle(raw),summary=ST.summary(n);assertV7State(n,oldNext);assert.equal(summary.matches,1);assert.equal(summary.goals,raw.match.score[0]);assert.equal(summary.unassignedGoals,unknown);assert.equal(total(summary,'goals'),ownNew.length);assert.equal(summary.unassignedGoals+total(summary,'goals'),summary.goals);assert.equal(summary.minutes,expectedMinutes(n.statistics.records));assert.deepEqual(S.restore(copy(n)),n);}
 assert.ok(observedOldGoals>0,'migration fixtures include already scored goals');
});

test('v7 cup saves preserve RNG, winners and money while attributing only resumed regular-time goals',()=>{
 let first=copy(oldSecond);while(first.competition!=='cup')first=settle(first,old.S,old.F);assert.equal(first.round,4);
 for(const minute of [0,17,45,65,90]){const raw=stop(copy(first),minute,old.F),s=S.restore(copy(raw));assertV7State(s,raw);assert.equal(ST.summary(s).matches,0);assert.equal(s.match.statisticsOriginMinute,minute);const unknown=raw.match.score[0];finish(raw.match,old.F);finish(s.match);assertCoreMatch(s.match,raw.match);const n=S.settle(s),oldNext=old.S.settle(raw);assertV7State(n,oldNext);const all=ST.summary(n),cup=ST.summary(n,'cup'),league=ST.summary(n,'league');assert.equal(all.matches,1);assert.equal(cup.matches,1);assert.equal(league.matches,0);assert.equal(cup.goals,raw.match.score[0]);assert.equal(cup.unassignedGoals,unknown);assert.equal(cup.minutes,990);assert.deepEqual(S.restore(copy(n)),n);}
});

test('starts follow kickoff while three substitutions conserve actual minutes and exclude unused bench players',()=>{
 let s=tune(S.create(1208));F.setFormation(s.match,'433');if(s.match.lineup.includes('f4'))F.swap(s.match,'f4','f3');assert.ok(s.match.lineup.includes('f1'));assert.ok(!s.match.lineup.includes('f4'));const first=[...s.match.lineup];F.begin(s.match);F.finishSegment(s.match);F.swap(s.match,'f1','f4');F.begin(s.match);F.finishSegment(s.match);F.swap(s.match,'m1','m5');F.swap(s.match,'g1','g2');finish(s.match);const full=copy(s.match);s=S.settle(s);const summary=ST.summary(s);assert.equal(summary.matches,1);assert.equal(summary.minutes,expectedMinutes(s.statistics.records));assert.equal(total(summary,'starts'),11);assert.equal(total(summary,'apps'),14);for(const [id,minutes] of [['f1',45],['f4',45],['m1',65],['m5',25],['g1',65],['g2',25]]){const p=person(summary,id);assert.equal(p.minutes,minutes);assert.equal(p.apps,1);assert.equal(p.starts,Number(first.includes(id)));}for(const id of ['d5','d6','m6'])assert.equal(person(summary,id).apps,0);assert.equal(person(summary,'g1').cleanSheets,0);assert.equal(person(summary,'g2').cleanSheets,0);assert.equal(total(summary,'goals'),full.score[0]);assert.equal(summary.unassignedGoals,0);assert.ok(summary.assists<=summary.goals);for(const e of full.logs.filter(e=>e.type==='goal'&&e.team===0)){const segment=full.segments.find(seg=>e.minute>seg.start&&e.minute<=seg.end);assert.ok(segment.lineup.includes(e.scorerId));assert.equal(full.players[e.scorerId].identity,e.scorerIdentity);if(e.assistId!==null){assert.ok(segment.lineup.includes(e.assistId));assert.notEqual(e.assistId,e.scorerId);assert.equal(full.players[e.assistId].identity,e.assistIdentity);}}assert.deepEqual(S.restore(copy(s)),s);
});

test('new contracts keep the sold player record and start a separate identity at zero',()=>{
 let s=tune(S.create(1210));if(!s.match.lineup.includes('f1'))F.swap(s.match,s.match.lineup.find(id=>s.match.players[id].pos==='FW'),'f1');s=settle(s);const before=copy(person(ST.summary(s),'f1'));assert.equal(before.minutes,90);s=S.recruit(s,'t_f2','f1');const after=ST.summary(s);assert.deepEqual(person(after,'f1'),before);for(const key of ['apps','starts','minutes','goals','assists','cleanSheets'])assert.equal(person(after,'t_f2')[key],0);assert.equal(s.squad.f1.identity,'t_f2');if(!s.match.lineup.includes('f1'))F.swap(s.match,s.match.lineup.find(id=>s.match.players[id].pos==='FW'),'f1');s=settle(s);assert.deepEqual(person(ST.summary(s),'f1'),before);assert.equal(person(ST.summary(s),'t_f2').minutes,90);assert.equal(person(ST.summary(s),'t_f2').apps,1);assert.equal(ST.summary(s).minutes,1980);assert.deepEqual(S.restore(copy(s)),s);
});

test('league and cup records stay separate and penalty shootouts do not create personal goals',()=>{
 let s=S.create(549),found=false;while(s.match){finish(s.match);const wasCup=s.competition==='cup',score=[...s.match.score],before=ST.summary(s).goals;const next=S.settle(s);if(wasCup&&score[0]===score[1]){const result=next.cup.results.find(r=>r.stage===s.cup.stage&&(r.home===S.own||r.away===S.own));assert.ok(result.penalties);assert.equal(ST.summary(next).goals-before,score[0]);assert.equal(ST.lastMatch(next).score[0],score[0]);assert.equal(ST.lastMatch(next).unassignedGoals,0);found=true;}s=next;}
 assert.ok(found,'fixture must include a real shootout');const all=ST.summary(s),league=ST.summary(s,'league'),cup=ST.summary(s,'cup');assert.equal(league.matches,14);assert.equal(all.matches,league.matches+cup.matches);for(const key of ['minutes','goals','assists','unassignedGoals'])assert.equal(all[key],league[key]+cup[key]);assert.equal(total(all,'goals'),all.goals);assert.deepEqual(S.restore(copy(s)),s);
});

test('promotion archives all player records before resetting the following season',()=>{
 const first=complete(tune(S.create(1221))),prior=copy(ST.summary(first));assert.ok(S.movement(first).to===1);const n=S.nextSeason(first);assert.equal(n.league.division,1);assert.equal(ST.summary(n).matches,0);assert.equal(ST.summary(n).minutes,0);assert.equal(ST.summary(n).goals,0);assert.equal(ST.history(n).length,1);const archived=ST.summary(n,'all',1);for(const key of ['matches','minutes','goals','assists','unassignedGoals','year','division'])assert.equal(archived[key],prior[key]);for(const p of prior.players.filter(p=>p.apps>0)){const past=person(archived,p.identity);for(const key of ['apps','starts','minutes','goals','assists','cleanSheets'])assert.equal(past[key],p[key]);}const second=settle(n);assert.equal(ST.summary(second).matches,1);assert.equal(ST.summary(second).minutes,990);assert.equal(ST.summary(second,'all',1).matches,prior.matches);assert.deepEqual(S.restore(copy(second)),second);
});

test('migration during a prior completed season archives zero inferred statistics',()=>{
 const oldSaved=copy(oldFirst),migrated=S.restore(oldSaved);assert.equal(migrated.round,14);assert.equal(ST.summary(migrated).matches,0);assert.equal(ST.summary(migrated).minutes,0);assert.equal(ST.summary(migrated).goals,0);const n=S.nextSeason(migrated);assert.equal(ST.summary(n).matches,0);assert.equal(ST.history(n).length,1);assert.equal(ST.summary(n,'all',1).matches,0);assert.equal(ST.summary(n,'all',1).goals,0);assert.equal(n.finance.balance,migrated.finance.balance);assert.deepEqual(n.finance.ledger,migrated.finance.ledger);assert.deepEqual(S.restore(copy(n)),n);
});

test('unconfirmed full time and rejected repeat settlement never mutate recorded statistics',()=>{
 const s=S.create(1212),before=JSON.stringify(s.statistics);finish(s.match);assert.equal(JSON.stringify(s.statistics),before);const n=S.settle(s),settled=JSON.stringify(n);assert.throws(()=>S.settle(n));assert.equal(JSON.stringify(n),settled);assert.equal(ST.summary(n).matches,1);const bad=copy(n);bad.statistics.records.push(copy(bad.statistics.records[0]));assert.throws(()=>S.restore(bad));assert.deepEqual(S.restore(copy(n)),n);
});

console.log('Records integration tests passed: '+checks+' groups.');
