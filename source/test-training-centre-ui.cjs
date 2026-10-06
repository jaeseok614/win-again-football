'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),Training=require('./dist/training.js'),PlayerDevelopment=require('./dist/development.js'),PlayerForm=require('./dist/player-form.js'),TrainingCentre=require('./dist/training-centre.js'),Portraits=require('./dist/portraits.js'),PlayerCharacter=require('./dist/character.js');
const copy=value=>JSON.parse(JSON.stringify(value));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
const escapeText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function finish(m){while(m.phase!=='full'){if(!F.running(m))F.begin(m);m.paused=false;F.finishSegment(m);}return m;}
function firstCup(seed=2111){let s=S.create(seed);while(s.competition!=='cup'){finish(s.match);s=S.settle(s);}return s;}
function setEnergy(s,id,energy){s.squad[id].energy=energy;s.match.players[id].energy=energy;s.match.players[id].initialEnergy=energy;}
function harness(season){
 const nodes=new Map(),calls={save:0,render:0,action:0,train:0,tick:0,begin:0,swap:0,setTactic:0,recruit:0,settle:0},errors=[],saved=[],trainedInputs=[];let context;
 const body={id:'body',isConnected:true},document={activeElement:body,getElementById:id=>nodes.get(id)||null};
 const dataKey=key=>key.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase());
 const voidTags=new Set(['input','br','hr','img','meta','link','area','base','embed','source','wbr']);
 function disconnect(node){node.isConnected=false;if(node.id&&nodes.get(node.id)===node)nodes.delete(node.id);if(document.activeElement===node)document.activeElement=body;for(const child of node.children)disconnect(child);}
 function element(tag='div',attrs='',parent=null){
  const attributes=Object.fromEntries([...attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([,key,value])=>[key,value??'']));
  const node={tagName:tag.toUpperCase(),id:attributes.id||'',parentElement:parent,attributes,dataset:{},children:[],isConnected:true,hidden:Object.hasOwn(attributes,'hidden'),disabled:Object.hasOwn(attributes,'disabled'),value:attributes.value||'',handlers:{},markup:'',setCount:0,selectionStart:0,selectionEnd:0};
  for(const [key,value] of Object.entries(attributes))if(key.startsWith('data-'))node.dataset[dataKey(key.slice(5))]=value;
  const classes=new Set((attributes.class||'').split(/\s+/).filter(Boolean));node.classList={add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name),toggle(name,on){const next=on??!classes.has(name);if(next)classes.add(name);else classes.delete(name);return next;}};
  node.setAttribute=(key,value)=>{node.attributes[key]=String(value);if(key==='disabled')node.disabled=true;};node.getAttribute=key=>Object.hasOwn(node.attributes,key)?node.attributes[key]:null;node.removeAttribute=key=>{delete node.attributes[key];if(key==='disabled')node.disabled=false;};
  node.matches=selector=>{
   if(selector.startsWith('#'))return node.id===selector.slice(1);if(selector.startsWith('.'))return classes.has(selector.slice(1));
   const attrs=[...selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];if(attrs.length)return attrs.every(([,key,value])=>Object.hasOwn(node.attributes,key)&&(value===undefined||node.attributes[key]===value));
   return selector.toUpperCase()===node.tagName;
  };
  node.closest=selector=>node.matches(selector)?node:parent?.closest(selector)||null;
  node.contains=other=>{while(other){if(other===node)return true;other=other.parentElement;}return false;};
  node.querySelectorAll=selector=>{const result=[];const visit=n=>{for(const child of n.children){if(child.isConnected&&child.matches(selector))result.push(child);visit(child);}};visit(node);return result;};node.querySelector=selector=>node.querySelectorAll(selector)[0]||null;
  node.focus=options=>{if(node.disabled||!node.isConnected)return;document.activeElement=node;node.focusOptions=options;};node.setSelectionRange=(start,end)=>{node.selectionStart=start;node.selectionEnd=end;};node.scrollIntoView=options=>{node.scrollOptions=options;};
  node.addEventListener=(type,fn)=>(node.handlers[type]??=[]).push(fn);
  Object.defineProperty(node,'innerHTML',{get(){return node.markup;},set(html){
   for(const child of node.children)disconnect(child);node.children=[];node.markup=html;node.setCount++;
   const stack=[node];for(const token of html.matchAll(/<\/?([a-z][a-z0-9-]*)\b([^>]*)>/gi)){
    const [whole,tag,attrs]=token;if(whole.startsWith('</')){if(stack.length>1){const ended=stack.pop();ended.markup=html.slice(ended.contentStart,token.index);}continue;}
    const p=stack.at(-1),child=element(tag,attrs,p);p.children.push(child);child.contentStart=token.index+whole.length;
    if(!voidTags.has(tag.toLowerCase())&&!whole.endsWith('/>'))stack.push(child);
   }
   for(const select of node.querySelectorAll('select')){const options=select.querySelectorAll('option'),chosen=options.find(option=>Object.hasOwn(option.attributes,'selected'))||options[0];if(chosen)select.value=chosen.value;}
  }});
  if(node.id)nodes.set(node.id,node);return node;
 }
 const panel=element('section','id="individual-training"');document.querySelectorAll=selector=>panel.querySelectorAll(selector);document.querySelector=selector=>panel.querySelector(selector);context=vm.createContext({document,innerWidth:1280});
 for(const name of ['character-ui','development-ui','training-ui'])vm.runInContext(fs.readFileSync(path.join(__dirname,'dist',name+'.js'),'utf8'),context,{filename:name+'.js'});
 const deny=key=>(()=>{calls[key]++;throw Error('Unexpected gameplay action '+key);});
 Object.assign(context,{season,state:season.match,view:'squad',F:{...F,tick:deny('tick'),begin:deny('begin'),swap:deny('swap'),setTactic:deny('setTactic')},S:{...S,recruit:deny('recruit'),settle:deny('settle')},Training:{...Training,train(...args){calls.train++;trainedInputs.push(args.slice(1));return Training.train(...args);}},TrainingCentre,PlayerDevelopment,PlayerForm,Portraits,PlayerCharacter,$:id=>nodes.get(id)||null,playerUiText:escapeText,escapeText,loadEnergy:p=>context.state?.players[p.id]?.energy??p.energy,save(){calls.save++;saved.push(JSON.stringify(context.season));},render(){calls.render++;context.renderIndividualTraining();},setView(view){context.view=view;context.save();context.render();},action(fn){calls.action++;try{fn();context.save();context.render();}catch(error){errors.push(error.message);}}});
 return {context,document,nodes,panel,calls,errors,saved,trainedInputs,get:id=>nodes.get(id)||null,read:expression=>vm.runInContext(expression,context),render:()=>context.renderIndividualTraining(),find:selector=>panel.querySelector(selector),findAll:selector=>panel.querySelectorAll(selector),dispatch(node,type,extra={}){assert.ok(node,'The UI event target must exist.');let prevented=0,stopped=false;const route=[];for(let current=node;current;current=current.parentElement)route.push(current);const event={target:node,currentTarget:node,preventDefault(){prevented++;},stopPropagation(){stopped=true;},...extra};for(const current of route){event.currentTarget=current;current['on'+type]?.(event);for(const fn of current.handlers[type]||[])fn(event);if(stopped)break;}return prevented;}};
}
function unchanged(h,before){assert.equal(JSON.stringify(h.context.season),before);assert.equal(h.calls.train,0);noGameActions(h);}
function noGameActions(h){for(const key of ['tick','begin','swap','setTactic','recruit','settle'])assert.equal(h.calls[key],0,key+' must not run during training-centre navigation');}

