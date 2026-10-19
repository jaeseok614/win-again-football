(function(root){
 'use strict';
 // Original rule11 geometry: eligibility never lets an ineligible trailer hide a real challenge.
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),W=68,H=105,POST=(W-7.32)/2;
 const direction=(w,t)=>(t===0?-1:1)*(w.half===1?1:-1);
 // Rule13 distinguishes a planted challenge from an overextended running tackle.
 // These are simulation distances; tactic names never alter the tackle probability.
 function tackler(w,owner,ball){
  let best=null,range=Infinity;
  for(const p of w.players){
   if(!p.active||p.team===owner.team||p.pos==='GK'||w.tick<p.tackleAt||w.version>=13&&p.cooldown)continue;
   const d=Math.hypot(p.x-ball.x,p.y-ball.y),ahead=(p.y-owner.y)*direction(w,owner.team)>=-.3;
   const reach=w.version>=13?1.45-clamp((Math.hypot(p.vx,p.vy)-2)*.12,0,.4):1.45;
   if(d>=reach||!ahead&&!(d<.85&&p.defense>=owner.attack+15))continue;
   if(d<range){range=d;best=p;}
  }return best;
 }

 function keeperTarget(w,p,reaction){
  const b=w.ball,goal=direction(w,p.team)<0?H:0,sign=goal===0?1:-1,range=Math.abs(b.y-goal),carrier=w.players.find(q=>q.active&&q.id===b.owner),threat=carrier&&carrier.team!==p.team&&range<30,shot=b.flight?.kind==='shot'&&b.flight.team!==p.team;
  let depth=threat?clamp(range*.18,1.1,4.2):2.7,x=34,y=goal+sign*depth;
  // Bisect the two post rays at the actual keeper plane, rather than tracking a fixed x fraction.
  const angleX=at=>{const left={x:POST-b.x,y:goal-b.y},right={x:W-POST-b.x,y:goal-b.y},a=Math.hypot(left.x,left.y)||1,c=Math.hypot(right.x,right.y)||1,dy=left.y/a+right.y/c;return Math.abs(dy)>.001?b.x+(at-b.y)/dy*(left.x/a+right.x/c):34;};
  if(shot){depth=clamp(Math.abs(p.y-goal),.8,4.5);y=goal+sign*depth;if(w.tick-b.flight.released>=reaction){const t=(y-b.y)/(b.vy||1);if(t>=0)x=b.x+b.vx*Math.min(2,t);else{x=b.x;y=b.y;}}else x=angleX(y);}
  else{x=angleX(y);if(threat&&Math.hypot(p.x-b.x,p.y-b.y)<2.6){x=b.x;y=b.y;}}
  return {target:{x:clamp(x,POST-.4,W-POST+.4),y:clamp(y,.2,H-.2)},sprint:!!(shot||threat)};
 }
 function setPieceSkill(p,kind){return Math.round(kind==='corner'?p.passing*.72+p.attack*.18+p.speed*.1:kind==='penalty'?p.attack*.85+p.passing*.15:p.attack*.48+p.passing*.47+p.speed*.05);}
 const api={tackler,keeperTarget,setPieceSkill};root.ContinuousDefending=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
