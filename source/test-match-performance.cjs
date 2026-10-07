'use strict';
const assert=require('node:assert/strict'),F=require('./dist/engine.js'),S=require('./dist/season.js'),MP=require('./dist/match-performance.js'),R=require('./dist/match-review.js');
const copy=value=>JSON.parse(JSON.stringify(value));let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function finish(match){while(match.phase!=='full'){if(!F.running(match))F.begin(match);match.paused=false;F.tick(match);}return match;}

test('live ratings use only actual match records and never mutate the running match',()=>{
 const match=finish(F.create(9,{version:10})),before=copy(match),performance=MP.fromMatch(match);
 assert.equal(performance.valid,true);assert.equal(performance.source,'live');assert.equal(performance.detailed,true);assert.equal(performance.rows.length,11);assert.deepEqual(match,before);
 for(const row of performance.rows){assert.ok(row.rating>=3&&row.rating<=10);assert.equal(row.minutes,90);assert.equal(row.goals,match.logs.filter(event=>event.team===0&&event.scorerId===row.id).length);}
 assert.ok(performance.best.length>=1);assert.ok(performance.best.every(row=>row.rating===performance.rows[0].rating));
});

test('goals, assists, cards and clean sheets move only the relevant display ratings',()=>{
 const match=finish(F.create(9,{version:10})),baseline=MP.fromMatch(match),changed=copy(match),scorer=changed.lineup.find(id=>changed.players[id].pos==='FW'),helper=changed.lineup.find(id=>changed.players[id].pos==='MID'),defender=changed.lineup.find(id=>changed.players[id].pos==='DEF');
 changed.logs.push({minute:90,type:'goal',team:0,actorId:scorer,scorerId:scorer,assistId:helper});changed.score[0]++;changed.discipline={version:1,events:[{minute:88,team:0,id:defender,card:'yellow',reason:'foul'}]};
 const rated=MP.fromMatch(changed),baseScorer=baseline.rows.find(row=>row.id===scorer),baseHelper=baseline.rows.find(row=>row.id===helper),baseDefender=baseline.rows.find(row=>row.id===defender),goalScorer=rated.rows.find(row=>row.id===scorer),assist=rated.rows.find(row=>row.id===helper),booked=rated.rows.find(row=>row.id===defender);
 assert.ok(goalScorer.rating>baseScorer.rating);assert.ok(goalScorer.goals>baseScorer.goals);assert.ok(assist.assists>baseHelper.assists);assert.ok(booked.rating<baseDefender.rating);assert.equal(booked.yellow,1);
});

test('confirmed records retain ratings from confirmed player facts and openly omit unavailable shot detail',()=>{
 let season=S.create(9,{startingClub:true});finish(season.match);const pending=R.read(season,{source:'pending'});assert.equal(pending.performance.detailed,true);season=S.settle(season);const review=R.read(season),performance=MP.fromRecord(season.statistics.records.at(-1));
 assert.equal(review.performance.detailed,false);assert.equal(performance.detailed,false);assert.equal(performance.rows.length,11);assert.ok(performance.rows.every(row=>row.shots===0));assert.deepEqual(review.performance,performance);
});

console.log('Match performance checks passed: '+checks+' groups.');
