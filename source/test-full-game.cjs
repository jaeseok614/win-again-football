'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const {verifyPurchase,createServer,TTL}=require('../billing-server/server.cjs');
const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const input={token:'test-purchase-token-fixture',nonce:'a'.repeat(64),installation:'12345678-1234-1234-1234-123456789012'};
function test(name,run){run();console.log('PASS '+name);}
function game(){
 const posts=[],nodes={};let advanced=0;
 const button=()=>({textContent:'',disabled:false,focus(){}});
 nodes['full-game-dialog']={open:false,querySelector:()=>button(),showModal(){this.open=true;},close(){this.open=false;}};
 const context={window:null,document:{getElementById:id=>nodes[id]||null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({}),head:{appendChild(){}}},
  season:{year:1,match:{phase:'prep',paused:false}},state:null,pauseForPlanning(){},renderAppShell(){},renderPwaStatus(){},advanceMatchWithFeedback(){advanced++;},
  S:{nextSeason:s=>({...s,year:s.year+1}),settle:s=>({...s,round:1})},F:{},WinAgainBilling:{postMessage:text=>posts.push(JSON.parse(text))}};
 context.window=context;context.state=context.season.match;
 for(const name of ['begin','finishSegment','tick','advanceContinuous'])context.F[name]=()=>{advanced++;return ['event'];};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../android/web/full-game.js'),'utf8'),context);
 return {context,posts,nodes,advanced:()=>advanced,emit:state=>context.WinAgainBilling.onmessage({data:JSON.stringify({type:'billing',owned:false,...state})})};
}
test('trial includes all first-season matches, but next season needs a verified grant',()=>{
 const {context:c,advanced}=game();c.F.begin(c.state);c.F.tick(c.state);assert.equal(advanced(),2);
 assert.equal(c.S.settle(c.season).round,1);const before=JSON.stringify(c.season);
 assert.throws(()=>c.S.nextSeason(c.season),/無料|무료 체험/);assert.equal(JSON.stringify(c.season),before);
});
test('imported later-season and forged save fields cannot unlock native trial',()=>{
 const {context:c,advanced}=game();c.season={year:3,match:{phase:'first',paused:false},fullGame:true,purchased:true};c.state=c.season.match;
 assert.throws(()=>c.S.settle(c.season),/정식판/);assert.throws(()=>c.advanceMatchWithFeedback(),/정식판/);
 assert.throws(()=>c.F.begin(c.state),/정식판/);assert.deepEqual(Array.from(c.F.advanceContinuous(c.state)),[]);assert.equal(c.state.paused,true);
 c.F.tick({practice:true});assert.equal(advanced(),1,'free practice is isolated');
});
test('pending/cancelled/error never unlock; ownership does not auto-advance a save',()=>{
 const {context:c,emit}=game();for(const status of ['pending','error','trial']){emit({status});assert.throws(()=>c.S.nextSeason(c.season),/정식판/);}
 const before=JSON.stringify(c.season);emit({owned:true,status:'owned'});assert.equal(JSON.stringify(c.season),before);assert.equal(c.S.nextSeason(c.season).year,2);
 emit({owned:false,status:'trial'});assert.throws(()=>c.S.nextSeason(c.season),/정식판/);
 assert.throws(()=>{c.WinAgainFullGame.status.owned=true;},TypeError);
});
(async()=>{
 let acknowledgements=0;
 const play=async action=>{if(action==='get')return {purchaseState:0,consumptionState:0,acknowledgementState:0};acknowledgements++;};
 const {entitlement}=await verifyPurchase(input,{play,privateKey,now:1000});
 const [header,payload,signature]=entitlement.split('.'),claims=JSON.parse(Buffer.from(payload,'base64url'));
 assert.equal(crypto.verify('RSA-SHA256',Buffer.from(header+'.'+payload),publicKey,Buffer.from(signature,'base64url')),true);
 assert.equal(claims.aud,input.installation);assert.equal(claims.nonce,input.nonce);assert.equal(claims.exp,1000+TTL);assert.equal(acknowledgements,1);
 assert.ok(!JSON.stringify(claims).includes(input.token));console.log('PASS server verifies, acknowledges once, and signs a bounded token-free entitlement');
 for(const receipt of [{purchaseState:1},{purchaseState:2},{purchaseState:0,consumptionState:1},{purchaseState:0,consumptionState:0,productId:'wrong'},{purchaseState:0,consumptionState:0,purchaseType:0}]){
  await assert.rejects(verifyPurchase(input,{play:async()=>receipt,privateKey}),error=>error.status===403);
 }
 console.log('PASS refunded, pending, consumed, wrong-product and unapproved test purchases are denied');
 let gets=0;await verifyPurchase(input,{play:async action=>{if(action==='acknowledge')throw Error('lost response');return {purchaseState:0,consumptionState:0,acknowledgementState:gets++?1:0};},privateKey});
 await assert.rejects(verifyPurchase(input,{play:async()=>{throw Error('offline');},privateKey}),/offline/);
 await assert.rejects(verifyPurchase({...input,owned:true},{play,privateKey}),error=>error.status===400);
 await assert.rejects(verifyPurchase({...input,nonce:'bad'},{play,privateKey}),error=>error.status===400);
 console.log('PASS lost acknowledgement response is confirmed; network and malformed requests fail closed');
 const server=createServer({play,privateKey});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const url='http://127.0.0.1:'+server.address().port;
  const response=await fetch(url+'/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const invalid=await fetch(url+'/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,token:'secret'})});assert.equal(invalid.status,400);assert.ok(!(await invalid.text()).includes('secret'));
  assert.equal((await fetch(url+'/other')).status,404);console.log('PASS HTTP verification returns no-store responses and never echoes purchase tokens');
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
