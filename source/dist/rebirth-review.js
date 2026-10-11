(function(root){
 'use strict';
 const rebirth=()=>root.Rebirth||(typeof require==='function'?require('./rebirth'):null),copy=x=>JSON.parse(JSON.stringify(x));
 function read(s,attempt=s?.rebirth?.attempt){
  if(!s?.rebirth)return {valid:false};const R=rebirth(),current=attempt===s.rebirth.attempt,prior=current?null:s.rebirth.previous.find(p=>p.attempt===attempt);if(!current&&!prior)return {valid:false};
  const run=current?R.read(s):R.simulate(prior.records,prior.decisions,prior.memory,prior.attempt>1,prior.contractStyle),records=current?run.records:prior.records,decisions=current?s.rebirth.decisions:prior.decisions,style=current?run.contractStyle:prior.contractStyle||'classic';
  const wins=records.filter(g=>g.score[0]>g.score[1]).length,draws=records.filter(g=>g.score[0]===g.score[1]).length,goals=records.reduce((n,g)=>n+g.score[0],0),conceded=records.reduce((n,g)=>n+g.score[1],0),promises=run.timeline.filter(t=>['fulfilled','missed'].includes(t.kind)).map(t=>{const after=t.after-3,choice=decisions.find(d=>d.after===after&&d.kind==='deal'),request=R.request(after,style),option=request.options.find(o=>o.id===choice.option);return {speaker:request.speaker,after,end:t.after,label:option.label,metric:option.metric,target:R.targetText(option),value:t.value,success:t.kind==='fulfilled',games:copy(records.slice(after,t.after))};});
  const warning=run.warning?{after:run.warning.after,end:run.warning.end,remaining:Math.max(0,run.warning.end-records.length),points:records.slice(run.warning.after,run.warning.end).reduce((n,g)=>n+(g.score[0]>g.score[1]?3:g.score[0]===g.score[1]?1:0),0)}:null;
  return {valid:true,current,attempt,status:current?run.status:prior.status,memory:R.memories[current?run.memory:prior.memory].name,owner:current?run.contract.label:R.contracts[style].label,played:records.length,wins,draws,losses:records.length-wins-draws,points:wins*3+draws,goals,conceded,pressure:run.confidence,promises,fulfilled:promises.filter(p=>p.success).length,missed:promises.filter(p=>!p.success).length,warning,games:copy(records)};
 }
 const api={read};root.RebirthReview=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
