# Google Play 출시 준비

작성 기준: 2026-10-02. 현재 소유자는 Google Play 개발자 계정이 없습니다.
이 저장소는 실제 Android 앱을 빌드할 수 있도록 준비한 상태이며, Play에
게시하거나 심사에 제출한 상태는 아닙니다.

## 준비한 앱

| 항목 | 설정 |
| --- | --- |
| 앱 이름 | 눈 떠보니 5부 리그 감독이었다! 이번 생엔 우승한다 |
| 출시 패키지 | `com.jaeseok614.winagainfootball` |
| 버전 | `1.0.0`, versionCode `1` |
| 최소 Android | Android 7.0 / API 24 |
| 대상 Android | Android 16 / API 36 |
| 배포 파일 | Android App Bundle (`.aab`) |
| 검토용 파일 | 디버그 APK (`.debug` 패키지, 출시 앱과 분리) |
| 수익화·로그인 | 광고, 결제, 계정, 분석 SDK 없음 |
| 인터넷 | 게임이 앱에 포함되어 오프라인 실행, 네트워크 권한 없음 |
| 저장 | 기기 내부 자동 저장, 시스템 문서 선택기로 JSON 내보내기·불러오기 |

실제 게임 파일은 앱의 `assets/game/index.html`에 들어갑니다. 웹 주소를
열어야 플레이할 수 있는 방식이 아닙니다. 웹 게임과 저장 형식을 공유하며
웹에서 내보낸 구단 파일을 앱에서 불러올 수 있습니다. 브라우저 저장은
앱으로 자동 이전되지 않으므로 기존 구단은 먼저 JSON으로 내보내세요.

디버그 앱과 출시 앱은 패키지와 서명이 다릅니다. 테스트 구단을 출시 앱으로
옮길 때도 JSON 파일을 사용합니다. 디버그 앱을 출시 앱으로 덮어 설치하지
마세요. 같은 디버그 앱을 나중에 새 CI 키로 다시 빌드하면 기존 디버그 APK와
서명이 달라질 수 있으므로 삭제 전에 구단을 내보내세요.

## 빌드와 검증

JDK 17, Node.js, Android SDK 36이 필요합니다. Android Studio에서 `android/`
폴더를 프로젝트로 열 수 있습니다. 버전은 Gradle 8.13, Android Gradle Plugin
8.13.2로 고정했고 공식 Wrapper JAR와 ZIP의 SHA-256을 검증합니다.

저장소 최상위에서:

```sh
node source/run-tests.cjs
node source/build-android.cjs
cd android
bash ./gradlew assembleDebug bundleRelease lintDebug
```

Windows에서는 마지막 줄에 `gradlew.bat assembleDebug bundleRelease lintDebug`를
사용합니다. Gradle의 preBuild가 최신 공유 게임을 다시 묶으므로 별도로 생성한
웹 파일이 오래되어도 앱에는 현재 모듈 소스가 들어갑니다.

생성 파일:

- `android/app/build/outputs/apk/debug/app-debug.apk`: Android 기기에 직접 설치하는 검토용 앱.
- `android/app/build/outputs/bundle/release/app-release.aab`: 아직 서명하지 않은 출시 번들.
- `android/app/src/main/assets/game/build-info.json`: 포함한 게임의 크기와 SHA-256.

`.github/workflows/android.yml`은 PR 변경, main push 또는 수동 실행으로 APK,
미서명 AAB, Android lint 결과를 빌드하고 GitHub Actions artifact로 보관합니다.
공개 배포 또는 Play 업로드는 자동으로 실행하지 않습니다. 에뮬레이터 검증은
API 35에서 오프라인 실행, 저장·구단 복원, 일시 정지, 뒤로 가기, 앱 다시 시작,
네이티브 문서 저장과 실제 파일 입력 불러오기를 검사합니다. CI가 성공하기
전에는 Android 컴파일이나 기기 테스트를 통과했다고 보고하지 마세요.

앱은 파일 검증과 첫 화면 로딩 동안 진행 표시를 보여 줍니다. 내보내기 파일을
쓰는 동안에는 진행 중 안내를 표시하며 중복 요청을 막습니다. 계측할 수 없는
작업에 임의의 퍼센트를 표시하지 않습니다.

## 개발자 계정 만들기

