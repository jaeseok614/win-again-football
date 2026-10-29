'use strict';
// Diagnostic observer only. Never writes to a world, player, ball or random state.
const C=require('../dist/continuous-football');
const quantile=(values,q)=>{if(!values.length)return null;const a=[...values].sort((x,y)=>x-y),i=(a.length-1)*q,l=Math.floor(i);return a[l]+(a[Math.ceil(i)]-a[l])*(i-l);};
function create({sampleTicks=10,tickSeconds=.1,rapidLossSeconds=2}={}){
 if(!Number.isSafeInteger(sampleTicks)||sampleTicks<1||!Number.isFinite(tickSeconds)||tickSeconds<=0||!Number.isFinite(rapidLossSeconds)||rapidLossSeconds<=0)throw Error('Invalid telemetry options');
 const teams=[0,1].map(()=>({durations:[],regains:0,rapidLosses:0,spaceSamples:0,width:0,depth:0,goalSide:0,supportSamples:0,nearestSupport:0,forwardSupport:0}));
 let current=null,lastTick=-1,closed=false,regainedAt=[null,null];
 const close=tick=>{if(current&&tick>current.tick)teams[current.team].durations.push((tick-current.tick)*tickSeconds);current=null;};
 function reset(tick){if(closed)throw Error('Telemetry already finished');if(tick<lastTick)throw Error('Telemetry time moved backwards');close(tick);regainedAt=[null,null];lastTick=tick;}
 function observe(w){
  if(closed)throw Error('Telemetry already finished');if(w.tick<lastTick)throw Error('Telemetry time moved backwards');if(w.tick===lastTick)return;lastTick=w.tick;
  if(w.restart){close(w.tick);regainedAt=[null,null];return;}
  const carrier=w.players.find(p=>p.active&&p.id===w.ball.owner);if(!carrier)return;
  if(current&&current.team!==carrier.team){const previous=current.team;if(regainedAt[previous]!==null&&(w.tick-regainedAt[previous])*tickSeconds<=rapidLossSeconds)teams[previous].rapidLosses++;close(w.tick);teams[carrier.team].regains++;regainedAt[carrier.team]=w.tick;}
  if(!current)current={team:carrier.team,tick:w.tick};
  if(w.tick%sampleTicks)return;
  for(const team of [0,1]){
   const active=w.players.filter(p=>p.active&&p.team===team&&p.pos!=='GK'),a=teams[team];if(!active.length)continue;
   const xs=active.map(p=>p.x),ys=active.map(p=>C.progress(w,team,p.y)),ballAt=C.progress(w,team,w.ball.y);a.spaceSamples++;a.width+=Math.max(...xs)-Math.min(...xs);a.depth+=Math.max(...ys)-Math.min(...ys);a.goalSide+=ys.filter(y=>y<ballAt).length;
   if(carrier.team!==team)continue;
   const allies=active.filter(p=>p.id!==carrier.id),distances=allies.map(p=>Math.hypot(p.x-carrier.x,p.y-carrier.y));if(!allies.length)continue;
   const at=C.progress(w,team,carrier.y);a.supportSamples++;a.nearestSupport+=Math.min(...distances);a.forwardSupport+=allies.filter((p,i)=>distances[i]>=2&&distances[i]<=25&&C.progress(w,team,p.y)>at+1).length;
  }
 }
 function finish(w){if(!closed){if(w.tick<lastTick)throw Error('Telemetry time moved backwards');close(w.tick);closed=true;}return {tickSeconds,sampleTicks,rapidLossSeconds,teams:teams.map((a,team)=>({team,endedPossessions:a.durations.length,possessionSeconds:{p10:quantile(a.durations,.1),p50:quantile(a.durations,.5),p90:quantile(a.durations,.9)},openPlayRegains:a.regains,lostWithinWindow:a.rapidLosses,rapidLossFraction:a.regains?a.rapidLosses/a.regains:null,spaceSamples:a.spaceSamples,meanWidthMetres:a.spaceSamples?a.width/a.spaceSamples:null,meanDepthMetres:a.spaceSamples?a.depth/a.spaceSamples:null,meanOutfieldGoalSide:a.spaceSamples?a.goalSide/a.spaceSamples:null,supportSamples:a.supportSamples,meanNearestSupportMetres:a.supportSamples?a.nearestSupport/a.supportSamples:null,meanForwardSupportWithin25m:a.supportSamples?a.forwardSupport/a.supportSamples:null,rawTackles:w.stats?.tackles?.[team]??null}))};}
 return {observe,reset,finish};
}
module.exports={create};
