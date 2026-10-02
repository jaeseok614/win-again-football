(function(root){
 'use strict';
 const asset='assets/coach-faces-v1.webp?v=1';
 // Inline bundles store the atlas once on the root, not in every coach card.
 if(typeof root.document?.documentElement?.style?.setProperty==='function')root.document.documentElement.style.setProperty('--staff-portrait-atlas',"url('"+asset+"')");
 const names=Object.freeze(['이든 브룩스','노아 리드','루카스 베일','올리버 콜','다니엘 쇼','알렉스 우드','테오 밀러','제이미 클라크','레오 워커','오스카 그린']);
 function index(person){const name=String(typeof person==='string'?person:person?.name||'');const known=names.indexOf(name);if(known>=0)return known;let hash=2166136261;for(const ch of name){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0)%10;}
 function html(person){const i=index(person);return '<span class="staff-portrait" aria-hidden="true" data-staff-portrait="'+i+'" style="--staff-face-x:'+((i%5)*25)+'%;--staff-face-y:'+Math.floor(i/5)*100+'%"></span>';}
 const api={asset,index,html};root.StaffPortraits=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
