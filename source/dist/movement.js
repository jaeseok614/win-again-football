(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;else root.Movement=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 // Presentation only: this module reads a match and never advances its clock or RNG.
 // Pause preserves a frame when the caller freezes both elapsedMs and eventAgeMs.
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
 const lerp=(a,b,t)=>a+(b-a)*t;
 const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
 const mixPoint=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)});
 // One shared clock for the pitch, commentary, result card and match scheduler.
 const timing=Object.freeze({win:500,secure:850,outlet:1450,carry:2500,delivery:3200,shot:3700,impact:4250,hold:5050,end:5750});
 const engine=typeof module==='object'&&module.exports?require('./engine.js'):globalThis.Football;
 const bases=engine.formationPositions;
 const oppBase=[[50,12,'GK'],[16,31,'DEF'],[39,27,'DEF'],[61,27,'DEF'],[84,31,'DEF'],[16,54,'MID'],[39,51,'MID'],[61,51,'MID'],[84,54,'MID'],[37,78,'FW'],[63,78,'FW']];
 function ownBase(match,provided){
  const rows=Array.isArray(provided)?provided:null,counts={DEF:0,MID:0,FW:0},layout=bases[match?.formation]||bases['442'];
  const ids=rows||((match?.lineup||[]).map(id=>({id,p:match.players?.[id]})));
  return ids.filter(row=>row&&row.id).map(row=>{
   const p=row.p||match?.players?.[row.id]||{},pos=p.pos||row.pos||'MID',fallback=pos==='GK'?[50,88]:(layout[pos]?.[counts[pos]++]||[50,50]);
   return {id:row.id,name:p.name||row.name||'',no:p.no||row.no||0,pos:rows&&Number.isFinite(row.x)&&Number.isFinite(row.y)?engine.assignedPosition(row.x,row.y,pos).line:pos,x:clamp(finite(row.x,fallback[0]),10,90),y:clamp(finite(row.y,fallback[1]),10,90)};
  });
 }
 const role=(team,pos,index=0)=>{const people=team.filter(p=>p.pos===pos);return people[index%people.length]||team.find(p=>p.pos!=='GK')||team[0]||{id:null,x:50,y:50};};
 function widePlayer(team,side,excludeId=null){const edge=side==='left'?0:100,rank={MID:0,DEF:1,FW:2};return team.filter(p=>p.pos!=='GK'&&p.id!==excludeId).sort((a,b)=>(rank[a.pos]??3)-(rank[b.pos]??3)||Math.abs(a.x-edge)-Math.abs(b.x-edge)||a.id.localeCompare(b.id))[0]||role(team,'MID');}
 function buildRoute(team,side){const wide=widePlayer(team,side),forwards=team.filter(p=>p.pos==='FW'),wideForward=forwards.sort((a,b)=>Math.abs(a.x-(side==='left'?0:100))-Math.abs(b.x-(side==='left'?0:100)))[0]||role(team,'FW');return [role(team,'DEF',1),role(team,'MID',1),wide,wideForward,role(team,'FW',0)];}
 function frame(input={}){
  const match=input.match||{},own=ownBase(match,input.positions),layout=bases[input.opponentFormation],shape=layout?[[50,12,'GK'],...Object.entries(layout).flatMap(([pos,points])=>points.map(([x,y])=>[x,100-y,pos]))]:oppBase,opponent=shape.map(([x,y,pos],i)=>({id:'opp'+i,no:i+1,pos,x,y})).filter(p=>!input.dismissedOpponent?.includes(p.id));
  for(const player of opponent){const rosterPlayer=input.opponentRoster?.find(p=>p.id===player.id);player.name=rosterPlayer?.name||'';player.identity=rosterPlayer?.identity||player.id;}
  const result={own,opponent,ball:{x:50,y:50},trail:[],carrierId:null,receiverId:null,ownerTeam:null,phase:'static',label:{prep:'경기 준비',half:'하프타임',late:'65분 작전 시간',full:'경기 종료'}[match.phase]||'경기 준비',attributed:false};
  if(input.motion===false)return result;
  const running=['first','second','third'].includes(match.phase),time=Math.max(0,finite(input.elapsedMs)),event=input.event,age=Math.max(0,finite(input.eventAgeMs,Infinity));
  const cinematic=event&&['goal','shot','chance'].includes(event.type)&&[0,1].includes(event.team)&&age<timing.end;
  if(!running&&!cinematic)return result;
  if(running){
   // Keep possession with one side through a complete build-up. The route uses
   // an actual wide player before entering the box; it never invents a shot.
   const routeTime=event&&['goal','shot','chance'].includes(event.type)&&[0,1].includes(event.team)&&Number.isFinite(age)&&age>=timing.hold?((1-event.team)*9000+age-timing.hold):time;
   const cycleTime=routeTime%18000,cycle=cycleTime/18000,stage=Math.floor(cycleTime/2250),segmentLocal=(cycleTime%2250)/2250,attack=Math.sin(cycle*Math.PI*2),press=match.tactic==='press'?5:match.tactic==='counter'?-3:match.tactic==='lowBlock'?-7:0,width=match.tactic==='press'?1.13:match.tactic==='lowBlock'?.78:1;
   for(let i=0;i<own.length;i++){
    const p=own[i],amplitude={GK:1.5,DEF:7,MID:12,FW:8}[p.pos]||8,side=p.pos==='GK'?2:5;
    p.x=clamp(50+(p.x-50)*width+Math.sin(time/1900+i*.8)*side+attack*(p.x<50?2:-2),10,90);
    p.y=clamp(p.y-attack*amplitude-(p.pos==='GK'?0:press)+Math.cos(time/2300+i)*1.8,10,90);
    if(p.pos==='GK'){p.x=clamp(p.x,40,60);p.y=clamp(p.y,83,90);}
   }
   const opponentMode=engine.opponentPlan(match),opponentWidth=opponentMode==='chase'?1.1:opponentMode==='protect'?.82:1,opponentAdvance=opponentMode==='chase'?4:opponentMode==='protect'?-6:0;
   for(let i=0;i<opponent.length;i++){
    const p=opponent[i],amplitude={GK:1.5,DEF:7,MID:10,FW:6}[p.pos];
    p.x=clamp(50+(p.x-50)*opponentWidth+Math.sin(time/2100+i*.7+1)*4,10,90);
    p.y=clamp(p.y-attack*amplitude+Math.cos(time/2400+i)*1.6+(p.pos==='GK'?0:opponentAdvance),10,90);
    if(p.pos==='GK'){p.x=clamp(p.x,40,60);p.y=clamp(p.y,10,17);}
   }
   // Defenders close nearby forward lanes while retreating. Distance weights
   // avoid a visible jump when two opposing forwards cross a marking boundary.
   for(const [defence,attackers,pressure] of [[own,opponent,Math.max(0,-attack)],[opponent,own,Math.max(0,attack)]]){
    const forwards=attackers.filter(p=>p.pos==='FW');
    for(const p of defence.filter(p=>p.pos==='DEF')){
     let sum=0,lane=0;for(const forward of forwards){const weight=1/(100+(forward.x-p.x)**2);sum+=weight;lane+=forward.x*weight;}
     if(sum)p.x=clamp(lerp(p.x,lane/sum,pressure*.18),10,90);
    }
   }
   const side=Math.floor(routeTime/18000)%2===0?'left':'right',route=[...buildRoute(own,side).slice(0,4),...buildRoute(opponent,side).slice(0,4)],from=route[stage],to=route[(stage+1)%route.length],pass=smooth((segmentLocal-.17)/.66),a={x:from.x+1.3,y:from.y+1.2},b={x:to.x+1.3,y:to.y+1.2};
   result.ball=mixPoint(a,b,pass);result.receiverId=to.id;result.carrierId=segmentLocal<.17?from.id:segmentLocal>.83?to.id:null;
   result.ownerTeam=(segmentLocal>.83?to.id:from.id)?.startsWith('opp')?1:0;
   const turnover=stage%4===3,wide=stage%4===2;
   result.phase=turnover?'transition':wide?'wide':result.ownerTeam===0?'build-up':'defence';
   result.label=turnover?'수비 전환':result.ownerTeam===0?(match.tactic==='counter'&&wide?'역습 전개':stage%4===0?'후방 빌드업':stage%4===1?'중원 전진':'측면 전개'):(match.tactic==='press'?'전방 압박':wide?'측면 수비':'수비 대응');
   if(segmentLocal>.17&&segmentLocal<.83)result.trail=[.08,.16,.24].map(lag=>mixPoint(a,b,smooth((segmentLocal-.17-lag)/.66)));
  }
  if(cinematic){const frozen=input.eventOrigin||frame({...input,event:null,elapsedMs:input.eventElapsedMs??Math.max(0,time-age)});applyEvent(result,match,event,age,frozen);}
  return result;
 }
 function impactAge(event){return event?.type==='chance'&&event.setPiece!=='freeKick'?timing.delivery:timing.impact;}
 function applyEvent(result,match,event,age,frozen){
  const baseBall={...result.ball},baseOwn=result.own.map(p=>({...p})),baseOpp=result.opponent.map(p=>({...p}));
  // Finish the recorded scene with its original actors when a paused substitution
  // changes the live lineup. The engine has already saved the replacement.
  result.own=frozen.own.map(p=>({...p}));result.opponent=frozen.opponent.map(p=>({...p}));
  const team=event.team===0?frozen.own:frozen.opponent,defenders=event.team===0?frozen.opponent:frozen.own,people=event.team===0?result.own:result.opponent,opponents=event.team===0?result.opponent:result.own,direction=event.team===0?-1:1;
  const exact=event.team===0?team.find(p=>p.id===(event.actorId||event.scorerId)):null,named=event.team===0?team.find(p=>p.name&&String(event.text||'').includes(p.name)):null;
  const shooter=exact||named||role(team,'FW',Number.isInteger(event.actorIndex)?event.actorIndex:finite(event.minute)%2),keeper=role(defenders,'GK'),side=event.side|| (shooter.x<50?'left':'right'),wide=['cross','cutback'].includes(event.action),dribble=event.action==='dribble',corner=event.setPiece==='corner',freeKick=event.setPiece==='freeKick';
  const source=dribble||freeKick?shooter:team.find(p=>p.id===(event.sourceId||event.assistId))||widePlayer(team,side,shooter.id),origin={...frozen.ball},lost=frozen.ownerTeam!==event.team;
  const recoverer=team.filter(p=>p.pos!=='GK'&&p.id!==source.id&&p.id!==shooter.id).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y))[0]||source;
  const receive={x:wide?(side==='left'?13:87):clamp(source.x,25,75),y:event.team===0?Math.max(source.y,48):Math.min(source.y,52)};
  const carryEnd={x:wide?(side==='left'?11:89):clamp(receive.x+(receive.x<50?9:-9),22,78),y:event.team===0?(wide?19:dribble?23:37):(wide?81:dribble?77:63)};
  const strike={x:freeKick?clamp(shooter.x,32,68):dribble?carryEnd.x:clamp(shooter.x,38,62),y:freeKick?(event.team===0?31:69):dribble?carryEnd.y:event.team===0?23:77};
  const cornerSpot={x:side==='left'?10:90,y:event.team===0?10:90};
  const nearPost=strike.x<45?43:strike.x>55?57:50,targetX=event.type==='goal'?clamp(nearPost+(finite(event.minute)%3-1)*2,42,58):nearPost,catchPoint={x:targetX,y:event.team===0?18:82},end=event.type==='goal'?{x:targetX,y:event.team===0?4:96}:catchPoint;
  const duelTarget=wide?carryEnd:strike,blocker=defenders.filter(p=>p.pos!=='GK').sort((a,b)=>Math.hypot(a.x-duelTarget.x,a.y-duelTarget.y)-Math.hypot(b.x-duelTarget.x,b.y-duelTarget.y)||a.id.localeCompare(b.id))[0]||keeper;
  const u=(from,to)=>smooth((age-from)/(to-from)),place=(list,id,point)=>{const p=list.find(p=>p.id===id);if(p)Object.assign(p,{x:clamp(point.x,10,90),y:clamp(point.y,10,90)});},foot=p=>({x:clamp(p.x+1.3,4,96),y:clamp(p.y+1.2,4,96)});
  const sourceReceive=corner?cornerSpot:freeKick?strike:receive,sourceFinish=corner?cornerSpot:freeKick?strike:carryEnd,run=u(timing.outlet,dribble?timing.delivery:timing.carry),movingSource={...mixPoint(sourceReceive,sourceFinish,run),x:clamp(lerp(sourceReceive.x,sourceFinish.x,run)+(wide?(side==='left'?-2:2):sourceReceive.x<50?3:-3)*Math.sin(Math.PI*run),10,90)},strikeBall=foot(strike),deliveryFrom=foot(sourceFinish);
  // Supporting runners advance together. The carrier makes the larger, visible
  // break and successful defenders chase from behind instead of overtaking him.
  const support=u(timing.secure,timing.delivery);
  const runners=team.filter(p=>p.pos!=='GK'&&![source.id,shooter.id,recoverer.id].includes(p.id));
  for(const [index,p] of runners.entries()){const distance=p.pos==='DEF'?52:p.pos==='MID'?34:29,targetY=event.team===0?Math.max(distance,p.y):Math.min(100-distance,p.y),targetX=p.pos==='FW'?(side==='left'?57:43):p.pos==='MID'?clamp(p.x+(p.x<50?5:-5),24,76):p.x;place(people,p.id,{x:lerp(p.x,targetX,support)+Math.sin(Math.PI*support)*(index%2?1:-1)*2,y:lerp(p.y,targetY,support)});}
  const receiverMove=u(timing.secure,timing.delivery);if(shooter.id!==source.id)place(people,shooter.id,mixPoint(shooter,strike,receiverMove));
  place(people,source.id,age<timing.outlet?mixPoint(source,sourceReceive,u(0,timing.outlet)):movingSource);
  if(!corner&&!freeKick&&recoverer.id!==source.id){const cover={x:recoverer.x,y:event.team===0?Math.max(recoverer.y,38):Math.min(recoverer.y,62)};place(people,recoverer.id,age<timing.outlet?mixPoint(recoverer,origin,u(0,timing.win)):mixPoint(origin,cover,u(timing.outlet,timing.carry)));}
  const chaseStart=wide?timing.outlet:timing.secure,chaseEnd=dribble?timing.delivery:timing.carry,duel=wide||dribble?carryEnd:strike;
  const blocked=event.type==='chance',chase={x:duel.x+(blocked?0:side==='left'?-3:3),y:duel.y+(blocked?0:-direction*6)};
  const wingCover=wide&&!blocked&&age>=timing.carry?mixPoint(chase,{x:strike.x+(side==='left'?-5:5),y:strike.y-direction*6},u(timing.carry,timing.delivery)):chase;
  place(opponents,blocker.id,mixPoint(blocker,wingCover,u(chaseStart,chaseEnd)));result.duelId=blocker.id;
  const boxMarker=defenders.filter(p=>p.pos==='DEF'&&p.id!==blocker.id).sort((a,b)=>Math.hypot(a.x-strike.x,a.y-strike.y)-Math.hypot(b.x-strike.x,b.y-strike.y))[0];
  if(boxMarker){place(opponents,boxMarker.id,mixPoint(boxMarker,{x:strike.x+(strike.x<50?-2:2),y:strike.y-direction*4},support));result.boxMarkerId=boxMarker.id;}
  result.attributed=!!(exact||named);result.scorerId=exact?.id||named?.id||null;result.keeperId=keeper.id;result.eventType=event.type;result.action=event.action;result.performerName=shooter.name;result.sourceId=source.id;result.recovererId=recoverer.id;result.crossSourceName=source.name;result.crossTargetName=shooter.name;result.outcomeAt=impactAge(event);
  result.trail=[];result.ownerTeam=age<timing.win&&!corner&&!freeKick?frozen.ownerTeam:event.team;
  function flight(a,b,t){result.ball=mixPoint(a,b,t);result.trail=[.12,.24,.36].map(lag=>mixPoint(a,b,Math.max(0,t-lag)));result.carrierId=t===0?source.id:null;}
  if(corner||freeKick){
   if(age<timing.outlet){result.ball=mixPoint(origin,foot(sourceReceive),u(0,timing.outlet));result.phase='set-piece';result.label=corner?'코너킥 준비':'프리킥 준비';result.carrierId=age===0?frozen.carrierId:null;result.receiverId=source.id;}
   else{result.ball=foot(sourceFinish);result.phase='set-piece';result.label=corner?'코너 키커가 문전을 살핍니다':'프리킥 · 수비벽을 확인합니다';result.carrierId=source.id;result.receiverId=shooter.id;}
  }else if(age<timing.win){
   result.ball=origin;result.carrierId=age===0?frozen.carrierId:lost?null:recoverer.id;result.receiverId=recoverer.id;result.phase=lost?'turnover':'secure';result.label=lost?'압박 · 공 탈취':'공을 지키며 동료를 확인';
  }else if(age<timing.secure){
   result.ball=origin;result.carrierId=recoverer.id;result.receiverId=source.id;result.phase='secure';result.label='공을 확보하고 전개 방향 확인';
  }else if(age<timing.outlet){
   const t=u(timing.secure,timing.outlet);flight(origin,foot(sourceReceive),t);result.phase='outlet';result.label=wide?'측면 선수에게 연결':'첫 전진 패스';result.receiverId=source.id;
  }else if(age<(dribble?timing.delivery:timing.carry)){
   const touch=Math.sin(Math.PI*run*4)**2*(wide||dribble?2.2:1.2);result.ball={...foot(movingSource),y:clamp(foot(movingSource).y+direction*touch,4,96)};result.touchProgress=touch;result.carrierId=source.id;result.receiverId=source.id;result.runnerId=source.id;result.sprintProgress=run;result.phase=wide?'wing-run':dribble?'sprint':'carry';result.label=wide?'측면 돌파 · 골라인으로 전진':dribble?'공을 앞에 두고 전력 질주':'공을 운반하며 패스 길 찾기';
   result.trail=[.08,.16,.24].map(lag=>foot(mixPoint(sourceReceive,sourceFinish,Math.max(0,run-lag))));
  }
  if(age>=timing.carry&&!dribble&&!freeKick){
   const t=u(timing.carry,timing.delivery),destination=blocked?foot(chase):strikeBall;
   if(age<timing.delivery){flight(deliveryFrom,destination,t);result.receiverId=blocked?blocker.id:shooter.id;result.phase=event.action==='cross'?'cross':event.action==='cutback'?'cutback':'through';result.label={cross:'문전으로 크로스!',cutback:'골라인에서 컷백!',through_ball:'수비 뒷공간으로 침투 패스',combination:'동료에게 연결 · 문전 침투'}[event.action]||'문전으로 연결';if(event.action==='cross')result.ballHeight=Math.sin(Math.PI*t)*(corner?1:.75);}
   else{result.ball=destination;result.trail=[];result.carrierId=blocked?blocker.id:shooter.id;}
  }
  if(dribble&&blocked&&age>=timing.carry&&age<timing.delivery+350){result.tacklerId=blocker.id;result.tackleProgress=Math.sin(Math.PI*clamp((age-timing.carry)/1050,0,1));result.phase=age<timing.delivery?'duel':'tackle';result.label=age<timing.delivery?'돌파 선수에게 수비가 접근':'태클로 돌파 저지';}
  if(blocked&&!freeKick&&age>=timing.delivery){result.ball=foot(chase);result.trail=[];result.carrierId=blocker.id;result.receiverId=blocker.id;result.ownerTeam=1-event.team;if(result.phase!=='tackle'){result.phase='intercept';result.label=wide?'크로스 차단 · 수비가 공 확보':'패스 차단 · 수비가 공 확보';}}
  if((!blocked||freeKick)&&age>=timing.delivery){
   if(age<timing.shot){result.ball=strikeBall;result.carrierId=shooter.id;result.receiverId=keeper.id;result.phase=corner?'header':'control';result.label=corner?'문전 헤더!':freeKick?'프리킥 · 킥 준비':'공을 받아 슈팅 준비';if(corner){result.headerId=shooter.id;result.headerLift=Math.sin(Math.PI*u(timing.delivery,timing.shot));result.ballHeight=.3*result.headerLift;}}
   else if(age<timing.impact){const t=u(timing.shot,timing.impact),target=blocked?foot(chase):end;flight(strikeBall,target,t);result.carrierId=t===0?shooter.id:null;result.phase='shot';result.label=freeKick?'직접 프리킥!':dribble?'돌파 뒤 슈팅!':'슈팅!';result.receiverId=blocked?blocker.id:keeper.id;if(blocked)result.ballHeight=.12*Math.sin(Math.PI*t);}
   else{result.ball=blocked?foot(chase):end;result.trail=[];result.carrierId=blocked?blocker.id:event.type==='shot'?keeper.id:null;result.receiverId=result.carrierId;result.ownerTeam=event.type==='goal'?event.team:1-event.team;result.phase=blocked?'intercept':event.type==='goal'?'goal':event.team===1?'save':'saved';result.label=blocked?'수비벽에 막힙니다':event.type==='goal'?'골!':'골키퍼 선방 · 공 확보';}
  }
  // The keeper advances to narrow the angle, sets, and meets the ball on its
  // flight. Both crossing and dribbling use the same save path and arrival time.
  if(!blocked){const ready={x:lerp(keeper.x,nearPost,.65),y:catchPoint.y},set=u(timing.outlet,timing.shot),dive=u(timing.shot,timing.impact),point=age<timing.shot?mixPoint(keeper,ready,set):mixPoint(ready,catchPoint,dive);place(opponents,keeper.id,point);result.keeperRush=set;result.saveProgress=age>=timing.shot?dive:null;result.keeperPose=age<timing.delivery?'rush':age<timing.shot?'set':age<timing.hold?'dive':'recover';result.keeperDive=(nearPost<50?-1:1)*Math.sin(Math.PI*clamp((age-timing.shot)/(timing.hold-timing.shot),0,1));}
  if(event.type==='goal'&&age>=timing.impact&&age<timing.hold){result.celebrantIds=team.filter(p=>p.pos!=='GK'&&(p.id===shooter.id||p.id===source.id||p.pos==='FW')).map(p=>p.id);result.celebrationLift=Math.sin(Math.PI*u(timing.impact,timing.hold));}
  if(age===0){result.ball=origin;result.ownerTeam=frozen.ownerTeam;result.carrierId=frozen.carrierId;}
  if(age>=timing.hold){
   const blend=u(timing.hold,timing.end);result.phase='restart';result.label=event.type==='goal'?'실점 팀 킥오프 준비':'공을 확보한 수비가 다시 전개';result.ownerTeam=1-event.team;result.ball=mixPoint(result.ball,baseBall,blend);result.trail=[];result.carrierId=null;result.ballHeight=(result.ballHeight||0)*(1-blend);result.headerLift=0;result.tackleProgress=0;result.keeperDive=(result.keeperDive||0)*(1-blend);
   for(let i=0;i<result.own.length;i++){const target=baseOwn.find(p=>p.id===result.own[i].id)||baseOwn[i];if(target)Object.assign(result.own[i],mixPoint(result.own[i],target,blend));}
   for(let i=0;i<result.opponent.length;i++){const target=baseOpp.find(p=>p.id===result.opponent[i].id)||baseOpp[i];if(target)Object.assign(result.opponent[i],mixPoint(result.opponent[i],target,blend));}
  }
  result.focusId=['save','saved'].includes(result.phase)?keeper.id:['turnover','secure'].includes(result.phase)?recoverer.id:['intercept','tackle','duel'].includes(result.phase)?blocker.id:['wing-run','cross','cutback','through','carry','outlet','sprint','set-piece'].includes(result.phase)?source.id:shooter.id;
  result.focusName=[...people,...opponents].find(p=>p.id===result.focusId)?.name||'';
 }

 // Opponent events are aggregate engine events; choose a consistent visual forward,
 // without adding a scorer to saved statistics or drawing from the match RNG.
 function commentary(event,match,roster=[],frameValue=null){
  if(!event||!['goal','shot','chance'].includes(event.type)||![0,1].includes(event.team))return null;
  const active=(people,team)=>people.filter(p=>!match.discipline?.events?.some(e=>e.team===team&&e.id===p.id&&e.card==='red'&&e.minute<=event.minute));
  const own=active(ownBase(match),0);roster=active(roster,1);const people=event.team===0?own:roster;
  const scorer=people.find(p=>p.id===(event.actorId||event.scorerId))||people.find(p=>p.name&&String(event.text||'').includes(p.name))||role(people,'FW',Number.isInteger(event.actorIndex)?event.actorIndex:finite(event.minute)%2);
  const name=scorer.name|| (event.team===0?'우리 공격수':'상대 공격수');
  const keeper=role(event.team===0?roster:own,'GK').name||'골키퍼';
  const variant=Math.abs(finite(event.minute))%3;if(event.setPiece&&event.text)return event.text;if(event.action==='dribble'){if(event.type==='chance')return name+'의 전력 질주! 수비가 발을 뻗어 돌파를 저지합니다.';return name+'이 공을 몰고 수비 뒷공간으로 달립니다. '+(event.type==='goal'?'돌파 뒤 슈팅, 골!':'돌파 뒤 슈팅! '+keeper+'의 선방입니다.');}
  if(['cross','cutback','through_ball'].includes(event.action)){
   const source=event.team===0?match.players?.[event.sourceId]?.name:frameValue?.crossSourceName||role(people,'MID',event.side==='right'?1:0).name,receiver=event.team===0?match.players?.[event.actorId||event.scorerId]?.name:frameValue?.crossTargetName||name,delivery={cross:'크로스',cutback:'컷백',through_ball:'침투 패스'}[event.action];
   if(event.type==='goal')return (source||'측면 선수')+'의 '+delivery+'! '+(receiver||name)+'이(가) 받아 마무리합니다. 골!';
   if(event.type==='shot')return (source||'측면 선수')+'의 '+delivery+'! '+(receiver||name)+'의 슈팅, '+keeper+'의 선방입니다.';
   return (source||'측면 선수')+'의 '+delivery+'를 수비가 끊어냅니다. '+(receiver||name)+'을 향한 패스가 막힙니다.';
  }
  if(event.type==='goal')return [name+'의 슈팅이 골망을 흔듭니다! '+(event.team===0?'멋진 마무리입니다.':'수비 간격을 다시 정비해야 합니다.'),name+'의 결정적인 한 방, 골입니다! '+(event.team===0?'기회를 놓치지 않았습니다.':'고개를 들고 다음 공격을 준비합니다.'),name+'이 골문을 열었습니다! '+(event.team===0?'벤치도 환호합니다.':'다시 집중해야 할 순간입니다.')][variant];
  if(event.type==='shot')return [name+'의 슈팅! '+keeper+'이 공을 잡아냅니다.',name+'이 골문을 노립니다. '+keeper+'의 선방!',name+'이 슈팅을 시도하지만 '+keeper+'이 막아냅니다.'][variant];
  return [name+'의 침투, 수비가 길목을 차단합니다.',name+'을 향한 공격 전개가 수비에 끊깁니다.',name+'이 기회를 노렸지만 수비가 먼저 대응합니다.'][variant];
 }
 function liveCommentaryText(value){
  const people=[...value.own,...value.opponent],from=people.find(p=>p.id===value.sourceId)||people.find(p=>p.id===value.carrierId),to=people.find(p=>p.id===value.receiverId),name=from?.name||to?.name;
  if(value.phase==='secure')return (people.find(p=>p.id===value.recovererId)?.name||'선수')+'이 공을 확보합니다. 동료가 전진할 때까지 전개 방향을 살핍니다.';
  if(value.phase==='outlet')return (to?.name||'동료')+'에게 첫 패스를 연결합니다. 공격진이 앞으로 움직입니다.';
  if(value.phase==='carry')return (from?.name||'미드필더')+'이 공을 운반합니다. 문전으로 달리는 동료를 찾습니다.';
  if(value.phase==='wing-run')return (from?.name||'윙 선수')+'이 측면 수비를 넘어 골라인으로 전진합니다. 문전의 동료도 쇄도합니다.';
  if(value.phase==='duel')return (people.find(p=>p.id===value.tacklerId)?.name||'수비수')+'이 돌파 선수에게 접근합니다. 공을 사이에 두고 경합합니다.';
  if(value.phase==='control')return (value.performerName||'공격수')+'이 공을 받아 슈팅을 준비합니다. 골키퍼가 앞으로 나와 각도를 좁힙니다.';
  if(value.phase==='set-piece')return value.label;
  if(value.phase==='intercept')return (people.find(p=>p.id===value.carrierId)?.name||'수비수')+'이 공격을 끊고 공을 확보합니다. 다시 전개할 준비를 합니다.';
  if(value.phase==='restart')return value.label+'.';
  if(value.phase==='header')return (value.performerName||'공격수')+'가 뛰어올라 헤딩합니다! 공이 골문을 향합니다.';if(value.phase==='sprint')return (people.find(p=>p.id===value.runnerId)?.name||'공격수')+'이 공을 몰고 전력 질주합니다. 수비가 따라붙습니다.';if(value.phase==='tackle')return (people.find(p=>p.id===value.tacklerId)?.name||'수비수')+'이 발을 뻗어 돌파를 저지합니다.';if(value.phase==='shot')return (value.performerName||'공격수')+'의 슈팅! 공이 골문을 향합니다.';
  if(value.phase==='cross')return (from?.name||'측면 선수')+'이 측면에서 크로스를 올립니다. '+(to?.name||'공격수')+'가 문전으로 쇄도합니다.';
  if(value.phase==='cutback')return (from?.name||'측면 선수')+'이 골라인 근처에서 컷백을 내줍니다. '+(to?.name||'공격수')+'가 슈팅을 준비합니다.';
  if(value.phase==='through')return (from?.name||'미드필더')+'의 침투 패스! '+(to?.name||'공격수')+'가 수비 뒷공간으로 달립니다.';
  if(value.phase==='wide')return (name||'측면 선수')+'이(가) 넓게 벌려 공을 받습니다. '+value.label+'.';
  if(value.phase==='turnover')return (to?.name||'수비수')+'이 공을 회수하려고 압박합니다. 먼저 볼을 확보해야 합니다.';
  if(value.phase==='assist')return (to?.name||'공격수')+'에게 전진 패스! 슈팅 공간을 만듭니다.';
  if(!name)return value.label;
  return value.phase==='transition'?name+' 쪽으로 공이 넘어갑니다. 수비와 공격이 빠르게 전환됩니다.':value.ownerTeam===0?name+' 중심으로 공격을 전개합니다. '+value.label+'.':name+' 쪽으로 상대가 공을 연결합니다. '+value.label+'.';
 }
 const shortName=name=>String(name||'선수').trim().split(/\s+/).at(-1);
 function liveCommentary(value,compact=false){
  if(!compact)return liveCommentaryText(value);
  const people=[...value.own,...value.opponent],person=id=>shortName(people.find(p=>p.id===id)?.name),source=person(value.sourceId||value.carrierId),receiver=person(value.receiverId),recoverer=person(value.recovererId),shooter=shortName(value.performerName);
  const texts={turnover:recoverer+'가 압박합니다. 먼저 공을 확보해야 합니다.',secure:recoverer+' 공 확보. 동료들이 앞으로 움직입니다.',outlet:receiver+'에게 첫 패스. 공격 전개를 시작합니다.',carry:source+'가 공을 운반하며 동료의 침투를 봅니다.','wing-run':source+' 측면 돌파! 앞서 나가 크로스를 준비합니다.',sprint:person(value.runnerId)+' 전력 질주! 수비를 뒤에 두고 전진합니다.',duel:person(value.tacklerId)+'가 따라붙습니다. 공을 두고 경합합니다.',tackle:person(value.tacklerId)+' 태클! 돌파를 저지하고 공을 확보합니다.',cross:source+' 크로스! '+receiver+'가 문전으로 쇄도합니다.',cutback:source+' 컷백! '+receiver+'가 슈팅을 준비합니다.',through:source+' 전진 패스! '+receiver+'가 뒷공간으로 침투합니다.',control:shooter+' 슈팅 준비. 골키퍼가 나와 각도를 좁힙니다.',header:shooter+' 헤더! 공이 골문을 향합니다.',shot:shooter+' 슈팅! 공이 골문을 향합니다.',intercept:person(value.carrierId)+'가 공격을 끊고 공을 확보합니다.',restart:value.label+'.','set-piece':value.label+'.'};
  if(texts[value.phase])return texts[value.phase];
  let text=liveCommentaryText(value);for(const p of people)if(p.name)text=text.replaceAll(p.name,shortName(p.name));return text;
 }
 function broadcast(event,match,roster=[],value=null){
  if(!event||!['goal','shot','chance'].includes(event.type))return null;
  const people=value?[...value.own,...value.opponent]:[...ownBase(match),...roster],source=shortName(value?.crossSourceName||match.players?.[event.sourceId]?.name),shooter=shortName(value?.performerName||match.players?.[event.actorId||event.scorerId]?.name),keeper=shortName(people.find(p=>p.id===value?.keeperId)?.name||'골키퍼');
  const outcome=event.type==='goal'?'골!':event.type==='shot'?keeper+' 선방!':'수비가 차단합니다.';
  if(event.setPiece==='freeKick')return shooter+'의 직접 프리킥! '+outcome;
  if(event.setPiece==='corner')return source+' 코너킥 → '+(event.type==='chance'?'수비가 걷어냅니다.':shooter+' 헤더! '+outcome);
  if(event.action==='dribble')return shooter+' 돌파'+(event.type==='chance'?'를 수비가 저지합니다.':' 뒤 슈팅! '+outcome);
  const delivery={cross:'크로스',cutback:'컷백',through_ball:'침투 패스',combination:'패스 연계'}[event.action]||'전진 패스';
  return source+' '+delivery+'! '+(event.type==='chance'?'수비가 끊어냅니다.':shooter+' 슈팅, '+outcome);
 }

 // Only describe the frame being displayed, never the event's future outcome.
 function sequence(value){
  if(!value||![0,1].includes(value.ownerTeam))return null;
  const stage=['turnover','secure','intercept','tackle'].includes(value.phase)?0:['outlet','carry','wing-run','sprint','through','build-up','wide','transition'].includes(value.phase)?1:['cross','cutback','control','shot','header','set-piece'].includes(value.phase)?2:-1;
  return stage<0?null:{stage,team:value.ownerTeam,label:['확보','전진','문전'][stage]};
 }
 return {frame,commentary,liveCommentary,broadcast,sequence,timing,impactAge};
});
