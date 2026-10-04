'use strict';
const assert=require('node:assert/strict'),S=require('./dist/season.js'),F=require('./dist/engine.js'),E=require('./dist/economy.js'),Staff=require('./dist/staff.js'),P=require('./dist/finance-plan.js');let groups=0;const test=(n,f)=>{f();groups++;console.log('PASS '+n);},copy=x=>JSON.parse(JSON.stringify(x));
function play(s){while(s.match.phase!=='full'){if(!F.running(s.match))F.begin(s.match);F.finishSegment(s.match);}return S.settle(s);}
function league(s){while(s.competition!=='league')s=play(s);return s;}
test('baseline equals actual remaining league cash after removing only result bonuses, with coach expiry included',()=>{
 let s=S.create(8301);Staff.hire(s,Staff.candidates(s).find(p=>p.role==='FW'&&p.tier===2).id);Staff.hire(s,Staff.candidates(s).find(p=>p.role==='MED'&&p.tier===1).id);const before=JSON.stringify(s),m=P.read(s);assert.equal(JSON.stringify(s),before);assert.equal(m.remaining,14);assert.equal(m.rows.filter(r=>r.home).length,7);assert.equal(m.staffTotal,7*(1900+1500));assert.equal(m.rows[6].staffPayroll,3400);assert.equal(m.rows[7].staffPayroll,0);
 while(s.match)s=play(s);const receipts=s.finance.ledger.filter(e=>e.type==='match'),base=receipts.reduce((n,e)=>n+e.amount-e.bonus,0)+s.finance.ledger.filter(e=>e.type==='staff-wages').reduce((n,e)=>n+e.amount,0);assert.equal(m.net,base);assert.equal(m.ending,m.current+base);assert.equal(m.playerTotal,14*E.wages(s));
});
test('transfer scenario matches a real transaction and its full remaining payroll without spending during preview',()=>{
 let s=S.create(8302);s=play(s);const before=JSON.stringify(s),q=E.quote(s,'t_f2','f3'),m=P.read(s,{identity:'t_f2',slot:'f3'}),base=P.read(s),actual=S.recruit(s,'t_f2','f3');assert.equal(JSON.stringify(s),before);assert.equal(m.starting,actual.finance.balance);assert.equal(m.playerWages,E.wages(actual));assert.equal(m.ending,P.read(actual).ending);assert.equal(m.ending-base.ending,-q.cost-q.wageChange*13);assert.equal(m.deal.incoming,F.identityProfile('t_f2').name);assert.deepEqual(S.restore(copy(actual)),actual);
});
test('academy quotes support a negative acquisition cost and the correct identity-based wage',()=>{
 let s=S.scout(play(S.recruit(S.create(8303),'t_f1','f1')),'FW');const id=s.career.reports[0].candidates[0],q=E.quote(s,id,'f1'),m=P.read(s,{identity:id,slot:'f1'});assert.ok(q.cost<0);assert.equal(m.starting,s.finance.balance-q.cost);assert.equal(m.playerWages,E.wages(s)+q.wageChange);assert.equal(m.deal.incoming,F.identityProfile(id).name);assert.equal(m.ending,P.read(S.recruit(s,id,'f1')).ending);
});
test('cup timing and unconfirmed matches never consume another salary week in the projection',()=>{
 let s=S.create(8304);Staff.hire(s,Staff.candidates(s)[0].id);while(s.competition!=='cup')s=play(s);const before=P.read(s);assert.equal(before.remaining,10);assert.equal(before.rows[0].round,5);assert.equal(before.rows.filter(r=>r.staffPayroll>0).length,3);F.begin(s.match);F.finishSegment(s.match);assert.deepEqual(P.read(s),before);s=league(s);assert.equal(P.read(s).staffTotal,before.staffTotal);
});
test('renewed contracts and contracts carried into a new season expire at their exact league clock',()=>{
 let s=S.create(8305);Staff.hire(s,Staff.candidates(s)[0].id);s=play(s);Staff.renew(s,'GK');assert.equal(P.read(s).staffTotal,13*1200);while(s.round<12||s.competition!=='league')s=play(s);Staff.renew(s,'GK');while(s.match)s=play(s);assert.equal(P.read(s).remaining,0);s=S.nextSeason(s);const m=P.read(s);assert.equal(m.staffTotal,7*1200);assert.equal(m.rows[6].staffPayroll,1200);assert.equal(m.rows[7].staffPayroll,0);
});
test('legacy seasons without staff, finished seasons and unaffordable hypothetical offers remain explicit',()=>{
 const s=S.create(8306);delete s.staff;const m=P.read(s);assert.equal(m.staffTotal,0);s.finance.balance=-100;const low=P.read(s,{identity:'t_f2',slot:'f3'});assert.ok(low.starting<0);assert.ok(low.low<=low.starting);assert.ok(low.lowRound===null||low.lowRound>=1);assert.throws(()=>P.read(s,{identity:'t_f2',slot:'g1'}));let end=S.create(8307);while(end.match)end=play(end);const done=P.read(end);assert.equal(done.remaining,0);assert.equal(done.net,0);assert.equal(done.ending,end.finance.balance);assert.deepEqual(done.rows,[]);
});
test('returned forecast objects are detached from the campaign and do not change deterministic restores',()=>{
 const s=S.create(8308),before=copy(s),m=P.read(s,{identity:'t_f2',slot:'f3'});m.rows[0].balance=0;m.deal.slot='bad';assert.deepEqual(s,before);assert.deepEqual(S.restore(copy(s)),s);
});
console.log('Validated '+groups+' finance planning groups.');
