'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),ST=require('./dist/statistics.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function oldV8(){const ctx=vm.createContext({});for(const file of ['engine','economy','career','cup','health','statistics','season'])vm.runInContext(fs.readFileSync(path.join(__dirname,'legacy-v8',file+'.js'),'utf8'),ctx,{filename:'personality-v8-'+file});return {F:ctx.Football,S:ctx.Season,ST:ctx.Statistics};}
function finish(m,engine=F){while(m.phase!=='full'){if(!engine.running(m))engine.begin(m);engine.finishSegment(m);}return m;}
function play(s,season=S,engine=F){finish(s.match,engine);return season.settle(s);}
function withoutNames(value){const out=copy(value);delete out.staff;delete out.europe;delete out.clubLife;for(const row of out.history||[])delete row.europeChampion;const visit=o=>{if(!o||typeof o!=='object')return;delete o.name;delete o.scorerName;delete o.assistName;for(const v of Object.values(o))visit(v);};visit(out);return out;}
function canonPlayers(s){for(const p of Object.values(s.squad))assert.equal(p.name,F.identityProfile(p.identity).name);if(s.match)for(const p of Object.values(s.match.players))assert.equal(p.name,F.identityProfile(p.identity).name);}
function sameState(a,b){const expected=copy(b);expected.version=a.version;if(expected.match)expected.match.paused=F.running(expected.match);assert.deepEqual(withoutNames(a),withoutNames(expected));}
function displayedLogs(m){return m.logs.map(e=>({...e,text:F.displayText(e.text,m.players)}));}
function tune(s){for(const p of Object.values(s.squad)){for(const key of ['attack','defense','passing','speed','endurance','keeping']){p[key]=99;s.match.players[p.id][key]=99;}p.potential=99;s.match.players[p.id].potential=99;s.career.baselines[p.identity]=99;}return s;}
const old=oldV8();

test('all fixed and market aliases change only names while identities and all numeric profiles remain exact',()=>{
 const before=[...old.F.roster,...old.F.market],after=[...F.roster,...F.market];assert.equal(after.length,26);assert.equal(new Set(after.map(p=>p.name)).size,26);for(const p of before){const current=after.find(n=>n.identity===p.identity);assert.ok(current);assert.notEqual(current.name,p.name);assert.equal(F.legacyName(p.identity),p.name);assert.deepEqual(withoutNames(current),withoutNames(p));assert.equal(F.displayText(p.name),current.name);}assert.equal(F.create().version,5);assert.equal(S.create().version,9);
});

test('personality labels are deterministic display metadata and do not mutate a person or a match',()=>{
 const match=F.create(4321),before=JSON.stringify(match),person=copy(F.roster.find(p=>p.pos==='FW')),saved=JSON.stringify(person),tags=new Set();for(const p of [...F.roster,...F.market]){const info=F.personality(p);assert.equal(typeof info.nickname,'string');assert.ok(info.nickname.length>0);assert.equal(typeof info.tagline,'string');assert.ok(info.tagline.length>0);assert.deepEqual(info,F.personality(p.identity));tags.add(info.tagline);}assert.ok(tags.size>3);F.personality(person);assert.equal(JSON.stringify(person),saved);assert.equal(JSON.stringify(match),before);
});

test('youth aliases retain every seeded attribute, cost and identity and never duplicate within a scout report',()=>{
 const fixed=new Set([...F.roster,...F.market].map(p=>p.name)),match=F.create(9876),before=JSON.stringify(match);for(const seed of [0,1,37,549,20260930,4294967295])for(const year of [1,2])for(const cycle of [1,2])for(const pos of ['GK','DEF','MID','FW']){const candidates=F.youthCandidates(seed,year,cycle,pos),prior=old.F.youthCandidates(seed,year,cycle,pos);assert.equal(candidates.length,3);assert.equal(new Set(candidates.map(p=>p.name)).size,3);for(let i=0;i<3;i++){assert.ok(!fixed.has(candidates[i].name));assert.notEqual(candidates[i].name,prior[i].name);assert.deepEqual(withoutNames(candidates[i]),withoutNames(prior[i]));assert.equal(F.legacyName(candidates[i].identity),prior[i].name);assert.deepEqual(candidates[i],F.youthProfile(candidates[i].identity));const info=F.personality(candidates[i]);assert.ok(info.nickname&&info.tagline);assert.equal(F.displayText(prior[i].name,[candidates[i]]),candidates[i].name);}}assert.equal(JSON.stringify(match),before);
});

let base=old.S.scout(old.S.create(20260930),'FW');const youthId=base.career.reports[0].candidates[1];base=old.S.recruit(base,youthId,'f1');base=tune(base);base=play(base,old.S,old.F);base=old.S.recruit(base,'t_f1','f4');while(base.round<3)base=play(base,old.S,old.F);

