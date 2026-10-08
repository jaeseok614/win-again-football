'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),Training=require('./dist/training.js'),PlayerDetails=require('./dist/player-details.js'),Portraits=require('./dist/portraits.js'),PlayerCharacter=require('./dist/character.js'),H=require('./dist/health.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function harness(season,overrides={}){
 const nodes=new Map(),people=[],views=[],calls={train:0,recruit:0,tick:0},classes=new Set();let document,context;
 const element=(id,dataset={})=>({id,dataset,isConnected:true,visible:true,handlers:{},focus(options){document.activeElement=this;this.focusOptions=options;},getClientRects(){return this.isConnected&&this.visible?[{}]:[];},addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);},dispatch(type,event={}){for(const fn of this.handlers[type]||[])fn({target:this,currentTarget:this,...event});},scrollIntoView(options){this.scrolled=options;},closest(selector){return selector==='[data-player-detail]'&&this.dataset.playerDetail?this:null;}});
 const body=element('body'),nav=element('current-view',{view:'club'}),dialog=element('player-detail-dialog');dialog.open=false;dialog.scrollTop=0;dialog.children=[];
 dialog.contains=node=>dialog.children.includes(node);dialog.showModal=()=>{dialog.open=true;dialog.showCount=(dialog.showCount||0)+1;};dialog.close=()=>{dialog.open=false;dialog.dispatch('close');};dialog.getBoundingClientRect=()=>({left:20,right:500,top:20,bottom:700});
 Object.defineProperty(dialog,'innerHTML',{get(){return this.markup||'';},set(value){for(const child of this.children){child.isConnected=false;nodes.delete(child.id);if(document.activeElement===child)document.activeElement=body;}this.markup=value;this.children=[];this.scrollTop=0;for(const [,id] of value.matchAll(/id="([^"]+)"/g)){const child=element(id);this.children.push(child);nodes.set(id,child);}}});
 document={activeElement:body,handlers:{},getElementById:id=>nodes.get(id),documentElement:{classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)}},addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);},querySelectorAll(selector){return selector==='[data-player-detail]'?people.filter(p=>p.isConnected):[];},querySelector(selector){return selector==='[data-view][aria-current="page"]'?nav:null;}};
 for(const node of [body,nav,dialog,element('individual-training-player')])nodes.set(node.id,node);
 const forbidden=key=>(()=>{calls[key]++;throw Error('unexpected gameplay action '+key);});
 context=vm.createContext({document});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/player-details-ui.js'),'utf8'),context);
 Object.assign(context,{season,F:{...F,tick:forbidden('tick')},S:{...S,train:forbidden('train'),recruit:forbidden('recruit')},Training:{...Training,train:forbidden('train')},PlayerDetails,Portraits,PlayerCharacter,H,$:id=>nodes.get(id),individualTrainingSlot:'',individualTrainingFocus:'pace',individualTrainingNote:'old note',squadTab:'health',view:'club',setView(view){views.push(view);context.view=view;nav.dataset.view=view;},...overrides});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/market-ui.js'),'utf8'),context);
 const opener=(identity,id='opener-'+people.length)=>{const node=element(id,{playerDetail:identity});people.push(node);nodes.set(id,node);return node;};
 return {context,document,dialog,nav,views,calls,classes,nodes,opener,click(node){for(const fn of document.handlers.click||[])fn({target:node});}};
}
function unchanged(h,before){assert.equal(JSON.stringify(h.context.season),before);assert.deepEqual(h.calls,{train:0,recruit:0,tick:0});}

test('delegated opening and closing show current identity without training, recruiting or advancing a match',()=>{
 const s=S.create(1331),h=harness(s),before=JSON.stringify(s),opener=h.opener('sp_f1');opener.focus();h.click(opener);
 assert.equal(h.dialog.open,true);assert.equal(h.dialog.showCount,1);assert.equal(h.document.activeElement.id,'player-detail-close');assert.ok(h.classes.has('player-detail-open'));assert.match(h.dialog.innerHTML,/손헝민/);assert.match(h.dialog.innerHTML,/개인 훈련 보기/);unchanged(h,before);
 h.nodes.get('player-detail-close').onclick();assert.equal(h.dialog.open,false);assert.equal(h.document.activeElement,opener);assert.ok(!h.classes.has('player-detail-open'));unchanged(h,before);
});

