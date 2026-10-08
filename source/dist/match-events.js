(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null);
 function read(match,{pendingGoal=null}={}){
  if(!match)return [];
  const cards=[],add=(id,title,text,target,extra={})=>cards.push({id,title,text,target,...extra}),players=match.players||{},logs=match.logs||[],score=[...match.score];
  if(pendingGoal?.type==='goal'&&[0,1].includes(pendingGoal.team))score[pendingGoal.team]=Math.max(0,score[pendingGoal.team]-1);
  const red=new Set(logs.filter(e=>e.type==='card'&&e.team===0&&e.card==='red').map(e=>e.id)),active=match.lineup.map(id=>players[id]).filter(p=>p&&!red.has(p.id));
  if(match.phase==='prep'){add('opening','작은 구장, 오늘의 첫 선택','상대의 전술과 선발 체력을 확인하고 우리 팀의 첫 계획을 정하세요.','opponent');return cards;}
  if(match.phase==='full'){add('full','휘슬 뒤에도 이야기는 이어집니다','경기 기록을 확인하고 결과를 확정하면 선수와 팬의 후속 대화가 도착합니다.','stats');return cards;}
  const opponentRed=new Set(logs.filter(e=>e.type==='card'&&e.team===1&&e.card==='red').map(e=>e.id));
  if(red.size>opponentRed.size)add('outnumbered','수적 열세, 빈자리를 메울 시간','퇴장 '+red.size+'명. 남은 선수의 배치와 수비 전환을 확인하세요. 퇴장 선수 자리에 교체 투입은 할 수 없습니다.','tactics',{tactic:'lowBlock'});
  if(opponentRed.size>red.size)add('numerical-edge','수적 우위, 차분하게 공략하기','상대가 더 적은 인원으로 뛰고 있습니다. 강한 압박은 기회를 늘리지만 우리 체력도 더 쓰므로 현재 배치를 확인하세요.','tactics',{tactic:'press'});
  const tired=active.filter(p=>p.energy<60&&p.minutes>0).sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id))[0],rules=F.substitutionRules(match),canSub=match.minute>0&&match.subs<rules.limit&&(match.minute===45||rules.windows<rules.windowLimit||(match.decisions||[]).some(d=>d.type==='sub'&&d.minute===match.minute));
  if(tired){const bench=Object.values(players).some(p=>p.pos===tired.pos&&!match.lineup.includes(p.id)&&!match.out.includes(p.id)&&F.isAvailable(p));add('fatigue:'+tired.identity,'거친 숨, 벤치의 시선',tired.name+'의 체력 '+Math.round(tired.energy)+'. '+(canSub&&bench?'같은 포지션 후보와 비교해 교체를 판단하세요.':'현재 교체 조건을 확인하고 압박 강도를 조절할 수 있습니다.'),canSub&&bench?'roster':'tactics',{playerId:tired.id,identity:tired.identity,...(!canSub||!bench?{tactic:'balanced'}:{})});}
  if(match.minute>=70){const diff=score[0]-score[1];if(diff>0)add('protect','마지막 휘슬까지 지켜낼까요?',match.minute+'분, '+score[0]+' : '+score[1]+'. 수비적으로 전환하면 공격 기회와 압박이 줄어듭니다.','tactics',{tactic:'lowBlock'});else add('chase','마지막 승부수의 시간',match.minute+'분, '+score[0]+' : '+score[1]+'. 강한 압박은 기회를 늘리는 대신 체력을 더 씁니다.','tactics',{tactic:'press'});}
  if(match.phase==='half')add('half','라커룸에서 바꿀 한 가지','전반의 슈팅과 체력을 보고 후반 지시를 정하세요. 하프타임 교체는 진행 중 교체 기회를 쓰지 않습니다.','talk');
  const booked=active.find(p=>logs.some(e=>e.type==='card'&&e.team===0&&e.id===p.id&&e.card==='yellow'));
  if(booked)add('booked:'+booked.identity,'경고를 안고 뛰는 선수',booked.name+'이 경고를 받았습니다. 현재 체력과 후보를 확인하고 교체 여부를 판단하세요.','roster',{playerId:booked.id,identity:booked.identity});
  if(match.minute>=25&&score[0]===0&&match.shots[0]>=3)add('finishing','두드리지만 열리지 않는 골문','슈팅 '+match.shots[0]+'회, 아직 득점이 없습니다. 무조건 밀어붙이기 전에 상대와 전술을 비교해 보세요.','analysis');
  if(!cards.length)add('watch','벤치에서 경기를 읽는 중','아직 급하게 바꿀 신호는 없습니다. 공격 흐름과 체력을 지켜보며 원하는 순간에 멈춰 판단하세요.','stats');
  return cards;
 }
 const api={read};root.MatchEvents=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