function selected(h){return h.read('individualTrainingSlot');}
function focus(h){return h.read('individualTrainingFocus');}
function setup(h,slot,trainingFocus='technique'){h.read('individualTrainingSlot='+JSON.stringify(slot)+';individualTrainingFocus='+JSON.stringify(trainingFocus));h.render();}
function rosterSlots(h){return h.findAll('[data-training-slot]').map(button=>button.dataset.trainingSlot);}
function assertRoster(h){const d=TrainingCentre.read(h.context.season,h.read('trainingCentreFilters'));assert.deepEqual(rosterSlots(h),d.players.map(p=>p.slot));assert.equal(h.get('training-roster-count').textContent,d.totalMatched+' / '+d.summary.total+'명 · 주요 능력 / 성장 한계');}

test('the new centre loads before app globals and renders a deeply frozen squad with four actual programs',()=>{
 const s=freeze(S.create(2112)),h=harness(s),before=JSON.stringify(s);h.render();assert.equal(rosterSlots(h).length,18);assertRoster(h);assert.deepEqual(h.findAll('[data-training-focus]').map(p=>p.dataset.trainingFocus),Object.keys(Training.choices));assert.ok(s.squad[selected(h)]);assert.equal(h.find('[data-player-detail]').dataset.playerDetail,s.squad[selected(h)].identity);assert.equal(h.get('individual-training-player').value,selected(h));assert.equal(h.calls.save,0);unchanged(h,before);
 const markup=h.panel.innerHTML;h.context.view='match';h.render();assert.equal(h.panel.innerHTML,markup);unchanged(h,before);
});