test('owned routing resolves identity again after a player moves to a different current slot',()=>{
 const s=S.create(1332),h=harness(s);h.context.openPlayerDetails('sp_f2',h.opener('sp_f2'));
 const a=s.squad.f2,b=s.squad.f4;s.squad.f2={...b,id:'f2',no:a.no};s.squad.f4={...a,id:'f4',no:b.no};s.match=F.create(s.match.seed,{players:s.squad});
 const before=JSON.stringify(s);h.nodes.get('player-detail-route').onclick();assert.equal(h.context.individualTrainingSlot,'f4');assert.equal(h.context.individualTrainingFocus,'technique');assert.equal(h.context.individualTrainingNote,'');assert.equal(h.context.squadTab,'training');assert.deepEqual(h.views,['squad']);assert.equal(h.document.activeElement.id,'individual-training-player');assert.equal(h.dialog.open,false);unchanged(h,before);
});

test('removed squad identities and undiscovered youth cannot open or route to a replacement player',()=>{
 let s=S.create(1333);const h=harness(s),hidden=F.youthCandidates(s.seed,s.year,1,'FW')[0].identity;
 h.context.openPlayerDetails(hidden,h.opener(hidden));h.context.openPlayerDetails('missing',h.opener('missing'));assert.equal(h.dialog.open,false);assert.equal(h.dialog.showCount,undefined);
 h.context.openPlayerDetails('sp_f2',h.opener('sp_f2'));s=S.recruit(s,'t_f1','f2');h.context.season=s;const before=JSON.stringify(s);h.context.routePlayerDetails();assert.equal(h.dialog.open,false);assert.equal(h.context.individualTrainingSlot,'');assert.deepEqual(h.views,[]);unchanged(h,before);
});

test('market and discovered academy candidate routes stay in their source screens and never select training',()=>{
 let s=S.scout(S.create(1334),'FW');const youth=s.career.reports[0].candidates[1];
 for(const [identity,target] of [['t_f2','market'],[youth,'academy']]){const h=harness(copy(s)),opener=h.opener(identity),before=JSON.stringify(h.context.season);h.context.openPlayerDetails(identity,opener);assert.doesNotMatch(h.dialog.innerHTML,/개인 훈련 보기/);h.context.routePlayerDetails();assert.deepEqual(h.views,[target]);assert.equal(h.context.squadTab,'health');assert.equal(h.context.individualTrainingSlot,'');assert.equal(h.context.individualTrainingFocus,'pace');assert.equal(h.document.activeElement,opener);assert.deepEqual(copy(opener.scrolled),{block:'center',behavior:'instant'});unchanged(h,before);}
});

test('Escape prevents native cancellation and restores a replacement opener or the current view when needed',()=>{
 const h=harness(S.create(1335)),opener=h.opener('sp_f2'),replacement=h.opener('sp_f2','replacement');h.context.openPlayerDetails('sp_f2',opener);opener.isConnected=false;let prevented=0;
 h.dialog.dispatch('cancel',{preventDefault(){prevented++;}});assert.equal(prevented,1);assert.equal(h.dialog.open,false);assert.equal(h.document.activeElement,replacement);assert.deepEqual(copy(replacement.focusOptions),{preventScroll:true});
 h.context.openPlayerDetails('sp_f2',replacement);replacement.isConnected=false;h.dialog.dispatch('cancel',{preventDefault(){prevented++;}});assert.equal(prevented,2);assert.equal(h.document.activeElement,h.nav);assert.ok(!h.classes.has('player-detail-open'));
});

