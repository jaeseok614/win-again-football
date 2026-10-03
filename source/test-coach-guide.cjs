'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),D=require('./dist/development.js'),B=require('./dist/tactics-board.js'),G=require('./dist/coach-guide.js');
let groups=0;const copy=value=>JSON.parse(JSON.stringify(value));
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function pure(s){const before=JSON.stringify(s),d=G.read(s);assert.equal(JSON.stringify(s),before);return d;}
function finish(s){while(s.match.phase!=='full'){if(F.running(s.match))F.tick(s.match);else F.begin(s.match);}return s;}

test('a fresh club has one preparation route and an actual owned focus player',()=>{
 const s=S.create(1701),d=pure(s);assert.equal(d.valid,true);assert.equal(d.mode,'prep');assert.equal(d.fresh,true);assert.equal(d.eyebrow,'첫 경기 준비');assert.deepEqual(d.action,{id:'match',label:'첫 경기 준비하기'});assert.deepEqual(d.steps.map(step=>step.status),['current','waiting','waiting']);assert.equal(d.focus.identity,s.squad.f2.identity);assert.equal(d.focus.xp,0);assert.equal(d.focus.xpInStep,0);assert.equal(d.focus.minutesToGrowth,270);assert.equal(d.focus.primary,s.squad.f2.attack);assert.equal(s.trained,null);assert.equal(s.match.minute,0);
});

test('pre-match readiness separates required safety checks from optional training',()=>{
 const s=S.create(1713);let d=pure(s);assert.equal(d.readiness.ready,true);assert.equal(d.readiness.score,2);assert.equal(d.readiness.total,4);assert.equal(d.readiness.label,'경기 시작 가능');assert.deepEqual(d.readiness.checks.map(x=>[x.id,x.ready,!!x.optional]),[['lineup',true,false],['energy',true,false],['training',false,true],['tactic',false,true]]);assert.deepEqual(d.readiness.checks.slice(0,3).map(x=>x.detail),['11 / 11명','피로 주의 없음','아직 안 함']);assert.match(d.readiness.checks[3].detail,/빠른 역습 · 분석 보기/);
 s.match.players[s.match.lineup[0]].energy=49;d=pure(s);assert.equal(d.readiness.ready,true);assert.equal(d.readiness.label,'선발 조정 권장');assert.match(d.readiness.checks[1].detail,/1명/);
 s.match.players[s.match.lineup[1]].injuryRemaining=1;d=pure(s);assert.equal(d.readiness.ready,false);assert.equal(d.readiness.label,'선발 확인 필요');assert.equal(d.readiness.checks[0].detail,'10 / 11명');
 s.match.players[s.match.lineup[1]].injuryRemaining=0;s.match.players[s.match.lineup[0]].energy=90;s.trained='recovery';F.setTactic(s.match,'counter');d=pure(s);assert.equal(d.readiness.checks[2].ready,true);assert.match(d.readiness.checks[2].detail,/회복/);assert.equal(d.readiness.checks[3].ready,true);assert.match(d.readiness.checks[3].detail,/적용 중/);
 F.begin(s.match);assert.equal(pure(s).readiness,null);
});

test('live play and planning retain the real minute without adding pending experience',()=>{
 const s=S.create(1702);s.squad.f2.xp=269;F.begin(s.match);for(let i=0;i<17;i++)F.tick(s.match);
 for(const paused of [false,true]){s.match.paused=paused;const d=pure(s);assert.equal(d.mode,'running');assert.match(d.action.label,/17분/);assert.match(d.text,/17분/);assert.equal(d.focus.xp,269);assert.equal(d.focus.minutesToGrowth,1);assert.deepEqual(d.steps.map(step=>step.status),['done','current','waiting']);assert.match(d.title,paused?/일시 정지/:/진행 중/);}
});

test('natural halftime and 65-minute breaks have specific decision routes',()=>{
 const s=S.create(1703);F.begin(s.match);while(s.match.minute<45)F.tick(s.match);let d=pure(s);assert.equal(d.mode,'break');assert.equal(d.action.label,'하프타임 작전으로');F.begin(s.match);while(s.match.minute<65)F.tick(s.match);d=pure(s);assert.equal(d.mode,'break');assert.equal(d.action.label,'65분 작전으로');assert.equal(s.match.phase,'late');
});

test('fulltime clearly requires confirmation and reading never settles the result',()=>{
 const s=finish(S.create(1704)),d=pure(s);assert.equal(d.mode,'full');assert.match(d.text,/결과를 확정하면/);assert.match(d.action.label,/결과 확정/);assert.deepEqual(d.steps.map(step=>step.status),['done','done','current']);assert.equal(s.round,0);assert.equal(s.squad.f2.xp,0);assert.equal(s.results.length,0);assert.equal(s.finance.ledger.length,0);
});

test('confirmed experience is reflected and an existing club receives next-step guidance',()=>{
 let s=finish(S.create(1705));s=S.settle(s);const d=pure(s);assert.equal(d.fresh,false);assert.equal(d.eyebrow,'경기 준비');assert.equal(d.focus.xp,90);assert.equal(d.focus.minutesToGrowth,180);assert.equal(d.mode,'prep');assert.equal(d.action.label,'이번 경기 준비하기');assert.equal(s.round,1);
});

