(function(root){
 'use strict';
 const asset='assets/club-scenes-v1.webp?v=1',promotionAsset='assets/club-promotion-v1.webp?v=1',scenes={arrival:[0,'비 내리는 하위 리그 경기장'],locker:[1,'라커룸에서 전술을 설명하는 감독'],press:[2,'구단 기자회견'],training:[3,'패스와 달리기를 연습하는 선수단'],academy:[4,'유소년 훈련을 관찰하는 코치'],celebration:[5,'우승을 축하하는 선수단'],promotion:[6,'다음 리그 승격을 축하하는 감독과 선수단']};
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(root.document?.createElement&&root.document?.head?.appendChild){const style=root.document.createElement('style');style.id='club-scene-atlas';style.textContent='.club-art{background-image:url("'+asset+'")} .club-art[data-club-scene="promotion"]{background-image:url("'+promotionAsset+'")}';root.document.head.appendChild(style);}
 function html(kind='arrival'){const [index,label]=Object.hasOwn(scenes,kind)?scenes[kind]:scenes.arrival;return '<div class="club-art" role="img" aria-label="'+esc(label)+' · 구단 일러스트" data-club-scene="'+(Object.hasOwn(scenes,kind)?kind:'arrival')+'" style="--scene-x:'+(index%3)*50+'%;--scene-y:'+Math.floor(index/3)*100+'%"><span>구단 일러스트</span></div>';}
 function seasonScene({final=false,rank,division}={}){if(!final||!Number.isInteger(division)||division<1||division>5)return 'arrival';if(rank===1)return 'celebration';return rank===2&&division>1?'promotion':'arrival';}
 const api={asset,promotionAsset,seasonScene,scenes:Object.freeze(scenes),html};root.ClubArt=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
