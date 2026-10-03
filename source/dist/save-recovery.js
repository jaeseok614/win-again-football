(function(root){
 'use strict';
 function create(options){
  const key=options.key,keys=[...new Set([key,...(options.legacyKeys||[])])];
  let failures=[],blocked=false,readFailed=false,loadedKey=null,loadedText=null;
  const storage=()=>typeof options.storage==='function'?options.storage():options.storage;
  function load(){
   failures=[];blocked=false;readFailed=false;loadedKey=null;loadedText=null;let payload=null;
   for(const candidate of keys){
    let text;try{text=storage().getItem(candidate);}catch{readFailed=true;break;}
    if(text===null)continue;
    try{payload=options.restore(JSON.parse(text));if(!payload)throw Error('invalid-campaign');loadedKey=candidate;loadedText=text;break;}
    catch{failures.push({key:candidate,text});}
   }
   blocked=readFailed||failures.length>0;
   return {payload,loadedKey,blocked,readFailed};
  }
  function originals(){return failures.map(entry=>({...entry}));}
  function archivedOriginals(){
   const entries=[];
   try{const store=storage();for(const originalKey of keys)for(let index=1;index<=10000;index++){
    const name=originalKey+'-recovery-original'+(index===1?'':'-'+index),text=store.getItem(name);
    if(text===null)break;entries.push({key:originalKey,text});
   }}catch{/* The live campaign remains usable when storage is unavailable. */}
   return entries;
  }
  function candidate(){return loadedText===null?null:options.restore(JSON.parse(loadedText));}
  function retain(store,entry){
   // A later recovery must never overwrite a different saved original.
   for(let index=1;index<=10000;index++){
    const name=entry.key+'-recovery-original'+(index===1?'':'-'+index),existing=store.getItem(name);
    if(existing===entry.text)return name;
    if(existing===null){store.setItem(name,entry.text);if(store.getItem(name)!==entry.text)throw Error('원본 저장을 확인할 수 없습니다.');return name;}
   }
   throw Error('저장 원본을 보관할 공간을 확인해 주세요.');
  }
  function replace(payload,beforeText){
   // Retry a denied read before any write, so an unseen campaign cannot be lost.
   const protectOriginal=blocked,observed=originals();
   if(readFailed)load();
   if(protectOriginal)blocked=true;
   if(readFailed)throw Error('기기 저장소를 읽을 수 없어 원본을 보호하고 있습니다.');
   const store=storage(),text=JSON.stringify(payload),before=store.getItem(key),recoveryKey=key+'-before-import',previousRecovery=store.getItem(recoveryKey);
   const retained=[...observed,...failures];for(const entry of retained)retain(store,entry);
   if(protectOriginal&&before!==null&&!retained.some(entry=>entry.key===key&&entry.text===before))retain(store,{key,text:before});
   let recoveryWritten=false;
   try{store.setItem(recoveryKey,beforeText);recoveryWritten=true;store.setItem(key,text);}
   catch(error){if(recoveryWritten){try{if(previousRecovery===null)store.removeItem(recoveryKey);else store.setItem(recoveryKey,previousRecovery);}catch{}}throw error;}
   blocked=false;failures=[];loadedKey=key;loadedText=text;return true;
  }
  function save(payload){
   if(blocked)return false;
   try{storage().setItem(key,JSON.stringify(payload));return true;}catch{return false;}
  }
  return {load,originals,archivedOriginals,candidate,replace,save,isBlocked:()=>blocked};
 }
 const api={create};root.SaveRecovery=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
