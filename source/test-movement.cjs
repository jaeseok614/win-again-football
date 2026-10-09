'use strict';
const assert=require('node:assert/strict'),Movement=require('./dist/movement.js'),F=require('./dist/engine.js'),T=Movement.timing;
const copy=value=>JSON.parse(JSON.stringify(value));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function active(formation='442',tactic='balanced'){const match=F.create(20260930);F.setFormation(match,formation);F.setTactic(match,tactic);F.begin(match);return match;}
function bounds(value){
 assert.equal(value.own.length,11);assert.equal(value.opponent.length,11);
 for(const p of [...value.own,...value.opponent])for(const key of ['x','y'])assert.ok(Number.isFinite(p[key])&&p[key]>=10&&p[key]<=90,JSON.stringify(p));
 for(const p of [value.ball,...value.trail])for(const key of ['x','y'])assert.ok(Number.isFinite(p[key])&&p[key]>=4&&p[key]<=96,JSON.stringify(p));
 for(const team of [value.own,value.opponent])assert.equal(new Set(team.map(p=>p.id)).size,11);
}
test('all formations and tactics remain within pitch bounds over connected passing cycles',()=>{
 for(const formation of Object.keys(F.formations))for(const tactic of ['balanced','press','counter']){
  const match=active(formation,tactic);
  for(let ms=0;ms<42000;ms+=73)bounds(Movement.frame({match,elapsedMs:ms,motion:true}));
 }
});
test('frames preserve gameplay state, RNG, lineup and input coordinates',()=>{
 const match=active('433','counter'),before=copy(match),positions=Movement.frame({match,motion:false}).own.map(p=>({...p,p:match.players[p.id]})),beforePositions=copy(positions);
 for(let ms=0;ms<15000;ms+=127)Movement.frame({match,positions,elapsedMs:ms,event:{type:'goal',team:0,minute:21,scorerId:'f2'},eventAgeMs:ms%T.end,motion:true});
 assert.deepEqual(match,before);assert.deepEqual(positions,beforePositions);
});
test('frozen clocks produce an identical paused frame without resetting to the formation',()=>{
 const match=active();const before=Movement.frame({match,elapsedMs:4250,motion:true});match.paused=true;
 assert.deepEqual(Movement.frame({match,elapsedMs:4250,motion:true}),before);
 const event={type:'shot',team:1,minute:19};const a=Movement.frame({match,elapsedMs:4250,event,eventAgeMs:620,motion:true});
 assert.deepEqual(Movement.frame({match,elapsedMs:4250,event,eventAgeMs:620,motion:true}),a);
});
test('reduced motion shows a stable formation and no synthetic passing or shot movement',()=>{
 const match=active('352','press'),first=Movement.frame({match,elapsedMs:0,motion:false});
 for(const elapsedMs of [21,500,8999,50000])assert.deepEqual(Movement.frame({match,elapsedMs,event:{type:'goal',team:0,scorerId:'f2'},eventAgeMs:500,motion:false}),first);
 assert.deepEqual(first.ball,{x:50,y:50});assert.equal(first.trail.length,0);assert.equal(first.carrierId,null);
});
test('static match phases preserve their own labels without a real event',()=>{
 const match=active('433');
 for(const [phase,label] of Object.entries({prep:'경기 준비',half:'하프타임',late:'65분 작전 시간',full:'경기 종료'})){
  match.phase=phase;const a=Movement.frame({match,elapsedMs:10,motion:true}),b=Movement.frame({match,elapsedMs:7000,motion:true});assert.deepEqual(a,b);assert.equal(a.label,label);bounds(a);
 }
});
test('actual goal scorers and a substituted starting goalkeeper guide real event animation',()=>{
 const match=F.create(20260930);F.swap(match,'g1','g2');F.begin(match);
 const actualScorer=match.lineup.find(id=>match.players[id].pos==='FW'),goal={type:'goal',team:0,minute:42,scorerId:actualScorer,scorerIdentity:match.players[actualScorer].identity};
 const start=Movement.frame({match,elapsedMs:3500,event:goal,eventAgeMs:T.shot,motion:true});assert.equal(start.carrierId,actualScorer);assert.equal(start.scorerId,actualScorer);assert.equal(start.attributed,true);
 const end=Movement.frame({match,elapsedMs:3500,event:goal,eventAgeMs:T.impact,motion:true});assert.equal(end.phase,'goal');assert.equal(end.ball.y,4);
 const save=Movement.frame({match,elapsedMs:3500,event:{type:'shot',team:1,minute:19},eventAgeMs:T.impact,motion:true});assert.equal(save.phase,'save');assert.equal(save.keeperId,'g2');assert.equal(save.carrierId,'g2');assert.equal(save.ball.y,86);
});
test('a recorded cross travels from a named wide player to its striker before the shot',()=>{
 const match=F.create(3,{version:10});F.setFormation(match,'433');F.begin(match);let event;for(let minute=0;minute<90&&!event;minute++){const generated=F.tick(match).find(row=>row.action==='cross'&&!row.setPiece&&row.team===0&&row.type==='shot');if(generated)event=generated;if(match.phase==='half'||match.phase==='late')F.begin(match);}assert.ok(event,'the deterministic match contains an attacking cross');const opponentRoster=Array.from({length:11},(_,index)=>({id:'opp'+index,name:'상대 '+(index+1),pos:index===0?'GK':index<5?'DEF':index<8?'MID':'FW'})),origin=Movement.frame({match,elapsedMs:6200,opponentFormation:'433',opponentRoster,motion:true}),input={match,event,eventOrigin:origin,eventElapsedMs:6200,elapsedMs:6200,opponentFormation:'433',opponentRoster,motion:true},entry=Movement.frame({...input,eventAgeMs:0}),delivery=Movement.frame({...input,eventAgeMs:T.carry+350}),shot=Movement.frame({...input,eventAgeMs:T.shot+200});assert.deepEqual(entry.ball,origin.ball);assert.equal(delivery.phase,'cross');assert.equal(delivery.sourceId,event.sourceId);assert.equal(delivery.receiverId,event.actorId);assert.match(Movement.liveCommentary(delivery),new RegExp(match.players[event.sourceId].name));assert.match(Movement.liveCommentary(delivery),new RegExp(match.players[event.actorId].name));assert.equal(shot.phase,'shot');assert.equal(shot.scorerId,event.actorId);const commentary=Movement.commentary(event,match,opponentRoster,shot);assert.match(commentary,new RegExp(match.players[event.sourceId].name));assert.match(commentary,new RegExp(match.players[event.actorId].name));assert.match(commentary,/크로스/);const awayEvent={...event,team:1,sourceId:undefined,actorId:undefined,actorIndex:0},awayFrame=Movement.frame({...input,event:awayEvent,eventAgeMs:T.shot+200});assert.match(Movement.commentary(awayEvent,match,opponentRoster,awayFrame),/상대 \d+의 크로스!/);assert.notDeepEqual(delivery.ball,entry.ball);assert.deepEqual(match.logs.filter(row=>row.action).at(-1),event);
});
test('all actual engine event types are bounded for both teams and every animation age',()=>{
 for(const formation of Object.keys(F.formations))for(const tactic of ['press','balanced','counter']){
  const match=active(formation,tactic),scorerId=match.lineup.find(id=>match.players[id].pos==='FW');
  for(const type of ['goal','shot','chance'])for(const team of [0,1])for(const eventAgeMs of [0,1,T.win,T.secure,T.outlet,T.carry,T.delivery,T.shot,T.impact,T.hold,T.end-1,T.end,T.end+1000])bounds(Movement.frame({match,elapsedMs:3920,event:{type,team,minute:42,scorerId:team===0?scorerId:undefined},eventAgeMs,motion:true}));
 }
});
test('an actual stoppage-time goal still animates after the engine reaches its break',()=>{
 const match=active();match.phase='full';const event={type:'goal',team:0,minute:90,scorerId:match.lineup.find(id=>match.players[id].pos==='FW')};
 const shown=Movement.frame({match,event,eventAgeMs:T.impact,motion:true});assert.equal(shown.phase,'goal');assert.equal(shown.ball.y,4);
 const ended=Movement.frame({match,event,eventAgeMs:T.end,motion:true});assert.equal(ended.phase,'static');assert.equal(ended.label,'경기 종료');
});
test('passing labels never invent a goal, save or shot and visible players move meaningfully',()=>{
 const match=active('433','counter'),seen=new Set(),positions=new Map();let carried=0;
 for(let ms=0;ms<28000;ms+=50){const value=Movement.frame({match,elapsedMs:ms,motion:true});seen.add(value.label);assert.ok(!['goal','shot','save','saved'].includes(value.phase));if(value.carrierId)carried++;
  for(const p of value.own){if(!positions.has(p.id))positions.set(p.id,[]);positions.get(p.id).push(p);}
 }
 assert.ok(seen.has('역습 전개'));assert.ok(seen.has('수비가 공을 회수합니다'));assert.ok(carried>0);
 const mid=positions.get(match.lineup.find(id=>match.players[id].pos==='MID'));assert.ok(Math.max(...mid.map(p=>p.y))-Math.min(...mid.map(p=>p.y))>20);
});
test('continuous normal frames avoid teleports at every actual pass and cycle boundary',()=>{
 const match=active();for(let ms=Movement.passing.segment;ms<=Movement.passing.segment*24;ms+=Movement.passing.segment){
  const before=Movement.frame({match,elapsedMs:ms-.01,motion:true}),after=Movement.frame({match,elapsedMs:ms+.01,motion:true});assert.ok(Math.abs(before.ball.x-after.ball.x)<.05);assert.ok(Math.abs(before.ball.y-after.ball.y)<.05);
  for(let i=0;i<before.own.length;i++){assert.ok(Math.abs(before.own[i].x-after.own[i].x)<.05);assert.ok(Math.abs(before.own[i].y-after.own[i].y)<.05);}
 }
});

