(function(root){
 'use strict';
 const dependency=(name,file)=>root[name]||(typeof require==='function'?require(file):null);
 function read(s,m=s?.match){
  if(!m)return {valid:false};const F=dependency('Football','./engine'),S=dependency('Season','./season'),Day=dependency('Matchday','./matchday'),Performance=dependency('MatchPerformance','./match-performance'),d=Day.read({match:m});if(!d.valid)return {valid:false};
  const pending=!!m.presentationPending,performance=Performance.fromMatch(m),facts=[{key:'chances',label:'공격 기회',own:m.chances[0],opponent:m.chances[1]},{key:'shots',label:'슈팅',own:m.shots[0],opponent:m.shots[1]},...Day.facts(m).map(r=>pending&&r.key==='xg'?{...r,own:'장면 재생 중',opponent:'장면 재생 중'}:{...r})],players=performance.rows.map(p=>({...p,highlights:[...p.highlights]})),moments=m.logs.filter(e=>!['start','break'].includes(e.type)).slice().reverse().map(e=>({minute:F.clockLabel(m,e.minute),type:e.type,event:JSON.parse(JSON.stringify(e)),text:S.displayText(F.displayText(e.text,m.players))}));
  return {valid:true,own:S.club(S.own).short,opponent:S.opponentFor(s).short,score:[...m.score],minute:F.clockLabel(m),status:pending?'장면 재생 중':d.status,facts,players,moments,best:players[0]||null,canConfirm:m.phase==='full'&&!pending,full:m.phase==='full',pending,formula:performance.formula,flow:d.momentum.message};
 }
 const api={read};root.MatchReport=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
