(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),O=root.Opposition||(typeof require==='function'?require('./opposition.js'):null),D=root.Discipline||(typeof require==='function'?require('./discipline.js'):null),Q=root.SquadOverview||(typeof require==='function'?require('./squad-overview.js'):null);
 const stats=[['attack','결정력'],['defense','수비'],['passing','패스'],['speed','속도'],['endurance','지구력'],['keeping','선방']];
 const roles={GK:[['골문 수호자',{keeping:.7,defense:.2,endurance:.1}],['전진 골키퍼',{keeping:.45,speed:.3,passing:.25}],['후방 연결',{keeping:.4,passing:.45,defense:.15}]],DEF:[['중앙 수비',{defense:.7,endurance:.2,speed:.1}],['측면 수비',{defense:.4,speed:.35,endurance:.25}],['후방 패스',{defense:.45,passing:.4,speed:.15}]],MID:[['전개 중심',{passing:.65,attack:.2,endurance:.15}],['공수 연결',{passing:.4,defense:.3,endurance:.3}],['측면 지원',{speed:.4,passing:.35,attack:.25}]],FW:[['문전 마무리',{attack:.7,speed:.2,endurance:.1}],['뒷공간 침투',{speed:.55,attack:.35,passing:.1}],['연계 공격',{passing:.4,attack:.4,speed:.2}]]};
 const condition=energy=>energy<50?'소진':energy<65?'지침':energy<80?'보통':'좋음';
 function read(s,identity,compareIdentity=null){
  if(typeof identity!=='string'||!s?.match)return {valid:false};const report=O.read(s);if(!report.valid)return {valid:false};const person=report.lineup.find(p=>p.identity===identity);if(!person)return {valid:false};
  const active=new Set(D.active(s.match)),own=s.match.lineup.filter(id=>active.has(id)).map(id=>s.match.players[id]).filter(p=>p&&F.isAvailable(p));
  const choices=own.map(p=>({id:p.id,identity:p.identity,name:p.name,pos:p.pos,no:p.no,overall:Q.overall(p),energy:p.energy}));
  const selected=choices.find(p=>p.identity===compareIdentity)||choices.filter(p=>p.pos===person.pos).sort((a,b)=>b.overall-a.overall||a.id.localeCompare(b.id))[0]||choices[0],comparison=selected?s.match.players[selected.id]:null;
  const cardId='opp'+(person.no-1),cards=(s.match.discipline?.events||[]).filter(e=>e.team===1&&e.id===cardId),yellow=cards.filter(e=>e.card==='yellow').length+(cards.some(e=>e.reason==='second-yellow')?1:0),red=cards.find(e=>e.card==='red');
  const rows=stats.map(([key,label])=>({key,label,value:person[key],primary:key===F.roleKey(person),ours:comparison?comparison[key]:null,delta:comparison?comparison[key]-person[key]:null}));
  const archetypes=roles[person.pos].map(([label,weights])=>({label,score:Math.round(Object.entries(weights).reduce((n,[key,weight])=>n+person[key]*weight,0)),basis:Object.keys(weights).map(key=>stats.find(row=>row[0]===key)[1]).join(' · ')})).sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label));
  const strengths=rows.filter(r=>r.key!=='keeping'||person.pos==='GK').sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key)).slice(0,2);
  return {valid:true,identity,club:report.club,person:{...person,condition:condition(person.energy)},minute:s.match.minute,phase:s.match.phase,featured:report.keyPlayer.identity===identity,cards:{yellow,red:red?{minute:red.minute,reason:red.reason}:null},rows,roles:archetypes,strengths,comparison:selected||null,choices,note:'게임에 등록된 기본 능력과 현재 체력입니다. 역할 지표는 능력을 가중한 코치 비교이며 실제 선수 평점이나 별도 경기 보너스가 아닙니다.'};
 }
 const api={read,stats,roles};root.OpponentDetails=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
