(function(root){
 'use strict';
 const S=root.Season||(typeof require==='function'?require('./season.js'):null),P=root.Cup||(typeof require==='function'?require('./cup.js'):null),U=root.Europe||(typeof require==='function'?require('./europe.js'):null),own='brynwell';
 const hasOwn=f=>f&&(f.home===own||f.away===own),orient=(f,score)=>score?(f.home===own?[...score]:[score[1],score[0]]):null;
 function read(s){
  const rows=[],current=s.match?S.fixtureFor(s):null;
  function add(competition,round,stage,fixture,result,conditional=false){
   const isCurrent=!!current&&!result&&!conditional&&competition===s.competition&&(competition==='league'?round===s.round+1:stage===(competition==='cup'?s.cup.stage:s.europe.stage));
   const status=result?'complete':conditional?'conditional':isCurrent?'current':'scheduled',home=fixture?fixture.home===own:null,opponent=fixture?S.club(home?fixture.away:fixture.home):null;
   const score=result?orient(fixture,result.goals):isCurrent&&s.match.minute>0?[...s.match.score]:null;
   const phase=isCurrent?s.match.phase:null;
   rows.push({id:competition+'-'+(stage??round),competition,round,stage,label:competition==='league'?'리그 '+round+'R':competition==='cup'?'국내컵 '+P.stageNames[stage]:'유럽 '+U.stageNames[stage],timing:competition==='league'?round+'R':round+'R 뒤',order:round*100+(competition==='league'?0:competition==='cup'?10+stage:50+stage),status,home,opponent:opponent?{id:opponent.id,name:opponent.name,short:opponent.short}:null,score,penalties:result?orient(fixture,result.penalties):null,outcome:result?(result.winner?result.winner===own?'win':'loss':score[0]>score[1]?'win':score[0]<score[1]?'loss':'draw'):null,phase,minute:isCurrent?s.match.minute:null,paused:isCurrent?!!s.match.paused:false});
  }
  S.fixturesFor(s).forEach((fixtures,index)=>{const fixture=fixtures.find(hasOwn),result=s.results.find(r=>r.round===index&&hasOwn(r));add('league',index+1,null,fixture,result);});
  if(s.cup?.enabled){let eliminated=false;for(let stage=0;stage<3;stage++){if(eliminated)break;const fixtures=P.fixturesFor(s,stage),fixture=fixtures.find(hasOwn),result=s.cup.results.find(r=>r.stage===stage&&hasOwn(r));if(fixture){add('cup',P.gateFor(s,stage),stage,fixture,result);if(result&&result.winner!==own)eliminated=true;}else if(!fixtures.length)add('cup',P.gateFor(s,stage),stage,null,null,true);else eliminated=true;}}
  if(s.europe?.enabled){let eliminated=false;for(let stage=0;stage<8;stage++){if(eliminated)break;const fixtures=U.fixturesFor(s,stage),fixture=fixtures.find(hasOwn),result=s.europe.results.find(r=>r.stage===stage&&hasOwn(r));if(fixture){add('europe',U.gateFor(s,stage),stage,fixture,result);if(stage>=6&&result&&result.winner!==own)eliminated=true;}else if(!fixtures.length)add('europe',U.gateFor(s,stage),stage,null,null,true);else eliminated=true;}}
  rows.sort((a,b)=>a.order-b.order);const upcoming=rows.filter(r=>r.status!=='complete'),now=rows.find(r=>r.status==='current')||null;
  const clusters=[];for(let round=1;round<=14;round++){const games=upcoming.filter(r=>r.round===round),known=games.filter(r=>r.status!=='conditional').length,possible=games.length-known;if(known+possible>1)clusters.push({round,known,possible,ids:games.map(r=>r.id)});}
  return {year:s.year,rows,current:now,upcoming,clusters,completed:rows.filter(r=>r.status==='complete').length,knownRemaining:upcoming.filter(r=>r.status!=='conditional').length,conditional:upcoming.filter(r=>r.status==='conditional').length,complete:S.ready(s)};
 }
 const api={read};root.SeasonCalendar=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
