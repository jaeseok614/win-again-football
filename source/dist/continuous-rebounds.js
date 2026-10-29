(function(root){
 'use strict';
 // Rule12 only: physical blocks and goalkeeper rebounds.
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function block(ball,p,centre=p){
  const speed=Math.hypot(ball.vx,ball.vy),dx=ball.x-centre.x,dy=ball.y-centre.y,n=Math.hypot(dx,dy),nx=n>.00001?dx/n:-ball.vx/(speed||1),ny=n>.00001?dy/n:-ball.vy/(speed||1),normal=ball.vx*nx+ball.vy*ny;
  let vx=(ball.vx-1.35*Math.min(0,normal)*nx)*.75+(p.vx||0)*.12,vy=(ball.vy-1.35*Math.min(0,normal)*ny)*.75+(p.vy||0)*.12;
  const out=Math.hypot(vx,vy),cap=speed*.8+1,scale=out>cap?cap/out:1;
  ball.vx=vx*scale;ball.vy=vy*scale;ball.vz=clamp(Math.abs(ball.vz)*.3+.65,.65,3.2);
 }
 function parry(ball,p,tie){
  const speed=Math.hypot(ball.vx,ball.vy),side=Math.abs(ball.x-34)>.15?Math.sign(ball.x-34):Math.abs(ball.vx)>.1?Math.sign(ball.vx):tie<.5?-1:1;
  ball.vx=side*clamp(speed*.58,4,17)+ball.vx*.12;
  ball.vy=ball.vy*.32+(p.vy||0)*.12;
  ball.vz=clamp(Math.abs(ball.vz)*.22+1.2,1.2,3.5);
 }
 const api={block,parry};root.ContinuousRebounds=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
