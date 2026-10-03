# 통합 개발 인수인계 — 2026-10-03

집·회사·클라우드 통합본과 후속 개발의 기준 브랜치: `main`.
최신 소스는 Git에 추적된 `source/`입니다. ZIP은 최초 v22 복구용입니다.
현재 통합 내역과 복구 한계는 [CLOUD_RECOVERY.md](docs/CLOUD_RECOVERY.md)를 읽으세요.
이전 회사 인수인계 원문은 [별도 보관](docs/HANDOFF_2026-10-02.md)했습니다.

## 최신 추가 — 감독 여정

- 감독실에서 5개 이정표와 확정된 리그 진행, 다음 행동을 표시합니다.
- source/dist/manager-journey.js는 기존 기록만 읽고 저장/RNG를 바꾸지 않습니다.
- 참고 기사와 설계 기준은 docs/PRODUCT_DIRECTION.md에 있습니다.
- 60개 테스트 파일 / 643개 검증, 공개 PWA 14개 검증 통과.
- 360×640 / 1280×900 실제 브라우저에서 표시·탐색·가로 넘침을 확인했습니다.

## 포함한 기능

- 회사: 시작 메뉴, 언론 평가, 선수 대화, 코치 계약, 챔피언스리그, Android 구성.
- 클라우드: 준비 체크리스트, 상대별 전술 안내, 경기 흐름, 코치 알림,
  포지션별 선수층, 선발 미리보기/확정, 코치 추천 교체 검토.
- 집: 퇴장 출전/체력/통계/커리어 정산 및 복원 수정, 퇴장 선수 추천 제외,
  구버전 카드 없는 저장 유지, 미리보기 무효화, Windows/Linux 동일 PWA 생성.
- 원본 클라우드 Git 커밋 전체 복원은 실패했습니다. 실제 로그의 소스 조각을
  복구하고 누락된 모델 일부를 재구현했습니다. 원본 커밋 전체를 병합했다고
  설명하지 마세요. 상세 출처는 CLOUD_RECOVERY.md에 있습니다.

## 다른 컴퓨터에서 이어서 개발

처음에는:

```sh
git clone --branch main https://github.com/jaeseok614/win-again-football.git
cd win-again-football
node source/run-tests.cjs
python -m http.server 8765 --bind 127.0.0.1 --directory source/dist
```

Node.js 22 이상과 Python 3이 필요합니다. Linux/macOS는 마지막 명령에
`python3`를 사용하세요. Windows에서는 `PYTHON` 환경 변수를 설치한
Python 실행 경로로 지정하면 setup-source 테스트도 실행됩니다.
브라우저에서 http://127.0.0.1:8765/ 를 엽니다.

이미 같은 브랜치가 있다면 `git status`로 작업을 확인한 뒤 `git pull --ff-only`.
수정이 있으면 먼저 commit/push하세요. 다른 PC의 파일로 덮어쓰거나 reset하지 마세요.
작업 종료 전 테스트 → commit → push를 하고 브랜치와 커밋을 다음 작업에 전달하세요.
게임 진행 저장은 코드와 별도이므로 게임의 구단 JSON 내보내기/가져오기를 사용합니다.

## 검증과 남은 범위

전체 테스트, PWA 검증, Android 에셋 생성과 모바일/데스크톱 Chromium UI 확인을 수행했습니다.
실제 APK·AAB·lint·에뮬레이터 결과는 이번 PR의 Android CI에서 확인하세요.
예전 회사 APK 검증 결과를 이번 코드의 결과로 사용하지 마세요.
누적 경고·다음 경기 출전 정지, 구단주 면담, 국가대표 경기는 아직 미구현입니다.
Play 신원 확인·서명 키 등 출시 준비는 기존 인수인계의 상태를 따릅니다.
개인 구단 JSON, 인증 정보와 서명 키는 Git에 올리지 않습니다.
