(function(root){
 'use strict';
 // Original rule10 geometry. Concepts studied in WebSoccer / Touchlines; no copied code.
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function laneRisk(w,p,q,speed,{shot=false}={}){
  const dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy);if(length<.01)return 0;
  const drag=shot||length>32?.035:.32,flight=length/(shot?20+p.attack*.1:12+p.passing*.06),launch=drag*length/(1-Math.exp(-drag*flight));let risk=0;
  for(const d of w.players){if(!d.active||d.team===p.team||shot&&d.pos==='GK')continue;
   const f=clamp(((d.x-p.x)*dx+(d.y-p.y)*dy)/(length*length),0,1);if(f<.06||f>.97)continue;
   const x=p.x+dx*f,y=p.y+dy*f,n=Math.hypot(x-d.x,y-d.y),time=-Math.log(Math.max(.001,1-drag*length*f/launch))/drag,limit=speed(d),a=2.4+d.speed*.027,initial=clamp(((x-d.x)*d.vx+(y-d.y)*d.vy)/(n||1),-limit,limit),ramp=Math.min(time,Math.max(0,(limit-initial)/a)),reach=Math.max(0,initial*ramp+a*ramp*ramp/2+limit*(time-ramp));
   // A defender must physically arrive; standing near an infinite-speed ray is insufficient.
   risk+=clamp((reach+(shot?.8:.65)-n)/1.3+.5,0,1);
  }return risk;
 }
 function support(w,p,carrier,anchor,base,legal,risk){
  const dir=(p.team===0?-1:1)*(w.half===1?1:-1),progress=y=>dir<0?105-y:y,from=v=>dir<0?105-v:v,anchorDepth=progress(anchor.y),depth=progress(base.y),side=Math.sign(anchor.x-carrier.x)||dir;
  let best=base,value=-Infinity;
  for(const sx of [0,-4*side,4*side])for(const sy of [0,-3,3]){
   const point={x:clamp(base.x+sx,Math.max(3,anchor.x-7),Math.min(65,anchor.x+7)),y:from(clamp(Math.min(legal,depth+sy),Math.max(2,anchorDepth-10),Math.min(103,anchorDepth+10)))};
   // Exclude self/carrier from crowding; two support depths remain independently staggered.
   let free=9,friendly=8;for(const q of w.players){if(!q.active||q.id===p.id||q.id===carrier.id)continue;const d=Math.hypot(q.x-point.x,q.y-point.y);if(q.team===p.team)friendly=Math.min(friendly,d);else free=Math.min(free,d);}
   const score=free*.22-Math.max(0,5-friendly)*.45-risk(w,carrier,point)*2.4-Math.hypot(point.x-p.x,point.y-p.y)*.035-Math.hypot(point.x-base.x,point.y-base.y)*.055;
   if(score>value+1e-10){value=score;best=point;}
  }return best;
 }
 const api={laneRisk,support};root.ContinuousOptions=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
