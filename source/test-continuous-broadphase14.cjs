'use strict';
const assert=require('node:assert/strict'),P=require('./dist/continuous-contact');
let seed=14022;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},copy=x=>JSON.parse(JSON.stringify(x));
function compare(players){const a=copy(players),b=copy(players);P.bodies(a);P.bodies(b,true);assert.deepEqual(b,a);assert.ok(b.filter(p=>p.active).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));}
for(let i=0;i<2000;i++){
 const crowded=i%4===0,crossing=i%7===0,players=Array.from({length:22},(_,j)=>{const x=crowded?34+(random()-.5)*3:random()*67+.5,y=crowded?52+(random()-.5)*3:random()*104+.5;return {id:'player'+j,active:j%11!==0||i%2===0,x,y,prevX:x+(random()-.5)*(crossing?18:1.5),prevY:y+(random()-.5)*(crossing?18:1.5),vx:random()*18-9,vy:random()*18-9};});compare(players);
}
console.log('PASS cached swept bounds retain exact contacts and velocities in 2000 seeded open, crowded and crossing 22-player worlds');
for(const origin of [[.05,.05],[67.95,104.95],[34,52]])compare(Array.from({length:22},(_,i)=>({id:'stack'+i,active:i!==7,x:origin[0]+i*.01,y:origin[1],prevX:origin[0]-i*.01,prevY:origin[1],vx:i%2?7:-7,vy:0})));
console.log('PASS contact-chain corrections update cached bounds through both passes at stacked bodies and field corners');
