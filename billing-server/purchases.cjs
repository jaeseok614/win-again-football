'use strict';
const crypto=require('node:crypto');
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
module.exports={PACKAGE,PRODUCT,TTL,PurchaseError,validRequest,signEntitlement,verifyPurchase};
