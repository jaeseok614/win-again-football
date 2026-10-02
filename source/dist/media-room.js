(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null);
 // Original in-game columns. No real newsroom is credited with simulated quotes.
 const outlets=Object.freeze([{name:'터치라인 스포츠',desk:'방송 해설',style:'broadcast'},{name:'풋볼 인사이드',desk:'전술 칼럼',style:'analysis'},{name:'킥오프 데일리',desk:'선수 리포트',style:'players'}]);
 function read(s){
  const S=root.Season||(typeof require==='function'?require('./season.js'):null);
  const games=s.statistics?.records||[],last=games.at(-1),players=Object.values(s.squad),table=S.standings(s),me=table.find(row=>row.id===S.own);
  const won=last&&last.score[0]>last.score[1],draw=last&&last.score[0]===last.score[1],score=last?.score.join('–'),opponent=last?S.club(last.home===S.own?last.away:last.home)?.short||'상대':null;
  const manager=last?{headline:won?'준비한 전술이 결과로 이어졌다':draw?'균형은 지켰지만 승부수는 더 필요하다':'감독의 다음 대응이 시험대에 올랐다',body:opponent+'전 '+score+'. '+(won?'승리한 흐름을 다음 경기에도 이어갈지가 관건이다.':draw?'90분 안에 승부를 가리지 못했다. 다음 경기의 공격 선택을 지켜본다.':'선수 컨디션과 교체 시점을 점검하며 반등을 준비해야 한다.'),verdict:won?'호평':draw?'관망':'분발 필요',fact:'최근 확정 경기 '+score}: {headline:'첫 시험, 기대와 물음표',body:'첫 공식 경기를 기다린다. 아직 결과가 없어 실력에 대한 평가는 보류한다.',verdict:'평가 대기',fact:'확정 경기 기록 없음'};
  const recent=games.slice(-5),wins=recent.filter(r=>r.score[0]>r.score[1]).length,conceded=recent.reduce((n,r)=>n+r.score[1],0);
  const analysis={headline:last?(conceded>recent.length*1.5?'수비 안정이 다음 과제':'꾸준한 흐름을 본다'):'좋은 선발은 준비에서 나온다',body:last?'최근 '+recent.length+'경기 '+wins+'승 · '+conceded+'실점. '+(conceded>recent.length*1.5?'수비 간격과 지친 선수의 교체를 점검해야 한다.':'주전 체력과 상대에 맞는 전술 준비가 필요하다.'):'훈련과 선수 컨디션을 점검할 시간이다. 지금은 준비 과정을 지켜본다.',verdict:me.played?'리그 '+me.rank+'위':'시즌 전망',fact:'승점 '+me.points+' · 리그 '+me.played+'경기'};
  let featured=last?.players.filter(p=>p.minutes>0).sort((a,b)=>(b.goals*4+b.assists*2+b.cleanSheets)-(a.goals*4+a.assists*2+a.cleanSheets)||b.minutes-a.minutes||a.identity.localeCompare(b.identity))[0];
  const person=featured?F.identityProfile(featured.identity):players.find(p=>p.pos==='FW')||players[0];
  const scout=featured?{headline:person.name+', '+(featured.goals?'골로 존재감을 증명':featured.assists?'동료의 득점을 만든 연결고리':featured.cleanSheets?'무실점으로 응답한 골문':'다음 경기에서 한 걸음 더'),body:'최근 경기 '+featured.minutes+'분 · '+featured.goals+'골 · '+featured.assists+'도움'+(person.pos==='GK'?' · 무실점 '+featured.cleanSheets+'회':'')+'. '+(featured.goals||featured.assists||featured.cleanSheets?'기록으로 드러난 기여를 보여줬다. 다음 경기에서도 이런 역할을 이어갈지 주목한다.':'출전 기회를 얻었지만 득점과 도움 기록은 없었다. 다음 경기의 기여를 기다린다.'),verdict:'선수 평가',fact:person.name,identity:person.identity||featured.identity}:{headline:person.name+', 첫 경기에서 주목할 선수',body:'아직 출전 기록이 없다. 첫 공식 경기에서 어떤 모습을 보여줄지 지켜본다.',verdict:'관찰 대상',fact:'출전 기록 없음',identity:person.identity};
  return [manager,analysis,scout].map((article,i)=>({...article,outlet:outlets[i].name,desk:outlets[i].desk,style:outlets[i].style,fictional:true}));
 }
 const api={outlets,read};root.MediaRoom=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
