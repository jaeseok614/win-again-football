(function(root){
 'use strict';
 const S=root.Season||(typeof require==='function'?require('./season.js'):null),F=root.Football||(typeof require==='function'?require('./engine.js'):null),ST=root.Statistics||(typeof require==='function'?require('./statistics.js'):null);
 const names={match:'리그 경기 순수익',cup:'국내컵 수입',europe:'유럽 대회 수입',transfer:'선수 이적 순지출',scout:'유소년 탐색',board:'이사회 과제 보상',goal:'시즌 목표 보상','staff-hire':'코치 계약','staff-renew':'코치 재계약','staff-release':'코치 계약 해지','staff-wages':'코치 급여','owner-investment':'구단주 투자'};
 function years(s){return [s.year,...s.history.map(h=>h.year)].sort((a,b)=>b-a);}
 function leaders(players,key){const max=Math.max(0,...players.map(p=>p[key]));return {value:max,players:max?players.filter(p=>p[key]===max).map(p=>({identity:p.identity,name:p.name,pos:p.pos})).sort((a,b)=>a.identity.localeCompare(b.identity,'en')):[]};}
 function read(s,year=s.year){
  if(!years(s).includes(year))throw Error('기록이 남아 있는 시즌을 선택하세요.');
  const current=year===s.year,h=s.history.find(h=>h.year===year),final=current?S.ready(s):true,league=S.leagueForYear(s,year),me=current?S.standings(s).find(c=>c.id===S.own):null;
  const records=current?s.statistics?.records||[]:s.statistics?.archive.find(a=>a.year===year)?.records||[],tracked=!!s.statistics&&year>=s.statistics.originYear;
  const summary=tracked?ST.summary(s,'all',year):null;
  const games=current?s.results.filter(r=>r.home===S.own||r.away===S.own).map(r=>({score:r.home===S.own?[...r.goals]:[r.goals[1],r.goals[0]]})):records.filter(r=>r.competition==='league');
  const totals={played:games.length,won:0,drawn:0,lost:0,gf:0,ga:0};for(const r of games){totals.gf+=r.score[0];totals.ga+=r.score[1];totals[r.score[0]>r.score[1]?'won':r.score[0]===r.score[1]?'drawn':'lost']++;}
  const ledger=s.finance.ledger,entries=ledger.filter(e=>e.year===year),financeKnown=year>=s.finance.origin.year,opening=financeKnown?s.finance.opening+ledger.filter(e=>e.year<year).reduce((n,e)=>n+e.amount,0):null,net=entries.reduce((n,e)=>n+e.amount,0),groups=new Map();
  for(const e of entries){const row=groups.get(e.type)||{type:e.type,label:names[e.type]||'기타 거래',amount:0};row.amount+=e.amount;groups.set(e.type,row);}
  const rank=current?(s.round?me.rank:null):h.rank,points=current?me.points:h.points,nextDivision=current?(s.round===14?S.movement(s).to:null):h.nextDivision;
  const cupChampion=current?s.cup?.champion:h.cupChampion,europeChampion=current?s.europe?.champion:h.europeChampion;
  const growth=current&&s.career?Object.values(s.squad).filter(p=>Number.isFinite(s.career.baselines[p.identity])).map(p=>({identity:p.identity,name:p.name,pos:p.pos,gain:p[F.roleKey(p)]-s.career.baselines[p.identity]})).filter(p=>p.gain>0).sort((a,b)=>b.gain-a.gain||a.identity.localeCompare(b.identity,'en')):[];
  const cups=['cup','europe'].map(competition=>{const rs=records.filter(r=>r.competition===competition),champion=competition==='cup'?cupChampion:europeChampion;return {competition,matches:rs.length,wonTitle:champion===S.own,champion:champion?S.club(champion).name:null};});
  return {year,years:years(s),current,final,division:league.division,rank,points,nextDivision,league:{...totals,partial:!current&&games.length!==14,champion:current?(s.round===14?S.standings(s)[0].name:null):S.club(h.champion).name},cups,
   players:{tracked:!!summary,partial:!summary||summary.partial,matches:summary?.matches||0,goals:leaders(summary?.players||[],'goals'),assists:leaders(summary?.players||[],'assists'),minutes:leaders(summary?.players||[],'minutes'),cleanSheets:leaders(summary?.players||[],'cleanSheets')},growth,
   finance:{known:financeKnown,partial:financeKnown&&year===s.finance.origin.year&&s.finance.origin.round>0,opening,net:financeKnown?net:null,closing:financeKnown?opening+net:null,groups:[...groups.values()]},
   next:current&&final?{year:s.year+1,division:nextDivision,europe:league.division===1&&rank<=2,balance:s.finance.balance,suspensionsReset:!!s.suspensions}:null};
 }
 const api={read,years};root.SeasonReview=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
