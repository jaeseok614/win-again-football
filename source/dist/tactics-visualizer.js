(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),M=root.Movement||(typeof require==='function'?require('./movement.js'):null),O=root.Opposition||(typeof require==='function'?require('./opposition.js'):null),D=root.Discipline||(typeof require==='function'?require('./discipline.js'):null);
 const owners={ours:'우리 공 소유',theirs:'상대 공 소유'},zones={back:{label:'후방',time:80},middle:{label:'중원',time:M.passing.segment+80},wide:{label:'측면',time:M.passing.segment*2+80}};
 function canRead(s){const m=s?.match;return !!m&&(['prep','half','late'].includes(m.phase)||F.running(m)&&m.paused===true);}
 function read(s,{tactic=s?.match?.tactic,owner='ours',zone='back',positions={}}={}){
  if(!canRead(s)||!['balanced','press','counter','lowBlock'].includes(tactic)||!Object.hasOwn(owners,owner)||!Object.hasOwn(zones,zone))return {valid:false};
  const m=s.match,opponent=O.read(s);if(!opponent.valid)return {valid:false};
  const counts={GK:0,DEF:0,MID:0,FW:0},layout=F.formationPositions[m.formation],dismissed=new Set(D.dismissed(m)),rows=m.lineup.map(id=>{const p=m.players[id],base=p.pos==='GK'?[50,88]:layout[p.pos][counts[p.pos]++],saved=positions[p.identity],point=Array.isArray(saved)&&saved.length===2&&saved.every(Number.isFinite)?saved:base;return {id,p,x:point[0],y:point[1]};}).filter(p=>!dismissed.has(p.id));
  // A fixed frame of the same display-only renderer used by live coverage.
  // This is an example of spacing, never a future event or possession statistic.
  const elapsedMs=zones[zone].time+(owner==='theirs'?M.passing.segment*4:0),frame=M.frame({match:{...m,tactic,phase:'first'},positions:rows,opponentFormation:opponent.plan.formation,opponentRoster:opponent.lineup,dismissedOpponent:opponent.lineup.filter(p=>p.dismissed).map(p=>'opp'+(p.no-1)),elapsedMs,motion:true});
  const identify=(people,team)=>people.map(p=>({...p,team,identity:team===0?m.players[p.id].identity:opponent.lineup.find(r=>r.id===p.id||r.no===p.no)?.identity}));
  const own=identify(frame.own,0),other=identify(frame.opponent,1),people=[...own,...other],carrier=people.find(p=>p.id===frame.carrierId),receiver=people.find(p=>p.id===frame.receiverId),line=pos=>own.filter(p=>p.pos===pos),mean=(rows,key)=>rows.length?Math.round(rows.reduce((sum,p)=>sum+p[key],0)/rows.length):null;
  const spread=Math.round(Math.max(...own.filter(p=>p.pos!=='GK').map(p=>p.x))-Math.min(...own.filter(p=>p.pos!=='GK').map(p=>p.x))),back=line('DEF'),front=line('FW'),depth=back.length&&front.length?Math.round(mean(back,'y')-mean(front,'y')):null;
  return {valid:true,tactic,owner,zone,label:owners[owner]+' · '+zones[zone].label,own,opponent:other,opponentClub:opponent.club,formations:{own:m.formation,opponent:opponent.plan.formation},ball:{...frame.ball},trail:frame.trail.map(p=>({...p})),carrier:carrier?{...carrier}:null,receiver:receiver?{...receiver}:null,spacing:{width:spread,depth},note:'현재 선발·상대 배치로 만든 중계 장면 예시입니다. 공 소유·전개 위치를 바꿔도 지시나 경기 기록은 바뀌지 않습니다.'};
 }
 const api={read,canRead,owners,zones};root.TacticsVisualizer=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
