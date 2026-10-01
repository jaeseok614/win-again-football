(function(root){
 'use strict';
 const Staff=root.Staff||(typeof require==='function'?require('./staff.js'):null);
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null);
 const choices=Object.freeze({
  technique:Object.freeze({label:'포지션 기술',amount:2,cost:10}),
  pace:Object.freeze({label:'스피드',key:'speed',amount:2,cost:12}),
  fitness:Object.freeze({label:'지구력',key:'endurance',amount:2,cost:6}),
  recovery:Object.freeze({label:'개인 회복',key:'energy',amount:25,cost:0})
 });
 const labels={attack:'결정력',defense:'수비',passing:'패스',keeping:'선방',speed:'속도',endurance:'지구력',energy:'체력'};
 function availability(s,p,focus,expectedIdentity){
  if(!choices[focus])return '훈련 종류를 선택하세요.';
  if(!p||!s.match?.players?.[p.id])return '현재 구단의 선수를 선택하세요.';
  if(expectedIdentity!==undefined&&p.identity!==expectedIdentity)return '선수가 바뀌었습니다. 현재 선수를 다시 선택하세요.';
  if(s.match.players[p.id].identity!==p.identity)return '경기 명단과 선수 등록을 확인하세요.';
  if(s.competition==='cup')return '컵 경기에서는 훈련을 쉽니다. 다음 리그 경기 전에 다시 열려요.';
  if(s.competition!=='league'||!s.match||s.match.phase!=='prep'||s.match.minute!==0||s.round>=14)return '리그 경기 시작 전에 집중 훈련할 수 있어요.';
  if(s.trained)return '이번 주 훈련을 마쳤습니다. 전체 훈련과 집중 훈련 중 하나를 선택할 수 있어요.';
  if(p.injury||s.match.players[p.id].injuryRemaining)return '부상 선수는 쉬어야 합니다. 경기 휴식으로 복귀한 뒤 훈련하세요.';
  return null;
 }
 function preview(s,slot,focus='technique',expectedIdentity){
  const p=s?.squad?.[slot],rule=choices[focus],key=focus==='technique'&&p?F.roleKey(p):rule?.key;
  let reason=availability(s||{},p,focus,expectedIdentity),before=p&&key?p[key]:null,cap=key==='energy'?100:key&&p&&key===F.roleKey(p)?p.potential:99;
  const coaching=p&&rule&&Staff?Staff.trainingBonuses(s,slot,focus):{skillBonus:0,energySaving:0,recoveryBonus:0},amount=rule?rule.amount+coaching.skillBonus+coaching.recoveryBonus:0,cost=rule?Math.max(0,rule.cost-coaching.energySaving):0;
  const after=Number.isFinite(before)&&rule?Math.min(cap,before+amount):null,gain=after===null?0:after-before,energyBefore=p?.energy??null,energyAfter=rule&&Number.isFinite(energyBefore)?focus==='recovery'?after:Math.max(0,energyBefore-cost):null;
  if(!reason&&gain<=0)reason=focus==='recovery'?'체력이 이미 가득 찼습니다. 다른 훈련을 선택하세요.':'이 능력은 성장 한계에 도달했습니다. 다른 훈련을 선택하세요.';
  if(!reason&&focus!=='recovery'&&energyBefore<cost)reason='훈련을 끝낼 체력이 부족합니다. 개인 회복이나 전체 회복 훈련을 선택하세요.';
  return {available:!reason,reason,slot:p?.id??slot,identity:p?.identity??null,name:p?.name??'',focus,label:rule?.label??'',key,keyLabel:labels[key]||'',before,after,gain,cap,energyBefore,energyAfter,cost,coaching,year:s?.year??null,round:s?.round===undefined?null:s.round+1};
 }
 function train(s,slot,focus,expectedIdentity){
  const result=preview(s,slot,focus,expectedIdentity);if(!result.available)throw Error(result.reason);
  const p=s.squad[slot],m=s.match.players[slot];
  p[result.key]=result.after;p.energy=result.energyAfter;m[result.key]=result.after;m.energy=p.energy;m.initialEnergy=p.energy;s.trained=focus;Staff?.training(s,focus,slot,{alreadyApplied:true});
  return {...result,available:false,reason:'이번 주 집중 훈련을 마쳤습니다.'};
 }
 const api={choices,preview,train};root.Training=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
