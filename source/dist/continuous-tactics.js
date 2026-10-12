(function(root){
 'use strict';
 // Original bounded team planning. Forecasts advise movement; contacts decide outcomes.
 const A=root.ContinuousDecision||(typeof require==='function'?require('./continuous-decision.js'):null);
 const W=68,H=105,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const direction=(w,t)=>(t===0?-1:1)*(w.half===1?1:-1),progress=(w,t,y)=>direction(w,t)<0?H-y:y,from=(w,t,p)=>direction(w,t)<0?H-p:p;
 const speed=p=>(4.7+p.speed*.036)*(.55+p.energy*.0045)*(.7+(p.burst??100)*.003)*p.focus;
 // Version5 forecasts mirror the physical integrator. One bounded path per ball
 // state serves both elevens; this cache is derived and never a saved outcome.
 const paths=new WeakMap();
 function path(w){
  const b=w.ball,key=[w.tick,b.x,b.y,b.z,b.vx,b.vy,b.vz].join(':'),cached=paths.get(w);if(cached?.key===key)return cached.points;
  let {x,y,z,vx,vy,vz}=b;const points=[];
  for(let i=0;i<32;i++){const decay=Math.exp(-(z>.05?.035:.32)*.1);vx*=decay;vy*=decay;x+=vx*.1;y+=vy*.1;
   if(z>0||vz>0){z+=vz*.1-.04905;vz-=.981;if(z<0){z=0;vz=Math.abs(vz)>.9?-vz*.3:0;}}
   points.push({x:clamp(x,.2,W-.2),y:clamp(y,.2,H-.2),z});
  }paths.set(w,{key,points});return points;
 }
 function meeting(w,p){
  const points=path(w),limit=speed(p),accel=2.4+p.speed*.027,height=p.pos==='GK'?2.6:w.ball.flight?.kind==='cross'?2.15:1.1;
  for(let i=0;i<points.length;i++){const q=points[i],time=(i+1)*.1,dx=q.x-p.x,dy=q.y-p.y,n=Math.hypot(dx,dy),initial=clamp((p.vx*dx+p.vy*dy)/(n||1),0,limit),ramp=Math.min(time,(limit-initial)/accel),reach=initial*ramp+accel*ramp*ramp/2+limit*(time-ramp)+.55;
   if(q.z<=height&&n<=reach)return {point:q,eta:time};
  }const point=points.at(-1);return {point,eta:3.2+distance(p,point)/Math.max(1,limit)};
 }
 function delivery(w,p,q,kind='pass'){
  const seconds=clamp(distance(p,q)/(12+p.passing*.06)*(kind==='cross'?.6:.4),.15,kind==='cross'?1:.75),dx=q.vx*seconds,dy=q.vy*seconds,n=Math.hypot(dx,dy),cap=kind==='cross'?5:3,scale=n>cap?cap/n:1;
  return {x:clamp(q.x+dx*scale,1,W-1),y:clamp(q.y+dy*scale,1,H-1)};
 }
 function outlet(w,p,carrier,opponents){
  const t=p.team,side=p.x<carrier.x?-1:p.x>carrier.x?1:direction(w,t),cp=progress(w,t,carrier.y),options=[[-5,side*9],[4,side*11],[-9,-side*7]];let best=null,value=-Infinity;
  for(const [dy,dx] of options){const q={x:clamp(carrier.x+dx,4,W-4),y:from(w,t,clamp(cp+dy,5,H-5))},free=Math.min(10,...opponents.map(d=>distance(d,q))),risk=laneRisk(w,carrier,q),cost=distance(p,q)*.035,score=free*.09-risk*.16-cost+(dy>0?.08:0);if(score>value){value=score;best=q;}}
  return best;
 }
 function forecast(w,seconds){if(w.version>=5)return path(w)[Math.min(31,Math.max(0,Math.ceil(seconds*10)-1))];const b=w.ball,drag=b.z>.05?.035:.32,f=(1-Math.exp(-drag*seconds))/drag;return {x:clamp(b.x+b.vx*f,.2,W-.2),y:clamp(b.y+b.vy*f,.2,H-.2),z:Math.max(0,b.z+b.vz*seconds-4.905*seconds*seconds)};}
 function intercept(w,p){
  if(w.version>=5&&!w.ball.owner)return meeting(w,p);
  let point={x:w.ball.x,y:w.ball.y},eta=distance(p,point)/Math.max(1,speed(p));
  if(w.ball.owner){const q=w.players.find(q=>q.id===w.ball.owner);if(q){if(w.version>=6)return A.meetCarrier(w,p,q,speed(p));point={x:clamp(q.x+q.vx*.25,1,W-1),y:clamp(q.y+q.vy*.25,1,H-1)};}return {point,eta:distance(p,point)/Math.max(1,speed(p))};}
  for(const time of [.2,.4,.7,1,1.4,1.9,2.6]){const q=forecast(w,time),reach=Math.max(0,speed(p)*time-.5)+.65;if(q.z>2.2||distance(p,q)>reach)continue;return {point:q,eta:time};}
  point=forecast(w,2.6);return {point,eta:2.6+distance(p,point)/Math.max(1,speed(p))};
 }
 function coach(w,base){const field=w.players.filter(p=>p.active&&p.team===1&&p.pos!=='GK'),energy=field.reduce((n,p)=>n+p.energy,0)/Math.max(1,field.length),minute=w.tick/600;
  if(minute>70&&w.score[1]<w.score[0])return energy<48?'counter':'press';
  if(minute>76&&w.score[1]>w.score[0])return 'lowBlock';
  if(w.version>=5&&base==='balanced'&&minute>25&&w.tactics?.[0]==='press'&&energy>55)return 'counter';
  if(w.version>=5&&base==='balanced'&&minute>20&&energy>68&&w.stats.passes[0]>40&&w.stats.completed[0]/w.stats.passes[0]>.68)return 'press';
  return base==='press'&&energy<58?'balanced':base;
 }
 function prepare(w){
  const carrier=w.players.find(p=>p.active&&p.id===w.ball.owner),last=w.players.find(p=>p.id===w.ball.lastTouch),team=carrier?.team??w.ball.flight?.team??(w.version>=4?w.controlledTeam:null)??last?.team??0;
  const signature=[w.half,...w.tactics,...w.focuses,w.ball.flight?.receiver||'',...w.players.filter(p=>p.active).map(p=>p.id),...(w.version>=5?[w.ball.owner||'',w.ball.flight?.released??'',w.ball.flight?.kind||'',w.ball.lastTouch||'']:[])].join(':');
  if(!w.ai)w.ai={builtAt:-5,ownerTeam:team,transitionTick:w.tick,signature:'',targets:[]};
  if(w.ai.ownerTeam!==team){w.ai.ownerTeam=team;w.ai.transitionTick=w.tick;w.ai.builtAt=-5;}
  if(w.tick-w.ai.builtAt<5&&w.ai.signature===signature)return w.ai.targets;
  const rows=[],active=w.players.filter(p=>p.active),flight=w.ball.flight,transition=w.tick-(w.version>=4?(w.transitionTick??-10000):w.ai.transitionTick)<(w.version>=4?40:70);
  for(const t of [0,1]){
   const own=team===t,tactic=w.tactics[t],at=progress(w,t,w.ball.y),field=active.filter(p=>p.team===t&&p.pos!=='GK'),opponents=active.filter(p=>p.team!==t),width=own?(tactic==='counter'?.9:1):(tactic==='lowBlock'?.62:tactic==='press'?.84:.72);
   const ranked=field.map(p=>({p,...intercept(w,p)})).sort((a,b)=>a.eta-b.eta||a.p.id.localeCompare(b.p.id));
   // Prefer a nearby midfielder to leave the last line covering the goal.
   if(!own&&tactic!=='press'&&ranked[0]?.p.pos==='DEF'){const cover=ranked.find(r=>r.p.pos!=='DEF'&&r.eta<=ranked[0].eta+.65);if(cover)ranked.splice(0,0,...ranked.splice(ranked.indexOf(cover),1));}
   const chasing=own?(w.ball.owner?[]:ranked.filter(r=>r.p.id===flight?.receiver).slice(0,1)):ranked.slice(0,tactic==='press'&&at>22&&field.length>7?2:1);
   if(own&&!w.ball.owner&&!chasing.length&&ranked[0])chasing.push(ranked[0]);
   if(w.version>=5&&own&&!w.ball.owner&&ranked[0]&&chasing[0]?.eta>ranked[0].eta+.4){chasing.length=0;chasing.push(ranked[0]);}
   const defenderLine=own?clamp(at-(tactic==='counter'?30:24),18,tactic==='lowBlock'?43:57):clamp(at-12,12,tactic==='press'?48:tactic==='lowBlock'?30:40);
   const backLine=opponents.map(p=>progress(w,t,p.y)).sort((a,b)=>b-a)[1]??H,legalLine=Math.max(H/2,at,backLine)-1.3;
   const threats=opponents.filter(p=>p.pos!=='GK').sort((a,b)=>progress(w,t,a.y)-progress(w,t,b.y)||a.id.localeCompare(b.id)),marked=new Set();
   for(const p of field){
    const position=p.role||p.pos,homeX=w.half===1?p.homeX:W-p.homeX,wideHome=Math.abs(homeX-W/2)>19,wideBall=Math.abs(w.ball.x-W/2)>20,near=distance(p,w.ball),line=position==='DEF'?defenderLine:position==='MID'?defenderLine+(own?14:12):own?clamp(at+15,57,98):Math.max(tactic==='counter'?54:38,defenderLine+24);
    let x=clamp(W/2+(homeX-W/2)*width+(w.ball.x-W/2)*.15,3,W-3),depth=line,sprint=false,role=own?'support':'cover';
    const chase=chasing.find(r=>r.p.id===p.id);
    if(chase){x=chase.point.x;depth=progress(w,t,chase.point.y)-.4;sprint=true;role=w.ball.owner?'press':'intercept';if(w.version>=6&&!own&&carrier&&chasing[1]?.p.id===p.id){const screen=A.screen(w,p,carrier,opponents);x=screen.x;depth=progress(w,t,screen.y);role='screen';sprint=distance(p,screen)>3&&p.burst>25;}}
    else if(p.id===carrier?.id){const close=opponents.filter(q=>q.pos!=='GK').sort((a,b)=>distance(a,p)-distance(b,p))[0],blocked=close&&distance(close,p)<3;
     x=clamp(p.x+(blocked?(p.x<close.x?-2:2):wideBall&&w.focuses[t]!=='cross'?(W/2-p.x)*.12:0),1,W-1);depth=progress(w,t,p.y)+(blocked?1.6:4);sprint=!blocked&&p.speed>65&&(tactic==='counter'&&transition||!close||distance(close,p)>5);role='carry';
     if(w.version>=6){const route=A.carrying(w,p,opponents);x=route.x;depth=progress(w,t,route.y);sprint=route.sprint;}
    }else if(own&&carrier){
     const cp=progress(w,t,carrier.y),side=homeX<W/2?-1:homeX>W/2?1:w.version>=5?direction(w,t):1;
     if(position==='MID'&&near<25){x=clamp(carrier.x+side*10,5,W-5);depth=cp+(p.homeX< W/2?-6:4);role='support';}
     if(position==='FW'){depth=clamp(cp+(tactic==='counter'&&transition?22:15),57,98);x=wideBall&&cp>70?W/2+side*5:clamp(homeX+(W/2-homeX)*.1,8,W-8);role='run';sprint=transition&&tactic==='counter'||w.version>=4&&cp>60&&near<25&&p.energy>40;}
     if(wideHome&&w.focuses[t]==='cross'&&position!=='DEF'){x=homeX<W/2?5:W-5;depth=cp+8;}
     if(position==='DEF'&&wideHome&&Math.sign(homeX-W/2)===Math.sign(carrier.x-W/2)&&tactic!=='counter'&&tactic!=='lowBlock'&&wideBall&&cp>56){depth=Math.min(85,cp+6);x=homeX<W/2?4:W-4;role='overlap';sprint=p.energy>60&&near<20;}
     if(w.version>=5){
      if(position==='MID'&&near<28&&!(wideHome&&w.focuses[t]==='cross')){const pocket=outlet(w,p,carrier,opponents);x=pocket.x;depth=progress(w,t,pocket.y);}
      if(w.lastPass?.from===p.id&&w.lastPass.team===t&&w.tick-w.lastPass.tick<45&&position!=='DEF'){depth=cp+8;x=clamp(carrier.x+(p.x<carrier.x?-8:p.x>carrier.x?8:direction(w,t)*8),5,W-5);role='return-run';sprint=p.energy>45&&near<22;}
     }
     if(!flight&&position!=='DEF')depth=Math.min(depth,legalLine);
    }else if(!own&&position==='DEF'){
     const threat=threats.filter(q=>!marked.has(q.id)&&Math.abs(q.x-homeX)<18&&Math.abs(progress(w,t,q.y)-defenderLine)<20).sort((a,b)=>distance(p,a)-distance(p,b)||a.id.localeCompare(b.id))[0];
     if(threat){marked.add(threat.id);x=clamp(threat.x+(W/2-threat.x)*.08,homeX-11,homeX+11);depth=Math.min(defenderLine+8,Math.max(w.version>=4?1.5:8,progress(w,t,threat.y)-1.2));role='mark';}
    }
    if(w.version>=6&&!own&&!chase&&position==='MID'&&at<40&&near<28){x=clamp(x*.65+w.ball.x*.35,homeX-12,homeX+12);depth=Math.min(depth,at-6);role='goal-cover';}
    if(w.version>=5&&p.id===carrier?.id&&w.tick-(p.receptionAt??-10000)<6){x=p.x;depth=progress(w,t,p.y);sprint=false;role='first-touch';}
    if(w.version>=4&&!own&&!chase){const goalSide=progress(w,t,p.y)-depth;sprint=(goalSide>3&&(at<40||transition))||(role==='mark'&&goalSide>1.5&&at<35);}
    rows.push({id:p.id,x:clamp(x,1,W-1),y:from(w,t,clamp(depth,1,H-1)),sprint,role});
   }
  }
  w.ai.builtAt=w.tick;w.ai.signature=signature;w.ai.targets=rows;return rows;
 }
 function laneRisk(w,p,q,excludeKeeper=false){let risk=0;const dx=q.x-p.x,dy=q.y-p.y,n=dx*dx+dy*dy||1,travel=Math.sqrt(n)/(12+p.passing*.06);for(const d of w.players){if(!d.active||d.team===p.team||excludeKeeper&&d.pos==='GK')continue;const f=clamp(((d.x-p.x)*dx+(d.y-p.y)*dy)/n,0,1);if(f<.06||f>.97)continue;const point={x:p.x+dx*f,y:p.y+dy*f},arrival=distance(d,point)/Math.max(1,speed(d))+.18;if(arrival<travel*f+.18)risk+=1;else if(distance(d,point)<2)risk+=.5;}return risk;}
 function choose(w,p){
  if(w.version>=6)return A.choose(w,p,{laneRisk});
  const opponents=w.players.filter(q=>q.active&&q.team!==p.team),near=opponents.reduce((n,q)=>q.pos==='GK'?n:Math.min(n,distance(p,q)),Infinity),goal=direction(w,p.team)<0?0:H,d=Math.abs(goal-p.y),wide=Math.abs(p.x-W/2)>20,focus=w.focuses[p.team],line=Math.max(H/2,progress(w,p.team,w.ball.y),opponents.map(q=>progress(w,p.team,q.y)).sort((a,b)=>b-a)[1]??H);
  const angle=Math.abs(Math.atan2(37.66-p.x,Math.max(1,d))-Math.atan2(30.34-p.x,Math.max(1,d))),quality=(.015+Math.exp(-d/15)*angle*.42*(.6+p.attack*.008))*(near<2?.65:1);
  let best={kind:'carry',value:near<3?.035:focus==='dribble'?.13:.11,receiver:null};
  if(p.pos!=='GK'&&d<30&&!wide&&quality>=(w.version>=4?(p.pos==='FW'?.11:.15):(p.pos==='FW'?.14:.19))){const shot={kind:'shot',value:quality+(w.version>=4&&d<16?.05:0)-(near<2?(w.version>=4?.035:.07):near<4?(w.version>=4?.015:.025):0)-laneRisk(w,p,{x:34,y:goal},w.version>=4)*(w.version>=4?.035:.055),receiver:null};if(shot.value>best.value)best=shot;}
  for(const q of w.players){if(!q.active||q.team!==p.team||q.id===p.id)continue;const range=distance(p,q),gain=progress(w,p.team,q.y)-progress(w,p.team,p.y);if(range<4||range>45||progress(w,p.team,q.y)>line+.05)continue;
   const free=Math.min(8,opponents.reduce((n,a)=>Math.min(n,distance(a,q)),Infinity)),risk=laneRisk(w,p,q),repeat=w.lastPass?.from===q.id&&w.tick-w.lastPass.tick<70?.08:0;
   const pass={kind:'pass',receiver:q,value:.04+gain*.007+free*.009-risk*(w.version>=5?.12:.075)-repeat+(focus==='combination'?.035:0)+(w.tactics[p.team]==='counter'&&gain>10&&(w.version<4||w.tick-(w.transitionTick??-10000)<40&&risk<1)?.06:0)+(near<3?.065:0)};
   if(p.pos==='GK')pass.value+=.25;if(pass.value>best.value)best=pass;
   if(wide&&d<30&&q.pos!=='GK'&&progress(w,p.team,q.y)>H-25&&Math.abs(q.x-W/2)<15){const cross={kind:'cross',receiver:q,value:.10+q.attack*.001-risk*.02+(focus==='cross'?.075:0)-(focus==='dribble'?.12:0)};if(cross.value>best.value)best=cross;}
  }return best;
 }
 const api={forecast,intercept,coach,prepare,choose,laneRisk,speed,delivery};root.ContinuousTactics=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
