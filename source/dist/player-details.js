(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),ST=root.Statistics||(typeof require==='function'?require('./statistics.js'):null),D=root.PlayerDevelopment||(typeof require==='function'?require('./development.js'):null);
 const statLabels={attack:'결정력',defense:'수비',passing:'패스',speed:'속도',endurance:'지구력',keeping:'선방'},recordKeys=['apps','starts','goals','assists','minutes','cleanSheets'];
 const invalid=(identity,reason)=>({valid:false,identity:typeof identity==='string'?identity:null,reason});
 function read(s,identity){
  if(!s||!Number.isInteger(s.year)||s.year<1)return invalid(identity,'현재 시즌을 확인할 수 없어요.');
  if(typeof identity!=='string'||!identity)return invalid(identity,'현재 구단이나 발견한 후보의 선수를 선택하세요.');
  const owned=Object.values(s.squad||{}).find(p=>p.identity===identity),market=!owned?F.market.find(p=>p.identity===identity):null;
  const report=!owned&&!market&&s.career?.year===s.year?s.career.reports?.find(r=>Array.isArray(r.candidates)&&r.candidates.includes(identity)):null;
  const academy=report?F.identityProfile(identity):null;
  if(!owned&&!market&&(!academy?.academy||academy.academySeed!==s.seed||academy.academyYear!==s.year))return invalid(identity,'현재 구단이나 발견한 후보 목록에 없는 선수예요.');
  const p=owned||market||academy,key=F.roleKey(p),personality=F.personality(p),slot=owned?.id??null,m=slot?s.match?.players?.[slot]:null,live=m?.identity===identity?m:null;
  const energy=owned?(live?.energy??p.energy):null,injury=owned?.injury?{...owned.injury}:null;
  const injuryRemaining=injury?.remaining||live?.injuryRemaining||0,conditionStatus=!owned?'unknown':live?.suspended?'suspended':injuryRemaining?'injured':energy<65?'caution':'fit';
  const condition={status:conditionStatus,label:conditionStatus==='unknown'?'영입 전 · 몸 상태 미확인':conditionStatus==='suspended'?'이번 대회 출전 정지':conditionStatus==='injured'?'부상 휴식 · '+injuryRemaining+'경기':conditionStatus==='caution'?'피로 주의':'출전 가능',available:owned?injuryRemaining===0&&!live?.suspended:null,starting:owned?!!live&&!!s.match?.lineup?.includes(slot):null,energySource:owned?(live?'match':'squad'):null};
  const summary=ST.summary(s,'all',s.year),row=summary.players.find(player=>player.identity===identity);
  const records={year:s.year,...Object.fromEntries(recordKeys.map(stat=>[stat,row?.[stat]??0])),partial:summary.partial,matches:summary.matches,trackedSinceRound:summary.trackedSinceRound};
  return {valid:true,attributes:F.detailedAttributes(p),mental:F.mentalProfile(p),identity,name:p.name,position:p.pos,pos:p.pos,age:p.age+s.year-(p.academy?p.academyYear:1),nickname:personality.nickname,tagline:personality.tagline,owned:!!owned,slot,status:owned?'our':'prospect',source:owned?'squad':market?'market':'academy',kind:p.kind,no:owned?.no??null,wage:p.wage,fee:p.fee,primaryKey:key,primaryLabel:statLabels[key],current:{primary:p[key],potential:p.potential,growthHeadroom:Math.max(0,p.potential-p[key]),xp:owned?p.xp:0,energy},stats:Object.entries(statLabels).map(([stat,label])=>({key:stat,label,value:stat==='keeping'&&p.pos!=='GK'?null:p[stat],primary:stat===key})),injury,condition,records,development:owned?D.analyze(s,slot):null};
 }
 const api={read};root.PlayerDetails=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
