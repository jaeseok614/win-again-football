# 구단 이야기 장면과 경기 전개 표시 — 2026-10-08

## 달라진 경험
- 감독 도착, 코치 면담, 선수단, 유망주, 구단주, 지역 팬의 여섯 장면을 현재 구단 대화에 연결했습니다. 기존에 확인된 이벤트/대사/선택 영수증을 사용합니다.
- 대화 제목과 장면, 인물, 현재 대사, 답변이 함께 보입니다. 긴 장면 설명과 지난 교환은 창 내부에서 읽고 모든 답변과 닫기 버튼은 화면 안에 남습니다. 짧은 가로 화면은 대화와 선택을 두 열로 배치합니다.
- 코치 면담에는 기존 코치 얼굴을 사용하고 선수 대화는 기존 신원별 얼굴을 유지합니다. 새 그림은 특정 실존 인물의 사진이 아닌 가상 구단 장면입니다.
- 중계 줄에 우리/상대의 확보·전진·문전 단계를 색과 짧은 선으로 표시합니다. 실제 표시 중인 프레임만 읽으며 미래 득점/선방을 미리 알리지 않습니다. 공 위에 새 UI를 올리지 않습니다.
- 같은 단계의 반복 프레임은 표시 DOM을 바꾸지 않습니다. 숨은 화면에서 새 표시 갱신은 하지 않습니다. 움직임 끄기/정지 프레임은 중계 기본 표시로 돌아갑니다.
- schema/engine 10, 전체 일정, 진행한 경기와 선택 기록, RNG, 신원, 저장 키는 그대로입니다. 결과나 능력치 보너스를 추가하지 않았습니다.

## 검증
- 전체 105 suites / 807 checks, 공개 PWA 14그룹, Android 번들/브리지 11그룹 통과.
- 320×568, 360×640, 390×844, 412×732, 640×360, 844×390, 768×1024, 1440×900에서 대화 3단계와 저장 복원 확인. 모든 답변/닫기 버튼 44px 이상, 대화창 외부 넘침 없음.
- 같은 여덟 크기의 준비/전반/하프타임/후반/후반 정지/마지막 구간/종료에서 점수·경기장·중계·핵심 조작이 한 화면. 세로 중계 15px, 짧은 가로 14px, 두 줄 이하 조작 유지.
- 실제 터치 흐름으로 90분 경기, 중간 전술 창 정지, 하프타임 교체, 결과 확정과 재접속을 확인했습니다. 전체 경기 상태가 동일 교체를 실행한 독립 엔진 결과와 일치합니다. 물리 휴대폰의 성능을 보장하는 측정은 아닙니다.
- 공개 파일 3,496,991바이트. Android 게임 3,498,620바이트, SHA256 `71fbdff03f701aad456d3a8b9b3859186c69c7ca200c957e478d6180ac639810`.
- Android 계측에 새 이미지 실제 디코드와 이야기 답변의 화면 내 배치를 추가했습니다. 이 커밋의 APK/미서명 AAB/lint/에뮬레이터 결과는 [PR #24](https://github.com/jaeseok614/win-again-football/pull/24)의 최신 검사에서 확인합니다. Play 공개 출시나 main 병합은 하지 않습니다.
- 합성 화면 점검/실제 플레이용 임시 저장, 스크린샷, QA 도구는 ignored work/에만 두었습니다.

## 이미지 생성 출처
- 모드: 내장 image_gen 새 이미지 생성(native).
- 원본: `C:/Users/황재석/.codex/generated_images/01a0f9b0-5ed6-7323-9be3-fd40b239f4dd/exec-d6b976ab-ae55-4f62-9581-876dc1cacb28.png`
- 최종: `source/dist/assets/club-chapters-v1.webp`, 2048×768, 3×2 공유 아틀라스, 110,864바이트. 원본 내용/크기는 그대로이고 WebP 형식 변환(quality 45, method 6)만 적용했습니다.
- 여섯 장면이 한 번만 번들에 들어갑니다. 공개 파일은 기존 3.5MB 예산 이내이며 PWA/Android 모두 오프라인 포함입니다.
- 생성된 장면을 직접 확인했습니다. 기존 게임 화면/실존 인물 사진/구단 로고를 복제하지 않았습니다.

### 최종 생성 프롬프트
```text
Use case: illustration-story. Asset type: ONE original sprite atlas for a Korean mobile football manager narrative game. Create a precise 3 columns by 2 rows grid of SIX separate full-bleed cinematic scene illustrations, no gutters or frames. Overall canvas 2048 by 768, each tile 16:9. Consistent polished painterly realism, warm natural light, deep teal shadows, tactile detail, emotional but grounded English lower-league football culture; club colors white and navy, generic original people, no real logos or recognizable celebrities. Tile order left-to-right top-to-bottom: 1) arriving at a modest neighborhood football ground after light rain, a coach seen from behind holding a worn kit bag, turnstile and small stand in distance; 2) assistant coach's hands moving magnets on a tactical whiteboard in a warm dressing room, partial white jerseys and benches, no text; 3) captain and teammates in a tight pre-match huddle, diverse adult men, faces partially seen, warm determination, white navy kits; 4) promising young adult player sitting at the dressing-room bench carefully tying boots, personal bag and worn pitch entrance, hopeful mood; 5) small club owner's office with an older owner and manager across a desk, financial paperwork with NO legible text, trophy and window to pitch, honest negotiation; 6) local supporters in white and navy scarves applauding from a modest pitchside terrace, mixed ages, families, sense of community. Compose each tile as a complete independent wide image with useful subjects in middle 70%, readable at thumbnail size. Absolutely no lettering, numbers, logos, watermarks, panel labels, UI or text. This atlas will be cropped by CSS into six scene cards.
```