test('ordinary passes arrive briskly while striker-to-keeper shots have a longer visible flight',()=>{
 const match=active(),before=copy(match),air=[];for(let ms=0;ms<1200;ms+=16){const v=Movement.frame({match,elapsedMs:ms});if(v.carrierId===null)air.push(ms);}
 assert.ok(air.length>20);assert.ok(air.at(-1)-air[0]<900);
 for(const team of [0,1])for(const action of ['cross','cutback','through_ball','dribble','combination']){
  const event={type:'shot',team,action,minute:12,actorId:team===0?'f1':undefined},input={match,event,eventElapsedMs:6000,eventOrigin:Movement.frame({match,elapsedMs:6000})};
  const start=Movement.frame({...input,eventAgeMs:T.shot}),arrival=Movement.frame({...input,eventAgeMs:T.impact});let previous=start.ball;
  assert.ok(Math.abs(start.ball.y-arrival.ball.y)>=12,'the ball must visibly travel toward the goalkeeper');assert.ok(T.impact-T.shot>=1200);
  for(let age=T.shot+16;age<T.impact;age+=16){const v=Movement.frame({...input,eventAgeMs:age});assert.equal(v.phase,'shot');assert.ok(team===0?v.ball.y<previous.y:v.ball.y>previous.y);assert.notEqual(v.carrierId,v.keeperId);previous=v.ball;}
  const keeper=[...arrival.own,...arrival.opponent].find(p=>p.id===arrival.keeperId);assert.deepEqual(arrival.ball,{x:keeper.x,y:keeper.y});assert.equal(arrival.carrierId,keeper.id);
 }
 assert.deepEqual(match,before);
});

