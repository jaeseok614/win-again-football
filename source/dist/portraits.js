(function(root){
 'use strict';
 // This atlas contains original fictional faces. Identity mapping never uses game RNG.
 const asset='assets/player-faces-v19.webp?v=19',expandedAsset='assets/player-faces-v17.webp?v=17',extraAsset='assets/player-faces-v18.webp?v=18';
 // Share the atlas once. Large inline data URIs exceed browsers' custom-property
 // limits, so use one ordinary rule rather than a variable or per-card styles.
 if(typeof root.document?.createElement==='function'&&typeof root.document?.head?.appendChild==='function'){
  const stylesheet=root.document.createElement('style');stylesheet.id='player-portrait-atlas';stylesheet.textContent='.player-portrait{background-image:url("'+asset+'")} .player-portrait[data-portrait-atlas="2"]{background-image:url("'+expandedAsset+'")} .player-portrait[data-portrait-atlas="3"]{background-image:url("'+extraAsset+'")}';root.document.head.appendChild(stylesheet);
 }
 const starterSlots=['g1','g2','d1','d2','d3','d4','d5','d6','m1','m2','m3','m4','m5','m6','f1','f2','f3','f4'],base=Object.fromEntries(starterSlots.flatMap((id,i)=>[[id,i],['sp_'+id,i]]));
 Object.assign(base,{t_g1:29,t_g2:30,t_d1:31,t_d2:32,t_m1:34,t_m2:35,t_f1:36,t_f2:37});
 for(let i=0;i<24;i++)base['r_'+(['g1','g2','d1','d2','d3','d4','d5','d6','d7','d8','m1','m2','m3','m4','m5','m6','m7','m8','f1','f2','f3','f4','f5','f6'][i])]=38+i;
 const starterSkin=['#c38f73','#c49175','#b78567','#d2a58b','#bc8d73','#715041','#b98b74','#c99b83','#614538','#c4947d','#d2a38c','#aa8069','#6e4c38','#d3aa91','#c59c81','#a2755a','#b38c75','#b69580'];
 // Sprite head colors are sampled from these original illustration cells.
 const skinColors=[["#ca8d6c","#bc7b58","#4e372b","#c7997a","#bf9275","#9a6848","#543622","#926750","#5f402f","#91664e","#ba886e","#5a3d2c","#764f38","#9a6e5a","#a06c4c","#765642","#ae7c61","#c08c6c","#be8f76","#7a5442","#906044","#b67e5c","#b47b54","#ab7b61","#ba8c70","#7d5840","#b5866c","#523a32"],["#66493c","#c8967f","#d0a588","#bf8c6c","#ba8878","#503c36","#c4927a","#aa7c60","#b27f5f","#c08e74","#594038","#ca9b84","#a8765a","#c6967a","#443434","#cc9f84","#ae8373","#5a4238","#c39275","#c49882","#ba8a72","#684e42","#cc9d86","#b5886c","#d4a88b","#ab765c","#b8866f","#6a5446","#c4937a","#c59882","#c08c6e","#564238","#c79479","#6e5146","#ce9c84","#624841","#cea084","#b07e61","#c8967e","#b98566","#c99880","#c18e6e","#6c4d3e","#c89981","#bf8d71","#624940","#ca9886","#d6a88e","#c18e72","#cea084","#735444","#c5927a","#bb8868","#5b4841","#c5917e","#c79787","#725446","#be8c70","#c0907c","#b27f62","#805e4c","#cd9e8a","#53413a","#bc8c6c"],["#ddb3a4","#956855","#d5a492","#d09a84","#805c54","#d6ac9d","#c79681","#cf9f87","#d5a383","#d29c83","#865d50","#d2a18f","#daad97","#cc987e","#c48a77","#d5a68f","#d29e83","#a36e55","#d5aca2","#d2a187","#73554e","#c08b72","#c6917b","#d4ab99","#cd9881","#c59075","#d0a595","#77544c","#b89280","#c89883","#c9937a","#c89379","#c89d8a","#936858","#c8977d","#be8e73","#d2a897","#805a4e","#704f45","#dab1a3","#d59e83","#c8977a","#c4947a","#b07b63","#d6ab98","#855d4f","#bf9078","#d5a792","#90695d","#c7957d","#d0a084","#76544d","#ca9b86","#936d58","#d7aea1","#c38d74","#d29d86","#d6aa95","#845c54","#d3a393","#c59177","#cf9b84","#795c5a","#cf9c85"]];
 function skin(player){const tile=index(player);return tile>=28?skinColors[1+Math.floor((tile-28)/64)][(tile-28)%64]:starterSkin[tile];}
 function hashIdentity(identity){let hash=2166136261;for(let i=0;i<identity.length;i++){hash^=identity.charCodeAt(i);hash=Math.imul(hash,16777619);}return hash>>>0;}
 function index(player){
  const identity=String(typeof player==='string'?player:player?.identity||player?.id||'unknown');
  if(Object.prototype.hasOwnProperty.call(base,identity))return base[identity];
  if(identity.startsWith('opposition:')){const separator=identity.lastIndexOf(':'),rosterSlot=Number(identity.slice(separator+1));if(Number.isInteger(rosterSlot)&&rosterSlot>=0&&rosterSlot<11)return 28+(hashIdentity(identity.slice(0,separator))+rosterSlot)%128;}
  return 28+hashIdentity(identity)%128;
 }
 function html(player,options){
  const i=index(player),expanded=i>=28,local=expanded?(i-28)%64:i,columns=expanded?8:6,rows=expanded?8:3,size=options?.size==='large'?'large':'small',x=Number(((local%columns)*100/(columns-1)).toFixed(6)),y=Number((Math.floor(local/columns)*100/(rows-1)).toFixed(6));
  return '<span class="player-portrait portrait-'+size+'" aria-hidden="true" data-portrait-index="'+i+'" data-portrait-atlas="'+(expanded?(i>=92?'3':'2'):'1')+'" style="--portrait-x:'+x+'%;--portrait-y:'+y+'%;--portrait-size:'+columns*100+'% '+rows*100+'%"></span>';
 }
 const api={asset,expandedAsset,extraAsset,index,html,skin};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.Portraits=api;
})(typeof globalThis!=='undefined'?globalThis:this);
