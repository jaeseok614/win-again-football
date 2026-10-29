# Google Play 출시 준비

## 2026-10-29 — 첫 시즌 체험/정식판 후보

소유자가 **첫 시즌 무료 체험 → ₩4,900 1회 정식판 해제**를 요청했다. Android 1.1.0/code2 후보에는 Play Billing과 서버 서명 검증/복원을 추가한다. 현재 Play의 1.0.0/code1은 무료·결제 없음 상태를 유지한다. 판매자 계정, 실제 상품 `full_game`/구매 옵션 `buy`, 검증 서버와 공개 설정, 라이선스 결제 검증은 판매 활성화에 필요하다. [구현과 활성화 절차](FULL_GAME_UNLOCK_2026-10-29.md). 아래 “광고/결제/네트워크 없음”은 배포된 1.0.0의 기록이며 새 후보의 설명이 아니다.

작성 기준: 2026-10-21. 소유자가 세 가지 앱 생성 선언과 IARC 약관·설문 제출을 승인해 실제 개인 개발자 콘솔에 무료 게임을 생성했다. 앱ID는 `4975868083103535088`, 개발자 표시 이름은 **이번생 게임즈**다. 공개 지원 메일은 소유자가 지정한 `jaeseok614@gmail.com`이다. 실제 IARC 결과는 국내 **전체이용가**, ESRB Everyone, PEGI3이며2026-10-21 09:11 KST 제출을 확인했다. IARC 인증서 번호는 콘솔에 대시로 표시돼 번호를 만들어 기록하지 않았다.

광고 없음·앱 접근 제한 없음·13세 이상 대상·수집/공유 데이터 없음·정부/금융/건강 서비스 해당 없음·광고ID 미사용을 실제 오프라인 코드와 비교해 저장했다. 앱 제목·설명840자·아이콘·피처 그래픽과 최종 빌드의 실제 Android 화면 네 장을 저장했다. 여섯 시각 애셋의 AI 제작·수정 여부도 사실대로 표시했으며 기본 등록정보를 저장한 뒤 비공개 Alpha와 함께 Google 검토에 제출했다. 소유자가 암호를 직접 입력해 앱 전용 업로드 키 생성과1.0.0 AAB의 엄격한 서명 검증을 완료했다. 공개 출시·결제·프로덕션 접근 신청은 실행하지 않았다.

## 2026-10-21 최신 — 비공개 Alpha 게시·무료 모집 진행

콘솔의 출시 세부정보에서 **2026-10-21 오전11:29 KST, 선택한 테스터에게 제공됨**을 확인했다. 코드1/1.0.0의 비공개 Alpha다. 그룹 회원인 소유자 계정으로 Play 참여 링크를 열었을 때 앱 이름·그룹·지원 주소와 **Become a tester** 버튼이 표시됐다. 에이전트가 소유자 계정을 참여 처리하거나 휴대전화 설치를 완료한 것은 아니다. 프로덕션은 비활성이며 공개 출시·결제는 실행하지 않았다.

