'use strict';
const assert=require('node:assert/strict'),F=require('./dist/engine'),C=require('./dist/continuous-football'),CM=require('./dist/continuous-match'),Telemetry=require('./analysis/possession-telemetry.cjs');
const player=(id,team,x,y,pos='MID')=>({id,team,x,y,pos,active:true});
const world=()=>({tick:10,half:1,restart:null,players:[player('a',0,10,70),player('b',0,30,50),player('c',1,40,40),player('d',1,50,60),player('g',0,34,100,'GK'),{...player('out',0,68,0),active:false}],ball:{owner:'a',x:10,y:70},stats:{tackles:[3,4]}});
{
 const w=world(),p=Telemetry.create();p.observe(w);w.tick=20;w.ball.owner='b';p.observe(w);w.tick=25;w.ball.owner='c';p.observe(w);w.tick=40;w.ball.owner='a';p.observe(w);w.tick=50;w.restart={kind:'throw'};p.observe(w);w.tick=55;w.restart=null;w.ball.owner='c';p.observe(w);w.tick=65;const r=p.finish(w);
 assert.deepEqual(r.teams.map(t=>t.openPlayRegains),[1,1]);assert.deepEqual(r.teams.map(t=>t.lostWithinWindow),[0,1]);assert.deepEqual(r.teams.map(t=>t.endedPossessions),[2,2]);assert.deepEqual(r.teams.map(t=>t.possessionSeconds.p50),[1.25,1.25]);assert.deepEqual(r.teams.map(t=>t.rawTackles),[3,4]);assert.deepEqual(p.finish(w),r);assert.throws(()=>p.observe(w),/finished/);console.log('PASS possession spans allied passes, counts real rapid losses and separates restarts');
}
{
 const w=world(),before=JSON.stringify(w),p=Telemetry.create(),freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);return Object.freeze(o);};freeze(w);p.observe(w);p.observe(w);const r=p.finish(w);assert.equal(JSON.stringify(w),before);assert.equal(r.teams[0].spaceSamples,1);assert.equal(r.teams[0].meanWidthMetres,20);assert.equal(r.teams[0].meanDepthMetres,20);assert.equal(r.teams[0].meanNearestSupportMetres,Math.hypot(20,-20));assert.equal(r.teams[0].meanForwardSupportWithin25m,0);assert.equal(r.teams[0].meanOutfieldGoalSide,0);console.log('PASS observation is idempotent at one tick and cannot mutate a frozen world');
}
{
 const a=world(),b=structuredClone(a);b.half=2;for(const p of b.players){p.x=68-p.x;p.y=105-p.y;}b.ball.x=68-b.ball.x;b.ball.y=105-b.ball.y;const x=Telemetry.create(),y=Telemetry.create();x.observe(a);y.observe(b);assert.deepEqual(x.finish(a),y.finish(b));assert.throws(()=>Telemetry.create({sampleTicks:0}),/Invalid/);const empty=world();empty.players=[];const z=Telemetry.create();z.observe(empty);assert.equal(z.finish(empty).teams[0].meanNearestSupportMetres,null);const back=Telemetry.create();back.observe(a);assert.throws(()=>back.observe({...a,tick:9}),/backwards/);console.log('PASS half reversal preserves spacing and missing carriers remain explicit');
}
{
 for(const version of [13,14]){const m=F.create(8123);F.enableContinuous(m,{ruleVersion:version});const cfg=CM.config(F,m,m.continuousSetup),a=C.create(structuredClone(cfg)),b=C.create(structuredClone(cfg)),probe=Telemetry.create(),input={tactics:['press','counter'],focuses:['balanced','balanced']};for(let tick=0;tick<57600;tick++){if(tick===28800){C.kickoff(a,1-a.firstKickTeam,true);probe.reset(b.tick);C.kickoff(b,1-b.firstKickTeam,true);}C.step(a,input);C.step(b,input);probe.observe(b);}probe.finish(b);assert.equal(JSON.stringify(b),JSON.stringify(a),'Whole rule'+version+' world and RNG');}console.log('PASS whole13 and14 worlds, results, events and RNG are identical with telemetry');
}
