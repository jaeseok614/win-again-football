'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),S=require('./dist/season.js'),F=require('./dist/engine.js'),J=require('./dist/manager-journey.js');
let groups=0;function test(name,run){run();groups++;console.log('PASS '+name);}
function race(points,total=46,played=45){const s=S.create(7821),ids=[S.own,...S.leagueClubs(s).filter(c=>c.id!==S.own).slice(0,3).map(c=>c.id)],table=points.map((points,i)=>({id:ids[i],name:'Team '+i,points,played,rank:i+1}));s.round=played;return J.race(s,table,table[0],total);}
test('promotion certainty treats equal maximum points as a live threat',()=>{
 assert.equal(race([90,91,86,50]).status,'secured');assert.equal(race([90,91,87,50]).status,'open');
 assert.equal(race([70,74,74,50]).status,'out');assert.equal(race([70,74,73,50]).status,'open');
 const over=race([70,90,80,75],46,46);assert.equal(over.remaining,0);assert.equal(over.maximum,70);assert.equal(over.rank,1);
});
test('guarantees hold for every possible result of a remaining four-club round',()=>{
 const s=S.create(7821),ids=[S.own,...S.leagueClubs(s).filter(c=>c.id!==S.own).slice(0,3).map(c=>c.id)];s.round=45;
 for(const base of [[90,91,86,50],[90,91,87,50],[70,74,74,50],[70,74,73,50]]){
  const table=base.map((points,i)=>({id:ids[i],name:'T'+i,points,played:45,rank:i+1})),r=J.race(s,table,table[0],46);
  for(const pairings of [[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]])for(let a=0;a<3;a++)for(let b=0;b<3;b++){
   const points=[...base];pairings.forEach(([h,w],i)=>{const result=[a,b][i];points[h]+=result===0?3:result===1?1:0;points[w]+=result===2?3:result===1?1:0;});
   const ahead=points.filter((v,i)=>i!==0&&v>points[0]).length,tied=points.filter((v,i)=>i!==0&&v===points[0]).length;
   if(r.status==='secured')assert.ok(ahead+tied<2);if(r.status==='out')assert.ok(ahead>=2);
  }
 }
});
test('live and cup changes never alter the confirmed league race or mutate saves',()=>{
 const s=S.create(7823),before=JSON.stringify(s),r=J.read(s).race;assert.equal(JSON.stringify(s),before);assert.equal(r.maximum,138);assert.equal(r.status,'open');
 F.begin(s.match);F.tick(s.match);s.match.score=[12,0];assert.deepEqual(J.read(s).race,r);s.competition='cup';assert.deepEqual(J.read(s).race,r);
 const top=S.create(7824);top.league.division=1;top.league.clubIds=[S.own,...S.fiveTierPools[1].slice(0,19).map(c=>c.id)];const one=J.read(top);assert.equal(one.race.maximum,114);assert.equal(one.race.targetRank,6);assert.ok(one.race.contenders.length<=3);assert.match(one.milestones.find(m=>m.id==='league').hint,/38경기/);
});
test('ladder remembers experienced divisions after relegation and never marks future tiers passed',()=>{
 const s=S.create(7825);let d=J.read(s).ladder;assert.deepEqual(d.tiers.filter(t=>t.visited).map(t=>t.tier),[5]);
 s.year=4;s.history=[{year:1,rules:'five-tier',division:5,nextDivision:4},{year:2,rules:'five-tier',division:4,nextDivision:3},{year:3,rules:'five-tier',division:3,nextDivision:4}];s.league.division=4;
 d=J.read(s).ladder;assert.deepEqual(d.tiers.filter(t=>t.visited).map(t=>t.tier),[5,4,3]);assert.equal(d.tiers.find(t=>t.current).tier,4);assert.equal(d.stepsRemaining,3);
});
test('race UI escapes club names and hidden journeys do no derived work',()=>{
 const s=S.create(7826),nodes=new Map();let reads=0;const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',querySelector:()=>null});return nodes.get(id);};
 const ctx=vm.createContext({season:s,view:'match',ManagerJourney:{read(x){reads++;return J.read(x);}},$:node,escapeText:x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;'),setView(){},setMobileDashboardExpanded(){}});
 vm.runInContext(fs.readFileSync(__dirname+'/dist/manager-journey-ui.js','utf8'),ctx);ctx.renderManagerJourney();assert.equal(reads,0);ctx.view='club';ctx.renderManagerJourney();assert.equal(reads,1);assert.match(node('manager-journey').innerHTML,/승점으로 보는 시즌 경쟁/);assert.match(node('manager-journey').innerHTML,/1부까지 4계단/);assert.equal((node('manager-journey').innerHTML.match(/<em>경험<\/em>/g)||[]).length,0);
 const r=J.read(s).race;r.contenders[0].name='<img src=x>';assert.ok(ctx.journeyRaceMarkup(r,5).includes('&lt;img'));r.remaining=0;r.rank=7;r.bestRank=3;r.status='missed';assert.match(ctx.journeyRaceMarkup(r,1),/최종 순위는 7위/);
});
console.log('Validated '+groups+' journey race groups.');
