'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),ST=require('./dist/statistics.js'),T=require('./dist/training.js'),D=require('./dist/development.js'),PD=require('./dist/player-details.js');
const copy=x=>JSON.parse(JSON.stringify(x)),recordKeys=['apps','starts','goals','assists','minutes','cleanSheets'];let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function finish(m,engine=F){while(m.phase!=='full'){if(!engine.running(m))engine.begin(m);engine.finishSegment(m);}return m;}
function play(s,season=S,engine=F){finish(s.match,engine);return season.settle(s);}
function pure(s,identity){const before=JSON.stringify(s),d=PD.read(s,identity);assert.equal(JSON.stringify(s),before);return d;}
function oldV7(){const c=vm.createContext({});for(const name of ['engine','economy','career','cup','health','season'])vm.runInContext(fs.readFileSync(path.join(__dirname,'legacy-v7',name+'.js'),'utf8'),c);return {F:c.Football,S:c.Season};}
function assertRecords(s,d){const sum=ST.summary(s,'all',s.year),row=sum.players.find(p=>p.identity===d.identity);for(const key of recordKeys)assert.equal(d.records[key],row?.[key]??0);for(const key of ['partial','matches','trackedSinceRound'])assert.equal(d.records[key],sum[key]);}

test('registered player details show actual skills, headroom, personality and six honest stats',()=>{
 const s=S.create(1301);for(const p of Object.values(s.squad)){const d=pure(s,p.identity),key=F.roleKey(p);assert.equal(d.valid,true);assert.equal(d.owned,true);assert.equal(d.status,'our');assert.equal(d.source,'squad');assert.equal(d.slot,p.id);assert.equal(d.name,p.name);assert.equal(d.position,p.pos);assert.equal(d.age,p.age);assert.deepEqual({nickname:d.nickname,tagline:d.tagline},F.personality(p));assert.equal(d.current.primary,p[key]);assert.equal(d.current.potential,p.potential);assert.equal(d.current.growthHeadroom,p.potential-p[key]);assert.equal(d.stats.length,6);assert.equal(d.stats.filter(stat=>stat.primary).length,1);for(const stat of d.stats)assert.equal(stat.value,stat.key==='keeping'&&p.pos!=='GK'?null:p[stat.key]);assertRecords(s,d);assert.deepEqual(d.development,D.analyze(s,p.id));}
});

test('individual training growth is read from the owned player and stays bounded by potential',()=>{
 const s=S.create(1302),before=s.squad.f3.attack;T.train(s,'f3','technique');const d=pure(s,'f3');assert.equal(d.current.primary,before+2);assert.equal(d.current.xp,0);assert.equal(d.stats.find(stat=>stat.key==='attack').value,before+2);assert.equal(d.current.energy,s.squad.f3.energy);assert.equal(d.development.recommendation.available,false);
 const capped=S.create(1303);capped.squad.f3.attack=capped.squad.f3.potential;capped.match.players.f3.attack=capped.squad.f3.attack;const limit=pure(capped,'f3');assert.equal(limit.current.growthHeadroom,0);assert.equal(limit.development.growth.individualTechniqueSessions,0);assert.equal(limit.development.experience.nextPrimaryGrowthMinutes,null);
});

test('live match energy comes from the same identity while confirmed experience and records stay unchanged',()=>{
 const s=S.create(1304);F.begin(s.match);for(let i=0;i<30;i++)F.tick(s.match);const d=pure(s,'f2');assert.equal(d.current.energy,s.match.players.f2.energy);assert.notEqual(d.current.energy,s.squad.f2.energy);assert.equal(d.condition.energySource,'match');assert.equal(d.condition.starting,true);assert.equal(d.current.xp,0);assert.equal(d.records.minutes,0);assert.equal(d.records.apps,0);assert.equal(d.development.experience.confirmedMinutes,0);
 const fallback=copy(s);fallback.match.players.f2.identity='t_f2';const original=pure(fallback,'f2');assert.equal(original.current.energy,fallback.squad.f2.energy);assert.equal(original.condition.energySource,'squad');assert.equal(original.condition.starting,false);const complete=copy(s);complete.match=null;assert.equal(pure(complete,'f2').condition.energySource,'squad');
});