test('player selection changes only the UI, exposes unavailable reasons and keeps a valid identity and focus target',()=>{
 const s=S.create(2113);s.squad.f3.injury={remaining:1,kind:'knock',since:1};s.match.players.f3.injuryRemaining=1;const h=harness(s),before=JSON.stringify(s);h.render();const button=h.find('[data-training-slot="f3"]');assert.equal(button.disabled,false);h.dispatch(button,'click');assert.equal(selected(h),'f3');assert.equal(h.get('train-individual').disabled,true);assert.match(h.find('.individual-training-reason').innerHTML,/부상/);assert.equal(h.find('[data-player-detail]').dataset.playerDetail,'f3');assert.equal(h.document.activeElement,h.get('training-selected-name'));assert.deepEqual(copy(h.document.activeElement.focusOptions),{preventScroll:true});assert.equal(h.calls.save,1);unchanged(h,before);
 const select=h.get('individual-training-player');select.value='g2';h.dispatch(select,'change');assert.equal(selected(h),'g2');assert.equal(h.get('individual-training-player').value,'g2');unchanged(h,before);
 const saves=h.calls.save;h.context.chooseTrainingPlayer('missing');h.context.chooseTrainingPlayer('f1','wrong-identity');assert.equal(selected(h),'g2');assert.equal(h.calls.save,saves);unchanged(h,before);
});

test('all four program cards and the compatible select update previews without executing a training session',()=>{
 const s=S.create(2114),h=harness(s),before=JSON.stringify(s);setup(h,'f3');
 for(const program of Object.keys(Training.choices)){h.dispatch(h.find('[data-training-focus="'+program+'"]'),'click');assert.equal(focus(h),program);assert.equal(h.document.activeElement,h.find('[data-training-focus="'+program+'"]'));assert.equal(h.get('individual-training-focus').value,program);for(const card of h.findAll('[data-training-focus]'))assert.equal(card.getAttribute('aria-pressed'),String(card.dataset.trainingFocus===program));const q=Training.preview(s,'f3',program,'f3');assert.equal(h.get('train-individual').disabled,!q.available);unchanged(h,before);}
 const select=h.get('individual-training-focus');select.value='fitness';h.dispatch(select,'change');assert.equal(focus(h),'fitness');const saves=h.calls.save;h.context.chooseTrainingFocus('magic');assert.equal(h.calls.save,saves);unchanged(h,before);
});