test('later seasons and legacy records do not restart onboarding or invent scorer data',()=>{
 const s=S.create(1706);s.year=2;delete s.statistics;const d=pure(s);assert.equal(d.fresh,false);assert.equal(d.eyebrow,'경기 준비');assert.equal(d.focus.xp,0);assert.equal(d.focus.minutesToGrowth,270);assert.ok(!Object.hasOwn(d,'goals'));assert.ok(!Object.hasOwn(d.focus,'goals'));
});

test('a capped player has no promised primary improvement at an XP boundary',()=>{
 const s=S.create(1707);s.squad.f2.attack=s.squad.f2.potential;for(const xp of [0,269,270,540]){s.squad.f2.xp=xp;const d=pure(s);assert.equal(d.focus.capped,true);assert.equal(d.focus.minutesToGrowth,null);assert.equal(d.focus.xpInStep,xp%270);assert.equal(d.focus.primary,d.focus.cap);}
});

test('recruitment keeps focus on the real registered identity and returned values do not alias the save',()=>{
 const s=S.recruit(S.create(1708),'t_f2','f2'),d=pure(s);assert.equal(d.focus.identity,'t_f2');assert.equal(d.focus.name,s.squad.f2.name);d.focus.name='Changed copy';d.action.id='other';assert.notEqual(s.squad.f2.name,'Changed copy');assert.equal(G.read(s).action.id,'match');delete s.squad.f2;const fallback=pure(s);assert.equal(s.squad[fallback.focus.slot].pos,'FW');assert.equal(fallback.focus.identity,s.squad[fallback.focus.slot].identity);
});

test('a completed real season routes to the existing next-season button without advancing',()=>{
 let s=S.create(1709);while(s.match){finish(s);s=S.settle(s);}assert.equal(S.ready(s),true);const d=pure(s);assert.equal(d.mode,'complete');assert.equal(d.action.id,'season');assert.equal(d.steps.length,0);assert.equal(s.year,1);assert.equal(s.match,null);
});

test('the read model loads in the browser with the same pure results and handles missing input',()=>{
 const context=vm.createContext({Football:F,Season:S,PlayerDevelopment:D,TacticsBoard:B});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/coach-guide.js'),'utf8'),context);const s=S.create(1710),before=JSON.stringify(s);assert.deepEqual(JSON.parse(JSON.stringify(context.CoachGuide.read(s))),G.read(s));assert.equal(JSON.stringify(s),before);for(const bad of [null,{}, {year:0,round:0,squad:{}}]){const d=G.read(bad);assert.equal(d.valid,false);assert.equal(d.action,null);assert.equal(d.focus,null);}
});

test('guide markup escapes content and distinguishes optional work from required preparation',()=>{
 const s=S.create(1711);s.squad.f2.name='A <script> "B"';const context=vm.createContext({season:s,Portraits:{html:()=>'<span class="player-portrait"></span>'},document:{addEventListener:()=>{}}});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/coach-guide-ui.js'),'utf8'),context);let d=G.read(s);d.title='<unsafe>';let html=context.coachGuideMarkup(d);assert.match(html,/&lt;unsafe&gt;/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/data-guide-action="practice"/);assert.match(html,/경기 준비 체크/);assert.match(html,/2 \/ 4 확인/);assert.match(html,/class="optional"/);assert.match(html,/상대 맞춤 전술/);assert.match(html,/data-guide-action="analysis"/);assert.match(html,/<em>선택<\/em>/);assert.doesNotMatch(html,/선택 사항 · 선택/);assert.match(html,/data-player-detail="f2"/);assert.match(html,/출전 270분 더하면/);s.squad.f2.attack=s.squad.f2.potential;html=context.coachGuideMarkup(G.read(s));assert.match(html,/성장 한계 도달/);assert.doesNotMatch(html,/분 더하면|role="progressbar"/);
});

test('guide actions only navigate or open a separate practice and never start gameplay',()=>{
 const events=[],s=S.create(1712),before=JSON.stringify(s);let handler;
 const target={scrollIntoView:()=>events.push('scroll'),focus:()=>events.push('focus')};
 const context=vm.createContext({season:s,state:s.match,squadTab:'health',setView:value=>events.push('view:'+value),setMatchdayTab:value=>events.push('tab:'+value),openPractice:value=>events.push('practice:'+value),document:{addEventListener:(type,fn)=>{if(type==='click')handler=fn;},getElementById:id=>id==='next-season'?target:null}});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/coach-guide-ui.js'),'utf8'),context);
 for(const action of ['match','squad','training','analysis','practice','season']){const button={dataset:{guideAction:action},closest:()=>({})};handler({target:{closest:()=>button}});}assert.deepEqual(events,['view:match','view:squad','view:squad','view:match','tab:analysis','practice:comeback','scroll','focus']);assert.equal(context.squadTab,'training');assert.equal(JSON.stringify(s),before);assert.equal(s.match.phase,'prep');assert.equal(s.match.minute,0);
});
console.log('Validated '+groups+' coach guide groups, including navigation-only actions, confirmed growth and existing saves.');
