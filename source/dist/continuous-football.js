(function(root){
 'use strict';
 // Versioned rules 1–9: original continuous 100 ms simulation in metres (68 x 105).
 // Outcomes are contacts and boundary crossings, never minute-based chances.
 const T=root.ContinuousTactics||(typeof require==='function'?require('./continuous-tactics.js'):null),P=root.ContinuousContact||(typeof require==='function'?require('./continuous-contact.js'):null);
 const DT=.1,W=68,H=105,GOAL=7.32,POST=(W-GOAL)/2,COVER=new Set(['cover','mark','goal-cover','screen','press-screen']),ARRIVE=new Set(['hold-shape','support','advance-support','run','return-run','overlap','cover','mark','goal-cover','screen','outlet']);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const copy=x=>JSON.parse(JSON.stringify(x));
 function random(w){w.rng=(Math.imul(w.rng,1664525)+1013904223)>>>0;return w.rng/4294967296;}
 const direction=(w,team)=>(team===0?-1:1)*(w.half===1?1:-1);
 const goalY=(w,team)=>direction(w,team)<0?0:H;
 const progress=(w,team,y)=>direction(w,team)<0?H-y:y;
 const fromProgress=(w,team,p)=>direction(w,team)<0?H-p:p;
 function point(w,x,y){return w.half===1?{x:x/W*100,y:y/H*100}:{x:(W-x)/W*100,y:(H-y)/H*100};}
 function person(w,id){return w.players.find(p=>p.id===id&&p.active)||null;}
 function nearest(w,team,at,exclude=null){let best=null,d=Infinity;for(const p of w.players){if(!p.active||p.team!==team||p.id===exclude)continue;const n=dist(p,at);if(n<d){d=n;best=p;}}return best;}
 function emit(w,list,kind,p,extra={}){list.push({kind,tick:w.tick,team:p?.team??extra.team,id:p?.id??null,...extra});}
 function cue(w,kind,p,extra={}){w.cue={kind,tick:w.tick,team:p?.team??extra.team,id:p?.id??null,...extra};}
 function create(config){
  const players=config.players.map(p=>({...copy(p),x:p.homeX,y:p.homeY,vx:0,vy:0,energy:p.initialEnergy,active:true,playedTicks:0,distance:0,cooldown:0,decisionAt:0,focus:1}));
  const w={version:[1,2,3,4,5,6,7,8].includes(config.version)?config.version:9,tick:0,rng:(config.seed^0x434f4e54)>>>0,half:1,firstKickTeam:0,players,ball:{x:W/2,y:H/2,z:0,vx:0,vy:0,vz:0,owner:null,lastTouch:null,flight:null},restart:null,pendingShot:null,lastPass:null,score:[0,0],stats:{possession:[0,0],passes:[0,0],completed:[0,0],shots:[0,0],onTarget:[0,0],xg:[0,0],corners:[0,0],freeKicks:[0,0],offsides:[0,0],tackles:[0,0],fouls:[0,0],saves:[0,0]},cue:{kind:'kickoff',tick:0,team:0,id:null},bookings:[],dismissed:[],celebrateUntil:0};
  if(w.version>=3)for(const p of w.players){p.burst=100;p.tackleAt=0;}
  if(w.version>=4)for(const p of w.players){p.prevX=p.x;p.prevY=p.y;}
  if(w.version>=5)for(const p of w.players)p.receptionAt=-10000;
  w.firstKickTeam=random(w)<.5?0:1;kickoff(w,w.firstKickTeam);return w;
 }
 function kickoff(w,team,second=false,reset=true){
  if(second)w.half=2;
  if(w.version>=4){w.restartRule=null;w.offsidePlay=null;w.handHold=null;w.reboundShot=null;w.noHands=null;w.controlledTeam=team;w.transitionTick=-10000;if(w.ai)w.ai.builtAt=-5;}
  if(reset)for(const p of w.players){const y=w.half===1?p.homeY:H-p.homeY;p.x=w.half===1?p.homeX:W-p.homeX;p.y=fromProgress(w,p.team,Math.min(48,progress(w,p.team,y)));p.vx=p.vy=0;}
  const field=w.players.filter(p=>p.active&&p.team===team&&p.pos!=='GK'),p=field.find(p=>p.pos==='FW')||field[0];
  w.ball={x:W/2,y:H/2,z:0,vx:0,vy:0,vz:0,owner:null,lastTouch:null,flight:null};w.lastPass=null;w.pendingShot=null;
  if(p&&reset){p.x=W/2;p.y=H/2-direction(w,team)*.65;}
  w.restart={kind:'kickoff',team,x:W/2,y:H/2,taker:p?.id||null,wait:20};cue(w,'kickoff',p);
 }
 function restart(w,kind,team,x,y,list){
  if(w.version>=4){w.restartRule=null;w.offsidePlay=null;w.handHold=null;w.reboundShot=null;w.noHands=null;w.controlledTeam=team;w.transitionTick=-10000;if(kind==='indirect'){const ownGoal=goalY(w,1-team);if(Math.abs(y-ownGoal)<5.5&&Math.abs(x-W/2)<9.16)y=ownGoal===0?5.5:H-5.5;}if(w.ai)w.ai.builtAt=-5;}
  const eligible=w.players.filter(p=>p.active&&p.team===team&&(kind==='goalKick'?p.pos==='GK':p.pos!=='GK'));
  let taker=eligible.reduce((best,p)=>!best||dist(p,{x,y})<dist(best,{x,y})?p:best,null);
  const preferred=w.setPieces?.[team]?.[kind==='corner'?'corner':kind==='freeKick'?'freeKick':''];if(preferred)taker=person(w,preferred)||taker;
  w.ball={x,y,z:0,vx:0,vy:0,vz:0,owner:null,lastTouch:w.ball.lastTouch,flight:null};w.pendingShot=null;w.lastPass=null;
  w.restart={kind,team,x,y,taker:taker?.id||null,wait:kind==='throwIn'?15:kind==='penalty'?40:25};cue(w,'restart',taker,{restart:kind});
  if(kind==='corner')w.stats.corners[team]++;if(['freeKick','penalty','indirect'].includes(kind))w.stats.freeKicks[team]++;
  emit(w,list,'restart',taker,{restart:kind,x,y});
 }
 function sweep(a,b,p){const dx=b.x-a.x,dy=b.y-a.y,q=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return {t:q,d:Math.hypot(a.x+dx*q-p.x,a.y+dy*q-p.y)};}
 function offside(w,team){const defenders=w.players.filter(p=>p.active&&p.team!==team).map(p=>progress(w,team,p.y)).sort((a,b)=>b-a);const line=Math.max(H/2,progress(w,team,w.ball.y),defenders[1]??H);return w.players.filter(p=>p.active&&p.team===team&&p.pos!=='GK'&&progress(w,team,p.y)>line+.05).map(p=>p.id);}
 function pressure(w,p){let d=Infinity;for(const q of w.players)if(q.active&&q.team!==p.team&&q.pos!=='GK')d=Math.min(d,dist(p,q));return d;}
 function passLane(w,p,q){let risk=0;for(const d of w.players){if(!d.active||d.team===p.team)continue;const s=sweep(p,q,d);if(s.t>.06&&s.t<.96&&s.d<3)risk+=3-s.d;}return risk;}
 function receiver(w,p,kind='pass'){
  const offsideIds=new Set(offside(w,p.team));let best=null,score=-Infinity;for(const q of w.players){if(!q.active||q.team!==p.team||q.id===p.id||kind==='cross'&&q.pos==='GK')continue;const d=dist(p,q);if(d<5||d>50)continue;
   const forward=progress(w,p.team,q.y)-progress(w,p.team,p.y),free=Math.min(8,pressure(w,q)),lane=passLane(w,p,q),focus=w.focuses[p.team],counter=w.tactics[p.team]==='counter';
   let n=forward*.22+free*.9-d*.045-lane*1.4+(q.pos==='MID'?.5:0)+(focus==='combination'&&d<23?1.3:0)+(counter&&forward>10?1.5:0);
   if(kind==='cross')n=progress(w,p.team,q.y)*.15-Math.abs(q.x-W/2)*.35+q.attack*.02+(w.setPieces?.[p.team]?.target===q.id?4:0);
   // A runner behind the line is a risk, not silently moved back on release.
   if(offsideIds.has(q.id)&&kind!=='cross')n-=18;
   if(n>score){score=n;best=q;}
  }return best;
 }
 function launch(w,p,q,kind,list,{setPiece=null,heading=false,restartKick=false}={}){
  const ball=w.ball,shot=kind==='shot',d=q?dist(p,q):Math.abs(goalY(w,p.team)-p.y),speed=shot?(heading?14:20+p.attack*.1):kind==='cross'?19:kind==='throw'?12:12+p.passing*.06;
  let target;if(shot){const distance=Math.abs(goalY(w,p.team)-p.y),spread=(100-p.attack*p.focus*(w.version>=3?.75+p.energy*.0025:1))*.075+distance*.095,aim=(random(w)-.5)*spread*2,keeper=w.players.find(k=>k.active&&k.team!==p.team&&k.pos==='GK');target={x:W/2+(keeper?(keeper.x<W/2?1.7:-1.7):(random(w)-.5)*3)+aim,y:goalY(w,p.team)};}
  else{const travel=d/speed,err=(100-p.passing*p.focus)*.007*(d/18),lead=w.version>=5?T.delivery(w,p,q,kind):{x:q.x+q.vx*travel,y:q.y+q.vy*travel};target={x:clamp(lead.x+(random(w)-.5)*err*2,.2,W-.2),y:clamp(lead.y+(random(w)-.5)*err*2,.2,H-.2)};}
  const dx=target.x-ball.x,dy=target.y-ball.y,length=Math.hypot(dx,dy)||1;
  const drag=kind==='cross'||d>32?.035:.32,travel=Math.max(.2,length/speed),deliverySpeed=w.version>=3&&!shot?Math.min(30,drag*length/(1-Math.exp(-drag*travel))):speed;
  ball.owner=null;ball.lastTouch=p.id;ball.vx=dx/length*deliverySpeed;ball.vy=dy/length*deliverySpeed;ball.vz=kind==='cross'?Math.max(3.5,Math.min(11,d/4)):heading?1.5:shot?1.5+random(w)*4:kind==='throw'?3.5:d>32?4:0;ball.z=heading?1.8:kind==='throw'?1.8:0;
  const action=shot?(heading?'cross':setPiece?'combination':d>28?'long_shot':w.lastPass?.to===p.id?w.lastPass.action:'dribble'):kind==='cross'?'cross':(q&&progress(w,p.team,q.y)-progress(w,p.team,p.y)>12)?'through_ball':'combination';
  ball.flight={kind,team:p.team,kicker:p.id,receiver:q?.id||null,released:w.tick,offside:(w.version===1?!setPiece:!['corner','goalKick','throwIn'].includes(setPiece))?offside(w,p.team):[],setPiece,action};p.cooldown=5;
  if(w.version>=4){w.handHold=null;w.reboundShot=null;w.noHands=!shot&&p.pos!=='GK'?{team:p.team,kind}:null;w.offsidePlay={team:p.team,ids:[...ball.flight.offside]};if(restartKick)w.restartRule={kind:setPiece,team:p.team,taker:p.id,touched:false};}
  if(shot){
   const angle=Math.atan2(POST+GOAL-p.x,d)-Math.atan2(POST-p.x,d),near=pressure(w,p),xg=clamp(.015+Math.exp(-d/15)*Math.abs(angle)*.42*(.6+p.attack*.008)*(near<2?.65:1)*(heading?.7:1),.01,.85);
   w.pendingShot={team:p.team,shooter:p.id,source:w.lastPass?.team===p.team&&w.lastPass.to===p.id&&w.tick-w.lastPass.tick<150?w.lastPass.from:null,action,xg,tick:w.tick,setPiece,heading};w.stats.shots[p.team]++;w.stats.xg[p.team]+=xg;emit(w,list,'attempt',p,{action,xg,setPiece});cue(w,heading?'header':'shot',p,{action});
  }else{w.stats.passes[p.team]++;emit(w,list,'pass',p,{to:q.id,action,setPiece});cue(w,kind==='cross'?'cross':'pass',p,{to:q.id,action});}
 }
 function finishShot(w,list,outcome,keeper=null){
  const shot=w.pendingShot;if(!shot)return;const p=person(w,shot.shooter)||w.players.find(p=>p.id===shot.shooter);
  if(['goal','save','parry'].includes(outcome))w.stats.onTarget[shot.team]++;
  if(keeper&&['save','parry'].includes(outcome))w.stats.saves[keeper.team]++;
  if(outcome==='goal')w.score[shot.team]++;
  if(w.version>=4)w.reboundShot=['parry','blocked','woodwork'].includes(outcome)?{...copy(shot),onTarget:outcome==='parry'}:null;
  emit(w,list,outcome==='goal'?'goal':'shot',p,{outcome,source:shot.source,action:shot.action,xg:shot.xg,shotTick:shot.tick,setPiece:shot.setPiece,heading:shot.heading,keeper:keeper?.id||null});w.pendingShot=null;
 }
 function foul(w,d,p,list){
  w.stats.fouls[d.team]++;emit(w,list,'foul',d,{victim:p.id});
  const booked=w.bookings.includes(d.id),reds=w.dismissed.filter(id=>w.players.find(p=>p.id===id)?.team===d.team).length;
  if(random(w)<.2&&(!booked||reds<4)){const red=reds<4&&(booked||random(w)<.02);w.bookings.push(d.id);if(red){w.dismissed.push(d.id);d.active=false;}
   emit(w,list,'card',d,{card:red?'red':'yellow',reason:red?(booked?'second-yellow':'direct-red'):'foul'});
  }
  const penalty=progress(w,p.team,p.y)>H-16.5&&Math.abs(p.x-W/2)<20.16;
  restart(w,penalty?'penalty':'freeKick',p.team,penalty?W/2:p.x,penalty?fromProgress(w,p.team,H-11):p.y,list);
 }
 function touchRule(w,p,list,{deliberate=false}={}){
  if(w.version<4)return true;
  const rule=w.restartRule,off=w.offsidePlay;
  if(rule&&!rule.touched&&rule.taker===p.id){emit(w,list,'infringement',p,{reason:'double-touch'});finishShot(w,list,'invalid');restart(w,'indirect',1-p.team,p.x,p.y,list);return false;}
  if(off?.team===p.team&&off.ids.includes(p.id)){w.stats.offsides[p.team]++;emit(w,list,'offside',p);finishShot(w,list,'invalid');restart(w,'indirect',1-p.team,p.x,p.y,list);return false;}
  if(rule&&rule.taker!==p.id)rule.touched=true;
  if(w.noHands&&p.team!==w.noHands.team)w.noHands=null;
  if(deliberate){w.offsidePlay=null;w.reboundShot=null;w.noHands=null;}
  else if(off&&off.team===p.team)w.offsidePlay={team:p.team,ids:offside(w,p.team)};
  return true;
 }
 function possession(w,p){if(w.version<4)return;if(w.controlledTeam!==null&&w.controlledTeam!==p.team)w.transitionTick=w.tick;w.controlledTeam=p.team;}
 function control(w,p,list,flight=null,{hands=false,rulesChecked=false}={}){
  if(w.version>=4){if(!rulesChecked&&!touchRule(w,p,list,{deliberate:true}))return;w.offsidePlay=null;w.reboundShot=null;w.noHands=null;}
  if(flight?.offside.includes(p.id)&&p.team===flight.team){w.stats.offsides[p.team]++;emit(w,list,'offside',p);restart(w,'indirect',1-p.team,p.x,p.y,list);return;}
  if(flight&&p.team===flight.team&&(w.version<4||flight.kind!=='shot')){w.stats.completed[p.team]++;w.lastPass={from:flight.kicker,to:p.id,team:p.team,tick:w.tick,action:flight.action,setPiece:flight.setPiece};emit(w,list,'receive',p,{from:flight.kicker});}
  else{w.lastPass=null;emit(w,list,'recovery',p);}
  if(w.version>=5)p.receptionAt=w.tick;
  const b=w.ball;b.owner=p.id;b.lastTouch=p.id;b.flight=null;b.vx=b.vy=b.vz=b.z=0;p.decisionAt=w.tick+(w.version>=6?14+Math.floor((100-p.passing)*.06):w.version>=5?9+Math.floor((100-p.passing)*.04):((w.version>=3?17:10)+Math.floor((100-p.passing)*.08)));cue(w,p.pos==='GK'?(w.version>=4&&!hands?'keeper-feet':'keeper-hold'):'control',p);if(w.version>=4){possession(w,p);w.handHold=hands?{keeper:p.id,tick:w.tick}:null;}
 }
 function move(w,p,target,sprint=false,role=null){
  if(w.version>=4){p.prevX=p.x;p.prevY=p.y;}
  let tx=target.x,ty=target.y;for(const q of w.players){if(!q.active||q.id===p.id)continue;const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<1.1){const dx=d>.01?(p.x-q.x)/d:(p.id<q.id?-1:1),dy=d>.01?(p.y-q.y)/d:0;tx+=dx*(1.1-d)*.6;ty+=dy*(1.1-d)*.6;}}
  const dx=tx-p.x,dy=ty-p.y,n=Math.hypot(dx,dy)||1,limit=w.version>=3?T.speed(p)*(sprint?1:w.version>=7&&COVER.has(role)&&n>3?.60:.40)*(w.version>=6&&w.ball.owner===p.id&&p.pos!=='GK'?.76+p.attack*.001:1):(4.7+p.speed*.036)*(.65+p.energy*.0035)*p.focus*(sprint?1:.74),want=w.version>=8&&!w.restart&&!sprint&&ARRIVE.has(role)?(n<.65?0:Math.min(limit,Math.sqrt(2*(2.4+p.speed*.027)*Math.max(0,n-.45)))):Math.min(limit,n/DT),turn=w.version>=3&&p.vx*dx+p.vy*dy<0?.68:1,a=(2.4+p.speed*.027)*DT*turn;
  p.vx+=clamp(dx/n*want-p.vx,-a,a);p.vy+=clamp(dy/n*want-p.vy,-a,a);const x=clamp(p.x+p.vx*DT,.15,W-.15),y=clamp(p.y+p.vy*DT,.15,H-.15),d=Math.hypot(x-p.x,y-p.y);p.x=x;p.y=y;p.distance+=d;p.playedTicks++;let exertion=sprint?.004:.0018;
  if(w.version>=3){const recovery=!sprint||d<.1;p.burst=clamp(p.burst+(recovery?(2.2+p.endurance*.022):-(9.5-p.endurance*.035))*DT,0,100);if(w.version>=7)exertion=d/DT>T.speed(p)*.72?.0075:.0022;p.energy=clamp(p.energy-(d*exertion+.00012)*(1.2-p.endurance*.004),0,100);}else p.energy=clamp(p.energy-(d*(sprint?.0016:.001)+.0001)*(1.2-p.endurance*.004),0,100);if(p.cooldown)p.cooldown--;return exertion;
 }
 // Rule7 keeps restart clearance feasible inside the pitch, including a body-spacing margin.
 function clearanceTarget(target,r,radius){
  const safe=radius+.6,dx=target.x-r.x,dy=target.y-r.y;if(Math.hypot(dx,dy)>=safe)return target;
  const angle=Math.atan2(dy,dx),offsets=[0,1,-1,2,-2,3,-3,4,-4,5,-5,6,-6,7,-7,8];let best=null,cost=Infinity;
  for(const offset of offsets){const a=angle+offset*Math.PI/8,q={x:r.x+Math.cos(a)*safe,y:r.y+Math.sin(a)*safe};if(q.x<1||q.x>W-1||q.y<1||q.y>H-1)continue;const d=(q.x-target.x)**2+(q.y-target.y)**2;if(d<cost){cost=d;best=q;}}
  return best||{x:W/2,y:H/2};
 }
 function targets(w){
  if(w.version>=3&&!w.restart){const rows=T.prepare(w).map(row=>({p:person(w,row.id),target:{x:row.x,y:row.y},sprint:row.sprint,role:row.role})).filter(row=>row.p);for(const p of w.players)if(p.active&&p.pos==='GK'){const goal=goalY(w,1-p.team),b=w.ball,shot=b.flight?.kind==='shot'&&b.flight.team!==p.team,carrier=person(w,b.owner),danger=carrier?.team!==p.team&&carrier&&Math.abs(b.y-goal)<18&&Math.abs(b.x-W/2)<19,time=shot?clamp((goal-b.y)/(b.vy||1),0,2):0,read=w.version<4||!shot||w.tick-b.flight.released>=Math.round(5-p.keeping*.022),depth=danger?clamp(Math.abs(b.y-goal)*.12,.6,2.2):3,closing=danger&&dist(p,b)<2.4;rows.push({p,target:closing?{x:b.x,y:b.y}:{x:clamp(shot&&read?b.x+b.vx*time:W/2+(b.x-W/2)*(danger?.3:.18),POST-.5,POST+GOAL+.5),y:goal-direction(w,1-p.team)*(shot?1.4:depth)},sprint:shot||danger});}return rows;}
  const ball=w.ball,carrier=person(w,ball.owner),attack=carrier?.team??ball.flight?.team??w.restart?.team??w.players.find(p=>p.id===ball.lastTouch)?.team??0,chasing=[[],[]];
  for(const team of [0,1]){const candidates=w.players.filter(p=>p.active&&p.team===team&&p.pos!=='GK').sort((a,b)=>dist(a,ball)-dist(b,ball));chasing[team]=candidates.slice(0,carrier&&carrier.team===team?0:w.tactics[team]==='press'?3:2).map(p=>p.id);}
  const goals=[];for(const p of w.players){if(!p.active)continue;const homeX=w.half===1?p.homeX:W-p.homeX,at=progress(w,p.team,ball.y),own=attack===p.team,tactic=w.tactics[p.team],role=p.role||p.pos;
   let depth=role==='DEF'?(own?clamp(at-26,22,54):clamp(at-9,10,tactic==='press'?48:37)):role==='MID'?(own?clamp(at-8,35,81):clamp(at+7,24,59)):(own?clamp(at+17,55,99):clamp(at+24,42,73));
   if(tactic==='lowBlock'&&!own)depth-=5;
   if(own&&p.pos==='FW'&&!ball.flight){const line=w.players.filter(q=>q.active&&q.team!==p.team).map(q=>progress(w,p.team,q.y)).sort((a,b)=>b-a)[1]??H;depth=Math.min(depth,Math.max(H/2,progress(w,p.team,ball.y),line)-1.2);}
   let target={x:clamp(homeX+(ball.x-W/2)*(own?.10:.23),2,W-2),y:fromProgress(w,p.team,depth)},sprint=false;
   if(w.restart?.taker===p.id){target={x:w.restart.x,y:w.restart.y-direction(w,p.team)*.5};sprint=true;}else if(w.restart?.kind==='kickoff'){target={x:homeX,y:fromProgress(w,p.team,Math.min(42,progress(w,p.team,w.half===1?p.homeY:H-p.homeY)))};}else if(p.pos==='GK'){
    const goal=goalY(w,1-p.team),shot=ball.flight?.kind==='shot'&&ball.flight.team!==p.team,t=shot?clamp((goal-ball.y)/(ball.vy||1),0,2):0;
    target={x:clamp(shot?ball.x+ball.vx*t:W/2+(ball.x-W/2)*.18,POST-.5,POST+GOAL+.5),y:goal-direction(w,1-p.team)*(shot?1.4:3)};sprint=shot;
   }else if(w.restart&&w.restart.team===p.team&&w.restart.kind==='corner'){target={x:clamp(homeX*.45+W/2*.55,22,46),y:fromProgress(w,p.team,p.pos==='FW'?96:p.pos==='MID'?87:70)};}
   else if(p.id===ball.owner){const nearest=pressure(w,p),wide=Math.abs(p.x-W/2)>22,focus=w.focuses[p.team];target={x:clamp(p.x+(nearest<2?(p.x<W/2?-2.5:2.5):wide&&focus!=='cross'?(W/2-p.x)*.08:0),1,W-1),y:p.y+direction(w,p.team)*(p.pos==='GK'?0:nearest<2?1.8:4)};sprint=nearest>4&&p.speed>65;}
   else if(ball.flight?.receiver===p.id){target={x:clamp(ball.x+ball.vx*.6,1,W-1),y:clamp(ball.y+ball.vy*.6,1,H-1)};sprint=true;}
   else if(chasing[p.team].includes(p.id)&&!w.restart){target={x:ball.x,y:ball.y-direction(w,p.team)*.65};sprint=true;}
   // A marked forward bends the run toward a free channel; teammates keep width.
   else if(own&&p.pos==='FW')target.x=clamp(homeX+(p.id.charCodeAt(p.id.length-1)%2?2:-2),12,56);
   if(w.restart?.kind==='penalty'&&w.restart.taker!==p.id){target=p.pos==='GK'&&p.team!==w.restart.team?{x:W/2,y:goalY(w,w.restart.team)-direction(w,w.restart.team)*.2}:{x:homeX,y:fromProgress(w,w.restart.team,84)};}
   if((w.restart?.kind==='freeKick'||w.version>=2&&w.restart?.kind==='indirect')&&w.restart.team!==p.team&&p.pos==='GK'&&Math.abs(w.restart.y-goalY(w,1-p.team))<9.15)target={x:clamp(p.x,POST+.2,POST+GOAL-.2),y:goalY(w,1-p.team)-direction(w,1-p.team)*.2};
   if(w.restart&&w.restart.team!==p.team&&!((w.restart.kind==='freeKick'||w.version>=2&&w.restart.kind==='indirect')&&p.pos==='GK'&&Math.abs(w.restart.y-goalY(w,1-p.team))<9.15)){const radius=w.restart.kind==='throwIn'?2:9.15,dx=target.x-w.restart.x,dy=target.y-w.restart.y,n=Math.hypot(dx,dy);if(w.version>=7)target=clearanceTarget(target,w.restart,radius);else if(n<radius){const length=n||1;target={x:clamp(w.restart.x+(n?dx/length:1)*radius,1,W-1),y:clamp(w.restart.y+(n?dy/length:-direction(w,p.team))*radius,1,H-1)};}}
   goals.push({p,target,sprint});
  }return goals;
 }
 function ownedBall(w,list){
  const b=w.ball,p=person(w,b.owner);if(!p){b.owner=null;return;}const oldOwned={x:b.x,y:b.y,z:0};b.x=p.x;b.y=w.version>=4?p.y+direction(w,p.team)*.6:clamp(p.y+direction(w,p.team)*.6,0,H);b.z=b.vx=b.vy=b.vz=0;
  if(w.version>=4){const crossing=P.boundary(oldOwned,b),keeper=w.players.find(q=>q.active&&q.team!==p.team&&q.pos==='GK'&&Math.abs(q.y-goalY(w,p.team))<16.5&&Math.abs(q.x-W/2)<20.16),contact=keeper?P.entry(oldOwned,b,{x:keeper.prevX,y:keeper.prevY},keeper,1.3,.2):null;if(keeper&&contact!==null&&contact<=(crossing?.t??1)&&w.tick>=keeper.tackleAt){keeper.tackleAt=w.tick+12;if(random(w)<clamp(.3+keeper.keeping*.005-p.attack*.0015,.3,.8)){control(w,keeper,list,null,{hands:true});keeper.decisionAt=w.tick+25;cue(w,'keeper-hold',keeper);return;}if(!touchRule(w,keeper,list))return;b.x=oldOwned.x+(b.x-oldOwned.x)*contact;b.y=oldOwned.y+(b.y-oldOwned.y)*contact;b.owner=null;b.lastTouch=keeper.id;b.flight=null;b.vx=(random(w)-.5)*8;b.vy=direction(w,keeper.team)*10;b.vz=1.2;keeper.cooldown=6;p.cooldown=8;w.lastPass=null;emit(w,list,'keeper-clear',keeper);cue(w,'keeper-clear',keeper);return;}if(crossing){endBall(w,list,crossing);return;}if(w.handHold?.keeper===p.id&&w.tick-w.handHold.tick>80){emit(w,list,'infringement',p,{reason:'keeper-eight-seconds'});const goal=goalY(w,1-p.team);restart(w,'corner',1-p.team,p.x<W/2?.1:W-.1,goal,list);return;}}

  const d=nearest(w,1-p.team,b);
  if(w.version===3&&d?.pos==='GK'&&Math.abs(d.y-goalY(w,p.team))<16.5&&Math.abs(d.x-W/2)<20.16&&dist(d,b)<1.3&&w.tick>=d.tackleAt){d.tackleAt=w.tick+12;if(random(w)<clamp(.3+d.keeping*.005-p.attack*.0015,.3,.8)){control(w,d,list,null,{hands:true});d.decisionAt=w.tick+25;cue(w,'keeper-hold',d);return;}}
  if(d&&!(w.version>=4&&w.handHold?.keeper===p.id)&&d.pos!=='GK'&&dist(d,b)<1.45&&(w.version>=3?w.tick>=d.tackleAt&&((d.y-p.y)*direction(w,p.team)>=-.3||dist(d,b)<.85&&d.defense>=p.attack+15):!d.cooldown)){if(w.version>=3){d.tackleAt=w.tick+20;d.cooldown=2;}else d.cooldown=65;const skill=(d.defense*d.focus*.006+.16)*(.6+d.energy*.004),behind=(d.y-p.y)*direction(w,p.team)<-.3;
   if(random(w)<(behind?.035:.012)){foul(w,d,p,list);return;}
   if(random(w)<clamp(skill-p.attack*.002-p.speed*.001,.15,.85)){w.stats.tackles[d.team]++;emit(w,list,'tackle',d,{victim:p.id});b.owner=null;b.lastTouch=d.id;b.flight=null;b.x=(p.x+d.x)/2;b.y=(p.y+d.y)/2;b.vx=(random(w)-.5)*5;b.vy=direction(w,d.team)*3;p.cooldown=8;w.lastPass=null;cue(w,'tackle',d);return;}
  }
  if(w.tick<p.decisionAt)return;p.decisionAt=w.tick+(w.version>=3?24:12);
  if(w.version>=3){const action=T.choose(w,p);if(action.kind!=='carry'){launch(w,p,action.receiver,action.kind,list);return;}cue(w,Math.abs(p.x-W/2)>20?'wing-run':'carry',p);return;}
  const distance=Math.abs(goalY(w,p.team)-p.y),near=pressure(w,p),wide=Math.abs(p.x-W/2)>22,focus=w.focuses[p.team];
  if(p.pos!=='GK'&&distance<29&&!wide&&random(w)<(distance<14?.15:near<3?.045:.025)){launch(w,p,null,'shot',list);return;}
  if(wide&&distance<31&&focus!=='dribble'){const q=receiver(w,p,'cross');if(q&&progress(w,p.team,q.y)>73){launch(w,p,q,'cross',list);return;}}
  const q=receiver(w,p);if(q&&(p.pos==='GK'||near<3||focus==='combination'||random(w)<.38)){launch(w,p,q,'pass',list);return;}
  cue(w,wide?'wing-run':'carry',p);
 }
 function endBall(w,list,crossing){
  const b=w.ball,{x,y,z}=crossing;
  if(crossing.axis==='x'){finishShot(w,list,'wide');const last=w.players.find(p=>p.id===b.lastTouch);restart(w,'throwIn',1-(last?.team??0),x<0?.1:W-.1,clamp(y,1,H-1),list);return;}
  const line=y<0?0:H,team=goalY(w,0)===line?0:1,rule=w.restartRule;
  if(P.goal(crossing)){
   if(rule&&!rule.touched&&(rule.team!==team||['indirect','throwIn'].includes(rule.kind))){emit(w,list,'infringement',person(w,rule.taker),{reason:rule.team!==team?'restart-own-goal':'restart-direct-goal'});finishShot(w,list,'invalid');const corner=rule.team!==team;restart(w,corner?'corner':'goalKick',corner?team:1-team,corner?(x<W/2?.1:W-.1):W/2,corner?line:line===0?5.5:H-5.5,list);return;}
   const original=w.pendingShot||w.reboundShot,scorer=w.players.find(p=>p.id===(original?.team===team?original.shooter:b.lastTouch));
   if(w.pendingShot?.team===team)finishShot(w,list,'goal');
   else if(w.reboundShot?.team===team){const shot=w.reboundShot;w.score[team]++;if(!shot.onTarget)w.stats.onTarget[team]++;emit(w,list,'goal',scorer,{team,source:shot.source,action:shot.action,xg:shot.xg,outcome:'goal',shotTick:shot.tick,setPiece:shot.setPiece,heading:shot.heading});w.reboundShot=null;}
   else{finishShot(w,list,'wide');w.score[team]++;const ownGoal=scorer?.team!==team;if(!ownGoal){w.stats.shots[team]++;w.stats.onTarget[team]++;w.stats.xg[team]+=.01;}emit(w,list,'goal',scorer,{team,source:null,action:'combination',xg:ownGoal?0:.01,outcome:ownGoal?'own-goal':'deflection',ownGoal});}
   b.x=x;b.y=line;b.z=z;b.vx=b.vy=b.vz=0;b.flight=null;w.celebrateUntil=w.tick+65;w.restartRule=null;w.offsidePlay=null;w.handHold=null;w.reboundShot=null;w.restart={kind:'afterGoal',team:1-team,x:W/2,y:H/2,taker:null,wait:65};cue(w,'goal',scorer,{team});return;
  }
  finishShot(w,list,'wide');const last=w.players.find(p=>p.id===b.lastTouch),corner=last?.team!==team;restart(w,corner?'corner':'goalKick',corner?team:1-team,corner?(x<W/2?.1:W-.1):W/2,corner?line:line===0?5.5:H-5.5,list);
 }
 function preciseTravel(w,list,old,end,offset=0,depth=0){
  const b=w.ball,flight=b.flight,edge=P.boundary(old,end),wood=P.frame(old,end),deadline=Math.min(edge?.t??Infinity,wood?.t??Infinity);let hit=null,contact=Infinity;
  for(const p of w.players){if(!p.active||p.cooldown||flight?.kicker===p.id&&w.tick-flight.released<4)continue;
   const keeping=p.pos==='GK'&&Math.abs(p.y-goalY(w,1-p.team))<16.5&&Math.abs(p.x-W/2)<20.16&&w.noHands?.team!==p.team,reach=keeping?(flight?.kind==='shot'?(w.tick-flight.released>=Math.round(5-p.keeping*.022)?2+p.keeping*.005:1.2+p.keeping*.006):1.1):flight?.kind==='shot'?.8:.6,height=keeping?2.6:flight?.kind==='cross'?2.15:flight?.kind==='shot'?1.65:1.1;
   const start={x:p.prevX+(p.x-p.prevX)*offset,y:p.prevY+(p.y-p.prevY)*offset},t=P.entry(old,end,start,p,reach,height);
   if(t===null||t>deadline+1e-10)continue;if(t<contact){hit=p;contact=t;}
  }
  const at=t=>{b.x=old.x+(end.x-old.x)*t;b.y=old.y+(end.y-old.y)*t;b.z=old.z+(end.z-old.z)*t;};
  if(hit){at(contact);if(!touchRule(w,hit,list))return;
   const keeping=hit.pos==='GK'&&Math.abs(hit.y-goalY(w,1-hit.team))<16.5&&Math.abs(hit.x-W/2)<20.16&&w.noHands?.team!==hit.team;
   if(keeping){const hold=random(w)<clamp(.65+hit.keeping*.004-Math.hypot(b.vx,b.vy)*.008,.2,.85);finishShot(w,list,hold?'save':'parry',hit);
    if(hold){control(w,hit,list,null,{hands:true,rulesChecked:true});hit.decisionAt=w.tick+25;cue(w,'save',hit);}else{b.lastTouch=hit.id;b.owner=null;b.flight=null;b.vx=(random(w)<.5?-1:1)*(4+random(w)*10);b.vy=direction(w,hit.team)*(random(w)<.35?-.6:5);b.vz=1.8;hit.cooldown=6;w.lastPass=null;emit(w,list,'parry',hit);cue(w,'parry',hit);}return;
   }
   if(b.z>1.1&&flight?.kind==='cross'&&hit.pos!=='GK'){
    b.lastTouch=hit.id;emit(w,list,'header',hit);cue(w,'header',hit);
    if(hit.team===flight.team&&Math.abs(goalY(w,hit.team)-hit.y)<19){w.stats.completed[hit.team]++;w.lastPass={from:flight.kicker,to:hit.id,team:hit.team,tick:w.tick,action:'cross',setPiece:flight.setPiece};launch(w,hit,null,'shot',list,{setPiece:flight.setPiece,heading:true});}
    else{touchRule(w,hit,list,{deliberate:true});finishShot(w,list,'blocked');w.reboundShot=null;b.owner=null;b.flight=null;b.vx=(random(w)-.5)*12;b.vy=direction(w,hit.team)*13;b.vz=5;hit.cooldown=5;w.lastPass=null;}return;
   }
   if(w.pendingShot||w.reboundShot&&Math.hypot(b.vx,b.vy)>6){finishShot(w,list,'blocked');emit(w,list,'block',hit);b.lastTouch=hit.id;b.owner=null;b.flight=null;b.vx=(random(w)-.5)*9;b.vy=direction(w,hit.team)*5;hit.cooldown=5;cue(w,'block',hit);return;}
   control(w,hit,list,flight,{rulesChecked:true});return;
  }
  if(wood&&wood.t<=(edge?.t??Infinity)){at(wood.t);finishShot(w,list,'woodwork');P.reflect(b,wood.normal);b.x+=wood.normal.x*.0001;b.y+=wood.normal.y*.0001;b.z=Math.max(0,b.z+wood.normal.z*.0001);b.flight=null;const team=w.reboundShot?.team??w.players.find(p=>p.id===b.lastTouch)?.team??0;emit(w,list,'woodwork',null,{team});cue(w,'woodwork',null,{team});
   if(depth<2){const remaining=(1-offset)*(1-wood.t),start={x:b.x,y:b.y,z:b.z},next={x:b.x+b.vx*DT*remaining,y:b.y+b.vy*DT*remaining,z:Math.max(0,b.z+b.vz*DT*remaining)};preciseTravel(w,list,start,next,1-remaining,depth+1);}return;
  }
  if(edge){endBall(w,list,edge);return;}at(1);
  if(Math.hypot(b.vx,b.vy)<.6&&b.z<.2){const p=nearest(w,0,b),q=nearest(w,1,b),winner=p&&(!q||dist(p,b)<dist(q,b))?p:q;if(winner&&!winner.cooldown&&dist(winner,b)<.9)control(w,winner,list,flight);}
 }
 function flyingPrecise(w,list){
  const b=w.ball,old={x:b.x,y:b.y,z:b.z};b.vx*=Math.exp(-(b.z>.05?.035:.32)*DT);b.vy*=Math.exp(-(b.z>.05?.035:.32)*DT);const end={x:b.x+b.vx*DT,y:b.y+b.vy*DT,z:b.z};
  if(b.z>0||b.vz>0){end.z+=b.vz*DT-4.905*DT*DT;b.vz-=9.81*DT;if(end.z<0){end.z=0;b.vz=Math.abs(b.vz)>.9?-b.vz*.3:0;}}
  preciseTravel(w,list,old,end);
 }
 function flyingBall(w,list){
  if(w.version>=4){flyingPrecise(w,list);return;}
  const b=w.ball,old={x:b.x,y:b.y,z:b.z};b.vx*=Math.exp(-(b.z>.05?.035:.32)*DT);b.vy*=Math.exp(-(b.z>.05?.035:.32)*DT);b.x+=b.vx*DT;b.y+=b.vy*DT;
  if(b.z>0||b.vz>0){b.z+=b.vz*DT-4.905*DT*DT;b.vz-=9.81*DT;if(b.z<0){b.z=0;b.vz=Math.abs(b.vz)>.9?-b.vz*.3:0;}}
  const flight=b.flight;let lineT=1;if(b.y<0||b.y>H)lineT=clamp(((b.y<0?0:H)-old.y)/(b.y-old.y||1),0,1);
  let hit=null,contact=Infinity;for(const p of w.players){if(!p.active||p.cooldown||flight?.kicker===p.id&&w.tick-flight.released<4)continue;const s=sweep(old,b,p),z=old.z+(b.z-old.z)*s.t,keeping=p.pos==='GK'&&Math.abs(p.y-goalY(w,1-p.team))<16.5&&Math.abs(p.x-W/2)<20.16,reach=keeping?(flight?.kind==='shot'?2+p.keeping*.007:1.1):w.version>=3&&flight?.kind==='shot'?.8:.6;
   if(s.t>lineT||s.d>reach||z>(keeping?2.6:flight?.kind==='cross'?2.15:w.version>=3&&flight?.kind==='shot'?1.65:1.1))continue;if(s.t<contact){hit=p;contact=s.t;}
  }
  if(hit){const x=old.x+(b.x-old.x)*contact,y=old.y+(b.y-old.y)*contact,z=old.z+(b.z-old.z)*contact;b.x=x;b.y=y;b.z=z;
   const keeping=hit.pos==='GK'&&Math.abs(hit.y-goalY(w,1-hit.team))<16.5&&Math.abs(hit.x-W/2)<20.16;
   if(keeping&&flight?.team!==hit.team){const hold=random(w)<clamp(w.version>=3?.65+hit.keeping*.004-Math.hypot(b.vx,b.vy)*.008:.45+hit.keeping*.005-Math.hypot(b.vx,b.vy)*.014,.2,.85);finishShot(w,list,hold?'save':'parry',hit);
    if(hold){control(w,hit,list);hit.decisionAt=w.tick+25;cue(w,'save',hit);}else{b.lastTouch=hit.id;b.owner=null;b.flight=null;b.vx=(random(w)<.5?-1:1)*(4+random(w)*10);b.vy=direction(w,hit.team)*(random(w)<.35?-.6:5);b.vz=1.8;hit.cooldown=6;w.lastPass=null;emit(w,list,'parry',hit);cue(w,'parry',hit);}return;
   }
   if(flight?.offside.includes(hit.id)&&hit.team===flight.team){control(w,hit,list,flight);return;}
   if(z>1.1&&flight?.kind==='cross'){
    b.lastTouch=hit.id;emit(w,list,'header',hit);cue(w,'header',hit);
    if(hit.team===flight.team&&Math.abs(goalY(w,hit.team)-hit.y)<19){w.stats.completed[hit.team]++;w.lastPass={from:flight.kicker,to:hit.id,team:hit.team,tick:w.tick,action:'cross',setPiece:flight.setPiece};launch(w,hit,null,'shot',list,{setPiece:flight.setPiece,heading:true});}
    else{finishShot(w,list,'blocked');b.owner=null;b.flight=null;b.vx=(random(w)-.5)*12;b.vy=direction(w,hit.team)*13;b.vz=5;hit.cooldown=5;w.lastPass=null;}return;
   }
   if(w.pendingShot){finishShot(w,list,'blocked');emit(w,list,'block',hit);b.lastTouch=hit.id;b.owner=null;b.flight=null;b.vx=(random(w)-.5)*9;b.vy=direction(w,hit.team)*5;hit.cooldown=5;cue(w,'block',hit);return;}
   control(w,hit,list,flight);return;
  }
  if(b.y<0||b.y>H){const line=b.y<0?0:H,x=old.x+(b.x-old.x)*lineT,z=old.z+(b.z-old.z)*lineT,team=goalY(w,0)===line?0:1;
   if(z<2.64&&(Math.abs(x-POST)<.2||Math.abs(x-POST-GOAL)<.2||z>2.24&&z<2.64&&x>POST&&x<POST+GOAL)){finishShot(w,list,'woodwork');b.y=line===0?.25:H-.25;b.vy=-b.vy*.7;b.lastTouch=b.lastTouch;b.flight=null;emit(w,list,'woodwork',null,{team});cue(w,'woodwork',null,{team});return;}
   if(z<2.44&&x>POST&&x<POST+GOAL){const scorerId=w.pendingShot?.shooter||b.lastTouch;if(w.pendingShot){finishShot(w,list,'goal');}else{const p=w.players.find(p=>p.id===b.lastTouch);w.score[team]++;const ownGoal=p?.team!==team;if(!ownGoal){w.stats.shots[team]++;w.stats.onTarget[team]++;w.stats.xg[team]+=.01;}emit(w,list,'goal',p,{team,source:null,action:'combination',xg:ownGoal?0:.01,outcome:ownGoal?'own-goal':'deflection',ownGoal});}b.x=x;b.y=line;b.vx=b.vy=b.vz=0;b.flight=null;w.celebrateUntil=w.tick+65;w.restart={kind:'afterGoal',team:1-team,x:W/2,y:H/2,taker:null,wait:65};cue(w,'goal',w.players.find(p=>p.id===scorerId),{team});return;}

   finishShot(w,list,'wide');const last=w.players.find(p=>p.id===b.lastTouch),corner=last?.team!==team;restart(w,corner?'corner':'goalKick',corner?team:1-team,corner?(x<W/2?.1:W-.1):W/2,corner?line:line===0?5.5:H-5.5,list);return;
  }
  if(b.x<0||b.x>W){finishShot(w,list,'wide');const last=w.players.find(p=>p.id===b.lastTouch);restart(w,'throwIn',1-(last?.team??0),b.x<0?.1:W-.1,clamp(b.y,1,H-1),list);return;}
  if(Math.hypot(b.vx,b.vy)<.6&&b.z<.2){const p=nearest(w,0,b),q=nearest(w,1,b),winner=p&&(!q||dist(p,b)<dist(q,b))?p:q;if(winner&&dist(winner,b)<.9)control(w,winner,list,flight);}
 }
 function step(w,context={}){
  const list=[];w.tick++;w.tactics=context.tactics||['balanced','balanced'];w.focuses=context.focuses||['balanced','balanced'];if(w.version>=3){w.tactics=[...w.tactics];w.tactics[1]=T.coach(w,w.tactics[1]);}w.setPieces=context.setPieces||[{},{}];
  for(const p of w.players)p.focus=context.focus?.[p.id]||1;
  if(w.restart?.kind==='afterGoal'){for(const p of w.players)if(p.active){p.playedTicks++;p.vx=p.vy=0;}if(w.tick>=w.celebrateUntil)kickoff(w,w.restart.team,false,false);return list;}
  const movement=targets(w);for(const row of movement)row.exertion=move(w,row.p,row.target,row.sprint,row.role);
  if(w.version>=4){const travelled=movement.map(row=>Math.hypot(row.p.x-row.p.prevX,row.p.y-row.p.prevY));P.bodies(w.players);for(let i=0;i<movement.length;i++){const {p,sprint,exertion}=movement[i],delta=Math.hypot(p.x-p.prevX,p.y-p.prevY)-travelled[i];p.distance+=delta;p.energy=clamp(p.energy-delta*(w.version>=7?exertion:(sprint?.004:.0018))*(1.2-p.endurance*.004),0,100);}}
  if(w.restart){const r=w.restart,p=person(w,r.taker);if(r.wait>0)r.wait--;const clearance=r.kind==='throwIn'?1.9:9.0,ready=w.players.every(q=>!q.active||q.team===r.team||(r.kind==='freeKick'||w.version>=2&&r.kind==='indirect')&&q.pos==='GK'&&Math.abs(q.y-goalY(w,1-q.team))<.4||dist(q,r)>=clearance);if(p&&ready&&r.wait<=0&&dist(p,r)<1.4){w.ball.x=r.x;w.ball.y=r.y;w.ball.owner=p.id;w.ball.lastTouch=p.id;w.restart=null;
    if((r.kind==='penalty'||r.kind==='freeKick'&&Math.abs(goalY(w,p.team)-p.y)<32)&&p.pos!=='GK')launch(w,p,null,'shot',list,{setPiece:r.kind==='penalty'?'penalty':'freeKick',restartKick:true});
    else{let q=r.kind==='corner'?receiver(w,p,'cross'):receiver(w,p);if(q)launch(w,p,q,r.kind==='corner'?'cross':r.kind==='throwIn'?'throw':'pass',list,{restartKick:true,setPiece:w.version>=4?r.kind:['corner','throwIn','goalKick','kickoff','indirect'].includes(r.kind)?r.kind:null});else if(w.version>=4){w.restart=r;w.ball.owner=null;}else control(w,p,list);}
   }return list;
  }
  const team=person(w,w.ball.owner)?.team??w.ball.flight?.team;if([0,1].includes(team))w.stats.possession[team]++;
  if(w.ball.owner)ownedBall(w,list);else flyingBall(w,list);return list;
 }
 function frame(w){
  const own=[],opponent=[];for(const p of w.players)if(p.active)(p.team===0?own:opponent).push({id:p.id,identity:p.identity,name:p.name,no:p.no,pos:p.pos,...point(w,p.x,p.y),energy:p.energy});const b=point(w,w.ball.x,w.ball.y),c=w.cue,owner=person(w,w.ball.owner),receiverId=w.ball.flight?.receiver||null;
  const labels={kickoff:'킥오프',restart:'재개 준비',control:'퍼스트 터치',carry:'공을 몰고 전진',pass:'패스가 이동합니다',cross:'측면 크로스',shot:'슈팅!',tackle:'태클 · 공 경합',save:'골키퍼 선방',parry:'골키퍼가 쳐냅니다 · 세컨드볼',header:'헤더 경합',block:'수비 차단 · 세컨드볼',goal:'골!',woodwork:'골대! 세컨드볼', 'keeper-clear':'골키퍼가 걷어냅니다 · 세컨드볼', 'keeper-feet':'골키퍼가 발로 처리', 'keeper-hold':'골키퍼가 공을 확보', 'wing-run':'측면 돌파'};
  const phase=w.restart?.kind==='afterGoal'?'goal':w.restart?'restart-setup':w.ball.flight?.kind==='shot'?'shot':w.ball.flight?.kind==='cross'?'cross':w.ball.flight?'through':owner?.pos==='GK'?'save':owner?'carry':w.tick-c.tick<12?c.kind:'duel';
  return {own,opponent,ball:b,ballHeight:w.ball.z/2,trail:[],carrierId:w.ball.owner,receiverId,ownerTeam:owner?.team??w.ball.flight?.team??c.team,phase,label:w.version>=4&&w.handHold&&w.tick-w.handHold.tick>=30?'골키퍼 공 확보 · '+Math.max(0,Math.ceil((80-w.tick+w.handHold.tick)/10))+'초 내 배급':labels[w.restart?.kind==='afterGoal'?'goal':w.restart?'restart':w.ball.flight?.kind==='shot'?'shot':w.ball.flight?.kind==='cross'?'cross':w.ball.flight?'pass':owner?(owner.pos==='GK'?(w.version>=4&&!w.handHold?'keeper-feet':'keeper-hold'):Math.abs(owner.x-W/2)>22?'wing-run':'carry'):c.kind]||'공을 향해 경합합니다',focusName:owner?.name||w.players.find(p=>p.id===c.id)?.name||'',performerId:c.id,performerName:w.players.find(p=>p.id===c.id)?.name||'',keeperId:['save','parry'].includes(c.kind)?c.id:null,keeperDive:w.tick-c.tick<6&&['save','parry'].includes(c.kind)?Math.sin((w.tick-c.tick)/6*Math.PI):0,runnerId:owner?.id||receiverId,tacklerId:c.kind==='tackle'&&w.tick-c.tick<8?c.id:null,tackleProgress:c.kind==='tackle'?clamp((w.tick-c.tick)/8,0,1):0,headerId:c.kind==='header'?c.id:null,headerLift:c.kind==='header'?clamp(1-(w.tick-c.tick)/8,0,1):0,continuous:true,attributed:true,tick:w.tick,tactic:w.tactics?.[0]||'balanced'};
 }
 function interpolate(a,b,alpha){if(!a||!b||b.tick!==a.tick+1)return b;const n=clamp(alpha,0,1),blend=(p,q)=>({...q,x:p.x+(q.x-p.x)*n,y:p.y+(q.y-p.y)*n}),people=(before,after)=>after.map(p=>{const old=before.find(q=>q.id===p.id);return old?blend(old,p):{...p};});return {...b,own:people(a.own,b.own),opponent:people(a.opponent,b.opponent),ball:blend(a.ball,b.ball),ballHeight:a.ballHeight+(b.ballHeight-a.ballHeight)*n};}
 const api={version:9,DT,W,H,POST,create,step,kickoff,frame,interpolate,direction,progress,offside,sweep,copy,clearanceTarget};root.ContinuousFootball=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
