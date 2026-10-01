'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const F=require('./dist/engine.js');
const E=require('./dist/economy.js');
const S=require('./dist/season.js');
const copy=x=>JSON.parse(JSON.stringify(x));
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
function complete(m,engine=F){while(m.phase!=='full'){if(['prep','half','late'].includes(m.phase))engine.begin(m);engine.finishSegment(m);}return m;}
function finishCups(s){while(s.competition==='cup'){complete(s.match);s=S.settle(s);}return s;}
function playRound(s){s=finishCups(s);complete(s.match);return finishCups(S.settle(s));}
function rejectRecruit(s,identity,slot){const before=JSON.stringify(s);assert.throws(()=>E.recruit(s,identity,slot));assert.equal(JSON.stringify(s),before,'failed recruitment must not partially mutate state');}
function legacyLoader(){const context=vm.createContext({});const base=path.join(__dirname,'legacy-v2');for(const file of ['engine.js','season.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context,{filename:'legacy-'+file});return {F:context.Football,S:context.Season};}

test('starting money, contracts, same-position quotes and capped outgoing value',()=>{
 const s=S.create();assert.equal(s.version,8);assert.equal(s.finance.balance,160000);assert.equal(Object.keys(s.squad).length,18);assert.equal(E.wages(s),Object.values(s.squad).reduce((n,p)=>n+p.wage,0));
 const q=E.quote(s,'t_f2','f1');assert.equal(q.cost,q.fee-q.credit+q.commission);assert.equal(q.balanceAfter,s.finance.balance-q.cost);assert.equal(q.wageChange,F.identityProfile('t_f2').wage-s.squad.f1.wage);assert.throws(()=>E.quote(s,'t_f2','g1'));
 const p=copy(s.squad.f1);p.attack=99;assert.ok(E.resale(p)<=Math.floor(p.fee*.85/1000)*1000);assert.ok(E.resale(p)<p.fee);
});

test('atomic recruitment preserves formation, lineup, tactic and spent weekly training',()=>{
 const s=S.create();F.setFormation(s.match,'433');assert.ok(!s.match.lineup.includes('f3'));F.swap(s.match,'f1','f3');assert.ok(!s.match.lineup.includes('f1'));F.setTactic(s.match,'counter');S.train(s,'pace');s.squad.f1.xp=810;const before=JSON.stringify(s),lineup=copy(s.match.lineup),q=E.quote(s,'t_f2','f1');
 const n=E.recruit(s,'t_f2','f1');assert.equal(JSON.stringify(s),before);assert.equal(Object.keys(n.squad).length,18);assert.deepEqual(n.match.lineup,lineup);assert.equal(n.match.formation,'433');assert.equal(n.match.tactic,'counter');assert.equal(n.trained,'pace');assert.deepEqual(n.plan,s.plan);
 assert.equal(n.squad.f1.id,'f1');assert.equal(n.squad.f1.identity,'t_f2');assert.equal(n.squad.f1.name,F.identityProfile('t_f2').name);assert.equal(n.squad.f1.no,s.squad.f1.no);assert.equal(n.squad.f1.xp,0);assert.equal(n.squad.f1.speed,F.identityProfile('t_f2').speed);assert.equal(n.match.players.f1.name,n.squad.f1.name);assert.equal(n.match.players.f1.initialEnergy,n.squad.f1.energy);assert.equal(n.match.players.f1.minutes,0);
 assert.equal(n.finance.balance,s.finance.balance-q.cost);assert.equal(n.finance.ledger.length,1);assert.equal(n.finance.ledger[0].outgoingPrimary,s.squad.f1.attack);assert.deepEqual(n.finance.marketUsed,['t_f2']);assert.equal(n.finance.transferWeek,'1-0');assert.throws(()=>S.train(n,'technique'));assert.equal(S.restore(copy(n)).squad.f1.identity,'t_f2');assert.equal(F.restore(copy(n.match)).players.f1.identity,'t_f2');
});

test('illegal, unaffordable, repeated and mid-match recruitment leave state unchanged',()=>{
 const s=S.create();rejectRecruit(s,'unknown','f1');rejectRecruit(s,'t_f2','g1');rejectRecruit(s,'t_f2','missing');const poor=copy(s);poor.finance.balance=0;rejectRecruit(poor,'t_f1','f1');
 let n=E.recruit(s,'t_f2','f1');rejectRecruit(n,'t_g1','g1');F.begin(n.match);rejectRecruit(n,'t_g1','g1');F.finishSegment(n.match);rejectRecruit(n,'t_g1','g1');F.begin(n.match);F.finishSegment(n.match);rejectRecruit(n,'t_g1','g1');F.begin(n.match);F.finishSegment(n.match);rejectRecruit(n,'t_g1','g1');n=S.settle(n);rejectRecruit(n,'t_f2','f2');assert.doesNotThrow(()=>E.recruit(n,'t_g2','g2'));
});

test('home/away gate, sponsor, outcome bonus and wages reconcile every completed round',()=>{
 let s=S.create(101);s=E.recruit(s,'t_m2','m6');let expected=s.finance.balance;
 for(let r=0;r<14;r++){const fixture=S.fixtureFor(s),payroll=E.wages(s);complete(s.match);const score=copy(s.match.score),before=JSON.stringify(s);s=S.settle(s);const e=s.finance.ledger.find(x=>x.id==='match-1-'+(r+1));assert.equal(e.gate,fixture.home===S.own?25000:10000);assert.equal(e.sponsor,7500);assert.equal(e.bonus,score[0]>score[1]?2500:score[0]===score[1]?1000:0);assert.equal(e.payroll,payroll);assert.equal(e.amount,e.gate+e.sponsor+e.bonus-e.payroll);expected+=e.amount;assert.equal(s.lastReport.cashflow.id,e.id);assert.equal(s.finance.transferWeek,null);assert.doesNotThrow(()=>S.restore(copy(s)));assert.ok(before.length>0);s=finishCups(s);}
 const goals=s.finance.ledger.filter(e=>e.type==='goal');assert.equal(goals.length,1);expected+=goals[0].amount+s.finance.ledger.filter(e=>(e.type==='board'||e.type==='cup')).reduce((n,e)=>n+e.amount,0);assert.equal(s.finance.balance,expected);assert.deepEqual(s.finance.outcome,E.goal(s,S.standings(s)));assert.throws(()=>S.settle(s));assert.throws(()=>E.finishSeason(copy(s),S.standings(s)));
 const before=JSON.stringify(s),n=S.nextSeason(s);assert.equal(JSON.stringify(s),before);assert.equal(n.finance.balance,s.finance.balance);assert.equal(n.finance.ledger.length,s.finance.ledger.length);assert.equal(n.finance.outcome,null);assert.deepEqual(n.finance.marketUsed,[]);assert.equal(n.finance.transferWeek,null);assert.equal(n.squad.m6.identity,'t_m2');assert.equal(n.match.players.m6.identity,'t_m2');assert.equal(n.squad.m6.xp,s.squad.m6.xp);assert.equal(n.squad.m6.potential,s.squad.m6.potential);assert.doesNotThrow(()=>S.restore(copy(n)));rejectRecruit(n,'t_m2','m5');
});

test('legacy goal rewards select one bracket and honor changing season target',()=>{
 const s=S.create(),table=rank=>[{id:S.own,rank}];s.league={version:1,division:2,rules:'legacy'};for(const [year,rank,bonus,target] of [[1,1,100000,6],[1,3,60000,6],[1,6,30000,6],[1,7,0,6],[2,4,60000,4],[2,5,0,4],[3,1,100000,1],[3,2,0,1]]){s.year=year;assert.deepEqual(E.goal(s,table(rank)),{target,rank,achieved:rank<=target,bonus});}
 const round=S.create(),fixture=S.fixtureFor(round);E.applyRound(round,fixture,[0,0]);const before=JSON.stringify(round);assert.throws(()=>E.applyRound(round,fixture,[0,0]));assert.equal(JSON.stringify(round),before);
});

test('training and match experience stop at the recruited player potential without false growth reports',()=>{
 let s=E.recruit(S.create(),'t_f1','f1');s.squad.f1.attack=s.squad.f1.potential;s.match.players.f1.attack=s.squad.f1.potential;s.career.baselines[s.squad.f1.identity]=s.squad.f1.potential;s.squad.f1.xp=260;const cap=s.squad.f1.potential;S.train(s,'technique');assert.equal(s.squad.f1.attack,cap);assert.equal(s.match.players.f1.attack,cap);complete(s.match);s=S.settle(s);assert.equal(s.squad.f1.attack,cap);assert.equal(s.squad.f1.xp,350);assert.ok(!s.lastReport.changes.some(c=>c.id==='f1'));assert.equal(S.restore(copy(s)).squad.f1.attack,cap);
});

test('a sold player growth report keeps the outgoing identity while the replacement starts fresh',()=>{
 let s=S.create();for(let i=0;i<3;i++)s=playRound(s);const growth=s.lastReport.changes.find(c=>c.id==='f1');assert.ok(growth);assert.equal(growth.identity,'f1');assert.equal(s.squad.f1.xp,270);s=E.recruit(s,'t_f2','f1');const n=S.restore(copy(s));assert.equal(n.squad.f1.identity,'t_f2');assert.equal(n.squad.f1.xp,0);assert.equal(n.match.players.f1.name,F.identityProfile('t_f2').name);const old=n.lastReport.changes.find(c=>c.id==='f1');assert.equal(old.identity,'f1');assert.equal(old.name,F.identityProfile('f1').name);
});

test('saved finance arithmetic, duplicate ledger and corrupt player/cap values are rejected',()=>{
 let s=E.recruit(S.create(),'t_d2','d5');s=playRound(s);const corrupt=fn=>{const raw=copy(s);fn(raw);assert.throws(()=>S.restore(raw));};
 corrupt(x=>x.finance.balance++);corrupt(x=>x.finance.ledger.push(copy(x.finance.ledger[0])));corrupt(x=>x.finance.ledger[0].credit++);corrupt(x=>x.finance.ledger[0].amount++);corrupt(x=>x.finance.marketUsed=[]);corrupt(x=>x.finance.transferWeek='1-1');corrupt(x=>x.squad.d5.identity='not_a_person');corrupt(x=>x.squad.d5.identity='t_f1');corrupt(x=>x.squad.d5.potential=100);corrupt(x=>x.squad.d5.potential=10);corrupt(x=>x.match.players.d5.identity='d5');corrupt(x=>x.match.players.d5.potential=100);
 corrupt(x=>delete x.squad.g1.identity);corrupt(x=>{x.squad.g1.identity='g2';x.squad.g1.potential=F.identityProfile('g2').potential;x.squad.g1.keeping=63;});
 const badMatch=copy(s.match);badMatch.players.g1.identity='not_a_person';assert.throws(()=>F.restore(badMatch));
});

test('reconciled but false gate, bonus, payroll, missing match, contract and origin histories are rejected',()=>{
 let s=E.recruit(S.create(),'t_d2','d5');s=playRound(s);const corrupt=fn=>{const raw=copy(s);fn(raw);assert.throws(()=>S.restore(raw));};
 const editMatch=(raw,edit)=>{const e=raw.finance.ledger.find(x=>x.type==='match'),old=e.amount;edit(e);e.income=e.gate+e.sponsor+e.bonus;e.amount=e.income-e.payroll;raw.finance.balance+=e.amount-old;};
 corrupt(x=>editMatch(x,e=>e.payroll=0));corrupt(x=>editMatch(x,e=>e.gate=e.gate===25000?10000:25000));corrupt(x=>editMatch(x,e=>e.bonus=e.bonus===2500?0:2500));
 corrupt(x=>{const i=x.finance.ledger.findIndex(e=>e.type==='match'),e=x.finance.ledger.splice(i,1)[0];x.finance.balance-=e.amount;});
 corrupt(x=>x.finance.ledger.reverse());corrupt(x=>delete x.finance.origin);corrupt(x=>x.finance.origin.year=2);
 corrupt(x=>{x.squad.d1.identity='t_d1';x.match.players.d1.identity='t_d1';});
});

test('multi-season contracts carry, prevent duplicate hiring, support later sale and keep goal/match completeness',()=>{
 let s=E.recruit(S.create(121),'t_f2','f1');while(s.round<14)s=playRound(s);const completed=copy(s),goal=completed.finance.ledger.find(e=>e.type==='goal');completed.finance.ledger=completed.finance.ledger.filter(e=>e!==goal);completed.finance.balance-=goal.amount;assert.throws(()=>S.restore(completed));
 s=S.nextSeason(s);assert.equal(s.squad.f1.identity,'t_f2');rejectRecruit(s,'t_f2','f2');s=E.recruit(s,'t_f1','f1');assert.equal(s.finance.ledger.at(-1).outgoing,'t_f2');assert.equal(s.squad.f1.xp,0);assert.equal(S.restore(copy(s)).squad.f1.identity,'t_f1');s=playRound(s);
 assert.doesNotThrow(()=>E.recruit(s,'t_f2','f2'));s=E.recruit(s,'t_f2','f2');assert.equal(s.squad.f2.xp,0);while(s.round<14)s=playRound(s);assert.equal(s.finance.ledger.filter(e=>e.type==='goal').length,2);assert.equal(s.finance.ledger.filter(e=>e.type==='match').length,28);assert.equal(s.finance.ledger.filter(e=>e.type==='transfer').length,3);const n=S.nextSeason(S.restore(copy(s)));assert.equal(n.squad.f1.identity,'t_f1');assert.equal(n.squad.f2.identity,'t_f2');rejectRecruit(n,'t_f1','f3');rejectRecruit(n,'t_f2','f3');assert.equal(n.finance.balance,s.finance.balance);assert.doesNotThrow(()=>S.restore(copy(n)));
});

test('legacy v2 prep, halftime, 65 minutes and full-time states migrate without reroll or stat loss',()=>{
 const old=legacyLoader();let s=old.S.create(777);old.S.train(s,'pace');old.F.setTactic(s.match,'counter');const saves=[copy(s)];old.F.begin(s.match);old.F.finishSegment(s.match);old.F.swap(s.match,'f1','f3');saves.push(copy(s));old.F.begin(s.match);old.F.finishSegment(s.match);old.F.swap(s.match,'m4','m5');old.F.setTactic(s.match,'press');saves.push(copy(s));old.F.begin(s.match);old.F.finishSegment(s.match);saves.push(copy(s));
 for(const saved of saves){const migrated=S.restore(copy(saved));assert.equal(migrated.version,8);assert.equal(migrated.match.version,5);assert.equal(migrated.match.rng,saved.match.rng);assert.equal(migrated.match.phase,saved.match.phase);assert.equal(migrated.trained,saved.trained);assert.deepEqual(migrated.match.lineup,saved.match.lineup);assert.equal(migrated.match.tactic,saved.match.tactic);assert.equal(migrated.finance.balance,160000);assert.equal(migrated.finance.ledger.length,0);for(const id of Object.keys(saved.squad)){for(const k of ['attack','defense','passing','speed','endurance','keeping','energy','xp'])assert.equal(migrated.squad[id][k],saved.squad[id][k]);assert.equal(migrated.squad[id].identity,id);assert.ok(migrated.squad[id].potential>=migrated.squad[id][F.roleKey(migrated.squad[id])]);}
  const legacyMatch=copy(saved.match),newMatch=copy(migrated.match);complete(legacyMatch,old.F);complete(newMatch,F);for(const k of ['rng','score','shots','chances','xg'])assert.deepEqual(newMatch[k],legacyMatch[k]);for(const id of Object.keys(legacyMatch.players)){assert.equal(newMatch.players[id].energy,legacyMatch.players[id].energy);assert.equal(newMatch.players[id].minutes,legacyMatch.players[id].minutes);}assert.doesNotThrow(()=>S.restore(copy(migrated)));
 }
});

test('legacy completed season keeps past growth, gets no retrospective money, then advances normally',()=>{
 const old=legacyLoader();let s=old.S.create(999);while(s.round<14){old.S.train(s,'technique');complete(s.match,old.F);s=old.S.settle(s);}const raw=copy(s),migrated=S.restore(raw);assert.equal(migrated.round,14);assert.equal(migrated.finance.balance,160000);assert.equal(migrated.finance.ledger.length,0);assert.deepEqual(migrated.finance.outcome,E.goal(migrated,S.standings(migrated)));assert.ok(Object.values(raw.squad).some(p=>p[F.roleKey(p)]>F.identityProfile(p.id).potential),'legacy fixture must exercise stats above new default cap');for(const id of Object.keys(raw.squad)){assert.equal(migrated.squad[id][F.roleKey(raw.squad[id])],raw.squad[id][F.roleKey(raw.squad[id])]);assert.ok(migrated.squad[id].potential>=raw.squad[id][F.roleKey(raw.squad[id])]);}
 const n=S.nextSeason(migrated);assert.equal(n.finance.balance,160000);assert.equal(n.finance.outcome,null);assert.equal(n.year,2);assert.doesNotThrow(()=>S.restore(copy(n)));const paid=playRound(n);assert.equal(paid.finance.ledger.filter(e=>e.type==='match').length,1);assert.equal(paid.finance.ledger.filter(e=>e.type==='goal').length,0);assert.doesNotThrow(()=>S.restore(copy(paid)));
});

test('pyramid goals reward promotion and upper-division survival without stacking brackets',()=>{
 const s=S.create(),table=rank=>[{id:S.own,rank}];for(const [division,rank,bonus,target] of [[2,1,100000,2],[2,2,60000,2],[2,3,0,2],[2,8,0,2],[1,1,180000,6],[1,3,90000,6],[1,4,50000,6],[1,6,50000,6],[1,7,0,6]]){s.league={version:1,division,rules:'pyramid'};assert.equal(E.target(s),target);assert.deepEqual(E.goal(s,table(rank)),{target,rank,achieved:rank<=target,bonus});}
});

test('upper-division league and Cup receipts use their tier while payroll stays unchanged',()=>{
 const s=S.create();s.league={version:1,division:1,rules:'pyramid'};const r=E.rates(s),payroll=E.wages(s);assert.deepEqual(r,{gateHome:40000,gateAway:18000,sponsor:12000,winBonus:5000,drawBonus:2000,cupHome:28000,cupAway:12000,cupBonuses:[24000,44000,100000]});
 for(const [home,score,gate,bonus] of [[true,[2,0],40000,5000],[false,[1,1],18000,2000],[true,[0,1],40000,0]]){const state=copy(s),fixture={home:home?S.own:'calderwick',away:home?'calderwick':S.own},entry=E.applyRound(state,fixture,score);assert.equal(entry.gate,gate);assert.equal(entry.bonus,bonus);assert.equal(entry.payroll,payroll);assert.equal(entry.amount,gate+12000+bonus-payroll);}
 for(const stage of [0,1,2]){const state=copy(s);state.round=[4,8,12][stage];const entry=E.applyCup(state,{stage,week:state.round,home:S.own,away:'calderwick',winner:S.own});assert.equal(entry.gate,28000);assert.equal(entry.advanceBonus,[24000,44000,100000][stage]);assert.equal(entry.amount,entry.gate+entry.advanceBonus);assert.ok(!Object.hasOwn(entry,'payroll'));}
 const state=copy(s);state.round=4;const loss=E.applyCup(state,{stage:0,week:4,home:'calderwick',away:S.own,winner:'calderwick'});assert.equal(loss.amount,12000);assert.equal(loss.advanceBonus,0);assert.throws(()=>E.applyCup(copy(state),{stage:1,week:4,home:S.own,away:'aldermere',winner:S.own}),'lower-league clubs cannot generate upper-league Cup receipts');
});

test('promotion preserves old receipts, uses upper income next year and rejects tier-repriced history',()=>{
 let s=S.create(121);for(const p of Object.values(s.squad)){for(const key of ['attack','defense','passing','speed','endurance','keeping']){p[key]=99;s.match.players[p.id][key]=99;}p.potential=99;s.match.players[p.id].potential=99;s.career.baselines[p.identity]=99;p.energy=100;s.match.players[p.id].energy=100;s.match.players[p.id].initialEnergy=100;}
 while(s.round<14)s=playRound(s);assert.ok(S.standings(s).find(c=>c.id===S.own).rank<=2,'developed fixture should earn promotion');assert.doesNotThrow(()=>S.restore(copy(s)));const oldLedger=copy(s.finance.ledger),oldBalance=s.finance.balance;
 s=S.nextSeason(s);assert.equal(s.league.division,1);assert.deepEqual(s.finance.ledger,oldLedger);assert.equal(s.finance.balance,oldBalance);assert.equal(E.rates(s,1).gateHome,25000);assert.equal(E.target(s,1),2);s=playRound(s);const upper=s.finance.ledger.find(e=>e.type==='match'&&e.year===2);assert.equal(upper.sponsor,12000);assert.ok([18000,40000].includes(upper.gate));assert.doesNotThrow(()=>S.restore(copy(s)));
 const bad=copy(s),old=bad.finance.ledger.find(e=>e.type==='match'&&e.year===1),before=old.amount;old.gate=old.gate===25000?40000:18000;old.sponsor=12000;old.bonus=old.bonus===2500?5000:old.bonus===1000?2000:0;old.income=old.gate+old.sponsor+old.bonus;old.amount=old.income-old.payroll;bad.finance.balance+=old.amount-before;assert.throws(()=>S.restore(bad),'reconciled historical receipts must retain their original tier prices');
 const wrongGoal=copy(s),entry=wrongGoal.finance.ledger.find(e=>e.type==='goal'&&e.year===1);entry.target=6;assert.throws(()=>S.restore(wrongGoal),'past lower goal remains promotion after moving to the upper tier');
});

console.log('Economy tests passed: '+passed+' groups.');