test('recovering players meet over the existing ball before possession changes for either side',()=>{
 const match=active(),before=copy(match);for(const team of [0,1]){
  const origin=Movement.frame({match,elapsedMs:team===0?4800:0}),event={type:'shot',team,action:'dribble',minute:12,actorId:team===0?'f1':undefined},input={match,event,eventOrigin:origin};
  assert.equal(origin.ownerTeam,1-team);assert.ok(origin.carrierId);
  const approaching=Movement.frame({...input,eventAgeMs:T.win-1}),won=Movement.frame({...input,eventAgeMs:T.win});assert.deepEqual(approaching.ball,origin.ball);assert.equal(approaching.ownerTeam,1-team);assert.equal(won.ownerTeam,team);
  const recoverer=[...won.own,...won.opponent].find(p=>p.id===won.recovererId),holder=[...won.own,...won.opponent].find(p=>p.id===origin.carrierId);assert.ok(Math.hypot(recoverer.x+1.3-origin.ball.x,recoverer.y+1.2-origin.ball.y)<.01);assert.ok(Math.hypot(holder.x-recoverer.x,holder.y-recoverer.y)<.01);
 }
 assert.deepEqual(match,before);
});

test('all attack paths, steals and restarts stay continuous at 60fps, including actual cycle boundaries',()=>{
 const match=active(),before=copy(match),origin=Movement.frame({match,elapsedMs:6000});let previous=Movement.frame({match,elapsedMs:0});
 for(let elapsedMs=16;elapsedMs<29000;elapsedMs+=16){const v=Movement.frame({match,elapsedMs});assert.ok(Math.hypot(v.ball.x-previous.ball.x,v.ball.y-previous.ball.y)<4,'normal pass/turnover cannot teleport');previous=v;}
 for(const team of [0,1])for(const type of ['goal','shot','chance'])for(const path of ['cross','cutback','through_ball','dribble','combination','corner','freeKick']){
  const event={type,team,minute:12,actorId:team===0?'f1':undefined,action:path,setPiece:['corner','freeKick'].includes(path)?path:undefined},input={match,event,eventOrigin:origin,eventElapsedMs:6000};previous=Movement.frame({...input,eventAgeMs:0,elapsedMs:6000});
  for(let age=16;age<T.end+32;age+=16){const v=Movement.frame({...input,eventAgeMs:age,elapsedMs:6000+age});assert.ok(Math.hypot(v.ball.x-previous.ball.x,v.ball.y-previous.ball.y)<4,JSON.stringify({team,type,path,age}));previous=v;}
 }
 assert.deepEqual(match,before);
});
test('missing or unrelated event metadata safely falls back to normal movement',()=>{
 const match=active(),normal=Movement.frame({match,elapsedMs:3700,motion:true});
 assert.deepEqual(Movement.frame({match,elapsedMs:3700,event:{type:'shot',team:1},eventAgeMs:Infinity,motion:true}),normal);
 for(const event of [null,{type:'sub',team:0},{type:'goal',team:9},{type:'break'},{type:'start'}])assert.deepEqual(Movement.frame({match,elapsedMs:3700,event,eventAgeMs:500,motion:true}),normal);
 const oldShot=Movement.frame({match,elapsedMs:3700,event:{type:'shot',team:0,minute:21,text:'알 수 없는 선수의 슈팅'},eventAgeMs:500,motion:true});assert.equal(oldShot.attributed,false);assert.equal(oldShot.scorerId,null);bounds(oldShot);
 assert.doesNotThrow(()=>Movement.frame());assert.doesNotThrow(()=>Movement.frame({match:{},elapsedMs:NaN,eventAgeMs:NaN}));
});

