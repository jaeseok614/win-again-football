(function(root){
 'use strict';
 function goal(match,event){
  const index=match?.logs?.indexOf(event);if(index<0||index===undefined||event.type!=='goal'||![0,1].includes(event.team))return null;
  const score=[0,0],team=event.team;let trailed=false;
  for(const e of match.logs.slice(0,index)){if(e.type==='goal'&&[0,1].includes(e.team))score[e.team]++;if(score[team]<score[1-team])trailed=true;}
  score[team]++;const margin=score[team]-score[1-team],first=score[0]+score[1]===1;
  const kind=first?'opener':margin===0?'equalizer':margin===1&&trailed?'comeback':margin===1?'lead':margin<0?'chase':'extend';
  const title={opener:'선제골!',equalizer:'동점골!',comeback:'역전골!',lead:'앞서갑니다!',chase:'추격의 골!',extend:'추가골!'}[kind];
  const reactions={opener:['경기장의 공기가 달라집니다. 먼저 골문을 열었습니다!','기다리던 첫 골! 관중석에서 함성이 터집니다.'],equalizer:['다시 같은 출발선! 선수들이 서로를 끌어안습니다.','끝난 경기가 아닙니다. 응원 소리가 다시 커집니다!'],comeback:['경기를 뒤집었습니다! 벤치도 함께 뛰어오릅니다.','뒤지던 흐름을 뒤집는 한 방! 관중석이 들썩입니다.'],lead:['팽팽하던 승부가 기웁니다. 다음 장면도 집중해야 합니다.'],chase:['아직 기회가 있습니다. 공을 들고 중앙으로 달려갑니다.'],extend:['한 걸음 더 앞서갑니다! 동료들이 득점 선수를 에워쌉니다.']};
  return {kind,team,score,title:(event.minute>=80&&['equalizer','comeback'].includes(kind)?'막판 ':'')+title,crowd:reactions[kind][event.minute%reactions[kind].length],route:event.setPiece==='corner'?'코너킥 → 헤더':event.setPiece==='freeKick'?'직접 프리킥':({cross:'측면 크로스 → 마무리',cutback:'골라인 컷백 → 마무리',dribble:'돌파 → 슈팅',through_ball:'침투 패스 → 마무리',combination:'패스 연계 → 슈팅'}[event.action]||'골문을 여는 마무리')};
 }
 function crowd(frame,minute=0){
  if(!frame||frame.phase==='static')return '경기장에 응원 소리가 모입니다.';
  const cues={shot:['숨죽인 관중 · 공이 골문으로!','모두가 슈팅의 끝을 지켜봅니다.'],cross:['응원이 커집니다 · 문전으로 크로스!'],control:['골문 앞 긴장감 · 마지막 터치'],save:['관중석의 탄성 · 골키퍼가 막았습니다!'],saved:['아쉬운 탄성 · 다음 기회를 노립니다.'],goal:['환호가 터집니다 · 골망이 흔들립니다!'],tackle:['치열한 경합에 관중도 술렁입니다.'],'wing-run':['측면으로 달립니다 · 응원이 빨라집니다.'],'restart-setup':['잠깐의 숨 고르기 · 다시 전개할 준비']};
  if(frame.phase==='restart')return '관중석의 여운 속에서 다음 전개를 준비합니다.';
  if(frame.phase==='ball-out')return '공이 라인 밖으로 · 선수들이 다시 자리를 잡습니다.';
  const list=cues[frame.phase];if(list)return list[minute%list.length];
  return minute>=80?'끝까지 집중! 벤치에서도 목소리를 높입니다.':minute>=45?'후반전 · 응원 속에서 다음 기회를 만듭니다.':'패스를 따라 움직이는 관중의 시선';
 }
 const api={goal,crowd};if(typeof module==='object'&&module.exports)module.exports=api;else root.MatchAtmosphere=api;
})(typeof globalThis==='object'?globalThis:this);
