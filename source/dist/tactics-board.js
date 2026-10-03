(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),S=root.Season||(typeof require==='function'?require('./season.js'):null);
 const labels={balanced:'균형 운영',press:'전방 압박',counter:'빠른 역습'},windows={prep:[0,45],half:[45,65],late:[65,90]},runningWindows={first:[0,45],second:[45,65],third:[65,90]};
 const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length,copy=value=>JSON.parse(JSON.stringify(value));
 const invalid=reason=>({valid:false,reason,fingerprint:null});
 function read(s,{coachPause65=true}={}){
  const m=s?.match;if(!m)return invalid('현재 준비할 경기가 없습니다.');
  const active=runningWindows[m.phase],window=active||windows[m.phase];if(!window)return invalid('작전판은 경기 전이나 경기를 잠시 멈춘 뒤 확인할 수 있어요.');
  if(active&&m.paused!==true)return invalid('전술 보드를 보려면 경기를 잠시 멈추세요.');
  if(!Number.isInteger(m.minute)||(active?(m.minute<window[0]||m.minute>=window[1]):m.minute!==window[0]))return invalid('현재 경기 시간과 작전 시간이 맞지 않습니다.');
  const forecastEnd=['half','second'].includes(m.phase)&&coachPause65===false?90:window[1];
  try{
   if(!F.formations[m.formation]||!Array.isArray(m.lineup)||m.lineup.length!==11||new Set(m.lineup).size!==11||m.lineup.some(id=>!m.players[id]||!F.isAvailable(m.players[id])||s.squad[id]?.identity!==m.players[id].identity||!Number.isFinite(m.players[id].energy)||m.players[id].energy<0||m.players[id].energy>100))return invalid('출전 가능한 현재 선수 11명으로 선발을 구성하세요.');
   if(new Set(m.lineup.map(id=>m.players[id].identity)).size!==11)return invalid('서로 다른 현재 선수 11명으로 선발을 구성하세요.');
   const counts={GK:1,...F.formations[m.formation]};if(Object.entries(counts).some(([pos,count])=>m.lineup.filter(id=>m.players[id].pos===pos).length!==count))return invalid('현재 포메이션과 선발 선수의 포지션이 맞지 않습니다.');
   const fixture=S.fixtureFor(s);if(!fixture||m.isHome!==(fixture.home===S.own))return invalid('현재 경기의 대진을 확인할 수 없습니다.');
   const context={seed:m.seed,rng:m.rng,year:s.year,competition:s.competition,round:s.competition==='cup'?s.round:s.round+1,stage:s.competition==='cup'?fixture.stage:null,phase:m.phase,minute:m.minute,paused:!!m.paused,coachPause65:coachPause65!==false,forecastEnd,formation:m.formation,tactic:m.tactic,score:[...m.score],isHome:m.isHome,opponentId:fixture.home===S.own?fixture.away:fixture.home};
   const lineup=m.lineup.filter(id=>!(m.discipline?.events||[]).some(e=>e.team===0&&e.id===id&&e.card==='red'&&e.minute<=m.minute)).map(id=>{const p=m.players[id],key=F.roleKey(p);return {id,identity:p.identity,name:p.name,pos:p.pos,no:p.no,energy:p.energy,endurance:p.endurance,primary:p[key],key,injury:p.injuryRemaining||0,condition:p.energy<50?'critical':p.energy<65?'tired':'fit'};});
   const signature={cards:m.discipline?.events||[],context,rng:m.rng,lineup:m.lineup.map(id=>{const p=m.players[id];return {id,identity:p.identity,pos:p.pos,energy:p.energy,injuryRemaining:p.injuryRemaining,attack:p.attack,defense:p.defense,passing:p.passing,speed:p.speed,endurance:p.endurance,keeping:p.keeping};}),opponent:m.opponent};
   const fingerprint=JSON.stringify(signature),segment={start:m.minute,end:forecastEnd,minutes:forecastEnd-m.minute};
   const condition={averageEnergy:mean(lineup.map(p=>p.energy)),minimumEnergy:Math.min(...lineup.map(p=>p.energy)),tiredIds:lineup.filter(p=>p.energy<65).map(p=>p.id),criticalIds:lineup.filter(p=>p.energy<50).map(p=>p.id)};
   const rating=copy(F.ratings(m)),comparisons=[['attack','공격','attack'],['defense','수비','defense'],['middle','중원','middle'],['pace','공격진 속도','speed']].map(([key,label,opponentKey])=>({key,label,ours:rating[key],opponent:rating.opponent[opponentKey],delta:rating[key]-rating.opponent[opponentKey]}));
   const previews=['balanced','press','counter'].map(tactic=>{
    const rating=copy(F.ratings({...m,tactic})),energy=lineup.map(p=>{const costPer90=35*(1+(50-p.endurance)/250)+(tactic==='press'?8:0),rawCost=costPer90*segment.minutes/90,after=Math.max(0,p.energy-rawCost);return {id:p.id,identity:p.identity,before:p.energy,after,cost:p.energy-after,costPer90,rawCost};});
    return {tactic,label:labels[tactic],rating,expectedChances:{ours:rating.ourRate*segment.minutes,opponent:rating.oppRate*segment.minutes},goalChance:{ours:rating.ourGoal,opponent:rating.oppGoal},paceBonus:rating.paceBonus,energy,averageCost:mean(energy.map(p=>p.cost))};
   });
   const counter=previews.find(p=>p.tactic==='counter');let tactic='balanced',rule='balance',reason='체력과 경기 흐름을 함께 관리하는 균형 운영을 제안합니다.';
   if(condition.averageEnergy<65||condition.minimumEnergy<50){rule='fatigue';reason='선발 평균 체력이 65 미만이거나 체력 50 미만 선수가 있습니다. 추가 소모가 큰 압박 전에 휴식·교체와 균형 운영을 확인하세요.';}
   else if(m.phase!=='prep'&&m.score[0]<m.score[1]){tactic='press';rule='chase';reason='현재 뒤지고 있고 선발 체력이 기준을 충족합니다. 공격 찬스 지표를 높이는 전방 압박을 검토하세요. 상대 찬스와 체력 소모도 늘어납니다.';}
   else if(counter.paceBonus>0){tactic='counter';rule='pace';reason='현재 공격진의 체력을 반영한 속도가 상대보다 높아 역습 보너스가 생깁니다. 찬스 횟수 지표가 줄어드는 점도 함께 비교하세요.';}
   return {valid:true,reason:null,fingerprint,context,segment,lineup,condition,current:{rating,comparisons},previews,recommendation:{tactic,label:labels[tactic],reason,rule},assumption:'현재 활동 선수와 미리보기 전술을 유지하고 추가 교체·퇴장이 없다고 가정합니다. 찬스 지표는 현재 체력·전술의 분당 찬스 비율 × 다음 구간 시간입니다. 실제 경기는 매분 체력과 능력 지표가 변하므로 확정 찬스 수나 예상 스코어를 뜻하지 않습니다.'};
  }catch{return invalid('현재 선발과 전술 지표를 읽을 수 없습니다.');}
 }
 const api={read};root.TacticsBoard=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