test('ninety unconfirmed minutes never become an appearance until the result is settled',()=>{
 let s=S.create(1305);finish(s.match);const unconfirmed=pure(s,'f2');assert.equal(unconfirmed.records.apps,0);assert.equal(unconfirmed.records.minutes,0);assert.equal(unconfirmed.records.matches,0);assert.equal(unconfirmed.current.xp,0);s=S.settle(s);const confirmed=pure(s,'f2');assert.equal(confirmed.records.apps,1);assert.equal(confirmed.records.starts,1);assert.equal(confirmed.records.minutes,90);assert.equal(confirmed.records.matches,1);assert.equal(confirmed.current.xp,90);assertRecords(s,confirmed);
});

test('confirmed substitutions, goals and assists follow the actual identity instead of a roster slot',()=>{
 let s=S.create(128);F.begin(s.match);F.finishSegment(s.match);F.swap(s.match,'f1','f3');F.begin(s.match);F.finishSegment(s.match);F.swap(s.match,'m4','m5');F.swap(s.match,'g1','g2');finish(s.match);s=S.settle(s);for(const [identity,minutes,starts] of [['f1',45,1],['f3',45,0],['m4',65,1],['m5',25,0],['g1',65,1],['g2',25,0]]){const d=pure(s,identity);assert.equal(d.records.minutes,minutes);assert.equal(d.records.starts,starts);assert.equal(d.records.apps,1);assertRecords(s,d);}for(const p of Object.values(s.squad))assertRecords(s,pure(s,p.identity));
});

test('goalkeeper clean sheets mirror the confirmed ninety-minute record without assigning them to outfielders',()=>{
 let s=S.create(123);finish(s.match);const conceded=s.match.score[1];s=S.settle(s);const keeper=pure(s,'g1');assert.equal(keeper.records.cleanSheets,conceded===0?1:0);assert.equal(keeper.stats.find(stat=>stat.key==='keeping').value,s.squad.g1.keeping);assert.equal(keeper.primaryKey,'keeping');for(const p of Object.values(s.squad).filter(p=>p.pos!=='GK')){const d=pure(s,p.identity);assert.equal(d.records.cleanSheets,0);assert.equal(d.stats.find(stat=>stat.key==='keeping').value,null);}
});

test('market prospects have base skills and zero invented condition, experience or appearances',()=>{
 const s=play(S.create(1306));for(const p of F.market){const d=pure(s,p.identity);assert.equal(d.valid,true);assert.equal(d.owned,false);assert.equal(d.status,'prospect');assert.equal(d.source,'market');assert.equal(d.slot,null);assert.equal(d.current.primary,p[F.roleKey(p)]);assert.equal(d.current.xp,0);assert.equal(d.current.energy,null);assert.equal(d.injury,null);assert.equal(d.condition.status,'unknown');assert.equal(d.condition.available,null);assert.equal(d.condition.starting,null);assert.equal(d.development,null);for(const key of recordKeys)assert.equal(d.records[key],0);assert.equal(d.records.matches,1);}
});

