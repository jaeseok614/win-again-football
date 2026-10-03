(function(root){
 'use strict';

 function initialize(m){if(m.phase!=='prep'||m.minute!==0)throw Error('카드 규칙은 새 경기 준비 때만 적용할 수 있어요.');m.discipline={version:1,events:[]};return m;}
 function dismissed(m,team=0,minute=m.minute){return (m.discipline?.events||[]).filter(e=>e.team===team&&e.card==='red'&&e.minute<=minute).map(e=>e.id);}
 function count(m,team=0){const events=(m.discipline?.events||[]).filter(e=>e.team===team);return {yellow:events.filter(e=>e.card==='yellow'||e.reason==='second-yellow').length,red:events.filter(e=>e.card==='red').length};}
 function active(m,minute=m.minute){const out=new Set(dismissed(m,0,minute));return m.lineup.filter(id=>!out.has(id));}
 function rolls(seed,minute,team){let n=(seed^Math.imul(minute,2246822519)^Math.imul(team+1,3266489917)^1128354387)>>>0;return Array.from({length:3},()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;});}
 function next(m,minute,team,lineup,tactic,prior){
  const r=rolls(m.seed,minute,team),limit=team===0&&tactic==='press'?.045:.032;if(r[0]>=limit)return null;
  const reds=prior.filter(e=>e.team===team&&e.card==='red').map(e=>e.id),eligible=(team===0?lineup.filter(id=>m.players[id].pos!=='GK'):Array.from({length:10},(_,i)=>'opp'+(i+1))).filter(id=>!reds.includes(id));
  if(!eligible.length)return null;const id=eligible[Math.min(eligible.length-1,Math.floor(r[1]*eligible.length))],second=prior.some(e=>e.team===team&&e.id===id&&e.card==='yellow'),red=reds.length<4&&(second||r[2]<.04);
  // Once seven players remain, avoid an abandoned match in this first ruleset.
  if(second&&!red)return null;
  return {minute,team,id,card:red?'red':'yellow',reason:red?(second?'second-yellow':'direct-red'):'foul'};
 }
 function text(m,e){const person=e.team===0?m.players[e.id].name:m.opponentName+' '+(Number(e.id.slice(3))+1)+'번';return person+(e.reason==='second-yellow'?'의 두 번째 경고, 퇴장!':e.card==='red'?'의 퇴장!':'에게 경고.')+(e.card==='red'?' 한 명이 적은 상태로 경기를 이어갑니다.':'');}
 function tick(m){if(!m.discipline)return [];const events=[];for(const team of [0,1]){const e=next(m,m.minute,team,m.lineup,m.tactic,m.discipline.events);if(e){m.discipline.events.push(e);const log={...e,type:'card',text:text(m,e)};m.logs.push(log);events.push(log);}}return events;}
 function expected(m){const events=[];for(let minute=1;minute<=m.minute;minute++){const segment=m.segments.find(seg=>minute>seg.start&&minute<=(seg.end??m.minute));if(!segment)throw Error('카드가 발생한 경기 구간을 찾을 수 없어요.');for(const team of [0,1]){const e=next(m,minute,team,segment.lineup,segment.tactic,events);if(e)events.push(e);}}return events;}
 function validate(m){if(!m.discipline)return;const d=m.discipline;if(d.version!==1||Object.keys(d).length!==2||!Array.isArray(d.events)||JSON.stringify(d.events)!==JSON.stringify(expected(m)))throw Error('저장한 경고와 퇴장을 확인할 수 없어요.');const logs=m.logs.filter(e=>e.type==='card'),want=d.events.map(e=>({...e,type:'card',text:text(m,e)}));if(JSON.stringify(logs)!==JSON.stringify(want))throw Error('카드 중계 기록을 확인할 수 없어요.');}
 function validateRecord(record){
  if(!Object.hasOwn(record,'cards'))return;const events=record.cards;if(!Array.isArray(events)||events.length>180)throw Error('선수 카드 기록을 확인할 수 없어요.');let clock=0,teamBefore=-1;const yellow=new Set(),red=new Set(),counts=[0,0];
  for(const e of events){const key=e?.team+':'+e?.id,lineup=record.segments.find(seg=>e.minute>seg.start&&e.minute<=seg.end)?.lineup;if(!e||Object.keys(e).length!==5||!Number.isInteger(e.minute)||e.minute<1||e.minute>90||![0,1].includes(e.team)||e.minute<clock||e.minute===clock&&e.team<=teamBefore||red.has(key)||e.team===0&&(!lineup?.includes(e.id)||record.players.find(p=>p.id===e.id)?.id.startsWith('g'))||e.team===1&&!/^opp(?:[1-9]|10)$/.test(e.id)||!['yellow','red'].includes(e.card)||e.card==='yellow'&&(e.reason!=='foul'||yellow.has(key))||e.card==='red'&&(e.reason==='second-yellow'?!yellow.has(key):e.reason!=='direct-red'))throw Error('선수 카드 기록을 확인할 수 없어요.');clock=e.minute;teamBefore=e.team;if(e.card==='yellow')yellow.add(key);else{red.add(key);counts[e.team]++;if(counts[e.team]>4)throw Error('퇴장 인원을 확인할 수 없어요.');}}
 }
 const api={initialize,dismissed,count,active,tick,validate,validateRecord};root.Discipline=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
