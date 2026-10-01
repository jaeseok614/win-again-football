(function(root){
 'use strict';
 const own='brynwell',clubIds=['brynwell','aldermere','norhaven','bellwick','redmere','montevaro','selcanto','falkenruh'],stageNames=['8강','준결승','결승'],gates=[4,8,12];
 const profiles={brynwell:[70,70],aldermere:[78,84],norhaven:[84,78],bellwick:[75,68],redmere:[79,74],montevaro:[87,81],selcanto:[77,70],falkenruh:[79,75]},copy=x=>JSON.parse(JSON.stringify(x));
 const step=n=>(Math.imul(n,1664525)+1013904223)>>>0;
 function shuffled(s){let rng=(s.seed^Math.imul(s.year,2654435761)^12648430)>>>0,ids=root.Season?root.Season.leagueClubs(s).map(c=>c.id):[...clubIds];for(let i=7;i>0;i--){rng=step(rng);const j=Math.floor(rng/4294967296*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids;}
 function initialize(s,{legacy=false}={}){s.cup={version:1,originRound:legacy?s.round:0,enabled:!legacy||s.round<14,bracket:shuffled(s),stage:0,results:[],champion:null};return s;}
 function gateFor(s,stage=s.cup.stage){return Math.min(14,Math.max(gates[stage],s.cup.originRound+1));}
 function due(s){return !!s.cup?.enabled&&s.cup.stage<3&&s.round>=gateFor(s);}
 function fixturesFor(s,stage=s.cup.stage){if(stage<0||stage>2)return [];const ids=stage===0?s.cup.bracket:s.cup.results.filter(r=>r.stage===stage-1).sort((a,b)=>a.index-b.index).map(r=>r.winner);return Array.from({length:ids.length/2},(_,index)=>({stage,index,home:ids[index*2],away:ids[index*2+1]}));}
 function fixtureFor(s){return due(s)?fixturesFor(s).find(f=>f.home===own||f.away===own)||null:null;}
 function seedFor(s,f){let n=(s.seed^Math.imul(s.year,2654435761)^Math.imul(f.stage+1,2246822519)^Math.imul(f.index+1,3266489917)^1129664591)>>>0;for(const ch of f.home+f.away)n=(Math.imul(n,16777619)^ch.charCodeAt(0))>>>0;return n;}
 function fullRng(seed){let rng=seed;for(let i=0;i<720;i++)rng=step(rng);return rng;}
 function rngFor(s,f,minute=90){let rng=seedFor(s,f);for(let i=0;i<minute*8;i++)rng=step(rng);return rng;}
 function shootout(seed,rng){let random=(seed^rng^2654435769)>>>0,score=[0,0],kicks=[[],[]];for(let round=0;round<20;round++){for(let team=0;team<2;team++){random=step(random);let goal=random/4294967296<.75;if(round===19)goal=team===0;kicks[team].push(goal);score[team]+=Number(goal);}if(round>=4&&score[0]!==score[1])return {penalties:score,kicks};}throw Error('승부차기를 결정할 수 없어요.');}
 function resultFor(s,f,goals){const seed=seedFor(s,f),penalty=goals[0]===goals[1]?shootout(seed,fullRng(seed)):{penalties:null,kicks:[[],[]]},score=penalty.penalties||goals;return {...f,goals:[...goals],...penalty,winner:score[0]>score[1]?f.home:f.away,week:gateFor(s,f.stage)};}
 function aiResult(s,f){let rng=seedFor(s,f),goals=[0,0];const attributes=id=>{const c=root.Season?.club(id);return c?[c.attack,c.defense]:profiles[id];},a=attributes(f.home),b=attributes(f.away);for(let minute=0;minute<90;minute++){rng=step(rng);if(rng/4294967296<(1.35+(a[0]-b[1])*.028)/90)goals[0]++;rng=step(rng);if(rng/4294967296<(1.22+(b[0]-a[1])*.028)/90)goals[1]++;}return resultFor(s,f,goals);}
 function preview(s,match){const f=fixtureFor(s);if(!f||!match||match.phase!=='full'||match.minute!==90||match.seed!==seedFor(s,f)||match.rng!==fullRng(match.seed)||!Array.isArray(match.score)||match.score.length!==2||match.score.some(g=>!Number.isInteger(g)||g<0||g>90))throw Error('현재 컵 경기를 끝낸 뒤 결과를 확인하세요.');const goals=f.home===own?match.score:[match.score[1],match.score[0]];return resultFor(s,f,goals);}
 function completeStage(s,results){s.cup.results.push(...results);s.cup.stage++;if(s.cup.stage===3)s.cup.champion=results[0].winner;return s;}
 function settle(s,match){const result=preview(s,match),results=fixturesFor(s).map(f=>f.index===result.index?result:aiResult(s,f));return completeStage(s,results);}
 function advanceAI(s){if(!due(s)||fixtureFor(s))throw Error('감독의 컵 경기를 먼저 진행하세요.');const results=fixturesFor(s).map(f=>aiResult(s,f));return completeStage(s,results);}
 function ready(s){return !s.cup.enabled||s.cup.stage===3;}
 function historicalChampion(s,year,entries){
  if(!entries.length)return null;const past={seed:s.seed,year,round:14,league:root.Season?.leagueForYear(s,year)};initialize(past);let played=0;
  while(past.cup.stage<3){const results=fixturesFor(past).map(f=>{if(f.home!==own&&f.away!==own)return aiResult(past,f);const entry=entries.find(e=>e.stage===f.stage);if(!entry||entry.home!==f.home||entry.away!==f.away||![f.home,f.away].includes(entry.winner))throw Error('저장한 컵 우승 기록을 읽을 수 없어요.');played++;return resultFor(past,f,entry.winner===f.home?[1,0]:[0,1]);});completeStage(past,results);}
  if(played!==entries.length)throw Error('저장한 컵 우승 기록을 읽을 수 없어요.');return past.cup.champion;
 }
 function validateHistory(s){const years={};for(const entry of s.finance.ledger)if(entry.type==='cup')(years[entry.year]??=[]).push(entry);for(const h of s.history)if(h.cupChampion!==historicalChampion(s,h.year,years[h.year]||[]))throw Error('저장한 컵 우승 기록을 읽을 수 없어요.');return s;}
 function validate(s){
  const fail=()=>{throw Error('저장한 컵 대회를 읽을 수 없어요.');},c=s.cup;
  if(!c||c.version!==1||!Number.isInteger(c.originRound)||c.originRound<0||c.originRound>14||typeof c.enabled!=='boolean'||!Number.isInteger(c.stage)||c.stage<0||c.stage>3||!Array.isArray(c.bracket)||JSON.stringify(c.bracket)!==JSON.stringify(shuffled(s))||!Array.isArray(c.results)||c.results.length!==[0,4,6,7][c.stage]||c.originRound>s.round)fail();
  if(!c.enabled&&(c.originRound!==14||c.stage!==0||c.results.length||c.champion!==null)||c.enabled&&c.originRound===14)fail();
  if(due(s)&&s.round!==gateFor(s))fail();
  let offset=0;for(let stage=0;stage<c.stage;stage++)for(const fixture of fixturesFor(s,stage)){
   const r=c.results[offset++];if(!r||r.stage!==stage||r.index!==fixture.index||r.home!==fixture.home||r.away!==fixture.away||r.week!==gateFor(s,stage)||r.week>s.round||!Array.isArray(r.goals)||r.goals.length!==2||r.goals.some(g=>!Number.isInteger(g)||g<0||g>90))fail();
   const expected=fixture.home===own||fixture.away===own?resultFor(s,fixture,r.goals):aiResult(s,fixture);
   for(const key of ['penalties','kicks','winner'])if(JSON.stringify(r[key])!==JSON.stringify(expected[key]))fail();if(fixture.home!==own&&fixture.away!==own&&JSON.stringify(r.goals)!==JSON.stringify(expected.goals))fail();
  }
  if(c.champion!==(c.stage===3?c.results.at(-1).winner:null))fail();return s;
 }
 const api={initialize,due,fixtureFor,fixturesFor,seedFor,rngFor,settle,advanceAI,validate,validateHistory,preview,ready,stageNames,gates,gateFor};root.Cup=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