test('event entry retains the visible ball and ownership, wins possession before the shot and returns continuously',()=>{
 const match=active(),before=copy(match);
 for(const team of [0,1])for(const type of ['goal','shot','chance'])for(const elapsedMs of [0,2000,6000,9000,13000]){
  const origin=Movement.frame({match,elapsedMs,motion:true}),event={team,type,minute:12,scorerId:team===0?'f1':undefined};
  const input={match,event,eventOrigin:origin,eventElapsedMs:elapsedMs,motion:true};
  const entry=Movement.frame({...input,elapsedMs,eventAgeMs:0});assert.deepEqual(entry.ball,origin.ball);assert.equal(entry.ownerTeam,origin.ownerTeam);assert.equal(entry.carrierId,origin.carrierId);
  const ready=Movement.frame({...input,elapsedMs:elapsedMs+T.outlet,eventAgeMs:T.outlet});assert.equal(ready.ownerTeam,team);assert.equal(ready.phase,'carry');
  for(const boundary of Object.values(T)){
   const a=Movement.frame({...input,elapsedMs:elapsedMs+boundary-.01,eventAgeMs:boundary-.01}),b=Movement.frame({...input,elapsedMs:elapsedMs+boundary+.01,eventAgeMs:boundary+.01});
   assert.ok(Math.hypot(a.ball.x-b.ball.x,a.ball.y-b.ball.y)<.05,JSON.stringify({boundary,team,type,a:a.ball,b:b.ball}));
  }
 }
 assert.deepEqual(match,before);
});
test('goalkeepers cover the near post on both flanks for both teams without changing the event or match',()=>{const match=active(),before=copy(match);for(const team of [0,1])for(const x of [15,85]){const origin=Movement.frame({match,elapsedMs:4200,motion:true}),shooter=team===0?origin.own.find(p=>p.pos==='FW'):origin.opponent.filter(p=>p.pos==='FW')[0],keeper=(team===0?origin.opponent:origin.own).find(p=>p.pos==='GK');shooter.x=x;keeper.x=50;const frozen=copy(origin),event={type:'shot',team,minute:0,...(team===0?{scorerId:shooter.id}:{})},input={match,event,eventOrigin:origin,eventElapsedMs:4200,motion:true},entry=Movement.frame({...input,eventAgeMs:0}),ready=Movement.frame({...input,eventAgeMs:T.shot}),saved=Movement.frame({...input,eventAgeMs:T.impact});assert.equal((team===0?entry.opponent:entry.own).find(p=>p.pos==='GK').x,50);const readyKeeper=(team===0?ready.opponent:ready.own).find(p=>p.pos==='GK');assert.ok(x<50?readyKeeper.x<50:readyKeeper.x>50);assert.equal(saved.ball.x,x<50?43:57);assert.equal((team===0?saved.opponent:saved.own).find(p=>p.pos==='GK').x,saved.ball.x);bounds(saved);assert.deepEqual(origin,frozen);}assert.deepEqual(match,before);});
test('late wing runs advance beyond attacking teammates and successful defenders trail behind on both sides',()=>{const match=active(),before=copy(match);for(const team of [0,1])for(const side of ['left','right']){const origin=Movement.frame({match,elapsedMs:6200,motion:true}),people=team===0?origin.own:origin.opponent,shooter=people.find(p=>p.pos==='FW'),source=people.find(p=>p.pos==='MID'),event={type:'shot',team,minute:0,action:'cross',side,actorId:team===0?shooter.id:undefined,sourceId:source.id};const v=Movement.frame({match,event,eventOrigin:origin,eventElapsedMs:6200,elapsedMs:6200,eventAgeMs:T.carry-1,motion:true}),attackers=team===0?v.own:v.opponent,defenders=team===0?v.opponent:v.own,carrier=attackers.find(p=>p.id===v.carrierId),chaser=defenders.find(p=>p.id===v.duelId);assert.equal(v.phase,'wing-run');assert.ok(team===0?carrier.y<25:carrier.y>75);assert.ok(attackers.filter(p=>p.pos!=='GK'&&p.id!==carrier.id).every(p=>team===0?p.y>carrier.y:p.y<carrier.y));assert.ok(team===0?chaser.y>carrier.y:chaser.y<carrier.y);assert.ok(Math.abs(chaser.x-carrier.x)<4,'wing defender stays with the advancing winger');}assert.deepEqual(match,before);});

