'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Growth=require('./dist/club-growth.js'),S=require('./dist/season.js');let groups=0;const test=(name,fn)=>{fn();groups++;console.log('PASS '+name);};
test('five divisions select five different stadium cells without changing a valid campaign',()=>{
 const s=S.create(823),before=JSON.stringify(s),coordinates=new Set();for(let d=5;d>=1;d--){const html=Growth.html(d);assert.match(html,new RegExp('data-club-growth="'+d+'"'));assert.match(html,/구단 규모 일러스트/);assert.ok(!html.includes('base64'));coordinates.add(/style="([^"]+)"/.exec(html)[1]);const scale=Growth.scale(d);assert.equal((scale.match(/aria-current="step"/g)||[]).length,1);assert.match(scale,new RegExp('aria-current="step">'+d+'부'));}assert.equal(coordinates.size,5);assert.equal(JSON.stringify(s),before);
});
test('invalid divisions safely show the starting ground, never a top division or fabricated capacity',()=>{
 for(const d of [null,undefined,0,6,NaN,1.5,'1','<img src=x>']){assert.equal(Growth.html(d),Growth.html(5));assert.equal(Growth.scale(d),Growth.scale(5));}assert.doesNotMatch(Growth.html(1),/수용|좌석|명|수입|보너스/);
});
test('promotion and relegation previews require confirmed final records; old reviews label their own history',()=>{
 for(const [division,nextDivision] of [[5,4],[2,1],[1,2],[3,4]]){const m=Object.freeze({division,nextDivision,current:true,final:true}),before=JSON.stringify(m),html=Growth.review(m);assert.match(html,/확정된 다음 리그/);assert.match(html,new RegExp('data-club-growth="'+division+'"'));assert.match(html,new RegExp('data-club-growth="'+nextDivision+'"'));assert.equal(JSON.stringify(m),before);assert.match(Growth.review({...m,current:false}),/당시 다음 리그/);assert.doesNotMatch(Growth.review({...m,final:false}),/다음 리그/);}
 for(const nextDivision of [null,0,6,'4',5])assert.doesNotMatch(Growth.review({division:5,nextDivision,current:true,final:true}),/다음 리그/);
});
test('one small shared atlas is registered once and hundreds of previews never add images or style rules',()=>{
 const styles=[],ctx={document:{createElement:()=>({}),head:{appendChild:s=>styles.push(s)}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'dist/club-growth.js'),'utf8'),ctx);for(let i=0;i<200;i++)ctx.ClubGrowth.html(1+i%5);assert.equal(styles.length,1);assert.equal(styles[0].id,'club-growth-atlas');assert.equal(styles[0].textContent,'.club-growth-picture{background-image:url("'+Growth.asset+'")}');assert.ok(fs.statSync(path.join(__dirname,'dist',Growth.asset.split('?')[0])).size<250000);assert.match(Growth.campus(),/--growth-x:100%;--growth-y:100%/);vm.runInNewContext(fs.readFileSync(path.join(__dirname,'dist/club-growth.js'),'utf8'),{});
});
console.log('Validated '+groups+' club growth illustration groups.');
