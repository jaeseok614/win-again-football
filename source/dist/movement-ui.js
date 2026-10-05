var movementElapsed=0,movementStamp=0,movementSeed=null,movementEvent=null,movementEventAge=Infinity,movementDemo=false,movementDemoElapsed=0,lastMotionFrame=null;
var movementNodeHost=null,movementFirstNode=null,movementPlayerNodes=new Map(),movementOpponentFormation='442',movementOpponentRoster=[],movementEventElapsed=0,movementCommentaryKey='',movementCommentaryText='',movementEventOrigin=null;
function cancelMovementPreview(){const wasPreview=movementDemo;movementDemo=false;movementDemoElapsed=0;if(wasPreview){lastEvent=null;movementEvent=null;movementEventAge=Infinity;}movementStamp=performance.now();renderMovementControls();}
function renderMovementControls(){const host=$('movement-controls');if(!host||!state)return;const preview=state.phase==='prep',html='<div class="movement-controls"><span><b>2D 경기 중계</b><small id="movement-label">'+(movementDemo?'미리보기 · 경기 기록은 바뀌지 않아요.':'전술과 주요 장면을 보여주는 경기 중계')+'</small></span><button id="movement-preview" class="secondary" '+(!preview||!motionEnabled()?'disabled':'')+'>'+(movementDemo?'미리보기 끝내기':'움직임 미리보기')+'</button></div>';if(host.dataset.markup!==html){host.innerHTML=html;host.dataset.markup=html;$('movement-preview').onclick=()=>{if(state.phase!=='prep'||!motionEnabled())return;if(movementDemo)cancelMovementPreview();else{movementDemo=true;movementDemoElapsed=0;movementElapsed=0;movementStamp=performance.now();renderMovementControls();}if(innerWidth<730)$('pitch').scrollIntoView({behavior:'instant',block:'center'});};}}
function motionFrame(now=performance.now()){
 if(!state)return null;if(movementSeed!==state.seed){movementSeed=state.seed;movementEventOrigin=null;lastMotionFrame=null;movementElapsed=0;movementStamp=now;movementEvent=null;movementEventAge=Infinity;movementDemo=false;movementDemoElapsed=0;movementOpponentRoster=[];movementCommentaryKey='';movementOpponentFormation=typeof Opposition!=='undefined'?Opposition.plan(S.opponentFor(season)).formation:'442';}
 if(typeof Opposition!=='undefined'&&!movementOpponentRoster.length)movementOpponentRoster=Opposition.roster(S.opponentFor(season));
 const rawDelta=Math.max(0,now-movementStamp),visualDelta=Math.min(80,rawDelta);movementStamp=now;
 const eventChanged=movementEvent!==lastEvent;if(eventChanged){movementEventOrigin=lastMotionFrame;movementEvent=lastEvent;movementEventElapsed=movementElapsed;movementEventAge=lastEvent?(typeof lastEventFast!=='undefined'&&lastEventFast?1450:0):Infinity;}
 const visible=view==='match'&&!document.hidden,enabled=motionEnabled();if(movementDemo&&(!enabled||state.phase!=='prep'))cancelMovementPreview();
 const playing=visible&&enabled&&!state.paused&&(F.running(state)||movementEventAge<2200),demo=visible&&enabled&&movementDemo;
 if(playing||demo){movementElapsed+=visualDelta;if(Number.isFinite(movementEventAge)&&!eventChanged)movementEventAge+=rawDelta;if(demo){movementDemoElapsed+=rawDelta;if(movementDemoElapsed>=12000)cancelMovementPreview();}}
 const match=movementDemo?{...state,phase:'first',paused:false}:state;
 lastMotionFrame=Movement.frame({match,eventOrigin:movementEventOrigin,opponentRoster:movementOpponentRoster,eventElapsedMs:movementEventElapsed,opponentFormation:movementOpponentFormation,dismissedOpponent:typeof Discipline!=='undefined'?Discipline.dismissed(state,1):[],positions:positions().filter(row=>typeof Discipline==='undefined'||!Discipline.dismissed(state).includes(row.id)),elapsedMs:movementElapsed,event:movementDemo?null:movementEvent,eventAgeMs:movementEventAge,motion:enabled});
 const playLabel=movementEventAge>=700&&movementEventAge<1900&&lastMotionFrame.performerName?lastMotionFrame.performerName+' · '+lastMotionFrame.label:lastMotionFrame.label;
 const text=movementDemo?'미리보기 · '+playLabel:state.paused?'일시 정지 · '+playLabel:playLabel;
 if(typeof pendingMatchMoment!=='undefined'&&pendingMatchMoment?.event===movementEvent&&movementEventAge>=1450){const moment=pendingMatchMoment.moment;pendingMatchMoment=null;presentMoment(moment);}
 for(const id of ['movement-label','live-play-label']){const label=$(id);if(label&&label.textContent!==text)label.textContent=text;}
 const commentary=$('commentary');
 if(commentary&&visible&&enabled&&!movementDemo&&F.running(state)&&!state.paused){
  const key=movementEventAge<2200?'event:'+lastEventAt+':'+lastMotionFrame.phase:'pass:'+Math.floor(movementElapsed/2800);
  if(key!==movementCommentaryKey){movementCommentaryKey=key;movementCommentaryText=movementEventAge<700?Movement.liveCommentary(lastMotionFrame):movementEventAge<1450&&lastMotionFrame.phase==='shot'?(lastMotionFrame.performerName||'공격수')+'의 슈팅! 공이 골문을 향해 날아갑니다.':movementEventAge<2200?Movement.commentary(movementEvent,state,movementOpponentRoster):Movement.liveCommentary(lastMotionFrame);}
  if(movementCommentaryText){const paragraph=commentary.querySelector('p');if(paragraph.textContent!==movementCommentaryText)paragraph.textContent=movementCommentaryText;const minute=commentary.querySelector('.minute-label');if(minute.textContent!==state.minute+'′')minute.textContent=state.minute+'′';}
 }
 return lastMotionFrame;
}
function drawMotionActors(ctx,w,h){
 const motion=motionFrame();if(!motion)return;
 const host=$('players');
 if(movementNodeHost!==host||movementFirstNode!==host.firstElementChild){movementNodeHost=host;movementFirstNode=host.firstElementChild;movementPlayerNodes=new Map(motion.own.map(player=>[player.id,host.querySelector('[data-player="'+player.id+'"]')]));}
 for(const player of motion.own){const node=movementPlayerNodes.get(player.id);if(!node)continue;node.style.left='0px';node.style.top='0px';node.style.transform='translate('+w*player.x/100+'px,'+h*player.y/100+'px) translate(-50%,-50%)';node.style.marginLeft='';node.style.marginTop='';node.classList.toggle('ball-carrier',motion.carrierId===player.id);}
 if(state.phase==='prep'&&!movementDemo)return;
 const scale=w<360?.72:1;
 for(const p of motion.opponent){const x=w*p.x/100,y=h*p.y/100,stride=state.paused||!F.running(state)&&!movementDemo?0:Math.sin(movementElapsed/100+p.no)*2;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.shadowColor='#031811';ctx.shadowBlur=4;ctx.shadowOffsetY=3;ctx.strokeStyle='#13212b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-3,9);ctx.lineTo(-4+stride,15);ctx.moveTo(3,9);ctx.lineTo(4-stride,15);ctx.stroke();ctx.fillStyle='#d7dbe1';ctx.strokeStyle='#677382';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-5,-9);ctx.lineTo(-11,-4);ctx.lineTo(-7,2);ctx.lineTo(-5,0);ctx.lineTo(-5,11);ctx.lineTo(5,11);ctx.lineTo(5,0);ctx.lineTo(7,2);ctx.lineTo(11,-4);ctx.lineTo(5,-9);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle='#d5b18f';ctx.beginPath();ctx.arc(0,-11,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#18212c';ctx.font='bold 8px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(p.no),0,2);if(p.name){const label=p.name.split(' ').at(-1);ctx.font='bold 10px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#10231b';ctx.strokeText(label,0,23);ctx.fillStyle='#fff';ctx.fillText(label,0,23);}ctx.restore();}
 motion.trail.forEach((p,i)=>{ctx.fillStyle='rgba(249,255,231,'+((i+1)/Math.max(1,motion.trail.length)*.24)+')';ctx.beginPath();ctx.arc(w*p.x/100,h*p.y/100,2.5,0,Math.PI*2);ctx.fill();});
 const bx=w*motion.ball.x/100,by=h*motion.ball.y/100;ctx.save();ctx.shadowColor='#061912';ctx.shadowBlur=7;ctx.shadowOffsetY=2;ctx.fillStyle='#ffffff';ctx.strokeStyle='#25342a';ctx.lineWidth=1;ctx.beginPath();ctx.arc(bx,by,4.8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle='#273526';ctx.beginPath();ctx.arc(bx+1,by-1,1.6,0,Math.PI*2);ctx.fill();ctx.restore();
}
function movementShouldAnimate(){return (typeof appSessionStarted==='undefined'||appSessionStarted)&&!!state&&view==='match'&&!document.hidden&&motionEnabled()&&(movementDemo||!state.paused&&(F.running(state)||movementEventAge<2200));}
function movementSnapshot(){return {preview:movementDemo,elapsedMs:movementElapsed,eventAgeMs:Number.isFinite(movementEventAge)?movementEventAge:null,frame:lastMotionFrame};}
document.addEventListener('visibilitychange',()=>{movementStamp=performance.now();if(document.hidden)cancelMovementPreview();});

function movementHighlightPending(){return !!lastEvent&&(movementEvent!==lastEvent||movementEventAge<2200);}
