(function(root){
 'use strict';
 // This atlas contains original fictional faces. Identity mapping never uses game RNG.
 const asset='assets/player-faces-v16.webp?v=16',expandedAsset='assets/player-faces-v17.webp?v=17';
 // Share the atlas once. Large inline data URIs exceed browsers' custom-property
 // limits, so use one ordinary rule rather than a variable or per-card styles.
 if(typeof root.document?.createElement==='function'&&typeof root.document?.head?.appendChild==='function'){
  const stylesheet=root.document.createElement('style');stylesheet.id='player-portrait-atlas';stylesheet.textContent='.player-portrait{background-image:url("'+asset+'")} .player-portrait[data-portrait-atlas="2"]{background-image:url("'+expandedAsset+'")}';root.document.head.appendChild(stylesheet);
 }
 const base={g1:0,g2:10,d1:1,d2:4,d3:7,d4:6,d5:9,d6:13,m1:8,m2:3,m3:23,m4:12,m5:11,m6:18,f1:21,f2:15,f3:20,f4:22,sp_g1:0,sp_g2:10,sp_d1:1,sp_d2:4,sp_d3:7,sp_d4:6,sp_d5:9,sp_d6:13,sp_m1:8,sp_m2:3,sp_m3:23,sp_m4:12,sp_m5:11,sp_m6:18,sp_f1:21,sp_f2:15,sp_f3:20,sp_f4:22,t_g1:24,t_g2:2,t_d1:16,t_d2:14,t_m1:5,t_m2:17,t_f1:25,t_f2:19};
 // Sprite head colors are sampled from these original illustration cells.
 const skinColors=[["#ca8d6c","#bc7b58","#4e372b","#c7997a","#bf9275","#9a6848","#543622","#926750","#5f402f","#91664e","#ba886e","#5a3d2c","#764f38","#9a6e5a","#a06c4c","#765642","#ae7c61","#c08c6c","#be8f76","#7a5442","#906044","#b67e5c","#b47b54","#ab7b61","#ba8c70","#7d5840","#b5866c","#523a32"],["#66493c","#c8967f","#d0a588","#bf8c6c","#ba8878","#503c36","#c4927a","#aa7c60","#b27f5f","#c08e74","#594038","#ca9b84","#a8765a","#c6967a","#443434","#cc9f84","#ae8373","#5a4238","#c39275","#c49882","#ba8a72","#684e42","#cc9d86","#b5886c","#d4a88b","#ab765c","#b8866f","#6a5446","#c4937a","#c59882","#c08c6e","#564238","#c79479","#6e5146","#ce9c84","#624841","#cea084","#b07e61","#c8967e","#b98566","#c99880","#c18e6e","#6c4d3e","#c89981","#bf8d71","#624940","#ca9886","#d6a88e","#c18e72","#cea084","#735444","#c5927a","#bb8868","#5b4841","#c5917e","#c79787","#725446","#be8c70","#c0907c","#b27f62","#805e4c","#cd9e8a","#53413a","#bc8c6c"]];
 function skin(player){const tile=index(player);return tile>=28?skinColors[1][tile-28]:skinColors[0][tile];}
 function hashIdentity(identity){let hash=2166136261;for(let i=0;i<identity.length;i++){hash^=identity.charCodeAt(i);hash=Math.imul(hash,16777619);}return hash>>>0;}
 function index(player){
  const identity=String(typeof player==='string'?player:player?.identity||player?.id||'unknown');
  if(Object.prototype.hasOwnProperty.call(base,identity))return base[identity];
  if(identity.startsWith('opposition:')){const separator=identity.lastIndexOf(':'),rosterSlot=Number(identity.slice(separator+1));if(Number.isInteger(rosterSlot)&&rosterSlot>=0&&rosterSlot<11)return 28+(hashIdentity(identity.slice(0,separator))+rosterSlot)%64;}
  return 28+hashIdentity(identity)%64;
 }
 function html(player,options){
  const i=index(player),expanded=i>=28,local=expanded?i-28:i,columns=expanded?8:7,rows=expanded?8:4,size=options?.size==='large'?'large':'small',x=Number(((local%columns)*100/(columns-1)).toFixed(6)),y=Number((Math.floor(local/columns)*100/(rows-1)).toFixed(6));
  return '<span class="player-portrait portrait-'+size+'" aria-hidden="true" data-portrait-index="'+i+'" data-portrait-atlas="'+(expanded?'2':'1')+'" style="--portrait-x:'+x+'%;--portrait-y:'+y+'%;--portrait-size:'+columns*100+'% '+rows*100+'%"></span>';
 }
 const api={asset,expandedAsset,index,html,skin};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.Portraits=api;
})(typeof globalThis!=='undefined'?globalThis:this);
