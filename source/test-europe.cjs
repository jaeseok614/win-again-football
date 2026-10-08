'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),U=require('./dist/europe.js'),S=require('./dist/season.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function finish(m){while(m.phase!=='full'){if(!F.running(m))F.begin(m);F.finishSegment(m);}return m;}
function play(s){finish(s.match);return S.settle(s);}
function complete(s){while(s.match)s=play(s);return s;}
let qualifiedTemplate=null;
function qualified(){return require('./current-test-helper.cjs').qualify();}
// Isolated tournament fixtures use actual owned-player profiles and the same F engine;
// complete-campaign qualification is separately produced by qualified(), without forged results.
function tournament(seed=2,{strong=true}={}){
 const s={seed,year:3,round:0,league:{division:1},history:[{year:1,division:2,rank:1},{year:2,division:1,rank:2}],squad:Object.fromEntries(F.roster.map(p=>[p.id,{...p,xp:0,injury:null}]))};
 if(strong)for(const p of Object.values(s.squad)){for(const key of ['attack','defense','passing','speed','endurance','keeping'])p[key]=99;p.potential=99;}
 U.initialize(s);return s;
}
function matchFor(s,formation='442',tactic='balanced'){
 const fixture=U.fixtureFor(s);assert.ok(fixture);const opponent=U.club(fixture.home===U.own?fixture.away:fixture.home),m=F.create(U.seedFor(s,fixture),{players:s.squad,opponent:{attack:opponent.attack,defense:opponent.defense,middle:opponent.middle,speed:opponent.speed,energy:94},isHome:fixture.home===U.own});F.setFormation(m,formation);F.setTactic(m,tactic);return m;
}
function nextStage(s){s.round=U.gateFor(s);if(U.fixtureFor(s))U.settle(s,finish(matchFor(s)));else U.advanceAI(s);U.validate(s);return s;}
function endTournament(s){while(!U.ready(s))nextStage(s);return s;}
function receipt(s,r){return {id:'europe-'+s.year+'-'+r.stage,type:'europe',year:s.year,round:r.week,stage:r.stage,index:r.index,home:r.home,away:r.away,goals:[...r.goals],penalties:copy(r.penalties),kicks:copy(r.kicks),winner:r.winner};}
function rejectAtomic(s,fn){const before=JSON.stringify(s);assert.throws(()=>fn(s));assert.equal(JSON.stringify(s),before);}

