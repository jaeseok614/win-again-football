# 첫 시즌 무료 체험 · 정식판 1회 해제

소유자의 2026-10-29 요청과 가격 답변에 따라 **첫 시즌 무료 → 정식판 ₩4,900 1회 구매**로 Android 1.1.0/code2 후보를 구현했다. 현재 Play에 배포된 1.0.0/code1은 그대로 무료이며 결제 기능이 없다. 이 문서는 새 후보에 관한 설계와 활성화 절차다. 판매 시작이나 Play 실결제 검증 완료를 뜻하지 않는다.

## 플레이 범위

첫 시즌의 리그·컵과 시즌 결산을 모두 무료로 제공한다. 두 번째 시즌 시작부터 영구 이용권 `full_game`이 필요하다. 새 삶의 첫 시즌과 독립 전술 연습은 무료다. 선수 능력·물리·승패·환생·무료 마지막 유예를 결제 유도 목적으로 바꾸지 않는다. 첫 진입에 체험 범위를 안내하며 **저장·정식판 → 정식판 구매·복원**에서 다시 확인한다.

구매 후에도 시즌은 자동으로 넘어가지 않는다. 시즌 결산에서 사용자가 시작해야 한다. 기존/외부 파일의 두 번째 시즌 이후 구단은 열람·저장·내보내기를 유지하며, 경기 시작·재개·진행·결과 확정 및 다음 시즌 시작은 구매 복원까지 멈춘다. 미확인 자동 진행은 일시 정지할 뿐 물리 기록을 다시 계산하지 않는다. 저장 키 `win-again-season-v17`, schema10과 공개 물리1–14를 유지한다.

이번 변경은 Google Play Android 전용이다. 공개 웹/PWA에는 결제·체험 제한을 넣지 않으며 생성물의 6,320,000바이트 상한도 유지한다. 웹 구단 파일은 Android에서 불러올 수 있지만 유료 권한을 옮기거나 위조할 수 없다. 오프라인 클라이언트의 변조 자체를 완전히 방지한다고 주장하지 않는다.

## 구매와 복원

Play Billing 9.1.0의 비소모성 INAPP 상품 하나만 사용한다. 구매 옵션 ID는 `buy`로 고정하고 대여·사전 예약 옵션은 거부한다. 구독·소비·반복 결제를 구현하지 않는다. 실제 표시 가격은 ProductDetails의 지역별 가격이며 코드에 가격을 임의 표시하지 않는다. 한국 기본 가격은 소유자가 정한 ₩4,900으로 Console에 설정해야 한다.

앱 시작/복귀와 **구매 복원**에서 `queryPurchasesAsync`로 확인한다. PURCHASED만 서버로 검증하며 PENDING·취소·오류에는 권한을 주지 않는다. 이미 소유한 상품은 재구매 대신 복원을 시도한다. 중복 요청·오래된 비동기 결과·시간 초과를 처리한다. 상품/서버 설정이 없으면 구매 버튼을 비활성화하고 첫 시즌 무료 체험을 제공한다.

구매 토큰은 네이티브 HTTPS 경로로만 서버에 전달하며 JS·구단 JSON·로그에 노출하지 않는다. 서버가 Google Play Developer API `purchases.products.get`으로 패키지/상품/구매·소비 상태를 확인하고 `acknowledge`한 뒤, 설치 식별자·일회성 nonce·상품·최대 7일 만료가 담긴 RS256 확인서를 반환한다. 서버는 구매 토큰/구단을 저장하지 않는다. 클라우드 운영 로그는 배포할 호스팅의 정책을 별도로 확인해야 한다.

앱은 고정 공개키·서명·설치 식별자·nonce·발급/만료를 검증한 확인서만 앱 전용 저장소에 보관한다. 같은 Google Play 계정으로 재설치/다른 기기에서 복원할 수 있다. 권한은 최대 7일간 오프라인 유효하며, 이후 인터넷 연결로 다시 확인한다. 온라인 Play 조회에서 소유권이 사라졌거나 서버가 취소를 확인하면 캐시를 폐기한다. 조회 장애만으로 아직 유효한 확인서를 지우지 않는다. 환불 즉시 모든 오프라인 기기에서 차단되는 구조는 아니며 최대 7일의 지연이 있다. 서버 서명키·서비스 계정 비밀키는 앱/저장소에 포함하지 않는다.

WebView의 CSP `connect-src 'none'`, 로컬 원점/주 프레임/현재 문서 검증과 파일 접근 차단을 유지한다. 별도의 `WinAgainBilling` 메시지 채널은 `status/buy/restore` 세 동작만 수신한다. INTERNET 및 BILLING 권한을 추가했으며 네트워크 게임이나 분석 SDK를 추가하지 않는다.

Billing SDK의 Google DataTransport 의존성이 일반 권한 ACCESS_NETWORK_STATE를 병합한다. 실제 번들 검사는 INTERNET/ACCESS_NETWORK_STATE/BILLING과 AndroidX 앱 전용 서명 권한만 허용하며 위치·주소록 등은 거부한다. 앱은 위치 권한을 선언하거나 요청하지 않는다. Google SDK의 결제 운영·보안·진단 통신은 Google 정책을 따르므로 “모든 데이터가 기기 밖으로 전혀 나가지 않는다”는 안내를 새 버전에 사용하지 않는다.

