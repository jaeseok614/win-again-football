# 다른 컴퓨터에서 개발 이어가기

게임: https://jaeseok614.github.io/win-again-football/

`football-source-v22.zip`에 모듈별 JS/CSS, 이미지, 빌드 도구, 테스트, 과거 저장
호환 검증 자료 등 140개 파일이 있습니다. 개인 구단 저장은 포함하지 않습니다.
공개 게임 파일은 저장소 최상위, 수정할 소스는 압축을 풀어 만든 `source/`입니다.

## 준비

저장소를 clone하거나 Code → Download ZIP으로 받아 압축을 푸세요.
Node.js와 Python이 있는 환경에서 저장소 폴더를 열고 실행합니다.
별도의 npm 패키지는 필요하지 않습니다.

```sh
python3 setup-source.py
```

Windows에서는 `python setup-source.py`를 사용하세요. 이미 `source/`가 있으면
현재 파일은 그대로 보존하고 빠진 파일만 검증된 압축에서 복원합니다. 따라서 일부
모듈만 Git에 있는 checkout에서도 안전하게 전체 개발 환경을 준비할 수 있습니다.

## 실행

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory source/dist
```

브라우저에서 http://127.0.0.1:8765/ 를 엽니다. 클라우드 환경은 제공되는
미리보기 기능을 사용하세요. `source/개발_안내.txt`도 읽고 이어서 수정하세요.

## 검증

저장소 폴더에서 전체 36개 테스트 파일을 실행합니다.

```sh
node -e "const fs=require('node:fs'),cp=require('node:child_process');for(const f of fs.readdirSync('source').filter(f=>/^test-.*[.]cjs$/.test(f)).sort()){const r=cp.spawnSync(process.execPath,[f],{cwd:'source',stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)}"
```

v22 기준 441개 검증 그룹을 통과했습니다. 구단 저장 키와 구버전 복원,
경기 일시정지 복원, 훈련·경제·컵 규칙을 유지하세요.

## 단일 실행 파일 만들기

```sh
node source/build.cjs standalone.html
```

standalone.html을 브라우저로 열면 게임을 실행할 수 있습니다.
이 빌드는 단일 파일용입니다. 공개 PWA 갱신 시 manifest, 아이콘, 서비스워커,
cache-assets.js의 경로와 콘텐츠 revision을 함께 맞추고 오프라인 동작을
검증해야 합니다. root index.html 하나만 교체해서 배포하지 마세요.

## ChatGPT 클라우드 작업에 줄 요청

> 이 저장소의 AGENTS.md와 DEVELOPMENT.md를 읽어 줘. source 폴더가 없으면
> python3 setup-source.py로 압축을 풀고 축구 감독 게임 v22 개발을 이어가 줘.
> 기존 구단 저장 호환성을 유지하고 변경 후 전체 테스트를 실행해 줘.
> 수정한 모듈 소스도 커밋에 포함해 줘.

GitHub 소스 업로드와 ChatGPT 클라우드 환경 연결은 별도입니다.
현재 저장소에 클라우드 환경이 자동으로 설정된 것은 아닙니다.
