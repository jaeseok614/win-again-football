(function(root){
 'use strict';
 const rebirth=()=>root.Rebirth||(typeof require==='function'?require('./rebirth.js'):null);
 const questions={results:'승리로 답하겠다고 했습니다. 지금의 기준과 준비를 어떻게 설명하시겠습니까?',guardian:'골문이 흔들렸습니다. 누군가를 지목하기 전에, 함께 준비한 것을 설명해 주세요.',spotlight:'기자들은 약속했던 말을 다시 꺼낼 겁니다. 어떻게 답하시겠습니까?',accounts:'더 큰 약속이 곧 답은 아닐 겁니다. 어디서 준비가 부족했는지 말해 주세요.',classic:'결과가 약속에 닿지는 못했습니다. 선수들에게 무엇부터 말하시겠습니까?'};
 function events(s,year){
  if(!s?.rebirth)return [];const R=rebirth(),run=R.read(s),all=[...(s.statistics?.archive||[]).flatMap(a=>a.records),...(s.statistics?.records||[])],out=[],voices=new Set();
  // At most one completed promise per voice and season. Cups, partial receipts
  // and an unconfirmed third game cannot anchor a meeting.
  for(const t of run.timeline){
   if(!['fulfilled','missed'].includes(t.kind))continue;const after=t.after-3,rows=run.records.slice(after,t.after),last=rows.at(-1);if(last?.year!==year||rows.length!==3)continue;
   const games=rows.map(r=>all.find(g=>g.year===r.year&&g.round===r.round&&g.competition==='league'&&g.statisticsOriginMinute===0&&!g.unassignedGoals&&JSON.stringify(g.score)===JSON.stringify(r.score)));if(games.some(g=>!g))continue;
   const choice=s.rebirth.decisions.find(d=>d.after===after&&d.kind==='deal'),request=R.request(after,run.contractStyle),option=request.options.find(o=>o.id===choice?.option);if(!option||voices.has(request.speaker))continue;voices.add(request.speaker);
   const success=t.kind==='fulfilled',relation={구단주:'board','서포터 대표':'fans','수석 코치':'coach'}[request.speaker],owner=request.speaker==='구단주',score=rows.map(g=>g.year+'시즌 '+g.round+'R '+g.score.join(' : ')).join(' / '),value=option.metric==='points'?'승점 '+t.value+'점':option.metric==='conceded'?t.value+'실점':option.metric==='goals'?t.value+'득점':t.value+'승';
   const opening=owner?(success?'“약속한 기준에는 닿았습니다. 그동안 선수들은 어땠습니까?”':'“'+questions[run.contractStyle]+'”'):request.speaker==='서포터 대표'?(success?'“우리 노래가 다시 커졌죠. 그래도 지친 사람들의 목소리는 들으셨나요?”':'“우리는 다음에도 올 겁니다. 지키지 못한 말도 직접 들었으면 해요.”'):(success?'“목표는 넘었습니다. 어떤 장면이 선수들의 힘으로 남았을까요?”':'“수첩의 목표와 경기장은 달랐습니다. 누구 탓보다, 본 장면부터 다시 보죠.”');
   out.push({key:'contract-result-'+after+'-'+option.id,round:last.round,relation,speaker:request.speaker,title:'약속의 세 경기 · '+(success?'지킨 말':'남은 말'),context:'확정 리그 3경기 · '+(owner?run.contract.label:request.speaker),conflict:true,
    scene:request.speaker+'에게 했던 말: “'+option.label+'”\n목표: '+R.targetText(option)+' · 실제 '+value+' · '+(success?'달성':'미달성')+'\n'+score+'\n\n'+request.speaker+': '+opening,
    question:success?'약속을 지킨 뒤, 누구의 어떤 이야기를 먼저 들을까요?':'지키지 못한 약속을 어떻게 설명할까요?',
    options:success?['목표를 버틴 선수들의 부담부터 듣겠습니다','성과를 인정하고 다음 준비의 기준을 말하겠습니다','잘된 장면과 바꿀 점을 나누어 보겠습니다']:['기다린 사람들에게 이유와 책임을 직접 말하겠습니다','기준은 지키되 준비가 부족했던 책임을 지겠습니다','확정된 세 경기에서 바꿀 점부터 설명하겠습니다'],
    replies:success?['“기뻐하면서도 힘들었다고 말할 수는 있겠군요.”','“다음에도 같은 결과를 보장하는 말로 듣지는 않겠습니다.”','“점수 뒤에 남은 장면도 같이 보죠.”']:['“핑계가 아니라 설명을 기다렸습니다. 말할 자리를 남겨 주세요.”','“선수 한 명이 전부 책임지는 답은 아니군요.”','“그럼 기억과 추측보다 실제 장면부터 보겠습니다.”'],
    followQuestion:'“목표를 이루거나 놓친 뒤에도, 어떤 대화를 직접 이어가시겠습니까?”',followOptions:['선수와 팬이 감당한 부담부터 듣겠습니다','성과와 사람의 평가를 나누어 설명하겠습니다'],
    finalReplies:['문 앞에서 끝내려던 이야기를 의자에 앉아 다시 듣는다. 다음 결과를 약속하지 않아도 대화는 남는다.','성적표는 그대로다. 그 옆에 사람의 사정과 다음에 확인할 일이 적힌다. 새로운 목표는 다음 면담에서 정한다.']});
  }
  return out;
 }
 const api={events};root.StoryContracts=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
