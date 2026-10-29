// Optional Workers Free deployment. Secrets belong only in the host secret store.
import crypto from 'node:crypto';
import purchases from './purchases.cjs';
import googlePlay from './google-play.cjs';
const {PurchaseError,validRequest,verifyPurchase}=purchases;
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function rsaKey(pem){
 const key=crypto.createPrivateKey(pem);
 if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails.modulusLength<2048)throw Error('invalid_key');
 return key;
}
export function createGoogleTokenProvider(secret,fetchImpl=fetch,clock=Date.now){
 const account=JSON.parse(secret);
 if(!/^[a-z0-9-]+@[a-z0-9.-]+\.iam\.gserviceaccount\.com$/.test(account.client_email))throw Error('invalid_account');
 const key=rsaKey(account.private_key);
 return async()=>{
  const now=Math.floor(clock()/1000),body=encode({alg:'RS256',typ:'JWT'})+'.'+encode({
   iss:account.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',
   aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600
  });
  const assertion=body+'.'+crypto.sign('RSA-SHA256',Buffer.from(body),key).toString('base64url');
  const response=await fetchImpl('https://oauth2.googleapis.com/token',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),
   redirect:'error',signal:AbortSignal.timeout(5000)
  });
  if(!response.ok)throw new PurchaseError(503,'verification_unavailable');
  return response.json();
 };
}
async function readInput(request,timeoutMs){
 if(Number(request.headers.get('content-length'))>8192)throw new PurchaseError(413,'request_too_large');
 if(!request.body)throw new PurchaseError(400,'invalid_request');
 const reader=request.body.getReader(),chunks=[];let size=0,timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new PurchaseError(408,'request_timeout'));void reader.cancel().catch(()=>{});},timeoutMs);});
 try{for(;;){const {done,value}=await Promise.race([reader.read(),timeout]);if(done)break;size+=value.byteLength;
  if(size>8192){await reader.cancel();throw new PurchaseError(413,'request_too_large');}chunks.push(value);
 }}finally{clearTimeout(timer);reader.releaseLock();}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
 try{return validRequest(JSON.parse(new TextDecoder().decode(data)));}catch(error){
  if(error instanceof PurchaseError)throw error;throw new PurchaseError(400,'invalid_request');
 }
}
// Limits here are per isolate; the host's Free quota is the account-wide hard cap.
export function createWorker({fetchImpl=fetch,clock=Date.now,bodyTimeoutMs=5000}={}){
 let cached=null,inflight=0;const rates=new Map();
 const json=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
 return {async fetch(request,env){
  const url=new URL(request.url);
  if(url.protocol!=='https:')return json(400,{error:'https_required'});
  if(request.method==='GET'&&url.pathname==='/health')return json(200,{ok:true});
  if(request.method!=='POST'||url.pathname!=='/verify'||url.search||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json(404,{error:'not_found'});
  // This switch is disabled in saved config. Enable only after checking Workers Free.
  if(env.ENABLE_VERIFICATION!=='true')return json(503,{error:'verification_unavailable'});
  const minute=Math.floor(clock()/60000),address=request.headers.get('CF-Connecting-IP')||'unknown',prior=rates.get(address);
  if(rates.size>1000)rates.clear();const rate=prior?.minute===minute?prior:{minute,count:0};rate.count++;rates.set(address,rate);
  if(inflight>=16||rate.count>30)return json(429,{error:'retry_later'});
  inflight++;
  try{
   // The same env object may serve many requests; secret rotation creates a new one.
   if(!cached||cached.env!==env){
    const privateKey=rsaKey(env.ENTITLEMENT_PRIVATE_KEY_PEM);
    const provider=createGoogleTokenProvider(env.GOOGLE_SERVICE_ACCOUNT_JSON,fetchImpl,clock);
    cached={env,options:{privateKey,play:googlePlay.createPlayClient(fetchImpl,provider),allowTestPurchases:env.ALLOW_LICENSE_TEST_PURCHASES==='true'}};
   }
   const input=await readInput(request,bodyTimeoutMs);
   return json(200,await verifyPurchase(input,cached.options));
  }catch(error){return json(error instanceof PurchaseError?error.status:503,{error:error instanceof PurchaseError?error.message:'verification_unavailable'});}
  finally{inflight--;}
 }};
}
export default createWorker();
