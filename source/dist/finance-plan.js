(function(root){
 'use strict';
 const S=root.Season||(typeof require==='function'?require('./season.js'):null),E=root.Economy||(typeof require==='function'?require('./economy.js'):null),F=root.Football||(typeof require==='function'?require('./engine.js'):null),Staff=root.Staff||(typeof require==='function'?require('./staff.js'):null);
 function read(s,deal=null){
  const rates=E.rates(s),playerWages=E.wages(s),quote=deal?E.quote(s,deal.identity,deal.slot):null,starting=s.finance.balance-(quote?.cost||0),payroll=playerWages+(quote?.wageChange||0),candidates=Staff.candidates(s),contracts=Object.values(s.staff?.contracts||{}),rows=[];
  let balance=starting,low=starting,lowRound=null,gateTotal=0,sponsorTotal=0,playerTotal=0,staffTotal=0;
  S.fixturesFor(s).forEach((games,index)=>{
   if(index<s.round)return;const f=games.find(f=>f.home===S.own||f.away===S.own),home=f.home===S.own,clock=(s.year-1)*14+index;
   const staffPayroll=contracts.filter(c=>c.started<=clock&&c.expires>clock).reduce((sum,c)=>sum+(candidates.find(p=>p.id===c.candidate)?.wage||0),0),gate=home?rates.gateHome:rates.gateAway,sponsor=rates.sponsor,amount=gate+sponsor-payroll-staffPayroll;
   balance+=amount;if(balance<low){low=balance;lowRound=index+1;}gateTotal+=gate;sponsorTotal+=sponsor;playerTotal+=payroll;staffTotal+=staffPayroll;
   rows.push({round:index+1,home,opponent:S.club(home?f.away:f.home).short,gate,sponsor,playerPayroll:payroll,staffPayroll,amount,balance});
  });
  const incoming=deal?F.identityProfile(deal.identity):null,outgoing=deal?s.squad[deal.slot]:null;
  return {year:s.year,division:s.league.division,remaining:rows.length,current:s.finance.balance,starting,ending:balance,net:balance-starting,low,lowRound,playerWages:payroll,gateTotal,sponsorTotal,playerTotal,staffTotal,rows,deal:quote?{...quote,incoming:incoming.name,outgoing:outgoing.name,identity:deal.identity,slot:deal.slot}:null};
 }
 const api={read};root.FinancePlan=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