소유자가 [Google Play Console](https://play.google.com/console/signup)에 가입하고
계약 동의·결제·신원 확인을 직접 진행합니다. 현재 등록비는 한 번만 내는 미화
25달러입니다. 새 개인 계정은 실제 Android 기기 인증도 필요합니다.
[Google의 등록 안내](https://support.google.com/googleplay/android-developer/answer/6112435?hl=ko)

개인 명의로 출시하면 새 개인 계정의 비공개 테스트 요건을 적용받습니다.
현재 최소 12명의 테스터가 연속 14일 이상 참여를 선택한 상태를 유지해야
프로덕션 접근을 신청할 수 있습니다. 14일이 끝나면 자동 출시되는 것이 아니라
테스트 과정과 개선 내용을 제출해 승인을 받아야 합니다.
[Google의 테스트 요건](https://support.google.com/googleplay/android-developer/answer/14151465?hl=ko)

## 출시 서명

현재 CI AAB는 미서명 파일입니다. Play에 제출하려면 소유자의 업로드 키로 서명한
번들이 필요합니다. 소유자가 Android Studio의 **Build → Generate Signed App
Bundle / APK → Android App Bundle**에서 업로드 키를 만들고 서명한 번들을
생성합니다. 키는 저장소 밖의 안전한 곳에 보관하고 별도 백업하세요. 비밀번호와
키 파일은 Git에 올리지 않습니다. Google Play 앱 서명에서 Google이 배포 서명을
관리하고, 소유자는 향후 업데이트에 같은 업로드 키를 사용합니다.
[공식 앱 서명 안내](https://developer.android.com/studio/publish/app-signing)

패키지 ID는 Play 등록 후 쉽게 바꿀 수 없으므로 첫 업로드 전에 이름을 확인합니다.
업데이트마다 `versionCode`를 증가시키고 `versionName` 및 `build-android.cjs`의
메타데이터 버전도 맞춥니다. 개발 키로 서명한 APK를 Play의 출시 서명으로 사용하지
마세요. 별도 키 생성이나 비밀 정보 업로드는 현재 자동화에 포함되어 있지 않습니다.

## Play Console에 넣을 내용

1. 새 앱 생성: 앱/게임 중 **게임**, 언어 한국어, 광고 없음.
2. 스토어 정보: 제목·짧은 설명·상세 설명, 앱 아이콘, 그래픽, 실제 Android 화면.
   `docs/play-store-draft/`에 512×512 아이콘과 1024×500 피처 그래픽 초안 및
   편집 가능한 SVG를 준비했습니다. 피처 그래픽은 홍보 그림입니다. 스크린샷은
   앱에서 직접 촬영한 화면을 사용하고 첫 공개 전에 문구와 최종 이름을 맞춥니다.
3. 지원 연락처: 소유자가 공개할 이메일을 입력합니다. 기존 Git 인증 이메일을
   자동으로 등록하거나 공개하지 않습니다.
4. 앱 콘텐츠: 접근 제한 없음, 로그인 불필요, 데이터 보안, 콘텐츠 등급 설문,
   대상 연령과 광고 여부를 현재 앱 기능에 맞춰 작성합니다.
5. 개인정보처리 안내: `docs/PRIVACY_POLICY.md` 내용을 실제 앱과 비교하고,
   접근 가능한 공개 웹 URL로 게시하여 Play Console에 연결합니다.
6. 서명한 AAB를 내부 테스트에 먼저 올리고, 실제 기기 사전 출시 보고서와 구단
   저장·복원을 확인합니다. 다음으로 비공개 테스트를 열고 참여자를 모집합니다.
7. 비공개 테스트 요건 충족 후 프로덕션 접근을 신청하고, 승인 뒤 출시를 제출합니다.

현재 코드에는 개발자 서버로 데이터를 보내거나 광고·분석 SDK로 수집하는 기능이
없습니다. 데이터 보안 설문에는 이 사실을 반영하되, 향후 SDK나 로그인·온라인
저장을 추가할 때 다시 평가합니다. 사용자가 직접 외부 문서 제공자를 골라 저장하는
행위는 해당 제공자의 동작도 확인해야 합니다.
[Google의 데이터 보안 안내](https://support.google.com/googleplay/android-developer/answer/10787469?hl=ko)

현재 신규 일반 모바일 앱은 API 36 이상을 대상으로 제출하도록 준비했습니다.
요건은 출시 시 다시 확인합니다.
[공식 대상 API 요구사항](https://developer.android.com/google/play/requirements/target-sdk)

## 스토어 문구 초안

**제목:** 눈 떠보니 5부 리그 감독이었다! 이번 생엔 우승한다

공백·문장부호를 포함해 29자입니다. 애니메이션·라이트노벨처럼 상황과 목표를
표현하면서 Google Play의 제목 30자 제한 안에 맞췄습니다.
[공식 메타데이터 정책](https://support.google.com/googleplay/android-developer/answer/9898842?hl=ko)

**짧은 설명:** 전술과 선수 육성, 감독의 한마디로 구단을 성장시키는 오프라인 축구 게임

**상세 설명:**

나만의 구단을 이끌고 리그와 토너먼트에 도전하세요. 선발과 전술을 정하고,
경기 중 교체와 작전으로 흐름을 바꾸며 선수와 코치를 성장시킬 수 있습니다.
감독의 대화와 가상 언론 소식을 통해 시즌 이야기를 이어갑니다.

게임은 인터넷 연결 없이 플레이할 수 있습니다. 구단은 현재 기기에 자동으로
저장되며, JSON 파일을 내보내거나 불러와 다른 기기에서 이어할 수 있습니다.
광고, 인앱 결제, 가입 절차가 없습니다. 선수·코치·구단·기사는 게임 속 가상
콘텐츠입니다.

문구는 실제 출시 기능과 최종 대조합니다. 스토어에 FM의 로고·스크린샷·등록상표를
사용하거나 공식 관련 앱이라고 표시하지 않습니다.
