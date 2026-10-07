(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null);
 const tacticLabels={press:'몰아붙이기',balanced:'균형 유지',counter:'내려서 역습',lowBlock:'로우 블록'},roleLabels={GK:'골키퍼',DEF:'수비수',MID:'미드필더',FW:'공격수'},primaryKeys={GK:'keeping',DEF:'defense',MID:'passing',FW:'attack'},primaryLabels={keeping:'선방',defense:'수비',passing:'패스',attack:'결정력'};
 const phases=['prep','first','half','second','late','third','full'];
 function person(p){
  const key=primaryKeys[p.pos];
  return {id:p.id,identity:p.identity,name:p.name,pos:p.pos,no:p.no,role:roleLabels[p.pos],primaryKey:key,primaryLabel:primaryLabels[key],primary:p[key],speed:p.speed,energy:p.energy};
 }
 function momentum(m){
  const windows=Array.from({length:6},(_,index)=>({from:index*15,to:(index+1)*15,own:0,opponent:0}));
  const weight={chance:1,shot:2,goal:4};
  for(const event of m.logs){
   if(!Number.isInteger(event.minute)||event.minute<1||event.minute>90||!Object.hasOwn(weight,event.type)||![0,1].includes(event.team))continue;
   windows[Math.min(5,Math.floor((event.minute-1)/15))][event.team===0?'own':'opponent']+=weight[event.type];
  }
  const active=Math.min(5,Math.floor(Math.max(0,m.minute-1)/15)),recent=windows[active],difference=recent.own-recent.opponent;
  const leader=difference>0?'own':difference<0?'opponent':'even';
  const message=m.minute===0?'킥오프 후 실제 공격 흐름을 표시합니다.':leader==='own'?'최근 구간은 우리가 주도하고 있습니다.':leader==='opponent'?'최근 구간은 상대 흐름입니다. 전술과 체력을 점검하세요.':'최근 구간은 팽팽합니다.';
  return {windows,active,leader,message,scale:Math.max(1,...windows.flatMap(item=>[item.own,item.opponent]))};
 }
 function facts(m){
  const elapsed=(m.segments||[]).reduce((sum,segment)=>sum+Math.max(0,(segment.end??m.minute)-segment.start),0);
  const control=(m.segments||[]).reduce((sum,segment)=>{const duration=Math.max(0,(segment.end??m.minute)-segment.start),middle=segment.rating?.middle||0,opponent=segment.rating?.opponent?.middle||0;return sum+duration*(middle+opponent?middle/(middle+opponent):.5);},0);
  const own=Math.max(25,Math.min(75,Math.round(100*(elapsed?control/elapsed:.5))));
  const setPieces=[0,1].map(()=>({corner:0,freeKick:0})),cards=[0,1].map(()=>({yellow:0,red:0}));
  for(const event of m.logs||[])if([0,1].includes(event.team)&&event.setPiece&&Object.hasOwn(setPieces[event.team],event.setPiece))setPieces[event.team][event.setPiece]++;
  for(const event of m.discipline?.events||[]){if(![0,1].includes(event.team))continue;if(event.card==='yellow')cards[event.team].yellow++;if(event.card==='red'){cards[event.team].red++;if(event.reason==='second-yellow')cards[event.team].yellow++;}}
  return [{key:'possession',label:'점유율 추정',own:own+'%',opponent:(100-own)+'%'},{key:'xg',label:'기대 득점 (xG)',own:m.xg[0].toFixed(2),opponent:m.xg[1].toFixed(2)},{key:'corner',label:'코너킥',own:m.version>=8?setPieces[0].corner:'—',opponent:m.version>=8?setPieces[1].corner:'—'},{key:'freeKick',label:'프리킥 찬스',own:m.version>=8?setPieces[0].freeKick:'—',opponent:m.version>=8?setPieces[1].freeKick:'—'},{key:'yellow',label:'경고',own:m.discipline?cards[0].yellow:'—',opponent:m.discipline?cards[1].yellow:'—'},{key:'red',label:'퇴장',own:m.discipline?cards[0].red:'—',opponent:m.discipline?cards[1].red:'—'}];
 }
 function insight(m,flow,tiredCount){
  if(m.phase==='prep'||m.phase==='full'||m.minute===0)return null;
  const recent=flow.windows[flow.active];
  if(recent.opponent-recent.own>=3)return {id:'pressure',title:'상대 흐름 차단',text:'최근 구간의 실제 공격 흐름을 보고 전술을 점검하세요.',action:'analysis',actionLabel:'전술 대응 보기'};
  if(tiredCount>=3)return {id:'fatigue',title:'선발 체력이 떨어졌습니다',text:'체력 50 미만 선수가 '+tiredCount+'명입니다. 출전 가능한 후보를 확인하세요.',action:'roster',actionLabel:'교체 검토하기'};
  if(m.minute>=65&&m.score[0]<m.score[1])return {id:'chase',title:'만회가 필요한 시간입니다',text:'남은 시간과 체력을 함께 보고 전술을 결정하세요.',action:'analysis',actionLabel:'전술 분석 보기'};
  return null;
 }
 function read(season,selectedId=null){
  const m=season?.match;
  if(!m)return {valid:false,reason:'진행할 경기가 없습니다.'};
  if(!phases.includes(m.phase)||!Number.isInteger(m.minute)||m.minute<0||m.minute>90||!Array.isArray(m.lineup)||!m.lineup.length||!m.players||m.lineup.some(id=>!m.players[id])||!Array.isArray(m.out)||!Array.isArray(m.logs)||!tacticLabels[m.tactic]||!['chances','shots'].every(key=>Array.isArray(m[key])&&m[key].length===2&&m[key].every(value=>Number.isInteger(value)&&value>=0))){
   return {valid:false,reason:'경기 상태를 확인할 수 없습니다.'};
  }
  const running=F.running(m),liveMode=m.phase==='prep'?'prep':m.phase==='full'?'full':running?(m.paused?'paused':'live'):'break';
  const status=liveMode==='paused'?'작전 타임':{prep:'경기 준비',first:'전반 진행',half:'하프타임',second:'후반 진행',late:'65분 작전 타임',third:'마지막 승부',full:'경기 종료'}[m.phase];
  const active=typeof Discipline!=='undefined'?Discipline.active(m):m.lineup,lineup=active.map(id=>m.players[id]);
  const selected=m.phase!=='full'&&typeof selectedId==='string'&&active.includes(selectedId)?m.players[selectedId]:null;
  const candidates=selected?Object.values(m.players).filter(p=>p.pos===selected.pos&&!m.lineup.includes(p.id)&&!m.out.includes(p.id)&&F.isAvailable(p)).map(person):[];
  const allowed=m.phase==='prep'||['half','late'].includes(m.phase)||running&&m.minute>0&&m.minute<90;
  let suggestion=null;
  if(m.phase!=='prep'&&m.phase!=='full'&&allowed&&m.subs<3){
   const options=lineup.filter(p=>p.energy<55).map(out=>{const incoming=Object.values(m.players).filter(p=>p.pos===out.pos&&!m.lineup.includes(p.id)&&!m.out.includes(p.id)&&F.isAvailable(p)).sort((a,b)=>b.energy-a.energy||b[primaryKeys[b.pos]]-a[primaryKeys[a.pos]]||a.id.localeCompare(b.id,'en'))[0];return incoming?{out,incoming,energyGain:Math.round(incoming.energy-out.energy),primaryDelta:incoming[primaryKeys[incoming.pos]]-out[primaryKeys[out.pos]]}:null;}).filter(Boolean).filter(item=>item.energyGain>0).sort((a,b)=>b.energyGain-a.energyGain||b.primaryDelta-a.primaryDelta||a.out.id.localeCompare(b.out.id,'en'));
   const best=options[0];if(best)suggestion={out:person(best.out),incoming:person(best.incoming),energyGain:best.energyGain,primaryDelta:best.primaryDelta,reason:best.out.name+'의 체력 '+Math.round(best.out.energy)+' · '+best.incoming.name+' 투입 시 체력 +'+best.energyGain};
  }
  const averageEnergy=lineup.reduce((sum,p)=>sum+p.energy,0)/lineup.length,tiredCount=lineup.filter(p=>p.energy<50).length,flow=momentum(m);
  return {
   valid:true,minute:m.minute,phase:m.phase,paused:!!m.paused,status,liveMode,formation:m.formation,tactic:m.tactic,tacticLabel:tacticLabels[m.tactic],
   stats:[{key:'chances',label:'공격 기회',own:m.chances[0],opponent:m.chances[1]},{key:'shots',label:'슈팅',own:m.shots[0],opponent:m.shots[1]}],
   substitution:{used:m.subs,limit:3,remaining:Math.max(0,3-m.subs),canSubstitute:allowed&&(m.phase==='prep'||m.subs<3),suggestion},
   averageEnergy,tiredCount,
   selected:selected?person(selected):null,candidates,lowestEnergy:lineup.slice().sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id,'en')).slice(0,3).map(person),
   events:m.logs.slice(-6).reverse().map(event=>({minute:event.minute,type:event.type,text:F.displayText(event.text,m.players)})),momentum:flow,insight:insight(m,flow,tiredCount)
  };
 }
 const api={read,facts};root.Matchday=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
