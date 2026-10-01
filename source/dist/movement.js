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
 const bases={
  '442':{DEF:[[15,69],[38,73],[62,73],[85,69]],MID:[[15,44],[38,49],[62,49],[85,44]],FW:[[35,23],[65,23]]},
  '433':{DEF:[[15,69],[38,73],[62,73],[85,69]],MID:[[25,48],[50,52],[75,48]],FW:[[18,24],[50,18],[82,24]]},
  '352':{DEF:[[25,74],[50,76],[75,74]],MID:[[12,46],[31,52],[50,48],[69,52],[88,46]],FW:[[35,23],[65,23]]}
 };
 const oppBase=[[50,12,'GK'],[16,31,'DEF'],[39,27,'DEF'],[61,27,'DEF'],[84,31,'DEF'],[16,54,'MID'],[39,51,'MID'],[61,51,'MID'],[84,54,'MID'],[37,78,'FW'],[63,78,'FW']];
 function ownBase(match,provided){
  const rows=Array.isArray(provided)?provided:null,counts={DEF:0,MID:0,FW:0},layout=bases[match?.formation]||bases['442'];
  const ids=rows||((match?.lineup||[]).map(id=>({id,p:match.players?.[id]})));
  return ids.filter(row=>row&&row.id).map(row=>{
   const p=row.p||match?.players?.[row.id]||{},pos=p.pos||row.pos||'MID',fallback=pos==='GK'?[50,88]:(layout[pos]?.[counts[pos]++]||[50,50]);
   return {id:row.id,no:p.no||row.no||0,pos,x:clamp(finite(row.x,fallback[0]),10,90),y:clamp(finite(row.y,fallback[1]),10,90)};
  });
 }
 const role=(team,pos,index=0)=>{const people=team.filter(p=>p.pos===pos);return people[index%people.length]||team.find(p=>p.pos!=='GK')||team[0]||{id:null,x:50,y:50};};
 function frame(input={}){
  const match=input.match||{},own=ownBase(match,input.positions),opponent=oppBase.map(([x,y,pos],i)=>({id:'opp'+i,no:i+1,pos,x,y}));
  const result={own,opponent,ball:{x:50,y:50},trail:[],carrierId:null,receiverId:null,ownerTeam:null,phase:'static',label:{prep:'경기 준비',half:'하프타임',late:'65분 작전 시간',full:'경기 종료'}[match.phase]||'경기 준비',attributed:false};
  if(input.motion===false)return result;
  const running=['first','second','third'].includes(match.phase),time=Math.max(0,finite(input.elapsedMs)),event=input.event,age=Math.max(0,finite(input.eventAgeMs,Infinity));
  const cinematic=event&&['goal','shot','chance'].includes(event.type)&&[0,1].includes(event.team)&&age<2200;
  if(!running&&!cinematic)return result;
  if(running){
   // Ten connected passes, with each turnover returning possession to the other side.
   // The display invents no additional shots or goals: those require real engine events.
   const cycle=(time%14000)/14000,stage=Math.floor(cycle*10),local=cycle*10-stage,attack=Math.sin(cycle*Math.PI*2),press=match.tactic==='press'?3:match.tactic==='counter'?-2:0;
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
   const o=own,opp=opponent,route=[role(o,'DEF',1),role(o,'MID',1),role(o,'MID',2),role(o,'FW',0),role(o,'FW',1),role(opp,'DEF',1),role(opp,'MID',1),role(opp,'MID',2),role(opp,'FW',0),role(opp,'FW',1)];
   const from=route[stage],to=route[(stage+1)%route.length],pass=smooth((local-.17)/.66),a={x:from.x+1.3,y:from.y-1.2},b={x:to.x+1.3,y:to.y-1.2};
   result.ball=mixPoint(a,b,pass);result.receiverId=to.id;result.carrierId=local<.17?from.id:local>.83?to.id:null;
   result.ownerTeam=(local>.83?to.id:from.id)?.startsWith('opp')?1:0;
   const turnover=stage===4||stage===9;
   result.phase=turnover?'transition':result.ownerTeam===0?'build-up':'defence';
   result.label=turnover?'수비 전환':result.ownerTeam===0?(match.tactic==='counter'&&stage>=2?'역습 전개':stage>=2?'측면 침투':'중원 전개'):(match.tactic==='press'?'전방 압박':'수비 대응');
   if(local>.17&&local<.83)result.trail=[.08,.16,.24].map(lag=>mixPoint(a,b,smooth((local-.17-lag)/.66)));
  }
  if(cinematic)applyEvent(result,match,event,age);
  return result;
 }
 function applyEvent(result,match,event,age){
  const baseBall={...result.ball},baseOwn=result.own.map(p=>({...p})),baseOpp=result.opponent.map(p=>({...p})),team=event.team===0?result.own:result.opponent,defenders=event.team===0?result.opponent:result.own;
  const exact=event.team===0&&event.scorerId?team.find(p=>p.id===event.scorerId):null;
  // Older shot logs lack a shooter id. Text can identify a player, otherwise use
  // a generic forward animation and leave attributed=false for UI consumers.
  const named=event.team===0?team.find(p=>match.players?.[p.id]?.name&&String(event.text||'').includes(match.players[p.id].name)):null;
  const shooter=exact||named||role(team,'FW',finite(event.minute)%2),keeper=role(defenders,'GK');
  const progress=smooth(age/1450),blend=smooth((age-1900)/300),targetX=event.type==='goal'?46+(finite(event.minute)%3)*4:clamp(keeper.x,42,58);
  const goalY=event.team===0?6:94,targetY=event.type==='goal'?goalY:event.team===0?14:86;
  const start={x:shooter.x,y:shooter.y},end={x:targetX,y:targetY};
  if(event.type==='chance'){
   const blocker=role(defenders,'DEF',1),endChance={x:blocker.x,y:blocker.y};
   result.ball=mixPoint(start,endChance,progress);result.phase='intercept';result.label='공격 차단';result.carrierId=progress>.85?blocker.id:progress<.1?shooter.id:null;result.receiverId=blocker.id;
   result.trail=[.15,.3,.45].map(lag=>mixPoint(start,endChance,smooth((age/1450)-lag)));
  }else{
   result.ball=mixPoint(start,end,progress);
   result.trail=[.14,.28,.42].map(lag=>mixPoint(start,end,smooth((age/1450)-lag)));
   result.carrierId=progress<.07?shooter.id:event.type==='shot'&&progress>.97?keeper.id:null;result.receiverId=event.type==='shot'?keeper.id:null;
   result.phase=age<1050?'shot':event.type==='goal'?'goal':event.team===1?'save':'saved';
   result.label=result.phase==='shot'?'슈팅':result.phase==='goal'?'골!':result.phase==='save'?'선방!':'상대 선방';
   if(keeper.id){keeper.x=clamp(lerp(keeper.x,targetX,smooth(age/900)),40,60);keeper.y=clamp(lerp(keeper.y,targetY,smooth(age/900)),event.team===0?10:82,event.team===0?18:90);}
  }
  result.ownerTeam=event.team;result.attributed=!!(exact||named);result.scorerId=exact?.id||named?.id||null;result.keeperId=keeper.id;result.eventType=event.type;
  if(blend>0){
   result.ball=mixPoint(result.ball,baseBall,blend);result.trail=[];result.carrierId=null;
   for(let i=0;i<result.own.length;i++)Object.assign(result.own[i],mixPoint(result.own[i],baseOwn[i],blend));
   for(let i=0;i<result.opponent.length;i++)Object.assign(result.opponent[i],mixPoint(result.opponent[i],baseOpp[i],blend));
  }
 }
 return {frame};
});
