var movementElapsed=0,movementStamp=0,movementSeed=null,movementEvent=null,movementEventAge=Infinity,movementDemo=false,movementDemoElapsed=0,lastMotionFrame=null;
var movementNodeHost=null,movementFirstNode=null,movementPlayerNodes=new Map(),movementLegNodes=new Map(),movementOpponentFormation='442',movementOpponentRoster=[],movementEventElapsed=0,movementCommentaryKey='',movementCommentaryText='',movementEventOrigin=null,movementShapeKey=null,movementShapeFrom=null,movementShapeAge=650;
function cancelMovementPreview(){const wasPreview=movementDemo;movementDemo=false;movementDemoElapsed=0;if(wasPreview){lastEvent=null;movementEvent=null;movementEventAge=Infinity;}movementStamp=performance.now();renderMovementControls();}
function renderMovementControls(){const host=$('movement-controls');if(!host||!state)return;const preview=state.phase==='prep',html='<div class="movement-controls"><span><b>2D 경기 중계</b><small id="movement-label">'+(movementDemo?'미리보기 · 경기 기록은 바뀌지 않아요.':'전술과 주요 장면을 보여주는 경기 중계')+'</small></span><button id="movement-preview" class="secondary" '+(!preview||!motionEnabled()?'disabled':'')+'>'+(movementDemo?'미리보기 끝내기':'움직임 미리보기')+'</button></div>';if(host.dataset.markup!==html){host.innerHTML=html;host.dataset.markup=html;$('movement-preview').onclick=()=>{if(state.phase!=='prep'||!motionEnabled())return;if(movementDemo)cancelMovementPreview();else{movementDemo=true;movementDemoElapsed=0;movementElapsed=0;movementStamp=performance.now();renderMovementControls();}if(innerWidth<730)$('pitch').scrollIntoView({behavior:'instant',block:'center'});};}}
function motionFrame(now=performance.now()){
 if(!state)return null;if(movementSeed!==state.seed){movementSeed=state.seed;movementShapeKey=null;movementShapeFrom=null;movementShapeAge=650;movementEventOrigin=null;lastMotionFrame=null;movementElapsed=0;movementStamp=now;movementEvent=null;movementEventAge=Infinity;movementDemo=false;movementDemoElapsed=0;movementOpponentRoster=[];movementCommentaryKey='';movementOpponentFormation=typeof Opposition!=='undefined'?Opposition.plan(S.opponentFor(season)).formation:'442';}
 if(typeof Opposition!=='undefined'&&!movementOpponentRoster.length)movementOpponentRoster=Opposition.roster(S.opponentFor(season));
 const rawDelta=Math.max(0,now-movementStamp),visualDelta=Math.min(80,rawDelta);movementStamp=now;
 const eventChanged=movementEvent!==lastEvent;if(eventChanged){movementEventOrigin=lastMotionFrame;movementEvent=lastEvent;movementEventElapsed=movementElapsed;movementEventAge=lastEvent?(typeof lastEventFast!=='undefined'&&lastEventFast?Movement.impactAge(lastEvent):0):Infinity;}
 const visible=view==='match'&&!document.hidden,enabled=motionEnabled();if(movementDemo&&(!enabled||state.phase!=='prep'))cancelMovementPreview();
 const playing=visible&&enabled&&!state.paused&&(F.running(state)||movementEventAge<Movement.timing.end),demo=visible&&enabled&&movementDemo;
 const speed=typeof playbackPrefs==='undefined'?'normal':playbackPrefs.speed,rate=demo?1:speed==='fast'?2:speed==='slow'?.5:1;
 if(playing||demo){movementElapsed+=visualDelta*rate;if(Number.isFinite(movementEventAge)&&!eventChanged)movementEventAge+=rawDelta*rate;if(demo){movementDemoElapsed+=rawDelta;if(movementDemoElapsed>=12000)cancelMovementPreview();}}
 const match=movementDemo?{...state,phase:'first',paused:false}:state;
 const shapeKey=state.formation+':'+state.tactic+':'+F.opponentPlan(state);if(movementShapeKey!==shapeKey){movementShapeFrom=F.running(state)?lastMotionFrame:null;movementShapeAge=movementShapeFrom?0:650;movementShapeKey=shapeKey;}else if(playing||demo)movementShapeAge=Math.min(650,movementShapeAge+visualDelta*rate);
 lastMotionFrame=Movement.frame({match,eventOrigin:movementEventOrigin,opponentRoster:movementOpponentRoster,eventElapsedMs:movementEventElapsed,opponentFormation:movementOpponentFormation,dismissedOpponent:typeof Discipline!=='undefined'?Discipline.dismissed(state,1):[],positions:positions().filter(row=>typeof Discipline==='undefined'||!Discipline.dismissed(state).includes(row.id)),elapsedMs:movementElapsed,event:movementDemo?null:movementEvent,eventAgeMs:movementEventAge,motion:enabled});
 // Tactical instructions take effect in the engine immediately; the paused pitch
 // holds its previous shape and shows players finding their new positions on resume.
 if(enabled&&movementShapeFrom&&movementShapeAge<650&&F.running(match)&&movementEventAge>=Movement.timing.end){const raw=movementShapeAge/650,t=raw*raw*(3-2*raw);for(const [people,oldPeople] of [[lastMotionFrame.own,movementShapeFrom.own],[lastMotionFrame.opponent,movementShapeFrom.opponent]])for(const player of people){const old=oldPeople.find(p=>p.id===player.id);if(old){player.x=old.x+(player.x-old.x)*t;player.y=old.y+(player.y-old.y)*t;}}lastMotionFrame.ball={x:movementShapeFrom.ball.x+(lastMotionFrame.ball.x-movementShapeFrom.ball.x)*t,y:movementShapeFrom.ball.y+(lastMotionFrame.ball.y-movementShapeFrom.ball.y)*t};lastMotionFrame.trail=[];lastMotionFrame.carrierId=null;lastMotionFrame.phase='shape-change';lastMotionFrame.label='전술 변화 · 위치 재정비';}
 const playLabel=movementEventAge>=Movement.timing.outlet&&movementEventAge<Movement.timing.hold&&lastMotionFrame.focusName?lastMotionFrame.focusName+' · '+lastMotionFrame.label:lastMotionFrame.label;
 const text=movementDemo?'미리보기 · '+playLabel:state.paused?'일시 정지 · '+playLabel:playLabel;
 if(typeof pendingMatchMoment!=='undefined'&&pendingMatchMoment?.event===movementEvent&&movementEventAge>=Movement.impactAge(movementEvent)){const moment=pendingMatchMoment.moment;pendingMatchMoment=null;presentMoment(moment);}
 for(const id of ['movement-label','live-play-label']){const label=$(id);if(label&&label.textContent!==text)label.textContent=text;}
 if(visible)syncMovementSequence(enabled?lastMotionFrame:null);
 syncMovementCommentary();
 syncMovementScore();
 return lastMotionFrame;
}
function syncMovementCommentary(){
 const commentary=$('commentary'),visible=view==='match'&&!document.hidden,enabled=motionEnabled();
 if(commentary&&visible&&enabled&&!movementDemo&&lastMotionFrame&&(F.running(state)||movementEventAge<Movement.timing.end)){
  const key=movementEventAge<Movement.timing.end?'event:'+lastEventAt+':'+lastMotionFrame.phase:'pass:'+Math.floor(movementElapsed/2800)+':'+lastMotionFrame.phase;
  if(key!==movementCommentaryKey){movementCommentaryKey=key;movementCommentaryText=movementEventAge<Movement.impactAge(movementEvent)?Movement.liveCommentary(lastMotionFrame,true):movementEventAge<Movement.timing.end?Movement.broadcast(movementEvent,state,movementOpponentRoster,lastMotionFrame):Movement.liveCommentary(lastMotionFrame,true);}
  if(movementCommentaryText){const paragraph=commentary.querySelector('p');if(paragraph.textContent!==movementCommentaryText)paragraph.textContent=movementCommentaryText;const minute=commentary.querySelector('.minute-label');if(minute.textContent!==state.minute+'′')minute.textContent=state.minute+'′';}
 }
}
function syncMovementScore(){
 if(!state||view!=='match')return;
 const pending=motionEnabled()&&movementEvent?.type==='goal'&&movementEventAge<Movement.impactAge(movementEvent)&&!(typeof lastEventFast!=='undefined'&&lastEventFast);
 for(const [index,id] of ['home-score','away-score'].entries()){const node=$(id);if(node)node.textContent=String(Math.max(0,state.score[index]-(pending&&movementEvent.team===index?1:0)));}
}
function drawMotionActors(ctx,w,h){
 const motion=motionFrame();if(!motion)return;
 const host=$('players');
 const compact=h<280&&w<600,pitch=$('pitch');if(pitch)pitch.dataset.compact=String(compact);
 if(movementNodeHost!==host||movementFirstNode!==host.firstElementChild){movementNodeHost=host;movementFirstNode=host.firstElementChild;movementPlayerNodes=new Map([...new Set([...motion.own.map(p=>p.id),...state.lineup])].map(id=>[id,host.querySelector('[data-player="'+id+'"]')]));movementLegNodes=new Map([...movementPlayerNodes].map(([id,node])=>[id,node?.querySelector?.('.player-legs')]));}
 const visibleIds=new Set(motion.own.map(p=>p.id));for(const [id,node] of movementPlayerNodes)if(node)node.style.visibility=visibleIds.has(id)?'':'hidden';
 for(const player of motion.own){const node=movementPlayerNodes.get(player.id);if(!node)continue;node.style.left='0px';node.style.top='0px';node.style.transform='translate('+w*player.x/100+'px,'+h*player.y/100+'px) translate(-50%,-16px)';if(motion.headerId===player.id&&motion.headerLift)node.style.transform+=' translateY(-'+(motion.headerLift*10)+'px)';if(motion.tacklerId===player.id&&motion.tackleProgress)node.style.transform+=' rotate('+((motion.ownerTeam===0?1:-1)*motion.tackleProgress*38)+'deg)';if(motion.celebrantIds?.includes(player.id)&&motion.celebrationLift)node.style.transform+=' translateY(-'+(motion.celebrationLift*(motion.scorerId===player.id?8:4))+'px)';node.classList.toggle('celebrating',!!motion.celebrantIds?.includes(player.id));node.style.marginLeft='';node.style.marginTop='';const strideKey=motion.phase==='static'?'static':Math.floor(movementElapsed/80)+':'+(motion.runnerId===player.id);if(node._strideKey!==strideKey){node._strideKey=strideKey;movementLegNodes.get(player.id)?.style.setProperty('--stride',motion.phase==='static'?0:Math.round(Math.sin(movementElapsed/(motion.runnerId===player.id?75:125)+player.no)*4)/2);}const tilt=((motion.keeperId===player.id?motion.keeperDive:0)||0)*48+'deg';if(node._keeperTilt!==tilt){node._keeperTilt=tilt;node.style.setProperty('--keeper-tilt',tilt);}node.classList.toggle('ball-carrier',motion.carrierId===player.id);node.classList.toggle('sprinting',motion.runnerId===player.id&&['wing-run','sprint'].includes(motion.phase));node.classList.toggle('highlight-player',[motion.receiverId,motion.scorerId,motion.keeperId,motion.tacklerId].includes(player.id));}
 const ballNode=$('match-ball'),ballShadow=$('match-ball-shadow'),ballX=w*motion.ball.x/100,ballGround=h*motion.ball.y/100,ballLift=(motion.ballHeight||0)*24;
 if(ballNode){ballNode.style.transform='translate('+(ballX-6)+'px,'+(ballGround-ballLift-6)+'px)';ballNode.dataset.airborne=String(ballLift>1);}
 if(ballShadow){ballShadow.hidden=ballLift<=1;ballShadow.style.transform='translate('+(ballX-5)+'px,'+(ballGround-2)+'px)';}
 if(state.phase==='prep'&&!movementDemo)return;
 const scale=w<360?.72:1;
 const replayActors=motion.own.filter(p=>!movementPlayerNodes.get(p.id));
 for(const p of [...motion.opponent,...replayActors]){const ownReplay=replayActors.includes(p),x=w*p.x/100,y=h*p.y/100,stride=motion.phase==='static'?0:Math.sin(movementElapsed/100+p.no)*2;ctx.save();ctx.translate(x,y-(motion.headerId===p.id?(motion.headerLift||0)*10:motion.celebrantIds?.includes(p.id)?(motion.celebrationLift||0)*6:0));if(motion.tacklerId===p.id)ctx.rotate((motion.tackleProgress||0)*.65);if(motion.keeperId===p.id)ctx.rotate((motion.keeperDive||0)*.8);ctx.scale(scale,scale);ctx.shadowColor='#031811';ctx.shadowBlur=4;ctx.shadowOffsetY=3;ctx.strokeStyle='#13212b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-3,9);ctx.lineTo(-4+stride,15);ctx.moveTo(3,9);ctx.lineTo(4-stride,15);ctx.stroke();ctx.fillStyle=ownReplay?(p.pos==='GK'?'#8ed4fb':'#cef884'):(p.pos==='GK'?'#ffc078':'#d7dbe1');ctx.strokeStyle='#677382';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-5,-9);ctx.lineTo(-11,-4);ctx.lineTo(-7,2);ctx.lineTo(-5,0);ctx.lineTo(-5,11);ctx.lineTo(5,11);ctx.lineTo(5,0);ctx.lineTo(7,2);ctx.lineTo(11,-4);ctx.lineTo(5,-9);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle=typeof Portraits==='undefined'?'#d5b18f':Portraits.skin(ownReplay?(state.players[p.id]||p):p);ctx.beginPath();ctx.arc(0,-11,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#18212c';ctx.font='bold 8px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(p.no),0,2);if(p.name&&((!compact&&state.paused)||[motion.carrierId,motion.receiverId,motion.focusId,motion.scorerId,motion.keeperId,motion.tacklerId].includes(p.id))){const label=p.name.split(' ').at(-1);ctx.font='bold 10px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#10231b';ctx.strokeText(label,0,-23);ctx.fillStyle='#fff';ctx.fillText(label,0,-23);}ctx.restore();}
 motion.trail.forEach((p,i)=>{ctx.fillStyle='rgba(249,255,231,'+((i+1)/Math.max(1,motion.trail.length)*.24)+')';ctx.beginPath();ctx.arc(w*p.x/100,h*p.y/100,2.5,0,Math.PI*2);ctx.fill();});
 // Canvas fallback is used by isolated previews/tests. In the app a foreground
 // ball stays above both DOM players and canvas jerseys, including headers.
 if(!ballNode){const bx=ballX,groundY=ballGround,lift=ballLift,by=groundY-lift;if(lift>0){ctx.save();ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(bx,groundY,4+lift/10,2,0,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.save();ctx.shadowColor='#061912';ctx.shadowBlur=7;ctx.shadowOffsetY=2;ctx.fillStyle='#fff';ctx.strokeStyle='#25342a';ctx.lineWidth=1;ctx.beginPath();ctx.arc(bx,by,4.8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
}
function movementShouldAnimate(){return (typeof appSessionStarted==='undefined'||appSessionStarted)&&!!state&&view==='match'&&!document.hidden&&motionEnabled()&&(movementDemo||!state.paused&&(F.running(state)||movementEventAge<Movement.timing.end));}
function movementSnapshot(){return {preview:movementDemo,elapsedMs:movementElapsed,eventAgeMs:Number.isFinite(movementEventAge)?movementEventAge:null,frame:lastMotionFrame};}
document.addEventListener('visibilitychange',()=>{movementStamp=performance.now();if(document.hidden)cancelMovementPreview();});

function movementHighlightPending(){return !!lastEvent&&(movementEvent!==lastEvent||movementEventAge<Movement.timing.end);}

function syncMovementSequence(frame){
 const node=$('live-sequence');if(!node)return;
 const cue=Movement.sequence(frame),key=cue?cue.team+':'+cue.stage:'idle';if(node.dataset.sequence===key)return;
 node.dataset.sequence=key;node.dataset.team=cue?String(cue.team):'';node.dataset.stage=cue?String(cue.stage):'';
 node.textContent=cue?(cue.team===0?'우리 ':'상대 ')+cue.label:'중계';
 node.setAttribute('aria-label',cue?(cue.team===0?'우리 팀':'상대 팀')+' 공격 · '+cue.label+' 단계':'경기 중계');
}
