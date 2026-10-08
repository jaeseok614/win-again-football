(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),Day=root.Matchday||(typeof require==='function'?require('./matchday.js'):null),Events=root.MatchEvents||(typeof require==='function'?require('./match-events.js'):null),S=root.Season||(typeof require==='function'?require('./season.js'):null);
 // A summary must never announce a shot's result before the ball arrives.
 function visible(match,pending){
  if(!pending||!match.logs.includes(pending)||!['chance','shot','goal'].includes(pending.type)||![0,1].includes(pending.team))return match;
  const m={...match,logs:match.logs.filter(e=>e!==pending),score:[...match.score],shots:[...match.shots],chances:[...match.chances],xg:[...match.xg]};
  m.chances[pending.team]=Math.max(0,m.chances[pending.team]-1);
  if(pending.type!=='chance')m.shots[pending.team]=Math.max(0,m.shots[pending.team]-1);
  if(pending.type==='goal')m.score[pending.team]=Math.max(0,m.score[pending.team]-1);
  return m;
 }
 function read(match,{pendingEvent=null}={}){
  if(!match?.logs||!match.players||!match.lineup?.length)return {valid:false};
  const m=visible(match,pendingEvent),d=Day.read({match:m});if(!d.valid)return {valid:false};
  const goals=m.logs.filter(e=>e.type==='goal'&&e.team===0),counts=new Map();
  for(const e of goals){const p=m.players[e.actorId];if(p)counts.set(p.identity,{identity:p.identity,name:p.name,goals:(counts.get(p.identity)?.goals||0)+1});}
  const leaders=[...counts.values()].sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name,'ko')),leader=leaders.length&&(!leaders[1]||leaders[0].goals>leaders[1].goals)?leaders[0]:null;
  const moments=m.logs.filter(e=>['goal','shot','card'].includes(e.type)).slice(-2).reverse().map(e=>({minute:e.minute,team:e.team,type:e.type,text:e.type==='card'?S.displayText(F.displayText(e.text,m.players)):(e.team===0?m.players[e.actorId]?.name||'우리 팀':S.displayText(m.opponentName))+' · '+(e.setPiece==='corner'?'코너킥 ':e.setPiece==='freeKick'?'프리킥 ':'')+(e.type==='goal'?'득점':'슈팅')}));
  const own=m.score[0],other=m.score[1],title=m.phase==='prep'?'킥오프를 기다리는 구장':m.phase==='half'?'후반을 바꿀 15분':m.phase==='full'?'휘슬 뒤에 남은 장면':'지금, 경기의 흐름';
  const alert=Events.read(m).find(e=>!['opening','watch','full','half'].includes(e.id));
  const advice=m.phase==='full'?{title:'다음 이야기로 이어가기',text:'경기로 돌아가 결과를 확정하면 선수 성장과 구단 대화에 반영됩니다.',target:'stats',label:'전체 경기 기록'}:alert?{title:alert.title,text:alert.text,target:alert.target,label:alert.target==='roster'?'선수 교체 검토':'전술·흐름 검토'}:{title:m.phase==='half'?'후반, 선수들에게 한마디':'지금의 준비를 점검하세요',text:m.phase==='half'?'전반의 흐름과 체력을 보고 선수들에게 후반의 방향을 전하세요.':'상대의 배치와 우리 선수의 체력을 비교하고 다음 지시를 정하세요.',target:m.phase==='half'?'talk':'tactics',label:m.phase==='half'?'하프타임 대화':'전술 확인'};
  if(alert?.playerId&&m.phase!=='full'){advice.playerId=alert.playerId;advice.title=m.players[alert.playerId].name+' · '+(alert.id.startsWith('booked:')?'경고 관리':'체력 '+Math.round(m.players[alert.playerId].energy));}
  const possession=Day.facts(m).find(r=>r.key==='possession');
  return {valid:true,title,minute:m.minute,phase:m.phase,score:[own,other],pending:m!==match,limited:m.statisticsOriginMinute>0,hero:leader,shared:leaders.length>1&&leaders[0].goals===leaders[1].goals,stats:[{label:'슈팅',values:[...m.shots]},{label:'공격 기회',values:[...m.chances]},{label:'점유율 · 추정',values:[possession.own,possession.opponent]}],energy:Math.round(d.averageEnergy),remaining:d.substitution.remaining,flow:d.momentum,moments,advice,art:m.phase==='full'?(own<other?'rebound':other===0?'keeper':'huddle'):'huddle'};
 }
 const api={read};root.MatchBrief=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
