(function(root){
 'use strict';
 function roundRobin(ids){
  const ring=[...ids],rounds=[];
  for(let round=0;round<ring.length-1;round++){
   const games=[];
   for(let i=0;i<ring.length/2;i++){
    const a=ring[i],b=ring[ring.length-1-i];
    games.push((round+i)%2?{home:b,away:a}:{home:a,away:b});
   }
   rounds.push(games);ring.splice(1,0,ring.pop());
  }
  return rounds;
 }
 const reverseLeg=rounds=>rounds.map(games=>games.map(f=>({home:f.away,away:f.home})));
 function randomFor(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
 function completeFactors(size,seed){
  const core=Array.from({length:8},(_,i)=>i),added=Array.from({length:size-8},(_,i)=>i+8),coreRounds=roundRobin(core).concat(reverseLeg(roundRobin(core))),addedRounds=roundRobin(added).concat(reverseLeg(roundRobin(added)));
  const prefix=Array.from({length:14},(_,round)=>[...coreRounds[round],...addedRounds[round]]),directions=Array.from({length:size},(_,i)=>Array.from({length:size},(_,j)=>i===j?0:1)),need=Array.from({length:size},(_,i)=>Array.from({length:size},(_,j)=>i===j?0:2));
  for(const games of prefix)for(const fixture of games){directions[fixture.home][fixture.away]--;need[fixture.home][fixture.away]--;need[fixture.away][fixture.home]--;}
  const random=randomFor(seed),remaining=size*2-2-14,rest=[];
  for(let round=0;round<remaining;round++){
   const chosen=[];
   function find(left){
    if(!left.length)return true;
    let first=-1,candidates=null;
    for(const team of left){const available=left.filter(other=>other!==team&&need[team][other]>0);if(candidates===null||available.length<candidates.length){first=team;candidates=available;}if(!available.length)return false;}
    for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    for(const other of candidates){need[first][other]--;need[other][first]--;chosen.push([first,other]);if(find(left.filter(team=>team!==first&&team!==other)))return true;chosen.pop();need[first][other]++;need[other][first]++;}
    return false;
   }
   if(!find(Array.from({length:size},(_,i)=>i)))return null;
   rest.push(chosen.map(([a,b])=>{let home=a,away=b;if(directions[a][b]&&directions[b][a]&&random()<.5){home=b;away=a;}else if(!directions[a][b]){home=b;away=a;}directions[home][away]--;return {home,away};}));
  }
  if(need.some(row=>row.some(value=>value!==0))||directions.some(row=>row.some(value=>value!==0)))return null;
  return [...prefix,...rest];
 }
 function build(ids,legacyIds){
  if(!Array.isArray(ids)||!Array.isArray(legacyIds)||![20,24].includes(ids.length)||legacyIds.length!==8||new Set(ids).size!==ids.length||new Set(legacyIds).size!==8||legacyIds.some((id,index)=>ids[index]!==id))throw Error('확장 리그 일정의 구단 구성이 올바르지 않습니다.');
  const key=ids.join('|')+'::'+legacyIds.join('|');if(cache.has(key))return cache.get(key);
  const index=new Map(ids.map((id,i)=>[id,i])),seed=ids.length===20?1:2;let rounds=null;
  for(let attempt=0;attempt<12&&!rounds;attempt++)rounds=completeFactors(ids.length,seed+attempt);
  if(!rounds)throw Error('확장 리그의 홈·원정 일정을 만들지 못했습니다.');
  const mapped=rounds.map(games=>games.map(f=>({home:ids[f.home],away:ids[f.away]}))),old=legacyIds.map(id=>index.get(id));
  // The first four fixtures in each of the saved 14 rounds remain byte-for-byte equivalent.
  for(let round=0;round<14;round++){
   const saved=roundRobin(old).concat(reverseLeg(roundRobin(old)))[round].map(f=>({home:ids[f.home],away:ids[f.away]}));
   const actual=mapped[round].slice(0,4);
   if(JSON.stringify(saved)!==JSON.stringify(actual))throw Error('확장 일정이 기존 14경기 순서를 보존하지 못했습니다.');
  }
  const appearances=Array.from({length:ids.length},()=>Array(ids.length).fill(0));
  for(const games of mapped){if(games.length!==ids.length/2||new Set(games.flatMap(f=>[f.home,f.away])).size!==ids.length)throw Error('리그 일정에 같은 라운드 중복 경기가 있습니다.');for(const f of games)appearances[index.get(f.home)][index.get(f.away)]++;}
  if(appearances.some((row,i)=>row.some((count,j)=>i===j?count!==0:count!==1)))throw Error('리그 일정의 홈·원정 경기가 균형을 이루지 않습니다.');
  cache.set(key,mapped);return mapped;
 }
 const cache=new Map(),api={build,roundRobin};root.PyramidSchedule=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