function run(){
test('qualification requires a completed previous first-division top-two season',()=>{
 const fresh=S.create(6601);assert.equal(U.qualification(fresh),null);assert.equal(fresh.europe.enabled,false);assert.equal(U.ready(fresh),true);const s=tournament();assert.deepEqual(U.qualification(s),{year:2,division:1,rank:2});for(const previous of [{year:2,division:2,rank:1},{year:2,division:1,rank:3},{year:1,division:1,rank:1}]){const x=copy(s);x.history=[previous];U.initialize(x);assert.equal(x.europe.enabled,false);}assert.ok(qualified().europe.enabled);
});
test('eight entrants form deterministic groups without changing domestic club pools',()=>{
  const s=tournament(6602),before=JSON.stringify(s),a=U.fixturesFor(s,0),again=tournament(6602);assert.deepEqual(s.europe.groups,again.europe.groups);assert.equal(s.europe.groups.length,2);assert.ok(s.europe.groups.every(g=>g.length===4));assert.equal(new Set(s.europe.groups.flat()).size,8);assert.equal(U.clubs.length,7);assert.equal(S.clubs.length,116);assert.ok(U.clubs.every(c=>!S.clubs.some(d=>d.id===c.id)));assert.ok(U.clubs.every(c=>U.rawClub(c.id)===c));assert.equal(a.length,4);assert.equal(JSON.stringify(s),before);U.validate(s);
});
test('each group plays every opponent once at home and once away across six matchdays',()=>{
 const s=tournament(6603),pairs=new Map(),home=Object.fromEntries(s.europe.groups.flat().map(id=>[id,0]));for(let stage=0;stage<6;stage++){const fixtures=U.fixturesFor(s,stage);assert.equal(fixtures.length,4);assert.equal(new Set(fixtures.flatMap(f=>[f.home,f.away])).size,8);for(const f of fixtures){assert.notEqual(f.home,f.away);assert.ok(s.europe.groups.some(g=>g.includes(f.home)&&g.includes(f.away)));const key=f.home+'|'+f.away;pairs.set(key,(pairs.get(key)||0)+1);home[f.home]++;}}
 assert.equal(pairs.size,24);assert.ok([...pairs.values()].every(n=>n===1));assert.ok(Object.values(home).every(n=>n===3));assert.deepEqual(U.fixturesFor(s,6),[]);assert.deepEqual(U.fixturesFor(s,7),[]);assert.deepEqual(U.gates,[2,4,6,8,10,12,13,14]);
});
test('real group draws remain draws with one point and no shootout or winner',()=>{
 const s=tournament(2,{strong:false});s.round=2;const m=finish(matchFor(s));assert.deepEqual(m.score,[0,0]);const before=JSON.stringify(s),p=U.preview(s,m);assert.equal(p.winner,null);assert.equal(p.penalties,null);assert.deepEqual(p.kicks,[[],[]]);assert.equal(JSON.stringify(s),before);U.settle(s,m);const index=s.europe.groups.findIndex(g=>g.includes(U.own)),row=U.standings(s,index).find(c=>c.id===U.own);assert.equal(row.points,1);assert.equal(row.played,1);assert.equal(row.drawn,1);assert.equal(row.gf,0);assert.equal(row.ga,0);U.validate(s);
});
test('actual F matches support all formations, substitutions, ninety minutes and deterministic seeds',()=>{
 for(const formation of ['442','433','352']){const s=tournament(6604);s.round=2;const fixture=U.fixtureFor(s),m=matchFor(s,formation,'counter');assert.equal(m.seed,U.seedFor(s,fixture));assert.equal(m.rng,U.rngFor(s,fixture,0));F.begin(m);F.finishSegment(m);assert.equal(m.minute,45);assert.equal(m.rng,U.rngFor(s,fixture,45));const out=m.lineup.find(id=>m.players[id].pos==='FW'),incoming=Object.keys(m.players).find(id=>m.players[id].pos==='FW'&&!m.lineup.includes(id));F.swap(m,out,incoming);finish(m);assert.equal(m.players[out].minutes,45);assert.equal(m.players[incoming].minutes,45);assert.equal(Object.values(m.players).reduce((sum,p)=>sum+p.minutes,0),990);assert.equal(m.rng,U.rngFor(s,fixture,90));assert.doesNotThrow(()=>F.restore(copy(m)));U.settle(s,m);assert.equal(s.europe.stage,1);assert.equal(s.europe.results.length,4);U.validate(s);}
});
test('group standings derive points and tie breaks from confirmed scores without mutations',()=>{
 const s=tournament(6605),before=JSON.stringify(s),unplayed=U.standings(s,'A');assert.equal(JSON.stringify(s),before);assert.ok(unplayed.every(c=>c.points===0&&c.played===0));assert.deepEqual(unplayed.map(c=>c.en),[...unplayed.map(c=>c.en)].sort((a,b)=>a.localeCompare(b,'en')));for(let stage=0;stage<6;stage++)nextStage(s);for(const group of [0,1]){const rows=U.standings(s,group);assert.equal(rows.length,4);assert.ok(rows.every(r=>r.played===6&&r.gf-r.ga===r.gd&&r.won*3+r.drawn===r.points));assert.equal(rows.reduce((sum,c)=>sum+c.gf,0),rows.reduce((sum,c)=>sum+c.ga,0));assert.deepEqual(rows.map(c=>c.rank),[1,2,3,4]);}assert.throws(()=>U.standings(s,2));
});
test('semifinals cross each group winner with the opposite runner-up and final uses their winners',()=>{
 const s=tournament(2);for(let stage=0;stage<6;stage++)nextStage(s);const a=U.standings(s,0),b=U.standings(s,1),semis=U.fixturesFor(s,6);assert.deepEqual(semis.map(f=>[f.home,f.away]),[[a[0].id,b[1].id],[b[0].id,a[1].id]]);assert.ok(semis.some(f=>f.home===U.own||f.away===U.own));nextStage(s);const finals=U.fixturesFor(s,7);assert.equal(finals.length,1);assert.deepEqual([finals[0].home,finals[0].away],s.europe.results.filter(r=>r.stage===6).map(r=>r.winner));nextStage(s);assert.equal(s.europe.stage,8);assert.equal(s.europe.results.length,27);assert.equal(s.europe.champion,s.europe.results.at(-1).winner);assert.ok(U.ready(s));
});
test('real tied knockout games use decisive repeatable shootouts without regulation goals',()=>{
 const s=tournament(2);for(let stage=0;stage<6;stage++)nextStage(s);s.round=13;const m=matchFor(s);for(const stop of [0,45,65,90]){const saved=copy(m);while(saved.minute<stop){if(!F.running(saved))F.begin(saved);F.finishSegment(saved);}const restored=F.restore(copy(saved));finish(saved);finish(restored);assert.deepEqual(saved.score,[0,0]);const p=U.preview(s,saved),again=U.preview(s,restored);assert.deepEqual(p,again);assert.ok(p.penalties);assert.notEqual(p.penalties[0],p.penalties[1]);assert.deepEqual(p.goals,[0,0]);assert.equal(F.goalAttributions(saved).length,0);assert.ok(p.kicks.every(team=>team.every(k=>typeof k==='boolean')));for(let team=0;team<2;team++)assert.equal(p.kicks[team].filter(Boolean).length,p.penalties[team]);}
 const p=U.preview(s,finish(m));assert.equal(p.winner,p.penalties[0]>p.penalties[1]?p.home:p.away);U.settle(s,m);U.validate(s);
});
test('eliminated clubs stop own matches while small deterministic AI stages finish the trophy',()=>{
 const s=tournament(12,{strong:false});for(let stage=0;stage<6;stage++)nextStage(s);const index=s.europe.groups.findIndex(g=>g.includes(U.own));assert.equal(U.standings(s,index).find(c=>c.id===U.own).rank,4);for(const [stage,round,max] of [[6,13,2],[7,14,1]]){s.round=round;assert.equal(s.europe.stage,stage);assert.equal(U.fixtureFor(s),null);const count=s.europe.results.length;U.advanceAI(s);assert.equal(s.europe.results.length-count,max);U.validate(s);}assert.equal(s.europe.stage,8);assert.notEqual(s.europe.champion,U.own);assert.ok(U.ready(s));
});
test('not-due, partial, duplicate and wrong-seed tournament operations reject atomically',()=>{
 const s=tournament(6606);rejectAtomic(s,x=>U.advanceAI(x));rejectAtomic(s,x=>U.settle(x,F.create()));s.round=2;rejectAtomic(s,x=>U.advanceAI(x));const m=matchFor(s);rejectAtomic(s,x=>U.settle(x,m));finish(m);const bad=copy(m);bad.rng++;rejectAtomic(s,x=>U.settle(x,bad));const wrong=copy(m);wrong.seed++;rejectAtomic(s,x=>U.settle(x,wrong));U.settle(s,m);rejectAtomic(s,x=>U.settle(x,m));assert.equal(s.europe.results.length,4);U.validate(s);
});
test('malformed groups, stage, deterministic NPC results and knockout data are rejected',()=>{
 const completeState=endTournament(tournament(2)),changes=[x=>x.europe.groups[0][0]=x.europe.groups[0][1],x=>x.europe.stage=9,x=>x.europe.champion=null,x=>x.europe.enabled=false,x=>x.europe.legacy=true,x=>x.europe.qualification.rank=3,x=>x.europe.extra=true,x=>x.europe.results[0].week++,x=>x.europe.results[0].index=99,x=>x.europe.results[0].goals=[-1,0],x=>x.europe.results[0].home='unknown',x=>x.europe.results[0].winner='unknown',x=>x.europe.results.push(copy(x.europe.results[0]))];
 for(const mutate of changes){const raw=copy(completeState);mutate(raw);assert.throws(()=>U.validate(raw));}const npc=completeState.europe.results.find(r=>r.home!==U.own&&r.away!==U.own),changed=copy(completeState);changed.europe.results.find(r=>r.stage===npc.stage&&r.index===npc.index).goals[0]++;assert.throws(()=>U.validate(changed));const tied=completeState.europe.results.find(r=>r.stage>=6&&r.penalties),bad=copy(completeState);bad.europe.results.find(r=>r.stage===tied.stage&&r.index===tied.index).kicks[0].push(true);assert.throws(()=>U.validate(bad));
});
test('canonical receipts retain actual scores, stage, venue and knockout decisions',()=>{
 const s=endTournament(tournament(2)),own=s.europe.results.filter(r=>r.home===U.own||r.away===U.own);s.finance={ledger:own.map(r=>receipt(s,r))};assert.equal(own.length,8);for(const e of s.finance.ledger)assert.ok(U.validateReceipt(s,e));U.validateHistory(s);const corrupt=copy(s);corrupt.finance.ledger[0].goals[0]++;assert.throws(()=>U.validateHistory(corrupt));const missing=copy(s);missing.finance.ledger.pop();assert.throws(()=>U.validateHistory(missing));const omitted=copy(s);delete omitted.europe;assert.throws(()=>U.restore(omitted,undefined));
});


test('browser engine exposes the same deterministic tournament without CommonJS or heavy startup',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/europe.js'),'utf8'),context);const s=tournament(6607),browser=copy(s);context.Europe.initialize(browser);assert.deepEqual(copy(context.Europe.fixturesFor(browser,0)),U.fixturesFor(s,0));assert.equal(context.Europe.seedFor(browser,context.Europe.fixturesFor(browser,0)[0]),U.seedFor(s,U.fixturesFor(s,0)[0]));assert.equal(context.Europe.clubs.length,7);assert.equal(browser.europe.results.length,0);assert.equal(browser.europe.stage,0);context.Europe.validate(browser);
});
console.log('Validated '+groups+' European tournament groups, including real F matches, regulation draws, shootouts, qualification and replayable histories.');
}
if(require.main===module)run();module.exports={qualified,finish,play,complete,tournament,matchFor,nextStage,endTournament};
