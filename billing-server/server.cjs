'use strict';
// No campaign data or payment-card data is accepted. Run behind managed HTTPS.
const http=require('node:http'),crypto=require('node:crypto');
const {PACKAGE,PRODUCT,TTL,PurchaseError,validRequest,signEntitlement,verifyPurchase}=require('./purchases.cjs');
const {createPlayClient}=require('./google-play.cjs');
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
