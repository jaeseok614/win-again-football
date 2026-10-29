'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path'),M=require('./dist/movement.js');
// Digests captured before the broad-phase optimization; these are published layout expectations.
const golden={"seed":43721,"frames":320,"cases":[{"size":[150,92],"crowded":false,"sha256":"cb258b4497e2bd09d31cae7a532ef78dc8def7da6c92df6bd7755c522c0c0193"},{"size":[150,92],"crowded":true,"sha256":"7caa10e4661ce0751967ea8deac428253ac1ae2f0775769491eb651a6d1e683d"},{"size":[300,176],"crowded":false,"sha256":"653f4a59a91b84799b63578d6b4ef186b5ab1a84ed8c0895568edef992374276"},{"size":[300,176],"crowded":true,"sha256":"d7d725328d50098081b8ad57cb59c1c337ea5a7e84ec364ad40e54e3790211d5"},{"size":[480,260],"crowded":false,"sha256":"538f29bac12154c681e5a7956b4dfa824ba0274e97350722f649553862df907a"},{"size":[480,260],"crowded":true,"sha256":"06a918c3d71d2a5a0d3c05e4b645c998cf34b7d455c968048749f46729f7f6df"},{"size":[650,360],"crowded":false,"sha256":"5405e28aab1eef6a3cba14bc6cfaaf796e5666011d575f1fff93b00006c567b0"},{"size":[650,360],"crowded":true,"sha256":"a444200c8390f3f516b7676e2840c0600e1a71807fa4860bc36b1fb7c22855ac"}]};
let rng=golden.seed;
const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
for(const {size,crowded,sha256} of golden.cases){
 let previous=[];const hash=crypto.createHash('sha256');
 for(let tick=0;tick<40;tick++){
  const own=[],opponent=[];
  for(let i=0;i<22;i++)(i<11?own:opponent).push({id:'p'+i,no:i%11+1,name:i%7===0?'김동민':(i<11?'토투넘 ':'상대 ')+(i%11),x:crowded?45+random()*10:random()*100,y:crowded?45+random()*10:random()*100});
  const value={own,opponent,carrierId:'p'+tick%22},before=JSON.stringify(value);
  previous=M.nameLabels(value,...size,n=>n.length*6,previous,crowded?{height:11,padding:4,grid:true}:{});
  assert.equal(previous.length,22);assert.equal(JSON.stringify(value),before);hash.update(JSON.stringify(previous));
 }
 assert.equal(hash.digest('hex'),sha256,'published label positions '+size+'/'+crowded);
}
console.log('PASS broad-phase name intersections preserve320 complete ordinary/crowded label layouts exactly');

let measurements=0,painted=[],fontLoaded;
const context={module:{exports:{}},require:require('node:module').createRequire(path.join(__dirname,'dist/movement.js')),document:{fonts:{addEventListener(type,fn){assert.equal(type,'loadingdone');fontLoaded=fn;}}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'dist/movement.js'),'utf8'),context);
const cached=context.module.exports,ctx={save(){},restore(){},measureText(name){measurements++;return {width:name.length*6};},strokeText(){},fillText(name){painted.push(name);}},value={own:[{id:'a',name:'우리 선수',x:25,y:50}],opponent:[{id:'b',name:'상대 선수',x:75,y:50}]};
let previous=[];
for(let i=0;i<100;i++)previous=cached.paintNames(ctx,value,480,260,previous);
assert.equal(measurements,2);assert.equal(painted.length,200);assert.equal(previous.length,2);
cached.paintNames(ctx,value,300,176);assert.equal(measurements,4,'different font width is remeasured');
ctx.letterSpacing='1px';cached.paintNames(ctx,value,300,176);assert.equal(measurements,6,'canvas text style is part of cache identity');
ctx.wordSpacing='2px';cached.paintNames(ctx,value,300,176);assert.equal(measurements,8,'word spacing invalidates duplicate full names');ctx.textRendering='optimizeLegibility';cached.paintNames(ctx,value,300,176);assert.equal(measurements,10,'text rendering changes invalidate widths');ctx.lang='ko';cached.paintNames(ctx,value,300,176);assert.equal(measurements,12,'canvas language invalidates widths');fontLoaded();cached.paintNames(ctx,value,300,176);assert.equal(measurements,14,'newly loaded fonts invalidate widths');
console.log('PASS every name is painted while repeated widths are cached and font/style changes invalidate them');
for(let i=0;i<300;i++)cached.paintNames(ctx,{own:[{id:'a',name:'이름'+i,x:50,y:50}],opponent:[]},300,176);
const before=measurements;cached.paintNames(ctx,{own:[{id:'a',name:'이름0',x:50,y:50}],opponent:[]},300,176);assert.equal(measurements,before+1,'older names are evicted from bounded cache');
console.log('PASS text measurement cache is bounded across long careers and transfer rosters');
