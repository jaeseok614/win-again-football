(function(root){
 'use strict';
 const F=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.Football;
 const scenarios=Object.freeze([
  Object.freeze({id:'comeback',title:'15분의 승부',startMinute:75,objective:'한 골 뒤진 경기를 따라잡기'}),
  Object.freeze({id:'protect',title:'마지막 10분',startMinute:80,objective:'한 골 차 리드 지키기'})
 ]);
 const seeds={comeback:32,protect:72},copy=value=>JSON.parse(JSON.stringify(value)),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const tacticText={balanced:{label:'균형',description:'공격과 수비의 균형을 유지해요.'},press:{label:'전방 압박',description:'공격 기회를 늘리는 대신 상대 공격 기회와 체력 소모도 늘어요.'},counter:{label:'빠른 역습',description:'공격 기회와 상대 기회가 함께 줄어요. 공격수가 더 빠르면 역습 슈팅이 유리해요.'}};
 function scenarioFor(id){return scenarios.find(scenario=>scenario.id===id)||null;}
 function startingMatch(scenario){
  const match=F.create(seeds[scenario.id]);
  while(match.minute<scenario.startMinute){if(!F.running(match))F.begin(match);F.tick(match);}
  match.paused=true;return match;
 }
 function metadata(match){return {startMinute:match.minute,startScore:[...match.score],startChances:[...match.chances],startShots:[...match.shots],startXg:[...match.xg],startEnergy:Object.fromEntries(Object.values(match.players).map(player=>[player.id,player.energy])),startPlayerMinutes:Object.fromEntries(Object.values(match.players).map(player=>[player.id,player.minutes])),startDecisionCount:match.decisions.length,startSubs:match.subs};}
 function create(id){
  const scenario=scenarioFor(id);if(!scenario)throw Error('연습 경기를 선택하세요.');
  const match=startingMatch(scenario);return {id,match,...metadata(match)};
 }
 function invalid(reason){return {valid:false,reason};}
 function read(session){
  const scenario=scenarioFor(session?.id);if(!scenario)return invalid('연습 경기를 선택하세요.');
  if(!session.match)return invalid('연습 경기 정보를 읽을 수 없어요.');
  let match;try{match=F.restore(session.match);}catch{return invalid('연습 경기 정보를 읽을 수 없어요.');}
  const start=startingMatch(scenario),expected=metadata(start);
  if(match.seed!==start.seed||match.minute<scenario.startMinute||!['third','full'].includes(match.phase)||match.formation!==start.formation||match.homeName!==start.homeName||match.opponentName!==start.opponentName||!equal(match.opponent,start.opponent))return invalid('선택한 연습 경기와 일치하지 않아요.');
  for(const key of Object.keys(expected))if(!equal(session[key],expected[key]))return invalid('연습 시작 정보와 일치하지 않아요.');
  if(!equal(match.logs.slice(0,start.logs.length),start.logs)||!equal(match.segments.slice(0,2),start.segments.slice(0,2)))return invalid('연습 이전 경기 기록과 일치하지 않아요.');
  const firstTail=match.segments[2],beforeTail=start.segments[2];
  if(!firstTail||firstTail.start!==beforeTail.start||(firstTail.end??match.minute)<scenario.startMinute||firstTail.tactic!==beforeTail.tactic||!equal(firstTail.lineup,beforeTail.lineup)||!equal(firstTail.rating,beforeTail.rating))return invalid('연습 이전 경기 흐름과 일치하지 않아요.');
  const attributes=['identity','pos','attack','defense','passing','speed','endurance','keeping','potential','initialEnergy','injuryRemaining','suspended'];
  for(const player of Object.values(match.players)){const original=start.players[player.id];if(!original||attributes.some(key=>player[key]!==original[key])||player.minutes<original.minutes||player.energy>original.energy+1e-8)return invalid('연습 선수 정보와 일치하지 않아요.');}
  const deltas={};for(const key of ['score','chances','shots','xg']){deltas[key]=match[key].map((value,team)=>value-start[key][team]);if(deltas[key].some(value=>value<0))return invalid('연습 경기 기록을 확인할 수 없어요.');}
  const decisions=match.decisions.slice(session.startDecisionCount).map(decision=>{
   if(decision.minute<scenario.startMinute)return null;
   if(decision.type==='tactic')return {...copy(decision),fromLabel:tacticText[decision.from].label,toLabel:tacticText[decision.to].label,description:tacticText[decision.to].description};
   return {...copy(decision),outName:match.players[decision.out].name,inName:match.players[decision.in].name,outIdentity:match.players[decision.out].identity,inIdentity:match.players[decision.in].identity,description:match.players[decision.out].name+' 대신 '+match.players[decision.in].name+' 투입'};
  });
  if(decisions.some(decision=>decision===null))return invalid('연습 시작 전 지시는 변경할 수 없어요.');
  const fulltime=match.phase==='full',objectiveAchieved=fulltime?(scenario.id==='comeback'?match.score[0]>=match.score[1]:match.score[0]>match.score[1]):null;
  const players=Object.values(match.players).map(player=>({id:player.id,identity:player.identity,name:player.name,pos:player.pos,minutes:player.minutes-start.players[player.id].minutes,startEnergy:start.players[player.id].energy,energy:player.energy,energySpent:Math.max(0,start.players[player.id].energy-player.energy),onField:match.lineup.includes(player.id),onFieldAtStart:start.lineup.includes(player.id)}));
  return {valid:true,reason:null,id:scenario.id,title:scenario.title,objective:scenario.objective,seed:match.seed,startMinute:scenario.startMinute,minute:match.minute,remainingMinutes:90-match.minute,startScore:[...start.score],score:[...match.score],status:fulltime?'fulltime':match.minute===scenario.startMinute?'ready':'playing',fulltime,objectiveAchieved,goals:deltas.score,chances:deltas.chances,shots:deltas.shots,xg:deltas.xg,decisions,subsUsed:match.subs-start.subs,players,events:copy(match.logs.filter(event=>event.minute>scenario.startMinute&&['goal','chance','shot'].includes(event.type))),tactic:{id:match.tactic,...tacticText[match.tactic]}};
 }
 const api={scenarios,create,read,summary:read};root.Practice=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
