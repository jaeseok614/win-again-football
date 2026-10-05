(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),copy=x=>JSON.parse(JSON.stringify(x));
 const money=n=>Number.isSafeInteger(n)&&Math.abs(n)<=10000000000;
 const positions=['GK','DEF','MID','FW'],boardTasks={wins:{threshold:3,amount:20000},growth:{threshold:3,amount:15000},youth:{threshold:270,amount:25000}};
 const originalClubIds=['brynwell','aldermere','norhaven','bellwick','redmere','montevaro','selcanto','falkenruh'];
 const europeRates=Object.freeze({home:26000,away:9000,win:20000,draw:8000,bonuses:Object.freeze([0,0,0,0,0,0,60000,150000])});
 const europeModule=()=>root.Europe||(typeof require==='function'?require('./europe.js'):null);
 function leagueForYear(s,year=s.year){return root.Season?.leagueForYear?root.Season.leagueForYear(s,year):year===s.year&&s.league?s.league:s.history?.find(h=>h.year===year)||{division:2,rules:'legacy'};}
 const fiveTierRates={5:{gateHome:24000,gateAway:10000,sponsor:8000,winBonus:2500,drawBonus:1000,cupHome:18000,cupAway:8000,cupBonuses:[10000,20000,40000]},4:{gateHome:28000,gateAway:12000,sponsor:9000,winBonus:3000,drawBonus:1250,cupHome:20000,cupAway:9000,cupBonuses:[12000,24000,48000]},3:{gateHome:33000,gateAway:14000,sponsor:10500,winBonus:3500,drawBonus:1500,cupHome:23000,cupAway:10000,cupBonuses:[15000,30000,60000]},2:{gateHome:39000,gateAway:17000,sponsor:12500,winBonus:4250,drawBonus:1750,cupHome:27000,cupAway:12000,cupBonuses:[20000,38000,80000]},1:{gateHome:46000,gateAway:21000,sponsor:15000,winBonus:5500,drawBonus:2250,cupHome:32000,cupAway:14000,cupBonuses:[28000,52000,115000]}};
 function rates(s,year=s.year){const league=leagueForYear(s,year);if(league.rules==='five-tier')return {...fiveTierRates[league.division],cupBonuses:[...fiveTierRates[league.division].cupBonuses]};const upper=league.division===1;return upper?{gateHome:40000,gateAway:18000,sponsor:12000,winBonus:5000,drawBonus:2000,cupHome:28000,cupAway:12000,cupBonuses:[24000,44000,100000]}:{gateHome:25000,gateAway:10000,sponsor:7500,winBonus:2500,drawBonus:1000,cupHome:18000,cupAway:8000,cupBonuses:[12000,22000,50000]};}
 function target(s,year=s.year){const league=leagueForYear(s,year);return league.rules==='legacy'?(year===1?6:year===2?4:1):league.division===1?6:2;}
 function outcomeFor(s,rank,year=s.year){const league=leagueForYear(s,year),wanted=target(s,year),achieved=rank<=wanted;let bonus=0;if(achieved){if(league.rules==='legacy')bonus=rank===1?100000:rank<=4?60000:30000;else if(league.rules==='five-tier')bonus=league.division===1?(rank===1?180000:rank<=3?90000:50000):({5:rank===1?80000:50000,4:rank===1?100000:65000,3:rank===1?120000:75000,2:rank===1?150000:90000}[league.division]);else bonus=league.division===1?(rank===1?180000:rank<=3?90000:50000):(rank===1?100000:60000);}return {target:wanted,rank,achieved,bonus};}
 function scoutCost(s,year=s.year){return leagueForYear(s,year).rules==='five-tier'?8000:12000;}
 function clubIdsForYear(s,year=s.year){const league=leagueForYear(s,year);return root.Season?.leagueClubs?root.Season.leagueClubs({league}).map(c=>c.id):originalClubIds;}
 const marketPerson=id=>F.market.find(p=>p.identity===id);
 function youthIds(seed,year,cycle,pos){return typeof F.youthCandidates==='function'?F.youthCandidates(seed,year,cycle,pos).map(p=>typeof p==='string'?p:p.identity):[];}
 function offeredPerson(s,identity){
  const market=marketPerson(identity);if(market)return market;
  const person=F.identityProfile(identity);if(!person?.academy||person.academySeed!==s.seed||person.academyYear!==s.year)return null;
  const report=s.career?.reports?.find(r=>r.cycle===person.academyCycle&&r.pos===person.pos&&r.candidates?.includes(identity)),paid=s.finance.ledger.some(e=>e.type==='scout'&&e.year===s.year&&e.cycle===person.academyCycle&&e.pos===person.pos&&e.amount===-scoutCost(s,e.year));
  return report&&paid&&youthIds(s.seed,s.year,person.academyCycle,person.pos).includes(identity)?person:null;
 }
 function initialize(s){s.finance={opening:160000,balance:160000,origin:{year:s.year,round:s.round},ledger:[],marketUsed:[],transferWeek:null,outcome:null};return s;}
 function wages(s){return Object.values(s.squad).reduce((n,p)=>n+F.identityProfile(p.identity||p.id).wage,0);}
 function resale(p){const base=F.identityProfile(p.identity||p.id),growth=Math.max(0,p[F.roleKey(p)]-base[F.roleKey(base)]);return Math.floor(Math.min(base.fee*.85,base.fee*.7+growth*1000)/1000)*1000;}
 function quote(s,identity,slot){const incoming=offeredPerson(s,identity),outgoing=s.squad[slot];if(!incoming||!outgoing||incoming.pos!==outgoing.pos)throw Error('같은 포지션의 이적·유소년 선수를 선택하세요.');const credit=resale(outgoing),fee=incoming.fee,cost=fee-credit+5000;return {fee,credit,commission:5000,cost,wageChange:incoming.wage-F.identityProfile(outgoing.identity||outgoing.id).wage,balanceAfter:s.finance.balance-cost};}
 function recruit(s,identity,slot){if(s.competition!=='league'||!s.match||s.match.phase!=='prep'||s.match.minute!==0)throw Error('영입은 리그 경기를 시작하기 전에 할 수 있어요.');if(s.finance.transferWeek===s.year+'-'+s.round)throw Error('이번 주 영입을 완료했어요. 다음 경기 뒤 다시 살펴보세요.');if(s.finance.marketUsed.includes(identity)||Object.values(s.squad).some(p=>p.identity===identity))throw Error('이번 시즌에 이미 계약한 선수입니다.');const terms=quote(s,identity,slot);if(terms.balanceAfter<0)throw Error('영입 차액을 지불할 구단 자금이 부족합니다.');const next=copy(s),outgoing=next.squad[slot],fresh=F.profileForSlot(slot,identity);next.squad[slot]={...fresh,xp:0,injury:null};next.match.players[slot]=F.create(next.match.seed,{players:next.squad}).players[slot];next.finance.balance=terms.balanceAfter;next.finance.marketUsed.push(identity);next.finance.transferWeek=next.year+'-'+next.round;next.finance.ledger.push({id:'transfer-'+next.year+'-'+(next.round+1),type:'transfer',year:next.year,round:next.round+1,amount:-terms.cost,incoming:identity,outgoing:outgoing.identity||outgoing.id,outgoingPrimary:outgoing[F.roleKey(outgoing)],slot,...terms});root.Career?.register(next,slot);return next;}
 function payScout(s,pos,cycle){
  if(s.competition!=='league'||!s.match||s.match.phase!=='prep'||s.match.minute!==0||s.round>=14)throw Error('유소년 탐색은 리그 경기를 시작하기 전에 할 수 있어요.');
  if(!positions.includes(pos)||cycle!==Math.floor(s.round/7)+1)throw Error('이번 탐색 기간과 포지션을 선택하세요.');
  if(s.finance.ledger.some(e=>e.id==='scout-'+s.year+'-'+cycle)||s.career?.reports?.some(r=>r.cycle===cycle))throw Error('이번 기간의 유소년 보고서를 이미 받았어요.');
  const cost=scoutCost(s);if(!money(s.finance.balance)||s.finance.balance<cost)throw Error('탐색 비용을 지불할 구단 자금이 부족합니다.');
  const entry={id:'scout-'+s.year+'-'+cycle,type:'scout',year:s.year,round:s.round+1,cycle,pos,amount:-cost};s.finance.balance-=cost;s.finance.ledger.push(entry);return entry;
 }
 function awardBoard(s,task,progress){
  const rule=boardTasks[task];if(!rule||!Number.isInteger(s.round)||s.round<1||s.round>14||!Number.isSafeInteger(progress)||progress<rule.threshold||progress>100000000)throw Error('완료한 구단 과제의 보상만 받을 수 있어요.');
  const id='board-'+s.year+'-'+task;if(s.finance.ledger.some(e=>e.id===id))throw Error('이 구단 과제의 보상을 이미 받았어요.');if(!money(s.finance.balance+rule.amount))throw Error('구단 재정을 반영할 수 없어요.');
  const entry={id,type:'board',year:s.year,round:s.round,task,progress,amount:rule.amount};s.finance.balance+=entry.amount;s.finance.ledger.push(entry);return entry;
 }
 function applyRound(s,fixture,score){const id='match-'+s.year+'-'+(s.round+1);if(s.finance.ledger.some(e=>e.id===id))throw Error('이 경기의 재정을 이미 반영했습니다.');const r=rates(s),gate=fixture.home==='brynwell'?r.gateHome:r.gateAway,sponsor=r.sponsor,bonus=score[0]>score[1]?r.winBonus:score[0]===score[1]?r.drawBonus:0,payroll=wages(s),income=gate+sponsor+bonus,amount=income-payroll,entry={id,type:'match',year:s.year,round:s.round+1,gate,sponsor,bonus,payroll,income,amount};s.finance.balance+=amount;s.finance.ledger.push(entry);s.finance.transferWeek=null;return entry;}
 function applyCup(s,result){
  const clubIds=clubIdsForYear(s);if(!result||!Number.isInteger(result.stage)||result.stage<0||result.stage>2||result.week!==s.round||!Number.isInteger(s.round)||s.round<1||s.round>14||!clubIds.includes(result.home)||!clubIds.includes(result.away)||result.home===result.away||![result.home,result.away].includes('brynwell')||![result.home,result.away].includes(result.winner))throw Error('완료한 컵 경기의 재정만 반영할 수 있어요.');
  const id='cup-'+s.year+'-'+result.stage;if(s.finance.ledger.some(e=>e.id===id))throw Error('이 컵 경기의 재정을 이미 반영했습니다.');
  const r=rates(s),gate=result.home==='brynwell'?r.cupHome:r.cupAway,advanceBonus=result.winner==='brynwell'?r.cupBonuses[result.stage]:0,income=gate+advanceBonus;if(!money(s.finance.balance+income))throw Error('구단 재정을 반영할 수 없어요.');
  const entry={id,type:'cup',year:s.year,round:s.round,stage:result.stage,home:result.home,away:result.away,winner:result.winner,gate,advanceBonus,income,amount:income};s.finance.balance+=income;s.finance.ledger.push(entry);return entry;
 }
 function europeIncome(result){
  const score=result.home==='brynwell'?result.goals:[result.goals[1],result.goals[0]],gate=result.home==='brynwell'?europeRates.home:europeRates.away,matchBonus=result.stage<6?(score[0]>score[1]?europeRates.win:score[0]===score[1]?europeRates.draw:0):0,advanceBonus=result.stage>=6&&result.winner==='brynwell'?europeRates.bonuses[result.stage]:0,income=gate+matchBonus+advanceBonus;return {gate,matchBonus,advanceBonus,income,amount:income};
 }
 function applyEurope(s,result){
  const U=europeModule();if(!U||s.competition!=='europe'||!s.match||s.match.phase!=='full'||s.match.minute!==90||!result)throw Error('완료한 유럽 경기의 재정만 반영할 수 있어요.');
  const expected=U.preview(s,s.match);if(['stage','index','home','away','week','goals','penalties','kicks','winner'].some(key=>JSON.stringify(result[key])!==JSON.stringify(expected[key])))throw Error('유럽 경기 결과와 대진이 맞지 않아요.');
  const id='europe-'+s.year+'-'+result.stage;if(s.finance.ledger.some(e=>e.id===id))throw Error('이 유럽 경기의 재정을 이미 반영했습니다.');
  const income=europeIncome(result);if(!money(s.finance.balance+income.amount))throw Error('구단 재정을 반영할 수 없어요.');
  const entry={id,type:'europe',year:s.year,round:s.round,stage:result.stage,index:result.index,home:result.home,away:result.away,goals:[...result.goals],penalties:copy(result.penalties),kicks:copy(result.kicks),winner:result.winner,...income};s.finance.balance+=entry.amount;s.finance.ledger.push(entry);return entry;
 }
 function goal(s,table){return outcomeFor(s,table.find(c=>c.id==='brynwell').rank);}
 function finishSeason(s,table){const id='goal-'+s.year;if(s.finance.ledger.some(e=>e.id===id))throw Error('이 시즌 보상을 이미 반영했습니다.');const outcome=goal(s,table);s.finance.outcome=outcome;s.finance.balance+=outcome.bonus;s.finance.ledger.push({id,type:'goal',year:s.year,round:14,amount:outcome.bonus,...outcome});}
 function nextYear(s){s.finance.marketUsed=[];s.finance.transferWeek=null;s.finance.outcome=null;}
 function validate(s,table){
  const fail=()=>{throw Error('저장한 구단 재정을 읽을 수 없어요.');},f=s.finance;
  if(!f||f.opening!==160000||!money(f.balance)||!f.origin||!Number.isInteger(f.origin.year)||f.origin.year<1||f.origin.year>s.year||!Number.isInteger(f.origin.round)||f.origin.round<0||f.origin.round>14||f.origin.year===s.year&&f.origin.round>s.round||!Array.isArray(f.ledger)||f.ledger.length>150000||f.ledger.some(e=>!e||typeof e.id!=='string')||new Set(f.ledger.map(e=>e.id)).size!==f.ledger.length||!Array.isArray(f.marketUsed)||new Set(f.marketUsed).size!==f.marketUsed.length||f.marketUsed.some(id=>!marketPerson(id)&&!F.identityProfile(id)?.academy))fail();
  let balance=f.opening,order=-1;const contracts=Object.fromEntries((s.startingClub==='tottunham'?F.startingRoster:F.roster).map(p=>[p.id,p.identity])),usedByYear={},scouts={};
  for(const e of f.ledger){
   if(!money(e.amount)||!Number.isInteger(e.year)||e.year<f.origin.year||e.year>s.year||!Number.isInteger(e.round)||e.round<1||e.round>14||e.year===f.origin.year&&e.round<=f.origin.round&&e.type!=='goal'&&!(e.round===f.origin.round&&['cup','europe','board'].includes(e.type)))fail();
   const stamp=e.year*100+e.round*4+({'owner-investment':0,scout:0,transfer:0,'staff-hire':0,'staff-renew':0,'staff-release':0,match:1,board:2,cup:2,europe:2,goal:2,'staff-wages':2}[e.type]??999);if(stamp<order)fail();order=stamp;
   if(e.type==='scout'){
    const cost=scoutCost(s,e.year);if(e.id!=='scout-'+e.year+'-'+e.cycle||![1,2].includes(e.cycle)||Math.floor((e.round-1)/7)+1!==e.cycle||!positions.includes(e.pos)||e.amount!==-cost||balance<cost||scouts[e.year+'-'+e.cycle]||e.year===s.year&&e.round>s.round+1)fail();scouts[e.year+'-'+e.cycle]=e;
   }else if(e.type==='transfer'){
    const incoming=F.identityProfile(e.incoming),outgoing=F.identityProfile(e.outgoing),slot=F.roster.find(p=>p.id===e.slot);
    if(e.id!=='transfer-'+e.year+'-'+e.round||!incoming||!outgoing||!slot||incoming.pos!==slot.pos||outgoing.pos!==slot.pos||contracts[e.slot]!==e.outgoing||Object.values(contracts).includes(e.incoming)||usedByYear[e.year]?.includes(e.incoming)||e.fee!==incoming.fee||e.commission!==5000||!Number.isInteger(e.outgoingPrimary)||e.outgoingPrimary<outgoing[F.roleKey(outgoing)]||e.outgoingPrimary>99)fail();
    if(!marketPerson(e.incoming)){const scout=scouts[e.year+'-'+incoming.academyCycle];if(!incoming.academy||incoming.academySeed!==s.seed||incoming.academyYear!==e.year||!scout||scout.pos!==incoming.pos||scout.round>e.round||!youthIds(s.seed,e.year,incoming.academyCycle,incoming.pos).includes(e.incoming))fail();}
    const credit=resale({...outgoing,[F.roleKey(outgoing)]:e.outgoingPrimary});if(e.credit!==credit||e.cost!==e.fee-e.credit+5000||e.amount!==-e.cost||e.wageChange!==incoming.wage-outgoing.wage||!money(e.balanceAfter)||e.balanceAfter!==balance+e.amount||e.balanceAfter<0)fail();
    if(e.year===s.year&&e.round>s.round+1)fail();contracts[e.slot]=e.incoming;(usedByYear[e.year]??=[]).push(e.incoming);
   }else if(e.type==='match'){
    const r=rates(s,e.year),payroll=Object.values(contracts).reduce((n,id)=>n+F.identityProfile(id).wage,0),result=e.year===s.year?s.results.find(r=>r.round===e.round-1&&(r.home==='brynwell'||r.away==='brynwell')):null,fixture=root.Season?.fixturesFor?root.Season.fixturesFor({league:leagueForYear(s,e.year)})[e.round-1]?.find(f=>f.home==='brynwell'||f.away==='brynwell'):null;
    if(e.id!=='match-'+e.year+'-'+e.round||![r.gateAway,r.gateHome].includes(e.gate)||e.sponsor!==r.sponsor||![0,r.drawBonus,r.winBonus].includes(e.bonus)||e.payroll!==payroll||e.income!==e.gate+e.sponsor+e.bonus||e.amount!==e.income-e.payroll||e.year===s.year&&e.round>s.round||fixture&&e.gate!==(fixture.home==='brynwell'?r.gateHome:r.gateAway))fail();
    if(result){const score=result.home==='brynwell'?result.goals:[result.goals[1],result.goals[0]];if(e.gate!==(result.home==='brynwell'?r.gateHome:r.gateAway)||e.bonus!==(score[0]>score[1]?r.winBonus:score[0]===score[1]?r.drawBonus:0))fail();}
   }else if(e.type==='cup'){
    const r=rates(s,e.year),clubIds=clubIdsForYear(s,e.year);if(e.id!=='cup-'+e.year+'-'+e.stage||!Number.isInteger(e.stage)||e.stage<0||e.stage>2||!clubIds.includes(e.home)||!clubIds.includes(e.away)||e.home===e.away||![e.home,e.away].includes('brynwell')||![e.home,e.away].includes(e.winner)||e.gate!==(e.home==='brynwell'?r.cupHome:r.cupAway)||e.advanceBonus!==(e.winner==='brynwell'?r.cupBonuses[e.stage]:0)||e.income!==e.gate+e.advanceBonus||e.amount!==e.income||Object.hasOwn(e,'payroll')||e.year===s.year&&e.round>s.round)fail();
    if(e.year===s.year){const result=s.cup?.results?.find(r=>r.stage===e.stage&&(r.home==='brynwell'||r.away==='brynwell'));if(!result||result.week!==e.round||result.home!==e.home||result.away!==e.away||result.winner!==e.winner)fail();}
   }else if(e.type==='europe'){
    const keys=['id','type','year','round','stage','index','home','away','goals','penalties','kicks','winner','gate','matchBonus','advanceBonus','income','amount'];if(Object.keys(e).length!==keys.length||keys.some(key=>!Object.hasOwn(e,key))||e.id!=='europe-'+e.year+'-'+e.stage||e.year===s.year&&e.round>s.round)fail();
    try{europeModule().validateReceipt(s,e);}catch{fail();}const income=europeIncome(e);if(Object.keys(income).some(key=>e[key]!==income[key]))fail();
   }else if(e.type==='owner-investment'){
    if(e.id!=='owner-investment-'+e.year||e.amount!==20000||e.year===s.year&&e.round>s.round+1)fail();
   }else if(e.type==='board'){
    const rule=boardTasks[e.task];if(!rule||e.id!=='board-'+e.year+'-'+e.task||!Number.isSafeInteger(e.progress)||e.progress<rule.threshold||e.progress>100000000||e.amount!==rule.amount||e.year===s.year&&e.round>s.round)fail();
   }else if(e.type==='goal'){
    const rank=e.year===s.year?table.find(c=>c.id==='brynwell').rank:s.history.find(h=>h.year===e.year)?.rank,expected=outcomeFor(s,rank,e.year);
    if(e.id!=='goal-'+e.year||e.round!==14||e.target!==expected.target||e.rank!==rank||e.achieved!==expected.achieved||e.bonus!==expected.bonus||e.amount!==expected.bonus||e.year===s.year&&s.round!==14)fail();
   }else if(['staff-hire','staff-renew','staff-release','staff-wages'].includes(e.type)){
    const staff=root.Staff||(typeof require==='function'?require('./staff.js'):null);if(!staff)fail();try{staff.validateEntry(s,e);}catch{fail();}
    if(e.year===s.year&&e.round>s.round+(e.type==='staff-wages'?0:1)||e.type!=='staff-wages'&&balance+e.amount<0)fail();
   }else fail();balance+=e.amount;
  }
  if(balance!==f.balance||F.roster.some(p=>s.squad[p.id].identity!==contracts[p.id]))fail();
  if(s.staff||f.ledger.some(e=>e.type.startsWith('staff-'))){const staff=root.Staff||(typeof require==='function'?require('./staff.js'):null);if(!staff)fail();try{staff.validate(s);}catch{fail();}}
  for(const result of s.cup?.results||[])if(result.home==='brynwell'||result.away==='brynwell'){const entry=f.ledger.find(e=>e.id==='cup-'+s.year+'-'+result.stage);if(!entry||entry.type!=='cup'||entry.round!==result.week||entry.home!==result.home||entry.away!==result.away||entry.winner!==result.winner)fail();}
  for(const result of s.europe?.results||[])if(result.home==='brynwell'||result.away==='brynwell'){const entry=f.ledger.find(e=>e.id==='europe-'+s.year+'-'+result.stage);if(!entry||entry.type!=='europe'||entry.round!==result.week||entry.home!==result.home||entry.away!==result.away||entry.winner!==result.winner||JSON.stringify(entry.goals)!==JSON.stringify(result.goals)||JSON.stringify(entry.penalties)!==JSON.stringify(result.penalties)||JSON.stringify(entry.kicks)!==JSON.stringify(result.kicks))fail();}
  for(let year=f.origin.year;year<=s.year;year++){const begin=year===f.origin.year?f.origin.round:0,end=year===s.year?s.round:14;for(let round=begin+1;round<=end;round++)if(!f.ledger.some(e=>e.id==='match-'+year+'-'+round))fail();if(end===14&&!(year===f.origin.year&&begin===14)&&!f.ledger.some(e=>e.id==='goal-'+year))fail();}
  const used=usedByYear[s.year]||[];if(used.length!==f.marketUsed.length||used.some(id=>!f.marketUsed.includes(id)))fail();
  const thisWeek=f.ledger.some(e=>e.type==='transfer'&&e.year===s.year&&e.round===s.round+1);if(f.transferWeek!==(thisWeek?s.year+'-'+s.round:null))fail();const expected=s.round===14?goal(s,table):null;if(JSON.stringify(f.outcome)!==JSON.stringify(expected))fail();return s;
 }
 const api={initialize,wages,resale,quote,recruit,payScout,scoutCost,awardBoard,rates,europeRates,target,applyRound,applyCup,applyEurope,goal,finishSeason,nextYear,validate};root.Economy=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