test('search filtering preserves the input node, caret, focus and selected profile while only rebuilding the roster',()=>{
 const s=freeze(S.create(2115)),h=harness(s),before=JSON.stringify(s);setup(h,'f3');const search=h.get('training-search'),heading=h.get('training-selected-name'),program=h.find('[data-training-focus="technique"]');search.focus();
 for(const query of ['손',' 손  ','no matching player','']){search.value=query;search.setSelectionRange(query.length,query.length);const caret=search.selectionStart;h.dispatch(search,'input');assert.equal(h.get('training-search'),search);assert.equal(search.isConnected,true);assert.equal(h.document.activeElement,search);assert.equal(search.selectionStart,caret);assert.equal(search.value,query);assert.equal(h.get('training-selected-name'),heading);assert.equal(h.find('[data-training-focus="technique"]'),program);assert.equal(selected(h),'f3');assertRoster(h);unchanged(h,before);}
 assert.equal(h.calls.save,0);
});

test('position and sort filters use the real centre model without replacing form controls or changing the selected player',()=>{
 const s=freeze(S.create(2116)),h=harness(s),before=JSON.stringify(s);setup(h,'f3');const search=h.get('training-search'),sort=h.get('training-sort'),heading=h.get('training-selected-name');
 for(const position of ['GK','DEF','MID','FW','all']){const button=h.find('[data-training-position="'+position+'"]');button.focus();h.dispatch(button,'click');assert.equal(h.read('trainingCentreFilters.position'),position);assert.equal(h.document.activeElement,button);assertRoster(h);for(const filter of h.findAll('[data-training-position]'))assert.equal(filter.getAttribute('aria-pressed'),String(filter.dataset.trainingPosition===position));assert.equal(selected(h),'f3');unchanged(h,before);}
 for(const order of ['potential','minutes','recommended']){sort.value=order;sort.focus();h.dispatch(sort,'change');assert.equal(h.read('trainingCentreFilters.sort'),order);assertRoster(h);assert.equal(h.document.activeElement,sort);assert.equal(h.get('training-search'),search);assert.equal(h.get('training-selected-name'),heading);unchanged(h,before);}assert.equal(h.calls.save,0);
});

test('explicit execution applies each real program to the selected identity once and preserves other players, match RNG and club records',()=>{
 for(const program of Object.keys(Training.choices)){
  const s=S.create(2117);setEnergy(s,'f3',50);const h=harness(s);setup(h,'f3',program);const before=copy(s),q=Training.preview(s,'f3',program,'f3');assert.equal(h.get('train-individual').disabled,false);h.dispatch(h.get('train-individual'),'click');
  assert.equal(h.calls.train,1);assert.deepEqual(h.trainedInputs,[['f3',program,'f3']]);assert.equal(h.calls.action,1);assert.equal(h.calls.save,1);assert.equal(h.errors.length,0);assert.equal(s.trained,program);assert.equal(s.squad.f3[q.key],q.after);assert.equal(s.squad.f3.energy,q.energyAfter);assert.equal(s.match.players.f3[q.key],q.after);assert.equal(s.match.players.f3.initialEnergy,q.energyAfter);
  const expected=copy(before);expected.staff.trainingWeek=(s.year-1)*14+s.round;expected.trained=program;expected.squad.f3[q.key]=q.after;expected.squad.f3.energy=q.energyAfter;expected.match.players.f3[q.key]=q.after;expected.match.players.f3.energy=q.energyAfter;expected.match.players.f3.initialEnergy=q.energyAfter;assert.deepEqual(s,expected);assert.deepEqual(S.restore(copy(s)),s);noGameActions(h);
  assert.equal(h.get('train-individual').disabled,true);assert.match(h.find('.individual-training-note').innerHTML,/이번 주 훈련 완료/);assert.equal(h.document.activeElement,h.find('.individual-training-note'));
 }
});

