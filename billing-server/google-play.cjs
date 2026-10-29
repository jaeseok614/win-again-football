'use strict';
const {PACKAGE,PRODUCT,PurchaseError}=require('./purchases.cjs');
function createPlayClient(fetchImpl=fetch,accessTokenProvider=null){
 let access=null,expires=0;
 async function token(){
  if(access&&Date.now()<expires)return access;
  if(accessTokenProvider){
   const data=await accessTokenProvider();
   if(typeof data.access_token!=='string'||!data.access_token||!Number.isFinite(data.expires_in)||data.expires_in<=0)throw new PurchaseError(503,'verification_unavailable');
   access=data.access_token;expires=Date.now()+Math.max(0,data.expires_in-60)*1000;return access;
  }
  // Workload identity from Cloud Run/GCE. No service-account keys in the app.
  const response=await fetchImpl('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',{headers:{'Metadata-Flavor':'Google'},signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new PurchaseError(503,'verification_unavailable');
  const data=await response.json();if(typeof data.access_token!=='string')throw new PurchaseError(503,'verification_unavailable');
  access=data.access_token;expires=Date.now()+Math.max(0,(Number(data.expires_in)-60))*1000;return access;
 }
 return async(action,purchaseToken)=>{
  const url='https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+PACKAGE+'/purchases/products/'+PRODUCT+'/tokens/'+encodeURIComponent(purchaseToken)+(action==='acknowledge'?':acknowledge':'');
  const response=await fetchImpl(url,{method:action==='acknowledge'?'POST':'GET',headers:{Authorization:'Bearer '+await token(),...(action==='acknowledge'?{'Content-Type':'application/json'}:{})},...(action==='acknowledge'?{body:'{}'}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});
  if(response.status===401){access=null;expires=0;}
  if(response.status===404||response.status===410)throw new PurchaseError(403,'not_owned');
  if(!response.ok)throw new PurchaseError(503,'verification_unavailable');
  return action==='acknowledge'?null:response.json();
 };
}
module.exports={createPlayClient};
