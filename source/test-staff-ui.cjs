'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),Staff=require('./dist/staff.js');let groups=0;
const copy=x=>JSON.parse(JSON.stringify(x));function test(name,fn){fn();groups++;console.log('PASS '+name);}
function finish(m){while(m.phase!=='full'){if(!F.running(m))F.begin(m);F.finishSegment(m);}}
function harness(season){
 let html='',sets=0,details=[],buttons=[];const calls={save:0,render:0,action:0,focus:0},errors=[],status={focus(){calls.focus++;}};
 const panel={querySelectorAll(selector){return selector==='[data-staff-role]'?details:[];},querySelector(selector){return selector==='.staff-note'&&html.includes('class="staff-note"')?status:null;}};
 Object.defineProperty(panel,'innerHTML',{get(){return html;},set(value){html=value;sets++;details=[...value.matchAll(/<details\b([^>]*)>/g)].map(([,attrs])=>({dataset:{staffRole:attrs.match(/data-staff-role="([^"]+)"/)[1]},open:/\bopen\b/.test(attrs)}));buttons=[...value.matchAll(/<button\b([^>]*)>/g)].map(([,attrs])=>({disabled:/\bdisabled\b/.test(attrs),dataset:{staffAction:attrs.match(/data-staff-action="([^"]+)"/)[1],staffChoice:attrs.match(/data-staff-choice="([^"]+)"/)[1]},closest(selector){return selector==='[data-staff-action]'?this:null;}}));}});
 const context=vm.createContext({S,Staff,season,view:'squad',squadTab:'health',$:id=>id==='staff-panel'?panel:null,action(fn){calls.action++;try{fn();calls.save++;calls.render++;context.renderStaff();}catch(e){errors.push(e.message);}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/staff-ui.js'),'utf8'),context);
 return {context,panel,calls,errors,render(){context.renderStaff();},click(action,choice){const b=buttons.find(b=>b.dataset.staffAction===action&&b.dataset.staffChoice===choice);assert.ok(b);panel.onclick({target:b});},get html(){return html;},get sets(){return sets;},get buttons(){return buttons;},get details(){return details;}};
}
test('compact initial UI reads real costs without spending or changing the campaign',()=>{
 const s=S.create(4401),before=JSON.stringify(s),h=harness(s);h.render();assert.equal(h.details.length,5);assert.ok(h.details.every(d=>!d.open));assert.equal(h.buttons.length,10);assert.ok(h.buttons.every(b=>!b.disabled));assert.ok(h.html.includes('£160,000'));assert.ok(h.html.includes('7경기 총 £14,900'));assert.ok(h.html.includes('7경기 총 £29,600'));assert.equal(JSON.stringify(s),before);assert.equal(h.calls.save,0);assert.equal(h.calls.action,0);
});
test('hire and renew actions save exact real contracts, retain expanded role, and announce completion',()=>{
 let s=S.create(4402),h=harness(s),p=Staff.candidates(s).find(c=>c.role==='FW');h.render();h.details.find(d=>d.dataset.staffRole==='FW').open=true;h.click('hire',p.id);assert.equal(Staff.active(s,'FW').remaining,7);assert.equal(s.finance.balance,160000-p.fee);assert.equal(h.calls.save,1);assert.equal(h.calls.focus,1);assert.ok(h.html.includes('영입 완료'));assert.ok(h.details.find(d=>d.dataset.staffRole==='FW').open);assert.ok(h.buttons.find(b=>b.dataset.staffAction==='renew'&&b.dataset.staffChoice==='FW').disabled);assert.deepEqual(S.restore(copy(s)),s);
 finish(s.match);s=S.settle(s);h.context.season=s;h.render();assert.ok(!h.buttons.find(b=>b.dataset.staffAction==='renew'&&b.dataset.staffChoice==='FW').disabled);h.click('renew','FW');assert.equal(Staff.active(s,'FW').remaining,13);assert.equal(h.calls.save,2);assert.ok(h.html.includes('7경기 연장 완료'));assert.equal(h.errors.length,0);assert.deepEqual(S.restore(copy(s)),s);
});
test('release shows and spends the explicit penalty and prevents duplicate actions',()=>{
 let s=S.create(4403),p=Staff.candidates(s).find(c=>c.role==='DEF');Staff.hire(s,p.id);finish(s.match);s=S.settle(s);const h=harness(s),before=s.finance.balance;h.render();assert.ok(h.html.includes('해지 · £1,200'));h.click('release','DEF');assert.equal(s.finance.balance,before-p.wage);assert.equal(Staff.active(s,'DEF'),null);assert.ok(h.html.includes('계약 해지 완료'));assert.ok(h.buttons.filter(b=>b.dataset.staffChoice.includes('-DEF-')).every(b=>b.disabled));const balance=s.finance.balance;h.click('hire',p.id);assert.equal(s.finance.balance,balance);assert.equal(h.calls.save,1);assert.deepEqual(S.restore(copy(s)),s);
});
test('hidden staff screens defer rendering and inaccessible contract stages remain disabled',()=>{
 const s=S.create(4404),h=harness(s);h.context.view='match';h.render();assert.equal(h.sets,0);h.context.view='squad';h.context.squadTab='training';h.render();assert.equal(h.sets,0);h.context.squadTab='health';F.begin(s.match);h.render();assert.ok(h.buttons.every(b=>b.disabled));assert.ok(h.html.includes('다음 리그 경기 준비 때 계약 관리 가능'));const before=JSON.stringify(s);h.click('hire',Staff.candidates(s)[0].id);assert.equal(JSON.stringify(s),before);assert.equal(h.calls.action,0);
 const poor=S.create(4405);poor.finance.balance=1;const debt=harness(poor);debt.render();assert.ok(debt.buttons.every(b=>b.disabled));assert.ok(debt.html.includes('구단 자금이 부족'));
});
test('controls and details have accessible target sizes and explicit financial terms',()=>{
 const css=fs.readFileSync(path.join(__dirname,'dist/staff.css'),'utf8'),h=harness(S.create(4406));h.render();assert.ok(css.includes('min-height:44px'));assert.ok(css.includes('@media(max-width:730px)'));assert.ok(css.includes('summary:focus-visible'));assert.equal((h.html.match(/aria-label=/g)||[]).length,10);assert.ok(h.html.includes('코치진'));assert.ok(h.html.includes('계약금 즉시 차감'));assert.ok(h.html.includes('컵·챔피언스리그 경기에는 주급과 계약 기간이 소모되지'));
});
console.log('Validated '+groups+' staff UI groups including real actions, mobile compact details, lazy hidden panels and accessible controls.');
