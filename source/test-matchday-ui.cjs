'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),Matchday=require('./dist/matchday.js'),MatchFlow=require('./dist/match-flow.js'),TacticsBoard=require('./dist/tactics-board.js'),Portraits=require('./dist/portraits.js'),Opposition=require('./dist/opposition.js');
const copy=value=>JSON.parse(JSON.stringify(value));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function at(minute,seed=2011){const s=S.create(seed);while(s.match.minute<minute){if(!F.running(s.match))F.begin(s.match);s.match.paused=false;F.tick(s.match);}return s;}
function freeze(value){if(value&&typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
const escapeText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function harness(season,{width=1280,selected=null,view='match'}={}){
 const nodes=new Map(),calls={save:0,render:0,feedback:0,clockReset:0,tick:0,begin:0,swap:0,setTactic:0,train:0,recruit:0,settle:0},saved=[];let context;
 const document={activeElement:null,getElementById:id=>nodes.get(id)||null};
 const dataKey=key=>key.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
 function element(id='',attributes=''){
  const node={id,attributes,dataset:{},hidden:false,disabled:/\bdisabled\b/.test(attributes),isConnected:true,children:[],handlers:{},html:'',tabIndex:0,textContent:'',setCount:0};
  for(const [,key,value] of attributes.matchAll(/data-([a-z-]+)="([^"]*)"/g))node.dataset[dataKey(key)]=value;
  node.setAttribute=(name,value)=>{(node.attributeValues??={})[name]=String(value);};
  node.getAttribute=name=>node.attributeValues?.[name]??new RegExp('\\b'+name+'="([^"]*)"').exec(node.attributes)?.[1]??null;
  node.focus=options=>{if(node.disabled||!node.isConnected)return;document.activeElement=node;node.focusOptions=options;};
  node.scrollIntoView=options=>{node.scrollOptions=options;};
  node.contains=other=>other===node||node.children.includes(other);
  node.closest=selector=>{const match=/^\[data-([a-z-]+)\]$/.exec(selector);return match&&Object.hasOwn(node.dataset,dataKey(match[1]))?node:null;};
  node.matches=selector=>node.closest(selector)===node;
  node.addEventListener=(type,fn)=>(node.handlers[type]??=[]).push(fn);
  node.querySelector=selector=>{if(selector==='details')return node.details||null;if(selector==='summary')return node.summary||null;const match=/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/.exec(selector);return match?node.children.find(child=>Object.hasOwn(child.dataset,dataKey(match[1]))&&(match[2]===undefined||child.dataset[dataKey(match[1])]===match[2]))||null:null;};
  Object.defineProperty(node,'innerHTML',{get(){return node.html;},set(html){
   for(const child of node.children){child.isConnected=false;if(child.id&&nodes.get(child.id)===child)nodes.delete(child.id);if(document.activeElement===child)document.activeElement=null;}
   node.html=html;node.children=[];node.details=null;node.summary=null;node.setCount++;
   for(const [,tag,attrs] of html.matchAll(/<(button|h3|span)\b([^>]*)>/g)){const id=/\bid="([^"]*)"/.exec(attrs)?.[1]||'',child=element(id,attrs);if(tag==='button'||id){node.children.push(child);if(id)nodes.set(id,child);}}
   const details=/<details\b([^>]*)>/.exec(html);if(details){node.details=element();node.details.open=/\bopen\b/.test(details[1]);node.summary=element();node.details.querySelector=selector=>selector==='summary'?node.summary:null;}
  }});
  if(id)nodes.set(id,node);return node;
 }
 for(const id of ['matchday-summary','matchday-live','tactics-board','matchday-selection','matchday-roster','selection-hint','bench-heading','pause','matchday-tabs','match-pane','match-controls'])element(id);
 const live=element('matchday-tab-live','data-matchday-tab="live"'),analysis=element('matchday-tab-analysis','data-matchday-tab="analysis"');nodes.get('matchday-tabs').children=[live,analysis];
 context=vm.createContext({document,MatchFlow,innerWidth:width,performance:{now:()=>20000}});
 for(const name of ['tactics-board-ui','match-control-ui','matchday-ui'])vm.runInContext(fs.readFileSync(path.join(__dirname,'dist',name+'.js'),'utf8'),context,{filename:name+'.js'});
 const deny=key=>(()=>{calls[key]++;throw Error('Unexpected model mutation: '+key);});
 Object.assign(context,{season,state:season.match,selected,view,movementStamp:0,Matchday,TacticsBoard,Portraits,escapeText,F:{...F,tick:deny('tick'),begin:deny('begin'),swap:deny('swap'),setTactic:deny('setTactic')},S:{...S,train:deny('train'),recruit:deny('recruit'),settle:deny('settle')},clearMatchFeedback(){calls.feedback++;},save(){calls.save++;saved.push(JSON.stringify(context.season));},render(){calls.render++;context.renderTacticsBoard();context.renderMatchday();},action(fn){fn();context.save();context.render();}});
 const app=fs.readFileSync(path.join(__dirname,'dist/app.js'),'utf8'),editable=/^const editable=.*$/m.exec(app);assert.ok(editable,'Use the actual app editability guard.');vm.runInContext(editable[0],context);
 const reset=context.matchClock.reset;context.matchClock.reset=()=>{calls.clockReset++;reset();};
 return {context,document,nodes,calls,saved,element,render:()=>context.render(),get:id=>nodes.get(id),read:expression=>vm.runInContext(expression,context),dispatch(id,type,target,extra={}){let prevented=0;for(const fn of nodes.get(id).handlers[type]||[])fn({target,key:null,preventDefault(){prevented++;},...extra});return prevented;}};
}
function noModelActions(h){for(const key of ['tick','begin','swap','setTactic','train','recruit','settle'])assert.equal(h.calls[key],0,key+' must not be invoked by navigation or selection');}
function unchanged(h,before){assert.equal(JSON.stringify(h.context.season),before);noModelActions(h);}
function onlyPaused(h,before){const expected=copy(before);expected.match.paused=true;assert.deepEqual(h.context.season,expected);noModelActions(h);}
function assertTab(h,tab){assert.equal(h.read('matchdayTab'),tab);assert.equal(h.get('matchday-live').hidden,tab==='analysis');assert.equal(h.get('tactics-board').hidden,tab!=='analysis');for(const id of ['live','analysis']){assert.equal(h.get('matchday-tab-'+id).getAttribute('aria-selected'),String(id===tab));assert.equal(h.get('matchday-tab-'+id).tabIndex,id===tab?0:-1);}}

test('UI scripts initialize before app globals and readonly rendering preserves the entire campaign',()=>{
 for(const minute of [0,17,45,59,65,74,90]){const s=minute?at(minute):S.create(2012);if(F.running(s.match))s.match.paused=true;const h=harness(freeze(s)),before=JSON.stringify(s);h.render();assert.equal(h.get('matchday-summary').hidden,false);assertTab(h,'live');assert.match(h.get('matchday-summary').innerHTML,/공격 기회/);assert.match(h.get('matchday-summary').innerHTML,/슈팅/);assert.equal(h.calls.save,0);const count=h.get('matchday-summary').setCount;h.render();assert.equal(h.get('matchday-summary').setCount,count);unchanged(h,before);}
 const s={match:null},h=harness(s),before=JSON.stringify(s);h.render();assert.equal(h.get('matchday-summary').hidden,true);assert.equal(h.get('tactics-board').hidden,true);unchanged(h,before);
});

test('switching to live and rejecting unknown tabs never advance time or change the actual tactic',()=>{
 const s=freeze(at(17)),h=harness(s),before=JSON.stringify(s);h.render();h.dispatch('matchday-tabs','click',h.get('matchday-tab-live'));assertTab(h,'live');assert.equal(h.get('tactics-board').innerHTML,'');assert.equal(h.document.activeElement,h.get('matchday-tab-live'));assert.equal(h.calls.save,1);assert.equal(h.calls.clockReset,0);unchanged(h,before);
 const renders=h.calls.render,saves=h.calls.save;h.context.setMatchdayTab('other');assert.equal(h.calls.render,renders);assert.equal(h.calls.save,saves);unchanged(h,before);
});

test('analysis pauses the actual current minute and renders the real remaining tactical window without RNG or statistical changes',()=>{
 for(const minute of [17,59,74]){const s=at(minute),h=harness(s),before=copy(s);h.render();h.dispatch('matchday-tabs','click',h.get('matchday-tab-analysis'));onlyPaused(h,before);assertTab(h,'analysis');assert.equal(h.calls.save,1);assert.equal(h.calls.clockReset,1);assert.equal(h.saved.at(-1),JSON.stringify(s));assert.equal(h.document.activeElement,h.get('matchday-tab-analysis'));assert.ok(h.get('tactics-board').querySelector('details').open);assert.match(h.get('tactics-board').innerHTML,new RegExp(minute+'분 작전 타임'));assert.equal(TacticsBoard.read(s,{coachPause65:false}).valid,true);
  const paused=JSON.stringify(s);h.dispatch('matchday-tabs','click',h.get('matchday-tab-live'));assertTab(h,'live');unchanged(h,paused);assert.equal(h.get('pause').textContent,'5분 진행');
 }
});

test('quick starter selection pauses without substitution and keeps identity, condition and mobile focus current',()=>{
 const s=at(23),h=harness(s,{width:390}),before=copy(s);h.render();const choice=h.get('matchday-selection').querySelector('[data-matchday-player]'),id=choice.dataset.matchdayPlayer;assert.ok(s.match.lineup.includes(id));h.dispatch('match-pane','click',choice);onlyPaused(h,before);assert.equal(h.context.selected,id);assertTab(h,'live');assert.equal(h.calls.save,1);assert.equal(h.calls.clockReset,1);assert.match(h.get('matchday-selection').innerHTML,new RegExp(escapeText(s.match.players[id].name)));assert.equal(h.document.activeElement.id,'matchday-selected-name');assert.deepEqual(copy(h.document.activeElement.focusOptions),{preventScroll:true});assert.deepEqual(copy(h.get('matchday-selection').scrollOptions),{block:'center',behavior:'instant'});assert.equal(h.read('tacticsBoardOpen'),false);assert.equal(h.get('bench-heading').textContent,Matchday.read(s,id).selected.role+' 교체 후보');
 const saved=JSON.stringify(s),selected=h.context.selected;for(const invalid of ['not-a-slot','__proto__','f3',null]){h.context.selectMatchdayPlayer(invalid);assert.equal(h.context.selected,selected);unchanged(h,saved);}const bench=h.element('', 'data-bench="f3"');h.dispatch('match-pane','click',bench);unchanged(h,saved);
});

test('keyboard activation of a desktop quick starter moves focus from the removed button to the new player heading',()=>{
 for(const width of [730,1280]){
  const s=at(23),h=harness(s,{width}),before=copy(s);h.render();const quick=h.get('matchday-selection').querySelector('[data-matchday-player]'),id=quick.dataset.matchdayPlayer;
  quick.focus();assert.equal(h.document.activeElement,quick);h.dispatch('match-pane','click',quick);
  assert.equal(quick.isConnected,false);assert.equal(h.context.selected,id);assert.equal(h.document.activeElement,h.get('matchday-selected-name'));assert.equal(h.document.activeElement.isConnected,true);assert.deepEqual(copy(h.document.activeElement.focusOptions),{preventScroll:true});assert.equal(h.get('matchday-selection').scrollOptions,undefined);
  assert.equal(h.calls.save,1);assertTab(h,'live');onlyPaused(h,before);
 }
});

test('keyboard cancellation restores focus to a current quick starter at every viewport without changing the paused match',()=>{
 for(const width of [390,730,1280]){
  const s=at(23);s.match.paused=true;const h=harness(s,{width,selected:'f1'}),before=JSON.stringify(s);h.render();const clear=h.get('matchday-selection').querySelector('[data-matchday="clear"]');
  clear.focus();assert.equal(h.document.activeElement,clear);h.dispatch('match-pane','click',clear);
  const first=h.get('matchday-selection').querySelector('[data-matchday-player]');assert.equal(clear.isConnected,false);assert.equal(h.context.selected,null);assert.equal(h.document.activeElement,first);assert.ok(s.match.lineup.includes(first.dataset.matchdayPlayer));assert.equal(first.isConnected,true);assert.deepEqual(copy(first.focusOptions),{preventScroll:true});assert.equal(h.get('matchday-selection').scrollOptions,undefined);
  assert.equal(h.calls.save,1);assertTab(h,'live');unchanged(h,before);
 }
});

test('the explicit tactics and substitutions action pauses, saves and focuses live selection without moving match time',()=>{
 const s=at(37),h=harness(s),before=copy(s);h.render();h.context.setMatchdayTab('analysis');h.dispatch('match-pane','click',h.element('', 'data-matchday="roster"'));onlyPaused(h,before);assertTab(h,'live');assert.equal(h.calls.save,2);assert.equal(h.document.activeElement.dataset.matchdayPlayer,Matchday.read(s).lowestEnergy[0].id);assert.deepEqual(copy(h.get('matchday-selection').scrollOptions),{block:'center',behavior:'instant'});
 const paused=JSON.stringify(s),disabled=h.element('', 'data-matchday="roster" disabled');h.dispatch('match-pane','click',disabled);assert.equal(h.calls.save,2);unchanged(h,paused);
 h.context.view='club';h.get('matchday-selection').scrollOptions=null;h.context.focusMatchdaySelection();assert.equal(h.get('matchday-selection').scrollOptions,null);unchanged(h,paused);
});

test('returning to analysis after starter selection reopens the actual existing collapsed tactics details',()=>{
 const s=at(17),h=harness(s);h.render();h.dispatch('matchday-tabs','click',h.get('matchday-tab-analysis'));assertTab(h,'analysis');assert.equal(h.get('tactics-board').querySelector('details').open,true);
 h.context.selectMatchdayPlayer('f1');assertTab(h,'live');const collapsed=h.get('tactics-board').querySelector('details');assert.ok(collapsed,'The real renderer retains a hidden collapsed details element.');assert.equal(collapsed.open,false);assert.equal(h.read('tacticsBoardOpen'),false);
 const before=JSON.stringify(s),renders=h.calls.render;h.dispatch('matchday-tabs','click',h.get('matchday-tab-analysis'));assert.equal(h.calls.render,renders+1);assertTab(h,'analysis');assert.equal(h.get('tactics-board').querySelector('details').open,true);assert.equal(h.read('tacticsBoardOpen'),true);assert.equal(h.document.activeElement,h.get('matchday-tab-analysis'));assert.equal(h.calls.save,3);assert.equal(h.context.selected,'f1');unchanged(h,before);
});

test('resume and full time automatically restore live panels and disable stale full-time analysis or player selection',()=>{
 const s=at(17),h=harness(s);h.render();h.context.setMatchdayTab('analysis');assertTab(h,'analysis');s.match.paused=false;const resumed=JSON.stringify(s);h.render();assertTab(h,'live');assert.equal(h.get('tactics-board').innerHTML,'');unchanged(h,resumed);
 h.context.setMatchdayTab('analysis');s.match.paused=false;while(s.match.phase!=='full'){if(!F.running(s.match))F.begin(s.match);F.tick(s.match);}const finished=JSON.stringify(s);h.context.selected='f1';h.render();assertTab(h,'live');assert.equal(h.get('matchday-tab-analysis').disabled,true);assert.equal(h.get('matchday-roster').hidden,true);assert.equal(h.get('selection-hint').hidden,true);assert.match(h.get('matchday-selection').innerHTML,/교체 종료/);assert.doesNotMatch(h.get('matchday-selection').innerHTML,/data-matchday-player|data-player-detail/);const saves=h.calls.save;
 h.context.setMatchdayTab('analysis');h.context.selectMatchdayPlayer('f1');h.dispatch('matchday-tabs','click',h.get('matchday-tab-analysis'));h.dispatch('match-pane','click',h.element('', 'data-matchday="roster"'));assert.equal(h.calls.save,saves);assertTab(h,'live');unchanged(h,finished);
});

test('removed and injured reserve identities never become actionable selections or mutate the match from candidate display',()=>{
 const s=at(12),h=harness(s,{selected:'f1'});F.swap(s.match,'f1','f3');s.match.players.f4.injuryRemaining=1;h.render();const before=JSON.stringify(s);assert.equal(Matchday.read(s,'f1').selected,null);assert.doesNotMatch(h.get('matchday-selection').innerHTML,/id="matchday-selected-name"/);
 for(const id of ['f1','f4','missing']){h.context.selectMatchdayPlayer(id);unchanged(h,before);}h.context.selected='f3';h.render();assert.deepEqual(Matchday.read(s,'f3').candidates,[]);assert.match(h.get('matchday-selection').innerHTML,/출전 가능한 후보가 없습니다/);unchanged(h,before);
 const clear=h.get('matchday-selection').querySelector('[data-matchday="clear"]');h.dispatch('match-pane','click',clear);assert.equal(h.context.selected,null);assert.match(h.get('matchday-selection').innerHTML,/현재 선발 중 체력이 낮은 3명/);unchanged(h,before);
});

test('kickoff and exhausted substitution limits show accurate explanations without calling engine mutation APIs',()=>{
 const kickoff=S.create(2014);F.begin(kickoff.match);const h=harness(kickoff),before=copy(kickoff);h.context.selectMatchdayPlayer('f1');onlyPaused(h,before);assert.match(h.get('matchday-selection').innerHTML,/첫 1분이 지난 뒤 교체/);assert.equal(kickoff.match.subs,0);
 const s=at(17);for(const [out,inside] of [['f1','f3'],['d1','d5'],['m1','m5']])F.swap(s.match,out,inside);s.match.paused=true;const capped=harness(s,{selected:'f3'}),saved=JSON.stringify(s);capped.render();assert.match(capped.get('matchday-selection').innerHTML,/교체 3회를 모두 사용/);unchanged(capped,saved);
});

test('player display names are escaped in both quick selection labels and the selected player card',()=>{
 const s=S.create(2015),name='<img src=x onerror="advance()"> & \'quoted\'';s.match.players.f1.name=name;const h=harness(s),before=JSON.stringify(s);h.render();assert.match(h.get('matchday-selection').innerHTML,/&lt;img src=x onerror=&quot;advance\(\)&quot;&gt; &amp; &#39;quoted&#39;/);assert.doesNotMatch(h.get('matchday-selection').innerHTML,/<img src=x/);
 h.context.selected='f1';h.render();assert.ok(h.get('matchday-selection').innerHTML.includes(escapeText(name)));assert.doesNotMatch(h.get('matchday-selection').innerHTML,/<img src=x/);unchanged(h,before);
});

test('tab keyboard arrows, Home and End activate the matching panel and preserve roving focus without advancing football',()=>{
 const s=at(59),h=harness(s);h.render();const before=copy(s);assert.equal(h.dispatch('matchday-tabs','keydown',h.get('matchday-tab-live'),{key:'ArrowRight'}),1);onlyPaused(h,before);assertTab(h,'analysis');assert.equal(h.document.activeElement,h.get('matchday-tab-analysis'));
 const paused=JSON.stringify(s);for(const [key,tab] of [['ArrowLeft','live'],['End','analysis'],['Home','live'],['ArrowLeft','analysis'],['ArrowRight','live']]){const target=h.get('matchday-tab-'+h.read('matchdayTab'));assert.equal(h.dispatch('matchday-tabs','keydown',target,{key}),1);assertTab(h,tab);assert.equal(h.document.activeElement,h.get('matchday-tab-'+tab));unchanged(h,paused);}
 const saves=h.calls.save;assert.equal(h.dispatch('matchday-tabs','keydown',h.get('matchday-tab-live'),{key:'Enter'}),0);assert.equal(h.calls.save,saves);unchanged(h,paused);
 const full=harness(at(90)),finished=JSON.stringify(full.context.season);full.render();full.get('matchday-tab-live').focus();full.dispatch('matchday-tabs','keydown',full.get('matchday-tab-live'),{key:'End'});assertTab(full,'live');assert.equal(full.document.activeElement,full.get('matchday-tab-live'));assert.equal(full.calls.save,0);unchanged(full,finished);
});

test('the accessible momentum chart shows six real windows and the active interval',()=>{
 const s=at(37),h=harness(s),before=JSON.stringify(s);h.render();const html=h.get('matchday-summary').innerHTML,d=Matchday.read(s);
 assert.match(html,/aria-label="15분 단위 경기 흐름"/);assert.match(html,/기회 · 슈팅 · 골 가중치/);assert.equal((html.match(/class="momentum-bars"/g)||[]).length,6);assert.equal((html.match(/aria-current="true"/g)||[]).length,1);assert.match(html,new RegExp('30분부터 45분, 우리 흐름 '+d.momentum.windows[2].own+', 상대 흐름 '+d.momentum.windows[2].opponent));assert.match(html,/우리 <i><\/i>상대/);unchanged(h,before);
});

test('a real analyst alert opens decision tools but never applies a suggested tactic automatically',()=>{
 const s=at(37);s.match.logs.push({minute:37,type:'goal',team:1,text:'상대 골'});s.match.score[1]++;const h=harness(s),before=copy(s);h.render();const html=h.get('matchday-summary').innerHTML;
 assert.match(html,/상대 흐름 차단/);assert.match(html,/data-matchday="analysis"/);assert.match(html,/전술 대응 보기/);h.dispatch('match-pane','click',h.element('', 'data-matchday="analysis"'));
 onlyPaused(h,before);assertTab(h,'analysis');assert.equal(s.match.tactic,before.match.tactic);assert.equal(h.calls.setTactic,0);assert.equal(h.calls.save,1);
});
test('suggested substitution opens the existing review flow and never swaps players on first tap',()=>{
 const s=at(23);for(const id of s.match.lineup)s.match.players[id].energy=80;s.match.players.f1.energy=25;s.match.players.f3.energy=95;const q=Matchday.read(s).substitution.suggestion,h=harness(s,{width:390}),before=copy(s);h.render();const suggestion=h.get('matchday-selection').querySelector('[data-matchday-player="'+q.out.id+'"]');assert.ok(suggestion);assert.match(h.get('matchday-selection').innerHTML,/코치 추천 교체/);assert.match(h.get('matchday-selection').innerHTML,new RegExp(escapeText(q.incoming.name)));h.dispatch('match-pane','click',suggestion);
 onlyPaused(h,before);assert.equal(h.context.selected,q.out.id);assert.equal(s.match.subs,0);assert.ok(s.match.lineup.includes(q.out.id));assert.ok(!s.match.lineup.includes(q.incoming.id));assert.match(h.get('matchday-selection').innerHTML,/교체 후보를 고르세요/);
});
test('yellow cards and dismissals identify players in substitution choices and the opponent report',()=>{
 const s=at(23),opponents=Opposition.read(s).lineup;s.match.discipline={version:1,events:[
  {minute:8,team:0,id:'f1',card:'yellow',reason:'foul'},
  {minute:17,team:0,id:'d1',card:'red',reason:'direct-red'},
  {minute:14,team:1,id:opponents[0].id,card:'yellow',reason:'foul'},
  {minute:21,team:1,id:opponents[1].id,card:'red',reason:'direct-red'}
 ]};
 const h=harness(s);h.render();let html=h.get('matchday-selection').innerHTML;
 assert.match(html,/🟨 경고 1/);assert.match(html,/퇴장한 선수는 교체할 수 없습니다/);
 const dismissed=h.get('matchday-selection').querySelector('[data-matchday-player="d1"]');assert.ok(dismissed);assert.equal(dismissed.disabled,true);
 h.context.selected='f1';h.render();assert.match(h.get('matchday-selection').innerHTML,new RegExp(escapeText(s.match.players.f1.name)));assert.match(h.get('matchday-selection').innerHTML,/🟨 경고 1/);
 const host=h.element('opposition-report');host.hidden=false;h.context.Opposition=Opposition;
 vm.runInContext(fs.readFileSync(path.join(__dirname,'dist','opposition-ui.js'),'utf8'),h.context,{filename:'opposition-ui.js'});
 h.context.renderOpponentReport();const report=host.innerHTML;
 assert.match(report,/🟨 경고 1/);assert.match(report,/🟥 퇴장/);assert.match(report,/opposition-dismissed/);
});
console.log('Validated '+groups+' matchday UI groups with actual campaign and football models.');
