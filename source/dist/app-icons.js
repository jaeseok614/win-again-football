(function(root){
 'use strict';
 // One shared original icon for both browser links and decorative game marks.
 const asset='assets/app-icon-192.png';
 for(const node of root.document?.querySelectorAll?.('[data-app-icon]')||[]){
  if(node.tagName==='IMG')node.src=asset;
  else if(node.tagName==='LINK')node.href=asset;
 }
})(typeof window!=='undefined'?window:globalThis);
