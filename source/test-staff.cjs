'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),K=require('./dist/staff.js'),T=require('./dist/training.js'),E=require('./dist/economy.js'),H=require('./dist/health.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function candidate(s,role,tier=1){return K.candidates(s).find(c=>c.role===role&&c.tier===tier);}
function finish(m){while(m.phase!=='full'){if(!F.running(m))F.begin(m);F.finishSegment(m);}return m;}
function play(s){finish(s.match);return S.settle(s);}
function league(s){while(s.competition==='cup')s=play(s);return s;}
function rejectAtomic(s,fn){const before=JSON.stringify(s);assert.throws(()=>fn(s));assert.equal(JSON.stringify(s),before);}
function setEnergy(s,energy){for(const p of Object.values(s.squad)){p.energy=energy;s.match.players[p.id].energy=energy;s.match.players[p.id].initialEnergy=energy;}}

test('deterministic read-only candidate contracts expose concrete costs and effects',()=>{
 const s=S.create(3201),before=JSON.stringify(s),offers=K.candidates(s);assert.equal(offers.length,10);assert.deepEqual(offers,K.candidates(s));assert.equal(new Set(offers.map(p=>p.id)).size,10);
 for(const role of K.roles){assert.equal(offers.filter(p=>p.role===role).length,2);assert.equal(K.active(s,role),null);}for(const p of offers){assert.equal(p.term,7);assert.ok(p.fee>0&&p.wage>0);assert.ok(K.quote(s,'hire',p.id).available);}assert.equal(K.wages(s),0);assert.equal(K.medicalModifier(s),1);assert.equal(JSON.stringify(s),before);
});
test('hiring charges the actual finance ledger once and changes no player or random state',()=>{
 const s=S.create(3202),p=candidate(s,'FW'),before=copy(s),q=K.quote(s,'hire',p.id),result=K.hire(s,p.id);assert.equal(result.cost,p.fee);assert.equal(s.finance.balance,q.balanceAfter);assert.equal(s.finance.ledger.at(-1).amount,-p.fee);assert.equal(K.active(s,'FW').remaining,7);assert.equal(K.wages(s),p.wage);assert.deepEqual(s.squad,before.squad);assert.deepEqual(s.match,before.match);rejectAtomic(s,x=>K.hire(x,candidate(x,'FW',2).id));rejectAtomic(s,x=>K.renew(x,'FW'));rejectAtomic(s,x=>K.release(x,'FW'));assert.deepEqual(S.restore(copy(s)),s);E.validate(s,S.standings(s));
});
test('all five roles coexist while unavailable stages and insufficient funds fail atomically',()=>{
 const s=S.create(3203);for(const role of K.roles)K.hire(s,candidate(s,role).id);assert.equal(Object.keys(s.staff.contracts).length,5);assert.equal(K.wages(s),6300);assert.deepEqual(S.restore(copy(s)),s);rejectAtomic(s,x=>K.hire(x,'missing'));
 const poor=S.create(3204);poor.finance.balance=0;rejectAtomic(poor,x=>K.hire(x,candidate(x,'DEF').id));const running=S.create(3205);F.begin(running.match);rejectAtomic(running,x=>K.hire(x,candidate(x,'GK').id));rejectAtomic(running,x=>K.release(x,'GK'));
 let cup=S.create(3206);for(let i=0;i<4;i++)cup=play(cup);assert.equal(cup.competition,'cup');rejectAtomic(cup,x=>K.hire(x,candidate(x,'MED').id));
});
test('position coaches add only their own technical skill and conserve training energy',()=>{
 for(const role of ['GK','DEF','MID','FW']){const s=S.create(3210),p=candidate(s,role,2);K.hire(s,p.id);const before=copy(s);S.train(s,'technique');for(const player of Object.values(s.squad)){const key=F.roleKey(player),coached=player.pos===role;assert.equal(player[key],Math.min(player.potential,before.squad[player.id][key]+(coached?2:1)));assert.equal(player.energy,Math.min(100,Math.max(0,before.squad[player.id].energy-5)+(coached?2:0)));assert.equal(s.match.players[player.id][key],player[key]);assert.equal(s.match.players[player.id].initialEnergy,player.energy);}assert.deepEqual(S.restore(copy(s)),s);rejectAtomic(s,x=>K.training(x,'technique'));rejectAtomic(s,x=>S.train(x,'pace'));}
});
test('individual preview and applied coach bonuses agree exactly with one shared weekly action',()=>{
 const s=S.create(3211);setEnergy(s,40);K.hire(s,candidate(s,'FW',2).id);const before=copy(s),q=T.preview(s,'f3','technique');assert.equal(q.gain,3);assert.equal(q.cost,8);assert.equal(q.energyAfter,32);const done=T.train(s,'f3','technique',s.squad.f3.identity);assert.equal(done.after,q.after);assert.equal(s.squad.f3.attack,q.after);assert.equal(s.squad.f3.energy,q.energyAfter);for(const id of Object.keys(s.squad).filter(id=>id!=='f3'))assert.deepEqual(s.squad[id],before.squad[id]);assert.deepEqual(S.restore(copy(s)),s);rejectAtomic(s,x=>K.training(x,'technique','f3'));rejectAtomic(s,x=>T.train(x,'f3','pace'));
 const cap=S.create(3212);K.hire(cap,candidate(cap,'FW').id);cap.squad.f3.attack=cap.squad.f3.potential-1;cap.match.players.f3.attack=cap.squad.f3.attack;globalThis.Career.initialize(cap);assert.equal(T.preview(cap,'f3','technique').gain,1);T.train(cap,'f3','technique');assert.equal(cap.squad.f3.attack,cap.squad.f3.potential);assert.deepEqual(S.restore(copy(cap)),cap);
});
test('medical coach improves capped team and individual recovery without ending injury rest',()=>{
 const team=S.create(3213);setEnergy(team,50);K.hire(team,candidate(team,'MED',2).id);S.train(team,'recovery');assert.equal(team.squad.f3.energy,70);assert.equal(K.medicalModifier(team),.65);assert.deepEqual(S.restore(copy(team)),team);
 const single=S.create(3214);setEnergy(single,50);K.hire(single,candidate(single,'MED').id);const q=T.preview(single,'f3','recovery');assert.equal(q.gain,28);T.train(single,'f3','recovery');assert.equal(single.squad.f3.energy,78);assert.equal(single.squad.f2.energy,50);assert.deepEqual(S.restore(copy(single)),single);
 const clipped=S.create(3215);setEnergy(clipped,95);K.hire(clipped,candidate(clipped,'MED',2).id);S.train(clipped,'recovery');assert.equal(clipped.squad.f3.energy,100);
 const injury=S.create(3216);K.hire(injury,candidate(injury,'FW').id);injury.squad.f3.injury={remaining:1,kind:'knock',since:1};injury.match.players.f3.injuryRemaining=1;const before=injury.squad.f3.attack;S.train(injury,'technique');assert.equal(injury.squad.f3.attack,before);assert.equal(injury.squad.f3.injury.remaining,1);
});
test('contracts signed after completed training start bonuses next week and cannot create free growth',()=>{
 let s=S.create(3217);S.train(s,'technique');const skill=s.squad.f3.attack;K.hire(s,candidate(s,'FW').id);assert.equal(K.active(s,'FW').trainingFrom,1);rejectAtomic(s,x=>K.training(x,'technique'));assert.equal(s.squad.f3.attack,skill);assert.deepEqual(S.restore(copy(s)),s);s=play(s);const next=s.squad.f3.attack;S.train(s,'technique');assert.equal(s.squad.f3.attack,next+2);assert.deepEqual(S.restore(copy(s)),s);
});
test('coach fatigue reduction cannot create energy for exhausted team players',()=>{
 const s=S.create(32171);K.hire(s,candidate(s,'FW',2).id);setEnergy(s,1);S.train(s,'technique');for(const p of Object.values(s.squad))assert.equal(p.energy,0);assert.deepEqual(S.restore(copy(s)),s);
 const affordable=S.create(32172);K.hire(affordable,candidate(affordable,'FW',2).id);setEnergy(affordable,8);assert.equal(T.preview(affordable,'f3','technique').cost,8);assert.ok(T.preview(affordable,'f3','technique').available);T.train(affordable,'f3','technique');assert.equal(affordable.squad.f3.energy,0);assert.deepEqual(S.restore(copy(affordable)),affordable);
});
test('coached training and earned appearance growth preserve pending saves and board rewards',()=>{
 let pending=S.create(32173);T.train(pending,'f3','technique');pending=play(pending);K.hire(pending,candidate(pending,'FW').id);T.train(pending,'f3','technique');assert.equal(globalThis.Career.progress(pending).growth,5);assert.deepEqual(S.restore(copy(pending)),pending);pending=play(pending);assert.equal(pending.finance.ledger.find(e=>e.type==='board'&&e.task==='growth').progress,5);assert.deepEqual(S.restore(copy(pending)),pending);
 let appearance=S.create(32174);appearance.squad.f3.xp=180;F.swap(appearance.match,'f1','f3');K.hire(appearance,candidate(appearance,'FW').id);T.train(appearance,'f3','technique');appearance=play(appearance);assert.equal(appearance.squad.f3.xp,270);assert.equal(appearance.finance.ledger.find(e=>e.type==='board'&&e.task==='growth').progress,4);assert.deepEqual(S.restore(copy(appearance)),appearance);
});
test('league wages pay exactly seven times, expire after the final game, and never bill cups',()=>{
 let s=S.create(3218),p=candidate(s,'MED');K.hire(s,p.id);for(let i=0;i<7;i++){s=league(s);assert.equal(K.active(s,'MED').remaining,7-i);s=play(s);const staffEntries=s.finance.ledger.filter(e=>e.type==='staff-wages');assert.equal(staffEntries.length,i+1);assert.equal(staffEntries.at(-1).amount,-p.wage);assert.deepEqual(S.restore(copy(s)),s);rejectAtomic(s,x=>K.afterLeagueRound(x));if(s.competition==='cup'){const balance=s.finance.balance,count=staffEntries.length;s=play(s);assert.equal(s.finance.ledger.filter(e=>e.type==='staff-wages').length,count);assert.ok(s.finance.balance>balance);assert.deepEqual(S.restore(copy(s)),s);}}
 assert.equal(K.active(s,'MED'),null);assert.equal(K.wages(s),0);assert.equal(K.medicalModifier(s),1);s=league(s);s=play(s);assert.equal(s.finance.ledger.filter(e=>e.type==='staff-wages').length,7);
});
test('renewal extends the paid contract, blocks overlong terms, and release pays one wage penalty',()=>{
 let s=S.create(3219),p=candidate(s,'DEF');K.hire(s,p.id);s=play(s);const before=s.finance.balance;K.renew(s,'DEF');assert.equal(s.finance.balance,before-p.renewFee);assert.equal(K.active(s,'DEF').remaining,13);assert.deepEqual(S.restore(copy(s)),s);s=play(s);rejectAtomic(s,x=>K.renew(x,'DEF'));const wages=s.finance.ledger.filter(e=>e.type==='staff-wages').length,balance=s.finance.balance;K.release(s,'DEF');assert.equal(s.finance.balance,balance-p.wage);assert.equal(K.active(s,'DEF'),null);assert.deepEqual(S.restore(copy(s)),s);s=play(s);assert.equal(s.finance.ledger.filter(e=>e.type==='staff-wages').length,wages);
});
test('round terms continue across season changes and pay only newly completed league rounds',()=>{
 let s=S.create(3220);while(s.round<12)s=league(play(s));K.hire(s,candidate(s,'GK').id);assert.equal(K.active(s,'GK').expires,19);while(s.match)s=play(s);assert.ok(S.ready(s));assert.equal(K.active(s,'GK').remaining,5);assert.deepEqual(S.restore(copy(s)),s);s=S.nextSeason(s);assert.equal(K.active(s,'GK').remaining,5);assert.equal(s.staff.lastPayroll,14);assert.deepEqual(S.restore(copy(s)),s);while(s.round<5)s=league(play(s));assert.equal(K.active(s,'GK'),null);assert.equal(s.finance.ledger.filter(e=>e.type==='staff-wages').length,7);assert.deepEqual(S.restore(copy(s)),s);
});
test('legacy optional migration preserves existing finances and never grants retroactive bonuses',()=>{
 let s=S.create(3221);s=play(s);s=play(s);const raw=copy(s);delete raw.staff;const restored=S.restore(raw);assert.deepEqual(restored.finance,s.finance);assert.deepEqual(restored.squad,s.squad);assert.deepEqual(restored.match,s.match);assert.deepEqual(restored.staff.origin,{year:1,round:2});K.hire(restored,candidate(restored,'MID').id);assert.deepEqual(S.restore(copy(restored)),restored);
 const trained=S.create(3222);S.train(trained,'fitness');const old=copy(trained);delete old.staff;const migrated=S.restore(old);K.hire(migrated,candidate(migrated,'DEF').id);rejectAtomic(migrated,x=>K.training(x,'fitness'));assert.deepEqual(migrated.squad,trained.squad);
 const base=path.join(__dirname,'legacy-v2'),context=vm.createContext({});for(const file of ['engine.js','season.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context);const oldest=S.restore(copy(context.Season.create(3223)));assert.equal(oldest.version,9);assert.equal(K.wages(oldest),0);assert.doesNotThrow(()=>S.restore(copy(oldest)));
});
test('malformed or forged contract, payroll and finance records reject on restoration',()=>{
 let s=S.create(3224);K.hire(s,candidate(s,'FW').id);s=play(s);const changes=[x=>x.staff=null,x=>delete x.staff,x=>x.staff.contracts.FW.expires++,x=>x.staff.contracts.GK=copy(x.staff.contracts.FW),x=>x.staff.lastPayroll--,x=>x.staff.trainingWeek=99,x=>x.staff.extra=true,x=>x.staff.origin.round=1,x=>x.finance.ledger.find(e=>e.type==='staff-wages').amount=0,x=>x.finance.ledger.find(e=>e.type==='staff-wages').contracts[0].wage=0,x=>x.finance.ledger.find(e=>e.type==='staff-hire').candidate='staff-1-FW-1',x=>x.finance.ledger.push(copy(x.finance.ledger.find(e=>e.type==='staff-wages'))),x=>{x.finance.ledger=x.finance.ledger.filter(e=>e.type!=='staff-wages');x.finance.balance+=1200;},x=>{x.finance.ledger.find(e=>e.type==='staff-hire').amount=0;x.finance.balance+=6500;},x=>x.staff.contracts.FW.trainingFrom=7];
 for(const mutate of changes){const raw=copy(s);mutate(raw);assert.throws(()=>S.restore(raw));}assert.deepEqual(S.restore(copy(s)),s);
});
test('medical effects use real deterministic injury risks including the final contracted match',()=>{
 let observed=0;for(let seed=3300;seed<3350;seed++){let s=S.create(seed);setEnergy(s,30);K.hire(s,candidate(s,'MED',2).id);finish(s.match);const m=copy(s.match);s=S.settle(s);for(const row of s.health.lastReport.incidents){assert.equal(row.risk,H.riskFor(m,m.players[row.id])*.65);observed++;}assert.deepEqual(S.restore(copy(s)),s);}assert.ok(observed>0);
 const final=S.create(3351);K.hire(final,candidate(final,'MED').id);final.round=7;final.staff.lastPayroll=6;final.match.phase='full';assert.equal(K.medicalModifier(final),.8);final.staff.lastPayroll=7;assert.equal(K.medicalModifier(final),1);
});
test('browser scripts expose lazy accessible mobile UI and engine without CommonJS',()=>{
 const context=vm.createContext({Football:F});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/staff.js'),'utf8'),context);assert.ok(context.Staff);const s=S.create(3352);context.Staff.hire(s,context.Staff.candidates(s)[0].id);assert.equal(context.Staff.wages(s),1200);
 const ui=fs.readFileSync(path.join(__dirname,'dist/staff-ui.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'dist/staff.css'),'utf8');assert.ok(ui.includes('function renderStaff()'));assert.ok(ui.includes('role="status"'));assert.ok(ui.includes('aria-label='));assert.ok(css.includes('min-height:44px'));assert.ok(css.includes('grid-template-columns:1fr'));
});
console.log('Validated '+groups+' staff groups covering real finance, growth, medical risk, calendar contracts, legacy migration and malformed saves.');
