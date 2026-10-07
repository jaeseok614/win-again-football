(function(root){
 'use strict';
 const T=root.PlayerTraits||(typeof require==='function'?require('./player-traits.js'):null);
 // A read-only comparison of existing abilities; no new bonuses or saved stats.
 function overall(p){const role=T.preferredPositions(p)[0],weights=T.positions[role][2];return Math.round(Object.entries(weights).reduce((n,[key,weight])=>n+(p[key]||0)*weight,0));}
 function read(s){
  const match=s.match,order={GK:0,DEF:1,MID:2,FW:3};
  const rows=Object.values(s.squad).map(p=>{const candidate=match?.players?.[p.id],live=candidate?.identity===p.identity?candidate:null,injured=!!(p.injury?.remaining||live?.injuryRemaining),suspended=!!live?.suspended;return {identity:p.identity,slot:p.id,name:p.name,no:p.no,pos:p.pos,positions:T.preferredPositions(p),overall:overall(p),energy:Math.round(live?.energy??p.energy),condition:T.condition(s,p),starting:!!live&&match.lineup.includes(p.id),status:injured?'부상':suspended?'출전 정지':'',available:!injured&&!suspended};}).sort((a,b)=>Number(b.starting)-Number(a.starting)||order[a.pos]-order[b.pos]||b.overall-a.overall||a.slot.localeCompare(b.slot));
  const average=list=>list.length?Math.round(list.reduce((n,p)=>n+p.overall,0)/list.length):0;
  return {rows,total:rows.length,available:rows.filter(p=>p.available).length,overall:average(rows),startingOverall:average(rows.filter(p=>p.starting)),composition:Object.keys(order).map(pos=>({pos,count:rows.filter(p=>p.pos===pos).length}))};
 }
 const api={read,overall};root.SquadOverview=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
