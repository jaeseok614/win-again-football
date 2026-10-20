# Google Play 출시 준비

작성 기준: 2026-10-21. 실제 로그인한 개인 개발자 콘솔에서 생성된 앱이 없음을 확인하고 새 앱 폼에 아래 이름·패키지·한국어·게임·무료를 입력했다. 패키지는 사용 가능으로 표시됐다. 개발자 정책 선언·Play 앱 서명 약관·미국 수출법 동의는 미선택이며 앱 생성·심사 제출·프로덕션 공개는 아직 하지 않았다. 약관 동의는 소유자의 최종 확인이 필요하다.

## 준비한 앱

| 항목 | 설정 |
| --- | --- |
| 앱 이름 | 눈 떠보니 5부 리그 감독! 토투넘 1부 귀환기 |
| 출시 패키지 | `com.jaeseok614.winagainfootball` |
| 버전 | `1.0.0`, versionCode `1` |
| 최소 Android | Android 7.0 / API 24 |
| 대상 Android | Android 16 / API 36 |
| 배포 파일 | Android App Bundle (`.aab`) |
| 검토용 파일 | 디버그 APK (`.debug` 패키지, 출시 앱과 분리) |
| 공개 지원 이메일 | `jaeseok614@gmail.com` (소유자가2026-10-21 지정) |
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

AAB의 실제 바이너리 manifest·패키지·API·가로 고정·오프라인 게임 해시는 다음으로 확인합니다.

```sh
python3 -m unittest source.release.test_verify_play_bundle
python3 source/release/verify_play_bundle.py android/app/build/outputs/bundle/release/app-release.aab --assets android/app/src/main/assets/game
```

이 검사는 서명자의 신원이나 암호학적 서명 검증을 대신하지 않습니다. 서명한 최종 번들은 JDK의 `jarsigner -verify -strict -verbose -certs`와 Play의 실제 업로드 결과도 확인해야 합니다. CI 번들은 의도적으로 미서명이며 업로드 키를 새로 만들거나 저장소에 넣지 않습니다.

생성 파일:

- `android/app/build/outputs/apk/debug/app-debug.apk`: Android 기기에 직접 설치하는 검토용 앱.
- `android/app/build/outputs/bundle/release/app-release.aab`: 아직 서명하지 않은 출시 번들.
- `android/app/src/main/assets/game/build-info.json`: 포함한 게임의 크기와 SHA-256.

`.github/workflows/android.yml`은 PR 변경, main push 또는 수동 실행으로 APK,
미서명 AAB, Android lint 결과를 빌드하고 GitHub Actions artifact로 보관합니다.
공개 배포 또는 Play 업로드는 자동으로 실행하지 않습니다. 에뮬레이터 검증은
API 34·35·36에서 오프라인 실행, 저장·구단 복원, 일시 정지, 뒤로 가기, 앱 다시 시작,
네이티브 문서 저장과 실제 파일 입력 불러오기를 검사합니다. 2026-10-20에는 세 API에서 각각32개 검사(실패/오류/건너뛰기0)를 통과했습니다. [증빙](FOOTBALL_RULE14_RELEASE_2026-10-20.json)을 확인하세요. 최신 추가 검사는 아직 최종 CI 결과를 확인 중입니다. CI가 성공하기
전에는 Android 컴파일이나 기기 테스트를 통과했다고 보고하지 마세요.

앱은 파일 검증과 첫 화면 로딩 동안 진행 표시를 보여 줍니다. 내보내기 파일을
쓰는 동안에는 진행 중 안내를 표시하며 중복 요청을 막습니다. 계측할 수 없는
작업에 임의의 퍼센트를 표시하지 않습니다.

## 개발자 계정과 테스트 상태 확인

소유자가 이미 개발자 계정 등록과 결제를 진행했습니다. 2026-10-21 실제 콘솔의 첫 앱 만들기 화면을 확인했습니다. [Google Play Console](https://play.google.com/console/)에서
남은 계정 확인·연락처·실제 Android 기기 인증 상태를 확인합니다. 등록 결제 완료와
프로덕션 출시 승인은 별개이며 위 날짜의 직접 확인 이후 상태를 자동 추적하지 않습니다.
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
3. 공개 지원 연락처: 소유자가 직접 지정한 `jaeseok614@gmail.com`을 사용합니다.
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

**제목:** 눈 떠보니 5부 리그 감독! 토투넘 1부 귀환기

공백·문장부호를 포함해 26자입니다. 하부 리그 감독의 상황과 목표를
표현하면서 Google Play의 제목 30자 제한 안에 맞췄습니다.
[공식 메타데이터 정책](https://support.google.com/googleplay/android-developer/answer/9898842?hl=ko)

정확한 등록 문구는 [listing-ko-KR.txt](play-store-draft/listing-ko-KR.txt)에 있습니다. 짧은 설명과 상세 설명은5부 시작·네 번의 승격·연속 경기·기기 저장 등 실제 현재 기능을 기준으로 썼습니다. 제목26자/설명80자/상세4000자 및 그림 규격은 아래 명령으로 검사합니다.

```sh
python3 source/release/verify_store_assets.py
```

공식 [미리보기 애셋 안내](https://support.google.com/googleplay/android-developer/answer/9866151?hl=ko)는 기본 스토어 게시 요건과 추천용 권장 규격을 구분합니다. 이 프로젝트는 실제 앱의1920×1080/16:9 화면을 네 장 촬영하도록 계측 검사를 추가했습니다. 최종 CI에서 성공한 원본 화면만 출시 자료에 복사하고, 알파 채널 제거가 필요하면 불투명도를 먼저 확인하고 RGB 값·해상도는 그대로 보존합니다. 웹 목업이나 확대 그림을 Android 화면으로 표시하지 않습니다.

피처 그래픽은1024×500 RGB PNG, 아이콘은512×512 RGBA PNG입니다. 홍보 그림에는 현재5부 제목과 네 번의 승격을 표시했습니다. FM의 로고·화면·대사를 스토어에 재사용하지 않습니다.
