'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),Movement=require('./dist/movement.js'),Opposition=require('./dist/opposition.js'),T=Movement.timing;
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function harness(){
 const season=S.create(20260930),env={time:0,effects:true,reduced:false},nodes=new Map(),listeners=new Map();
 function node(id){const classes=new Set(),value={id,dataset:{},style:{setProperty(key,value){this[key]=value;}},textContent:'',onclick:null,scrollIntoView(){},classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},contains(name){return classes.has(name);}}};nodes.set(id,value);return value;}
 for(const id of ['movement-controls','movement-preview','movement-label','pitch','players'])node(id);
 Object.defineProperty(nodes.get('movement-controls'),'innerHTML',{get(){return this.markup||'';},set(value){this.markup=value;nodes.get('movement-label').textContent='';}});
 for(const id of season.match.lineup)node('player-'+id);
 nodes.get('players').querySelector=selector=>nodes.get('player-'+(/data-player="([^"]+)"/.exec(selector)?.[1]))||null;
 const context=vm.createContext({F,S,Movement,Opposition,season,state:season.match,lastEvent:null,lastEventAt:0,view:'match',innerWidth:1000,document:{hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn)},performance:{now:()=>env.time},$:id=>nodes.get(id)||null,motionEnabled:()=>env.effects&&!env.reduced,positions:()=>Movement.frame({match:context.state,motion:false}).own.map(p=>({...p,p:context.state.players[p.id]}))});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/movement-ui.js'),'utf8'),context,{filename:'movement-ui.js'});
 const frame=ms=>{env.time=ms;return copy(context.motionFrame(ms));},snapshot=()=>copy(context.movementSnapshot());
 frame(0);context.renderMovementControls();
 return {context,env,nodes,frame,snapshot,preview(){nodes.get('movement-preview').onclick();},visibility(hidden,time){env.time=time;context.document.hidden=hidden;listeners.get('visibilitychange')?.();},tick(){return F.tick(context.state);}};
}
test('movement preview leaves the entire season, finances, RNG, scores and player skills unchanged',()=>{
 const h=harness(),before=copy(h.context.season);h.preview();assert.equal(h.snapshot().preview,true);
 const start=h.frame(80);for(let i=2;i<=100;i++)h.frame(i*80);const moved=h.snapshot().frame;
 assert.notDeepEqual(start.own,moved.own);assert.equal(h.context.state.phase,'prep');assert.equal(h.context.state.minute,0);assert.deepEqual(copy(h.context.season),before);
 h.context.cancelMovementPreview();assert.equal(h.snapshot().preview,false);assert.equal(h.frame(8080).phase,'static');assert.deepEqual(copy(h.context.season),before);
});
test('pausing freezes elapsed time, real event age and actor positions and preserves the real event',()=>{
 const h=harness();F.begin(h.context.state);h.frame(80);h.context.lastEvent={type:'goal',team:0,minute:12,scorerId:h.context.state.lineup.find(id=>h.context.state.players[id].pos==='FW')};h.frame(160);
 h.context.state.paused=true;const before=h.snapshot(),event=h.context.lastEvent;
 h.context.cancelMovementPreview();h.frame(4000);h.frame(12000);const after=h.snapshot();
 assert.equal(h.context.lastEvent,event);assert.equal(after.elapsedMs,before.elapsedMs);assert.equal(after.eventAgeMs,before.eventAgeMs);assert.deepEqual(after.frame,before.frame);assert.equal(h.context.movementShouldAnimate(),false);
 h.context.state.paused=false;h.frame(12016);assert.equal(h.snapshot().eventAgeMs,before.eventAgeMs+16);
});
test('hidden pages and other views do not accumulate display time',()=>{
 const h=harness();F.begin(h.context.state);h.frame(80);const before=h.snapshot();
 h.context.view='club';h.frame(4000);assert.equal(h.snapshot().elapsedMs,before.elapsedMs);assert.equal(h.context.movementShouldAnimate(),false);
 h.context.view='match';h.context.document.hidden=true;h.frame(9000);assert.equal(h.snapshot().elapsedMs,before.elapsedMs);assert.equal(h.context.movementShouldAnimate(),false);
 h.context.document.hidden=false;h.frame(9016);assert.equal(h.snapshot().elapsedMs,before.elapsedMs+16);
 const held=h.snapshot().elapsedMs;h.visibility(true,10000);h.visibility(false,30000);h.frame(30000);assert.equal(h.snapshot().elapsedMs,held);
});
test('turning effects off or reducing motion stops movement and restores static actors',()=>{
 const h=harness();F.begin(h.context.state);h.frame(80);const elapsed=h.snapshot().elapsedMs;
 h.env.effects=false;const off=h.frame(160);assert.equal(off.phase,'static');assert.equal(h.snapshot().elapsedMs,elapsed);assert.equal(h.context.movementShouldAnimate(),false);
 h.env.effects=true;h.env.reduced=true;assert.deepEqual(h.frame(240),off);assert.equal(h.snapshot().elapsedMs,elapsed);assert.equal(h.context.movementShouldAnimate(),false);
 h.env.reduced=false;h.frame(256);assert.equal(h.snapshot().elapsedMs,elapsed+16);assert.equal(h.context.movementShouldAnimate(),true);
});
test('a real full-time event animates briefly without changing the full-time model',()=>{
 const h=harness();F.begin(h.context.state);while(h.context.state.phase!=='full'){if(!F.running(h.context.state))F.begin(h.context.state);F.finishSegment(h.context.state);}
 const before=copy(h.context.season),scorer=h.context.state.lineup.find(id=>h.context.state.players[id].pos==='FW');h.context.lastEvent={type:'goal',team:0,minute:90,scorerId:scorer};h.frame(16);assert.equal(h.context.movementShouldAnimate(),true);
 for(let i=1;i<=60;i++)h.frame(16+i*80);assert.equal(h.snapshot().frame.phase,'goal');assert.deepEqual(copy(h.context.season),before);
 for(let i=61;i<=73;i++)h.frame(16+i*80);assert.equal(h.context.movementShouldAnimate(),false);assert.equal(h.snapshot().frame.phase,'static');assert.deepEqual(copy(h.context.season),before);
});
test('preview stops after twelve display seconds and effects off cancels preview immediately',()=>{
 const h=harness(),before=copy(h.context.season);h.preview();for(let i=1;i<=150;i++)h.frame(i*80);assert.equal(h.snapshot().preview,false);assert.equal(h.context.movementShouldAnimate(),false);assert.deepEqual(copy(h.context.season),before);
 h.preview();assert.equal(h.snapshot().preview,true);h.env.effects=false;h.frame(12080);assert.equal(h.snapshot().preview,false);assert.equal(h.snapshot().frame.phase,'static');assert.deepEqual(copy(h.context.season),before);
});
test('drawMotionActors places active own players and draws eleven opposing jerseys and a ball',()=>{
 const h=harness();F.begin(h.context.state);let numbers=0,arcs=0;const noop=()=>{},canvas=new Proxy({fillText(){numbers++;},arc(){arcs++;}},{get(target,key){return key in target?target[key]:noop;},set(target,key,value){target[key]=value;return true;}});
 h.env.time=80;h.context.drawMotionActors(canvas,500,600);assert.ok(numbers>=11&&numbers<=22);assert.ok(arcs>=2);
 for(const player of h.snapshot().frame.own){const style=h.nodes.get('player-'+player.id).style;assert.equal(style.left,'0px');assert.equal(style.top,'0px');assert.equal(style.transform,'translate('+500*player.x/100+'px,'+600*player.y/100+'px) translate(-50%,-16px)');assert.equal(style.marginLeft,'');assert.equal(style.marginTop,'');}
});
test('foot updates are scoped to cached leg elements and pause preserves the stride',()=>{
 const h=harness(),legs=new Map(),queries=new Map(),tilts=new Map(),noop=()=>{},canvas=new Proxy({},{get:()=>noop,set:()=>true});
 for(const id of h.context.state.lineup){const player=h.nodes.get('player-'+id),leg={style:{setProperty(key,value){this[key]=value;}}};legs.set(id,leg);player.querySelector=selector=>{assert.equal(selector,'.player-legs');queries.set(id,(queries.get(id)||0)+1);return leg;};player.style.setProperty=function(key,value){this[key]=value;if(key==='--keeper-tilt')tilts.set(id,(tilts.get(id)||0)+1);};}
 F.begin(h.context.state);h.env.time=80;h.context.drawMotionActors(canvas,500,600);const before=[...legs].map(([id,leg])=>[id,leg.style['--stride']]);
 h.env.time=96;h.context.drawMotionActors(canvas,500,600);h.context.state.paused=true;h.env.time=2000;h.context.drawMotionActors(canvas,500,600);
 assert.deepEqual([...legs].map(([id,leg])=>[id,leg.style['--stride']]),before);for(const id of h.context.state.lineup){assert.equal(queries.get(id),1);assert.equal(tilts.get(id),1);assert.equal(h.nodes.get('player-'+id).style['--stride'],undefined);}
});

