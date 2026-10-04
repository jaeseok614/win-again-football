'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),E=require('./dist/economy.js'),Life=require('./dist/club-life.js'),Staff=require('./dist/staff.js'),Portraits=require('./dist/portraits.js');
let groups=0;const copy=value=>JSON.parse(JSON.stringify(value));
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function finish(match){while(match.phase!=='full'){if(!F.running(match))F.begin(match);F.finishSegment(match);}}
function harness(season){
 let html='',buttons=[],selects=[];const calls={action:0,save:0},errors=[];
 const panel={querySelectorAll(selector){return selector==='[data-outgoing]'?selects:selector==='[data-recruit]'?buttons:[];}};
 Object.defineProperty(panel,'innerHTML',{get(){return html;},set(markup){html=markup;buttons=[...markup.matchAll(/<button\b([^>]*\bdata-recruit="([^"]+)"[^>]*)>/g)].map(([,attributes,identity])=>({disabled:/\bdisabled\b/.test(attributes),dataset:{recruit:identity}}));selects=[...markup.matchAll(/<select\b([^>]*\bdata-outgoing="([^"]+)"[^>]*)>([\s\S]*?)<\/select>/g)].map(([,attributes,identity,options])=>({disabled:/\bdisabled\b/.test(attributes),dataset:{outgoing:identity},value:options.match(/<option value="([^"]+)" selected/)[1]}));}});
 const context=vm.createContext({F,S,E,Staff,season,state:season.match,Portraits,$:id=>id==='market-overview'?panel:null,action(fn){calls.action++;try{fn();calls.save++;context.renderMarket();}catch(error){errors.push(error.message);}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/market-ui.js'),'utf8'),context);
 return {context,calls,errors,panel,render(){context.renderMarket();},select(identity,slot){const select=selects.find(value=>value.dataset.outgoing===identity);assert.ok(select);assert.equal(select.disabled,false);select.value=slot;select.onchange();},click(identity){const button=buttons.find(value=>value.dataset.recruit===identity);assert.ok(button);button.onclick();},button(identity){const button=buttons.find(value=>value.dataset.recruit===identity);assert.ok(button);return button;},get html(){return html;}};
}

test('normal pre-match transfers remain available and rendering consumes no funds or random state',()=>{
 const s=S.create(121),before=JSON.stringify(s),h=harness(s);h.render();h.select('t_f2','f1');assert.equal(h.button('t_f2').disabled,false);assert.ok(h.html.includes('이번 주 영입 가능'));assert.ok(!h.html.includes('market-talk-reason'));assert.equal(JSON.stringify(s),before);assert.equal(h.calls.action,0);
});
test('a spoken-to selected outgoing player disables recruitment and explains when it becomes available',()=>{
 const s=S.create(121);Life.talk(s,'encourage');const before=JSON.stringify(s),h=harness(s);h.render();h.select('t_f2','f1');assert.equal(h.button('t_f2').disabled,true);assert.ok(h.html.includes('팀 대화 완료 · 다음 경기 전 가능'));assert.ok(h.html.includes('대화에 참여하지 않은 벤치를 선택하세요'));assert.ok(h.html.includes('이번 주 벤치 선수 영입 가능'));assert.ok(h.html.includes(s.squad.f1.name+' · 주요 '+s.squad.f1.attack+' · £'+E.resale(s.squad.f1).toLocaleString('en-GB')+' · 팀 대화 완료'));h.click('t_f2');assert.equal(h.calls.action,0);assert.equal(h.calls.save,0);assert.equal(JSON.stringify(s),before);assert.throws(()=>S.recruit(s,'t_f2','f1'),/팀 대화를 마친 선수/);assert.equal(JSON.stringify(s),before);
});
test('a bench player who did not receive the talk can actually be exchanged and the save still restores',()=>{
 const s=S.create(121);Life.talk(s,'encourage');assert.ok(!s.match.decisions[0].lineup.includes('f3'));const originalTalk=copy(s.match.decisions[0]),h=harness(s);h.render();h.select('t_f2','f1');assert.equal(h.button('t_f2').disabled,true);h.select('t_f2','f3');assert.equal(h.button('t_f2').disabled,false);const quote=E.quote(s,'t_f2','f3');h.click('t_f2');assert.equal(h.calls.action,1);assert.equal(h.calls.save,1);assert.equal(h.errors.length,0);assert.equal(h.context.season.squad.f3.identity,'t_f2');assert.equal(h.context.season.finance.balance,quote.balanceAfter);assert.deepEqual(h.context.season.match.decisions[0],originalTalk);assert.deepEqual(S.restore(copy(h.context.season)),h.context.season);
});
test('the original spoken lineup stays protected after formation and starting eleven changes',()=>{
 const s=S.create(121);Life.talk(s,'calm');F.swap(s.match,'f1','f3');F.setFormation(s.match,'433');const h=harness(s);h.render();h.select('t_f2','f1');assert.equal(h.button('t_f2').disabled,true);h.select('t_f2','f3');assert.equal(h.button('t_f2').disabled,false);assert.deepEqual(S.restore(copy(s)),s);
});
test('saved talks keep the same market restriction and the following match clears it',()=>{
 let s=S.create(121);Life.talk(s,'encourage');s=S.restore(copy(s));const h=harness(s);h.render();h.select('t_f2','f1');assert.equal(h.button('t_f2').disabled,true);finish(s.match);s=S.settle(s);assert.equal(s.competition,'league');assert.equal(s.match.phase,'prep');const next=harness(s);next.render();next.select('t_f2','f1');assert.equal(next.button('t_f2').disabled,false);assert.ok(!next.html.includes('market-talk-reason'));next.click('t_f2');assert.equal(next.errors.length,0);assert.equal(next.context.season.squad.f1.identity,'t_f2');assert.deepEqual(S.restore(copy(next.context.season)),next.context.season);
});
test('existing budget and weekly restrictions still disable offers when bench transfers are unavailable',()=>{
 const low=S.create(121);Life.talk(low,'encourage');low.finance.balance=0;const poor=harness(low);poor.render();poor.select('t_f2','f3');assert.equal(poor.button('t_f2').disabled,true);assert.ok(poor.html.includes('구단 자금 부족'));const s=S.recruit(S.create(121),'t_f2','f3');Life.talk(s,'calm');const done=harness(s);done.render();assert.ok(done.html.includes('이번 주 영입 완료'));assert.equal(done.button('t_m2').disabled,true);const before=JSON.stringify(s);done.click('t_m2');assert.equal(done.calls.action,0);assert.equal(JSON.stringify(s),before);
});
test('suspension rules block all post-talk transfers, including the bench, without a misleading suggestion',()=>{
 const s=S.create(121,{suspensions:true});Life.talk(s,'encourage');const before=JSON.stringify(s),h=harness(s);h.render();h.select('t_f2','f3');assert.equal(h.button('t_f2').disabled,true);assert.ok(h.html.includes('출전 정지 규칙이 적용된 구단은 팀 대화 전에 영입'));assert.ok(!h.html.includes('벤치를 선택하세요'));assert.ok(!h.html.includes('이번 주 벤치 선수 영입 가능'));h.click('t_f2');assert.equal(h.calls.action,0);assert.equal(JSON.stringify(s),before);assert.throws(()=>S.recruit(s,'t_f2','f3'),/팀 대화 전에/);
});
test('hidden market skips candidate markup and regenerates when opened',()=>{const h=harness(S.create(121));h.context.view='club';h.render();assert.equal(h.html,'');h.context.view='market';h.render();assert.ok(h.html.includes('data-finance-compare'));});
console.log('Validated '+groups+' market UI groups for actual team-talk restrictions, bench transfers, identity-safe restores and the next match.');
