(function(root){
 'use strict';
 const patterns={goal:[55,35,80],concede:[100,30,40],save:[20],sub:[18,20,18],kickoff:[25],fulltime:[25,25,55],preview:[35,25,35]},cooldown=450;
 function create(options={}){
  const settings=options||{},vibrate=typeof settings.vibrate==='function'?settings.vibrate:null,supported=!!vibrate;
  const visible=typeof settings.visible==='function'?settings.visible:()=>true,active=typeof settings.active==='function'?settings.active:()=>false,now=typeof settings.now==='function'?settings.now:()=>Date.now();
  let enabled=settings.haptics===true,blocked=false,lastStatus='idle',lastAttemptAt=null;
  function snapshot(){return {enabled,supported,blocked,lastStatus};}
  function result(status,kind=null){lastStatus=status;return {status,kind,supported,blocked};}
  function cancel(){
   if(!supported)return result('unsupported');
   try{if(vibrate(0)===false){blocked=true;return result('blocked');}return result('cancelled');}
   catch{return result('error');}
  }
  function setEnabled(value){enabled=value===true;if(!enabled){cancel();lastStatus='disabled';}return snapshot();}
  function play(kind){
   if(typeof kind!=='string'||!Object.hasOwn(patterns,kind))return result('invalid',typeof kind==='string'?kind:null);
   if(!enabled)return result('disabled',kind);
   if(!supported)return result('unsupported',kind);
   let time;
   try{
    if(!visible())return result('hidden',kind);
    // The adapter combines user activation with the current screen's permission to play feedback.
    if(!active())return result('inactive',kind);
    time=now();if(!Number.isFinite(time))return result('error',kind);
   }catch{return result('error',kind);}
   if(lastAttemptAt!==null&&time-lastAttemptAt<cooldown)return result('cooldown',kind);
   lastAttemptAt=time;
   try{
    // A true return value means the browser accepted the request; it does not prove a motor ran.
    if(vibrate([...patterns[kind]])===false){blocked=true;return result('blocked',kind);}
    blocked=false;return result('played',kind);
   }catch{return result('error',kind);}
  }
  return {setEnabled,play,cancel,snapshot};
 }
 const api={create};root.Feedback=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
