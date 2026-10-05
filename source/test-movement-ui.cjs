'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),Movement=require('./dist/movement.js'),Opposition=require('./dist/opposition.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function harness(){
 const season=S.create(20260930),env={time:0,effects:true,reduced:false},nodes=new Map(),listeners=new Map();
 function node(id){const classes=new Set(),value={id,dataset:{},style:{},textContent:'',onclick:null,scrollIntoView(){},classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},contains(name){return classes.has(name);}}};nodes.set(id,value);return value;}
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
 for(let i=1;i<=20;i++)h.frame(16+i*80);assert.equal(h.snapshot().frame.phase,'goal');assert.deepEqual(copy(h.context.season),before);
 for(let i=21;i<=29;i++)h.frame(16+i*80);assert.equal(h.context.movementShouldAnimate(),false);assert.equal(h.snapshot().frame.phase,'static');assert.deepEqual(copy(h.context.season),before);
});
test('preview stops after twelve display seconds and effects off cancels preview immediately',()=>{
 const h=harness(),before=copy(h.context.season);h.preview();for(let i=1;i<=150;i++)h.frame(i*80);assert.equal(h.snapshot().preview,false);assert.equal(h.context.movementShouldAnimate(),false);assert.deepEqual(copy(h.context.season),before);
 h.preview();assert.equal(h.snapshot().preview,true);h.env.effects=false;h.frame(12080);assert.equal(h.snapshot().preview,false);assert.equal(h.snapshot().frame.phase,'static');assert.deepEqual(copy(h.context.season),before);
});
test('drawMotionActors places active own players and draws eleven opposing jerseys and a ball',()=>{
 const h=harness();F.begin(h.context.state);let numbers=0,arcs=0;const noop=()=>{},canvas=new Proxy({fillText(){numbers++;},arc(){arcs++;}},{get(target,key){return key in target?target[key]:noop;},set(target,key,value){target[key]=value;return true;}});
 h.env.time=80;h.context.drawMotionActors(canvas,500,600);assert.equal(numbers,22);assert.ok(arcs>=2);
 for(const player of h.snapshot().frame.own){const style=h.nodes.get('player-'+player.id).style;assert.equal(style.left,'0px');assert.equal(style.top,'0px');assert.equal(style.transform,'translate('+500*player.x/100+'px,'+600*player.y/100+'px) translate(-50%,-50%)');assert.equal(style.marginLeft,'');assert.equal(style.marginTop,'');}
});
test('a different match seed resets the display clock and removes an old preview',()=>{
 const h=harness();h.preview();h.frame(80);h.frame(160);h.context.state=F.create(909);h.context.lastEvent=null;const next=h.frame(240);
 assert.equal(h.snapshot().preview,false);assert.equal(h.snapshot().elapsedMs,0);assert.equal(h.snapshot().eventAgeMs,null);assert.equal(next.phase,'static');assert.equal(h.context.movementShouldAnimate(),false);
});
test('slow 900ms frames expire a real event after 2.2 seconds without aging a newly found event early',()=>{
 const h=harness();F.begin(h.context.state);while(h.context.state.phase!=='full'){if(!F.running(h.context.state))F.begin(h.context.state);F.finishSegment(h.context.state);}
 const before=copy(h.context.season),scorer=h.context.state.lineup.find(id=>h.context.state.players[id].pos==='FW');h.context.lastEvent={type:'goal',team:0,minute:90,scorerId:scorer};h.frame(900);
 assert.equal(h.snapshot().eventAgeMs,0);assert.equal(h.snapshot().frame.phase,'turnover');
 h.frame(1800);assert.equal(h.snapshot().eventAgeMs,900);h.frame(2700);assert.equal(h.snapshot().eventAgeMs,1800);assert.equal(h.snapshot().frame.phase,'goal');
 h.frame(3600);assert.equal(h.snapshot().eventAgeMs,2700);assert.equal(h.snapshot().frame.phase,'static');assert.equal(h.context.movementShouldAnimate(),false);assert.deepEqual(copy(h.context.season),before);
});
test('slow 900ms preview frames still stop after twelve wall-clock seconds and preserve the season',()=>{
 const h=harness(),before=copy(h.context.season);h.preview();for(let i=1;i<=13;i++)h.frame(i*900);assert.equal(h.snapshot().preview,true);
 h.frame(12600);assert.equal(h.snapshot().preview,false);assert.equal(h.snapshot().frame.phase,'static');assert.equal(h.context.movementShouldAnimate(),false);assert.deepEqual(copy(h.context.season),before);
});
test('moment cards wait for ball arrival and pause preserves the pending result',()=>{
 const h=harness();F.begin(h.context.state);const event={type:'goal',team:1,minute:7};h.context.lastEvent=event;let presented=0;h.context.pendingMatchMoment={event,moment:{kind:'concede'}};h.context.presentMoment=()=>presented++;
 h.frame(80);h.frame(780);assert.equal(presented,0);h.context.state.paused=true;h.frame(4000);assert.equal(presented,0);
 h.context.state.paused=false;h.frame(4016);h.frame(4800);assert.equal(presented,1);assert.equal(h.context.pendingMatchMoment,null);h.frame(4880);assert.equal(presented,1);
});
test('live commentary survives tick rendering and only announces a goal after arrival',()=>{
 const h=harness(),paragraph={textContent:''},minute={textContent:''};h.nodes.set('commentary',{querySelector:selector=>selector==='p'?paragraph:minute});F.begin(h.context.state);
 h.frame(80);assert.ok(paragraph.textContent.includes('전개'));paragraph.textContent='킥오프';h.frame(160);assert.notEqual(paragraph.textContent,'킥오프');
 h.context.lastEvent={type:'goal',team:1,minute:9};h.context.lastEventAt=240;h.frame(240);assert.ok(paragraph.textContent.includes('공을 회수'));assert.ok(!paragraph.textContent.includes('골입니다'));
 h.frame(1000);h.frame(1700);assert.ok(paragraph.textContent.includes('골망'));assert.ok(paragraph.textContent.includes(h.snapshot().frame.performerName));
});
test('paused five-minute highlights show the ball at its actual outcome instead of its shot origin',()=>{
 const h=harness();F.begin(h.context.state);h.context.state.paused=true;h.context.lastEventFast=true;
 h.context.lastEvent={type:'goal',team:1,minute:9};const goal=h.frame(80);assert.equal(goal.phase,'goal');assert.equal(goal.ball.y,96);
 h.context.lastEvent={type:'shot',team:1,minute:10};const save=h.frame(160);assert.equal(save.phase,'save');assert.equal(save.ball.y,86);assert.equal(save.carrierId,save.keeperId);
 assert.equal(h.context.state.paused,true);
});
test('automatic match clock waits for a paused highlight to finish instead of using elapsed wall time',()=>{
 const h=harness();F.begin(h.context.state);h.frame(80);h.context.lastEvent={type:'shot',team:1,minute:7};assert.equal(h.context.movementHighlightPending(),true);h.frame(160);h.frame(460);h.context.state.paused=true;h.frame(20000);assert.equal(h.context.movementHighlightPending(),true);h.context.state.paused=false;h.frame(20016);assert.equal(h.context.movementHighlightPending(),true);h.frame(22500);assert.equal(h.context.movementHighlightPending(),false);
 const app=fs.readFileSync(path.join(__dirname,'dist/app.js'),'utf8');assert.ok(app.includes('active&&motionEnabled()&&movementHighlightPending()'));
});
console.log('Movement UI checks passed: '+groups+' groups.');