test('a different match seed resets the display clock and removes an old preview',()=>{
 const h=harness();h.preview();h.frame(80);h.frame(160);h.context.state=F.create(909);h.context.lastEvent=null;const next=h.frame(240);
 assert.equal(h.snapshot().preview,false);assert.equal(h.snapshot().elapsedMs,0);assert.equal(h.snapshot().eventAgeMs,null);assert.equal(next.phase,'static');assert.equal(h.context.movementShouldAnimate(),false);
});
test('slow frames finish the shared highlight clock without aging a newly found event early',()=>{
 const h=harness();F.begin(h.context.state);while(h.context.state.phase!=='full'){if(!F.running(h.context.state))F.begin(h.context.state);F.finishSegment(h.context.state);}
 const before=copy(h.context.season),scorer=h.context.state.lineup.find(id=>h.context.state.players[id].pos==='FW');h.context.lastEvent={type:'goal',team:0,minute:90,scorerId:scorer};h.frame(900);
 assert.equal(h.snapshot().eventAgeMs,0);assert.equal(h.snapshot().frame.phase,'turnover');
 h.frame(1800);assert.equal(h.snapshot().eventAgeMs,900);h.frame(5400);assert.equal(h.snapshot().eventAgeMs,4500);assert.equal(h.snapshot().frame.phase,'goal');
 h.frame(7200);assert.equal(h.snapshot().eventAgeMs,6300);assert.equal(h.snapshot().frame.phase,'static');assert.equal(h.context.movementShouldAnimate(),false);assert.deepEqual(copy(h.context.season),before);
});
test('slow 900ms preview frames still stop after twelve wall-clock seconds and preserve the season',()=>{
 const h=harness(),before=copy(h.context.season);h.preview();for(let i=1;i<=13;i++)h.frame(i*900);assert.equal(h.snapshot().preview,true);
 h.frame(12600);assert.equal(h.snapshot().preview,false);assert.equal(h.snapshot().frame.phase,'static');assert.equal(h.context.movementShouldAnimate(),false);assert.deepEqual(copy(h.context.season),before);
});
test('moment cards wait for ball arrival and pause preserves the pending result',()=>{
 const h=harness();F.begin(h.context.state);const event={type:'goal',team:1,minute:7};h.context.lastEvent=event;let presented=0;h.context.pendingMatchMoment={event,moment:{kind:'concede'}};h.context.presentMoment=()=>presented++;
 h.frame(80);h.frame(780);assert.equal(presented,0);h.context.state.paused=true;h.frame(4000);assert.equal(presented,0);
 h.context.state.paused=false;h.frame(4016);h.frame(4016+T.impact);assert.equal(presented,1);assert.equal(h.context.pendingMatchMoment,null);h.frame(4096+T.impact);assert.equal(presented,1);
});
test('live commentary survives tick rendering and only announces a goal after arrival',()=>{
 const h=harness(),paragraph={textContent:''},minute={textContent:''};h.nodes.set('commentary',{querySelector:selector=>selector==='p'?paragraph:minute});F.begin(h.context.state);
 h.frame(80);assert.ok(paragraph.textContent.includes('전개'));paragraph.textContent='킥오프';h.frame(160);assert.notEqual(paragraph.textContent,'킥오프');
 h.context.lastEvent={type:'goal',team:1,minute:9};h.context.lastEventAt=240;h.frame(240);assert.ok(paragraph.textContent.includes('공을 확보'));assert.ok(!paragraph.textContent.includes('골입니다'));
 h.frame(1000);h.frame(240+T.impact);assert.ok(paragraph.textContent.includes('골!'));assert.ok(paragraph.textContent.includes(h.snapshot().frame.performerName.split(/\s+/).at(-1)));
});
test('paused five-minute highlights show the ball at its actual outcome instead of its shot origin',()=>{
 const h=harness();F.begin(h.context.state);h.context.state.paused=true;h.context.lastEventFast=true;
 h.context.lastEvent={type:'goal',team:1,minute:9};const goal=h.frame(80);assert.equal(goal.phase,'goal');assert.equal(goal.ball.y,96);
 h.context.lastEvent={type:'shot',team:1,minute:10};const save=h.frame(160);assert.equal(save.phase,'save');assert.equal(save.ball.y,82);assert.equal(save.carrierId,save.keeperId);
 assert.equal(h.context.state.paused,true);
});
test('automatic match clock waits for a paused highlight to finish instead of using elapsed wall time',()=>{
 const h=harness();F.begin(h.context.state);h.frame(80);h.context.lastEvent={type:'shot',team:1,minute:7};assert.equal(h.context.movementHighlightPending(),true);h.frame(160);h.frame(460);h.context.state.paused=true;h.frame(20000);assert.equal(h.context.movementHighlightPending(),true);h.context.state.paused=false;h.frame(20016);assert.equal(h.context.movementHighlightPending(),true);h.frame(20016+T.end);assert.equal(h.context.movementHighlightPending(),false);
 const app=fs.readFileSync(path.join(__dirname,'dist/app.js'),'utf8');assert.ok(app.includes('active&&motionEnabled()&&movementHighlightPending()'));
});
test('visible score waits for the actual ball arrival, survives pause and shows fast/reduced-motion results immediately',()=>{
 const h=harness();h.nodes.set('home-score',{textContent:''});h.nodes.set('away-score',{textContent:''});F.begin(h.context.state);h.context.state.score=[2,1];h.context.lastEvent={type:'goal',team:0,minute:12};h.frame(80);assert.equal(h.nodes.get('home-score').textContent,'1');assert.equal(h.nodes.get('away-score').textContent,'1');h.context.state.paused=true;h.frame(9000);assert.equal(h.nodes.get('home-score').textContent,'1');h.context.state.paused=false;h.frame(9016);h.frame(9016+T.impact);assert.equal(h.nodes.get('home-score').textContent,'2');h.context.lastEvent={type:'goal',team:1,minute:13};h.context.lastEventFast=true;h.context.state.score[1]=2;h.frame(15000);assert.equal(h.nodes.get('away-score').textContent,'2');h.context.lastEventFast=false;h.context.lastEvent={type:'goal',team:0,minute:14};h.context.state.score[0]=3;h.env.reduced=true;h.frame(15080);assert.equal(h.nodes.get('home-score').textContent,'3');assert.deepEqual(h.context.state.score,[3,2]);
});
test('playback speed changes presentation duration while pause and the fixed preview remain stable',()=>{const h=harness();F.begin(h.context.state);h.context.playbackPrefs={speed:'fast'};h.context.lastEvent={type:'shot',team:1,minute:12};h.frame(80);h.frame(180);assert.equal(h.snapshot().eventAgeMs,200);h.context.playbackPrefs.speed='slow';h.frame(280);assert.equal(h.snapshot().eventAgeMs,250);h.context.state.paused=true;h.frame(12000);assert.equal(h.snapshot().eventAgeMs,250);const preview=harness();preview.context.playbackPrefs={speed:'fast'};preview.preview();preview.frame(100);assert.equal(preview.snapshot().elapsedMs,80);assert.equal(preview.snapshot().preview,true);});

test('paused tactic changes hold actor positions until resume, then players find their new shape gradually',()=>{const h=harness();F.begin(h.context.state);h.frame(80);const old=h.snapshot().frame.own;h.context.state.paused=true;F.setTactic(h.context.state,'lowBlock');const held=h.frame(160);assert.deepEqual(held.own,old);assert.equal(held.phase,'shape-change');assert.deepEqual(h.frame(4000).own,old);const saved=JSON.stringify(h.context.state);h.context.state.paused=false;const first=h.frame(4016);assert.notDeepEqual(first.own,old);assert.equal(first.phase,'shape-change');for(let i=1;i<=9;i++)h.frame(4016+i*80);assert.notEqual(h.snapshot().frame.phase,'shape-change');h.context.state.paused=true;assert.equal(JSON.stringify(h.context.state),saved);});

console.log('Movement UI checks passed: '+groups+' groups.');
