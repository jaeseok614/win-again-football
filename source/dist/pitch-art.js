(function(root){
 'use strict';
 // Stadium art is cached separately from the 22 moving players. It never reads
 // or consumes the campaign RNG; promotion changes only the ground's appearance.
 function createRenderer(makeCanvas){
  let surface=null,key='';
  function draw(ctx,w,h,dpr,division=5){
   division=Number.isInteger(division)&&division>=1&&division<=5?division:5;
   const next=[Math.round(w*dpr),Math.round(h*dpr),dpr,division].join(':');
   if(!surface)surface=makeCanvas();
   if(key!==next){
    surface.width=Math.round(w*dpr);surface.height=Math.round(h*dpr);
    const paint=surface.getContext('2d');paint.setTransform(dpr,0,0,dpr,0,0);
    const colors=division>=4?['#1b4235','#203f34']:['#194b3b','#164334'];
    for(let i=0;i<10;i++){paint.fillStyle=colors[i%2];paint.fillRect(0,i*h/10,w,h/10);}
    if(division>=4){paint.fillStyle='#9b965419';for(let i=0;i<24;i++){const x=w*(.1+((i*37)%79)/100),y=h*(.1+((i*29)%77)/100);paint.beginPath();paint.ellipse(x,y,w*(.008+i%3*.002),h*.009,0,0,Math.PI*2);paint.fill();}}
    const glow=paint.createRadialGradient(w*.5,h*.35,0,w*.5,h*.4,w*.9);glow.addColorStop(0,'#476b5720');glow.addColorStop(1,'#06111b30');paint.fillStyle=glow;paint.fillRect(0,0,w,h);
    // Small crowds along the touchline become fuller in the higher divisions.
    const crowd=division===5?18:division===4?26:division===3?34:division===2?42:52;
    for(const side of [0,1])for(let i=0;i<crowd;i++){paint.fillStyle=['#82908388','#8190a177','#bdb79588','#6d806b88'][i%4];paint.fillRect(w*(.08+.84*i/crowd),h*(side===1?0.973:0.017),Math.max(1,w*.006),Math.max(1,h*.009));}
    paint.strokeStyle='#d5e1dd50';paint.lineWidth=.6;
    for(const gy of [.02,.94]){paint.strokeRect(w*.43,h*gy,w*.14,h*.04);for(let j=1;j<5;j++){paint.beginPath();paint.moveTo(w*(.43+j*.028),h*gy);paint.lineTo(w*(.43+j*.028),h*(gy+.04));paint.stroke();}}
    paint.strokeStyle='#c9dbbe90';paint.lineWidth=1.4;paint.strokeRect(w*.06,h*.06,w*.88,h*.88);
    paint.beginPath();paint.moveTo(w*.06,h*.5);paint.lineTo(w*.94,h*.5);paint.stroke();
    paint.beginPath();paint.arc(w*.5,h*.5,w*.12,0,Math.PI*2);paint.stroke();
    paint.strokeRect(w*.28,h*.06,w*.44,h*.16);paint.strokeRect(w*.28,h*.78,w*.44,h*.16);
    paint.strokeRect(w*.39,h*.06,w*.22,h*.07);paint.strokeRect(w*.39,h*.87,w*.22,h*.07);
    key=next;
   }
   ctx.drawImage(surface,0,0,w,h);
  }
  return {draw};
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
 if(root.document?.createElement)root.PitchArt={...createRenderer(()=>root.document.createElement('canvas')),measure:createMeasurer(root.ResizeObserver,()=>{if(typeof drawField==='function'&&typeof view==='string'&&view==='match'&&!root.document.hidden)drawField();})};
})(typeof window!=='undefined'?window:globalThis);