test('pressing spreads the side and raises its line while low block keeps a compact deep shape',()=>{
 const at=3600,balanced=Movement.frame({match:active('442','balanced'),elapsedMs:at}),press=Movement.frame({match:active('442','press'),elapsedMs:at}),block=Movement.frame({match:active('442','lowBlock'),elapsedMs:at});
 const metric=f=>{const out=f.own.filter(p=>p.pos!=='GK');return {width:Math.max(...out.map(p=>p.x))-Math.min(...out.map(p=>p.x)),depth:out.reduce((n,p)=>n+p.y,0)/out.length};};const b=metric(balanced),p=metric(press),l=metric(block);assert.ok(p.width>b.width&&b.width>l.width);assert.ok(p.depth<b.depth&&b.depth<l.depth);bounds(block);
});
test('a paused substitution keeps the recorded carrier visible until the scene finishes and then shows the replacement',()=>{
 const match=active();F.tick(match);const origin=Movement.frame({match,elapsedMs:6200}),old=match.lineup.find(id=>match.players[id].pos==='FW'),replacement=Object.keys(match.players).find(id=>!match.lineup.includes(id)&&match.players[id].pos==='FW'),event={type:'shot',team:0,minute:0,action:'dribble',actorId:old};match.paused=true;F.swap(match,old,replacement);const before=JSON.stringify(match),input={match,event,eventOrigin:origin,eventElapsedMs:6200};
 const run=Movement.frame({...input,eventAgeMs:T.delivery-50,elapsedMs:6200+T.delivery-50});assert.equal(run.carrierId,old);assert.ok(run.own.some(p=>p.id===old));assert.ok(!run.own.some(p=>p.id===replacement));assert.ok(match.lineup.includes(replacement));
 const end=Movement.frame({...input,eventAgeMs:T.end,elapsedMs:6200+T.end});assert.ok(end.own.some(p=>p.id===replacement));assert.ok(!end.own.some(p=>p.id===old));assert.equal(JSON.stringify(match),before);
});
test('ball touches separate from the carrier between strides and return to the feet before delivery',()=>{
 const match=active(),origin=Movement.frame({match,elapsedMs:6200}),actor=match.lineup.find(id=>match.players[id].pos==='FW'),event={type:'shot',team:0,minute:0,action:'dribble',actorId:actor},data={match,event,eventOrigin:origin,eventElapsedMs:6200};let maximum=0;
 for(let age=T.outlet;age<T.delivery;age+=25){const value=Movement.frame({...data,eventAgeMs:age,elapsedMs:6200+age}),player=value.own.find(p=>p.id===actor);assert.equal(value.carrierId,actor);maximum=Math.max(maximum,Math.abs(value.ball.y-player.y-1.2));}assert.ok(maximum>2);const end=Movement.frame({...data,eventAgeMs:T.delivery,elapsedMs:6200+T.delivery}),player=end.own.find(p=>p.id===actor);assert.ok(Math.abs(end.ball.y-player.y-1.2)<.01);
});

