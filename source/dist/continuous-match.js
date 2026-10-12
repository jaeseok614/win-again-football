(function(root){
 'use strict';
 const C=root.ContinuousFootball||(typeof require==='function'?require('./continuous-football.js'):null),copy=C.copy;
 const fail=()=>{throw Error('연속 경기의 저장 기록을 확인할 수 없어요.');};
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),cache=new Map(),clipCache=new Map();
 function config(F,s,setup){
  const counts={DEF:0,MID:0,FW:0},layout=F.formationPositions[s.formation];
  const own=s.lineup.map(id=>{const p=s.players[id],base=p.pos==='GK'?[50,88]:layout[p.pos][counts[p.pos]++],pt=setup.placements[id]||base;return {id:p.id,identity:p.identity,name:p.name,no:p.no,pos:p.pos,role:F.assignedPosition(pt[0],pt[1],p.pos).line,team:0,homeX:pt[0]*C.W/100,homeY:pt[1]*C.H/100,...Object.fromEntries(['attack','defense','passing','speed','endurance','keeping','initialEnergy'].map(k=>[k,p[k]]))};});
  const opp=setup.opponentPlayers.map((p,i)=>({id:'opp'+i,identity:p.identity,name:p.name,no:p.no,pos:p.pos,role:p.pos,team:1,homeX:p.x*C.W/100,homeY:(100-p.y)*C.H/100,attack:p.attack,defense:p.defense,passing:p.passing,speed:p.speed,endurance:p.endurance,keeping:p.keeping,initialEnergy:p.energy}));
  return {seed:s.seed,players:own.concat(opp)};
 }
 function opponents(F,s,formation){
  const layout=F.formationPositions[formation],pts=[[50,94,'GK'],...Object.entries(layout).flatMap(([pos,points])=>points.map(([x,y])=>[x,y,pos]))];
  return pts.map(([x,y,pos],i)=>({identity:'rival_'+i,name:s.opponentName+' '+(i+1)+'번',no:i+1,pos,x,y,attack:Math.round(s.opponent.attack),defense:Math.round(s.opponent.defense),passing:Math.round(s.opponent.middle),speed:Math.round(s.opponent.speed),endurance:50,keeping:Math.round(s.opponent.defense),energy:s.opponent.energy}));
 }
 function enable(F,s,{opponentFormation='442',opponentPlayers=null,opponentTactic='balanced',positions=[]}={},legacyRestore){
  if(s.phase!=='prep'||s.minute!==0||s.continuousSetup)throw Error('연속 경기 규칙은 새 킥오프 전에 준비합니다.');
  if(!F.formations[opponentFormation]||!['balanced','press','counter','lowBlock'].includes(opponentTactic))fail();
  const placements={};for(const row of positions){if(!s.players[row.id]||!Number.isFinite(row.x)||!Number.isFinite(row.y))fail();placements[row.id]=F.boundedPlacement(row.x,row.y,s.players[row.id].pos);}
  const rows=(opponentPlayers||opponents(F,s,opponentFormation)).map(p=>Object.fromEntries(['identity','name','no','pos','x','y','attack','defense','passing','speed','endurance','keeping','energy'].map(k=>[k,p[k]])));
  validateOpponents(F,rows,opponentFormation);
  const baseline=copy(s);delete baseline.spatialSetup;legacyRestore(baseline);
  delete s.spatialSetup;s.continuousSetup={version:1,baseline,opponentFormation,opponentTactic,opponentPlayers:rows,placements};s.continuous=C.create(config(F,s,s.continuousSetup));s.continuousCommands=[];s.discipline={version:2,events:[]};return s;
 }
 function validateOpponents(F,rows,formation){
  if(!Array.isArray(rows)||rows.length!==11||new Set(rows.map(p=>p.identity)).size!==11)fail();
  const counts={GK:1,...F.formations[formation]};for(const [pos,n] of Object.entries(counts))if(rows.filter(p=>p.pos===pos).length!==n)fail();
  for(const p of rows){if(!p||typeof p.identity!=='string'||p.identity.length>100||typeof p.name!=='string'||p.name.length>60||!Number.isInteger(p.no)||p.no<1||p.no>99||!Number.isFinite(p.x)||p.x<0||p.x>100||!Number.isFinite(p.y)||p.y<0||p.y>100||!Number.isFinite(p.energy)||p.energy<0||p.energy>100)fail();for(const k of ['attack','defense','passing','speed','endurance','keeping'])if(!Number.isInteger(p[k])||p[k]<0||p[k]>99)fail();}
 }
 function note(F,s,op,args,before){
  if(!s.continuousSetup)return;
  s.continuousCommands.push({tick:s.continuous.tick,op,args:copy(args)});
  if(op==='begin'&&before.phase==='half')C.kickoff(s.continuous,1-s.continuous.firstKickTeam,true);
  if(op==='swap'){
   const w=s.continuous,p=w.players.find(p=>p.id===args[0]),q=s.players[args[1]];if(!p||!q)fail();
   const next={...copy(p),...Object.fromEntries(['id','identity','name','no','pos','attack','defense','passing','speed','endurance','keeping','initialEnergy'].map(k=>[k,q[k]])),energy:q.energy,playedTicks:0,distance:0,active:true,cooldown:0,decisionAt:w.tick+12};
   p.active=false;w.players.push(next);if(w.ball.owner===p.id){w.ball.owner=null;w.ball.vx=w.ball.vy=0;w.ball.lastTouch=p.id;w.ball.flight=null;}if(w.restart?.taker===p.id)w.restart.taker=next.id;
  }
  for(const seg of s.segments){if(seg.startTick===undefined)seg.startTick=s.continuous.tick;if(seg.end!==null&&seg.endTick===undefined)seg.endTick=s.continuous.tick;}
 }
 function context(F,s){
  const mode=F.opponentPlan(s),base=s.continuousSetup.opponentTactic,opponent=mode==='chase'?'press':mode==='protect'?'lowBlock':base;
  const focus=Object.fromEntries(s.continuous.players.map(p=>[p.id,p.team===0?(1+(s.morale?.[p.id]||0)*.01)*(1+(root.StoryMood?.value(s,s.players[p.id])||0)*.01):1]));
  const active=s.continuous.players.filter(p=>p.active&&p.team===0&&p.pos!=='GK'),pieces={};for(const role of ['corner','freeKick','target'])pieces[role]=active.find(p=>p.id===s.setPieces[role])?.id||active.slice().sort((a,b)=>F.setPieceScore(s.players[b.id],role)-F.setPieceScore(s.players[a.id],role))[0]?.id;
  return {tactics:[s.tactic,opponent],focuses:[F.attackFocus(s),s.continuousSetup.opponentTactic==='counter'?'dribble':'balanced'],focus,setPieces:[pieces,{}]};
 }
 function log(s,e){
  const p=s.continuous.players.find(p=>p.id===e.id),q=s.continuous.players.find(p=>p.id===e.to),keeper=s.continuous.players.find(p=>p.id===e.keeper),name=p?.name||'',minute=Math.ceil(e.tick/600),type=e.kind==='attempt'?'attempt':e.kind;
  const labels={pass:name+(e.action==='cross'?'의 크로스!':' → '+(q?.name||'동료')+' 패스'),receive:name+'의 퍼스트 터치',recovery:name+'이(가) 공을 확보합니다.',tackle:name+'의 태클! 공이 흘렀습니다.',foul:name+'의 반칙.',card:name+(e.card==='red'?' 퇴장!':' 경고.'),restart:({corner:'코너킥',freeKick:'프리킥',penalty:'페널티킥',goalKick:'골킥',throwIn:'스로인',indirect:'간접 프리킥'}[e.restart]||'경기 재개')+' 준비',offside:name+' 오프사이드! 상대 간접 프리킥.',attempt:name+(e.heading?'의 헤더!':'의 슈팅!'),shot:e.outcome==='save'?(keeper?.name||'골키퍼')+'가 '+name+'의 슈팅을 잡아냅니다.':e.outcome==='parry'?(keeper?.name||'골키퍼')+'가 쳐냅니다! 세컨드볼 경합.':e.outcome==='blocked'?'수비에 맞고 흘렀습니다.':e.outcome==='woodwork'?'골대에 맞았습니다! 세컨드볼.':name+'의 슈팅이 골문을 벗어납니다.',goal:'골! '+name+(e.ownGoal?'의 자책골':'이(가) 골망을 흔듭니다.')+' ('+s.score.join(' : ')+')',header:name+'의 헤더 경합',block:name+'이(가) 슈팅을 차단합니다.',parry:'골키퍼가 쳐낸 공! 리바운드 경합.',woodwork:'골대! 리바운드 경합.'};
  const result={minute,tick:e.tick,type,team:e.team,text:labels[e.kind]||'공을 향해 경합합니다.',...Object.fromEntries(['outcome','action','xg','shotTick','heading','keeper','ownGoal','card','reason','to','from','victim','restart','setPiece'].filter(k=>e[k]!==null&&e[k]!==undefined).map(k=>[k,e[k]])),actorId:e.id,actorIdentity:p?.identity||null,sourceId:e.source||e.id};
  if(e.kind==='goal'&&e.team===0&&!e.ownGoal&&p){const assist=s.continuous.players.find(p=>p.id===e.source&&p.team===0);Object.assign(result,{scorerId:p.id,scorerIdentity:p.identity,assistId:assist?.id===p.id?null:assist?.id||null,assistIdentity:assist?.id===p.id?null:assist?.identity||null});}
  if(e.kind==='card'){result.id=e.id;s.discipline.events.push({minute,tick:e.tick,team:e.team,id:e.id,card:e.card,reason:e.reason});}
  s.logs.push(result);return result;
 }
 function synchronize(s){const w=s.continuous;s.score=[...w.score];s.shots=[...w.stats.shots];s.chances=[...w.stats.shots];s.xg=[...w.stats.xg];s.minute=Math.ceil(w.tick/600);for(const p of w.players)if(p.team===0){s.players[p.id].energy=p.energy;s.players[p.id].minutes=Math.ceil(p.playedTicks/600);}}
 function advance(F,s,ticks,{stopAtEvent=false}={}){
  if(!s.continuousSetup||!F.running(s)||s.paused)return [];if(!Number.isInteger(ticks)||ticks<0||ticks>6000)throw Error('경기 계산 범위를 확인하세요.');
  const events=[],w=s.continuous,ctx=context(F,s);
  for(let i=0;i<ticks&&F.running(s);i++){
   const before={shots:[...w.stats.shots],xg:[...w.stats.xg],score:[...w.score]},rows=C.step(w,ctx);synchronize(s);
   const seg=s.segments.at(-1);for(const t of [0,1]){seg.shots[t]+=w.stats.shots[t]-before.shots[t];seg.chances[t]+=w.stats.shots[t]-before.shots[t];seg.xg[t]+=w.stats.xg[t]-before.xg[t];seg.goals[t]+=w.score[t]-before.score[t];}
   for(const row of rows)events.push(log(s,row));
   if(w.tick%600===0){for(let draw=0;draw<8;draw++)s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;
    if(s.stoppage){for(const [half,boundary] of [['first',45],['second',F.clockLimits(s).regulation]])if(s.minute===boundary){let seconds=half==='first'?45:90,start=half==='first'?0:F.clockLimits(s).half;for(const e of s.logs)if(e.minute>start&&e.minute<=boundary)seconds+=e.type==='goal'?35:e.type==='card'?25:e.type==='sub'?30:0;s.stoppage[half]=Math.min(half==='first'?5:8,Math.max(1,Math.ceil(seconds/60)));s.logs.push({minute:s.minute,type:'added-time',text:(half==='first'?'전반':'후반')+' 추가시간 '+s.stoppage[half]+'분'});}}
    const lim=F.clockLimits(s),next={[lim.half]:'half',[lim.late]:'late',[lim.full]:'full'}[s.minute];if(next){seg.end=s.minute;seg.endTick=w.tick;s.phase=next;s.paused=false;const e={minute:s.minute,tick:w.tick,type:'break',text:{half:'전반 종료. 전술과 체력을 확인하세요.',late:'후반 65분. 교체와 경기 지시를 확인하세요.',full:'경기 종료. 실제 경기 기록을 확인하세요.'}[next]};s.logs.push(e);events.push(e);if(next!=='full'){const mode=s.score[1]<s.score[0]?'chase':s.score[1]>s.score[0]?'protect':'balanced';s.opponentPlans.push({minute:s.minute,mode,score:[...s.score]});s.logs.push({minute:s.minute,type:'opponent-tactic',text:F.opponentPlanLabels[mode]});}}
   }
   if(stopAtEvent&&rows.some(e=>['attempt','shot','goal','card'].includes(e.kind)))break;
  }return events;
 }
 function replay(F,setup,commands,tick,legacyRestore,{fromTick=null,onFrame=null}={}){
  if(!setup||setup.version!==1||!Number.isInteger(tick)||tick<0||tick>61800||!Array.isArray(commands)||commands.length>400)fail();
  const baseline=legacyRestore(setup.baseline);if(baseline.phase!=='prep'||baseline.minute!==0||baseline.continuousSetup)fail();
  const s=copy(baseline);s.paused=false;enable(F,s,{...setup,positions:Object.entries(setup.placements).map(([id,[x,y]])=>({id,x,y}))},legacyRestore);if(!same(s.continuousSetup,setup))fail();
  let previous=-1;for(const command of commands){if(!command||!Number.isInteger(command.tick)||command.tick<previous||command.tick>tick||!['begin','swap','setTactic','setAttackFocus','teamTalk'].includes(command.op)||!Array.isArray(command.args)||command.args.length>(command.op==='swap'?2:command.op==='begin'?0:1))fail();
   while(s.continuous.tick<command.tick){if(!F.running(s))fail();advance(F,s,fromTick!==null&&s.continuous.tick>=fromTick-1?1:Math.min(600,command.tick-s.continuous.tick,fromTick!==null?Math.max(1,fromTick-1-s.continuous.tick):600));if(fromTick!==null&&s.continuous.tick>=fromTick)onFrame?.(C.frame(s.continuous));}F[command.op](s,...command.args);previous=command.tick;
  }
  while(s.continuous.tick<tick){if(!F.running(s))fail();advance(F,s,fromTick!==null&&s.continuous.tick>=fromTick-1?1:Math.min(600,tick-s.continuous.tick,fromTick!==null?Math.max(1,fromTick-1-s.continuous.tick):600));if(fromTick!==null&&s.continuous.tick>=fromTick)onFrame?.(C.frame(s.continuous));}return s;
 }
 function restore(F,raw,legacyRestore){
  const key=JSON.stringify({...raw,paused:false}),hit=cache.get(key);if(hit){const s=copy(hit);s.paused=F.running(s);return s;}
  let s;try{s=replay(F,raw.continuousSetup,raw.continuousCommands,raw.continuous?.tick,legacyRestore);}catch{fail();}
  if(!same({...raw,paused:false},s))fail();if(cache.size>=4)cache.delete(cache.keys().next().value);cache.set(key,copy(s));s.paused=F.running(s);return s;
 }
 function clip(F,s,event,legacyRestore){const end=Math.min(s.continuous.tick,(event.tick||0)+25),start=Math.max(1,(event.shotTick||event.tick)-55),commands=s.continuousCommands.filter(c=>c.tick<=end),key=JSON.stringify([s.continuousSetup,commands,start,end]);if(clipCache.has(key))return copy(clipCache.get(key));const frames=[];replay(F,s.continuousSetup,commands,end,legacyRestore,{fromTick:start,onFrame:f=>frames.push(f)});const result={frames,start,end,duration:Math.max(100,(end-start)*100)};if(clipCache.size>=4)clipCache.delete(clipCache.keys().next().value);clipCache.set(key,copy(result));return result;}
 const api={enable,note,advance,restore,config,validateOpponents,clip};root.ContinuousMatch=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