test('refreshing actual stats preserves focused controls and scroll while unchanged snapshots do not rerender',()=>{
 const s=S.create(1336),h=harness(s);h.context.openPlayerDetails('sp_f3',h.opener('sp_f3'));const oldRoute=h.nodes.get('player-detail-route');oldRoute.focus();h.dialog.scrollTop=318;
 h.context.refreshPlayerDetails();assert.equal(h.nodes.get('player-detail-route'),oldRoute);assert.equal(h.dialog.scrollTop,318);
 s.squad.f3.attack+=1;s.match.players.f3.attack=s.squad.f3.attack;const before=JSON.stringify(s);h.context.refreshPlayerDetails();const newRoute=h.nodes.get('player-detail-route');assert.notEqual(newRoute,oldRoute);assert.equal(oldRoute.isConnected,false);assert.equal(h.document.activeElement,newRoute);assert.deepEqual(copy(newRoute.focusOptions),{preventScroll:true});assert.equal(h.dialog.scrollTop,318);assert.match(h.dialog.innerHTML,/71<small> \/ 97/);assert.equal(h.dialog.showCount,1);unchanged(h,before);
});

test('previous and next player controls wrap by current identity without changing the original focus return target',()=>{
 const s=S.create(1337),h=harness(s),ids=Object.values(s.squad).map(p=>p.identity),opener=h.opener(ids[0]),before=JSON.stringify(s);h.context.openPlayerDetails(ids[0],opener);h.dialog.scrollTop=100;
 h.nodes.get('player-detail-prev').onclick();assert.match(h.dialog.innerHTML,new RegExp(F.identityProfile(ids.at(-1)).name));assert.equal(h.document.activeElement.id,'player-detail-close');assert.deepEqual(copy(h.document.activeElement.focusOptions),{preventScroll:true});assert.equal(h.dialog.scrollTop,0);h.nodes.get('player-detail-next').onclick();assert.match(h.dialog.innerHTML,new RegExp(F.identityProfile(ids[0]).name));assert.equal(h.document.activeElement.id,'player-detail-close');assert.equal(h.dialog.scrollTop,0);h.context.closePlayerDetails();assert.equal(h.document.activeElement,opener);unchanged(h,before);
});

test('name, nickname, introduction, quotes and training recommendation text are escaped before rendering',()=>{
 const s=S.create(1338),payload='<img src=x onerror="bad()"> & \'hello\'',p=s.squad.f3;p.name=payload;
 const details={read(season,id){const d=PlayerDetails.read(season,id);if(d.valid){d.nickname=payload;d.tagline=payload;if(d.development)d.development.recommendation.label=payload;}return d;}};
 const h=harness(s,{PlayerDetails:details,PlayerCharacter:{...PlayerCharacter,info(person){return {...PlayerCharacter.info(person),quote:payload};}}}),before=JSON.stringify(s);h.context.openPlayerDetails('sp_f3',h.opener('sp_f3'));
 assert.doesNotMatch(h.dialog.innerHTML,/<img|onerror="/);assert.ok((h.dialog.innerHTML.match(/&lt;img src=x onerror=&quot;bad\(\)&quot;&gt; &amp; &#39;hello&#39;/g)||[]).length>=5);unchanged(h,before);
});

test('refresh invalidation and backdrop clicks close safely without routing an unavailable identity',()=>{
 let s=S.create(1339);const h=harness(s),opener=h.opener('sp_f1');h.context.openPlayerDetails('sp_f1',opener);s=S.recruit(s,'t_f1','f1');h.context.season=s;const before=JSON.stringify(s);h.context.refreshPlayerDetails();assert.equal(h.dialog.open,false);assert.deepEqual(h.views,[]);assert.equal(h.document.activeElement,opener);unchanged(h,before);
 h.context.openPlayerDetails('sp_f2',h.opener('sp_f2'));h.dialog.dispatch('click',{clientX:50,clientY:50});assert.equal(h.dialog.open,true);h.dialog.dispatch('click',{clientX:5,clientY:5});assert.equal(h.dialog.open,false);unchanged(h,before);
});
console.log('Validated '+groups+' player detail UI groups, including identity routing, candidate boundaries, focus restoration, refresh and read-only actions.');