test('celebration is shown only after a recorded goal reaches the net and ends before restart',()=>{const match=active(),actor=match.lineup.find(id=>match.players[id].pos==='FW'),base={match,event:{type:'goal',team:0,minute:12,actorId:actor},eventElapsedMs:6200};const before=Movement.frame({...base,elapsedMs:6200,eventAgeMs:T.impact-1}),goal=Movement.frame({...base,elapsedMs:6200,eventAgeMs:T.impact+400}),restart=Movement.frame({...base,elapsedMs:6200,eventAgeMs:T.hold+1});assert.equal(before.celebrationLift,undefined);assert.ok(goal.celebrationLift>0&&goal.celebrantIds.includes(actor));assert.equal(restart.celebrationLift,undefined);const save=Movement.frame({...base,event:{...base.event,type:'shot'},elapsedMs:6200,eventAgeMs:T.impact+400});assert.equal(save.celebrationLift,undefined);});

test('recorded opponent attack and lead-protection plans change its visible line without changing the match',()=>{const examples=new Map();for(let seed=1;seed<=100&&examples.size<2;seed++){const match=F.create(seed);while(match.minute<76){if(!F.running(match))F.begin(match);F.tick(match);}const mode=F.opponentPlan(match);if(mode!=='balanced'&&!examples.has(mode))examples.set(mode,match);}assert.equal(examples.size,2);for(const [mode,match] of examples){const before=JSON.stringify(match),actual=Movement.frame({match,elapsedMs:6200}),neutral=Movement.frame({match:{...match,opponentPlans:[]},elapsedMs:6200}),metric=f=>{const rows=f.opponent.filter(p=>p.pos!=='GK');return {width:Math.max(...rows.map(p=>p.x))-Math.min(...rows.map(p=>p.x)),depth:rows.reduce((n,p)=>n+p.y,0)/rows.length};},a=metric(actual),b=metric(neutral);assert.ok(mode==='chase'?a.width>b.width&&a.depth>b.depth:a.width<b.width&&a.depth<b.depth);assert.equal(JSON.stringify(match),before);}});

