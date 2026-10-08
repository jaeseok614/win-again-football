(function(root){
 'use strict';
 const cache=new Map();
 function roundRobin(ids){
  const ring=[...ids],rounds=[];
  for(let round=0;round<ring.length-1;round++){
   const games=[];
   for(let i=0;i<ring.length/2;i++){const a=ring[i],b=ring[ring.length-1-i];games.push((i===0?round%2:i%2)?{home:b,away:a}:{home:a,away:b});}
   rounds.push(games);ring.splice(1,0,ring.pop());
  }
  return rounds;
 }
 function build(ids){
  if(!Array.isArray(ids)||![20,24].includes(ids.length)||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!id))throw Error('리그 일정의 구단 구성이 올바르지 않습니다.');
  const key=JSON.stringify(ids);if(cache.has(key))return cache.get(key);
  const first=roundRobin(ids),rounds=first.concat(first.map(games=>games.map(f=>({home:f.away,away:f.home}))));
  for(const games of rounds){for(const fixture of games)Object.freeze(fixture);Object.freeze(games);}Object.freeze(rounds);
  cache.set(key,rounds);return rounds;
 }
 const api={build,roundRobin};root.PyramidSchedule=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
