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
  for(const player of opponent)player.name=input.opponentRoster?.find(p=>p.id===player.id)?.name||'';
  const result={own,opponent,ball:{x:50,y:50},trail:[],carrierId:null,receiverId:null,ownerTeam:null,phase:'static',label:{prep:'경기 준비',half:'하프타임',late:'65분 작전 시간',full:'경기 종료'}[match.phase]||'경기 준비',attributed:false};
  if(input.motion===false)return result;
  const running=['first','second','third'].includes(match.phase),time=Math.max(0,finite(input.elapsedMs)),event=input.event,age=Math.max(0,finite(input.eventAgeMs,Infinity));
  const cinematic=event&&['goal','shot','chance'].includes(event.type)&&[0,1].includes(event.team)&&age<2200;
  if(!running&&!cinematic)return result;
  if(running){
   // Keep possession with one side through a complete build-up. The route uses
   // an actual wide player before entering the box; it never invents a shot.
   const routeTime=event&&['goal','shot','chance'].includes(event.type)&&[0,1].includes(event.team)&&Number.isFinite(age)&&age>=1900?((1-event.team)*9000+age-1900):time;
   const cycleTime=routeTime%18000,owner=cycleTime<9000?0:1,cycle=cycleTime/18000,local=(cycleTime%9000)/9000,stage=Math.min(4,Math.floor(local*5)),segmentLocal=local*5-stage,attack=Math.sin(cycle*Math.PI*2),press=match.tactic==='press'?3:match.tactic==='counter'?-2:0;
   for(let i=0;i<own.length;i++){
    const p=own[i],amplitude={GK:1.5,DEF:7,MID:12,FW:8}[p.pos]||8,side=p.pos==='GK'?2:5;
    p.x=clamp(p.x+Math.sin(time/1900+i*.8)*side+attack*(p.x<50?2:-2),10,90);
    p.y=clamp(p.y-attack*amplitude-(p.pos==='GK'?0:press)+Math.cos(time/2300+i)*1.8,10,90);
    if(p.pos==='GK'){p.x=clamp(p.x,40,60);p.y=clamp(p.y,83,90);}
   }
   for(let i=0;i<opponent.length;i++){
    const p=opponent[i],amplitude={GK:1.5,DEF:7,MID:10,FW:6}[p.pos];
    p.x=clamp(p.x+Math.sin(time/2100+i*.7+1)*4,10,90);
    p.y=clamp(p.y-attack*amplitude+Math.cos(time/2400+i)*1.6,10,90);
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
   const team=owner===0?own:opponent,side=Math.floor(routeTime/18000)%2===0?'left':'right',route=buildRoute(team,side),from=route[stage],to=route[Math.min(stage+1,route.length-1)],pass=smooth((segmentLocal-.17)/.66),a={x:from.x+1.3,y:from.y-1.2},b={x:to.x+1.3,y:to.y-1.2};
   result.ball=mixPoint(a,b,pass);result.receiverId=to.id;result.carrierId=local<.17?from.id:local>.83?to.id:null;
   result.ownerTeam=(local>.83?to.id:from.id)?.startsWith('opp')?1:0;
   const turnover=stage===4&&segmentLocal>.78;
   result.phase=turnover?'transition':stage>=2?'wide':result.ownerTeam===0?'build-up':'defence';
   result.label=turnover?'수비 전환':result.ownerTeam===0?(match.tactic==='counter'&&stage>=2?'역습 전개':stage===0?'후방 빌드업':stage===1?'중원 전진':stage===2?'측면 전개':stage===3?'크로스 준비':'박스 침투'):(match.tactic==='press'?'전방 압박':stage>=2?'측면 수비':'수비 대응');
   if(segmentLocal>.17&&segmentLocal<.83)result.trail=[.08,.16,.24].map(lag=>mixPoint(a,b,smooth((segmentLocal-.17-lag)/.66)));
  }
  if(cinematic){const frozen=input.eventOrigin||frame({...input,event:null,elapsedMs:input.eventElapsedMs??Math.max(0,time-age)});applyEvent(result,match,event,age,frozen);}
  return result;
 }
 function inputOrigin(frozen){return {...frozen.ball};}
 function applyEvent(result,match,event,age,frozen){
  const baseBall={...result.ball},baseOwn=result.own.map(p=>({...p})),baseOpp=result.opponent.map(p=>({...p})),team=event.team===0?frozen.own:frozen.opponent,defenders=event.team===0?frozen.opponent:frozen.own;
  for(const [visible,held] of [[result.own,frozen.own],[result.opponent,frozen.opponent]])for(const player of visible){const anchor=held.find(p=>p.id===player.id);if(anchor)Object.assign(player,{x:anchor.x,y:anchor.y});}
  const exact=event.team===0&&(event.actorId||event.scorerId)?team.find(p=>p.id===(event.actorId||event.scorerId)):null;
  // Older shot logs lack a shooter id. Text can identify a player, otherwise use
  // a generic forward animation and leave attributed=false for UI consumers.
  const named=event.team===0?team.find(p=>match.players?.[p.id]?.name&&String(event.text||'').includes(match.players[p.id].name)):null;
  const shooter=exact||named||role(team,'FW',Number.isInteger(event.actorIndex)?event.actorIndex:finite(event.minute)%2),keeper=role(defenders,'GK'),crossing=['cross','cutback','through_ball'].includes(event.action);
  const progress=smooth((age-700)/750),blend=smooth((age-1900)/300),nearPost=shooter.x<45?43:shooter.x>55?57:50,targetX=event.type==='goal'?clamp(nearPost+(finite(event.minute)%3-1)*2,42,58):nearPost;
  const goalY=event.team===0?4:96,targetY=event.type==='goal'?goalY:event.team===0?14:86;
  const start={x:shooter.x,y:clamp(shooter.y+(event.team===0?-4:4),10,90)},end={x:targetX,y:targetY},source=team.find(p=>p.id===event.sourceId)||widePlayer(team,event.side|| (shooter.x<50?'left':'right'),shooter.id),sourcePoint={x:source.x,y:source.y};
  if(crossing){result.sourceId=source.id;result.crossSourceName=source.name;result.crossTargetName=shooter.name;}
  const visibleShooter=(event.team===0?result.own:result.opponent).find(p=>p.id===shooter.id);if(visibleShooter)Object.assign(visibleShooter,mixPoint(shooter,start,smooth(age/700)));
  if(crossing){
   const blocker=role(defenders,'DEF',1),deliveryEnd=event.type==='chance'?{x:blocker.x,y:blocker.y}:start;
   if(age<250){result.ball=mixPoint(inputOrigin(frozen),sourcePoint,smooth(age/250));result.phase='assist';result.label='측면으로 전개';result.carrierId=age===0?frozen.carrierId:source.id;result.receiverId=source.id;result.ownerTeam=age<125?frozen.ownerTeam:event.team;}
   else if(age<1100){const progress=smooth((age-250)/850);result.ball=mixPoint(sourcePoint,deliveryEnd,progress);result.phase=event.action==='cross'?'cross':event.action==='cutback'?'cutback':'through';result.label={cross:'크로스!',cutback:'컷백!',through_ball:'수비 뒷공간 침투 패스'}[event.action];result.carrierId=null;result.sourceId=source.id;result.receiverId=event.type==='chance'?blocker.id:shooter.id;result.ownerTeam=event.team;result.trail=[.15,.3,.45].map(lag=>mixPoint(sourcePoint,deliveryEnd,smooth((age-250)/850-lag)));}
   else if(event.type==='chance'){result.ball=deliveryEnd;result.phase='intercept';result.label='크로스 차단';result.carrierId=blocker.id;result.receiverId=blocker.id;result.ownerTeam=1-event.team;}
   else{const progress=smooth((age-1100)/350);result.ball=mixPoint(start,end,progress);result.phase=age<1450?'shot':event.type==='goal'?'goal':event.team===1?'save':'saved';result.label=result.phase==='shot'?'슈팅':result.phase==='goal'?'골!':result.phase==='save'?'선방!':'상대 선방';result.carrierId=progress<.07?shooter.id:event.type==='shot'&&progress>.97?keeper.id:null;result.receiverId=event.type==='shot'?keeper.id:null;result.trail=[.14,.28,.42].map(lag=>mixPoint(start,end,smooth((age-1100)/350-lag)));}
   const visibleSource=(event.team===0?result.own:result.opponent).find(p=>p.id===source.id);if(visibleSource&&age<1100){const move=smooth((age-250)/850);visibleSource.x=lerp(source.x,source.x+(event.side==='left'?2:-2),move);}
  }else if(event.type==='chance'){
   const blocker=role(defenders,'DEF',1),endChance={x:blocker.x,y:blocker.y};
   result.ball=mixPoint(start,endChance,progress);result.phase='intercept';result.label='공격 차단';result.carrierId=progress>.85?blocker.id:progress<.1?shooter.id:null;result.receiverId=blocker.id;
   result.trail=[.15,.3,.45].map(lag=>mixPoint(start,endChance,smooth(((age-700)/750)-lag)));
  }else{
   result.ball=mixPoint(start,end,progress);
   result.trail=[.14,.28,.42].map(lag=>mixPoint(start,end,smooth(((age-700)/750)-lag)));
   result.carrierId=progress<.07?shooter.id:event.type==='shot'&&progress>.97?keeper.id:null;result.receiverId=event.type==='shot'?keeper.id:null;
   result.phase=age<1450?'shot':event.type==='goal'?'goal':event.team===1?'save':'saved';
   result.label=result.phase==='shot'?'슈팅':result.phase==='goal'?'골!':result.phase==='save'?'선방!':'상대 선방';
   if(keeper.id){const visibleKeeper=(event.team===0?result.opponent:result.own).find(p=>p.id===keeper.id);const preparedX=lerp(keeper.x,nearPost,smooth(age/700)*.6);visibleKeeper.x=clamp(lerp(preparedX,targetX,smooth((age-700)/650)),40,60);visibleKeeper.y=clamp(lerp(keeper.y,targetY,smooth((age-700)/650)),event.team===0?10:82,event.team===0?18:90);}
  }
  if(age<700&&!crossing){
   const origin=inputOrigin(frozen),lost=frozen.ownerTeam!==event.team,recoverer=lost?team.filter(p=>p.pos!=='GK'&&p.id!==shooter.id).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y))[0]||role(team,'DEF',1):(team.find(p=>p.id===frozen.carrierId)||role(team,'MID',1)),win={x:origin.x,y:origin.y},move=smooth(age/350),pass=smooth((age-350)/350);
   const visible=team===frozen.own?result.own:result.opponent,actor=visible.find(p=>p.id===recoverer.id);if(actor){const point=mixPoint(recoverer,win,age<350?move:1-pass);Object.assign(actor,{x:clamp(point.x,10,90),y:clamp(point.y,10,90)});}
   result.ball=age<350?origin:mixPoint(win,start,pass);result.trail=[];result.carrierId=age===0?frozen.carrierId:age<350?(lost?null:recoverer.id):pass===1?shooter.id:pass===0?recoverer.id:null;result.receiverId=age<350?recoverer.id:shooter.id;result.ownerTeam=age<350?frozen.ownerTeam:event.team;result.phase=lost&&age<350?'turnover':'assist';result.label=lost&&age<350?'공 탈취 · 수비 전환':'전진 패스 · 슈팅 준비';
  }
  if(age>=700)result.ownerTeam=event.type==='shot'&&progress>.97||event.type==='chance'&&progress>.85?1-event.team:event.team;result.attributed=!!(exact||named);result.scorerId=exact?.id||named?.id||null;result.keeperId=keeper.id;result.eventType=event.type;result.action=event.action;
  result.performerName=shooter.name;applyActionMovement(result,event,age,shooter,source,defenders,frozen,end);
  if(blend>0){
   result.phase='restart';result.label=event.type==='goal'?'실점 팀 킥오프 재개':'수비진으로 공 배급';result.ownerTeam=1-event.team;
   result.ball=mixPoint(result.ball,baseBall,blend);result.trail=[];result.carrierId=null;
   for(let i=0;i<result.own.length;i++)Object.assign(result.own[i],mixPoint(result.own[i],baseOwn[i],blend));
   for(let i=0;i<result.opponent.length;i++)Object.assign(result.opponent[i],mixPoint(result.opponent[i],baseOpp[i],blend));
  }
 }
 // Action poses and ball height illustrate recorded events only; no new result or RNG draw.
 function applyActionMovement(result,event,age,shooter,source,defenders,frozen,end){
  const people=event.team===0?result.own:result.opponent,opponents=event.team===0?result.opponent:result.own,runner=people.find(p=>p.id===shooter.id),fade=1-smooth((age-1450)/450);
  if(event.action==='cross'&&age>=250&&age<1100){result.ballHeight=Math.sin(Math.PI*clamp((age-250)/850,0,1))*(event.setPiece==='corner'?1:.75);}
  if(event.setPiece==='corner'&&event.type!=='chance'&&age>=1000&&age<1450){result.headerId=shooter.id;result.headerLift=Math.sin(Math.PI*clamp((age-1000)/450,0,1));if(age>=1100&&age<1300){result.phase='header';result.label='문전 헤더!';}result.ballHeight=Math.max(result.ballHeight||0,.22*result.headerLift);}
  if(event.action!=='dribble')return;
  const direction=event.team===0?-1:1,start={x:shooter.x,y:shooter.y},finish={x:clamp(shooter.x+(shooter.x<50?12:-12),10,90),y:clamp(shooter.y+direction*20,10,90)},run=smooth((age-250)/700),point=mixPoint(start,finish,run),baseRunner=runner?{x:runner.x,y:runner.y}:null;
  if(runner){const visible=mixPoint(baseRunner,point,fade);Object.assign(runner,visible);}result.runnerId=shooter.id;result.sprintProgress=age>=250&&age<950?run:null;
  const blocker=defenders.filter(p=>p.pos!=='GK').sort((a,b)=>Math.hypot(a.x-finish.x,a.y-finish.y)-Math.hypot(b.x-finish.x,b.y-finish.y)||a.id.localeCompare(b.id))[0],visibleBlocker=blocker&&opponents.find(p=>p.id===blocker.id);
  if(visibleBlocker&&age>=300){const follow=smooth((age-300)/650),duel={x:finish.x+(event.type==='chance'?0:shooter.x<50?-3:3),y:finish.y+direction*2},chase=mixPoint(blocker,duel,follow);Object.assign(visibleBlocker,mixPoint(visibleBlocker,chase,fade));result.duelId=blocker.id;}
  if(age<250){result.ball=mixPoint(frozen.ball,start,smooth(age/250));result.phase='assist';result.label='돌파 선수에게 연결';result.carrierId=age===0?frozen.carrierId:null;result.receiverId=shooter.id;result.ownerTeam=age===0?frozen.ownerTeam:event.team;result.trail=[];}
  else if(age<950){result.ball={x:point.x,y:point.y};result.carrierId=shooter.id;result.receiverId=shooter.id;result.ownerTeam=event.team;result.phase='sprint';result.label='공을 몰고 전력 질주!';result.trail=[.06,.12,.18].map(lag=>mixPoint(start,finish,Math.max(0,run-lag)));}
  else{const flight=smooth((age-950)/500),target=event.type==='chance'?finish:end;result.ball=mixPoint(finish,target,flight);result.carrierId=flight<.02?shooter.id:event.type==='chance'&&flight>.85?blocker?.id:event.type==='shot'&&flight>.97?result.keeperId:null;result.receiverId=event.type==='chance'?blocker?.id:event.type==='shot'?result.keeperId:null;result.ownerTeam=event.type==='chance'&&flight>.85||event.type==='shot'&&flight>.97?1-event.team:event.team;result.trail=[.1,.2,.3].map(lag=>mixPoint(finish,target,Math.max(0,flight-lag)));result.phase=event.type==='chance'?'tackle':age<1450?'shot':event.type==='goal'?'goal':event.team===1?'save':'saved';result.label=result.phase==='tackle'?'수비가 발을 뻗어 돌파 저지':result.phase==='shot'?'돌파 뒤 슈팅!':result.phase==='goal'?'골!':'골키퍼 선방';if(event.type==='chance'&&blocker){result.tacklerId=blocker.id;result.tackleProgress=Math.sin(Math.PI*clamp((age-950)/600,0,1));}}
 }
 // Opponent events are aggregate engine events; choose a consistent visual forward,
 // without adding a scorer to saved statistics or drawing from the match RNG.
 function commentary(event,match,roster=[],frameValue=null){
  if(!event||!['goal','shot','chance'].includes(event.type)||![0,1].includes(event.team))return null;
  const active=(people,team)=>people.filter(p=>!match.discipline?.events?.some(e=>e.team===team&&e.id===p.id&&e.card==='red'&&e.minute<=event.minute));
  const own=active(ownBase(match),0);roster=active(roster,1);const people=event.team===0?own:roster;
  const scorer=people.find(p=>p.id===event.scorerId)||people.find(p=>p.name&&String(event.text||'').includes(p.name))||role(people,'FW',finite(event.minute)%2);
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
 function liveCommentary(value){
  const people=[...value.own,...value.opponent],from=people.find(p=>p.id===value.sourceId)||people.find(p=>p.id===value.carrierId),to=people.find(p=>p.id===value.receiverId),name=from?.name||to?.name;
  if(value.phase==='header')return (value.performerName||'공격수')+'가 뛰어올라 헤딩합니다! 공이 골문을 향합니다.';if(value.phase==='sprint')return (people.find(p=>p.id===value.runnerId)?.name||'공격수')+'이 공을 몰고 전력 질주합니다. 수비가 따라붙습니다.';if(value.phase==='tackle')return (people.find(p=>p.id===value.tacklerId)?.name||'수비수')+'이 발을 뻗어 돌파를 저지합니다.';if(value.phase==='shot')return (value.performerName||'공격수')+'의 슈팅! 공이 골문을 향합니다.';
  if(value.phase==='cross')return (from?.name||'측면 선수')+'이 측면에서 크로스를 올립니다. '+(to?.name||'공격수')+'가 문전으로 쇄도합니다.';
  if(value.phase==='cutback')return (from?.name||'측면 선수')+'이 골라인 근처에서 컷백을 내줍니다. '+(to?.name||'공격수')+'가 슈팅을 준비합니다.';
  if(value.phase==='through')return (from?.name||'미드필더')+'의 침투 패스! '+(to?.name||'공격수')+'가 수비 뒷공간으로 달립니다.';
  if(value.phase==='wide')return (name||'측면 선수')+'이(가) 넓게 벌려 공을 받습니다. '+value.label+'.';
  if(value.phase==='turnover')return '압박에 패스가 끊깁니다. '+(to?.name||'수비수')+'이 공을 회수합니다.';
  if(value.phase==='assist')return (to?.name||'공격수')+'에게 전진 패스! 슈팅 공간을 만듭니다.';
  if(!name)return value.label;
  return value.phase==='transition'?name+' 쪽으로 공이 넘어갑니다. 수비와 공격이 빠르게 전환됩니다.':value.ownerTeam===0?name+' 중심으로 공격을 전개합니다. '+value.label+'.':name+' 쪽으로 상대가 공을 연결합니다. '+value.label+'.';
 }
 return {frame,commentary,liveCommentary};
});
