(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null);
 const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
 const positions={
  GK:['골키퍼','GK',{keeping:.85,passing:.1,defense:.05}],
  LB:['왼쪽 풀백','DEF',{defense:.5,speed:.25,endurance:.15,passing:.1}],
  CB:['중앙 수비수','DEF',{defense:.72,speed:.12,passing:.1,endurance:.06}],
  RB:['오른쪽 풀백','DEF',{defense:.5,speed:.25,endurance:.15,passing:.1}],
  LWB:['왼쪽 윙백','DEF',{defense:.34,speed:.28,endurance:.22,passing:.16}],
  RWB:['오른쪽 윙백','DEF',{defense:.34,speed:.28,endurance:.22,passing:.16}],
  DM:['수비형 미드필더','MID',{defense:.35,passing:.4,endurance:.2,speed:.05}],
  CM:['중앙 미드필더','MID',{passing:.48,endurance:.22,defense:.15,attack:.15}],
  LM:['왼쪽 미드필더','MID',{passing:.35,speed:.3,endurance:.2,attack:.15}],
  RM:['오른쪽 미드필더','MID',{passing:.35,speed:.3,endurance:.2,attack:.15}],
  AM:['공격형 미드필더','MID',{passing:.48,attack:.32,speed:.15,endurance:.05}],
  LW:['왼쪽 윙포워드','FW',{attack:.42,speed:.36,passing:.22}],
  RW:['오른쪽 윙포워드','FW',{attack:.42,speed:.36,passing:.22}],
  ST:['중앙 공격수','FW',{attack:.7,speed:.2,passing:.1}]
 };
 // Game-specific fictional scouting profiles. Identity, rather than roster slot,
 // keeps each player's traits when a slot is replaced or a campaign is restored.
 const MarketRoster=root.MarketRoster||(typeof require==='function'?require('./market-roster.js'):null);
 const featured={...MarketRoster?.traits,
  sp_g1:{feet:[2,5],positions:['GK']},sp_g2:{feet:[2,5],positions:['GK']},
  sp_d1:{feet:[3,5],positions:['CB']},sp_d2:{feet:[5,3],positions:['CB','LB']},
  sp_d3:{feet:[3,5],positions:['RB','RWB','RM']},sp_d4:{feet:[5,3],positions:['LB','LWB']},
  sp_d5:{feet:[2,5],positions:['CB']},sp_d6:{feet:[5,3],positions:['CB','LB']},
  sp_m1:{feet:[3,5],positions:['DM','CM']},sp_m2:{feet:[4,5],positions:['AM','CM']},
  sp_m3:{feet:[5,3],positions:['AM','CM','RW','RM']},sp_m4:{feet:[4,5],positions:['DM','CM','AM']},
  sp_m5:{feet:[3,5],positions:['CM','DM']},sp_m6:{feet:[3,5],positions:['CM','AM']},
  sp_f1:{feet:[5,5],positions:['LW','ST','RW']},sp_f2:{feet:[3,5],positions:['ST']},
  sp_f3:{feet:[3,5],positions:['RW','ST','LW','RM']},sp_f4:{feet:[3,5],positions:['ST','LW']}
 };
 function hash(text){let n=2166136261;for(const ch of String(text))n=(Math.imul(n,16777619)^ch.charCodeAt(0))>>>0;return n;}
 function feet(player){
  const fixed=featured[player.identity]?.feet;
  const leftPrimary=hash(player.identity+'|primary')%2===0,weak=hash(player.identity+'|weak')%5+1;
  const left=fixed?.[0]??(leftPrimary?5:weak),right=fixed?.[1]??(leftPrimary?weak:5);
  return {left,right,label:left===right?'양발':left>right?'왼발':'오른발',stars:`왼발 ${left}/5 · 오른발 ${right}/5`};
 }
 function preferredPositions(player){
  if(featured[player.identity])return [...featured[player.identity].positions];
  const foot=feet(player),side=foot.left>foot.right?'L':'R';
  if(player.pos==='GK')return ['GK'];
  if(player.pos==='DEF')return player.speed>=76?[side+'B',side+'WB','CB']:['CB',side+'B'];
  if(player.pos==='MID')return player.speed>=81&&player.attack>=65?[side+'W',side+'M','AM']:player.defense>=65?['DM','CM']:player.attack>=70?['AM','CM']:['CM','AM'];
  return player.speed>=82?[side+'W','ST']:['ST',side+'W'];
 }
 function suitability(player,code){
  const spec=positions[code];if(!spec)return null;
  if(player.pos==='GK'&&code!=='GK'||player.pos!=='GK'&&code==='GK')return 1;
  const [,line,weights]=spec,preferred=preferredPositions(player),base=Object.entries(weights).reduce((n,[key,weight])=>n+(player[key]||0)*weight,0);
  const familiarity=preferred[0]===code?13:preferred.includes(code)?7:line===player.pos?0:-16;
  const foot=feet(player),sideBonus=code.startsWith('L')?foot.left>foot.right?3:foot.left<foot.right?-3:0:code.startsWith('R')?foot.right>foot.left?3:foot.right<foot.left?-3:0:0;
  return Math.round(clamp(base+familiarity+sideBonus,1,99));
 }
 function allPositions(player){return Object.entries(positions).map(([code,[label,line]])=>({code,label,line,score:suitability(player,code),familiar:preferredPositions(player).includes(code)}));}
 function condition(season,player){
  const match=season?.match;if(!match)return {score:null,tier:'unknown',label:'다음 경기 대기'};
  const recent=season.statistics?.records?.at(-1),row=recent?.players?.find(p=>p.identity===player.identity),contributions=Math.min(2,(row?.goals||0)+(row?.assists||0)),teamResult=recent?Math.sign(recent.score[0]-recent.score[1]):0;
  const morale=match.morale?.[player.id]||0,score=Math.round(clamp(55+hash(match.seed+'|'+player.identity+'|form')%33+contributions*3+teamResult*3+morale*4,25,99));
  const tier=score>=75?'good':score>=55?'normal':'poor';
  return {score,tier,label:tier==='good'?'좋음':tier==='normal'?'보통':'저조'};
 }
 const api={feet,preferredPositions,suitability,allPositions,condition,positions};root.PlayerTraits=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
