(function(root){
 'use strict';
 const rebirth=()=>root.Rebirth||(typeof require==='function'?require('./rebirth.js'):null);
 const voices={
  calm:{thought:'이번에는 조급함부터 내려놓자. 기억나는 건 결과보다 문이 닫히던 순간이다.',question:'마음이 급해질 때, 누구에게 먼저 말하겠습니까?',answers:['선수의 불안을 듣고 내 마음도 말하겠습니다','흔들려도 목표를 분명히 말하겠습니다','다음 경기에서 바꿀 한 가지만 정하겠습니다']},
  fight:{thought:'이겼던 날의 함성은 남았다. 하지만 그 함성만으로 다음 경기를 살 수는 없었다.',question:'승리를 바라는 감독님은, 선수들에게 무엇을 요구하겠습니까?',answers:['그날 버텼던 사람들의 역할부터 듣겠습니다','이번에도 도전할 이유를 분명히 말하겠습니다','승리와 다음 경기 준비를 나누겠습니다']},
  together:{thought:'같은 점수판 앞에서도 버틴 날이 있었다. 이번에는 혼자 버티게 두지 말자.',question:'결과가 바로 나오지 않는 날에도, 선수들과 어떤 말을 이어가겠습니까?',answers:['힘든 이유를 서로 숨기지 않겠습니다','포기하지 않을 기준을 말하겠습니다','회복과 다음 역할을 함께 확인하겠습니다']}
 };
 function memory(s){
  const b=s?.rebirth,p=b?.previous?.at(-1);if(!p||b.attempt<=1||!voices[b.memory])return null;
  const old=rebirth().simulate(p.records,p.decisions,p.memory,p.attempt>1,p.contractStyle),last=p.records.at(-1);
  return {attempt:b.attempt,previous:p.attempt,kind:b.memory,name:rebirth().memories[b.memory].name,status:p.status,played:p.records.length,wins:old.wins,points:old.points,division:p.division,last:last?{...last,score:[...last.score]}:null,warning:old.timeline.find(t=>t.kind==='warning')||null,missed:old.timeline.find(t=>t.kind==='missed')||null};
 }
 function opening(s){
  const m=memory(s);if(!m)return null;
  return {title:m.status==='returned'?'귀환 뒤에도, 다시 그 감독실':'문이 닫혔는데, 다시 아침이었다',text:(m.status==='returned'?'1부 귀환의 함성이 아직 귓가에 남아 있다.':'끝난 계약서 위로 문 닫히는 소리가 겹친다.')+' 눈을 뜨니 낡은 책상, 같은 5부 일정표다.\n\n이번은 '+m.attempt+'번째 삶. 지난 '+m.previous+'번째 삶: '+m.played+'경기 · '+m.wins+'승. 남긴 기억은 '+m.name+'.\n\n‘'+voices[m.kind].thought+'’\n\n코치: “감독님? 구단주가 기다립니다.” 그에게는 첫 만남이다.'};
 }
 function completed(s,year){return ((year===s.year?s.statistics?.records:s.statistics?.archive?.find(a=>a.year===year)?.records)||[]).filter(g=>g.competition==='league'&&g.statisticsOriginMinute===0&&!g.unassignedGoals).sort((a,b)=>a.round-b.round);}
 function events(s,year){
  const m=memory(s);if(!m)return [];const games=completed(s,year),records=s.clubStory?.records||[],out=[];
  const add=(key,round,relation,title,scene,question,options,replies,followQuestion,followOptions,finalReplies)=>out.push({key,round,relation,speaker:relation==='board'?'구단주':'수석 코치',title,scene,question,options,replies,followQuestion,followOptions,finalReplies,conflict:true,context:m.attempt+'번째 삶 · '+m.name});
  if(year===1&&games.length){
   const key='memory-return-'+m.kind,v=voices[m.kind],first=games[0];
   add(key,first.round,'coach','같은 비, 다른 대답','이번 삶의 첫 확정 리그 경기: '+first.score[0]+' : '+first.score[1]+'.\n\n‘지난 삶의 '+m.played+'경기를 기억하는 사람은 나뿐이다. 선수들은 그 패배도, 그 약속도 모른다.’\n코치: “처음인데도, 잠깐 오래된 표정을 지으셨네요.”',v.question,v.answers,['“처음부터 다 말할 필요는 없습니다. 들을 자리는 남겨 두죠.”','“목표는 듣겠습니다. 하지만 선수들은 감독님 기억 속 사람들이 아닙니다.”','“그러면 오늘 확인한 장면부터 보죠. 아직 일어나지 않은 결과는 빼고요.”'],'코치가 수첩을 덮는다. “이번에는 같은 대답을 반복하지 않아도 됩니다. 무엇을 지키겠습니까?”',['이 사람들의 지금 이야기를 듣겠습니다','기억이 있어도 결과는 보장하지 않겠습니다'],['코치: “그럼 저도 지금 본 것부터 말씀드리죠.” 오래된 기억 옆에 새로운 대답을 적는다.','“기억과 예측은 다르군요.” 코치는 다음 상대 보고서를 건넨다.']);
   const done=records.find(r=>r.event==='1:'+key&&r.step===1),firstAnswer=records.find(r=>r.event==='1:'+key&&r.step===0),later=done?games.filter(g=>g.round>done.atRound).slice(0,2):[];
   if(later.length===2){
    const label=done.choice==='commit'?'이 사람들의 지금 이야기를 듣겠습니다':'기억이 있어도 결과는 보장하지 않겠습니다',points=later.reduce((n,g)=>n+(g.score[0]>g.score[1]?3:g.score[0]===g.score[1]?1:0),0);
    add('memory-answer-'+m.kind,later[1].round,'coach','기억에 없던 두 경기','코치의 수첩에 “'+label+'”가 남아 있다. 그 뒤 실제 두 리그 경기에서 승점 '+points+'점을 얻었다.\n\n'+(firstAnswer.choice==='bold'?'“분명한 목표를 말한 뒤에도, 선수들이 대답할 시간은 필요하더군요.”':'“듣겠다는 말 뒤에 두 경기를 뛰었습니다. 아직 안 들은 이야기가 있겠죠.”'),'지금의 결과와 오래된 기억을 어떻게 함께 볼까요?',['새로 생긴 걱정과 좋은 장면부터 듣자','기억에 기대지 않고 이번 역할을 증명하자','확정된 두 경기에서 바꿀 점 하나를 찾자'],['“같은 사람이더라도 지금의 마음은 다르군요.”','“이전 승리를 오늘 선수들의 의무로 만들지는 말죠.”','“이번 경기에서 실제로 본 걸로 다음 지시를 만들겠습니다.”'],'다음 상대를 앞두고 코치에게 무엇을 부탁할까요?',['내 기억과 다른 관찰도 그대로 말해 달라','아직 보지 못한 결과를 맞히려 하지 말자'],['“그러면 다른 의견도 숨기지 않겠습니다.” 코치의 수첩이 조금 더 두꺼워진다.','“좋습니다. 먼저 준비하고, 결과는 휘슬 뒤에 확인하죠.”']);
   }
  }
  const current=rebirth().read(s),warning=current.timeline.find(t=>t.kind==='warning'),warnGame=warning?current.records[warning.after-1]:null;
  if(warnGame?.year===year&&games.some(g=>g.round===warnGame.round)){
   add('memory-warning',warnGame.round,'board','이번에는 문을 닫기 전에','구단주가 마지막 세 경기의 조건을 적는다. 확정 리그 '+warning.after+'경기 뒤 찾아온 최후통첩이다.\n\n‘지난 삶의 끝을 기억한다. 그래도 아직 끝나지 않은 세 경기를 대신 기억할 수는 없다.’','구단주: “계약보다 먼저, 선수들에게 무슨 말을 할 생각입니까?”',['선수들의 부담을 듣고 책임은 내가 설명하겠습니다','남은 기회에 도전할 목표를 분명히 말하겠습니다','승점 조건과 실제 준비를 나누어 설명하겠습니다'],['“그들이 모든 책임을 혼자 떠안지는 않게 해 주세요.”','“의지는 듣겠습니다. 승점은 경기에서 확인하죠.”','“확인할 조건은 적었습니다. 준비는 감독님의 판단입니다.”'],'구단주는 문 앞에서 한 번 더 묻는다. “끝나더라도 남길 말이 있습니까?”',['결과 뒤에도 사람에게 설명하겠습니다','살아남겠다고 보장하지 않고 제 판단을 말하겠습니다'],['“기다리는 사람들에게 직접 말해 주세요.” 닫힐 문 앞에 대화할 자리를 남긴다.','“보장보다 설명을 듣죠.” 세 경기는 아직 시작되지 않았다.']);
  }
  if(warning){
   const survived=current.timeline.find(t=>t.kind==='survived'&&t.after>warning.after),survivalGame=survived?current.records[survived.after-1]:null;
   const survival=survived?current.records.slice(warning.after,survived.after):[],survivalPoints=survival.reduce((n,g)=>n+(g.score[0]>g.score[1]?3:g.score[0]===g.score[1]?1:0),0);
   if(survivalGame?.year===year&&survival.every(r=>completed(s,r.year).some(g=>g.round===r.round))){
    add('memory-survived',survivalGame.round,'coach','끝나지 않은 아침','최후통첩 뒤 실제 세 경기에서 승점 '+survivalPoints+'점을 얻어 필요한 승점 3점의 조건을 넘겼다.\n\n코치: “아직 감독님 자리입니다.”\n‘문이 닫힌 기억은 남았다. 이번의 아침도 이제 기억이 된다.’','세 경기를 버틴 뒤 선수들에게 무엇을 말할까요?',['각자 버텨낸 순간을 듣자','다음 경기에서도 도전할 이유를 말하자','다시 위험해지기 전에 준비 기준을 점검하자'],['“괜찮았다는 말만 하지는 않겠습니다. 힘들었던 것도 말하죠.”','“살아남은 기쁨과 다음 승리는 다릅니다.”','“한 번 넘긴 조건이 다음 결과를 대신하지는 않겠죠.”'],'코치가 수첩을 다시 연다. “어떤 장면을 오래 기억하실 겁니까?”',['결과 뒤에도 남아 있던 사람들을 기억하겠습니다','살아남은 방법을 다음 준비에서 다시 확인하겠습니다'],['수첩에 점수 외의 이름이 남는다. 그 이름들이 다음 삶의 정답은 아니다.','넘긴 문턱 옆에 아직 배울 일이 적힌다. 다시 경기장으로 갈 시간이다.']);
   }
  }
  return out;
 }
 const api={memory,opening,events};root.StoryRebirth=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
