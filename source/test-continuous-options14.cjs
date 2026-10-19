'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),N=require('./dist/continuous-options'),T=require('./dist/continuous-tactics');
let seed=140014,rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<12000;i++){
 const players=Array.from({length:22},(_,j)=>({id:'p'+j,active:true,team:j<11?0:1,pos:j%11===0?'GK':'MID',x:rand()*68,y:rand()*105,vx:rand()*18-9,vy:rand()*18-9,speed:Math.floor(rand()*100),energy:rand()*100,burst:rand()*100,focus:.7+rand()*.5,attack:Math.floor(rand()*100),passing:Math.floor(rand()*100)})),w={players,version:13},p=players[1],q={x:rand()*68,y:rand()*105},before=JSON.stringify(w),shot=i%2===0;
 const reference=N.laneRisk(w,p,q,T.speed,{shot});assert.equal(JSON.stringify(w),before);w.version=14;const copy=JSON.stringify(w);assert.equal(N.laneRisk(w,p,q,T.speed,{shot}),reference,'Every retained risk has the exact published unpruned value, case '+i);assert.equal(JSON.stringify(w),copy);
}
console.log('PASS 12000 seeded shot/pass paths retain exact unpruned interception risk across pace, energy, velocity, burst and focus');
let calls=0;const measured=Object.create(Math);measured.log=n=>{calls++;return Math.log(n);};const ctx=vm.createContext({Math:measured});vm.runInContext(fs.readFileSync(require.resolve('./dist/continuous-options'),'utf8'),ctx);
const p={id:'carrier',team:0,x:34,y:20,attack:80,passing:80},players=[p,...Array.from({length:10},(_,i)=>({id:'d'+i,team:1,active:true,pos:'DEF',x:i?i%2?1:67:34,y:26,vx:0,vy:0,speed:80,energy:95,burst:100,focus:1}))],w={version:13,players},q={x:34,y:32};
const a=ctx.ContinuousOptions.laneRisk(w,p,q,T.speed),oldCalls=calls;calls=0;w.version=14;const b=ctx.ContinuousOptions.laneRisk(w,p,q,T.speed);assert.equal(a,b);assert.ok(b>0,'The actual central interceptor remains a risk');assert.equal(oldCalls,10);assert.equal(calls,1);
console.log('PASS unreachable defenders skip nine logarithmic forecasts while the genuine central interceptor is fully retained');
