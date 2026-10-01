# 다른 컴퓨터에서 개발 이어가기

게임: https://jaeseok614.github.io/win-again-football/

최신 모듈 소스와 테스트는 `source/`에 직접 보관합니다. `football-source-v22.zip`은
원래 v22의 140개 파일을 담은 복구용 스냅샷입니다. 개인 구단 저장은 포함하지 않습니다.
공개 게임 파일은 저장소 최상위, 수정할 소스는 `source/dist/`입니다.

## 2026-10-02 이어서 개발한 내용

클라우드에서 완료했던 모바일 메뉴·구단 요약, 선수 위치 조정·역할 추천,
저장 가져오기 보호를 복구했습니다. 마지막 코치·대회 확장 요청은 실패한 상태였습니다.
이번 변경은 포지션별 코치와 의무 코치 계약을 실제 훈련·의료·재정에 연결합니다.
계약은 리그 7경기이며 컵에서는 기간과 주급이 소모되지 않습니다.
손상되거나 미래 버전인 저장은 원본을 보관하고 자동 덮어쓰기를 차단합니다.
오프라인 준비 중 진행 표시, 완료 안내와 실패 시 재시도를 제공합니다.
챔피언스리그와 국가대표 A매치 확장은 아직 구현하지 않았습니다.

모든 개발에서 모바일 성능과 로딩 표시를 고려합니다. 숨긴 화면을 경기 틱마다
다시 만들지 않고, 실제 측정할 수 없는 진행률에는 임의의 퍼센트를 표시하지 않습니다.
지속할 작업 원칙은 AGENTS.md에 기록했습니다.

## 준비

저장소를 clone하거나 Code → Download ZIP으로 받아 압축을 푸세요.
Node.js와 Python이 있는 환경에서 저장소 폴더를 열고 실행합니다.
별도의 npm 패키지는 필요하지 않습니다.

```sh
python3 setup-source.py
```

Windows에서는 `python setup-source.py`를 사용하세요. 이미 `source/`가 있으면
수정한 파일은 덮어쓰지 않고 압축 스냅샷에서 빠진 파일만 채웁니다. 따라서 일부
모듈만 Git에 있는 작업 브랜치에서도 같은 명령으로 전체 개발 환경을 준비할 수 있습니다.

## 실행

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory source/dist
```

브라우저에서 http://127.0.0.1:8765/ 를 엽니다. 클라우드 환경은 제공되는
미리보기 기능을 사용하세요. `source/개발_안내.txt`도 읽고 이어서 수정하세요.

## 검증

저장소 폴더에서 전체 테스트 파일을 실행합니다.

```sh
node source/run-tests.cjs
```

현재 42개 파일의 503개 검증 그룹을 통과했습니다. 구단 저장 키와 구버전 복원,
경기 일시정지 복원, 훈련·경제·컵 규칙을 유지하세요.

## 단일 실행 파일 만들기

```sh
node source/build.cjs standalone.html
```

standalone.html을 브라우저로 열면 게임을 실행할 수 있습니다.
이 빌드는 단일 파일용입니다. 공개 PWA 갱신 시 manifest, 아이콘, 서비스워커,
cache-assets.js의 경로와 콘텐츠 revision을 함께 맞추고 오프라인 동작을
검증해야 합니다. root index.html 하나만 교체해서 배포하지 마세요.

전체 PWA 빌드와 공개 파일 검증:

```sh
node source/build-pwa.cjs
PWA_DIST=. node source/test-pwa.cjs index.html
```

PowerShell에서는 두 번째 줄 대신 `$env:PWA_DIST=(Resolve-Path .).Path` 설정 후
`node source/test-pwa.cjs index.html`을 실행합니다. 빌더가 소스와 단일 HTML의
실제 콘텐츠 revision, 파일 경로와 SHA-256 검증값을 함께 생성합니다.

## ChatGPT 클라우드 작업에 줄 요청

> 이 저장소의 AGENTS.md와 DEVELOPMENT.md를 읽어 줘. source 폴더가 없으면
> python3 setup-source.py로 빠진 파일을 채우고 최신 축구 감독 게임 개발을 이어가 줘.
> 기존 구단 저장 호환성을 유지하고 변경 후 전체 테스트를 실행해 줘.
> 수정한 모듈 소스도 커밋에 포함해 줘.

GitHub 소스 업로드와 ChatGPT 클라우드 환경 연결은 별도입니다.
현재 저장소에 클라우드 환경이 자동으로 설정된 것은 아닙니다.
