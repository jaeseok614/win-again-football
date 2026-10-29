'use strict';
// No campaign data or payment-card data is accepted. Run behind managed HTTPS.
const http=require('node:http'),crypto=require('node:crypto');
const PACKAGE='com.jaeseok614.winagainfootball',PRODUCT='full_game',TTL=7*24*60*60;
const encode=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
class PurchaseError extends Error {constructor(status,message){super(message);this.status=status;}}
function validRequest(input){
 if(!input||Object.keys(input).some(k=>!['token','nonce','installation'].includes(k))||
  typeof input.token!=='string'||input.token.length<16||input.token.length>4096||/[\s\x00-\x1f]/.test(input.token)||
  !/^[a-f0-9]{64}$/.test(input.nonce)||!/^[a-f0-9-]{36}$/.test(input.installation))throw new PurchaseError(400,'invalid_request');
 return input;
}
function signEntitlement(input,privateKey,now=Math.floor(Date.now()/1000)){
 const header=encode({alg:'RS256',typ:'JWT'}),payload=encode({iss:PACKAGE,aud:input.installation,product:PRODUCT,nonce:input.nonce,iat:now,exp:now+TTL});
 const body=header+'.'+payload;
 return body+'.'+crypto.sign('RSA-SHA256',Buffer.from(body),privateKey).toString('base64url');
}
async function verifyPurchase(input,{play,privateKey,allowTestPurchases=false,now}={}){
 validRequest(input);
 const receipt=await play('get',input.token);
 // Google API enums: purchased=0, cancelled=1, pending=2. Never consume this item.
 if(receipt.purchaseState!==0||receipt.consumptionState!==0||
    (receipt.productId&&receipt.productId!==PRODUCT)||
    (receipt.quantity!==undefined&&receipt.quantity!==1))throw new PurchaseError(403,'not_owned');
 if(receipt.purchaseType===0&&!allowTestPurchases)throw new PurchaseError(403,'test_purchase_not_enabled');
 if(receipt.acknowledgementState===0){
  try{await play('acknowledge',input.token);}catch(error){
   // An acknowledgement can succeed even if the response was lost. Confirm it.
   const checked=await play('get',input.token);
   if(checked.purchaseState!==0||checked.acknowledgementState!==1)throw error;
  }
 }else if(receipt.acknowledgementState!==1)throw new PurchaseError(403,'invalid_acknowledgement');
 return {entitlement:signEntitlement(input,privateKey,now)};
}
function createPlayClient(fetchImpl=fetch){
 let access=null,expires=0;
 async function token(){
  if(access&&Date.now()<expires)return access;
  // Workload identity from Cloud Run/GCE. No service-account keys in the app.
  const response=await fetchImpl('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',{headers:{'Metadata-Flavor':'Google'},signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new PurchaseError(503,'verification_unavailable');
  const data=await response.json();if(typeof data.access_token!=='string')throw new PurchaseError(503,'verification_unavailable');
  access=data.access_token;expires=Date.now()+Math.max(0,(Number(data.expires_in)-60))*1000;return access;
 }
 return async(action,purchaseToken)=>{
  const url='https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+PACKAGE+'/purchases/products/'+PRODUCT+'/tokens/'+encodeURIComponent(purchaseToken)+(action==='acknowledge'?':acknowledge':'');
  const response=await fetchImpl(url,{method:action==='acknowledge'?'POST':'GET',headers:{Authorization:'Bearer '+await token(),...(action==='acknowledge'?{'Content-Type':'application/json'}:{})},...(action==='acknowledge'?{body:'{}'}:{}),signal:AbortSignal.timeout(10000)});
  if(response.status===401){access=null;expires=0;}
  if(response.status===404||response.status===410)throw new PurchaseError(403,'not_owned');
  if(!response.ok)throw new PurchaseError(503,'verification_unavailable');
  return action==='acknowledge'?null:response.json();
 };
}
function createServer(options){
 let inflight=0;const rates=new Map();
 return http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'&&req.url==='/health'){res.end('{"ok":true}');return;}
  if(req.method!=='POST'||req.url!=='/verify'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){res.writeHead(404);res.end('{"error":"not_found"}');return;}
  const minute=Math.floor(Date.now()/60000),address=req.socket.remoteAddress||'',prior=rates.get(address);
  if(rates.size>1000)rates.clear();
  const rate=prior?.minute===minute?prior:{minute,count:0};rate.count++;rates.set(address,rate);
  if(inflight>=16||rate.count>30){res.writeHead(429);res.end('{"error":"retry_later"}');return;}
  inflight++;
  try{
   const chunks=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>8192)throw new PurchaseError(413,'request_too_large');chunks.push(chunk);}
   let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new PurchaseError(400,'invalid_request');}
   res.end(JSON.stringify(await verifyPurchase(input,options)));
  }catch(error){res.writeHead(error instanceof PurchaseError?error.status:503);res.end(JSON.stringify({error:error instanceof PurchaseError?error.message:'verification_unavailable'}));}
  finally{inflight--;}
 });
}
module.exports={PACKAGE,PRODUCT,TTL,PurchaseError,validRequest,signEntitlement,verifyPurchase,createPlayClient,createServer};
if(require.main===module){
 const privateKey=process.env.ENTITLEMENT_PRIVATE_KEY_PEM;
 if(!privateKey||crypto.createPrivateKey(privateKey).asymmetricKeyType!=='rsa')throw Error('An RSA entitlement signing key from Secret Manager is required.');
 const server=createServer({privateKey,play:createPlayClient(),allowTestPurchases:process.env.ALLOW_LICENSE_TEST_PURCHASES==='true'});
 server.requestTimeout=15000;server.headersTimeout=10000;
 server.listen(Number(process.env.PORT)||8080,'0.0.0.0');
}
