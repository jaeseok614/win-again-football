(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null);
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const copy=value=>JSON.parse(JSON.stringify(value));
 const empty=reason=>({valid:false,reason,rows:[],best:[]});
 const goalBonus={GK:1.0,DEF:1.2,MID:1.05,FW:.95},concedePenalty={GK:.24,DEF:.14,MID:.07,FW:.02},cleanSheetBonus={GK:.75,DEF:.36,MID:.14,FW:.06};
 function counts(cards=[]){
  const rows=new Map();
  for(const event of cards){if(event?.team!==0||typeof event.id!=='string')continue;const current=rows.get(event.id)||{yellow:0,red:0};if(event.card==='yellow')current.yellow++;if(event.card==='red'){current.red++;if(event.reason==='second-yellow')current.yellow++;}rows.set(event.id,current);}
  return rows;
 }
 function makeRows(players,{score=[0,0],events=[],cards=[],detailed=false,limited=false}={}){
  if(!Array.isArray(players)||!Array.isArray(score)||score.length!==2)return [];
  const playerEvents=new Map(),cardCounts=counts(cards);
  for(const event of events){if(event?.team!==undefined&&event.team!==0)continue;const id=event?.actorId||event?.scorerId;if(typeof id!=='string')continue;const current=playerEvents.get(id)||{shots:0,chances:0,goals:0,assists:0},attackEvent=['goal','shot','chance'].includes(event.type);if(attackEvent&&['goal','shot'].includes(event.type))current.shots++;if(attackEvent)current.chances++;if(event.scorerId===id)current.goals++;if(typeof event.assistId==='string'){
    const assist=playerEvents.get(event.assistId)||{shots:0,chances:0,goals:0,assists:0};assist.assists++;playerEvents.set(event.assistId,assist);
   }playerEvents.set(id,current);
  }
  return players.map(row=>{
   const profile=F.identityProfile(row.identity),minutes=Math.max(0,Math.min(90,Number(row.minutes)||0));if(!minutes)return null;
   const events=playerEvents.get(row.id)||{shots:0,chances:0,goals:Number(row.goals)||0,assists:Number(row.assists)||0};
   if(!events.goals)events.goals=Number(row.goals)||0;if(!events.assists)events.assists=Number(row.assists)||0;
   const card=cardCounts.get(row.id)||{yellow:0,red:0},cleanSheet=Number(row.cleanSheets)||0;
   let value=5.6+minutes/90*.9+events.goals*goalBonus[profile.pos]+events.assists*.65+cleanSheet*cleanSheetBonus[profile.pos]-score[1]*concedePenalty[profile.pos]-card.yellow*.25-card.red*1.2;
   if(detailed)value+=Math.min(.32,events.shots*.08)+Math.min(.2,events.chances*.04);
   value=Math.round(clamp(value,3,10)*10)/10;
   const highlights=[];if(events.goals)highlights.push(events.goals+'골');if(events.assists)highlights.push(events.assists+'도움');if(detailed&&events.shots)highlights.push('슈팅 '+events.shots);if(card.yellow)highlights.push('경고 '+card.yellow);if(card.red)highlights.push('퇴장');if(cleanSheet)highlights.push('무실점');
   return {id:row.id,identity:row.identity,name:profile.name,pos:profile.pos,minutes,started:!!row.started,rating:value,goals:events.goals,assists:events.assists,shots:events.shots,chances:events.chances,yellow:card.yellow,red:card.red,cleanSheet,highlights};
  }).filter(Boolean).sort((a,b)=>b.rating-a.rating||b.goals-a.goals||b.assists-a.assists||b.minutes-a.minutes||a.id.localeCompare(b.id));
 }
 function finish(rows,source,detailed,limited){const top=rows[0]?.rating,formula=detailed?'출전 시간, 득점·도움, 실제 슈팅 장면, 카드, 실점·무실점으로 계산한 표시용 평점입니다. 선수 능력·RNG·저장 기록에는 영향을 주지 않습니다.':'확정된 출전 시간, 득점·도움, 카드, 실점·무실점으로 계산한 표시용 평점입니다. 종료 뒤에는 개별 슈팅 장면을 저장하지 않습니다.';return {valid:true,source,detailed,limited,rows,best:top===undefined?[]:rows.filter(row=>row.rating===top),formula};}
 function fromMatch(match){
  if(!match?.players||!Array.isArray(match.logs)||!Array.isArray(match.score)||!Array.isArray(match.segments))return empty('현재 경기 기록을 읽을 수 없어요.');
  const starters=new Set(match.segments[0]?.lineup||[]),players=Object.values(match.players).map(p=>({id:p.id,identity:p.identity,minutes:p.minutes,started:starters.has(p.id),cleanSheets:!match.presentationPending&&F.identityProfile(p.identity).pos==='GK'&&p.minutes===90&&match.score[1]===0}));
  const events=match.logs.filter(event=>event?.team===0&&['goal','shot','chance'].includes(event.type));
  return finish(makeRows(players,{score:match.score,events,cards:match.discipline?.events||[],detailed:true,limited:(match.statisticsOriginMinute||0)>0}),'live',true,(match.statisticsOriginMinute||0)>0);
 }
 function fromRecord(record){
  if(!record?.players||!Array.isArray(record.score)||!Array.isArray(record.events))return empty('확정 경기 기록을 읽을 수 없어요.');
  const events=record.events.map(event=>({...event,type:'attributed-goal',team:0,actorId:event.scorerId}));
  return finish(makeRows(record.players,{score:record.score,events,cards:record.cards||[],detailed:false,limited:true}),'record',false,true);
 }
 const api={fromMatch,fromRecord};root.MatchPerformance=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
