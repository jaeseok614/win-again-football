const legacyLogFields=logs=>logs.map(({scorerId,scorerIdentity,assistId,assistIdentity,...event})=>event);
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),E=require('./dist/economy.js'),S=require('./dist/season.js');
const H=globalThis.Health||require('./dist/health.js'),C=globalThis.Career;
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function finish(m,engine=F){while(m.phase!=='full'){if(!engine.running(m))engine.begin(m);engine.finishSegment(m);}return m;}
function play(s){finish(s.match);return S.settle(s);}
function complete(s){while(s.match)s=play(s);return s;}
function rejectAtomic(s,fn){const before=JSON.stringify(s);assert.throws(()=>fn(s));assert.equal(JSON.stringify(s),before);}
function oldV5(){const ctx=vm.createContext({}),base=path.join(__dirname,'legacy-v5');for(const file of ['engine.js','economy.js','career.js','cup.js','season.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),ctx,{filename:'health-v5-'+file});return {F:ctx.Football,E:ctx.Economy,C:ctx.Career,P:ctx.Cup,S:ctx.Season};}
function canonicalNames(value){const out=JSON.parse(JSON.stringify(value));const visit=o=>{if(!o||typeof o!=='object')return;if(typeof o.name==='string'){const p=F.identityProfile(o.identity||o.id);if(p)o.name=p.name;}for(const v of Object.values(o))visit(v);};visit(out);return out;}
function displayLogs(logs,players){return JSON.parse(JSON.stringify(logs)).map(e=>({...e,text:F.displayText(e.text,players)}));}
function stripInjury(players){const result=copy(players);for(const p of Object.values(result)){delete p.injury;delete p.injuryRemaining;}return result;}
function compareOldMatch(next,old){for(const key of ['seed','rng','phase','minute','formation','tactic','isHome','score','shots','chances','xg','logs','segments','lineup','out','subs','decisions'])assert.deepEqual(next[key],copy(old[key]),key);assert.deepEqual(stripInjury(next.players),canonicalNames(old.players));assert.ok(Object.values(next.players).every(p=>p.injuryRemaining===0));}
function injuryFixture(seed=604){let s=S.create(seed);for(const p of Object.values(s.squad)){p.energy=5;s.match.players[p.id].energy=5;s.match.players[p.id].initialEnergy=5;}F.setTactic(s.match,'press');finish(s.match);return {before:copy(s),after:S.settle(s)};}
function cupCountdownFixture(){const old=oldV5();for(let seed=610;seed<650;seed++){let raw=old.S.create(seed);for(let r=0;r<3;r++){finish(raw.match,old.F);raw=old.S.settle(raw);}for(const p of Object.values(raw.squad)){p.energy=5;raw.match.players[p.id].energy=5;raw.match.players[p.id].initialEnergy=5;}old.F.setTactic(raw.match,'press');const migrated=S.restore(copy(raw));finish(migrated.match);const next=S.settle(migrated),p=Object.values(next.squad).find(p=>p.injury?.remaining===2);if(p)return {s:next,slot:p.id,identity:p.identity};}throw Error('No deterministic two-match injury fixture found');}

test('a new health career has no injuries, counters or random side effects',()=>{
 const s=S.create(601);assert.equal(s.version,8);assert.equal(s.match.version,5);assert.deepEqual(s.health,{version:1,year:1,originRound:0,originCupGames:0,playedGames:0,lastReport:null});assert.ok(Object.values(s.squad).every(p=>p.injury===null));assert.ok(Object.values(s.match.players).every(p=>p.injuryRemaining===0));assert.equal(H.kindLabel('muscle'),'근육 부상');assert.equal(H.kindLabel('knock'),'타박상');assert.deepEqual(S.restore(copy(s)),s);
});

test('injury risk follows real minutes, fatigue and actual pressure exposure without consuming match RNG',()=>{
 const m=F.create(602);finish(m);const before=JSON.stringify(m),p=m.players.f1;assert.equal(H.riskFor(m,{...p,minutes:0,energy:0}),0);assert.equal(H.riskFor(m,{...p,minutes:29,energy:0}),0);const fresh=H.riskFor(m,{...p,energy:90}),tired=H.riskFor(m,{...p,energy:5});assert.ok(tired>fresh);const pressed=copy(m);for(const seg of pressed.segments)seg.tactic='press';assert.ok(H.riskFor(pressed,{...p,energy:5})>tired);for(const minutes of [30,45,90])assert.ok(H.riskFor(pressed,{...p,minutes,energy:0})<=.20);assert.equal(JSON.stringify(m),before);
});

test('pressure risk belongs only to the segments a player actually participated in',()=>{
 const m=F.create(602);F.begin(m);F.finishSegment(m);F.swap(m,'f1','f3');F.setTactic(m,'press');finish(m);const outgoing={...m.players.f1,energy:5},incoming={...m.players.f3,energy:5},before=JSON.stringify(m);
 assert.equal(outgoing.minutes,45);assert.equal(incoming.minutes,45);const base=(.01+(60-5)*.0025)*.5,press=(.01+(60-5)*.0025+45/90*.02)*.5;
 assert.ok(Math.abs(H.riskFor(m,outgoing)-base)<1e-12);assert.ok(Math.abs(H.riskFor(m,incoming)-press)<1e-12);assert.ok(H.riskFor(m,incoming)>H.riskFor(m,outgoing));assert.equal(JSON.stringify(m),before);
});

test('post-match injuries are deterministic across full-time restore and exclude unused players',()=>{
 const {before,after}=injuryFixture();assert.ok(after.health.lastReport.incidents.length>0);const resumed=S.settle(S.restore(copy(before)));assert.deepEqual(after,resumed);assert.equal(before.match.rng,F.restore(copy(before.match)).rng);assert.equal(after.health.playedGames,1);assert.equal(after.health.lastReport.game,1);assert.equal(after.health.lastReport.competition,'league');for(const i of after.health.lastReport.incidents){assert.ok(before.match.players[i.id].minutes>=30);assert.equal(i.identity,after.squad[i.id].identity);assert.ok([1,2].includes(i.remaining));assert.ok(['muscle','knock'].includes(i.kind));assert.equal(after.squad[i.id].injury.since,1);}for(const p of Object.values(before.match.players).filter(p=>p.minutes===0))assert.equal(after.squad[p.id].injury,null);assert.doesNotThrow(()=>S.restore(copy(after)));rejectAtomic(after,x=>H.afterMatch(x,before.match));
});

test('injured players skip technical training and recover energy without prematurely healing',()=>{
 const {after}=injuryFixture(),technical=copy(after),before=copy(after),injured=Object.values(after.squad).filter(p=>p.injury);assert.ok(injured.length>0);S.train(technical,'technique');
 for(const p of Object.values(technical.squad)){const previous=before.squad[p.id],key=F.roleKey(p);assert.equal(p[key],previous.injury?previous[key]:Math.min(previous.potential,previous[key]+1));assert.equal(p.energy,previous.injury?previous.energy:Math.max(0,previous.energy-5));assert.equal(technical.match.players[p.id][key],p[key]);assert.deepEqual(p.injury,previous.injury);assert.equal(p.xp,previous.xp);}
 assert.deepEqual(technical.health,before.health);assert.equal(technical.trained,'technique');assert.doesNotThrow(()=>S.restore(copy(technical)));rejectAtomic(technical,x=>S.train(x,'recovery'));
 const recovery=copy(before);S.train(recovery,'recovery');for(const p of injured){assert.equal(recovery.squad[p.id].energy,Math.min(100,p.energy+15));assert.deepEqual(recovery.squad[p.id].injury,p.injury);assert.equal(recovery.match.players[p.id].injuryRemaining,p.injury.remaining);}assert.deepEqual(recovery.health,before.health);assert.doesNotThrow(()=>S.restore(copy(recovery)));
});

test('automatic injury replacement keeps every supported formation playable with one goalkeeper',()=>{
 const {after}=injuryFixture();assert.ok(after.match.lineup.every(id=>F.isAvailable(after.match.players[id])));assert.equal(after.match.lineup.length,11);for(const formation of ['442','433','352']){const m=copy(after.match);F.setFormation(m,formation);assert.equal(m.lineup.length,11);assert.equal(new Set(m.lineup).size,11);for(const [pos,count] of Object.entries({GK:1,...F.formations[formation]}))assert.equal(m.lineup.filter(id=>m.players[id].pos===pos).length,count);assert.ok(m.lineup.every(id=>F.isAvailable(m.players[id])));finish(m);assert.equal(Object.values(m.players).reduce((n,p)=>n+p.minutes,0),990);}
});

test('direct engine controls reject injured starters and substitutions before mutation',()=>{
 let m=F.create(605);m.players.f3.injuryRemaining=1;rejectAtomic(m,x=>F.swap(x,'f1','f3'));m.players.f1.injuryRemaining=2;rejectAtomic(m,x=>F.begin(x));rejectAtomic(m,x=>F.setFormation(x,'433'));F.setFormation(m,'442');assert.ok(!m.lineup.includes('f1')&&!m.lineup.includes('f3'));F.begin(m);F.finishSegment(m);rejectAtomic(m,x=>F.swap(x,'f2','f1'));assert.doesNotThrow(()=>F.restore(copy(m)));const bad=copy(m);bad.players.f2.injuryRemaining=1;assert.throws(()=>F.restore(bad));
});

test('rotation selects rested available players by position and preserves tactics, finances and weekly actions',()=>{
 const s=S.create(606);F.setFormation(s.match,'433');F.setTactic(s.match,'counter');S.train(s,'pace');for(const p of Object.values(s.squad)){const energy=s.match.lineup.includes(p.id)?20:100;p.energy=energy;s.match.players[p.id].energy=energy;s.match.players[p.id].initialEnergy=energy;}const before=copy(s),result=H.rotate(s);assert.deepEqual(result.before,before.match.lineup);assert.deepEqual(result.after,s.match.lineup);assert.equal(result.after.length,11);assert.ok(result.changes.length>0);assert.equal(s.match.formation,'433');assert.equal(s.match.tactic,'counter');assert.deepEqual(s.plan.lineup,s.match.lineup);assert.equal(s.trained,before.trained);assert.deepEqual(s.finance,before.finance);assert.deepEqual(s.squad,before.squad);assert.equal(s.match.rng,before.match.rng);for(const pos of ['GK','DEF','MID','FW']){const count=pos==='GK'?1:F.formations['433'][pos],best=Object.values(s.match.players).filter(p=>p.pos===pos&&F.isAvailable(p)).sort((a,b)=>b.energy-a.energy||b[F.roleKey(b)]-a[F.roleKey(a)]).slice(0,count).map(p=>p.id);assert.deepEqual(s.match.lineup.filter(id=>s.match.players[id].pos===pos).sort(),best.sort());}assert.doesNotThrow(()=>S.restore(copy(s)));F.begin(s.match);rejectAtomic(s,x=>H.rotate(x));
});

test('two-match injuries count down through cup and league matches, granting no injured-player minutes or experience',()=>{
 let {s,slot,identity}=cupCountdownFixture();assert.equal(s.competition,'cup');assert.equal(s.squad[slot].injury.remaining,2);assert.ok(!s.match.lineup.includes(slot));const oldXp=s.squad[slot].xp,oldMinutes=s.career.minutes[identity],played=s.health.playedGames;s=play(s);assert.equal(s.health.playedGames,played+1);assert.equal(s.squad[slot].injury.remaining,1);assert.equal(s.squad[slot].xp,oldXp);assert.equal(s.career.minutes[identity],oldMinutes);assert.ok(!s.match.lineup.includes(slot));s=play(s);assert.equal(s.squad[slot].injury,null);assert.equal(s.squad[slot].xp,oldXp);assert.equal(s.career.minutes[identity],oldMinutes);assert.ok(s.health.lastReport.recovered.some(p=>p.identity===identity));assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('recruitment replaces an injured identity with a healthy fresh contract',()=>{
 let {s,slot,identity}=cupCountdownFixture();s=play(s);assert.equal(s.squad[slot].injury.remaining,1);const candidate=F.market.find(p=>p.pos===s.squad[slot].pos),old=copy(s),n=S.recruit(s,candidate.identity,slot);assert.equal(n.squad[slot].injury,null);assert.equal(n.squad[slot].xp,0);assert.equal(n.squad[slot].energy,100);assert.equal(n.match.players[slot].injuryRemaining,0);assert.equal(n.match.players[slot].minutes,0);assert.equal(n.career.minutes[candidate.identity],0);assert.equal(n.career.minutes[identity],old.career.minutes[identity]);assert.deepEqual(n.health,old.health);assert.equal(n.finance.ledger.at(-1).outgoing,identity);assert.doesNotThrow(()=>S.restore(copy(n)));
});

test('a new season clears injuries and medical counters while preserving money, contracts and progression',()=>{
 const s=complete(S.create(607)),n=S.nextSeason(s);assert.equal(n.health.year,2);assert.equal(n.health.playedGames,0);assert.equal(n.health.originRound,0);assert.equal(n.health.originCupGames,0);assert.equal(n.health.lastReport,null);assert.ok(Object.values(n.squad).every(p=>p.injury===null));assert.ok(Object.values(n.match.players).every(p=>p.injuryRemaining===0));assert.equal(n.finance.balance,s.finance.balance);for(const p of Object.values(n.squad)){assert.equal(p.identity,s.squad[p.id].identity);assert.equal(p.xp,s.squad[p.id].xp);assert.equal(p[F.roleKey(p)],s.squad[p.id][F.roleKey(p)]);}assert.doesNotThrow(()=>S.restore(copy(n)));
});

test('corrupt medical counters, reports, injury types and match availability are rejected',()=>{
 const {after:s}=injuryFixture(),injured=Object.values(s.squad).find(p=>p.injury);assert.ok(injured);const corrupt=fn=>{const bad=copy(s);fn(bad);assert.throws(()=>S.restore(bad));};corrupt(x=>x.health.playedGames++);corrupt(x=>x.health.originRound=2);corrupt(x=>x.health.originCupGames=1);corrupt(x=>x.health.year=2);corrupt(x=>x.health.lastReport=null);corrupt(x=>x.health.lastReport.incidents[0].identity='unknown');corrupt(x=>x.squad[injured.id].injury.remaining=3);corrupt(x=>x.squad[injured.id].injury.remaining=0);corrupt(x=>x.squad[injured.id].injury.kind='unknown');corrupt(x=>x.squad[injured.id].injury.since=99);corrupt(x=>x.match.players[injured.id].injuryRemaining=0);corrupt(x=>{const pos=injured.pos,index=x.match.lineup.findIndex(id=>x.match.players[id].pos===pos);x.match.lineup[index]=injured.id;});corrupt(x=>delete x.health);
});

test('v5 league saves migrate every phase without changing RNG, contracts, money, history or objectives',()=>{
 const old=oldV5();let raw=old.S.scout(old.S.create(608),'MID');raw=old.S.recruit(raw,raw.career.reports[0].candidates[0],'m3');const saves=[copy(raw)];old.F.begin(raw.match);old.F.finishSegment(raw.match);old.F.swap(raw.match,'f1','f3');saves.push(copy(raw));old.F.begin(raw.match);old.F.finishSegment(raw.match);saves.push(copy(raw));old.F.begin(raw.match);old.F.finishSegment(raw.match);saves.push(copy(raw));for(const save of saves){const migrated=S.restore(copy(save));assert.equal(migrated.version,8);assert.equal(migrated.match.version,5);compareOldMatch(migrated.match,save.match);assert.deepEqual(stripInjury(migrated.squad),canonicalNames(save.squad));assert.deepEqual(migrated.finance,save.finance);assert.deepEqual(migrated.history,save.history);assert.deepEqual(migrated.career,save.career);assert.equal(migrated.health.playedGames,0);assert.equal(migrated.health.originRound,save.round);assert.ok(Object.values(migrated.squad).every(p=>p.injury===null));const a=copy(save.match),b=copy(migrated.match);finish(a,old.F);finish(b,F);for(const k of ['rng','score','shots','chances','xg','logs'])assert.deepEqual(k==='logs'?displayLogs(legacyLogFields(b[k]),b.players):b[k],k==='logs'?displayLogs(a[k],a.players):copy(a[k]));assert.doesNotThrow(()=>S.restore(copy(migrated)));}
});

test('v5 cup saves migrate every phase with the same shootout and preserved past cup records',()=>{
 const old=oldV5();let raw=old.S.create(549);while(raw.competition!=='cup'){finish(raw.match,old.F);raw=old.S.settle(raw);}const saves=[copy(raw)];old.F.begin(raw.match);old.F.finishSegment(raw.match);saves.push(copy(raw));old.F.begin(raw.match);old.F.finishSegment(raw.match);saves.push(copy(raw));old.F.begin(raw.match);old.F.finishSegment(raw.match);saves.push(copy(raw));for(const save of saves){let migrated=S.restore(copy(save));assert.equal(migrated.competition,'cup');compareOldMatch(migrated.match,save.match);assert.deepEqual(migrated.finance,save.finance);assert.deepEqual(migrated.cup,save.cup);assert.equal(migrated.health.originRound,4);assert.equal(migrated.health.playedGames,0);const a=copy(save.match);finish(a,old.F);finish(migrated.match);const expected=copy(old.P.preview(save,a));migrated=S.settle(migrated);assert.deepEqual(migrated.cup.results.find(r=>r.home===S.own||r.away===S.own),expected);assert.equal(migrated.health.playedGames,1);assert.doesNotThrow(()=>S.restore(copy(migrated)));}
});

console.log('Health tests passed: '+groups+' groups.');
