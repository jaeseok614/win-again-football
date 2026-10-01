'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),B=require('./dist/tactics-board.js'),Portraits=require('./dist/portraits.js');
const copy=value=>JSON.parse(JSON.stringify(value));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function at(phase,seed=1541){const s=S.create(seed);while(s.match.phase!==phase){if(!F.running(s.match))F.begin(s.match);F.finishSegment(s.match);}return s;}
function pausedAt(minute,seed=1551){const s=S.create(seed);while(s.match.minute<minute){if(!F.running(s.match))F.begin(s.match);F.tick(s.match);}if(!F.running(s.match))F.begin(s.match);s.match.paused=true;return s;}
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function harness(season,overrides={}){
 const calls={action:0,save:0,render:0,setTactic:0,begin:0,tick:0,train:0,recruit:0,settle:0},errors=[],document={activeElement:null},host={hidden:false,handlers:{},children:[]};let context;
 const node=(attributes,html)=>({attributes,dataset:{},disabled:/\bdisabled\b/.test(attributes),isConnected:true,html,focus(options){if(this.disabled)return;document.activeElement=this;this.focusOptions=options;},getAttribute(name){return new RegExp('\\b'+name+'="([^"]*)"').exec(this.attributes)?.[1]??null;},closest(selector){return selector==='[data-tactics-preview]'&&this.dataset.tacticsPreview?this:selector==='[data-tactics-apply]'&&this.dataset.tacticsApply?this:null;}});
 host.querySelector=selector=>selector==='details'?host.details:selector==='[data-tactics-apply]'?host.children.find(b=>b.dataset.tacticsApply):host.children.find(b=>{const match=/^\[data-tactics-preview="([^"]+)"\]$/.exec(selector);return match&&b.dataset.tacticsPreview===match[1];});
 host.addEventListener=(type,fn)=>(host.handlers[type]??=[]).push(fn);
 Object.defineProperty(host,'innerHTML',{get(){return this.markup||'';},set(html){for(const child of this.children){child.isConnected=false;if(document.activeElement===child)document.activeElement=null;}this.markup=html;this.children=[];const details=/<details\b([^>]*)>/.exec(html);this.details=details?{open:/\bopen\b/.test(details[1])}:null;for(const [,attributes,content] of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)){const button=node(attributes,content);for(const [,key,value] of attributes.matchAll(/data-([a-z-]+)="([^"]*)"/g))button.dataset[key.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;this.children.push(button);}}});
 document.getElementById=id=>id==='tactics-board'?host:null;
 context=vm.createContext({document});
 // This UI script loads before app.js initializes F, season, state or $.
 vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/tactics-board-ui.js'),'utf8'),context);
 const deny=key=>(()=>{calls[key]++;throw Error('unexpected '+key);});
 Object.assign(context,{season,state:season.match,F:{...F,setTactic(match,tactic){calls.setTactic++;F.setTactic(match,tactic);},begin:deny('begin'),tick:deny('tick')},S:{...S,train:deny('train'),recruit:deny('recruit'),settle:deny('settle')},Training:{train:deny('train')},TacticsBoard:B,Portraits,escapeText:value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),action(fn){calls.action++;try{fn();calls.save++;calls.render++;context.renderTacticsBoard();}catch(error){errors.push(error.message);}},...overrides});
 return {context,host,document,calls,errors,preview:tactic=>host.querySelector('[data-tactics-preview="'+tactic+'"]'),apply:()=>host.querySelector('[data-tactics-apply]'),click(button){for(const fn of host.handlers.click||[])fn({target:button});},read:name=>vm.runInContext(name,context)};
}
function unchanged(h,before){assert.equal(JSON.stringify(h.context.season),before);for(const key of ['begin','tick','train','recruit','settle'])assert.equal(h.calls[key],0,key+' must never run');}

test('the board initializes before app globals and renders the real pre-match window without side effects',()=>{
 const s=S.create(1542),h=harness(s),before=JSON.stringify(s);h.context.renderTacticsBoard();assert.equal(h.host.hidden,false);assert.match(h.host.innerHTML,/킥오프 전/);assert.match(h.host.innerHTML,/다음 45분/);assert.match(h.host.innerHTML,/상대 배치 예시/);assert.match(h.host.innerHTML,/확정 찬스 수나 예상 스코어를 뜻하지 않습니다/);assert.equal(h.preview('balanced').getAttribute('aria-pressed'),'true');assert.equal(h.apply().disabled,true);assert.equal(h.calls.action,0);assert.equal(h.calls.save,0);unchanged(h,before);
});

test('preview selection updates pressed state and focus while preserving the current tactic and the entire season',()=>{
 const s=freeze(copy(S.create(1543))),h=harness(s),before=JSON.stringify(s);h.context.renderTacticsBoard();
 for(const tactic of ['press','counter','balanced','press']){h.click(h.preview(tactic));const button=h.preview(tactic);assert.equal(button.getAttribute('aria-pressed'),'true');for(const other of ['balanced','press','counter'].filter(x=>x!==tactic))assert.equal(h.preview(other).getAttribute('aria-pressed'),'false');assert.equal(h.document.activeElement,button);assert.deepEqual(copy(button.focusOptions),{preventScroll:true});assert.equal(s.match.tactic,'balanced');assert.equal(h.read('tacticsPreview'),tactic);unchanged(h,before);}assert.equal(h.calls.action,0);assert.equal(h.calls.save,0);assert.equal(h.calls.setTactic,0);
 const html=h.host.innerHTML;h.context.previewTactics('unknown');assert.equal(h.host.innerHTML,html);unchanged(h,before);
});

test('explicit application changes only the tactic, saves once, and focuses a usable selected preview control',()=>{
 const s=S.create(1544),h=harness(s);h.context.renderTacticsBoard();h.click(h.preview('press'));const expected=copy(s);expected.match.tactic='press';h.click(h.apply());
 assert.deepEqual(s,expected);assert.equal(s.match.phase,'prep');assert.equal(s.match.minute,0);assert.equal(h.calls.setTactic,1);assert.equal(h.calls.action,1);assert.equal(h.calls.save,1);assert.equal(h.calls.render,1);assert.equal(h.errors.length,0);assert.equal(h.apply().disabled,true);assert.equal(h.document.activeElement,h.preview('press'));assert.equal(h.document.activeElement.disabled,false);assert.deepEqual(copy(h.document.activeElement.focusOptions),{preventScroll:true});unchanged(h,JSON.stringify(expected));
 h.click(h.apply());assert.equal(h.calls.action,1);assert.equal(h.calls.setTactic,1);
});

test('stale application rejects changes to formation, lineup, condition, opponent, tactic and match context',()=>{
 const changes=[h=>F.setFormation(h.context.state,'433'),h=>F.swap(h.context.state,'f1','f3'),h=>h.context.state.players.g1.energy-=1,h=>h.context.state.opponent.speed-=1,h=>F.setTactic(h.context.state,'counter'),h=>{h.context.season=S.recruit(h.context.season,'t_f1','f2');h.context.state=h.context.season.match;},h=>{h.context.season=S.create(1550);h.context.state=h.context.season.match;},h=>{F.begin(h.context.state);F.finishSegment(h.context.state);}];
 for(const change of changes){const h=harness(S.create(1545));h.context.renderTacticsBoard();h.click(h.preview('press'));const oldApply=h.apply();change(h);const before=JSON.stringify(h.context.season);h.click(oldApply);assert.equal(h.errors.length,1);assert.match(h.errors[0],/선발|경기 상황/);assert.equal(h.calls.setTactic,0);assert.equal(h.calls.save,0);unchanged(h,before);}
});

test('unpaused running, full-time and absent matches hide the board and reject previously enabled apply controls',()=>{
 const changes=[h=>F.begin(h.context.state),h=>{while(h.context.state.phase!=='full'){if(!F.running(h.context.state))F.begin(h.context.state);F.finishSegment(h.context.state);}},h=>{h.context.season.match=null;h.context.state=null;}];
 for(const change of changes){const h=harness(S.create(1546));h.context.renderTacticsBoard();h.click(h.preview('counter'));const oldApply=h.apply();change(h);const before=JSON.stringify(h.context.season);h.context.renderTacticsBoard();assert.equal(h.host.hidden,true);assert.equal(h.host.innerHTML,'');assert.equal(h.read('tacticsBoardFingerprint'),null);h.context.previewTactics('press');assert.equal(h.host.innerHTML,'');h.click(oldApply);assert.equal(h.errors.length,1);assert.equal(h.calls.setTactic,0);assert.equal(h.calls.save,0);unchanged(h,before);}
});

test('paused 17, 59 and 74 minute previews show the real remaining window and keep all match state frozen',()=>{
 for(const [minute,remaining] of [[17,28],[59,6],[74,16]]){const s=freeze(copy(pausedAt(minute))),h=harness(s),before=JSON.stringify(s);h.context.renderTacticsBoard();assert.equal(h.host.hidden,false);assert.match(h.host.innerHTML,new RegExp(minute+'분 작전 타임'));assert.match(h.host.innerHTML,new RegExp('다음 '+remaining+'분'));assert.match(h.host.innerHTML,/경기 시작·이어가기/);for(const tactic of ['press','counter','balanced']){h.click(h.preview(tactic));assert.equal(h.preview(tactic).getAttribute('aria-pressed'),'true');assert.equal(h.document.activeElement,h.preview(tactic));assert.deepEqual(copy(h.document.activeElement.focusOptions),{preventScroll:true});assert.equal(s.match.paused,true);assert.equal(s.match.minute,minute);unchanged(h,before);}assert.equal(h.calls.action,0);assert.equal(h.calls.save,0);assert.equal(h.calls.setTactic,0);}
});

test('paused live application splits only the current tactical history and never resumes or advances the match',()=>{
 for(const minute of [17,59,74]){const s=pausedAt(minute),h=harness(s),before=copy(s),segments=s.match.segments.length;h.context.renderTacticsBoard();h.click(h.preview('press'));const expected=copy(s);F.setTactic(expected.match,'press');h.click(h.apply());assert.deepEqual(s,expected);assert.equal(s.match.paused,true);assert.equal(s.match.minute,minute);assert.equal(s.match.rng,before.match.rng);assert.deepEqual(s.match.lineup,before.match.lineup);assert.deepEqual(s.match.players,before.match.players);assert.deepEqual(s.finance,before.finance);assert.equal(s.match.segments.length,segments+1);assert.equal(s.match.segments.at(-2).end,minute);assert.equal(s.match.segments.at(-1).start,minute);assert.equal(s.match.segments.at(-1).end,null);assert.equal(s.match.segments.at(-1).tactic,'press');assert.equal(h.calls.setTactic,1);assert.equal(h.calls.save,1);assert.equal(h.errors.length,0);assert.equal(h.apply().disabled,true);assert.equal(h.document.activeElement,h.preview('press'));unchanged(h,JSON.stringify(expected));h.click(h.apply());assert.equal(h.calls.setTactic,1);h.click(h.preview('counter'));F.setTactic(expected.match,'counter');h.click(h.apply());assert.deepEqual(s,expected);assert.equal(s.match.segments.length,segments+1);assert.equal(h.calls.setTactic,2);assert.equal(h.calls.save,2);assert.equal(h.errors.length,0);assert.equal(h.document.activeElement,h.preview('counter'));unchanged(h,JSON.stringify(expected));}
});

test('resuming or playing another minute rejects a paused preview before any tactic or save mutation',()=>{
 for(const advance of [false,true]){const s=pausedAt(17),h=harness(s);h.context.renderTacticsBoard();h.click(h.preview('press'));const oldApply=h.apply();s.match.paused=false;if(advance){F.tick(s.match);s.match.paused=true;}const before=JSON.stringify(s);h.click(oldApply);assert.equal(h.errors.length,1);assert.equal(h.calls.setTactic,0);assert.equal(h.calls.save,0);unchanged(h,before);h.context.renderTacticsBoard();if(advance){assert.equal(h.host.hidden,false);assert.match(h.host.innerHTML,/18분 작전 타임/);assert.match(h.host.innerHTML,/다음 27분/);assert.equal(h.preview('balanced').getAttribute('aria-pressed'),'true');}else{assert.equal(h.host.hidden,true);assert.equal(h.read('tacticsBoardFingerprint'),null);}}
});

test('halftime and 65-minute application uses its legal window without opening the next segment',()=>{
 for(const [phase,minutes,label] of [['half',20,'하프타임'],['late',25,'65분 작전 시간']]){const s=at(phase),h=harness(s);h.context.renderTacticsBoard();assert.match(h.host.innerHTML,new RegExp(label));assert.match(h.host.innerHTML,new RegExp('다음 '+minutes+'분'));h.click(h.preview('counter'));const expected=copy(s);expected.match.tactic='counter';h.click(h.apply());assert.deepEqual(s,expected);assert.equal(s.match.phase,phase);assert.equal(h.calls.begin,0);assert.equal(h.calls.tick,0);assert.equal(h.calls.setTactic,1);assert.equal(h.errors.length,0);unchanged(h,JSON.stringify(expected));}
});

test('native details state is retained during preview while a new formation resets selection to the applied tactic',()=>{
 const s=S.create(1547),h=harness(s),before=JSON.stringify(s);h.context.renderTacticsBoard();h.host.details.open=false;h.context.previewTactics('counter');assert.equal(h.host.details.open,false);assert.equal(h.read('tacticsBoardOpen'),false);unchanged(h,before);
 h.host.details.open=true;h.context.renderTacticsBoard();assert.equal(h.host.details.open,true);assert.equal(h.preview('counter').getAttribute('aria-pressed'),'true');F.setFormation(s.match,'352');const changed=JSON.stringify(s);h.context.renderTacticsBoard();assert.equal(h.preview('balanced').getAttribute('aria-pressed'),'true');assert.equal(h.read('tacticsPreview'),'balanced');assert.match(h.host.innerHTML,/3-5-2/);unchanged(h,changed);
});

test('player and coach text is escaped, identities stay attached to current players and analysis does not mutate snapshots',()=>{
 const s=S.create(1548),h=harness(s),before=JSON.stringify(s),d=copy(B.read(s)),payload='<img src=x onerror="bad()"> & \'Q\'';
 for(const p of d.lineup)p.name=payload;d.recommendation.label=payload;d.recommendation.reason=payload;d.assumption=payload;const html=h.context.tacticsBoardMarkup(d,'press');assert.doesNotMatch(html,/<img|onerror="/);assert.ok((html.match(/&lt;img src=x onerror=&quot;bad\(\)&quot;&gt; &amp; &#39;Q&#39;/g)||[]).length>=6);assert.match(html,/data-player-detail="f1"/);assert.match(html,/data-portrait-index="21"/);unchanged(h,before);
});

test('a mismatched application choice cannot bypass preview selection or call the existing action model',()=>{
 const s=S.create(1549),h=harness(s),before=JSON.stringify(s);h.context.renderTacticsBoard();h.context.previewTactics('counter');h.context.applyTacticsPreview('press');assert.equal(h.errors.length,1);assert.equal(h.calls.setTactic,0);assert.equal(h.calls.save,0);unchanged(h,before);
});
console.log('Validated '+groups+' tactical board UI groups, including pure previews, explicit application, stale guards, legal windows and focus.');