test('v8 prep, running, 45-minute and 65-minute substitutions and full-time saves preserve all data except canonical names',()=>{
 assert.ok(old.ST.summary(base).goals>0);const raw=copy(base),saves=[copy(raw)];old.F.begin(raw.match);while(raw.match.minute<17)old.F.tick(raw.match);saves.push(copy(raw));old.F.finishSegment(raw.match);const out=raw.match.lineup.find(id=>raw.match.players[id].pos==='FW'),incoming=Object.keys(raw.match.players).find(id=>raw.match.players[id].pos==='FW'&&!raw.match.lineup.includes(id)&&old.F.isAvailable(raw.match.players[id]));old.F.swap(raw.match,out,incoming);old.F.setTactic(raw.match,'counter');saves.push(copy(raw));old.F.begin(raw.match);old.F.finishSegment(raw.match);const mid=raw.match.lineup.find(id=>raw.match.players[id].pos==='MID'),bench=Object.keys(raw.match.players).find(id=>raw.match.players[id].pos==='MID'&&!raw.match.lineup.includes(id)&&old.F.isAvailable(raw.match.players[id]));old.F.swap(raw.match,mid,bench);old.F.setTactic(raw.match,'press');saves.push(copy(raw));old.F.begin(raw.match);old.F.finishSegment(raw.match);saves.push(copy(raw));
 for(const saved of saves){const unchanged=JSON.stringify(saved),migrated=S.restore(copy(saved));assert.equal(JSON.stringify(saved),unchanged);sameState(migrated,saved);canonPlayers(migrated);assert.deepEqual(migrated.statistics,saved.statistics);assert.deepEqual(migrated.match.logs,saved.match.logs);assert.equal(migrated.squad.f1.identity,youthId);assert.equal(migrated.squad.f4.identity,'t_f1');assert.deepEqual(S.restore(copy(migrated)),migrated);const prior=copy(saved),next=copy(migrated);finish(prior.match,old.F);finish(next.match);for(const key of ['seed','rng','score','shots','chances','xg','segments','lineup','out','subs','decisions'])assert.deepEqual(next.match[key],copy(prior.match[key]),key);assert.deepEqual(withoutNames(next.match.players),withoutNames(prior.match.players));assert.deepEqual(displayedLogs(next.match),copy(displayedLogs(prior.match)));const after=S.settle(next),oldAfter=old.S.settle(prior);sameState(after,oldAfter);assert.deepEqual(after.statistics,copy(oldAfter.statistics));canonPlayers(after);}
});

test('injured v8 players and medical reports keep injury duration, risk and counters while showing new canonical names',()=>{
 let s=old.S.create(604);for(const p of Object.values(s.squad)){p.energy=5;s.match.players[p.id].energy=5;s.match.players[p.id].initialEnergy=5;}old.F.setTactic(s.match,'press');s=play(s,old.S,old.F);assert.ok(s.health.lastReport.incidents.length>0);const n=S.restore(copy(s));sameState(n,s);canonPlayers(n);assert.deepEqual(n.statistics,copy(s.statistics));for(const row of n.health.lastReport.incidents)assert.equal(row.name,F.identityProfile(row.identity).name);for(const p of Object.values(n.squad))assert.deepEqual(p.injury,copy(s.squad[p.id].injury));assert.deepEqual(S.restore(copy(n)),n);
});

test('confirmed goal records and archived seasons retain raw receipts while record queries use current aliases',()=>{
 let completed=copy(base);while(completed.match)completed=play(completed,old.S,old.F);const next=old.S.nextSeason(completed),n=S.restore(copy(next));sameState(n,next);assert.deepEqual(n.statistics,copy(next.statistics));assert.equal(n.statistics.archive.length,1);for(const year of [1,2])for(const filter of ['all','league','cup']){const prior=old.ST.summary(next,filter,year),after=ST.summary(n,filter,year);assert.deepEqual(withoutNames(after),withoutNames(prior));for(const p of after.players)assert.equal(p.name,F.identityProfile(p.identity).name);}assert.ok(ST.summary(n,'all',1).players.some(p=>p.identity===youthId));assert.deepEqual(S.restore(copy(n)),n);
});

test('old goal and substitution texts remain byte-for-byte stored while display translation is contextual and idempotent',()=>{
 const raw=copy(base);old.F.begin(raw.match);old.F.finishSegment(raw.match);const outgoing=raw.match.lineup.find(id=>raw.match.players[id].pos==='FW'),incoming=Object.keys(raw.match.players).find(id=>raw.match.players[id].pos==='FW'&&!raw.match.lineup.includes(id)&&old.F.isAvailable(raw.match.players[id]));old.F.swap(raw.match,outgoing,incoming);finish(raw.match,old.F);const n=S.restore(copy(raw)),before=JSON.stringify(n.match.logs);assert.deepEqual(n.match.logs,copy(raw.match.logs));for(const e of n.match.logs){const shown=F.displayText(e.text,n.match.players);assert.equal(F.displayText(shown,n.match.players),shown);for(const p of Object.values(n.match.players)){const previous=old.F.identityProfile(p.identity);if(e.text.includes(previous.name))assert.ok(shown.includes(p.name));}}assert.equal(JSON.stringify(n.match.logs),before);assert.equal(F.displayText('경기 종료. 감독의 선택과 경기 흐름을 돌아봅니다.'),'경기 종료. 감독의 선택과 경기 흐름을 돌아봅니다.');
});

test('ambiguous old youth names are not assigned to the wrong identity without a resolving context',()=>{
 const known=new Map();let pair;for(let seed=0;seed<100&&!pair;seed++)for(const prior of old.F.youthCandidates(seed,1,1,'FW')){const current=F.youthProfile(prior.identity),previous=known.get(prior.name);if(previous&&previous.name!==current.name){pair={oldName:prior.name,a:previous,b:current};break;}known.set(prior.name,current);}assert.ok(pair,'deterministic youth fixtures must include a historical name collision');assert.equal(F.displayText(pair.oldName,[pair.a,pair.b]),pair.oldName);assert.equal(F.displayText(pair.oldName),pair.oldName);assert.equal(F.displayText(pair.oldName,pair.a),pair.a.name);assert.equal(F.displayText(pair.oldName,pair.b),pair.b.name);
});

console.log('Personality compatibility tests passed: '+groups+' groups.');

