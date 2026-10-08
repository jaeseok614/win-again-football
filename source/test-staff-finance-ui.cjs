'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),E=require('./dist/economy.js'),Staff=require('./dist/staff.js'),P=require('./dist/cup.js'),H=require('./dist/health.js'),R=require('./dist/match-review.js'),Portraits=require('./dist/portraits.js');
let groups=0;const copy=value=>JSON.parse(JSON.stringify(value)),money=n=>'£'+Math.abs(n).toLocaleString('en-GB'),signed=n=>(n<0?'−':n>0?'+':'')+money(n);
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function finish(match){while(match.phase!=='full'){if(!F.running(match))F.begin(match);match.paused=false;F.finishSegment(match);}return match;}
function play(season){finish(season.match);return S.settle(season);}
function league(season){while(season.competition==='cup')season=play(season);return season;}
function hired(seed=3701,role='FW',tier=1){const season=S.create(seed),person=Staff.candidates(season).find(candidate=>candidate.role===role&&candidate.tier===tier);Staff.hire(season,person.id);return {season,person};}
function financeUi(season){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',querySelectorAll:()=>[]});return nodes.get(id);};
 const context=vm.createContext({F,S,E,Staff,P,H,MatchReview:R,Portraits,season,state:season.match,$:node,leagueTargetLabel:()=> '상위 2위',setView(){throw Error('Finance render must not navigate.');}});
 for(const name of ['market-ui','academy-ui','match-review-ui'])vm.runInContext(fs.readFileSync(path.join(__dirname,'dist',name+'.js'),'utf8'),context);
 return {context,node,read:expression=>vm.runInContext(expression,context)};
}
// Exercise the actual program-card browser harness, including the real training engine.
const trainingSource=fs.readFileSync(path.join(__dirname,'test-training-centre-ui.cjs'),'utf8'),trainingContext=vm.createContext({require,__dirname,console});
vm.runInContext(trainingSource.slice(0,trainingSource.indexOf("test('the new centre")),trainingContext);

