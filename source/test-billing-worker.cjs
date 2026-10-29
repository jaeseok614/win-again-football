'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{
 const {createWorker,createGoogleTokenProvider}=await import('../billing-server/worker.mjs');
 const keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const pem=keys.privateKey.export({type:'pkcs8',format:'pem'}),now=Date.now();
 const account={client_email:'billing@example-project.iam.gserviceaccount.com',private_key:pem,token_uri:'https://untrusted.invalid/'};
 const env={ENABLE_VERIFICATION:'true',ENTITLEMENT_PRIVATE_KEY_PEM:pem,GOOGLE_SERVICE_ACCOUNT_JSON:JSON.stringify(account),ALLOW_LICENSE_TEST_PURCHASES:'false'};
 const input={token:'local-purchase-fixture-token',nonce:'a'.repeat(64),installation:'12345678-1234-1234-1234-123456789012'};
 let auths=0,gets=0,acks=0,receipt={purchaseState:0,consumptionState:0,acknowledgementState:0},denyAuth=false,denyPlay=false;
 const fetchImpl=async(url,options)=>{
  assert.equal(options.redirect==='error'||url.startsWith('https://androidpublisher.googleapis.com/'),true);
  if(url==='https://oauth2.googleapis.com/token'){
   auths++;assert.equal(options.method,'POST');
   const params=new URLSearchParams(options.body),jwt=params.get('assertion'),[header,payload,signature]=jwt.split('.');
   assert.equal(params.get('grant_type'),'urn:ietf:params:oauth:grant-type:jwt-bearer');
   assert.equal(crypto.verify('RSA-SHA256',Buffer.from(header+'.'+payload),keys.publicKey,Buffer.from(signature,'base64url')),true);
   const claims=JSON.parse(Buffer.from(payload,'base64url'));assert.equal(claims.iss,account.client_email);
   assert.equal(claims.aud,url);assert.equal(claims.scope,'https://www.googleapis.com/auth/androidpublisher');assert.equal(claims.exp-claims.iat,3600);
   return new Response(JSON.stringify({access_token:'local-oauth-fixture',expires_in:3600}),{status:denyAuth?403:200});
  }
  assert.ok(url.startsWith('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.jaeseok614.winagainfootball/purchases/products/full_game/tokens/'));
  assert.equal(options.headers.Authorization,'Bearer local-oauth-fixture');
  if(denyPlay)return new Response('{}',{status:401});
  if(options.method==='POST'){acks++;assert.ok(url.endsWith(':acknowledge'));assert.equal(options.body,'{}');return new Response('{}');}
  gets++;return new Response(JSON.stringify(receipt));
 };
 const worker=createWorker({fetchImpl,clock:()=>now});
 const req=(body=input,url='https://billing.example/verify',extra={})=>new Request(url,{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...extra},body:typeof body==='string'?body:JSON.stringify(body)});
 let response=await worker.fetch(req(),env);assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
 const {entitlement}=await response.json(),[h,p,s]=entitlement.split('.');
 assert.equal(crypto.verify('RSA-SHA256',Buffer.from(h+'.'+p),keys.publicKey,Buffer.from(s,'base64url')),true);
 const claims=JSON.parse(Buffer.from(p,'base64url'));assert.equal(claims.aud,input.installation);assert.equal(claims.nonce,input.nonce);assert.equal(claims.product,'full_game');assert.equal(claims.exp-claims.iat,604800);
 assert.ok(!entitlement.includes(input.token));assert.equal(acks,1);
 await worker.fetch(req(),env);assert.equal(auths,1);assert.equal(gets,2);
 console.log('PASS Worker exchanges fixed-scope signed OAuth assertions, caches access, and returns native-compatible signed grants');
 for(const value of [{...receipt,purchaseState:1},{...receipt,purchaseState:2},{...receipt,consumptionState:1},{...receipt,productId:'other'},{...receipt,purchaseType:0}]){
  receipt=value;response=await worker.fetch(req(),env);assert.equal(response.status,403);
 }
 receipt={purchaseState:0,consumptionState:0,acknowledgementState:1,purchaseType:0};
 assert.equal((await worker.fetch(req(),{...env,ALLOW_LICENSE_TEST_PURCHASES:'true'})).status,200);
 assert.equal((await worker.fetch(req(),env)).status,403);
 console.log('PASS Worker denies refunded/pending/consumed/wrong/test receipts and isolates opt-in license tests');
 for(const body of ['invalid',JSON.stringify({...input,owned:true}),JSON.stringify({...input,token:'short'})])assert.equal((await worker.fetch(req(body),env)).status,400);
 assert.equal((await worker.fetch(req('x'.repeat(8193)),env)).status,413);
 assert.equal((await worker.fetch(req(input,'http://billing.example/verify'),env)).status,400);
 assert.equal((await worker.fetch(req(input,'https://billing.example/verify?token=secret'),env)).status,404);
 assert.equal((await worker.fetch(req(input,'https://billing.example/verify',{'Content-Type':'text/plain'}),env)).status,404);
 assert.equal((await worker.fetch(req(),{...env,ENABLE_VERIFICATION:'false'})).status,503);
 const missing=await worker.fetch(req(),{ENABLE_VERIFICATION:'true'});assert.equal(missing.status,503);assert.equal(await missing.text(),'{"error":"verification_unavailable"}');
 const hanging=new Request('https://billing.example/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:new ReadableStream({}),duplex:'half'});
 assert.equal((await createWorker({fetchImpl,bodyTimeoutMs:10}).fetch(hanging,env)).status,408);
 console.log('PASS Worker enforces HTTPS, exact routes, bounded JSON, disabled-by-default config, and secret-free errors');
 const limited=createWorker({fetchImpl,clock:()=>now});for(let i=0;i<30;i++)await limited.fetch(req(),env);
 assert.equal((await limited.fetch(req(),env)).status,429);
 const health=await worker.fetch(new Request('https://billing.example/health'),{});assert.equal(health.status,200);
 denyAuth=true;assert.equal((await createWorker({fetchImpl}).fetch(req(),{...env})).status,503);denyAuth=false;
 denyPlay=true;const failed=createWorker({fetchImpl});assert.equal((await failed.fetch(req(),env)).status,503);const before=auths;await failed.fetch(req(),env);assert.equal(auths,before+1);
 assert.throws(()=>createGoogleTokenProvider(JSON.stringify({...account,client_email:'attacker@example.com'}),fetchImpl));
 console.log('PASS Worker rate limits, reports health, and fails closed for Google auth/API failures without granting ownership');
})().catch(error=>{console.error(error);process.exitCode=1;});