[그룹 가입](https://groups.google.com/g/win-again-football-testers) → 같은 계정으로 [Play 참여](https://play.google.com/apps/testing/com.jaeseok614.winagainfootball) → 참여 페이지의 공식 설치 링크 순서다. [설치·첫 플레이 안내 공지](https://groups.google.com/g/win-again-football-testers/c/UkV2w23LJtM)를 그룹에 게시했다. 대시보드에서 **현재 참여0명**, 그룹에서 회원1명(소유자)을 다시 확인했다. 게시·조회·봇 댓글을 신규 테스터로 세지 않는다.

| 새 무료 모집 경로 | 실제 결과 |
| --- | --- |
| [r/GooglePlayDeveloper 주간 모집 댓글](https://www.reddit.com/r/GooglePlayDeveloper/comments/1x9wypb/comment/phz2os5/) | 게시 및 직접 링크의 본문 확인. 제거 알림은 없었으나 로그아웃 공개 접근은 미확인 |
| [Disquiet 게임 소개](https://disquiet.io/products/5-1) | 아이콘·실제 Android 화면2장·참여 절차를 등록하고 제출. 제품 승인 대기, 피드 글쓰기는 승인 전 비활성 |
| [r/BetaTests 모집 글](https://www.reddit.com/r/betatests/comments/1xbc5ek/android_korean_football_manager_can_you_follow/) | 본문·실제 Android 화면2장·직접 참여 링크 게시. 상세 화면에 제거 알림 없음. 댓글1개는 AutoModerator |

기존 Reddit2건은 여전히 필터 제거 상태였고 관리자 검토 요청을 반복하지 않았다. Testers Community Hub의 마지막 확인은 승인 대기이며 승인됐다고 주장하지 않는다. 새 문안에는 한국어·가로·Android7.0+·오프라인·무급과 구체적인 경기 가독성·속도·전술/교체·저장 피드백 질문을 명시했다. 계정 없는 itch.io/Discord는 가입·생년월일·약관을 대신 입력하지 않았고 상호 테스트를 요구하는 경로에는 약속하지 않았다.

소유자의 ‘매일 오전10시에 확인하고 이어가기’ 답변에 따라 **매일10:00 Asia/Seoul**의 이 대화 후속 자동화를 활성화했다. 저장된 ACTIVE·heartbeat·매일10시·현재 대화 연결을 읽어 확인했다. 승인/답글/실제 참여를 확인하고 필요한 응대와 적합한 무료 경로 최대1곳의 새 모집을 이어간다. 실제12명 이상 확인 시 신규 모집을 멈추고 모집 자동화를 중지하도록 했다. 연속14일 유지와 실제 의견·프로덕션 접근 승인은 별개다. 변화 없는 실행은 별도 알림을 하지 않는다. 로컬 파일/브라우저 작업에는 PC와 앱 실행이 필요하다. [공식 일정 실행 안내](https://developers.openai.com/training/walkthroughs/scheduled-tasks).

비용0원·신규 사람 피드백 미확인. 제품/키/번들 변경 없이 외부 모집 상태만 추가했다. [기계 기록 및 이전 관찰](FREE_CLOSED_TEST_2026-10-21.json).

## 2026-10-21 오전 — 무료 비공개 Alpha 심사 요청 (이전 관찰)

소유자의 무료 테스터 모집·비공개 테스트 설정 요청에 따라 **비공개 Alpha 1.0.0을 Google 검토에 제출했다.** 자동 검사가 끝난 뒤 콘솔에서 “변경사항을 검토 중입니다”를 확인했다. 아직 승인·설치 가능 상태는 확인하지 않았다. 아래 내부 테스트 초안 기록은 이 제출 이전의 이력이다. 공개 프로덕션 출시·프로덕션 접근 신청·결제는 실행하지 않았다. [실제 외부 상태 기록](FREE_CLOSED_TEST_2026-10-21.json).

| 항목 | 실제 설정/관찰 |
| --- | --- |
| 트랙/출시 | 비공개 Alpha, 트랙4700391144400624721, 출시1, 1.0.0/code1 |
| 번들 | 기존 라이브러리1 (1.0.0)의 서명 검증된 AAB 재사용. 새 키 생성·재빌드 없음 |
| 대상 국가 | 선택 가능한178항목(177개국+기타), 프로덕션 국가와 동기화하지 않음 |
| 참여 자격 | Google 그룹 win-again-football-testers@googlegroups.com 저장 |
| 피드백 | jaeseok614@gmail.com |
| 게시 | 관리형 게시 꺼짐. 승인되면 그룹 참여 자격이 있는 비공개 트랙에 자동 게시 |
| 사람 수 | 설정 시작 시 Play 참여0명. 마지막 그룹 회원1명은 소유자이며 신규 확보 인원이 아님 |
| 남은 요건 | 실제12명 이상의 연속14일 참여 선택 유지·실제 이용 의견·프로덕션 접근 신청 |

[테스터 그룹 가입](https://groups.google.com/g/win-again-football-testers) → 같은 Google 계정으로 [Play 테스트 참여](https://play.google.com/apps/testing/com.jaeseok614.winagainfootball) 순서다. 그룹 가입만으로 Play 참여 인원에 포함되지 않는다. 첫 출시 검토 중에는 Play 링크가 비활성/사용 불가일 수 있다. 내부 테스트에 참여한 계정은 먼저 내부 테스트에서 탈퇴한 뒤 비공개 테스트에 참여한다. [공식 설정 안내](https://support.google.com/googleplay/android-developer/answer/9845334?hl=ko).

그룹은 소유자가 직접 보안문자를 완료해 생성했다. 누구나 그룹에 가입할 수 있고 회원 목록은 소유자만, 대화·게시물은 회원만 볼 수 있다. 한국어/영어 소개와 참여·플레이·저장 이전 안내를 저장했다. 자동화나 AI 경기 실행을 사람 테스터로 세지 않는다.

무료 모집은 r/AndroidClosedTesting와 r/KoreanGameDev에 각각1건 제출했으나 둘 다 Reddit 필터로 제거됐다. 각 관리자에게 검토 요청을1회 보냈으며 공개 노출이나 승인으로 계산하지 않는다. Testers Community Hub에도 자원 모집1건을 제출했고 “메시지가 게시되었지만 승인 대기 중입니다”를 확인했다. 그 커뮤니티는 전체 이메일 구독 없이 가입했다. 대가·보상·상호 앱 테스트를 약속하지 않았고 비용0원이다. 현재 확인된 신규 테스터와 실제 의견은 없다. 자동 필터를 우회하거나 같은 글을 재게시하지 않는다.

제출한16개 변경에는 비공개 출시/국가/테스터/기존 등록정보·등급·콘텐츠 설정이 들어 있다. 기존 대기 항목의 Google Play Games PC 설정도 포함됐지만 이 작업에서 변경하거나 PC 동작을 검증하지 않았다. 난독화 파일 미첨부 경고1개만 있었고 release minifyEnabled=false를 확인했다. 차단 오류는 없었다. 승인·참여자·관리자 회신을 자동 추적하는 예약은 만들지 않았다.

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
네이티브 문서 저장과 실제 파일 입력 불러오기를 검사합니다. 2026-10-20에는 세 API에서 각각32개 검사(실패/오류/건너뛰기0)를 통과했습니다. [증빙](FOOTBALL_RULE14_RELEASE_2026-10-20.json)을 확인하세요. 최종2026-10-21 검증 커밋 `3cb0140`에서 세 API 모두34개 검사(실패·오류·건너뛰기0)를 통과했습니다. Source208 suites/1,536 checks, Python 출시 검사16개, PWA14개와 생성 자산 일치도 완료했습니다. 실제 스토어 캡처에서 발견한 카드 내부 글자 충돌을 기본 최소 글꼴8px에서도 수정했으며 네이티브 판정·시간 제한을 줄이지 않았습니다. [최종 증빙](RELEASE_POLISH_2026-10-21.json)을 확인하세요.

앱은 파일 검증과 첫 화면 로딩 동안 진행 표시를 보여 줍니다. 내보내기 파일을
쓰는 동안에는 진행 중 안내를 표시하며 중복 요청을 막습니다. 계측할 수 없는
작업에 임의의 퍼센트를 표시하지 않습니다.

## 개발자 계정과 테스트 상태 확인

소유자가 이미 개발자 계정 등록과 결제를 진행했습니다. 2026-10-21 실제 콘솔에 앱을 만들고 기본 스토어 등록정보와 콘텐츠 설정 저장을 완료했습니다. 대시보드에서 초기 설정 목록이 사라졌고 내부/비공개 테스트 및 프로덕션 단계가 남았습니다. 설정 시작 시 비공개 테스터0명과12명·연속14일 요건을 확인했습니다. 최신 심사·모집 상태는 위 절을 확인하세요. [Google Play Console](https://play.google.com/console/)에서
남은 계정 확인·연락처·실제 Android 기기 인증 상태를 확인합니다. 등록 결제 완료와
프로덕션 출시 승인은 별개이며 위 날짜의 직접 확인 이후 상태를 자동 추적하지 않습니다.
[Google의 등록 안내](https://support.google.com/googleplay/android-developer/answer/6112435?hl=ko)

개인 명의로 출시하면 새 개인 계정의 비공개 테스트 요건을 적용받습니다.
현재 최소 12명의 테스터가 연속 14일 이상 참여를 선택한 상태를 유지해야
프로덕션 접근을 신청할 수 있습니다. 14일이 끝나면 자동 출시되는 것이 아니라
테스트 과정과 개선 내용을 제출해 승인을 받아야 합니다.
[Google의 테스트 요건](https://support.google.com/googleplay/android-developer/answer/14151465?hl=ko)

## 출시 서명

CI 원본 AAB는 미서명 파일입니다.2026-10-21에는 소유자가 암호를 직접 입력해 별도 업로드 키를 생성하고 엄격한 서명 검증을 마친1.0.0/code1 번들을 실제 내부 테스트 초안에 업로드·저장했습니다. 콘솔에 API24이상/대상36과 “변경사항이 저장되었습니다”를 확인했습니다. 당시 내부 테스터 배포는 시작하지 않았고 이후 같은 번들로 비공개 Alpha의 검토를 요청했습니다. 이후 업데이트에도 소유자의 업로드 키로 서명한 번들이 필요합니다. 소유자가 Android Studio의 **Build → Generate Signed App
Bundle / APK → Android App Bundle**에서 업로드 키를 만들고 서명한 번들을
생성합니다. 키는 저장소 밖의 안전한 곳에 보관하고 별도 백업하세요. 비밀번호와
키 파일은 Git에 올리지 않습니다. Google Play 앱 서명에서 Google이 배포 서명을
관리하고, 소유자는 향후 업데이트에 같은 업로드 키를 사용합니다.
[공식 앱 서명 안내](https://developer.android.com/studio/publish/app-signing)

Windows용 `source/release/sign-play-bundle.ps1`도 준비했다. 검증한 AAB의 SHA-256을 필수로 받으며, 키 파일은 프로젝트 밖에만 두고 기존 키·출력 파일을 덮어쓰지 않는다. 새 키는 명시적 `-CreateUploadKey`에서만 만든다. 비밀번호는 로컬 보안 프롬프트에서 직접 입력하고 명령행·파일·Git·보고서에 기록하지 않는다. 고정 키로 JAR 서명 후 JDK의 엄격 검증을 통과해야 최종 파일로 옮긴다. 임의 파일 추가와 변조를 거부하는 실제 미서명 AAB 대상10개 종단 검사를 통과했다. 이 검사의 임시 QA 키는 출시 키가 아니다. 별도 승인 뒤 소유자가 암호를 직접 입력해 실제 앱 전용 키를 프로젝트 밖에 만들었으며, 서명 AAB의90개 비서명 항목 전체 바이트가 검증한 원본과 같은 것도 확인했다. 키와 암호는 Git·Drive에 올리지 않았다. 공개 인증서만 별도로 내보낼 수 있고 이 도구는 네트워크 전송·Play 제출 기능이 없다.

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

## 2026-10-21 실제 저장된 내부 테스트 초안

[출시 준비 화면](https://play.google.com/console/u/0/developers/6961410092466748418/app/4975868083103535088/tracks/4701521581602929051/releases/1/prepare)에 **1.0.0 내부 테스트 · 가로 감독실**을 임시보관했다. 업로드된 App bundle은 **1 (1.0.0)**, API24이상/타겟36으로 표시됐다. 출시 노트와 번들을 저장한 뒤 변경사항 저장 완료·저장 버튼 비활성을 확인했다. 테스터 배포 시작·공개 검토 전송·프로덕션 신청은 실행하지 않았다.

서명본은5,714,011바이트, SHA256`eb6ecf319ac05a37c746efe09a10f53af33654112544c887c30450c2fa4b3a6c`다. 업로드 공개 인증서 SHA256은`5f2514c2c37c52cc9b7a765548fd7b206fa2c295e93fb61c3148bf08885fdb3b`다.90개 비서명 ZIP항목과 내부 게임 전체 바이트는 원본과 같다. 공개 인증서와 개인 키를 혼동하지 않는다. 실제 키 파일·암호는 저장소와Drive에 없으며 소유자가 업데이트용으로 별도 안전한 백업을 관리한다. 자동 생성 보고서의playSubmitted=false는 로컬 서명 도구 자체가 업로드하지 않았다는 뜻이며 실제 콘솔 업로드 상태는 최종 증빙의play.internalDraft를 따른다.
