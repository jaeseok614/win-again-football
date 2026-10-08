'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),vm=require('node:vm');
const F=require('./dist/engine.js'),Portraits=require('./dist/portraits.js'),StaffFaces=require('./dist/staff-portraits.js');
const playerSource=fs.readFileSync(path.join(__dirname,'dist/portraits.js'),'utf8'),staffSource=fs.readFileSync(path.join(__dirname,'dist/staff-portraits.js'),'utf8');let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function context(sources,{style=true,document=true}={}){const calls=[],styles=[],sandbox={};if(document)sandbox.document=style?{documentElement:{style:{setProperty(key,value){if(value.length>1048576)throw Error('Atlas exceeds browser custom-property limit');calls.push([key,value]);}}},createElement(type){assert.equal(type,'style');return {id:'',textContent:''};},head:{appendChild(element){styles.push(element);}}}:{};const ctx=vm.createContext(sandbox);for(const source of sources)vm.runInContext(source,ctx);return {ctx,calls,styles};}
function scripts(html){return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);}

test('portrait modules remain safe in CommonJS and browser fixtures without a DOM or CSS style API',()=>{
 assert.equal(Portraits.asset,'assets/player-faces-v16.webp?v=16');assert.equal(Portraits.expandedAsset,'assets/player-faces-v17.webp?v=17');assert.equal(Portraits.extraAsset,'assets/player-faces-v18.webp?v=18');assert.equal(StaffFaces.asset,'assets/coach-faces-v1.webp?v=1');
 for(const options of [{document:false},{style:false}]){const h=context([playerSource,staffSource],options);assert.equal(h.calls.length,0);assert.equal(h.styles.length,0);assert.equal(h.ctx.Portraits.index('g1'),0);assert.equal(h.ctx.StaffPortraits.index('이든 브룩스'),0);assert.ok(h.ctx.Portraits.html('f2').includes('data-portrait-index="15"'));}
});

test('source modules register one shared atlas each and rendering hundreds of faces never repeats registration',()=>{
 const h=context([playerSource,staffSource]);assert.deepEqual(h.calls,[['--staff-portrait-atlas',"url('"+StaffFaces.asset+"')"]]);assert.deepEqual(h.styles,[{id:'player-portrait-atlas',textContent:'.player-portrait{background-image:url("'+Portraits.asset+'")} .player-portrait[data-portrait-atlas="2"]{background-image:url("'+Portraits.expandedAsset+'")} .player-portrait[data-portrait-atlas="3"]{background-image:url("'+Portraits.extraAsset+'")}'}]);
 for(let i=0;i<500;i++){h.ctx.Portraits.html(F.roster[i%18]);h.ctx.StaffPortraits.html('노아 리드');}assert.equal(h.calls.length,1);assert.equal(h.styles.length,1);
});

test('portrait spans keep identity and tile coordinates while omitting atlas URLs and leaving game RNG untouched',()=>{
 const match=F.create(121),before=JSON.stringify(match);for(const player of [...F.roster,...F.market]){const markup=Portraits.html(player,{size:'large'}),index=Portraits.index(player);assert.ok(markup.includes('data-portrait-index="'+index+'"'));assert.ok(markup.includes('portrait-large'));assert.ok(markup.includes('--portrait-x:'));assert.ok(markup.includes('--portrait-y:'));assert.ok(!markup.includes('background-image'));assert.ok(!markup.includes(Portraits.asset));}
 for(const name of ['이든 브룩스','노아 리드','오스카 그린']){const markup=StaffFaces.html(name);assert.ok(markup.includes('--staff-face-x:'));assert.ok(!markup.includes('background-image'));assert.ok(!markup.includes(StaffFaces.asset));}assert.equal(JSON.stringify(match),before);
});

test('new Tottunham campaigns and transfer targets receive distinct, stable original faces',()=>{
 const players=[...F.startingRoster,...F.market],indices=players.map(player=>Portraits.index(player.identity));assert.equal(F.startingRoster.length,18);assert.equal(F.market.length,8);assert.equal(new Set(indices).size,players.length);
 for(const player of players){const markup=Portraits.html(player);assert.ok(markup.includes('data-portrait-index="'+Portraits.index(player.identity)+'"'));assert.ok(markup.includes('assets/player-faces-v16.webp')===false);}
});
test('generated identities use the compact expanded atlas while opposition starters receive eleven distinct faces',()=>{
 const generated=Array.from({length:200},(_,i)=>Portraits.index('academy:new-player-'+i));assert.ok(generated.every(i=>i>=28&&i<156));assert.ok(new Set(generated).size>=100);
 for(const club of ['aldermere','redmere','northhaven']){const opponent=Array.from({length:11},(_,i)=>'opposition:'+club+':'+i),indices=opponent.map(identity=>Portraits.index(identity));assert.equal(new Set(indices).size,11);for(const identity of opponent){const html=Portraits.html(identity);assert.match(html,/data-portrait-atlas="[23]"/);assert.match(html,/--portrait-size:800% 800%/);}}
 assert.ok(new Set(Array.from({length:20},(_,i)=>Portraits.index('opposition:club-'+i+':0'))).size>1);
});

