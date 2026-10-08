(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),D=root.Discipline||(typeof require==='function'?require('./discipline.js'):null);
 const weights={corner:'패스 72% · 공격 18% · 속도 10%',freeKick:'공격 48% · 패스 47% · 속도 5%',target:'공격 42% · 수비 34% · 지구력 24%'};
 function read(match,{preferences={}}={}){
  if(!match?.setPieces)return null;
  const dismissed=new Set(D.dismissed(match)),field=match.lineup.map(id=>match.players[id]).filter(p=>p&&p.pos!=='GK'&&!dismissed.has(p.id)),automatic=F.defaultSetPieces(match,field.map(p=>p.id));
  const roles=Object.entries(F.setPieceRoleNames).map(([role,label])=>{
   const candidates=field.map(p=>({id:p.id,identity:p.identity,name:p.name,pos:p.pos,energy:Math.round(p.energy),score:F.setPieceScore(p,role)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
   const selected=candidates.find(p=>p.id===match.setPieces[role])||candidates.find(p=>p.id===automatic[role])||null,preference=F.identityProfile(preferences[role]);
   return {role,label,weights:weights[role],candidates,selected,preference:preference?{identity:preference.identity,name:preference.name}:null,fallback:!!preference&&preference.identity!==selected?.identity};
  });
  return {editable:match.phase==='prep'&&match.minute===0,finished:match.phase==='full',roles};
 }
 const api={read};root.SetPieceRoom=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
