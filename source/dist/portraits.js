(function(root){
 'use strict';
 // This atlas contains original fictional faces. Identity mapping never uses game RNG.
 const asset='assets/player-faces-v12.png?v=12';
 // Share the atlas once. In standalone builds this URL is a large data URI;
 // repeating it in each portrait's style would inflate squad markup by 100 MB.
 if(typeof root.document?.documentElement?.style?.setProperty==='function')root.document.documentElement.style.setProperty('--player-portrait-atlas',"url('"+asset+"')");
 const base={g1:0,g2:10,d1:1,d2:4,d3:7,d4:6,d5:9,d6:13,m1:8,m2:3,m3:23,m4:12,m5:11,m6:18,f1:21,f2:15,f3:20,f4:22,t_g1:24,t_g2:2,t_d1:16,t_d2:14,t_m1:5,t_m2:17,t_f1:25,t_f2:19};
 function index(player){
  const identity=String(typeof player==='string'?player:player?.identity||player?.id||'unknown');
  if(Object.prototype.hasOwnProperty.call(base,identity))return base[identity];
  let hash=2166136261;
  for(let i=0;i<identity.length;i++){hash^=identity.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0)%28;
 }
 function html(player,options){
  const i=index(player),size=options?.size==='large'?'large':'small',x=Number(((i%7)*100/6).toFixed(6)),y=Number((Math.floor(i/7)*100/3).toFixed(6));
  return '<span class="player-portrait portrait-'+size+'" aria-hidden="true" data-portrait-index="'+i+'" style="--portrait-x:'+x+'%;--portrait-y:'+y+'%;--portrait-size:700% 400%"></span>';
 }
 const api={asset,index,html};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.Portraits=api;
})(typeof globalThis!=='undefined'?globalThis:this);