test('an owned market identity takes precedence over its candidate profile and a sold roster identity is invalid',()=>{
 let s=S.recruit(S.create(1307),'t_f2','f3');T.train(s,'f3','technique');const d=pure(s,'t_f2');assert.equal(d.owned,true);assert.equal(d.slot,'f3');assert.equal(d.source,'squad');assert.equal(d.current.primary,F.identityProfile('t_f2').attack+2);assert.equal(d.current.energy,s.match.players.f3.energy);assert.equal(d.development.identity,'t_f2');assert.equal(pure(s,'f3').valid,false);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('only discovered current-season youth candidates are readable, then recruitment binds their own development',()=>{
 const fresh=S.create(1308),hidden='y_1308_1_1_FW_1';assert.ok(F.identityProfile(hidden));assert.equal(pure(fresh,hidden).valid,false);let s=S.scout(fresh,'FW');const ids=s.career.reports[0].candidates;for(const identity of ids){const d=pure(s,identity),p=F.identityProfile(identity);assert.equal(d.source,'academy');assert.equal(d.age,p.age);assert.equal(d.owned,false);assert.equal(d.current.primary,p.attack);assert.equal(d.records.minutes,0);}for(const identity of ['y_1308_1_1_MID_1','y_1309_1_1_FW_1','y_1308_2_1_FW_1','y_1308_1_2_FW_1'])assert.equal(pure(s,identity).valid,false);s=S.recruit(s,ids[0],'f3');const owned=pure(s,ids[0]);assert.equal(owned.owned,true);assert.equal(owned.slot,'f3');assert.equal(owned.current.xp,0);assert.equal(owned.development.identity,ids[0]);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('a market player sold later keeps their real confirmed record without inheriting another contract',()=>{
 let s=S.recruit(S.create(1309),'t_f2','f1');s=play(s);const before=pure(s,'t_f2').records;assert.equal(before.minutes,90);s=S.recruit(s,'t_f1','f1');const former=pure(s,'t_f2'),incoming=pure(s,'t_f1');assert.equal(former.owned,false);assert.equal(former.source,'market');assert.deepEqual(former.records,before);assert.equal(former.current.primary,F.identityProfile('t_f2').attack);assert.equal(incoming.owned,true);assert.equal(incoming.records.minutes,0);assert.equal(incoming.current.xp,0);
});

test('partial migrated seasons remain visibly partial and do not invent prior appearances',()=>{
 const old=oldV7();let raw=old.S.create(1310);for(let i=0;i<3;i++)raw=play(raw,old.S,old.F);let s=S.restore(copy(raw));const before=pure(s,'f2');assert.equal(before.records.partial,true);assert.equal(before.records.trackedSinceRound,4);assert.equal(before.records.matches,0);assert.equal(before.records.minutes,0);assert.equal(before.current.xp,raw.squad.f2.xp);s=play(s);const after=pure(s,'f2');assert.equal(after.records.partial,true);assert.equal(after.records.trackedSinceRound,4);assert.equal(after.records.matches,1);assert.equal(after.records.minutes,90);assertRecords(s,after);
 const halftime=old.S.create(121);old.F.begin(halftime.match);old.F.finishSegment(halftime.match);const resumed=S.restore(copy(halftime));assert.equal(pure(resumed,'f1').records.partial,true);assert.equal(pure(resumed,'f1').records.matches,0);
});

test('ages use the current season but keep an academy player anchored to their discovery year',()=>{
 let s=S.scout(S.create(1311),'FW');const ownedYouth=s.career.reports[0].candidates[0],unusedYouth=s.career.reports[0].candidates[1];s=S.recruit(s,ownedYouth,'f3');const initial=F.identityProfile(ownedYouth);while(s.match)s=play(s);s=S.nextSeason(s);assert.equal(pure(s,ownedYouth).age,initial.age+1);assert.equal(pure(s,'f2').age,F.identityProfile('f2').age+1);assert.equal(pure(s,'t_f2').age,F.identityProfile('t_f2').age+1);assert.equal(pure(s,unusedYouth).valid,false);assert.equal(pure(s,'f2').records.matches,0);assert.equal(pure(s,'f2').records.minutes,0);s=S.scout(s,'MID');for(const identity of s.career.reports[0].candidates)assert.equal(pure(s,identity).age,F.identityProfile(identity).age);
});

test('condition, injury and returned objects are detached from the live season',()=>{
 const s=S.create(1312);s.squad.f3.injury={remaining:2,kind:'muscle',since:1};s.match.players.f3.injuryRemaining=2;const d=pure(s,'f3');assert.equal(d.condition.status,'injured');assert.equal(d.condition.available,false);assert.match(d.condition.label,/2경기/);assert.equal(d.development.recommendation.available,false);const before=JSON.stringify(s);d.injury.remaining=0;d.current.primary=99;d.stats[0].value=99;d.records.minutes=9999;d.development.growth.current=99;assert.equal(JSON.stringify(s),before);const tired=S.create(1313);tired.match.players.f3.energy=64.5;assert.equal(pure(tired,'f3').condition.status,'caution');tired.match.players.f3.energy=65;assert.equal(pure(tired,'f3').condition.status,'fit');
});

test('invalid identities and browser UMD reads stay safe and require no new saved fields',()=>{
 const s=S.create(1314);for(const identity of [null,undefined,123,'','unknown','__proto__','y_1314_1_1_FW_1'])assert.equal(pure(s,identity).valid,false);assert.equal(PD.read(null,'f2').valid,false);const context=vm.createContext({Football:F,Statistics:ST,PlayerDevelopment:D,PlayerTraits:require('./dist/player-traits.js')});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/player-details.js'),'utf8'),context);const before=JSON.stringify(s),keys=Object.keys(s);assert.deepEqual(JSON.parse(JSON.stringify(context.PlayerDetails.read(s,'f2'))),PD.read(s,'f2'));assert.equal(JSON.stringify(s),before);assert.deepEqual(Object.keys(s),keys);assert.equal(s.version,8);assert.equal(s.match.version,5);
});
console.log('Validated '+groups+' player detail groups, including actual identity skills, confirmed records and discovered candidate access.');
