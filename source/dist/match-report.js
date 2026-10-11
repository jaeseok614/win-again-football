(function(root){
 'use strict';
 const dependency=(name,file)=>root[name]||(typeof require==='function'?require(file):null);
 function coach(m){
  if(m.phase!=='full'||m.presentationPending||(m.statisticsOriginMinute||0)>0)return null;
  const F=dependency('Football','./engine'),logs=m.logs.filter(e=>!['start','break'].includes(e.type)).slice().reverse(),attacks=team=>logs.filter(e=>e.team===team&&['goal','shot','chance'].includes(e.type)),ours=attacks(0),against=attacks(1),goals=against.filter(e=>e.type==='goal'),red=(m.discipline?.events||[]).filter(e=>e.team===0&&e.card==='red'),crosses=ours.filter(e=>e.action==='cross'),blocked=ours.filter(e=>e.type==='chance');
  const report=(kind,title,evidence,advice,event=null)=>({kind,title,evidence,advice,eventIndex:event?logs.indexOf(event):-1}),clock=e=>F.clockLabel(m,e.minute)+'′',names={cross:'크로스',cutback:'컷백',dribble:'개인 돌파',pass:'패스 연계',through:'침투 패스',counter:'역습',corner:'코너킥',freeKick:'프리킥'};
  if(red.length){const first=red[0],later=goals.filter(e=>e.minute>first.minute);return report('red','한 명 적어진 뒤의 간격',clock(first)+' 우리 퇴장 · 이후 실점 '+later.length+'골','코치: “다음에는 퇴장 뒤 중앙과 측면을 누가 함께 메우는지 전술판에서 확인하죠.”',later[0]||logs.find(e=>e.type==='card'&&e.team===0&&e.card==='red'));}
  const repeated=goals.find(e=>e.action&&goals.filter(g=>g.action===e.action).length>=2);
  if(repeated){const label=names[repeated.action]||'같은 공격';return report('repeated','반복된 '+label+' 실점',label+' 장면에서 '+goals.filter(e=>e.action===repeated.action).length+'실점 · 마지막 '+clock(repeated),'코치: “같은 길을 또 내줬군요. 장면을 보고 수비 간격과 커버 역할부터 다시 정하죠.”',repeated);}
  if(crosses.length>=3&&crosses.filter(e=>e.type==='chance').length>=2)return report('cross','크로스의 마지막 연결','크로스 공격 '+crosses.length+'회 · 슈팅 전 차단 '+crosses.filter(e=>e.type==='chance').length+'회','코치: “공을 올리는 선수와 받는 선수 사이를 보죠. 다음 준비에서 위치와 역할을 함께 확인합시다.”',crosses.find(e=>e.type==='chance'));
  if(m.score[0]===0&&m.shots[0]>=4)return report('finishing','슈팅 직전의 선택','우리 슈팅 '+m.shots[0]+'회 · 0득점 · xG '+Number(m.xg?.[0]||0).toFixed(2),'코치: “시도는 나왔습니다. 막힌 슈팅을 같이 보고, 다음에는 받는 위치와 마지막 선택을 점검하죠.”',ours.find(e=>e.type==='shot'));
  if(blocked.length>=3&&m.shots[0]*2<=m.chances[0])return report('blocked','슈팅까지 이어 가는 길','공격 기회 '+m.chances[0]+'회 · 슈팅 '+m.shots[0]+'회 · 슈팅 전 차단 '+blocked.length+'회','코치: “첫 패스보다 그다음 지원이 필요해 보입니다. 막힌 장면에서 동료의 간격부터 살펴보죠.”',blocked[0]);
  const tired=Object.values(m.players).filter(p=>p.minutes>=30&&p.energy<50).sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id));
  if(tired.length>=3)return report('fatigue','다음 경기까지의 회복', '30분 이상 뛴 '+tired.length+'명이 체력 50 미만','코치: “오늘 뛴 선수의 회복과 후보의 준비를 함께 보죠. 다음 선발은 몸 상태를 확인한 뒤 정합시다.”');
  return report('next','다음 상대에게 가져갈 한 가지','최종 '+m.score.join(' : ')+' · 슈팅 '+m.shots.join(' : '),'코치: “잘된 장면 하나와 막힌 장면 하나를 남기죠. 다음 상대의 배치를 보고 유지할 것부터 정합시다.”',ours.find(e=>e.type==='chance')||ours[0]||against[0]);
 }
 function read(s,m=s?.match){
  if(!m)return {valid:false};const F=dependency('Football','./engine'),S=dependency('Season','./season'),Day=dependency('Matchday','./matchday'),Performance=dependency('MatchPerformance','./match-performance'),d=Day.read({match:m});if(!d.valid)return {valid:false};
  const pending=!!m.presentationPending,performance=Performance.fromMatch(m),facts=[{key:'chances',label:'공격 기회',own:m.chances[0],opponent:m.chances[1]},{key:'shots',label:'슈팅',own:m.shots[0],opponent:m.shots[1]},...Day.facts(m).map(r=>pending&&r.key==='xg'?{...r,own:'장면 재생 중',opponent:'장면 재생 중'}:{...r})],players=performance.rows.map(p=>({...p,highlights:[...p.highlights]})),moments=m.logs.filter(e=>!['start','break'].includes(e.type)).slice().reverse().map(e=>({minute:F.clockLabel(m,e.minute),type:e.type,event:JSON.parse(JSON.stringify(e)),text:S.displayText(F.displayText(e.text,m.players))}));
  return {valid:true,own:S.club(S.own).short,opponent:S.opponentFor(s).short,score:[...m.score],minute:F.clockLabel(m),status:pending?'장면 재생 중':d.status,facts,players,moments,best:players[0]||null,coach:coach(m),canConfirm:m.phase==='full'&&!pending,full:m.phase==='full',pending,formula:performance.formula,flow:d.momentum.message};
 }
 const api={read};root.MatchReport=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