test('the existing atlas sizing and masks use one shared rule without placing the large atlas in a custom property',()=>{
 const css=fs.readFileSync(path.join(__dirname,'dist/style.css'),'utf8'),staffCss=fs.readFileSync(path.join(__dirname,'dist/staff-portraits.css'),'utf8');
 assert.ok(!css.includes('--player-portrait-atlas'));assert.ok(!playerSource.includes('setProperty'));assert.ok(playerSource.includes("createElement('style')"));assert.ok(playerSource.includes('root.document.head.appendChild(stylesheet)'));assert.ok(css.includes('background-position:var(--portrait-x) var(--portrait-y)'));assert.ok(staffCss.includes('background-image:var(--staff-portrait-atlas)'));assert.ok(staffCss.includes('background-size:500% 200%'));assert.ok(!css.includes(Portraits.asset));assert.ok(!staffCss.includes(StaffFaces.asset));
});

test('small pitch heads retain the skin color of the exact original portrait identity across transfers and opposing clubs',()=>{const players=[...F.roster,...F.market,...Array.from({length:200},(_,i)=>({identity:'opposition:club-'+i+':0'}))],match=F.create(122),before=JSON.stringify(match),colors=new Set();for(const player of players){const color=Portraits.skin(player);assert.match(color,/^#[0-9a-f]{6}$/);assert.equal(color,Portraits.skin(player.identity));colors.add(color);}assert.ok(colors.size>30);assert.equal(JSON.stringify(match),before);});

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'football-portrait-performance-'));try{
 const output=path.join(temporary,'index.html');cp.execFileSync(process.execPath,[path.join(__dirname,'build.cjs'),output,'--pwa'],{encoding:'utf8'});const html=fs.readFileSync(output,'utf8'),all=scripts(html),compiledPlayers=all.find(source=>source.includes('// This atlas contains original fictional faces.')),compiledStaff=all.find(source=>source.includes('root.StaffPortraits=api')),h=context([compiledPlayers,compiledStaff]);
 test('the compiled PWA shares the corrected WebP atlas once within the mobile asset budget',()=>{
  const playerAsset=h.ctx.Portraits.asset,expandedAsset=h.ctx.Portraits.expandedAsset,extraAsset=h.ctx.Portraits.extraAsset,staffAsset=h.ctx.StaffPortraits.asset;assert.ok(playerAsset.startsWith('data:image/webp;base64,'));assert.ok(expandedAsset.startsWith('data:image/webp;base64,'));assert.ok(staffAsset.startsWith('data:image/webp;base64,'));assert.ok(extraAsset.startsWith('data:image/webp;base64,')&&extraAsset.length<300000);assert.ok(playerAsset.length>100000&&playerAsset.length<500000);assert.ok(expandedAsset.length<500000);for(const asset of [playerAsset,expandedAsset,extraAsset,staffAsset])assert.equal(html.split(asset).length-1,1);assert.equal(h.calls.length,1);assert.equal(h.styles.length,1);assert.equal(h.styles[0].id,'player-portrait-atlas');assert.equal(h.styles[0].textContent,'.player-portrait{background-image:url("'+playerAsset+'")} .player-portrait[data-portrait-atlas="2"]{background-image:url("'+expandedAsset+'")} .player-portrait[data-portrait-atlas="3"]{background-image:url("'+extraAsset+'")}');assert.equal(h.calls[0][1],"url('"+staffAsset+"')");assert.ok(Buffer.byteLength(html)<3650000);console.log('Compiled PWA bytes with shared portraits: '+Buffer.byteLength(html));
 });
 test('compiled app icons share one exact original image across four elements without changing layout attributes',()=>{
  const compiled=all.find(source=>source.includes('One shared original icon')),nodes=[{tagName:'LINK'},{tagName:'LINK'},{tagName:'IMG',width:64,height:64},{tagName:'IMG',width:38,height:38},{tagName:'DIV'}];assert.ok(compiled);vm.runInNewContext(compiled,{document:{querySelectorAll:selector=>{assert.equal(selector,'[data-app-icon]');return nodes;}}});const asset=nodes[0].href;assert.equal(nodes[1].href,asset);assert.equal(nodes[2].src,asset);assert.equal(nodes[3].src,asset);assert.equal(nodes[4].src,undefined);assert.equal(nodes[2].width,64);assert.equal(html.split(asset).length-1,1);assert.deepEqual(Buffer.from(asset.split(',')[1],'base64'),fs.readFileSync(path.join(__dirname,'dist/assets/app-icon-192.png')));vm.runInNewContext(compiled,{});
 });
 test('compiled eighteen-player roster and forty-player squad markup stay below twelve KB instead of copying 128 MB',()=>{
  const roster=F.roster.map(player=>h.ctx.Portraits.html(player)).join(''),squad=Array.from({length:40},(_,index)=>h.ctx.Portraits.html(F.roster[index%18])).join(''),coaches=Array.from({length:20},(_,index)=>h.ctx.StaffPortraits.html('unknown-'+index)).join('');
  assert.ok(Buffer.byteLength(roster)<6000);assert.ok(Buffer.byteLength(squad)<12000);assert.ok(Buffer.byteLength(coaches)<5000);assert.ok(!roster.includes('data:image'));assert.ok(!squad.includes('base64'));assert.ok(!coaches.includes('base64'));for(const p of F.roster)assert.equal(h.ctx.Portraits.index(p),Portraits.index(p));assert.equal(h.calls.length,1);assert.equal(h.styles.length,1);
  console.log('Compiled portrait markup bytes: '+JSON.stringify({roster18:Buffer.byteLength(roster),squad40:Buffer.byteLength(squad),coaches20:Buffer.byteLength(coaches),sharedPlayerAtlas:h.ctx.Portraits.asset.length,sharedCoachAtlas:h.ctx.StaffPortraits.asset.length}));
 });
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
console.log('Validated '+groups+' portrait performance groups against source and an actual compiled PWA.');
