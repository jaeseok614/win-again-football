(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),T=root.Training||(typeof require==='function'?require('./training.js'):null);
 const labels={attack:'결정력',defense:'수비',passing:'패스',keeping:'선방'};
 function analyze(s,slot){
  const p=s?.squad?.[slot];
  if(!p)return {valid:false,slot,identity:null,name:'',currentEnergy:null,experience:null,growth:null,previews:{},recommendation:{focus:null,label:'선수 선택 필요',available:false,reason:'현재 구단의 선수를 선택하세요.',preview:null}};
  const key=F.roleKey(p),remaining=Math.max(0,p.potential-p[key]),xpInStep=p.xp%270,minutesToXpStep=270-xpInStep,m=s.match?.players?.[slot],currentEnergy=m?.identity===p.identity?m.energy:p.energy;
  const experience={confirmedMinutes:p.xp,xpInStep,completedSteps:Math.floor(p.xp/270),minutesToXpStep,nextPrimaryGrowthMinutes:remaining?minutesToXpStep:null};
  const growth={key,label:labels[key],current:p[key],cap:p.potential,remaining,capped:remaining===0,individualTechniqueSessions:Math.ceil(remaining/2)};
  const previews=Object.fromEntries(Object.keys(T.choices).map(focus=>[focus,T.preview(s,slot,focus,p.identity)]));
  let focus=null,label='',reason='';
  if(p.injury||m?.injuryRemaining){label='지금은 휴식부터';reason='부상 선수는 훈련을 쉬어야 합니다. 경기 휴식으로 복귀한 뒤 다시 추천을 확인하세요.';}
  else if(!m||m.identity!==p.identity||s.competition!=='league'||s.match.phase!=='prep'||s.match.minute!==0||s.round>=(root.Season?.roundCount?.(s)||14)||s.trained){label=s.trained?'이번 주 훈련 완료':'훈련을 기다리는 중';reason=previews.recovery.reason||'다음 리그 경기 준비 때 추천 훈련을 선택할 수 있어요.';}
  else if(currentEnergy<70){focus='recovery';reason='현재 체력이 70 미만입니다. 능력을 올리기 전에 피로부터 회복하세요.';}
  else if(remaining>0){focus='technique';reason='주요 능력 '+labels[key]+'의 성장 여유가 '+remaining+' 남았습니다. 포지션 기술을 집중해서 키워보세요.';}
  else if(p.speed<99||p.endurance<99){
   focus=p.endurance<=p.speed?'fitness':'pace';
   if(!previews[focus].available){const alternate=focus==='fitness'?'pace':'fitness';if(previews[alternate].available)focus=alternate;else if(previews.recovery.available)focus='recovery';else focus=null;}
   reason=focus==='recovery'?'능력 훈련을 마칠 체력이 부족합니다. 회복 후 다시 준비하세요.':focus?'주요 능력은 성장 한계에 도달했습니다. '+(focus==='fitness'?'지구력':'속도')+'을 다음 목표로 키워보세요.':'지금 실행할 수 있는 훈련이 없습니다.';
  }else if(previews.recovery.available){focus='recovery';reason='기술·속도·지구력이 성장 한계에 도달했습니다. 체력을 회복해 다음 출전을 준비하세요.';}
  else{label='오늘의 준비 완료';reason='주요 능력·속도·지구력이 성장 한계에 도달했고 체력도 가득 찼습니다. 이번 주 훈련은 다른 선수에게 투자해보세요.';}
  const preview=focus?previews[focus]:null,available=!!preview?.available;
  if(focus&&!available){reason=preview.reason;focus=null;}
  const recommendation={focus,label:focus?T.choices[focus].label:label||'훈련 대기',available,reason,preview:focus?preview:null};
  return {valid:true,slot:p.id,identity:p.identity,name:p.name,currentEnergy,experience,growth,previews,recommendation};
 }
 const api={analyze};root.PlayerDevelopment=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
