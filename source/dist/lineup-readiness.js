(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine'):null),Coach=root.CoachLineup||(typeof require==='function'?require('./coach-lineup'):null),cache=new WeakMap(),copy=x=>JSON.parse(JSON.stringify(x));
 function read(s){
  const m=s?.match;if(!m||!Coach.canEdit(s)||m.continuousSetup)return {available:false,recommendations:[]};
  const key=JSON.stringify([m.formation,m.lineup,Object.values(m.players).map(p=>[p.id,p.identity,p.pos,...['attack','defense','passing','speed','endurance','keeping'].map(k=>p[k]),p.energy,F.isAvailable(p)])]),cached=cache.get(m);
  if(cached?.key===key)return copy(cached.value);
  const p=Coach.preview(s,m.formation,'strength'),leaving=[...p.leaving],recommendations=[];
  for(const incoming of [...p.entering].sort((a,b)=>b.primary-a.primary||a.id.localeCompare(b.id))){
   const candidate=leaving.filter(q=>q.pos===incoming.pos).sort((a,b)=>a.primary-b.primary||a.id.localeCompare(b.id))[0];if(!candidate)continue;
   leaving.splice(leaving.indexOf(candidate),1);
   if(incoming.primary-candidate.primary<5||incoming.energy<70||incoming.energy<candidate.energy-10)continue;
   recommendations.push({position:incoming.pos,attribute:F.roleKey(m.players[incoming.id]),incoming:{id:incoming.id,identity:incoming.identity,name:incoming.name,primary:incoming.primary,energy:incoming.energy},outgoing:{id:candidate.id,identity:candidate.identity,name:candidate.name,primary:candidate.primary,energy:candidate.energy},difference:incoming.primary-candidate.primary});
  }
  recommendations.sort((a,b)=>b.difference-a.difference||a.incoming.id.localeCompare(b.incoming.id));
  const value={available:true,formation:m.formation,recommendations};cache.set(m,{key,value});return copy(value);
 }
 const api={read};root.LineupReadiness=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
