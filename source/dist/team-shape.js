(function(root){
 'use strict';
 // Read-only views of the same planner used by the physical world. Never step it.
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),C=root.ContinuousFootball||(typeof require==='function'?require('./continuous-football.js'):null),T=root.ContinuousTactics||(typeof require==='function'?require('./continuous-tactics.js'):null),O=root.Opposition||(typeof require==='function'?require('./opposition.js'):null);
 const owners={ours:'우리 공 소유',theirs:'상대 공 소유'},zones={back:'후방',middle:'중원',wide:'측면',transition:'탈취 직후'},jobs={'hold-shape':'대형 유지',support:'패스 지원','advance-support':'전진 지원',run:'침투 준비','return-run':'다시 침투',overlap:'측면 지원',cover:'공간 커버',mark:'구역 마크','goal-cover':'골문 커버',screen:'패스길 차단','press-screen':'협력 압박',press:'압박',intercept:'공 수신·경합',carry:'공 운반','first-touch':'퍼스트 터치',outlet:'역습 출구',recover:'수비 복귀',keeper:'골문 보호',restart:'재개 배치'};
 const round=n=>Math.round(n*10)/10,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),validTactic=t=>['balanced','press','counter','lowBlock'].includes(t);
 function canRead(s){const m=s?.match;return !!m&&(m.phase==='prep'||m.continuous?.version>=3&&(['half','late'].includes(m.phase)||F.running(m)&&m.paused));}
 function spacing(people){const field=people.filter(p=>p.pos!=='GK');if(!field.length)return {width:0,depth:0};return {width:round(Math.max(...field.map(p=>p.x))-Math.min(...field.map(p=>p.x))),depth:round(Math.max(...field.map(p=>p.y))-Math.min(...field.map(p=>p.y)))};}
 function read(s,{tactic=s?.match?.tactic,mode='plan',owner='ours',zone='middle',positions={}}={}){
  const m=s?.match;if(!canRead(s)||!validTactic(tactic)||!['plan','current'].includes(mode)||!Object.hasOwn(owners,owner)||!Object.hasOwn(zones,zone))return {valid:false};
  if(mode==='current'&&(!m.continuous||m.phase==='prep'))return {valid:false};
  let w,opponent;try{opponent=O.read(s);if(!opponent.valid)return {valid:false};
   if(m.continuous)w=C.copy(m.continuous);
   else{const fake=C.copy(m),preview=O.preview(s);F.enableContinuous(fake,{opponentFormation:preview.teams[1].formation,opponentPlayers:preview.teams[1].players,positions:m.lineup.flatMap(id=>{const point=positions[m.players[id].identity];return Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)?[{id,x:point[0],y:point[1]}]:[]})});w=fake.continuous;}
  }catch{return {valid:false};}
  w.tactics=[tactic,w.tactics?.[1]||m.continuousSetup?.opponentTactic||opponent.plan.tactic||'balanced'];w.focuses=[F.attackFocus(m),w.focuses?.[1]||'balanced'];for(const p of w.players)p.focus=p.focus||1;
  const realRestart=mode==='current'&&!!w.restart;
  if(mode==='plan'){
   w.half=1;w.tick=100;w.transitionTick=zone==='transition'?95:-10000;w.restart=null;w.handHold=null;w.lastPass=null;w.pendingShot=null;
   for(const p of w.players){p.x=p.homeX;p.y=p.homeY;p.vx=p.vy=0;p.receptionAt=-10000;}
   const team=owner==='ours'?0:1,at=zone==='back'?30:['middle','transition'].includes(zone)?55:79,x=zone==='wide'?8:34,y=C.direction(w,team)<0?105-at:at;
   const carrier=w.players.filter(p=>p.active&&p.team===team&&p.pos!=='GK').sort((a,b)=>dist(a,{x,y})-dist(b,{x,y})||a.id.localeCompare(b.id))[0];if(!carrier)return {valid:false};carrier.x=x;carrier.y=y;if(zone==='transition')carrier.receptionAt=w.tick-5;
   w.ball={x,y,z:0,vx:0,vy:0,vz:0,owner:carrier.id,lastTouch:carrier.id,flight:null};w.controlledTeam=team;
  }
  // Reset only the hypothetical scenario. plan() owns its own shadow world.
  if(mode==='plan')delete w.ai;const targets=C.plan(w),byId=new Map(targets.map(r=>[r.id,r]));
  const people=w.players.filter(p=>p.active).map(p=>{const target=byId.get(p.id),at=mode==='plan'&&target?target:p,point=w.half===1?{x:at.x/68*100,y:at.y/105*100}:{x:(68-at.x)/68*100,y:(105-at.y)/105*100};return {id:p.id,identity:p.identity,name:p.name,no:p.no,pos:p.pos,team:p.team,x:point.x,y:point.y,metres:{x:at.x,y:at.y},energy:round(p.energy),role:p.pos==='GK'?'keeper':target?.role||'hold-shape',roleLabel:jobs[p.pos==='GK'?'keeper':target?.role]||'대형 유지'};});
  const own=people.filter(p=>p.team===0),other=people.filter(p=>p.team===1),carrier=w.players.find(p=>p.active&&p.id===w.ball.owner),ball=w.half===1?{x:w.ball.x/68*100,y:w.ball.y/105*100}:{x:(68-w.ball.x)/68*100,y:(105-w.ball.y)/105*100};
  const count=(team,roles)=>people.filter(p=>p.team===team&&roles.includes(p.role)).length;
  let decision=null;if(mode==='current'&&!realRestart&&carrier&&w.tick-(carrier.receptionAt??-10000)>=6){const choice=T.choose(w,carrier);decision={actor:carrier.name,kind:choice.kind,receiver:choice.receiver?.name||null};}
  const metrics=[0,1].map(team=>({...spacing(people.filter(p=>p.team===team).map(p=>({...p,...p.metres}))),pressure:count(team,['press','press-screen']),support:count(team,['support','advance-support','return-run','overlap']),cover:count(team,['cover','mark','goal-cover','screen']),runs:count(team,['run','outlet'])}));
  const observation=mode==='current'?(realRestart?'재개 준비 중':w.ball.flight?'공 이동 중':carrier?carrier.team===0?'우리 공 소유':'상대 공 소유':'세컨드볼 경합'):owners[owner]+' · '+zones[zone];
  return {valid:true,mode,tactic,owner,zone,version:w.version,tick:m.continuous?.tick||0,own,opponent:other,opponentClub:opponent.club,formations:{own:m.formation,opponent:opponent.plan.formation},ball,metrics,decision,observation,canCurrent:!!m.continuous&&m.phase!=='prep',note:mode==='plan'?'목표 대형 예시 · 실제 이동·결과 보장 아님':'실제 좌표·선택 지시 역할 · 경기 기록과 구분'};
 }
 const api={read,canRead,spacing,owners,zones,jobs};root.TeamShape=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
