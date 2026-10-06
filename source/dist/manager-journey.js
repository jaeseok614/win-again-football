(function(root){
 'use strict';
 const S=root.Season||(typeof require==='function'?require('./season.js'):null);
 // Presentation derived from confirmed records: no new save fields or reward claims.
 function read(s){
  const history=s.history||[],me=S.standings(s).find(c=>c.id===S.own),rounds=S.roundCount(s),final=s.round===rounds;
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
  return {milestones,completed:milestones.filter(m=>m.achieved).length,total:milestones.length,next,
   season:{year:s.year,division:s.league.division,rules:s.league.rules,played:s.round,remaining:rounds-s.round,rank:s.round?me.rank:null,points:me.points,final},
   action:S.ready(s)?'season':s.match?.phase==='full'?'result':'match',
   partial:!s.statistics||s.statistics.originYear>1||s.statistics.originRound>0,
   carry:'다음 시즌에도 선수 성장·계약·구단 자금과 시즌 기록이 이어집니다. 체력과 부상은 회복됩니다.'};
 }
 const api={read};root.ManagerJourney=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