test('weekly payroll and market budget include current coaches while finance rendering preserves the complete model',()=>{
 const {season,person}=hired(),h=financeUi(season),before=JSON.stringify(season),expected=E.wages(season)+person.wage;
 h.context.renderFinance();h.context.renderMarket();assert.equal(h.context.clubWeeklyWages(),expected);assert.ok(h.node('finance-summary').innerHTML.includes('주간 전체 급여</span><strong>'+money(expected)));assert.ok(h.node('market-overview').innerHTML.includes('구단 전체 주급 '+money(expected)));assert.match(h.node('finance-detail').innerHTML,/선수와 코치 급여/);assert.equal(JSON.stringify(season),before);
});
test('confirmed league review and recent-profit display include only the matching staff payroll while canonical receipts stay unchanged',()=>{
 let {season,person}=hired(3702);season=play(season);const receipt=copy(season.lastReport.cashflow),h=financeUi(season),before=JSON.stringify(season),d=R.read(season),expected=receipt.amount-person.wage;
 assert.equal(d.valid,true);const cash=h.context.matchCashflow(receipt);assert.equal(cash.amount,expected);assert.equal(cash.payroll,receipt.payroll+person.wage);assert.equal(cash.staffPayroll,person.wage);h.context.renderFinance();const review=h.context.matchReviewMarkup(d);assert.ok(h.node('finance-summary').innerHTML.includes(signed(expected)));assert.ok(review.includes(signed(expected)));assert.match(review,/선수·코치 급여 포함/);assert.deepEqual(season.lastReport.cashflow,receipt);assert.deepEqual(d.cashflow,receipt);assert.equal(JSON.stringify(season),before);
});
test('the final contract game still shows its paid coach wages after expiry even though upcoming weekly payroll has fallen',()=>{
 let {season,person}=hired(3703);for(let index=0;index<7;index++)season=play(league(season));assert.equal(Staff.active(season,'FW'),null);assert.equal(Staff.wages(season),0);
 const h=financeUi(season),before=JSON.stringify(season),receipt=season.lastReport.cashflow,display=h.context.matchCashflow(receipt),expected=receipt.amount-person.wage;
 assert.equal(display.staffPayroll,person.wage);assert.equal(display.amount,expected);assert.equal(h.context.clubWeeklyWages(),E.wages(season));const review=h.context.matchReviewMarkup(R.read(season));assert.ok(review.includes(signed(expected)));assert.match(review,/선수·코치 급여 포함/);h.context.renderFinance();assert.ok(h.node('finance-summary').innerHTML.includes(signed(expected)));assert.equal(JSON.stringify(season),before);
});
test('Cup reviews exclude league payroll even when a same-week staff receipt exists',()=>{
 let {season}=hired(3704);while(season.round<season.cup.calendarRounds[0]-6)season=play(season);Staff.renew(season,'FW');while(season.competition!=='cup')season=play(season);assert.ok(season.finance.ledger.some(entry=>entry.type==='staff-wages'&&entry.round===season.round));season=play(season);
 const h=financeUi(season),before=JSON.stringify(season),d=R.read(season),cash=h.context.matchCashflow(d.cashflow);assert.equal(d.competition,'cup');assert.equal(cash.amount,d.cashflow.amount);assert.equal(cash.staffPayroll,0);const html=h.context.matchReviewMarkup(d);assert.ok(html.includes(signed(d.cashflow.amount)));assert.match(html,/컵 상금 포함/);assert.doesNotMatch(html,/선수·코치 급여 포함/);assert.equal(JSON.stringify(season),before);
});
test('last-year payroll with the same round never reduces a new-season receipt',()=>{
 let {season}=hired(3705);while(season.match)season=play(season);season=S.nextSeason(season);season=play(season);const h=financeUi(season),before=JSON.stringify(season),receipt=season.lastReport.cashflow;
 assert.equal(receipt.year,2);assert.equal(receipt.round,1);assert.ok(season.finance.ledger.some(entry=>entry.type==='staff-wages'&&entry.year===1&&entry.round===1));assert.equal(h.context.matchCashflow(receipt).staffPayroll,0);assert.equal(h.context.matchCashflow(receipt).amount,receipt.amount);assert.equal(JSON.stringify(season),before);
});
test('coach hiring, renewal, release and payroll ledger lines render meaningful labels and amounts',()=>{
 let {season}=hired(3706);const entries=[copy(season.finance.ledger.at(-1))];season=play(season);entries.push(copy(season.finance.ledger.find(entry=>entry.type==='staff-wages')));Staff.renew(season,'FW');entries.push(copy(season.finance.ledger.at(-1)));season=play(league(season));Staff.release(season,'FW');entries.push(copy(season.finance.ledger.at(-1)));
 const h=financeUi(season),before=JSON.stringify(season);for(const entry of entries){assert.match(h.context.ledgerTitle(entry),/코치/);const detail=h.context.ledgerDetail(entry);assert.ok(detail.includes(money(entry.amount)));assert.doesNotMatch(detail,/NaN|undefined|경기 수입/);}h.context.renderFinance();assert.doesNotMatch(h.node('finance-detail').innerHTML,/NaN|undefined/);assert.equal(JSON.stringify(season),before);
});
test('coached program cards use the actual reduced fatigue preview and leave the season unchanged during selection',()=>{
 const {season}=hired(3707,'FW',2),h=trainingContext.harness(season),before=JSON.stringify(season);trainingContext.setup(h,'f3');
 for(const focus of ['technique','pace','fitness']){const expected=require('./dist/training.js').preview(season,'f3',focus,'f3');assert.ok(expected.cost<require('./dist/training.js').choices[focus].cost);const card=h.find('[data-training-focus="'+focus+'"]');assert.ok(card.innerHTML.includes('체력 −'+expected.cost));h.context.chooseTrainingFocus(focus);const fresh=h.find('.individual-training-preview').innerHTML;assert.ok(fresh.includes('(−'+expected.cost+')'));}
 assert.equal(h.calls.train,0);assert.equal(JSON.stringify(season),before);
});
console.log('Validated '+groups+' staff finance and coaching preview UI groups with actual receipts and contracts.');