test('recoveries hold the ball with the winning defender or keeper before an identifiable outlet pass',()=>{const match=active(),before=JSON.stringify(match);for(const team of [0,1])for(const type of ['shot','chance']){const event={type,team,action:'through_ball',side:'left',minute:20},input={match,event,eventElapsedMs:1700},held=Movement.frame({...input,elapsedMs:1700+T.hold+200,eventAgeMs:T.hold+200}),winner=[...held.own,...held.opponent].find(p=>p.id===held.carrierId);assert.equal(held.phase,'recovery');assert.ok(winner);assert.equal(held.ownerTeam,1-team);assert.equal(held.carrierId,type==='shot'?held.keeperId:held.duelId);assert.ok(Math.hypot(held.ball.x-winner.x,held.ball.y-winner.y)<2);const release=Movement.frame({...input,elapsedMs:1700+T.end-300,eventAgeMs:T.end-300});assert.equal(release.phase,'outlet');assert.equal(release.carrierId,null);assert.ok(release.sourceId&&release.receiverId);assert.equal(release.sourceId,held.carrierId);}assert.equal(JSON.stringify(match),before);});
test('a blocked free kick travels into a wall in front of the kicker before the defender secures it',()=>{const match=active();for(const team of [0,1]){const input={match,event:{type:'chance',team,setPiece:'freeKick',action:'combination',minute:12},elapsedMs:5000},kick=Movement.frame({...input,eventAgeMs:T.shot}),hit=Movement.frame({...input,eventAgeMs:T.impact}),mid=Movement.frame({...input,eventAgeMs:(T.shot+T.impact)/2});assert.equal(mid.phase,'shot');assert.ok(Math.abs(hit.ball.y-kick.ball.y)>=7);assert.equal(Math.sign(hit.ball.y-kick.ball.y),team===0?-1:1);assert.equal(hit.carrierId,hit.duelId);assert.equal(hit.ownerTeam,1-team);assert.match(hit.label,/수비벽/);}});
test('fast normal circulation slows visible contests and tackles without claiming an early recovery',()=>{const match=active(),start=3*Movement.passing.segment,contested=Movement.frame({match,elapsedMs:start+Movement.passing.segment*.65});assert.equal(contested.phase,'tackle');assert.equal(contested.carrierId,null);assert.match(Movement.liveCommentary(contested,true),/경합/);assert.doesNotMatch(Movement.liveCommentary(contested,true),/공을 확보/);for(const speed of ['fast','rapid']){assert.equal(Movement.playbackRate(speed,Infinity,'tackle'),1);assert.equal(Movement.playbackRate(speed,Infinity,'contest'),1);}assert.equal(Movement.playbackRate('rapid',Infinity,'build-up'),4);assert.equal(Movement.playbackRate('slow',Infinity,'tackle'),.5);});
console.log('Movement checks passed: '+groups+' groups.');
