(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),Story=root.ClubStory||(typeof require==='function'?require('./club-story.js'):null);
 const clamp=n=>Math.max(0,Math.min(100,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),radius=28;
 function read(s,provided=[],selectedId=null){
  const m=s?.match;if(!m||!Array.isArray(m.lineup)||!m.players||!F.formations[m.formation]||!Array.isArray(m.logs)||!Number.isInteger(m.minute)||m.minute<0||!Number.isInteger(m.subs)||!Array.isArray(m.score)||m.score.length!==2)return {valid:false};
  if(!Array.isArray(provided))provided=[];
  const cards=(m.discipline?.events||[]).filter(e=>e.minute<=m.minute),dismissed=cards.filter(e=>e.team===0&&e.card==='red').map(e=>e.id),counts={DEF:0,MID:0,FW:0};
  const rows=m.lineup.filter(id=>m.players[id]).map(id=>{const p=m.players[id],base=p.pos==='GK'?[50,88]:F.formationPositions[m.formation][p.pos]?.[counts[p.pos]++]||[50,50],r=provided.find(r=>r.id===id);return {id,identity:p.identity,name:p.name,pos:p.pos,energy:p.energy,x:clamp(Number.isFinite(r?.x)?r.x:base[0]),y:clamp(Number.isFinite(r?.y)?r.y:base[1])};}).filter(p=>!dismissed.includes(p.id));
  const field=rows.filter(p=>p.pos!=='GK'),links=new Map(),support=field.map(p=>{const nearby=field.filter(q=>q.id!==p.id).map(q=>({...q,distance:distance(p,q)})).sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id)).filter(q=>q.distance<=radius);for(const q of nearby.slice(0,2)){const key=[p.id,q.id].sort().join(':');if(!links.has(key))links.set(key,{from:p.id,to:q.id,x1:p.x,y1:p.y,x2:q.x,y2:q.y,selected:p.id===selectedId||q.id===selectedId});}return {...p,count:nearby.length,forward:nearby.filter(q=>q.y<p.y-3).length,nearby:nearby.slice(0,3)};});
  const crowded=[];for(let i=0;i<field.length;i++)for(let j=i+1;j<field.length;j++)if(distance(field[i],field[j])<8)crowded.push({first:field[i].name,second:field[j].name});
  const shape={radius,width:field.length?Math.max(...field.map(p=>p.x))-Math.min(...field.map(p=>p.x)):0,depth:field.length?Math.max(...field.map(p=>p.y))-Math.min(...field.map(p=>p.y)):0,isolated:support.filter(p=>p.count===0),crowded,links:[...links.values()],selected:support.find(p=>p.id===selectedId)||null};
  const from=Math.max(0,m.minute-15),recent={from,to:m.minute,shots:[0,0],goals:[0,0],stopped:[0,0]};
  for(const e of m.logs.filter(e=>e.minute>from&&e.minute<=m.minute&&[0,1].includes(e.team))){if(['shot','goal'].includes(e.type))recent.shots[e.team]++;if(e.type==='goal')recent.goals[e.team]++;if(e.type==='chance')recent.stopped[e.team]++;}
  const tired=rows.filter(p=>p.energy<55).sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id)),remainingSubs=Math.max(0,3-m.subs),suggestions=[];
  const add=(id,title,text,action)=>suggestions.push({id,title,text,action});
  if(dismissed.length)add('red','퇴장 뒤 간격 점검','현재 필드에 '+rows.length+'명입니다. 비어 있는 배치와 수비 간격을 확인하세요.','tactics');
  if(tired.length)add('fatigue','체력과 교체 여유',tired[0].name+' 체력 '+Math.round(tired[0].energy)+' · '+(remainingSubs?'남은 교체 '+remainingSubs+'회. 후보의 포지션과 컨디션을 비교하세요.':'교체를 모두 사용했습니다. 전술의 추가 체력 소모를 비교하세요.'),remainingSubs?'roster':'analysis');
  if(m.minute&&recent.shots[1]>recent.shots[0])add('pressure','최근 상대 슈팅이 더 많습니다',from+'–'+m.minute+'분 슈팅 '+recent.shots[0]+':'+recent.shots[1]+'. 이 기록과 현재 체력을 함께 보고 지시를 비교하세요.','analysis');
  if(m.minute>=65&&m.score[0]<m.score[1])add('chase','남은 시간과 만회 준비','현재 '+m.score.join(':')+' · '+(90-m.minute)+'분 남았습니다. 압박의 체력 소모와 공격 지표를 먼저 비교하세요.','analysis');
  if(shape.isolated.length)add('space','가까운 지원 위치가 없습니다',shape.isolated.map(p=>p.name).join(', ')+' 주변 '+radius+' 좌표 단위 안에 필드 동료가 없습니다. 배치판에서 거리를 점검하세요.','tactics');
  if(crowded.length)add('crowded','선수 배치가 겹칩니다',crowded[0].first+' / '+crowded[0].second+'의 간격이 8 좌표 단위 미만입니다. 의도한 배치인지 확인하세요.','tactics');
  const promise=Number.isInteger(s.year)&&s.squad&&Array.isArray(s.results)&&Array.isArray(s.history)?Story?.read(s).promises.find(p=>p.current&&p.status==='active'):null;if(promise)add('promise','출전 약속 확인',promise.name+' · 다음 리그 '+promise.remainingGames+'경기에서 '+promise.remainingMinutes+'분 필요. 현재 진행 중인 미확정 경기는 아직 집계하지 않습니다.','roster');
  if(!suggestions.length)add('steady','다음 구간을 차분히 준비하세요','배치와 체력을 확인하고 필요하면 선수들과 대화하세요. 지시 변경이나 교체는 감독이 직접 결정합니다.','talk');
  return {valid:true,minute:m.minute,phase:m.phase,rows,shape,recent,tired,remainingSubs,suggestions:suggestions.slice(0,4),assumption:'지원 지도는 정지 배치의 좌표 거리입니다. 상대 수비·패스 성공률·실제 패스 횟수를 나타내지 않습니다. 배치 변경은 출발 위치를 바꾸며 경기 계산의 능력 보너스를 추가하지 않습니다.'};
 }
 const api={read};root.TouchlinePlan=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
