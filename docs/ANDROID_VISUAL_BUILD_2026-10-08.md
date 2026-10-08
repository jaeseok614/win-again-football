# 구단 이미지·경기 움직임 Android 검증 결과

게임 코드 커밋 `66311a406182c416ac067375507f3a21abd030c8`을 GitHub 작업 브랜치에
반영하고 PR #24에서 빌드했다. 검증한 로컬 Git 트리와 원격 Git 트리가 같으며
공개 실행 파일, 원본 WebP, 모듈과 회귀 검사 모두 Git blob SHA로 확인했다.

- [소스 검증](https://github.com/jaeseok614/win-again-football/actions/runs/37712194609):
  전체 103 suites / 789 checks, 공개 PWA 14개, 공개 파일 재생성 일치 검사 성공.
- [Android 검증](https://github.com/jaeseok614/win-again-football/actions/runs/37712194465):
  자산/저장 브리지, debug APK, 미서명 release AAB, lint, Android 테스트 APK 빌드 성공.
  API 35 / Pixel 6 에뮬레이터에서 6개 실제 앱 계측 테스트가 성공했다.
- 새 계측은 기본 모바일 홈의 구단 그림, 확장 얼굴/6장면/승격 그림의 실제 WebP
  decode(1254/2048/1672px), 상대 11명의 서로 다른 얼굴을 포함한다. 기존 시작 메뉴,
  전체 선수단/자식 창 뒤로가기, 검색어 없는 필터, 정지/계획, 저장·파일 내보내기와
  불러오기 검증도 성공했다.
- CI Android 게임 파일은 2,608,991바이트, SHA256
  `815c2a09003c28f0b2711d778a75e403cbdb9f62a233bf29a2a6d1b406400905`로
  로컬 최종 파일과 같다. 공개 파일은 2,607,362바이트다.

## 휴대폰 테스트 파일

[이 코드의 APK/AAB ZIP](https://github.com/jaeseok614/win-again-football/actions/runs/37712194465/artifacts/11521354389)을
받아 압축을 풀고 **app-debug.apk**를 설치한다. AAB는 휴대폰에 직접 설치하는 파일이
아니다. ZIP에는 lint 보고서와 game/build-info.json도 있다.

ZIP 크기 7,748,771바이트, GitHub artifact SHA256:
`6ff2c3f66730c32ba77196a2b9aacb8ace0a3a77ed5732ec9769fe8ddb44a781`.
아티팩트는 2026-11-07 만료 예정이며 GitHub 로그인/저장소 접근이 필요할 수 있다.
[에뮬레이터 보고서·화면](https://github.com/jaeseok614/win-again-football/actions/runs/37712194465/artifacts/11522855468)도
같은 코드 기준이다.

파일 이름의 `6d0dcf11...`는 PR의 테스트용 merge commit이며 원래 작업 브랜치
head는 `66311a4`다. 다른 코드가 섞인 파일이라는 뜻이 아니다. 이후 문서만 추가한
커밋은 게임 코드와 게임 파일 해시를 바꾸지 않는다. 후속 변경이 있다면 해당 변경의
CI가 성공한 APK를 사용하고, 과거 artifact를 새 게임으로 소개하지 않는다.

이 기록은 에뮬레이터와 개발용 APK 검증이다. 실제 휴대폰 확인, Play 서명·공개 게시를
완료한 기록은 아니다. 다음 개발은 HANDOFF.md와
[연속 경기·구단 그림 기록](CONTINUOUS_MATCH_AND_CLUB_ART_2026-10-08.md)을 먼저 읽는다.
