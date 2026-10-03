const legacyLogFields=logs=>logs.map(({scorerId,scorerIdentity,assistId,assistIdentity,...event})=>event);
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),E=require('./dist/economy.js'),S=require('./dist/season.js');
const C=globalThis.Career;
const copy=x=>JSON.parse(JSON.stringify(x));
function canonicalNames(value){const out=JSON.parse(JSON.stringify(value));const visit=o=>{if(!o||typeof o!=='object')return;if(typeof o.name==='string'){const p=F.identityProfile(o.identity||o.id);if(p)o.name=p.name;}for(const v of Object.values(o))visit(v);};visit(out);return out;}
function displayLogs(logs,players){return JSON.parse(JSON.stringify(logs)).map(e=>({...e,text:F.displayText(e.text,players)}));}
function legacySquad(squad){return Object.fromEntries(Object.entries(canonicalNames(squad)).map(([id,p])=>[id,{...p,injury:null}]));}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
function finish(m,engine=F){while(m.phase!=='full'){if(!engine.running(m))engine.begin(m);engine.finishSegment(m);}return m;}
function finishCups(s){while(s.competition==='cup'){finish(s.match);s=S.settle(s);}return s;}
function play(s){s=finishCups(s);finish(s.match);return finishCups(S.settle(s));}
function rejectAtomic(s,fn){const before=JSON.stringify(s);assert.throws(()=>fn(s));assert.equal(JSON.stringify(s),before);}
function report(s){return s.career.reports.at(-1);}
function firstCandidate(s){return report(s).candidates[0];}
function scoutRecruit(seed=411,pos='FW',slot='f1'){let s=S.scout(S.create(seed),pos);return S.recruit(s,firstCandidate(s),slot);}
function loadV3(){const ctx=vm.createContext({}),base=path.join(__dirname,'legacy-v3');for(const file of ['engine.js','economy.js','season.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),ctx,{filename:'v3-'+file});return {F:ctx.Football,E:ctx.Economy,S:ctx.Season};}

test('career begins without retrospective objectives and records each current contract',()=>{
 const s=S.create(411);assert.equal(s.version,8);assert.equal(s.career.year,1);assert.equal(s.career.originRound,0);assert.deepEqual(s.career.reports,[]);assert.deepEqual(s.career.missions,{wins:null,growth:null,youth:null});assert.deepEqual(C.progress(s),{wins:0,growth:0,youth:0});
 for(const p of Object.values(s.squad)){assert.equal(s.career.baselines[p.identity],p[F.roleKey(p)]);assert.equal(s.career.minutes[p.identity],0);}assert.deepEqual(S.restore(copy(s)),s);
});

test('paid scouting is deterministic across save and restore and creates canonical distinct players',()=>{
 const a=S.create(411),before=JSON.stringify(a),b=S.scout(a,'FW');assert.equal(JSON.stringify(a),before);assert.equal(a.finance.balance-b.finance.balance,12000);assert.equal(report(b).cycle,1);assert.equal(report(b).round,1);assert.equal(report(b).pos,'FW');assert.equal(report(b).candidates.length,3);assert.equal(new Set(report(b).candidates).size,3);
 const again=S.scout(S.create(411),'FW');assert.deepEqual(report(again),report(b));const restored=S.restore(copy(b));assert.deepEqual(report(restored),report(b));assert.equal(restored.finance.balance,b.finance.balance);
 for(const id of report(b).candidates){assert.match(id,/^y_411_1_1_FW_[123]$/);const p=F.identityProfile(id);assert.ok(p);assert.equal(p.pos,'FW');assert.ok(p.age>=16&&p.age<=21);assert.ok(p.potential>=p.attack&&p.potential<=99);assert.ok(Number.isSafeInteger(p.fee)&&Number.isSafeInteger(p.wage));assert.deepEqual(F.identityProfile(id),F.identityProfile(id));}
 assert.equal(b.finance.ledger.filter(e=>e.type==='scout').length,1);assert.ok(b.finance.ledger.find(e=>e.type==='scout').amount===-12000);
});

test('invalid, unaffordable, repeated and mid-match scouting is atomic',()=>{
 const s=S.create();rejectAtomic(s,x=>S.scout(x,'CB'));const poor=copy(s);poor.finance.balance=11999;rejectAtomic(poor,x=>S.scout(x,'FW'));
 let n=S.scout(s,'GK');rejectAtomic(n,x=>S.scout(x,'FW'));F.begin(n.match);rejectAtomic(n,x=>S.scout(x,'DEF'));F.finishSegment(n.match);rejectAtomic(n,x=>S.scout(x,'MID'));finish(n.match);rejectAtomic(n,x=>S.scout(x,'GK'));n=S.settle(n);rejectAtomic(n,x=>S.scout(x,'FW'));assert.equal(n.career.reports.length,1);
});

test('one new report becomes available in the second half without rerolling the first report',()=>{
 let s=S.scout(S.create(412),'DEF');const first=copy(report(s));for(let i=0;i<7;i++)s=play(s);assert.equal(s.round,7);s=S.scout(s,'MID');assert.equal(report(s).cycle,2);assert.equal(report(s).round,8);assert.equal(report(s).pos,'MID');assert.equal(s.career.reports.length,2);assert.deepEqual(s.career.reports[0],first);assert.ok(report(s).candidates.every(id=>/^y_412_1_2_MID_[123]$/.test(id)));assert.doesNotThrow(()=>S.restore(copy(s)));rejectAtomic(s,x=>S.scout(x,'FW'));
});

test('academy promotion requires a paid report and keeps the same 18-slot squad and weekly training',()=>{
 let s=S.create(413);rejectAtomic(s,x=>S.recruit(x,'y_413_1_1_FW_1','f1'));s=S.scout(s,'FW');const incoming=firstCandidate(s),quote=E.quote(s,incoming,'f1');F.setFormation(s.match,'433');assert.ok(!s.match.lineup.includes('f3'));F.swap(s.match,'f1','f3');assert.ok(!s.match.lineup.includes('f1'));F.setTactic(s.match,'counter');S.train(s,'pace');const before=JSON.stringify(s),lineup=copy(s.match.lineup),rng=s.match.rng,n=S.recruit(s,incoming,'f1');
 assert.equal(JSON.stringify(s),before);assert.equal(Object.keys(n.squad).length,18);assert.equal(new Set(Object.values(n.squad).map(p=>p.identity)).size,18);assert.equal(n.squad.f1.identity,incoming);assert.equal(n.squad.f1.xp,0);assert.equal(n.squad.f1.energy,100);assert.equal(n.match.players.f1.initialEnergy,100);assert.equal(n.match.players.f1.minutes,0);assert.equal(n.match.rng,rng);assert.deepEqual(n.match.lineup,lineup);assert.equal(n.match.formation,'433');assert.equal(n.match.tactic,'counter');assert.equal(n.trained,'pace');assert.equal(n.finance.balance,s.finance.balance-quote.cost);assert.equal(n.career.baselines[incoming],n.squad.f1.attack);assert.equal(n.career.minutes[incoming],0);assert.equal(S.restore(copy(n)).squad.f1.name,F.identityProfile(incoming).name);
 rejectAtomic(s,x=>S.recruit(x,incoming,'g1'));rejectAtomic(s,x=>S.recruit(x,'y_413_1_1_MID_1','m1'));rejectAtomic(s,x=>S.recruit(x,'y_414_1_1_FW_1','f1'));rejectAtomic(n,x=>S.recruit(x,report(n).candidates[1],'f2'));rejectAtomic(n,x=>E.recruit(x,'t_g2','g2'));assert.throws(()=>S.train(n,'recovery'));
});

test('direct economy recruitment also registers the new identity and carries contracts after reload',()=>{
 let s=S.scout(S.create(414),'GK'),id=firstCandidate(s);s=E.recruit(s,id,'g2');assert.equal(s.career.baselines[id],s.squad.g2.keeping);assert.equal(s.career.minutes[id],0);assert.equal(F.restore(copy(s.match)).players.g2.identity,id);assert.equal(S.restore(copy(s)).squad.g2.identity,id);
 const q=E.quote(s,'t_g1','g2');assert.equal(q.credit,E.resale(s.squad.g2));s=play(s);s=E.recruit(s,'t_g1','g2');assert.equal(s.finance.ledger.at(-1).outgoing,id);assert.equal(s.career.minutes[id],0);assert.equal(S.restore(copy(s)).squad.g2.identity,'t_g1');
});

test('academy minutes count actual substitute play and ignore the bench',()=>{
 let s=scoutRecruit(415,'FW','f3'),id=s.squad.f3.identity;assert.ok(!s.match.lineup.includes('f3'));F.begin(s.match);F.finishSegment(s.match);F.swap(s.match,'f1','f3');finish(s.match);s=S.settle(s);assert.equal(s.career.minutes[id],45);assert.equal(C.progress(s).youth,45);assert.equal(s.career.minutes.g2,0);assert.equal(s.career.missions.youth,null);
 F.swap(s.match,'f3','f1');s=play(s);assert.equal(s.career.minutes[id],45);assert.equal(C.progress(s).youth,45);assert.equal(S.restore(copy(s)).career.minutes[id],45);
});

test('academy 270-minute and growth goals pay once and retain sold-player progress',()=>{
 let s=scoutRecruit(416),id=s.squad.f1.identity;for(let r=0;r<3;r++){S.train(s,'technique');s=play(s);}assert.equal(s.career.minutes[id],270);assert.equal(s.career.missions.youth,3);assert.equal(s.career.missions.growth,3);assert.ok(C.progress(s).growth>=3);const board=s.finance.ledger.filter(e=>e.type==='board');assert.equal(board.filter(e=>e.task==='youth').length,1);assert.equal(board.find(e=>e.task==='youth').amount,25000);assert.equal(board.find(e=>e.task==='growth').amount,15000);const restored=S.restore(copy(s));assert.deepEqual(restored.career,s.career);
 s=S.recruit(s,'t_f2','f1');assert.equal(s.career.minutes[id],270);assert.ok(s.career.baselines[id]);s=play(s);assert.equal(s.finance.ledger.filter(e=>e.type==='board'&&e.task==='youth').length,1);assert.equal(s.finance.ledger.filter(e=>e.type==='board'&&e.task==='growth').length,1);assert.equal(s.career.missions.youth,3);assert.ok(C.progress(s).youth>=270);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('replacement academy players do not inherit sold-player minutes or combine their task progress',()=>{
 let s=S.scout(S.create(421),'FW'),first=report(s).candidates[0],second=report(s).candidates[1];s=S.recruit(s,first,'f1');s=play(s);assert.equal(s.career.minutes[first],90);s=S.recruit(s,second,'f1');assert.equal(s.squad.f1.xp,0);assert.equal(s.career.minutes[second],0);s=play(s);assert.equal(s.career.minutes[first],90);assert.equal(s.career.minutes[second],90);assert.equal(C.progress(s).youth,90);assert.equal(s.career.missions.youth,null);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('the third league win automatically pays only once and all cash remains reconciled',()=>{
 let s=S.create(20260930);while(s.round<14){if(!s.trained)S.train(s,'technique');s=play(s);}const wins=S.standings(s).find(r=>r.id===S.own).won;assert.ok(wins>=3,'deterministic fixture must reach the third win');assert.equal(C.progress(s).wins,wins);const board=s.finance.ledger.filter(e=>e.type==='board'&&e.task==='wins');assert.equal(board.length,1);assert.equal(board[0].amount,20000);assert.equal(s.career.missions.wins,board[0].round);const results=s.results.filter(r=>r.home===S.own||r.away===S.own).filter(r=>r.home===S.own?r.goals[0]>r.goals[1]:r.goals[1]>r.goals[0]);assert.equal(board[0].round,results[2].round+1);assert.equal(s.finance.balance,s.finance.opening+s.finance.ledger.reduce((n,e)=>n+e.amount,0));assert.doesNotThrow(()=>S.restore(copy(s)));rejectAtomic(s,x=>E.awardBoard(x,'wins',wins));
});

test('a new season retains youth contracts and cash but begins new reports and goals',()=>{
 let s=scoutRecruit(417,'MID','m6'),id=s.squad.m6.identity;while(s.round<14)s=play(s);const before=JSON.stringify(s),n=S.nextSeason(s);assert.equal(JSON.stringify(s),before);assert.equal(n.finance.balance,s.finance.balance);assert.equal(n.squad.m6.identity,id);assert.equal(n.squad.m6.name,F.identityProfile(id).name);assert.equal(n.squad.m6.xp,s.squad.m6.xp);assert.equal(n.career.year,2);assert.equal(n.career.originRound,0);assert.deepEqual(n.career.reports,[]);assert.deepEqual(n.career.missions,{wins:null,growth:null,youth:null});assert.equal(n.career.minutes[id],0);assert.equal(n.career.baselines[id],n.squad.m6.passing);assert.doesNotThrow(()=>S.restore(copy(n)));const nextReport=S.scout(n,'MID');assert.ok(report(nextReport).candidates.every(x=>/^y_417_2_1_MID_[123]$/.test(x)));assert.ok(!report(nextReport).candidates.includes(id));assert.doesNotThrow(()=>S.restore(copy(nextReport)));
});

test('malformed reports, identities, progress and mission ledgers are rejected',()=>{
 let s=scoutRecruit(418);for(let r=0;r<3;r++){S.train(s,'technique');s=play(s);}const corrupt=fn=>{const bad=copy(s);fn(bad);assert.throws(()=>S.restore(bad));};
 corrupt(x=>x.career.reports[0].pos='MID');corrupt(x=>x.career.reports[0].candidates[0]='y_419_1_1_FW_1');corrupt(x=>x.career.reports[0].candidates.pop());corrupt(x=>x.career.reports.push(copy(x.career.reports[0])));corrupt(x=>x.career.originRound=14);corrupt(x=>x.career.year=2);corrupt(x=>x.career.minutes[x.squad.f1.identity]=-1);corrupt(x=>x.career.minutes[x.squad.f1.identity]=271);corrupt(x=>x.career.minutes.g1--);corrupt(x=>delete x.career.baselines[x.squad.f1.identity]);corrupt(x=>x.career.baselines[x.squad.f1.identity]=100);corrupt(x=>x.career.missions.youth=null);corrupt(x=>x.career.missions.growth=2);
 corrupt(x=>{const i=x.finance.ledger.findIndex(e=>e.type==='scout'),e=x.finance.ledger.splice(i,1)[0];x.finance.balance-=e.amount;});corrupt(x=>{const i=x.finance.ledger.findIndex(e=>e.type==='board'&&e.task==='youth'),e=x.finance.ledger.splice(i,1)[0];x.finance.balance-=e.amount;});corrupt(x=>{const e=x.finance.ledger.find(e=>e.type==='board'&&e.task==='growth');e.amount++;x.finance.balance++;});corrupt(x=>delete x.career);corrupt(x=>x.squad.f1.identity='y_418_1_1_FW_9');
});

test('v3 prep, halftime, late and full-time saves migrate without changing finance or match state',()=>{
 const old=loadV3();let original=old.E.recruit(old.S.create(419),'t_f2','f1');old.S.train(original,'pace');old.F.setFormation(original.match,'433');old.F.setTactic(original.match,'counter');const saves=[copy(original)];old.F.begin(original.match);old.F.finishSegment(original.match);old.F.swap(original.match,'f2','f4');saves.push(copy(original));old.F.begin(original.match);old.F.finishSegment(original.match);old.F.setTactic(original.match,'press');saves.push(copy(original));old.F.begin(original.match);old.F.finishSegment(original.match);saves.push(copy(original));
 for(const raw of saves){const migrated=S.restore(copy(raw));assert.equal(migrated.version,8);assert.equal(migrated.match.version,5);assert.deepEqual(migrated.finance,raw.finance);assert.deepEqual(migrated.squad,legacySquad(raw.squad));assert.equal(migrated.match.rng,raw.match.rng);assert.equal(migrated.match.phase,raw.match.phase);assert.equal(migrated.match.minute,raw.match.minute);assert.deepEqual(migrated.match.logs,raw.match.logs);assert.deepEqual(migrated.match.lineup,raw.match.lineup);assert.equal(migrated.match.tactic,raw.match.tactic);assert.deepEqual(C.progress(migrated),{wins:0,growth:0,youth:0});const oldMatch=copy(raw.match),newMatch=copy(migrated.match);finish(oldMatch,old.F);finish(newMatch,F);for(const key of ['score','shots','chances','rng','xg','logs'])assert.deepEqual(key==='logs'?displayLogs(legacyLogFields(newMatch[key]),newMatch.players):newMatch[key],key==='logs'?displayLogs(oldMatch[key],oldMatch.players):copy(oldMatch[key]));assert.doesNotThrow(()=>S.restore(copy(migrated)));}
});

test('v3 midseason and completed seasons migrate without retroactive board payments',()=>{
 const old=loadV3();let original=old.S.create(420);for(let r=0;r<14;r++){old.S.train(original,'technique');finish(original.match,old.F);original=old.S.settle(original);if(r!==3&&r!==13)continue;const migrated=S.restore(copy(original));assert.equal(migrated.round,original.round);assert.deepEqual(migrated.finance,copy(original.finance));assert.deepEqual(migrated.squad,legacySquad(original.squad));assert.equal(migrated.career.originRound,original.round);assert.deepEqual(C.progress(migrated),{wins:0,growth:0,youth:0});assert.equal(migrated.finance.ledger.filter(e=>e.type==='board').length,0);assert.doesNotThrow(()=>S.restore(copy(migrated)));if(r===13){const next=S.nextSeason(migrated);assert.equal(next.finance.balance,migrated.finance.balance);assert.equal(next.career.originRound,0);assert.equal(next.career.year,2);assert.doesNotThrow(()=>S.restore(copy(next)));}}
});

console.log('Career tests passed: '+passed+' groups.');