test('the shared weekly action disables individual execution after either a team session or a completed personal session',()=>{
 const a=S.create(2118),h=harness(a);setup(h,'f3');h.dispatch(h.get('train-individual'),'click');const done=JSON.stringify(a);assert.throws(()=>S.train(a,'recovery'));h.context.chooseTrainingPlayer('f2');assert.equal(h.get('train-individual').disabled,true);h.get('train-individual').onclick();assert.equal(h.errors.length,1);assert.match(h.errors[0],/이번 주/);assert.equal(JSON.stringify(a),done);noGameActions(h);
 const b=S.create(2119);S.train(b,'fitness');const team=harness(b),before=JSON.stringify(b);setup(team,'f3','recovery');assert.equal(team.get('train-individual').disabled,true);assert.match(team.find('.individual-training-reason').innerHTML,/이번 주/);team.get('train-individual').onclick();assert.equal(team.errors.length,1);assert.equal(JSON.stringify(b),before);noGameActions(team);
});

test('stale execution buttons reject a different selected slot or a newly registered identity before changing any player',()=>{
 const a=S.create(2120),h=harness(a);setup(h,'f3');const old=h.get('train-individual');h.context.chooseTrainingPlayer('f2');const before=JSON.stringify(a),saves=h.calls.save;old.onclick();assert.equal(h.errors.length,1);assert.match(h.errors[0],/훈련 선수가 바뀌었습니다/);assert.equal(h.calls.train,0);assert.equal(h.calls.save,saves);unchanged(h,before);
 const replaced=harness(S.create(2121));setup(replaced,'f3');const stale=replaced.get('train-individual'),incoming=S.recruit(replaced.context.season,'t_f2','f3');replaced.context.season=incoming;replaced.context.state=incoming.match;const saved=JSON.stringify(incoming);stale.onclick();assert.equal(replaced.errors.length,1);assert.match(replaced.errors[0],/선수가 바뀌었습니다/);assert.equal(replaced.calls.train,1);assert.deepEqual(replaced.trainedInputs,[['f3','technique','f3']]);assert.equal(replaced.calls.save,0);assert.equal(JSON.stringify(incoming),saved);noGameActions(replaced);
});

test('running, halftime, full-time, Cup, injury, exhaustion and growth ceilings show the actual disabled reason and reject forced execution',()=>{
 const states=[];const running=S.create(2122);F.begin(running.match);states.push([running,'technique',/시작 전에/]);const half=S.create(2123);F.begin(half.match);F.finishSegment(half.match);states.push([half,'technique',/시작 전에/]);const full=S.create(2124);finish(full.match);states.push([full,'technique',/시작 전에/]);states.push([firstCup(2125),'recovery',/컵/]);
 const injured=S.create(2126);injured.squad.f3.injury={remaining:1,kind:'knock',since:1};injured.match.players.f3.injuryRemaining=1;states.push([injured,'technique',/부상/]);const tired=S.create(2127);setEnergy(tired,'f3',5);states.push([tired,'technique',/체력이 부족/]);
 for(const [program,key,cap] of [['technique','attack',null],['pace','speed',99],['fitness','endurance',99],['recovery','energy',100]]){const s=S.create(2128);s.squad.f3[key]=cap??s.squad.f3.potential;s.match.players.f3[key]=s.squad.f3[key];if(key==='energy')s.match.players.f3.initialEnergy=100;states.push([s,program,program==='recovery'?/가득/:/성장 한계/]);}
 for(const [s,program,reason] of states){const h=harness(s),before=JSON.stringify(s);setup(h,'f3',program);assert.equal(h.get('train-individual').disabled,true);assert.match(h.find('.individual-training-reason').innerHTML,reason);h.get('train-individual').onclick();assert.equal(h.errors.length,1);assert.match(h.errors[0],reason);assert.equal(JSON.stringify(s),before);assert.equal(h.calls.save,0);noGameActions(h);}
});

