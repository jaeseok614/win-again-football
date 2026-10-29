# 구매 검증 서버 설정

현재 **배포 전**이다. 상품/판매자 프로필/실제 Play 테스트 결제는 완료하지 않았다. Android 구매 설정도 비어 있어 기존 후보의 실제 구매는 비활성이다. 사용자 비용 선호에 따라 Workers **Free**를 우선 후보로 준비했다. 기존 Cloud Run Docker 경로도 유지한다.

## 과금 없이 테스트하기

- 같은 Play 계정이 라이선스 테스터에 실제 저장됐는지 확인한다. 일반 비공개 트랙 참여와 라이선스 테스트는 별개다.
- 결제창에 테스트 안내가 있고 `Test card, always approves` 등 Google 테스트 수단을 선택한 경우만 진행한다. 실제 카드/실제 결제 테스트 기능을 사용하지 않는다.
- 테스트 패키지는 `com.jaeseok614.winagainfootball`이어야 한다. 기존 `.debug` 미리보기 APK는 실제 상품 테스트를 대신하지 않는다.
- 승인/거절/지연/재시작/복원/테스트 주문 취소를 검증한다. 모의 테스트 통과를 Google 결제 검증 완료로 기록하지 않는다.
- 공개 모집은 계속 무료·무보상·맞교환 약속 없음. 일반 모집자에게 구매나 테스트 결제를 요구하지 않는다.

## Workers Free 배포 전 필수 단계

1. Cloudflare에 로그인한다. **Workers Free**임을 계정 화면에서 확인한다. 기존 유료 계정이면 이 구성만으로 무료가 되지 않는다. 유료 전환·카드 등록·추가 유료 리소스를 만들지 않는다. 무료 workers.dev 호스트를 쓰며 도메인을 구매하지 않는다.
2. Google Cloud 프로젝트와 Google Play Android Developer API를 준비한다. 서비스 계정은 이 앱에 한정해 `View financial data, orders, and cancellation survey responses` 및 `Manage orders and subscriptions`를 부여한다. 계정 전체 관리자/출시 권한은 주지 않는다. 이 권한에는 주문 관리 능력이 있어 실제 부여 직전 소유자의 확인이 필요하다.
3. Workers에서는 Cloud Run 메타데이터 인증을 사용할 수 없다. 서비스 계정 JSON 비밀키를 Cloudflare의 **암호화된 Worker secret** `GOOGLE_SERVICE_ACCOUNT_JSON`으로 보관한다. Google 인증 토큰을 발급하는 데만 쓴다. 이 자격 증명을 Cloudflare에 보관하기 전에 소유자가 목적/보관 위치를 확인해야 한다. Git·채팅·Drive·앱·일반 환경변수에 붙이지 않는다. 메일함/Drive 접근 권한이나 도메인 전체 위임은 필요 없다.
4. 별도 RSA2048 이상 PKCS8 서명키를 생성해 Worker secret `ENTITLEMENT_PRIVATE_KEY_PEM`에 보관한다. Google 서비스 계정 키와 같은 키를 재사용하지 않는다. 라이선스 환경과 출시 환경도 서명키를 분리한다. 실제 키는 아직 생성하지 않았다.
5. 공식 Wrangler를 사용할 수 있는 환경에서 먼저 `wrangler deploy --dry-run --config billing-server/wrangler.jsonc`로 번들 검사를 한다. 이 저장소의 Node 모의 검사만으로 Workers 실행/10ms CPU 한도를 검증했다고 간주하지 않는다.
6. 최초 배포는 `wrangler deploy --config billing-server/wrangler.jsonc --env license`. 이때 `ENABLE_VERIFICATION=false`이므로 `/verify`는503이다. `wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON --config billing-server/wrangler.jsonc --env license`와 `wrangler secret put ENTITLEMENT_PRIVATE_KEY_PEM --config billing-server/wrangler.jsonc --env license`로 소유자가 비밀값을 안전하게 주입한다. 명령 인수나 로그에 비밀값을 넣지 않는다.
7. 계정 요금제/권한/비밀값을 확인한 뒤 **license 환경만** ENABLE_VERIFICATION=true로 배포한다. 이 환경은 ALLOW_LICENSE_TEST_PURCHASES=true다. 출시 환경은 두 값을 기본 false로 두며 테스트 구매를 매출 권한으로 허용하지 않는다. 환경별 secret은 자동 상속되지 않으므로 각각 주입한다.
8. 실제 HTTPS `/health`, 잘못된 요청, Google 접근 거절, 라이선스 구매 승인/복원/취소 및 첫 요청/후속 요청 CPU를 확인한다. Free의 CPU 한도에서 실패하면 유료 전환으로 우회하지 말고 소유자에게 결과를 보고한다. 검증 성공 뒤 실제 URL과 X509 DER RSA **공개키**만 Gradle 설정에 넣어 기존 키로 새 AAB를 서명한다. 새 버전의 개인정보 안내/데이터 보안도 실제 보존 설정과 일치시킨다.

## 비용과 동작 제한

[Workers Free 공식 요금](https://developers.cloudflare.com/workers/platform/pricing/): 하루100,000요청/호출당10ms CPU. [일일 한도](https://developers.cloudflare.com/workers/platform/limits/#daily-requests)에 도달하면1027오류로 중단된다. Free 요금제를 유지하는 것이 비용 제한의 전제이며 이 JSON 설정은 계정 요금제를 변경하지 않는다. KV/D1/R2/유료 로그/유료 도메인은 사용하지 않는다. 관측 로그는 설정에서 비활성이다. Cloudflare/Google 자체 운영 로그는 각 제공자의 정책을 따르며 앱 토큰 본문을 기록하는 코드는 없다.

Worker 자체에는8KiB 본문·동시16건·신뢰된 CF-Connecting-IP당 분30회 제한이 있다. 자체 제한은 isolate 단위여서 전역 방화벽이나 일일 Free 한도를 대체하지 않는다. 한도/장애 시 새 구매·복원이 실패할 수 있고 기존 서명 권한의 최대7일 오프라인 기한은 유지한다.

Cloud Run은 무료 한도가 있어도 과금 계정이 필요하며 예산 알림/최대 인스턴스가 지출을0원으로 보장하지 않는다. 비용 선호가 바뀌기 전에는 과금 계정 연결/유료 업그레이드를 진행하지 않는다.

## 판매자·상품 선행 조건

Console에서 판매자 결제 프로필을 만든 다음 Billing 포함 버전을 내부 테스트 등 트랙에 게시해야 한다. 현재 Alpha/code1은 무료 그대로다. 후보code2는 기존 업로드 키로 소유자가 암호를 직접 입력해 서명해야 한다. 상품 값은 `product-plan.json`에 준비했다. 실제 상품 생성/활성화 전에는 준비 파일을 완료 증빙으로 사용하지 않는다. code2를 한 번 업로드했다면 이후 실제 서버 설정 빌드는 versionCode를 올린다.

## 로컬 검증

`node source/test-billing-worker.cjs` 및 `node source/test-full-game.cjs`. 합성 키/토큰과 Google 모의 응답만 사용한다. 실제 결제/배포/비용 발생이 없다. 기존 전체 source 검사는 `node source/run-tests.cjs`다.

공식 근거: [Play 테스트 결제](https://developer.android.com/google/play/billing/test), [Play API 권한](https://developers.google.com/android-publisher/getting_started), [서비스 계정 OAuth](https://developers.google.com/identity/protocols/oauth2/service-account), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Node crypto 지원](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/).
