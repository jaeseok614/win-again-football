(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),M=root.Movement||(typeof require==='function'?require('./movement.js'):null),O=root.Opposition||(typeof require==='function'?require('./opposition.js'):null);
 const kinds={goal:'골',shot:'슈팅·선방',chance:'공격 차단'},paths={cross:'크로스',cutback:'컷백',through_ball:'침투 패스',dribble:'개인 돌파',combination:'패스 연계',corner:'코너킥',freeKick:'직접 프리킥'};
 function read(s,{pendingEvent=null}={}){
  const m=s?.match;if(!m||!Array.isArray(m.logs)||!Array.isArray(m.segments)||!m.players||!Number.isInteger(m.minute))return {valid:false,scenes:[]};
  const origin=Math.max(0,m.statisticsOriginMinute||0),scenes=[];
  for(let index=0;index<m.logs.length;index++){
   const e=m.logs[index];if(e===pendingEvent||!Object.hasOwn(kinds,e?.type)||![0,1].includes(e.team)||!Number.isInteger(e.minute)||e.minute<=origin||e.minute>m.minute)continue;
   const segment=m.segments.find(seg=>e.minute>seg.start&&e.minute<=(seg.end??m.minute));if(!segment)continue;
   const actor=e.team===0?m.players[e.actorId||e.scorerId]:null;
   scenes.push({id:index,minute:e.minute,team:e.team,type:e.type,path:paths[e.setPiece||e.action]||'공격 장면',actorName:actor?.name||null,label:e.minute+'′ · '+(e.team===0?'우리':'상대')+' · '+kinds[e.type]+' · '+(paths[e.setPiece||e.action]||'공격')});
  }
  return {valid:true,scenes,minute:m.minute,limited:origin>0,note:'현재 경기의 기록된 장면을 당시 선발과 전술로 2D 재구성합니다. 실제 위치 추적 영상은 아닙니다. 결과 확정 후에는 이번 장면 목록이 끝납니다.'};
 }
 function prepare(s,id,{pendingEvent=null,positions={}}={}){
  const list=read(s,{pendingEvent}),scene=list.scenes.find(e=>e.id===id);if(!scene)return {valid:false};
  const m=s.match,event=m.logs[id],segment=m.segments.find(seg=>event.minute>seg.start&&event.minute<=(seg.end??m.minute)),cards=(m.discipline?.events||[]).filter(e=>e.minute<event.minute),ownRed=new Set(cards.filter(e=>e.team===0&&e.card==='red').map(e=>e.id)),opponentRed=cards.filter(e=>e.team===1&&e.card==='red').map(e=>e.id),score=[0,0];
  for(const e of m.logs.slice(0,id))if(e.type==='goal'&&[0,1].includes(e.team))score[e.team]++;
  const match={...m,lineup:[...segment.lineup],tactic:segment.tactic,minute:event.minute,phase:'first',score,opponentPlans:(m.opponentPlans||[]).filter(p=>p.minute<event.minute),discipline:m.discipline?{...m.discipline,events:cards}:undefined},report=O.read({...s,match});if(!report.valid)return {valid:false};
  const counts={DEF:0,MID:0,FW:0},layout=F.formationPositions[m.formation],rows=segment.lineup.map(id=>{const p=m.players[id],base=p.pos==='GK'?[50,88]:layout[p.pos]?.[counts[p.pos]++]||[50,50],saved=positions[p.identity],point=Array.isArray(saved)&&saved.length===2&&saved.every(Number.isFinite)?saved:base;return {id,p,x:point[0],y:point[1]};}).filter(p=>!ownRed.has(p.id));
  const eventElapsedMs=(event.minute*197)%(M.passing.segment*8),input={match,event,positions:rows,opponentRoster:report.lineup,opponentFormation:report.plan.formation,dismissedOpponent:opponentRed,eventElapsedMs,motion:true};
  input.eventOrigin=M.frame({...input,event:null,elapsedMs:eventElapsedMs});
  const performer=M.frame({...input,elapsedMs:eventElapsedMs+M.timing.shot,eventAgeMs:M.timing.shot}).performerName;
  return {valid:true,scene:{...scene,actorName:scene.actorName||performer||null},event,input,duration:M.timing.end-1,club:report.club,ownName:m.homeName};
 }
 function frame(clip,age=0){if(!clip?.valid)return {valid:false};const elapsed=Math.max(0,Math.min(clip.duration,Number.isFinite(age)?age:0)),value=M.frame({...clip.input,elapsedMs:clip.input.eventElapsedMs+elapsed,eventAgeMs:elapsed});return {valid:true,...value,age:elapsed,commentary:elapsed>=M.impactAge(clip.event)?M.commentary(clip.event,clip.input.match,clip.input.opponentRoster,value):M.liveCommentary(value)};}
 const api={read,prepare,frame,kinds,paths};root.MatchReplay=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
