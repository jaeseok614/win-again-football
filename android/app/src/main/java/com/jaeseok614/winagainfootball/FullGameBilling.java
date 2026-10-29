package com.jaeseok614.winagainfootball;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import com.android.billingclient.api.*;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/** Non-consumable Play purchase. No boolean from JS or campaign JSON grants access. */
final class FullGameBilling {
    private final Activity activity;
    private final Consumer<JSONObject> listener;
    private final SharedPreferences prefs;
    private final String installation;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private final BillingClient client;
    private ProductDetails product;
    private ProductDetails.OneTimePurchaseOfferDetails offer;
    private String status = "unavailable", message = "정식판 판매를 준비하고 있습니다. 첫 시즌은 무료입니다.";
    private boolean busy, connecting, closed;
    private int generation;

    FullGameBilling(Activity activity, Consumer<JSONObject> listener) {
        this.activity=activity; this.listener=listener;
        prefs=activity.getSharedPreferences("full-game-entitlement", Context.MODE_PRIVATE);
        String previous=prefs.getString("installation", null);
        installation=previous==null ? UUID.randomUUID().toString() : previous;
        if(previous==null) prefs.edit().putString("installation",installation).apply();
        client=BillingClient.newBuilder(activity).setListener((result,purchases)->main.post(()->{
            if(closed)return;
            if(result.getResponseCode()==BillingClient.BillingResponseCode.OK) {
                if(purchases==null || purchases.isEmpty()){busy=false;refresh();}else process(purchases);
            }
            else if(result.getResponseCode()==BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED){busy=false;refresh();}
            else finish("error",result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED
                ? "구매를 취소했습니다. 첫 시즌 체험과 구단 기록은 유지됩니다." : "결제를 마치지 못했어요. Google Play 계정과 연결을 확인해 주세요.");
        })).enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build();
    }
    private boolean configured() {
        try {
            URL url=new URL(BuildConfig.BILLING_VERIFY_URL);
            return "https".equals(url.getProtocol()) && !url.getHost().isEmpty() && url.getUserInfo()==null
                && url.getQuery()==null && url.getRef()==null && "/verify".equals(url.getPath())
                && !BuildConfig.BILLING_ENTITLEMENT_PUBLIC_KEY.isEmpty();
        } catch(Exception error){return false;}
    }
    private boolean owned() {
        return EntitlementVerifier.verify(prefs.getString("grant", ""),BuildConfig.BILLING_ENTITLEMENT_PUBLIC_KEY,
            installation,null,System.currentTimeMillis()/1000)>0;
    }
    void emit() {
        if(closed)return;
        try {
            JSONObject state=new JSONObject();state.put("type","billing");state.put("owned",owned());
            state.put("busy",busy);state.put("status",status);state.put("message",message);
            state.put("canBuy",configured() && client.isReady() && offer!=null && !busy && !owned());
            state.put("price",offer==null?"":offer.getFormattedPrice());listener.accept(state);
        } catch(Exception error){/* A discarded WebView cannot receive state. */}
    }
    void request(String action) {
        if(closed)return;
        if("status".equals(action)){emit();if(!busy)refresh();return;}
        if(busy){emit();return;}
        if("restore".equals(action)){refresh();return;}
        if("buy".equals(action))buy();
    }
    void refresh() {
        if(closed || busy)return;
        if(!configured()){finish("unavailable","정식판 판매를 준비하고 있습니다. 첫 시즌은 무료로 체험할 수 있어요.");return;}
        busy=true;status="checking";message="Google Play 구매 내역을 확인하는 중…";emit();
        final int attempt=++generation;
        main.postDelayed(()->{if(!closed && generation==attempt && busy){generation++;finish("error","구매 확인이 지연되고 있어요. 인터넷 연결 후 구매 복원을 다시 눌러 주세요.");}},60000);
        if(client.isReady()){query();return;}
        if(connecting)return;connecting=true;
        client.startConnection(new BillingClientStateListener(){
            @Override public void onBillingSetupFinished(BillingResult result){main.post(()->{
                connecting=false;if(closed||attempt!=generation)return;
                if(result.getResponseCode()==BillingClient.BillingResponseCode.OK)query();
                else finish("error","Google Play에 연결하지 못했어요. 인터넷과 Play 스토어 계정을 확인해 주세요.");
            });}
            @Override public void onBillingServiceDisconnected(){main.post(()->{connecting=false;if(!closed)finish("error","Google Play 연결이 끊겼어요. 구매 복원으로 다시 확인해 주세요.");});}
        });
    }
    private void query() {
        final int attempt=generation;
        QueryProductDetailsParams.Product item=QueryProductDetailsParams.Product.newBuilder()
            .setProductId(EntitlementVerifier.PRODUCT).setProductType(BillingClient.ProductType.INAPP).build();
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(item)).build(),(result,details)->main.post(()->{
            if(closed||attempt!=generation)return;
            product=null;offer=null;
            if(result.getResponseCode()==BillingClient.BillingResponseCode.OK){
                for(ProductDetails row:details.getProductDetailsList())if(EntitlementVerifier.PRODUCT.equals(row.getProductId())){
                    List<ProductDetails.OneTimePurchaseOfferDetails> offers=row.getOneTimePurchaseOfferDetailsList();
                    if(offers!=null)for(ProductDetails.OneTimePurchaseOfferDetails candidate:offers){
                        // Only the configured permanent buy option. Never a rental or preorder.
                        if("buy".equals(candidate.getPurchaseOptionId()) && candidate.getRentalDetails()==null && candidate.getPreorderDetails()==null){product=row;offer=candidate;break;}
                    }
                }
            }
            emit();
        }));
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),(result,purchases)->main.post(()->{
            if(closed||attempt!=generation)return;
            if(result.getResponseCode()==BillingClient.BillingResponseCode.OK)process(purchases);
            else finish("error","구매 내역을 확인하지 못했어요. 유효한 오프라인 구매 권한은 유지됩니다. 인터넷 연결 후 다시 확인해 주세요.");
        }));
    }
    private void process(List<Purchase> purchases) {
        Purchase found=null;boolean pending=false;
        if(purchases!=null)for(Purchase purchase:purchases){
            if(!purchase.getProducts().contains(EntitlementVerifier.PRODUCT))continue;
            if(purchase.getPurchaseState()==Purchase.PurchaseState.PURCHASED){found=purchase;break;}
            if(purchase.getPurchaseState()==Purchase.PurchaseState.PENDING)pending=true;
        }
        if(found!=null){verify(found.getPurchaseToken());return;}
        // Only a successful authoritative Play query/update reaches here. A refund
        // or account change must not keep an old signed grant alive indefinitely.
        prefs.edit().remove("grant").apply();
        finish(pending?"pending":"trial",pending?"결제 대기 중입니다. Google Play에서 결제가 완료된 뒤 다시 확인해 주세요. 아직 정식판이 열리지 않았어요.":"첫 시즌 무료 체험 중입니다. 구매한 적이 있다면 같은 Google Play 계정으로 구매 복원을 눌러 주세요.");
    }
    private void verify(String token) {
        busy=true;status="verifying";message="구매를 안전하게 확인하는 중…";emit();
        final int attempt=++generation;
        main.postDelayed(()->{if(!closed&&attempt==generation&&busy){generation++;finish("error","구매 검증이 지연되고 있어요. 인터넷 연결 후 구매 복원을 다시 눌러 주세요. 다시 결제하지 마세요.");}},60000);
        final String nonce=UUID.randomUUID().toString().replace("-","")+UUID.randomUUID().toString().replace("-","");
        network.execute(()->{
            String grant=null;boolean revoked=false;
            try {
                JSONObject request=new JSONObject();request.put("token",token);request.put("nonce",nonce);request.put("installation",installation);
                HttpsURLConnection connection=(HttpsURLConnection)new URL(BuildConfig.BILLING_VERIFY_URL).openConnection();
                try{
                    connection.setInstanceFollowRedirects(false);connection.setRequestMethod("POST");connection.setConnectTimeout(10000);connection.setReadTimeout(15000);
                    connection.setRequestProperty("Content-Type","application/json");connection.setDoOutput(true);
                    byte[] body=request.toString().getBytes(StandardCharsets.UTF_8);connection.setFixedLengthStreamingMode(body.length);
                    try(java.io.OutputStream out=connection.getOutputStream()){out.write(body);}
                    int code=connection.getResponseCode();revoked=code==403;
                    if(code!=200)throw new IllegalStateException();
                    try(InputStream in=connection.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
                        byte[] buffer=new byte[4096];int count;while((count=in.read(buffer))!=-1){if(out.size()+count>32768)throw new IllegalStateException();out.write(buffer,0,count);}
                        String candidate=new JSONObject(out.toString("UTF-8")).getString("entitlement");
                        if(EntitlementVerifier.verify(candidate,BuildConfig.BILLING_ENTITLEMENT_PUBLIC_KEY,installation,nonce,System.currentTimeMillis()/1000)>0)grant=candidate;
                    }
                }finally{connection.disconnect();}
            }catch(Exception error){/* Never log tokens, server bodies, or purchase details. */}
            final String verified=grant;final boolean denied=revoked;
            main.post(()->{
                if(closed||attempt!=generation)return;
                if(verified!=null){
                    if(prefs.edit().putString("grant",verified).commit())finish("owned","정식판이 열렸습니다. 다음 시즌은 시즌 결산에서 직접 시작해 주세요.");
                    else finish("error","구매 권한을 기기에 저장하지 못했어요. 저장 공간을 확보한 뒤 구매 복원으로 다시 확인해 주세요. 다시 결제하지 마세요.");
                }else{
                    if(denied)prefs.edit().remove("grant").apply();
                    finish("error","구매 검증을 마치지 못했어요. 인터넷 연결 후 구매 복원으로 다시 확인해 주세요. 다시 결제하지 마세요.");
                }
            });
        });
    }
    private void buy() {
        if(owned()){finish("owned","이미 정식판을 이용 중입니다.");return;}
        if(!configured()||!client.isReady()||product==null||offer==null){refresh();return;}
        busy=true;status="purchasing";message="Google Play 결제 화면에서 상품과 가격을 확인해 주세요.";emit();
        BillingFlowParams.ProductDetailsParams item=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).setOfferToken(offer.getOfferToken()).build();
        BillingResult result=client.launchBillingFlow(activity,BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item)).build());
        if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK){
            busy=false;if(result.getResponseCode()==BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED)refresh();
            else finish("error","결제 화면을 열지 못했어요. 구매 복원으로 상태를 다시 확인해 주세요.");
        }else{
            final int attempt=++generation;
            main.postDelayed(()->{if(!closed&&attempt==generation&&busy){busy=false;refresh();}},120000);
        }
    }
    private void finish(String next,String text){busy=false;status=next;message=text;emit();}
    void close(){closed=true;generation++;main.removeCallbacksAndMessages(null);client.endConnection();network.shutdownNow();}
}
