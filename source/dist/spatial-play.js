(function(root){
 'use strict';
 // Original, bounded 2D attack solver. Coordinates are pitch percentages.
 // Fixed 100 ms steps, swept ball contact and individual acceleration follow
 // SoccerServer principles; this is not a port of the RoboCup server.
 const dt=.1,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),round=n=>Math.round(n*1000)/1000;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function move(p,target){
  const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy)||1;
  const speed=(4+p.speed*.075)*(.5+p.energy*.005),desired=Math.min(speed,d/dt);
  const change=5*dt,tx=dx/d*desired,ty=dy/d*desired;
  p.vx+=clamp(tx-p.vx,-change,change);p.vy+=clamp(ty-p.vy,-change,change);
  p.x=clamp(p.x+p.vx*dt,4,96);p.y=clamp(p.y+p.vy*dt,5,95);
 }
 function swept(a,b,p){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return {t,d:Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y)};}
 function solve(input){
  const {team,action,side,sourceId,receiverId,roll,runRoll}=input,dir=team?-1:1,world=input.players.map(p=>({...p,vx:0,vy:0}));
  // Internally every attack travels toward y=0, mirrored only in snapshots.
  for(const p of world){if(team)p.y=100-p.y;
   // Possession midfielders receive into a half-space rather than lining up
   // exactly underneath their mirrored marker on every sampled attack.
   if(p.team===team&&p.pos==='MID')p.x=clamp(p.x+(side==='left'?-6:6),10,90);
   p.baseX=p.x;p.baseY=p.y;p.y=p.team===team?(p.pos==='FW'?Math.max(35,p.y):p.y):(p.pos==='DEF'?clamp(p.y,26,36):p.y);}
  const attacker=world.filter(p=>p.team===team),defence=world.filter(p=>p.team!==team),source=attacker.find(p=>p.id===sourceId),receiver=attacker.find(p=>p.id===receiverId);
  if(!source||!receiver||defence.length<2)throw Error('공간 전개의 출전 선수를 확인하세요.');
  const wide=['cross','cutback'].includes(action),dribble=action==='dribble',long=action==='long_shot',carrier=dribble||long?receiver:source;
  if(long)carrier.y=48;
  const target={x:wide?(side==='left'?12:88):clamp(carrier.x,28,72),y:wide?23:dribble?27:long?48:43};
  const earlyRun=action==='through_ball'&&runRoll>.82;
  if(earlyRun)receiver.y=Math.min(receiver.y,32);
  const releaseTime=wide?2.5:dribble?2.6:earlyRun?1.6:.75,receiverTarget={x:clamp(receiver.x+(side==='left'?-3:3),30,70),y:long?43:wide?18:22};
  const toPoint=p=>({x:round(p.x),y:round(team?100-p.y:p.y)}),snapshots=[];
  let ball={x:carrier.x,y:carrier.y},flight=null,contact=null,release=null,offside=false,blocked=false,defenderId=null;
  const capture=t=>snapshots.push({time:round(t),players:world.map(p=>({id:p.id,...toPoint(p)})),ball:toPoint(ball),height:flight?.height||0});
  capture(0);
  for(let step=1;step<=85&&!contact;step++){
   const t=round(step*dt),last={...ball};
   const closest=defence.filter(p=>p.pos!=='GK').sort((a,b)=>distance(a,ball)-distance(b,ball)||a.id.localeCompare(b.id)).slice(0,2);
   for(const p of world){
    let goal={x:p.baseX,y:p.baseY};
    if(p.id===carrier.id&&!flight)goal=target;
    else if(p.id===receiver.id){goal=t>(earlyRun?.25:releaseTime)?receiverTarget:{x:receiver.x,y:Math.max(receiver.y,34)};}
    else if(p.team===team&&p.pos!=='GK'){const nearby=clamp(1-distance(p,carrier)/55,0,1);goal={x:p.baseX+(carrier.x-p.baseX)*nearby*.12,y:p.pos==='DEF'?Math.max(57,p.baseY-3):Math.max(30,p.baseY-5*nearby)};}
    else if(p.pos==='GK')goal={x:clamp(ball.x,43,57),y:10};
    else if(closest.includes(p)){const chase=flight?ball:carrier;goal={x:chase.x,y:chase.y+(p.pos==='DEF'?-2:1)};}
    else if(p.pos==='DEF')goal={x:p.baseX+(receiver.x-p.baseX)*.13,y:input.defensiveMode==='protect'?25:input.defensiveMode==='chase'?35:30};
    move(p,goal);
   }
   if(!flight){ball={x:carrier.x,y:carrier.y};
    if(dribble&&t>1){const tackler=closest.find(p=>distance(p,carrier)<1.9&&roll<(p.defense+.01)/(p.defense+carrier.speed+carrier.attack));if(tackler){blocked=true;defenderId=tackler.id;contact={time:t,point:toPoint(ball)};}}
    if(t>=releaseTime&&!contact){
     const defenders=defence.map(p=>p.y).sort((a,b)=>a-b),line=Math.min(50,ball.y,defenders[1]);
     offside=!dribble&&!long&&round(receiver.y)<round(line);
     release={time:t,source:toPoint(carrier),receiver:toPoint(receiver),line:round(team?100-line:line),defenders:defence.map(p=>({id:p.id,...toPoint(p)}))};
     if(dribble||long){contact={time:t,point:toPoint(carrier)};ball={x:carrier.x,y:carrier.y};}
     else{const speed=20+source.passing*.13,error=(roll-.5)*8*(1-source.passing/120),lead=clamp(distance(ball,receiver)/speed,.15,1.5),dx=receiverTarget.x-receiver.x,dy=receiverTarget.y-receiver.y,length=Math.hypot(dx,dy)||1,advance=Math.min(length,Math.hypot(receiver.vx,receiver.vy)*lead+2.5*lead*lead),aim={x:receiver.x+dx/length*advance+error,y:receiver.y+dy/length*advance},d=distance(ball,aim)||1;
      flight={vx:(aim.x-ball.x)/d*speed,vy:(aim.y-ball.y)/d*speed,age:0,duration:d/speed,height:0};}
    }
   }else{
    flight.age+=dt;ball={x:ball.x+flight.vx*dt,y:ball.y+flight.vy*dt};
    flight.height=wide?Math.max(0,Math.sin(Math.PI*clamp(flight.age/flight.duration,0,1)))*(action==='cross'?7:1):0;
    // Swept contact prevents a fast pass tunnelling through a defender.
    const contacts=world.filter(p=>p.id!==carrier.id&&p.pos!=='GK').map(p=>({p,...swept(last,ball,p)})).filter(c=>c.d<(c.p.team===team?2.6:1.1+c.p.defense*.011)&&flight.height<(c.p.team===team?2.8:1.6)).sort((a,b)=>a.t-b.t||a.p.id.localeCompare(b.p.id));
    const hit=contacts.find(c=>c.p.team!==team||c.p.id===receiver.id);
    if(hit){blocked=hit.p.team!==team;defenderId=blocked?hit.p.id:null;ball={x:hit.p.x,y:hit.p.y};contact={time:t,point:toPoint(ball)};}
    else if(flight.age>=flight.duration+.35){blocked=true;defenderId=closest[0]?.id||defence[0].id;contact={time:t,point:toPoint(ball)};}
   }
   capture(t);
  }
  if(!contact){blocked=true;defenderId=defence.find(p=>p.pos!=='GK').id;contact={time:8.5,point:toPoint(ball)};}
  const receive=!blocked&&!offside?{time:contact.time,point:{...contact.point}}:null;
  if(receive&&['through_ball','combination'].includes(action)){
   // Reception is followed by a real run with the ball, not an immediate shot
   // from a forward's starting slot. Fast, fresh players can separate from cover.
   const start=contact.time,steps=Math.min(18,85-Math.round(start/dt));
   for(let i=1;i<=steps;i++){
    const t=round(start+i*dt),near=defence.filter(p=>p.pos!=='GK').sort((a,b)=>distance(a,receiver)-distance(b,receiver)).slice(0,2);
    for(const p of world){const goal=p.id===receiver.id?{x:clamp(receiverTarget.x+(side==='left'?-6:6),24,76),y:22}:near.includes(p)?{x:receiver.x,y:receiver.y}:p.pos==='GK'?{x:clamp(receiver.x,43,57),y:10}:{x:p.baseX,y:p.baseY};move(p,goal);}
    ball={x:receiver.x,y:receiver.y};const tackler=near.find(p=>distance(p,receiver)<1.35);
    if(tackler){blocked=true;defenderId=tackler.id;ball={x:tackler.x,y:tackler.y};}
    contact={time:t,point:toPoint(ball)};capture(t);if(blocked)break;
   }
  }
  const point=contact.point,near=defence.filter(p=>p.pos!=='GK').reduce((n,p)=>n+(distance(p,ball)<8?1:0),0),goalY=team?100:0,shotDistance=Math.hypot((point.x-50)*.68,(point.y-goalY)*1.05);
  // Existing rating xG describes a typical open-play shot, around 30 pitch
  // metres. Adjust relative to that baseline rather than discounting it twice.
  const quality=round(clamp((1.5-shotDistance*.015)/(1+near*.07),.45,1.2));
  const receipt={version:1,sourceId:carrier.id,receiverId,blocked,offside,defenderId,release,receive,contact,quality};
  return {receipt,snapshots,releaseTime:release?.time||contact.time,receiveTime:receive?.time??null,contactTime:contact.time};
 }
 function sample(scene,time){const list=scene.snapshots;let i=1;while(i<list.length&&list[i].time<time)i++;const b=list[Math.min(i,list.length-1)],a=list[Math.max(0,i-1)],t=clamp((time-a.time)/(b.time-a.time||1),0,1),mix=(x,y)=>x+(y-x)*t;return {players:b.players.map((p,j)=>({id:p.id,x:mix(a.players[j].x,p.x),y:mix(a.players[j].y,p.y)})),ball:{x:mix(a.ball.x,b.ball.x),y:mix(a.ball.y,b.ball.y)},height:mix(a.height,b.height)};}
 const api={solve,sample,swept,dt};root.SpatialPlay=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
