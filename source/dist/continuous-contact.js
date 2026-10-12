(function(root){
 'use strict';
 // Original rule4 CCD: moving discs, swept goal cylinders and whole-ball boundaries.
 // Metres; z is the lift of the ball's bottom above the pitch. No RNG or DOM work.
 const R=.11,BODY=.32,POST=.06,W=68,H=105,LEFT=(W-7.32)/2;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function entry(a,b,c,d,r,height=Infinity){
  const x=a.x-c.x,y=a.y-c.y,dx=b.x-a.x-d.x+c.x,dy=b.y-a.y-d.y+c.y,A=dx*dx+dy*dy,B=2*(x*dx+y*dy),C=x*x+y*y-r*r;
  let lo=0,hi=1;
  if(A<1e-14){if(C>1e-10)return null;}
  else{const disc=B*B-4*A*C;if(disc<0)return null;const q=Math.sqrt(Math.max(0,disc));lo=Math.max(0,(-B-q)/(2*A));hi=Math.min(1,(-B+q)/(2*A));if(lo>hi+1e-10)return null;}
  const z=a.z||0,dz=(b.z||0)-z;
  if(dz>1e-12)hi=Math.min(hi,(height-z)/dz);else if(dz<-1e-12)lo=Math.max(lo,(height-z)/dz);else if(z>height)return null;
  return lo<=hi+1e-10&&lo<=1&&hi>=0?clamp(lo,0,1):null;
 }
 function boundary(a,b){
  let result=null;for(const [axis,limit,side] of [['x',-R,'left'],['x',W+R,'right'],['y',-R,'top'],['y',H+R,'bottom']]){
   const outward=limit<0?b[axis]<limit:b[axis]>limit;if(!outward)continue;
   const t=clamp((limit-a[axis])/(b[axis]-a[axis]||1),0,1);
   if(!result||t<result.t)result={t,axis,side,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:(a.z||0)+((b.z||0)-(a.z||0))*t};
  }return result;
 }
 function frame(a,b){
  let best=null;const offer=(t,n,kind)=>{if(t===null)return;const dot=(b.x-a.x)*(n.x||0)+(b.y-a.y)*(n.y||0)+((b.z||0)-(a.z||0))*(n.z||0);if(dot>=-1e-10)return;if(!best||t<best.t)best={t,normal:n,kind};};
  for(const y of [0,H]){
   for(const x of [LEFT-POST,W-LEFT+POST]){
    const c={x,y},t=entry(a,b,c,c,R+POST,2.44);if(t===null)continue;const nx=a.x+(b.x-a.x)*t-x,ny=a.y+(b.y-a.y)*t-y,n=Math.hypot(nx,ny)||1;offer(t,{x:nx/n,y:ny/n,z:0},'post');
   }
   const c={x:y,y:2.44+POST},u={x:a.y,y:(a.z||0)+R},v={x:b.y,y:(b.z||0)+R},t=entry(u,v,c,c,R+POST);
   if(t!==null){const x=a.x+(b.x-a.x)*t;if(x>=LEFT-POST&&x<=W-LEFT+POST){const ny=u.x+(v.x-u.x)*t-y,nz=u.y+(v.y-u.y)*t-c.y,n=Math.hypot(ny,nz)||1;offer(t,{x:0,y:ny/n,z:nz/n},'bar');}}
  }return best;
 }
 function reflect(ball,n){const dot=ball.vx*n.x+ball.vy*n.y+ball.vz*n.z;ball.vx-=1.72*dot*n.x;ball.vy-=1.72*dot*n.y;ball.vz-=1.72*dot*n.z;}
 function goal(crossing){return crossing.axis==='y'&&crossing.x>LEFT+R&&crossing.x<W-LEFT-R&&crossing.z+2*R<2.44;}
 function bodies(players){
  const active=players.filter(p=>p.active),r=2*BODY;
  // Two bounded passes resolve chains; initial overlap is separated before paths.
  for(let round=0;round<2;round++)for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
   const p=active[i],q=active[j];if(Math.max(p.prevX,p.x)+r<Math.min(q.prevX,q.x)||Math.max(q.prevX,q.x)+r<Math.min(p.prevX,p.x)||Math.max(p.prevY,p.y)+r<Math.min(q.prevY,q.y)||Math.max(q.prevY,q.y)+r<Math.min(p.prevY,p.y))continue;const a={x:p.prevX,y:p.prevY},b={x:q.prevX,y:q.prevY},t=entry(a,p,b,q,r);if(t===null)continue;
   let nx=a.x+(p.x-a.x)*t-b.x-(q.x-b.x)*t,ny=a.y+(p.y-a.y)*t-b.y-(q.y-b.y)*t,n=Math.hypot(nx,ny);if(n<1e-8){nx=p.id<q.id?-1:1;ny=0;n=1;}nx/=n;ny/=n;
   const closing=(p.x-a.x-q.x+b.x)*nx+(p.y-a.y-q.y+b.y)*ny;
   if(closing<0){const correction=-closing*(1-t)/2;p.x+=nx*correction;p.y+=ny*correction;q.x-=nx*correction;q.y-=ny*correction;const v=(p.vx-q.vx)*nx+(p.vy-q.vy)*ny;if(v<0){p.vx-=v*nx/2;p.vy-=v*ny/2;q.vx+=v*nx/2;q.vy+=v*ny/2;}}
   const separation=Math.hypot(p.x-q.x,p.y-q.y);if(separation<r){const push=(r-separation+1e-6)/2;p.x+=nx*push;p.y+=ny*push;q.x-=nx*push;q.y-=ny*push;}
   for(const k of [p,q]){k.x=clamp(k.x,.15,W-.15);k.y=clamp(k.y,.15,H-.15);}
  }
 }
 const api={R,BODY,entry,boundary,frame,reflect,goal,bodies};root.ContinuousContact=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
