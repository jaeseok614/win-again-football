(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null);
 const tacticLabels={press:'몰아붙이기',balanced:'균형 유지',counter:'내려서 역습'},roleLabels={GK:'골키퍼',DEF:'수비수',MID:'미드필더',FW:'공격수'},primaryKeys={GK:'keeping',DEF:'defense',MID:'passing',FW:'attack'},primaryLabels={keeping:'선방',defense:'수비',passing:'패스',attack:'결정력'};
 const phases=['prep','first','half','second','late','third','full'];
 function person(p){
  const key=primaryKeys[p.pos];
  return {id:p.id,identity:p.identity,name:p.name,pos:p.pos,no:p.no,role:roleLabels[p.pos],primaryKey:key,primaryLabel:primaryLabels[key],primary:p[key],speed:p.speed,energy:p.energy};
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
  const candidates=selected?Object.values(m.players).filter(p=>p.pos===selected.pos&&!m.lineup.includes(p.id)&&!m.out.includes(p.id)&&!(p.injuryRemaining||p.injury?.remaining)).map(person):[];
  const allowed=m.phase==='prep'||['half','late'].includes(m.phase)||running&&m.minute>0&&m.minute<90;
  return {
   valid:true,minute:m.minute,phase:m.phase,paused:!!m.paused,status,liveMode,formation:m.formation,tactic:m.tactic,tacticLabel:tacticLabels[m.tactic],
   stats:[{key:'chances',label:'공격 기회',own:m.chances[0],opponent:m.chances[1]},{key:'shots',label:'슈팅',own:m.shots[0],opponent:m.shots[1]}],
   substitution:{used:m.subs,limit:3,remaining:Math.max(0,3-m.subs),canSubstitute:allowed&&(m.phase==='prep'||m.subs<3)},
   averageEnergy:lineup.reduce((sum,p)=>sum+p.energy,0)/lineup.length,tiredCount:lineup.filter(p=>p.energy<50).length,
   selected:selected?person(selected):null,candidates,lowestEnergy:lineup.slice().sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id,'en')).slice(0,3).map(person),
   events:m.logs.slice(-6).reverse().map(event=>({minute:event.minute,type:event.type,text:F.displayText(event.text,m.players)}))
  };
 }
 const api={read};root.Matchday=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
