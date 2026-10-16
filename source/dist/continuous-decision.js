(function(root){
 'use strict';
 // Version6: local space and genuine attacking options, with no scheduled shots.
 const W=68,H=105,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const direction=(w,t)=>(t===0?-1:1)*(w.half===1?1:-1),progress=(w,t,y)=>direction(w,t)<0?H-y:y;
 function carrying(w,p,opponents){
  const dir=direction(w,p.team),wide=Math.abs(p.x-W/2)>20,cross=w.focuses[p.team]==='cross',near=Math.min(Infinity,...opponents.filter(q=>q.pos!=='GK').map(q=>distance(p,q))),routes=[];
  for(const offset of [0,-3*dir,3*dir]){const x=clamp(p.x+offset+(wide&&!cross?(W/2-p.x)*.08:0),1.2,W-1.2),y=clamp(p.y+dir*(near<2?2.4:4),1.2,H-1.2),dx=x-p.x,dy=y-p.y,length=dx*dx+dy*dy||1;let space=8;
   for(const q of opponents){if(q.pos==='GK')continue;const qx=q.x+q.vx*.35,qy=q.y+q.vy*.35,f=clamp(((qx-p.x)*dx+(qy-p.y)*dy)/length,.25,1),d=Math.hypot(qx-(p.x+dx*f),qy-(p.y+dy*f));space=Math.min(space,d);}
   routes.push({x,y,space,value:Math.min(6,space)*.12-Math.abs(offset)*.01});
  }
  const route=routes.reduce((a,b)=>b.value>a.value?b:a);return {...route,near,sprint:route.space>3&&near>3&&p.energy>40&&(p.speed>62||w.tactics[p.team]==='counter'&&w.tick-(w.transitionTick??-10000)<(w.version>=11?90:40))};
 }
 function meetCarrier(w,p,carrier,limit){
  let point={x:carrier.x,y:carrier.y},eta=distance(p,point)/Math.max(1,limit);
  for(const time of [.4,.7,1,1.4,1.8]){const q={x:clamp(carrier.x+carrier.vx*time,1,W-1),y:clamp(carrier.y+carrier.vy*time,1,H-1)},n=distance(p,q),dx=q.x-p.x,dy=q.y-p.y,initial=clamp((p.vx*dx+p.vy*dy)/(n||1),0,limit),accel=2.4+p.speed*.027,ramp=Math.min(time,(limit-initial)/accel),reach=initial*ramp+accel*ramp*ramp/2+limit*(time-ramp)+.65;point=q;eta=time+Math.max(0,n-reach)/Math.max(1,limit);if(n<=reach)break;}
  return {point,eta};
 }
 function screen(w,p,carrier,opponents){
  const threat=opponents.filter(q=>q.pos!=='GK'&&q.id!==carrier.id&&distance(q,carrier)<24).sort((a,b)=>progress(w,p.team,a.y)-progress(w,p.team,b.y)||a.id.localeCompare(b.id))[0],dir=direction(w,p.team);
  return threat?{x:clamp(carrier.x*.6+threat.x*.4,2,W-2),y:clamp(carrier.y*.6+threat.y*.4-dir*1.5,2,H-2)}:{x:clamp(carrier.x+(p.x<carrier.x?-3.5:p.x>carrier.x?3.5:dir*3.5),2,W-2),y:clamp(carrier.y-dir*4,2,H-2)};
 }
 function shotQuality(w,p,opponents){const d=Math.abs((direction(w,p.team)<0?0:H)-p.y),angle=Math.abs(Math.atan2(37.66-p.x,Math.max(1,d))-Math.atan2(30.34-p.x,Math.max(1,d))),near=Math.min(Infinity,...opponents.filter(q=>q.pos!=='GK').map(q=>distance(p,q)));return {d,near,quality:(.015+Math.exp(-d/15)*angle*.42*(.6+p.attack*.008))*(near<2?.65:1)};}
 function choose(w,p,{laneRisk,delivery}){
  const opponents=w.players.filter(q=>q.active&&q.team!==p.team),at=progress(w,p.team,p.y),wide=Math.abs(p.x-W/2)>20,focus=w.focuses[p.team],route=carrying(w,p,opponents),shot=shotQuality(w,p,opponents),line=Math.max(H/2,progress(w,p.team,w.ball.y),opponents.map(q=>progress(w,p.team,q.y)).sort((a,b)=>b-a)[1]??H);
  const spaceValue=route.near<2?.045:route.space<1.8?.075:.11+Math.min(6,route.space)*.013;
  let best={kind:'carry',value:spaceValue+(w.version>=8&&p.pos!=='GK'&&route.space>3&&route.near>3?.045:0)+(focus==='dribble'?.035:0)-(p.energy<30?.015:0),receiver:null};
  if(p.pos!=='GK'&&shot.d<29&&!wide&&shot.quality>((p.role||p.pos)==='FW'?(w.version>=10?.055:.09):(w.version>=10?.075:.12))){
   const value=shot.quality*(w.version>=10?1.8:1.6)+(w.version>=10?.11:.09)+(shot.d<18?(w.version>=10?.045:.04):(w.version>=10?.025:.02))+(route.space<2?.025:0)-laneRisk(w,p,{x:34,y:direction(w,p.team)<0?0:H},true)*.027;
   if(value>best.value)best={kind:'shot',value,receiver:null};
  }
  for(const q of w.players){if(!q.active||q.team!==p.team||q.id===p.id)continue;const range=distance(p,q),gain=progress(w,p.team,q.y)-at;if(range<4||range>42||progress(w,p.team,q.y)>line+.05)continue;
   const rushing=w.version>=11&&w.tactics[p.team]==='counter'&&w.tick-(w.transitionTick??-10000)<90&&(q.role||q.pos)==='FW'&&gain>8,target=rushing&&delivery?delivery(w,p,q):q,free=Math.min(8,...opponents.map(a=>distance(rushing?{x:a.x+a.vx*.35,y:a.y+a.vy*.35}:a,target))),risk=laneRisk(w,p,target),repeat=w.lastPass?.from===q.id&&w.tick-w.lastPass.tick<100?.075:0,qShot=shotQuality(w,q,opponents),creates=q.pos!=='GK'&&qShot.d<25&&Math.abs(q.x-W/2)<17?Math.min(.14,qShot.quality*.75)+.035:0;
   const direct=rushing&&gain>10&&free>3&&risk<.8;
   const value=.045+gain*(direct?.006:.004)+free*.007-risk*(direct?.10:.13)-repeat+creates+(focus==='combination'?.025:0)+(route.near<3?.08:0)+(w.version>=10&&gain>4&&free>3&&risk<.5?.04+Math.min(18,gain)*.003:0)+(w.tactics[p.team]==='counter'&&gain>10&&w.tick-(w.transitionTick??-10000)<(w.version>=11?90:40)&&risk<1?.04:0)+(p.pos==='GK'?.3:0)+(w.version>=7&&w.tactics[p.team]==='lowBlock'&&w.tick-(w.transitionTick??-10000)<(w.version>=11?90:40)&&gain>10&&q.pos==='FW'&&risk<1?.055:0);
   if(value>best.value)best={kind:'pass',receiver:q,value};
   if(wide&&shot.d<28&&q.pos!=='GK'&&progress(w,p.team,q.y)>H-24&&Math.abs(q.x-W/2)<15){const value=.14+q.attack*.001-risk*.027+(focus==='cross'?.10:0)-(focus==='dribble'?.07:0);if(value>best.value)best={kind:'cross',receiver:q,value};}
  }
  return best;
 }
 const api={carrying,meetCarrier,screen,choose,shotQuality};root.ContinuousDecision=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
