'use strict';
const assert=require('node:assert/strict'),S=require('./dist/season'),F=require('./dist/engine'),R=require('./dist/rebirth'),P=require('./dist/story-pressure'),C=require('./dist/campaign-file');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;function test(name,fn){fn();groups++;console.log('PASS '+name);}
const records=scores=>scores.map((score,i)=>({year:1,round:i+1,division:5,score})),wins=records(Array.from({length:6},()=>[2,0]));
function play(s){while(s.match.phase!=='full'){if(!F.running(s.match))F.begin(s.match);F.finishSegment(s.match);}return S.settle(s);}
function weak(s){for(const p of Object.values(s.squad))for(const k of ['attack','defense','passing','speed','endurance','keeping'])p[k]=10;S.selectNextMatch(s);return s;}
function end(s){for(let i=0;i<70&&R.read(s).status==='active';i++){if(R.read(s).pending)s=R.choose(s,'steady');s=play(s);}assert.equal(R.read(s).status,'sacked');return s;}

test('new lives bind the actual owner personality to distinct three-game requests without consuming a choice',()=>{
 const goals=new Set();for(const seed of [80,81,82,83]){const s=S.create(seed,{rebirth:true}),before=copy(s),r=R.read(s),style=P.profile(s);assert.equal(r.contractStyle,style.id);assert.equal(r.contract.label,style.label);const d=R.simulate(wins,[],'none',false,r.contractStyle);assert.ok(d.pending.title.includes(style.label));assert.equal(d.pending.options.length,2);goals.add(d.pending.options[0].metric);assert.deepEqual(s,before);assert.deepEqual(S.restore(copy(s)),s);}assert.equal(goals.size,4);
});
test('all eight contracts resolve at the third confirmed league game using the advertised metric',()=>{
 const samples={results:[[[1,0],[0,0],[0,0]],[[1,0],[1,0],[0,0]]],guardian:[[[1,1],[1,1],[1,1]],[[1,0],[1,0],[1,1]]],spotlight:[[[1,0],[1,0],[1,0]],[[2,0],[2,0],[2,0]]],accounts:[[[0,0],[0,0],[0,0]],[[1,0],[0,0],[0,0]]]};
 for(const style of Object.keys(samples))for(const [i,option] of ['steady','bold'].entries()){const good=samples[style][i],bad=style==='guardian'?[[0,2],[0,2],[0,2]]:[[0,1],[0,1],[0,1]],decisions=[{after:6,kind:'deal',option}];const waiting=R.simulate([...wins,...records(good).slice(0,2)],decisions,'none',false,style);assert.equal(waiting.mission.remaining,1);assert.equal(waiting.timeline.length,0);const success=R.simulate([...wins,...records(good)],decisions,'none',false,style),failure=R.simulate([...wins,...records(bad)],decisions,'none',false,style);assert.equal(success.timeline.at(-1).kind,'fulfilled',style+option);assert.equal(failure.timeline.at(-1).kind,'missed',style+option);assert.ok(success.timeline.at(-1).target);}
});
test('an existing save keeps its original active promise, future requests and portable history',()=>{
 let s=S.create(77,{rebirth:true});delete s.rebirth.contractStyle;for(let i=0;i<6;i++)s=play(s);s=R.choose(s,'bold');s=play(s);const before=copy(s),r=R.read(s);assert.equal(r.contractStyle,'classic');assert.equal(r.mission.metric,'points');assert.equal(r.mission.target,6);assert.deepEqual(S.restore(copy(s)),s);assert.deepEqual(C.read(C.stringify({season:s})).payload.season,s);assert.deepEqual(s,before);const next=R.simulate(records(Array.from({length:24},()=>[2,0])),[6,12,18].map(after=>({after,kind:'deal',option:'steady'})),'none',false);assert.equal(next.pending.options[0].metric,'points');assert.equal(next.pending.options[0].target,4);
});
test('adopting an established club retains the classic contract and cannot charge past league results',()=>{let s=play(S.create(82));const next=R.enable(s);assert.equal(next.rebirth.contractStyle,undefined);assert.equal(R.read(next).contractStyle,'classic');assert.equal(R.read(next).played,0);assert.equal(R.read(next).confidence,60);assert.deepEqual(next.statistics,s.statistics);});
let previous,newEnd;
test('a free restart records the prior style exactly and uses the new life owner, including old histories',()=>{
 let s=S.create(54,{rebirth:true,suspensions:true});delete s.rebirth.contractStyle;previous=end(weak(s));const fresh=R.restart(previous,'together');assert.equal(fresh.rebirth.previous[0].contractStyle,undefined);assert.equal(fresh.rebirth.contractStyle,P.profile(fresh).id);assert.deepEqual(S.restore(copy(fresh)),fresh);newEnd=end(weak(fresh));const third=R.restart(newEnd,'fight');assert.equal(third.rebirth.previous.at(-1).contractStyle,newEnd.rebirth.contractStyle);assert.deepEqual(S.restore(copy(third)),third);assert.deepEqual(C.read(C.stringify({season:third})).payload.season,third);
});
test('forged owner styles and unexpected counters are rejected for both current and previous lives',()=>{
 const next=R.restart(newEnd,'calm');for(const edit of [s=>s.rebirth.contractStyle='classic',s=>s.rebirth.contractStyle='__proto__',s=>s.rebirth.contractStyle=Object.keys(R.contracts).find(k=>k!=='classic'&&k!==s.rebirth.contractStyle),s=>s.rebirth.ownerReward=100,s=>s.rebirth.previous.at(-1).contractStyle='classic']){const bad=copy(next);edit(bad);assert.throws(()=>S.restore(bad));}assert.throws(()=>R.simulate(wins,[],'none',false,'unknown'));
});
test('real first-season matches keep all four new owner contracts saveable and finish no earlier than their three-game window',()=>{
 const seen=new Set();for(let seed=80;seed<96;seed++){let s=S.create(seed,{rebirth:true,suspensions:true});while(s.round<9){if(R.read(s).pending){seen.add(R.read(s).contractStyle);s=R.choose(s,'steady');}assert.equal(R.read(s).status,'active');s=play(s);if(s.round===7||s.round===9)assert.deepEqual(S.restore(copy(s)),s);}assert.ok(R.read(s).timeline.some(t=>['fulfilled','missed'].includes(t.kind)));}assert.equal(seen.size,4);
});
console.log('Validated '+groups+' owner contract groups.');
