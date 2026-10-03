(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),S=root.Season||(typeof require==='function'?require('./season.js'):null),T=root.Training||(typeof require==='function'?require('./training.js'):null),D=root.PlayerDevelopment||(typeof require==='function'?require('./development.js'):null);
 const positions=['all','GK','DEF','MID','FW'],sorts=['recommended','potential','minutes'],copy=value=>JSON.parse(JSON.stringify(value));
 const text=value=>typeof value==='string'?value.trim().replace(/\s+/gu,' ').toLocaleLowerCase('ko-KR'):'';
 function normalize(options){
  const value=options&&typeof options==='object'?options:{},position=typeof value.position==='string'?value.position.trim().toUpperCase():'';
  return {position:positions.includes(position)?position:'all',query:text(value.query),sort:sorts.includes(value.sort)?value.sort:'recommended'};
 }
 function invalid(filters){return {valid:false,reason:'현재 선수단을 확인할 수 없어요.',context:null,summary:{total:0,fit:0,injured:0,tired:0,growable:0},players:[],totalMatched:0,filters};}
 function read(season,options={}){
  const filters=normalize(options),s=season;
  if(!s||!Number.isInteger(s.year)||s.year<1||!Number.isInteger(s.round)||s.round<0||s.round>14||!s.squad||typeof s.squad!=='object'||Array.isArray(s.squad))return invalid(filters);
  const slots=F.roster.map(p=>p.id);
  if(slots.some(slot=>{const p=s.squad[slot],key=p&&S.primaryKey(p);return !p||p.id!==slot||typeof p.identity!=='string'||typeof p.name!=='string'||!positions.includes(p.pos)||p.pos==='all'||!key||!['speed','endurance','energy',key,'potential'].every(k=>Number.isFinite(p[k]))||!Number.isInteger(p.xp)||p.xp<0;}))return invalid(filters);
  const trainingOpen=s.competition==='league'&&s.match?.phase==='prep'&&s.match.minute===0&&s.round<14&&!s.trained;
  const rows=slots.map((slot,index)=>{
   const p=s.squad[slot],m=s.match?.players?.[slot],live=m?.identity===p.identity?m:null,d=D.analyze(s,slot),key=S.primaryKey(p),profile=F.identityProfile(p.identity),baseline=profile?.[key];
   const recommendation=copy(d.recommendation);
   return {order:index,slot,id:p.id,identity:p.identity,name:p.name,pos:p.pos,no:p.no,energy:live&&Number.isFinite(live.energy)?live.energy:p.energy,injured:!!p.injury||!!live?.injuryRemaining,starting:!!live&&!!s.match?.lineup?.includes(slot),primaryLabel:d.growth.label,primary:p[key],cap:p.potential,remaining:d.growth.remaining,growthSinceRegistration:Number.isFinite(baseline)?p[key]-baseline:null,xp:p.xp,xpInStep:d.experience.xpInStep,minutesToGrowth:d.experience.nextPrimaryGrowthMinutes,capped:d.growth.capped,recommendation};
  });
  const summary={total:rows.length,fit:rows.filter(p=>!p.injured).length,injured:rows.filter(p=>p.injured).length,tired:rows.filter(p=>p.energy<70).length,growable:rows.filter(p=>!p.capped).length};
  const matched=rows.filter(p=>(filters.position==='all'||p.pos===filters.position)&&text(p.name).includes(filters.query));
  const comparators={
   recommended:(a,b)=>Number(b.recommendation.available)-Number(a.recommendation.available)||Number(b.energy<70)-Number(a.energy<70)||b.remaining-a.remaining||b.xpInStep-a.xpInStep||a.order-b.order,
   potential:(a,b)=>b.remaining-a.remaining||a.primary-b.primary||a.order-b.order,
   minutes:(a,b)=>Number(a.capped)-Number(b.capped)||(a.minutesToGrowth??271)-(b.minutesToGrowth??271)||b.remaining-a.remaining||a.order-b.order
  };
  matched.sort(comparators[filters.sort]);
  return {valid:true,context:{year:s.year,round:s.round+1,competition:s.competition,phase:s.match?.phase??'season-complete',trained:s.trained??null,trainingOpen:!!trainingOpen},summary,players:matched.map(({order,...p})=>p),totalMatched:matched.length,filters};
 }
 const api={read};root.TrainingCentre=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
