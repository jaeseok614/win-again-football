(function(root){
 'use strict';
 // Stadium art is cached separately from the 22 moving players. It never reads
 // or consumes the campaign RNG; promotion changes only the ground's appearance.
 function createRenderer(makeCanvas){
  let surface=null,key='',matchSurface=null,matchKey='';
  function draw(ctx,w,h,dpr,division=5,simple=false){
   if(!(w>0&&h>0&&dpr>0))return;
   division=Number.isInteger(division)&&division>=1&&division<=5?division:5;
   const next=[Math.round(w*dpr),Math.round(h*dpr),dpr,division,simple].join(':');
   if(!surface)surface=makeCanvas();
   if(key!==next){
    surface.width=Math.round(w*dpr);surface.height=Math.round(h*dpr);
    const paint=surface.getContext('2d');paint.setTransform(dpr,0,0,dpr,0,0);
    const colors=simple?['#194a39','#1c4c3c']:division>=4?['#1b4235','#203f34']:['#194b3b','#164334'];
    for(let i=0;i<10;i++){paint.fillStyle=colors[i%2];paint.fillRect(0,i*h/10,w,h/10);}
    if(!simple&&division>=4){paint.fillStyle='#9b965419';for(let i=0;i<24;i++){const x=w*(.1+((i*37)%79)/100),y=h*(.1+((i*29)%77)/100);paint.beginPath();paint.ellipse(x,y,w*(.008+i%3*.002),h*.009,0,0,Math.PI*2);paint.fill();}}
    const glow=paint.createRadialGradient(w*.5,h*.35,0,w*.5,h*.4,w*.9);glow.addColorStop(0,'#476b5720');glow.addColorStop(1,'#06111b30');paint.fillStyle=glow;paint.fillRect(0,0,w,h);
    // Small crowds along the touchline become fuller in the higher divisions.
    const crowd=division===5?18:division===4?26:division===3?34:division===2?42:52;
    if(!simple)for(const side of [0,1])for(let i=0;i<crowd;i++){paint.fillStyle=['#82908388','#8190a177','#bdb79588','#6d806b88'][i%4];paint.fillRect(w*(.08+.84*i/crowd),h*(side===1?0.973:0.017),Math.max(1,w*.006),Math.max(1,h*.009));}
    paint.strokeStyle='#d5e1dd50';paint.lineWidth=.6;
    for(const gy of [.02,.94]){paint.strokeRect(w*.43,h*gy,w*.14,h*.04);for(let j=1;j<5;j++){paint.beginPath();paint.moveTo(w*(.43+j*.028),h*gy);paint.lineTo(w*(.43+j*.028),h*(gy+.04));paint.stroke();}}
    paint.strokeStyle=simple?'#aecdbc48':'#c9dbbe90';paint.lineWidth=simple?1:1.4;paint.strokeRect(w*.06,h*.06,w*.88,h*.88);
    paint.beginPath();paint.moveTo(w*.06,h*.5);paint.lineTo(w*.94,h*.5);paint.stroke();
    paint.beginPath();paint.arc(w*.5,h*.5,w*.12,0,Math.PI*2);paint.stroke();
    paint.strokeRect(w*.28,h*.06,w*.44,h*.16);paint.strokeRect(w*.28,h*.78,w*.44,h*.16);
    paint.strokeRect(w*.39,h*.06,w*.22,h*.07);paint.strokeRect(w*.39,h*.87,w*.22,h*.07);
    key=next;
   }
   ctx.drawImage(surface,0,0,w,h);
  }
  function drawMatch(ctx,w,h,dpr,division=5,simple=true){
   if(!(w>0&&h>0&&dpr>0))return;division=Number.isInteger(division)&&division>=1&&division<=5?division:5;
   const next=[Math.round(w*dpr),Math.round(h*dpr),dpr,division,simple].join(':');if(!matchSurface)matchSurface=makeCanvas();
   if(matchKey!==next){matchSurface.width=Math.round(w*dpr);matchSurface.height=Math.round(h*dpr);const p=matchSurface.getContext('2d');p.setTransform(dpr,0,0,dpr,0,0);const X=x=>w*(.06+x/105*.88),Y=y=>h*(.06+y/68*.88),sx=w*.88/105,sy=h*.88/68;
    for(let i=0;i<10;i++){p.fillStyle=i%2?'#1c4c3c':'#194a39';p.fillRect(i*w/10,0,w/10,h);}p.strokeStyle=simple?'#aecdbc48':'#c9dbbe90';p.lineWidth=simple?1:1.4;
    p.strokeRect(X(0),Y(0),105*sx,68*sy);p.beginPath();p.moveTo(X(52.5),Y(0));p.lineTo(X(52.5),Y(68));p.stroke();p.beginPath();p.ellipse(X(52.5),Y(34),9.15*sx,9.15*sy,0,0,Math.PI*2);p.stroke();
    for(const end of [0,105]){const sign=end===0?1:-1;p.strokeRect(X(end===0?0:105-16.5),Y(13.84),16.5*sx,40.32*sy);p.strokeRect(X(end===0?0:105-5.5),Y(24.84),5.5*sx,18.32*sy);p.beginPath();p.arc(X(end+sign*11),Y(34),Math.max(1,.12*Math.min(sx,sy)),0,Math.PI*2);p.stroke();
     p.strokeStyle='#d5e1dd50';const gx=X(end===0?-2:105),gy=Y(30.34);p.strokeRect(gx,gy,2*sx,7.32*sy);for(let j=1;j<5;j++){p.beginPath();p.moveTo(gx,gy+j*7.32*sy/5);p.lineTo(gx+2*sx,gy+j*7.32*sy/5);p.stroke();}p.strokeStyle=simple?'#aecdbc48':'#c9dbbe90';}
    matchKey=next;
   }ctx.drawImage(matchSurface,0,0,w,h);
  }
  return {draw,drawMatch};
 }
 function createMeasurer(Observer,onResize=()=>{}){
  const sizes=new WeakMap(),observer=Observer?new Observer(entries=>{for(const entry of entries){const value=sizes.get(entry.target);if(value){value.width=entry.contentRect.width;value.height=entry.contentRect.height;}}onResize();}):null;
  return function measure(canvas,viewport=''){
   let value=sizes.get(canvas);
   if(!observer||!value||value.viewport!==viewport||!value.width){const rect=canvas.getBoundingClientRect(),first=!value;value={width:rect.width,height:rect.height,viewport};sizes.set(canvas,value);if(first&&observer)observer.observe(canvas);}
   return value;
  };
 }
 const api={createRenderer,createMeasurer};if(typeof module!=='undefined')module.exports=api;
 if(root.document?.createElement)root.PitchArt={...api,...createRenderer(()=>root.document.createElement('canvas')),measure:createMeasurer(root.ResizeObserver,()=>{if(typeof drawField==='function'&&typeof view==='string'&&view==='match'&&!root.document.hidden)drawField();})};
})(typeof window!=='undefined'?window:globalThis);

