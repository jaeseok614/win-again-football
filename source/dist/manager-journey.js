(function(root){
 'use strict';
 const S=root.Season||(typeof require==='function'?require('./season.js'):null);
 // Presentation derived from confirmed records: no new save fields or reward claims.
 function seasonChallenge(s,table,me,total){
  if(s.league.rules!=='five-tier')return null;
  const division=s.league.division,promotion=division>1,targetRank=promotion?2:6,line=table.find(c=>c.rank===targetRank),rival=table.find(c=>c.rank===targetRank+1),played=Math.min(total,s.round),inside=me.rank<=targetRank,finished=played===total,nextName=promotion?S.divisionInfo({division:division-1,rules:'five-tier'}).name:null;
  const title=promotion?nextName+' 승격 · 2위 안에 들기':'1부 TOP 6 유지';
  let detail;
  if(played===0)detail=total+'경기 장기전 · '+(promotion?'상위 2팀이 다음 단계로 승격합니다.':'TOP 6 진입이 구단주 목표입니다.');
  else if(finished)detail=(inside?(promotion?'승격에 성공했습니다.':'TOP 6 목표를 지켰습니다.'):(promotion?'이번 시즌 승격에 실패했습니다.':'TOP 6 목표에 미치지 못했습니다.'))+' 최종 '+me.rank+'위 · '+me.points+'점';
  else if(inside){const gap=Math.max(0,me.points-(rival?.points??0));detail='현재 '+me.rank+'위 · '+(promotion?'승격권 진입':'TOP 6 진입');if(rival)detail+=' · '+(promotion?'3위':'7위')+(gap?'보다 '+gap+'점 앞서고 있습니다.':'과 승점 동률입니다.');else detail+=' · '+me.points+'점';}
  else{const gap=Math.max(0,(line?.points??me.points)-me.points);detail='현재 '+me.rank+'위 · '+(promotion?'2위 승격선':'6위 목표선')+'까지 '+(gap?gap+'점':'승점 동률 · 골득실 추격');}
  const relegation=division<5&&me.rank>=7;
  if(relegation&&!finished)detail+=' · 현재 강등권';
  return {title,detail,played,total,rank:me.rank,points:me.points,targetRank,inside,finished,relegation};
 }
 function seasonArc(s,table,me,total){
  if(s.league.rules!=='five-tier')return null;
  const recent=(s.results||[]).filter(r=>r.home===S.own||r.away===S.own).sort((a,b)=>b.round-a.round).slice(0,5).reverse();
  const form=recent.map(r=>{const ownHome=r.home===S.own,forGoals=r.goals[ownHome?0:1],againstGoals=r.goals[ownHome?1:0];return forGoals>againstGoals?'W':forGoals<againstGoals?'L':'D';});
  const wins=form.filter(x=>x==='W').length,draws=form.filter(x=>x==='D').length,losses=form.filter(x=>x==='L').length,goal=(s.league.division>1?2:6),line=table.find(c=>c.rank===goal),gap=Math.max(0,(line?.points??me.points)-me.points);
  let headline,copy;
  if(!recent.length){headline=s.league.division===5?'첫 장 · 아직 아무것도 정해지지 않았다':'새 단계의 첫 장';copy='첫 경기 결과가 이 구단의 새 이야기를 엽니다. '+total+'경기 동안 선수단과 재정을 지키며 '+(s.league.division>1?'한 계단 위를 노리세요.':'1부의 목표를 노리세요.');}
  else if(s.round===total){headline=me.rank<=goal?(s.league.division>1?'승격 확정 · 다음 계단으로':'목표 달성 · 1부 무대에 남다'):(s.league.division>1?'승격 실패 · 다시 세울 계획':'목표 미달 · 다음 시즌 재도전');copy='최종 '+me.rank+'위 · '+me.points+'점 · 최근 '+form.length+'경기 '+wins+'승 '+draws+'무 '+losses+'패. 시즌 결산에서 구단의 다음 장을 직접 결정하세요.';}
  else if(me.rank<=goal){headline=s.league.division>1?'승격권을 지키는 중':'1부의 유럽권을 향해';copy='현재 '+me.rank+'위 · '+me.points+'점. 최근 '+form.length+'경기 '+wins+'승 '+draws+'무 '+losses+'패로, 이 흐름을 이어가면 다음 단계가 가까워집니다.';}
  else if(s.league.division<5&&me.rank>=7){headline='강등권 탈출이 먼저다';copy='현재 '+me.rank+'위. 최근 '+form.length+'경기 '+wins+'승 '+draws+'무 '+losses+'패. 승격보다 안전한 순위와 선수단 회복을 먼저 챙겨야 합니다.';}
  else{headline=s.league.division>1?'승격선 바로 아래, 반격의 시점':'목표선 밖에서 다시 출발';copy='현재 '+me.rank+'위 · 승격선까지 '+gap+'점. 최근 '+form.length+'경기 '+wins+'승 '+draws+'무 '+losses+'패. 다음 경기에서 격차를 줄이세요.';}
  const rival=table.find(c=>c.rank===me.rank-1),behind=table.find(c=>c.rank===me.rank+1);
  return {headline,copy,form,wins,draws,losses,rank:me.rank,points:me.points,round:s.round,total,gap,toAbove:rival?Math.max(0,rival.points-me.points):null,aheadOf:behind?Math.max(0,me.points-behind.points):null};
 }
 function read(s){
  const history=s.history||[],table=S.standings(s),me=table.find(c=>c.id===S.own),rounds=S.roundCount(s),final=s.round===rounds;
  const records=[...(s.statistics?.archive||[]).flatMap(a=>a.records),...(s.statistics?.records||[])];
  const win=records.find(r=>r.competition==='league'&&r.score[0]>r.score[1]);
  const currentWin=s.results.find(r=>(r.home===S.own&&r.goals[0]>r.goals[1])||(r.away===S.own&&r.goals[1]>r.goals[0]));
  const fiveTier=s.league.rules==='five-tier',promotion=history.find(h=>h.division===2&&h.nextDivision===1&&(!fiveTier||h.rules==='five-tier'));
  const champion=history.find(h=>h.division===1&&h.champion===S.own);
  const cup=history.find(h=>h.cupChampion===S.own),europe=history.find(h=>h.europeChampion===S.own);
  const stamp=(h,text)=>h?h.year+'시즌 · '+text:null;
  const milestones=[
   {id:'win',title:'리그 첫 승의 기억',hint:'리그에서 승리한 뒤 경기 결과를 확정하세요.',evidence:win?win.year+'시즌 · '+win.round+'R 승리':currentWin?s.year+'시즌 · '+(currentWin.round+1)+'R 승리':null},
   {id:'promotion',title:'1부로 올라서다',hint:fiveTier?'5부에서 시작해 매 시즌 '+rounds+'경기를 치르고 네 차례 승격하면 1부에 도달합니다.':'2부 '+rounds+'경기를 마친 최종 순위가 2위 이내면 승격합니다.',evidence:stamp(promotion,fiveTier?'네 번째 승격 · 1부 입성':'1부 승격')||(final&&s.league.division===2&&me.rank<=2?s.year+'시즌 · 승격 확정':null)},
   {id:'cup',title:'우리의 첫 컵 트로피',hint:'국내컵 결승에서 이기고 결과를 확정하세요.',evidence:stamp(cup,'국내컵 우승')||(s.cup?.champion===S.own?s.year+'시즌 · 국내컵 우승':null)},
   {id:'league',title:'이번 생엔 1부 우승',hint:'1부 '+rounds+'경기를 마친 최종 순위 1위에 도전하세요.',evidence:stamp(champion,'1부 우승')||(final&&s.league.division===1&&me.rank===1?s.year+'시즌 · 1부 우승':null)},
   {id:'europe',title:'유럽의 정상까지',hint:'1부 2위 이내 → 다음 시즌 유럽 대회 진출 → 결승 우승.',evidence:stamp(europe,'유럽 우승')||(s.europe?.champion===S.own?s.year+'시즌 · 유럽 우승':null)}
  ].map(m=>({...m,achieved:!!m.evidence}));
  const next=milestones.find(m=>!m.achieved)||null;
  const ladder=fiveTier?{current:s.league.division,total:5,stepsCompleted:5-s.league.division,stepsRemaining:s.league.division-1,nextTier:s.league.division>1?S.divisionInfo({division:s.league.division-1,rules:'five-tier'}).name:null,finalTier:S.divisionInfo({division:1,rules:'five-tier'}).name}:null;
  const lastSeason=history.at(-1),previous=fiveTier&&lastSeason?.rules==='five-tier'&&lastSeason.year===s.year-1?{year:lastSeason.year,division:lastSeason.division,nextDivision:lastSeason.nextDivision,rank:lastSeason.rank,points:lastSeason.points}:null;
  return {milestones,completed:milestones.filter(m=>m.achieved).length,total:milestones.length,next,ladder,arc:seasonArc(s,table,me,rounds),
   season:{year:s.year,division:s.league.division,rules:s.league.rules,league:{division:s.league.division,rules:s.league.rules,...(Array.isArray(s.league.clubIds)?{clubIds:[...s.league.clubIds]}:{})},played:s.round,remaining:rounds-s.round,total:rounds,rank:s.round?me.rank:null,points:me.points,final,previous},
   challenge:seasonChallenge(s,table,me,rounds),
   action:S.ready(s)?'season':s.match?.phase==='full'?'result':'match',
   partial:!s.statistics||s.statistics.originYear>1||s.statistics.originRound>0,
   carry:'다음 시즌에도 선수 성장·계약·구단 자금과 시즌 기록이 이어집니다. 체력과 부상은 회복됩니다.'};
 }
 const api={read,seasonChallenge};root.ManagerJourney=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
