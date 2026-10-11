(function(root){
 'use strict';
 const dependency=(name,file)=>root[name]||(typeof require==='function'?require(file):null);
 const tactics={balanced:'균형 유지',press:'전방 압박',counter:'빠른 역습',lowBlock:'수비 위주'};
 const explanations={balance:'공격과 수비의 출구를 함께 남겨두는 운영을 검토합시다.',fatigue:'압박을 높이기 전에 지친 선발과 후보의 체력을 비교합시다.',underdog:'상대 공격이나 중원이 더 강합니다. 수비 간격과 역습 출구를 함께 확인합시다.',pace:'현재 공격진 속도를 살릴 역습을 검토합시다. 기회 수가 줄어드는 점도 비교하세요.'};
 function leagueForm(s){return [...(s.statistics?.archive||[]).flatMap(a=>a.records),...(s.statistics?.records||[])].filter(g=>g.competition==='league'&&g.statisticsOriginMinute===0&&!g.unassignedGoals).slice(-3).map(g=>({year:g.year,round:g.round,score:[...g.score],result:g.score[0]>g.score[1]?'승':g.score[0]===g.score[1]?'무':'패'}));}
 function read(s,provided=[]){
  const m=s?.match;if(!m||m.phase!=='prep')return {valid:false,reason:'경기 시작 전 준비 화면입니다.'};
  const F=dependency('Football','./engine.js'),O=dependency('Opposition','./opposition.js'),B=dependency('TacticsBoard','./tactics-board.js'),T=dependency('PlayerTraits','./player-traits.js'),Touch=dependency('TouchlinePlan','./touchline-plan.js'),Mood=dependency('StoryMood','./story-mood.js'),R=dependency('Rebirth','./rebirth.js');
  provided=Array.isArray(provided)?provided:[];
  const report=O.read(s),board=B.read(s);if(!report.valid||!board.valid)return {valid:false,reason:board.reason||report.reason||'현재 선발을 확인하세요.'};
  const shape=Touch.read(s,provided),players=shape.rows,counts={DEF:0,MID:0,FW:0};
  const roles=m.lineup.map(id=>{const p=m.players[id],base=p.pos==='GK'?[50,88]:F.formationPositions[m.formation][p.pos][counts[p.pos]++],point=provided.find(r=>r.id===id)||{x:base[0],y:base[1]},code=F.assignedPosition(point.x,point.y,p.pos).code;return {id,identity:p.identity,name:p.name,code,familiar:T.preferredPositions(p).includes(code),fit:T.suitability(p,code)};});
  const tired=players.filter(p=>p.energy<65).sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id)),unfamiliar=roles.filter(p=>!p.familiar),focus=Mood.summary(m),form=leagueForm(s),contract=R.read(s);
  let priority={id:'tactic',title:board.recommendation.label+'을 검토합시다',text:explanations[board.recommendation.rule]||explanations.balance,action:'analysis',label:'전술 지표 비교'};
  if(shape.shape.isolated.length){const p=shape.shape.isolated[0];priority={id:'support',title:'가까운 지원 선수를 확인합시다',text:p.name+' 주변에 가까운 필드 동료가 없습니다. 실제 배치의 간격과 패스 출구를 점검하세요.',action:'tactics',label:'배치에서 확인'};}
  if(unfamiliar.length){const p=unfamiliar[0];priority={id:'role',title:p.name+'의 역할을 확인합시다',text:p.code+'는 익숙한 위치 목록에 없습니다. 능력과 위치 적합도를 보고 의도한 배치인지 결정하세요.',action:'tactics',label:'역할·배치 검토',playerId:p.id};}
  if(focus.negative>=3)priority={id:'mood',title:'앞선 대화의 부담이 남아 있습니다',text:'현재 선발·후보 중 '+focus.negative+'명이 서사로 부담을 느낍니다. 반응을 살피고 경기 전 대화 여부를 정하세요.',action:'talk',label:'선수들에게 말하기'};
  if(tired.length){const p=tired[0];priority={id:'fatigue',title:p.name+'부터 회복을 확인합시다',text:'선발 중 체력 65 미만 '+tired.length+'명. 후보와 현재 체력을 비교하고 압박 소모까지 확인하세요.',action:'roster',label:'선발·후보 비교',playerId:p.id};}
  const context=contract.enabled&&contract.warning?{kind:'warning',title:'이번 삶의 마지막 기회',text:'다음 리그 '+contract.warning.remaining+'경기 · 최후통첩 승점 '+contract.warning.points+' / 3점. 컵 결과는 포함되지 않습니다.',action:'rebirth',label:'계약 조건 확인'}:contract.enabled&&contract.mission?{kind:'promise',title:contract.mission.speaker+'와 한 약속',text:contract.mission.targetText+' · 현재 '+contract.mission.value+' · 리그 '+contract.mission.remaining+'경기 남음.',action:'rebirth',label:'약속 진행 확인'}:{kind:'opponent',title:'상대의 주요 위협',player:{...report.keyPlayer},text:report.keyPlayer.role+' · '+report.keyPlayer.threat,label:report.keyPlayer.name};
  return {valid:true,opponent:{name:report.club.name,short:report.club.short,formation:report.plan.formation,label:report.plan.label},priority,context,form,checks:[{label:'선발 평균 체력',value:Math.round(board.condition.averageEnergy)},{label:'낯선 역할',value:unfamiliar.length+'명'},{label:'피로 주의',value:tired.length+'명'}],instruction:F.attackFocuses[F.attackFocus(m)],tactic:tactics[m.tactic],recommendation:{...board.recommendation},roles,footnote:'코치 분석입니다. 지시와 선발은 검토한 뒤 직접 결정하세요.'};
 }
 const api={read,leagueForm};root.MatchPreparation=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
