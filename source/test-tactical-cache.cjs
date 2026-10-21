'use strict';
const assert=require('node:assert/strict'),T=require('./dist/continuous-tactics.js'),copy=x=>JSON.parse(JSON.stringify(x));
const world={version:14,tick:17,ball:{x:30,y:40,z:.4,vx:7,vy:-4,vz:3},players:[]};
const original=JSON.stringify(world),one=T.forecast(world,.9),again=T.forecast(world,.9);
assert.strictEqual(again,one,'one unchanged physical state reuses its forecast');assert.equal(JSON.stringify(world),original,'derived cache never changes saved world');
console.log('PASS an unchanged physical snapshot reuses its forecast without adding saved fields');
for(const [key,value] of [['x',32],['y',42],['z',2],['vx',-5],['vy',6],['vz',-2]]){
 const w=copy(world),first=T.forecast(w,.9);w.ball[key]=value;const actual=T.forecast(w,.9),expected=T.forecast(copy(w),.9);
 assert.notStrictEqual(actual,first,'same tick '+key+' invalidates the forecast');assert.deepEqual(actual,expected,'same tick '+key+' matches a fresh world');
}
console.log('PASS every ball coordinate and velocity invalidates a same-tick forecast and matches a fresh calculation');
const w=copy(world),first=T.forecast(w,.9);w.tick++;const next=T.forecast(w,.9);assert.notStrictEqual(next,first);assert.deepEqual(next,first);
console.log('PASS a new tick refreshes the cache even when the ball has not moved');