## 판매 활성화에 필요한 실제 설정

후속: 소유자1명 전용 라이선스 테스트 목록 생성/선택/최종 저장을 Console에서 확인했다. 전용 Google Cloud 프로젝트 `win-again-billing`은 생성했지만 API 사용 약관 승인/활성화·서비스 계정/키/권한·Cloudflare 로그인/배포는 남아 있다. 판매자 등록 iframe은 로딩에서 멈추며 상품 페이지는 판매자 프로필 선행 조건으로 잠겼다. 비용 회피용 [Workers Free 배포안](../billing-server/README.md)과 [상품 확정 입력값](../billing-server/product-plan.json)을 준비했다. 실제 판매자/상품/서버 설정 완료를 뜻하지 않는다. 실제 결제는 라이선스 테스터의 Google 테스트 카드로 검증할 수 있어 ₩4,900을 직접 낼 필요가 없다.

2026-10-29 Console에는 판매자 계정 설정 안내가 남아 있다. 계정 소유자가 판매자 결제 프로필·신원/은행·약관 단계를 직접 완료해야 한다. 기존 앱은 무료로 유지하며 앱 자체를 유료로 바꾸지 않는다.

Google의 [판매 준비 절차](https://developer.android.com/google/play/billing/getting-ready)에 따르면 상품 설정 기능을 열려면 Billing 라이브러리가 포함된 버전을 내부 테스트 등의 트랙에 먼저 게시해야 한다. 현재 code1에는 Billing이 없다. 소유자 결제 프로필 준비 후 이 후보 code2를 기존 키로 서명해 **개발자용 내부 테스트**에 먼저 게시하고, 일반 무료 모집 Alpha/code1은 유지한다. 기본 후보의 실제 구매 버튼은 비활성이다. 이어 아래 상품·서버·공개 설정을 넣은 최종 빌드는 이미 사용한 code2를 재사용하지 않고 versionCode를 올려야 한다. 이 선행 게시·서명도 이번 작업에서는 실행하지 않았다.

1. Play Console에서 일회성 상품 `full_game`과 영구 구매 옵션 `buy` 생성. 표시명 **정식판**, 설명 **두 번째 시즌 이후와 모든 새 삶을 계속 즐기는 영구 이용권**, 한국 가격 **₩4,900**. 구독/대여/소비형 상품으로 만들지 않는다.
2. `billing-server/server.cjs`를 HTTPS 호스팅에 배포한다. 제공 Dockerfile은 Node22, 외부 npm 의존성 없음. Cloud Run/GCE workload identity를 사용한다. 새 프로젝트·과금 계정·보안 권한은 자동 생성하지 않았다.
3. 프로젝트에서 Google Play Developer API를 활성화하고 서버 실행 계정에 이 앱 구매 조회/관리 권한만 부여한다. RSA2048 이상 서명키를 Secret Manager의 `ENTITLEMENT_PRIVATE_KEY_PEM`으로 주입한다. 키 생성/권한 부여/배포는 현재 완료되지 않았다. `GET /health`, `POST /verify` 외 경로는 제공하지 않는다. 요청8KiB·응답 no-store·시간 제한·동시16개·소켓 주소당 분30회 제한을 둔다. 프록시 앞에서는 호스팅의 신뢰된 IP 제한도 설정한다. 요청 본문/토큰 로깅을 켜지 않는다.
4. Gradle 공개 설정 `-PbillingVerificationUrl=https://<실제호스트>/verify`, `-PbillingEntitlementPublicKey=<서명키의 X509 DER 공개키 base64>`를 주어 빌드한다. 비밀키를 이 인수로 넣지 않는다. 기본 CI 후보는 설정이 비어 있어 실제 구매가 비활성이다.
5. 소유자의 라이선스 테스트 계정을 Console에 설정한 별도 검증 환경에서는 `ALLOW_LICENSE_TEST_PURCHASES=true`를 사용한다. 테스트 구매를 실제 매출로 세지 않는다. 일반 무료 모집 테스터에게 결제를 요구하지 않는다.
6. 실제 Play 배포 패키지에서 테스트 결제 승인/취소/지연 승인·재시작·중복 탭·앱 데이터 삭제 후 복원·다른 기기/같은 계정 복원·환불·오프라인 만료를 검증한다. `.debug` APK는 출시 패키지와 다르므로 실제 상품 구매 검증을 대신하지 않는다.
7. 새 버전의 스토어 설명(첫 시즌 무료/인앱 구매), 개인정보 안내와 Play 데이터 보안(구매 기록·임의 설치 식별자의 검증 전송)을 실제 서버 보존 설정에 맞춰 갱신한다. 기존 업로드 키로 최종 AAB 서명 후 비공개 트랙 검증을 거쳐 출시한다. 이번 작업에서 판매자 계약·과금 호스팅 개설·상품 활성화·Play 새 버전 제출은 하지 않았다.

## 공식 참고

- [Play Billing 통합/9.1.0](https://developer.android.com/google/play/billing/integrate)
- [구매 검증과 보안](https://developer.android.com/google/play/billing/security)
- [서버 구매 조회 API](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/get)
- [서버 구매 확인 API](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/acknowledge)

실제 실행한 검사와 결과는 HANDOFF 최신 절에 기록한다. 모의 서버·서명 검사는 실결제, KYC, 배포, 매출을 증명하지 않는다.
