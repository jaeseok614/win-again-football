'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const Feedback=require('./dist/feedback.js'),F=require('./dist/engine.js'),S=require('./dist/season.js'),Opposition=require('./dist/opposition.js'),Movement=require('./dist/movement.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
const status=value=>typeof value==='string'?value:value.status;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function harness(extra={}){const calls=[],env={visible:true,active:true,time:1000};const controller=Feedback.create({vibrate:p=>{calls.push(copy(p));return true;},visible:()=>env.visible,active:()=>env.active,now:()=>env.time,haptics:true,...extra});return {controller,calls,env};}
function fixture(kind){const accept={goal:e=>e.type==='goal'&&e.team===0,concede:e=>e.type==='goal'&&e.team===1,save:e=>e.type==='shot'&&e.team===1}[kind];for(let seed=1;seed<=100;seed++){const s=S.create(seed);while(s.match.phase!=='full'){if(!F.running(s.match))F.begin(s.match);const before=copy(s),events=F.tick(s.match);if(events.some(accept)){before.match.paused=true;return S.restore(before);}}}throw Error('No real '+kind+' event found.');}
function uiHarness(s=S.create(37),options={}){
 const calls=[],timers=new Map(),listeners={document:{},window:{},media:{}},env={reduced:false,time:1000,saves:0,draws:0,nextTimer:1};
 const nodes=Object.fromEntries(['match-moment','pitch','experience-controls'].map(id=>[id,{dataset:{},hidden:id==='match-moment',innerHTML:'',offsetWidth:1,handlers:{},addEventListener(kind,fn){this.handlers[kind]=fn;},querySelector(){return {focus(){}};}}]));
 const classNames=new Set(),playerNodes=[{style:{marginLeft:'2px',marginTop:'3px'}}],media={get matches(){return env.reduced;},addEventListener(kind,fn){listeners.media[kind]=fn;}};
 const document={hidden:false,querySelector:()=>({classList:{toggle(name,value){if(value)classNames.add(name);else classNames.delete(name);}}}),querySelectorAll:()=>playerNodes,addEventListener(kind,fn){listeners.document[kind]=fn;}};
 const context=vm.createContext({F,S,Feedback,Opposition,Movement,season:s,state:s.match,view:'match',innerWidth:1024,soundOn:false,lastEvent:null,lastEventAt:0,$:id=>nodes[id],document,navigator:{userActivation:{hasBeenActive:true},...(options.supported?{vibrate:p=>{calls.push(copy(p));return true;}}:{})},window:{addEventListener(kind,fn){listeners.window[kind]=fn;}},performance:{now:()=>env.time},matchMedia:()=>media,escapeText:text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),setTimeout(fn,ms){const id=env.nextTimer++;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),save:()=>env.saves++,drawField:()=>env.draws++,tone(){}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/feedback-ui.js'),'utf8'),context);context.mediaPrefs.haptics=options.haptics===true;context.initMatchFeedback();context.renderFeedbackControls();return {context,nodes,calls,timers,listeners,env,classNames,playerNodes};
}

test('browser and CommonJS exports load without DOM or a vibration API',()=>{
 assert.equal(typeof Feedback.create,'function');const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/feedback.js'),'utf8'),ctx);assert.equal(typeof ctx.Feedback.create,'function');assert.doesNotThrow(()=>ctx.Feedback.create());const c=Feedback.create({vibrate:null,visible:()=>true,active:()=>true,haptics:true});assert.equal(c.snapshot().supported,false);assert.equal(status(c.play('goal')),'unsupported');assert.equal(status(c.cancel()),'unsupported');
});

test('haptics are off by default and an explicit active callback is required',()=>{
 const calls=[],c=Feedback.create({vibrate:p=>{calls.push(p);return true;},visible:()=>true,active:()=>true});assert.equal(c.snapshot().enabled,false);assert.equal(status(c.play('goal')),'disabled');assert.deepEqual(calls,[]);const safe=Feedback.create({vibrate:p=>{calls.push(p);return true;},visible:()=>true,haptics:true});assert.equal(status(safe.play('goal')),'inactive');assert.deepEqual(calls,[]);
});

test('hidden pages and inactive play never invoke vibration or consume the next event',()=>{
 const {controller:c,calls,env}=harness();env.visible=false;assert.equal(status(c.play('goal')),'hidden');env.visible=true;env.active=false;assert.equal(status(c.play('goal')),'inactive');assert.deepEqual(calls,[]);env.active=true;assert.equal(status(c.play('goal')),'played');assert.equal(calls.length,1);
});

test('supported effects are brief copied patterns whose total duration stays below 250 milliseconds',()=>{
 const {controller:c,calls,env}=harness();for(const kind of ['goal','concede','save','sub','kickoff','fulltime','preview']){assert.equal(status(c.play(kind)),'played');env.time+=1000;}assert.equal(calls.length,7);for(const p of calls){assert.ok(Array.isArray(p)&&p.length>0);assert.ok(p.every(n=>Number.isInteger(n)&&n>=0));assert.ok(p.reduce((sum,n)=>sum+n,0)<=250);}const received=[],mutation=Feedback.create({vibrate:p=>{received.push(copy(p));p.fill(9999);return true;},visible:()=>true,active:()=>true,now:()=>env.time,haptics:true});assert.equal(status(mutation.play('goal')),'played');env.time+=1000;assert.equal(status(mutation.play('goal')),'played');assert.deepEqual(received[0],received[1]);assert.ok(received[1].reduce((n,x)=>n+x,0)<=250);
});

test('the cooldown rejects rapid repeats but allows the exact 450 millisecond boundary',()=>{
 const {controller:c,calls,env}=harness();assert.equal(status(c.play('goal')),'played');env.time+=449;assert.equal(status(c.play('save')),'cooldown');assert.equal(calls.length,1);env.time++;assert.equal(status(c.play('save')),'played');assert.equal(calls.length,2);assert.equal(c.snapshot().lastStatus,'played');
});

test('explicit browser rejection is contained, throttled and can recover after a newly accepted request',()=>{
 let calls=0,time=1000,accept=false;const c=Feedback.create({vibrate:()=>{calls++;return accept;},visible:()=>true,active:()=>true,now:()=>time,haptics:true});assert.equal(status(c.play('goal')),'blocked');assert.equal(c.snapshot().blocked,true);assert.equal(status(c.play('save')),'cooldown');assert.equal(calls,1);time+=450;accept=true;assert.equal(status(c.play('goal')),'played');assert.equal(c.snapshot().blocked,false);assert.equal(calls,2);assert.equal(status(c.cancel()),'cancelled');assert.equal(calls,3);
});

test('vibration exceptions cannot interrupt match execution or trigger repeated failed calls',()=>{
 let calls=0;const c=Feedback.create({vibrate:()=>{calls++;throw Error('Vibration not allowed');},visible:()=>true,active:()=>true,now:()=>1000,haptics:true});assert.equal(status(c.play('goal')),'error');assert.equal(c.snapshot().lastStatus,'error');assert.equal(status(c.play('goal')),'cooldown');assert.equal(calls,1);assert.doesNotThrow(()=>c.setEnabled(false));assert.equal(c.snapshot().enabled,false);assert.equal(c.snapshot().lastStatus,'disabled');assert.equal(calls,1);
});

test('startup, disabled preferences and cancellation before the first touch never call the vibration API',()=>{
 let calls=0;const c=Feedback.create({vibrate:()=>{calls++;throw Error('WebView has no user activation');},active:()=>false});assert.equal(status(c.cancel()),'idle');c.setEnabled(false);c.setEnabled(false);assert.equal(status(c.play('preview')),'disabled');c.setEnabled(true);assert.equal(status(c.play('preview')),'inactive');assert.equal(status(c.cancel()),'idle');c.setEnabled(false);assert.equal(calls,0);assert.equal(c.snapshot().enabled,false);
});

test('only a currently accepted pattern is cancelled once; expired or rejected patterns need no stop request',()=>{
 const {controller:c,calls,env}=harness();assert.equal(status(c.play('goal')),'played');assert.equal(status(c.cancel()),'cancelled');assert.equal(status(c.cancel()),'idle');assert.deepEqual(calls,[[55,35,80],0]);c.setEnabled(false);assert.equal(calls.length,2);c.setEnabled(true);env.time+=1000;assert.equal(status(c.play('save')),'played');env.time+=20;assert.equal(status(c.cancel()),'idle');c.setEnabled(false);assert.equal(calls.length,3);
 let rejectedCalls=0;const rejected=Feedback.create({haptics:true,vibrate:()=>{rejectedCalls++;return false;},active:()=>true});assert.equal(status(rejected.play('goal')),'blocked');assert.equal(status(rejected.cancel()),'idle');rejected.setEnabled(false);assert.equal(rejectedCalls,1);
});

test('cancellation sends zero duration, disabling stops feedback and snapshots cannot change preferences',()=>{
 const {controller:c,calls,env}=harness();assert.equal(status(c.play('goal')),'played');assert.equal(status(c.cancel()),'cancelled');assert.equal(calls.at(-1),0);assert.equal(c.snapshot().enabled,true);c.setEnabled(false);assert.equal(calls.at(-1),0);assert.equal(c.snapshot().enabled,false);const count=calls.length;env.time+=1000;assert.equal(status(c.play('save')),'disabled');assert.equal(calls.length,count);const snapshot=c.snapshot();snapshot.enabled=true;assert.equal(c.snapshot().enabled,false);c.setEnabled(true);assert.equal(c.snapshot().enabled,true);assert.equal(status(c.play('save')),'played');
});

test('invalid effect names have no side effects and do not block the next valid effect',()=>{
 const {controller:c,calls}=harness();assert.equal(status(c.play('unknown')),'invalid');assert.equal(status(c.play(null)),'invalid');assert.deepEqual(calls,[]);assert.equal(status(c.play('goal')),'played');assert.equal(calls.length,1);
});

test('visual or haptic callbacks change no scores, random draws, player minutes, attribution or fast-forward results',()=>{
 for(const seed of [1,37,121,20260930]){const baseline=F.create(seed),withFeedback=F.create(seed),fast=F.create(seed),{controller:c,env}=harness();while(baseline.phase!=='full'){if(!F.running(baseline)){F.begin(baseline);F.begin(withFeedback);}F.tick(baseline);const events=F.tick(withFeedback);env.time+=1000;for(const e of events){if(e.type==='goal')c.play(e.team===0?'goal':'concede');else if(e.type==='shot'&&e.team===1)c.play('save');}assert.deepEqual(withFeedback,baseline);}while(fast.phase!=='full'){if(!F.running(fast))F.begin(fast);c.cancel();F.finishSegment(fast);}assert.deepEqual(fast,baseline);assert.equal(Object.values(withFeedback.players).reduce((n,p)=>n+p.minutes,0),990);assert.equal(F.goalAttributions(withFeedback).length,withFeedback.score[0]);}
});

test('self-generated real paused saves produce the expected next-tick goal, concession and goalkeeper save cards',()=>{
 const expected={goal:{savedMinute:41,eventMinute:42,scoreAfter:[1,0],rngAfter:1736884153},concede:{savedMinute:79,eventMinute:80,scoreAfter:[2,1],rngAfter:1196951657},save:{savedMinute:18,eventMinute:19,scoreAfter:[0,0],rngAfter:3405211585}};
 for(const kind of ['goal','concede','save']){const s=fixture(kind),{context:c}=uiHarness(s),scoreBefore=[...s.match.score];assert.equal(s.match.paused,true);const savedMinute=s.match.minute;s.match.paused=false;const events=F.tick(s.match);assert.equal(s.match.minute,savedMinute+1);let expectedRng=s.match.seed>>>0;for(let i=0;i<s.match.minute*8;i++)expectedRng=(Math.imul(expectedRng,1664525)+1013904223)>>>0;assert.equal(s.match.rng,expectedRng);const before=copy(s),moment=c.matchMomentFor(events,s.match);assert.equal(moment.kind,kind);assert.equal(moment.minute,savedMinute+1);assert.equal(moment.label,moment.minute+'′');assert.equal(moment.detail,S.displayText(events.find(e=>e.type===(kind==='save'?'shot':'goal')).text));if(kind==='goal')assert.equal(moment.player,s.match.players[events[0].scorerId].name);if(kind==='concede')assert.ok(Opposition.roster(S.opponentFor(s)).some(p=>p.pos==='FW'&&p.name===moment.player));if(kind==='save'){const gk=s.match.lineup.map(id=>s.match.players[id]).find(p=>p.pos==='GK');assert.equal(moment.player,gk.name);assert.ok(moment.detail.includes('골키퍼')||moment.detail.includes(gk.name+'의 선방'));assert.deepEqual(s.match.score,scoreBefore);}assert.deepEqual(s,before);}
});

test('highlights select a recorded goal before later substitutions',()=>{const {context:c}=uiHarness();let m,goal;for(let seed=1;seed<100;seed++){m=F.create(seed);F.begin(m);F.finishSegment(m);goal=m.logs.filter(e=>e.type==='goal').at(-1);if(goal)break;}assert.ok(goal);F.swap(m,'f1','f3');const before=copy(m),highlight=c.matchMomentFor(m.logs,m,true);assert.equal(highlight.kind,goal.team===0?'goal':'concede');assert.equal(highlight.minute,goal.minute);assert.deepEqual(m,before);});

test('real substitutions show the incoming player only after kickoff without adding another model event',()=>{
 const s=S.create(37),{context:c,nodes}=uiHarness(s),prepChange=F.swap(s.match,'g1','g2');c.presentSubstitution(prepChange);assert.equal(nodes['match-moment'].hidden,true);assert.equal(c.lastMoment,null);F.begin(s.match);F.finishSegment(s.match);const change=F.swap(s.match,'g2','g1'),before=copy(s),event=s.match.logs.at(-1);assert.equal(event.type,'sub');const selected=c.matchMomentFor([event],s.match);assert.equal(selected.kind,'sub');assert.equal(selected.minute,45);c.presentSubstitution(change);assert.equal(c.lastMoment.player,change.in.name);assert.ok(c.lastMoment.detail.includes(change.out.name+' OUT'));assert.ok(c.lastMoment.detail.includes(change.in.name+' IN'));assert.equal(nodes['match-moment'].hidden,false);assert.deepEqual(s,before);
});

test('preview and device capability messaging leave all scores, RNG, finances and statistics unchanged',()=>{
 const s=fixture('goal'),before=copy(s),{context:c,nodes}=uiHarness(s);c.previewMatchMoment();assert.equal(nodes['match-moment'].hidden,false);assert.equal(c.lastMoment.kind,'preview');assert.equal(c.lastMoment.minute,null);assert.equal(c.lastMoment.label,'연출 미리보기');assert.equal(c.lastEvent,null);assert.ok(nodes['match-moment'].innerHTML.includes('경기 기록은 바뀌지 않아요.'));assert.ok(nodes['experience-controls'].innerHTML.includes('진동 미지원'));assert.ok(nodes['experience-controls'].innerHTML.includes('disabled'));assert.deepEqual(s,before);const snapshot=c.feedbackSnapshot();snapshot.preferences.effects=false;snapshot.moment.player='changed';assert.equal(c.mediaPrefs.effects,true);assert.notEqual(c.lastMoment.player,'changed');
});

test('reduced motion and the effects preference remove pitch animation while preserving accessible static cards',()=>{
 const s=fixture('save'),before=copy(s),{context:c,nodes,timers,env,classNames}=uiHarness(s);c.mediaPrefs.effects=false;c.previewMatchMoment();assert.equal(c.motionEnabled(),false);assert.equal(nodes.pitch.dataset.moment,undefined);assert.equal(nodes['match-moment'].hidden,false);assert.equal(classNames.has('matchday-effects-off'),true);assert.equal([...timers.values()].some(t=>t.ms===1000),false);c.mediaPrefs.effects=true;env.reduced=true;c.previewMatchMoment();assert.equal(nodes.pitch.dataset.moment,undefined);assert.equal(c.motionEnabled(),false);assert.ok(nodes['experience-controls'].innerHTML.includes('움직임 줄이기 설정 적용'));env.reduced=false;c.previewMatchMoment();assert.equal(nodes.pitch.dataset.moment,'preview');const impact=[...timers.values()].find(t=>t.ms===1000);assert.ok(impact);impact.fn();assert.equal(nodes.pitch.dataset.moment,undefined);const hide=[...timers.values()].find(t=>t.ms===4200);assert.ok(hide);hide.fn();assert.equal(nodes['match-moment'].hidden,true);assert.deepEqual(s,before);
});

test('hidden pages, view changes and page exit cancel presentation without changing the haptic preference or match',()=>{
 const s=fixture('concede'),before=copy(s),{context:c,nodes,calls,timers,listeners}=uiHarness(s,{supported:true,haptics:true});c.view='club';c.previewMatchMoment();assert.equal(nodes['match-moment'].hidden,true);assert.deepEqual(calls,[]);c.view='match';c.document.hidden=true;c.previewMatchMoment();assert.deepEqual(calls,[]);c.document.hidden=false;c.previewMatchMoment();assert.equal(nodes['match-moment'].hidden,false);assert.ok(Array.isArray(calls.at(-1)));c.document.hidden=true;listeners.document.visibilitychange();assert.equal(calls.at(-1),0);assert.equal(nodes['match-moment'].hidden,true);assert.equal(nodes.pitch.dataset.moment,undefined);assert.equal(timers.size,0);assert.equal(c.mediaPrefs.haptics,true);listeners.window.pagehide();assert.equal(calls.at(-1),0);assert.equal(c.matchFeedback.snapshot().enabled,true);assert.deepEqual(s,before);
});

test('preference buttons clear movement and persist presentation settings without mutating gameplay',()=>{
 const s=S.create(37),before=copy(s),{context:c,nodes,calls,env,playerNodes}=uiHarness(s,{supported:true});const click=setting=>nodes['experience-controls'].handlers.click({target:{closest:()=>({dataset:{experience:setting}})}});click('haptics');assert.equal(c.mediaPrefs.haptics,true);assert.ok(Array.isArray(calls.at(-1)));assert.equal(env.saves,1);click('effects');assert.equal(c.mediaPrefs.effects,false);assert.equal(calls.at(-1),0);assert.deepEqual(playerNodes[0].style,{marginLeft:'',marginTop:''});assert.equal(env.saves,2);click('haptics');assert.equal(c.mediaPrefs.haptics,false);assert.equal(c.matchFeedback.snapshot().enabled,false);assert.equal(calls.at(-1),0);assert.equal(env.saves,3);assert.deepEqual(s,before);
});

test('display cards escape saved commentary and an unsupported device never claims vibration occurred',()=>{
 const {context:c,nodes}=uiHarness();c.presentMoment({kind:'goal',label:'42′',title:'GOAL!',player:'<img src=x onerror="bad()">',detail:'<script>bad()</script> & old commentary'});const html=nodes['match-moment'].innerHTML;assert.equal(html.includes('<img'),false);assert.equal(html.includes('<script>'),false);assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&amp; old commentary'));assert.ok(nodes['experience-controls'].innerHTML.includes('이 브라우저는 진동을 지원하지 않아요.'));assert.equal(c.matchFeedback.snapshot().supported,false);
});

test('opening planning preserves an unshown goal and clearing another view cancels it',()=>{const s=S.create(37),h=uiHarness(s),c=h.context;F.begin(c.state);c.MatchFlow=require('./dist/match-flow.js');c.document.getElementById=()=>null;vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/match-control-ui.js'),'utf8'),c);const event={type:'goal',team:0,minute:12};c.pendingMatchMoment={event,moment:{kind:'goal'}};c.pauseForPlanning();assert.equal(c.state.paused,true);assert.equal(c.pendingMatchMoment.event,event);assert.equal(h.nodes['match-moment'].hidden,true);c.lastEventFast=false;c.presentMatchEvents([],true);assert.equal(c.lastEventFast,false);assert.equal(c.pendingMatchMoment.event,event);c.clearMatchFeedback();assert.equal(c.pendingMatchMoment,null);});
console.log('Feedback tests passed: '+groups+' groups. Physical device vibration is not verified by these mocks.');