test('coach recommendation selects the actual current program but ignores an old identity or a now unavailable week',()=>{
 const s=S.create(2129),h=harness(s),before=JSON.stringify(s);setup(h,'f1','pace');const recommend=h.find('[data-development-focus]');assert.equal(recommend.dataset.developmentFocus,PlayerDevelopment.analyze(s,'f1').recommendation.focus);h.dispatch(recommend,'click');assert.equal(focus(h),'recovery');assert.equal(h.calls.save,1);assert.equal(h.document.activeElement,h.find('[data-training-focus="recovery"]'));unchanged(h,before);
 const old=h.find('[data-development-focus]'),next=S.recruit(s,'t_f2','f1');h.context.season=next;h.context.state=next.match;h.render();const saved=JSON.stringify(next),saves=h.calls.save,current=focus(h);h.dispatch(old,'click');assert.equal(focus(h),current);assert.equal(h.calls.save,saves);unchanged(h,saved);
 const weekly=harness(S.create(2130));setup(weekly,'f3','pace');const stale=weekly.find('[data-development-focus]');S.train(weekly.context.season,'recovery');const done=JSON.stringify(weekly.context.season);weekly.dispatch(stale,'click');assert.equal(focus(weekly),'pace');assert.equal(weekly.calls.save,0);unchanged(weekly,done);
});

test('going to match preparation changes view only and never kicks off or settles the current fixture',()=>{
 const s=S.create(2131),h=harness(s),before=JSON.stringify(s);setup(h,'f3');h.dispatch(h.find('[data-training-match]'),'click');assert.equal(h.context.view,'match');assert.equal(s.match.phase,'prep');assert.equal(s.match.minute,0);assert.equal(h.calls.save,1);unchanged(h,before);
 let completed=S.create(2132);while(completed.match){finish(completed.match);completed=S.settle(completed);}const end=harness(completed),saved=JSON.stringify(completed);setup(end,'f3');const disabled=end.find('[data-training-match]');assert.equal(disabled.disabled,true);end.dispatch(disabled,'click');assert.equal(end.context.view,'squad');assert.equal(end.calls.save,0);unchanged(end,saved);
});

test('current player names and initial search values remain escaped inside profile, roster labels and input markup',()=>{
 const s=S.create(2133),name='<img src=x onerror="train()"> & \'name\'';s.squad.f3.name=name;s.match.players.f3.name=name;const h=harness(s),before=JSON.stringify(s);h.read('trainingCentreFilters.query='+JSON.stringify('"><script>train()</script>'));setup(h,'f3');assert.ok(h.panel.innerHTML.includes(escapeText(name)));assert.doesNotMatch(h.panel.innerHTML,/<img src=x|<script>train/);assert.ok(h.panel.innerHTML.includes(escapeText('"><script>train()</script>')));
 h.read('trainingCentreFilters.query=""');h.context.renderTrainingRoster();const row=h.find('[data-training-slot="f3"]');assert.ok(row.getAttribute('aria-label').includes(escapeText(name)));assert.doesNotMatch(row.innerHTML,/<img src=x/);unchanged(h,before);
});

test('training report and roster show only confirmed recent results, minutes, goals and assists',()=>{
 let s=S.create(2134);for(let i=0;i<2;i++){finish(s.match);s=S.settle(s);}const player=s.squad.f1,report=PlayerForm.read(s,player.identity),before=JSON.stringify(s),h=harness(s);setup(h,'f1');assert.ok(h.panel.innerHTML.includes('최근 경기 폼'));assert.ok(h.panel.innerHTML.includes('확정된 출전 기록 · 최신순'));assert.ok(h.panel.innerHTML.includes('선수 평점을 만들어내지 않고'));assert.ok(h.panel.innerHTML.includes('최근 '+report.appearances+'회 출전'));assert.ok(h.panel.innerHTML.includes(report.matches[0].opponent));assert.ok(h.find('[data-training-slot="f1"]').innerHTML.includes('최근 경기 · 최신순'));assert.ok(h.find('[data-training-slot="f1"]').innerHTML.includes('form-'+report.matches[0].outcome));assert.equal(JSON.stringify(s),before);
 finish(s.match);const pending=JSON.stringify(s),nextHarness=harness(s);setup(nextHarness,'f1');assert.equal(PlayerForm.read(s,player.identity).appearances,report.appearances);assert.equal(JSON.stringify(s),pending);
});

console.log('Validated '+groups+' training centre UI groups with actual training and campaign models.');
