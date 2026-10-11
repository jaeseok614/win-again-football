(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),D=root.Discipline||(typeof require==='function'?require('./discipline.js'):null);
 // A fresh, read-only briefing. No previews of unchosen talks or engine bonuses.
 function read(season){
  const m=season?.match;if(!m||m.phase!=='half')return null;
  const active=D.active(m).map(id=>m.players[id]),reds=[0,1].map(team=>D.dismissed(m,team).length),from=Math.max(1,m.minute-14);
  const recent=[0,1].map(team=>m.logs.filter(e=>['shot','goal'].includes(e.type)&&e.team===team&&e.minute>=from&&e.minute<=m.minute).length);
  const tired=active.slice().sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id,'en'))[0];
  const ahead=m.score[0]>m.score[1],behind=m.score[0]<m.score[1],rules=F.substitutionRules(m),remaining=Math.max(0,rules.limit-m.subs);
  let advice={id:'balance',title:'다음 한 번의 기회를 준비합시다',text:'동점입니다. 서두르기 전에 상대 배치와 우리 공격 지시를 함께 확인해 보세요.',action:'tactics'};
  if(ahead)advice={id:'lead',title:'리드는 지키되, 출구를 남겨둡시다',text:'앞서고 있습니다. 무조건 물러서기보다 역습에 나갈 선수와 수비 간격을 확인해 보세요.',action:'tactics'};
  if(behind)advice={id:'chase',title:'만회할 방법부터 정합시다',text:'뒤지고 있습니다. 크로스·돌파·패스 연계 중 우리 선수에게 맞는 공격 방법을 검토해 보세요.',action:'tactics'};
  if(recent[1]>=recent[0]+2)advice={id:'pressure',title:'최근 상대 슈팅이 더 많습니다',text:from+'–'+m.minute+'분 슈팅 '+recent[0]+' : '+recent[1]+'. 수비 간격과 압박 지시를 점검해 보세요.',action:'tactics'};
  if(tired&&tired.energy<65)advice={id:'fatigue',title:tired.name+'의 체력을 확인하세요',text:'현재 체력 '+Math.round(tired.energy)+'. '+(remaining?'남은 교체 '+remaining+'명. 후보의 포지션과 체력을 비교해 보세요.':'교체를 모두 썼습니다. 압박 강도와 역할을 점검해 보세요.'),action:remaining?'roster':'tactics',playerId:tired.id};
  if(reds[0]>reds[1])advice={id:'red',title:'수적 열세에 맞춰 다시 배치합시다',text:'퇴장 우리 '+reds[0]+'명 · 상대 '+reds[1]+'명. 비어 있는 구역과 수비 역할부터 확인해 보세요.',action:'tactics'};
  const talk=m.decisions.find(d=>d.type==='talk'&&d.minute===m.minute);
  return {score:m.score.slice(),minute:m.minute,advice,stats:[{label:'슈팅',values:m.shots.slice()},{label:'공격 기회',values:m.chances.slice()},{label:'기대 득점',values:m.xg.map(n=>n.toFixed(2))}],recent:{from,to:m.minute,shots:recent},remaining,talkDone:!!talk,changes:m.decisions.filter(d=>d.type==='sub'&&d.minute===m.minute).length};
 }
 const api={read};root.Halftime=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
