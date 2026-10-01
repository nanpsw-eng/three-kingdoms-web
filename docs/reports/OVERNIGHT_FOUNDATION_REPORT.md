# OVERNIGHT FOUNDATION REPORT — 2026-10-01

## 0. 요약

| 항목 | 값 |
|---|---|
| 실행 모드 | `SEQUENTIAL / single writer` (Claude Code, 무인) |
| Base | `origin/implementation/bootstrap` @ `75b4122` |
| Branch | `implementation/foundation-nightly` |
| 최종 코드 HEAD (검증 기준) | `4268d94` |
| Draft PR | #2 `implementation/foundation-nightly` → `implementation/bootstrap` (Draft, **미병합**) |
| 기존 PR #1 | 변경 없음 (Draft, `implementation/bootstrap` → `main`) |
| GitHub Actions | `LOCAL_FIRST / GITHUB_ACTIONS_DISABLED` 유지 — workflow 추가 없음 |
| 최종 Gate | `npm run verify:foundation` → **8/8 PASS** (exit 0) |
| Task 결과 | N0–N11 전부 완료. `BLOCKED` 0건, `BLOCKED_HUMAN_GATE` 0건(해당 행위 시도 없음), `BLOCKED_DECISION` 3건(중립 seam으로 구현 후 기록) |

## 1. Task별 결과

| Task | 상태 | Commit | 핵심 산출물 |
|---|---|---|---|
| N0 의존성/Scaffold 복구 | DONE | `345ce32`, `f009423` | `package-lock.json`, TS 7 `TS5096` 수정(tsconfig.node), vitest/tsconfig.test, `.tmp/` ignore. 1차 커밋에 섞인 tsc 산출물은 후속 커밋으로 제거(history rewrite 없음) |
| N1 Content Validation | DONE | `0ff497c` | Zod schema(General/Trait/Tactic/Formation/UnitType/Locale), 순수 `validateContent()`(schema·전역 ID 중복·참조·ko 키), `npm run validate:content`, 실패 fixture 테스트 |
| N2 Foundation 콘텐츠 | DONE | `ae3ffaf` | 4 Trait(범용 effect 데이터), 5 Tactic(화공/응급 치료/교란/고무/도발), SPEAR/CAVALRY/ARCHER, WEDGE/CIRCLE/CRANE, ko 로컬라이즈(자체 작성 문구) |
| N3 Battle Core v0.2 | DONE | `930564e` | 중앙 `BATTLE_CONFIG`, 승/패/무 판정·패주·전투 중 종료, Defend, Party TP, 공격/회복/혼란/고무/도발, 진형 party×slot, Trait 적용, Smart/Repeat/All-Attack, `runAutoBattle`, `mixSeed`. **v0.1 수치 bit-identical 보존(golden)** |
| N4 SaveGame v1 | DONE | `29407c3` | 순수 domain save 타입(정적 능력치 미저장), `saveVersion`, migration chain, Battle checkpoint snapshot/restore, Zod schema+타입 정합 compile guard, Repository port, Dexie/Memory adapter |
| N5 React↔Phaser | DONE | `64cd140` | Typed `GameBridge`, lazy `GameController`, Boot/Preload/World scene, `GameCanvas` mount/unmount, 절차적 placeholder만 사용 |
| N6 Tap-to-Move | DONE | `30c72f7` | 순수 world domain(충돌·벽 슬라이드·예산 제한 A*·경로 평활화·재지정), Guard→Chase→Return(leash), Aggro 표시, Encounter 이벤트·일시정지·grace, 선택형 가상 d-pad |
| N7 전투 UI | DONE | `0499d83`, `4268d94` | Encounter schema, BattleSession, Phaser BattleScene(이벤트 재생 전용), Smart Command UI(1탭 전투개시·override bottom sheet·터치 목표 선택·자동/반복/전원공격/x1–x3/후퇴·결과), 전투 종료 autosave |
| N8 Vertical Slice 골격 | DONE | `546f53a` | Region/Location/NPC/Flag/Quest/Event schema+참조검증, 탁현→남부 평야→백수촌→백수림(+샛길)→전초기지→북부 관문 데이터, 순수 progression engine, 앱 연동(GAME_START/ENCOUNTER_VICTORY/퀘스트 목표 표시) |
| N9 PWA/Responsive | DONE | `53561b5` | 192/512/maskable PNG(자체 SVG에서 생성), App-shell precache only, field 높이 가변, 360px 파티 카드 overflow 수정 |
| N10 Foundation Gate | DONE | `27cb189` | `npm run verify:foundation`, `npm run check`(E2E 제외), build 전 content 검증 강제 |
| N11 Report/Handoff | DONE | (본 문서 커밋) | 본 보고서, `SESSION_HANDOFF.md`, README 상태 갱신, PR #2 본문 갱신 |

## 2. 검증 Evidence (최종 코드 HEAD `4268d94`, Node v22.22.0)

`npm run verify:foundation` 실행 결과 (exit 0):

| Step | 결과 | 상세 |
|---|---|---|
| typecheck (`tsc -b`, TS 7.0.2, strict) | PASS | app/node/test 3 project |
| content-validation | PASS | 21 files: generals 12, traits 5, tactics 5, formations 3, unitTypes 3, encounters 5, regions 2, locations 8, npcs 4, flags 6, quests 1, events 7, locale ko |
| domain-smoke (node --test, 컴파일된 domain, `exactOptionalPropertyTypes`) | PASS | 4/4 |
| unit (vitest 전체) | PASS | 12 files / 69 tests |
| battle-golden subset | PASS | 2 files / 7 tests (v0.1 보존 + v0.2 golden JSON 3 seeds) |
| architecture-boundaries | PASS | domain의 React/Phaser/Dexie/Zod import 및 `Math.random`/`Date.now` 금지 |
| build (`tsc -b && validate:content && vite build`) | PASS | Phaser lazy chunk ≈1.38 MB (gzip ≈358 kB), precache 15 entries |
| e2e (Playwright Chromium 141, 360/390/412) | PASS | 6 spec × 3 viewport = 18/18 |

### 2.1 Gate 자체 검증 (negative test)
- Liu Bei의 tactic 참조를 `TAC_DOES_NOT_EXIST`로 바꾼 상태에서 `npm run check` → exit 1, content-validation/unit/golden FAIL 확인 후 원복.
- 같은 상태에서 `npm run build` → exit 1 (수정 전에는 build가 PASS하던 결함을 발견하여 N10에서 보완).
- 파티 카드 overflow 검사 E2E는 수정 전 레이아웃에서 FAIL(spill=true) 재현 후 수정본 PASS 확인.

### 2.2 NOT_RUN / 미검증
| 항목 | 상태 | 사유 |
|---|---|---|
| Lint | NOT_CONFIGURED | linter 미도입. 현재 정적 gate는 strict tsc |
| Playwright WebKit | NOT_RUN | 컨테이너에 WebKit 미설치. **Chromium 모바일 에뮬레이션 결과는 iPhone Safari 증거가 아님** |
| 실제 Android Chrome / iPhone Safari 기기 | NOT_RUN | 실기기 없음 (PRD §16 Acceptance Gate 미충족) |
| PWA 설치 실기기 / iOS storage eviction | NOT_RUN | 실기기 필요 |
| 60 FPS 성능 (NFR-001) | NOT_RUN | 대표 기기 계측 미실시 |
| GitHub Actions | NOT_RUN (DISABLED) | ADR-004 유지. 로컬 런타임만으로 전 검증 가능했으므로 조건부 사전승인 조건(1) 불충족 → workflow 미추가 |

## 3. 설계 결정 (승인 범위 내 구현 선택)

- **Domain 순수성 강화**: `src/game/domain/**`는 Zod도 import하지 않음(테스트로 강제). Content→Domain은 `src/game/battle/fromContent.ts`, `src/game/progress/fromContent.ts` adapter가 담당.
- **Battle 결정성**: 재생 속도(x1/x2/x3)는 `BattleSession` 입력이 아님. Phaser는 이미 해결된 이벤트만 애니메이션. 동일 seed+명령 → 동일 결과 테스트.
- **RNG**: 기존 LCG `nextRng` 불변. 작은/인접 seed의 첫 출력 상관(실측: seed 1..8 첫 값 ≈0.236 동일대) 때문에 `createBattleState`에서만 `mixSeed`(murmur3 fmix32) 적용.
- **Save**: SaveGame v1에 정적 능력치·최대 병력 미저장(테스트로 강제). v1은 아직 미배포이므로 N8에서 `completedEventIds/unlockedFormationIds/unlockedRegionIds` 필드를 v1에 추가(마이그레이션 불필요). 읽기 실패 시 기존 save를 덮어쓰지 않고 `recovery` 슬롯 사용.
- **Tap-to-Move**: A* 확장 예산(900 node)으로 "전체 Map 자동이동" 방지. 화면 밖 지점은 탭 불가(카메라 시야 내 이동).
- **Vertical Slice 적 편성**: 황건군 적은 역사 인물이 아닌 범용 부대명(황건 정찰대장/창병대/궁병대/기병대/술사/관문장/역사)으로 작성.

## 4. BLOCKED_DECISION (제품 결정 필요 — 중립 seam으로 구현)

| ID | 내용 | 현재 중립 구현 | 필요한 결정 |
|---|---|---|---|
| BD-01 | 전투 패배 페널티 | 패주 장수 병력 1로 복귀, 금/경험치 손실 없음, 적은 필드 유지 | 체크포인트 귀환 여부, 금 손실, 병력 회복 규칙 |
| BD-02 | 레벨업 곡선 | XP 누적만, 레벨 변화 없음 | XP 테이블, 레벨당 병력/책략 해금 규칙 (CHARACTER spec "고정 개성형" 범위 내) |
| BD-03 | 후퇴 성공률 | 비보스 전투 100% 성공, 보스 불가 | 확률·페널티 여부 |

## 5. 잔여 Risk

| # | Risk | 영향 | 근거/현황 | 권고 |
|---|---|---|---|---|
| R1 | **밸런스 미검증** | 높음 | `npm run sim:encounters`(Smart only, 50 seeds): 모든 조우 100% 승. 보스 평균 8턴·병력손실 60%로 spec(6–9턴) 범위이나 **책략/진형 없이도 승리** → "책략·진형이 의미 있는가" 검증 목표 미달 가능 | 플레이테스트 후 보스 텔레그래프 행동/적 책략 AI 추가 |
| R2 | 보스 텔레그래프 미구현 | 중 | COMBAT spec의 "telegraphed high-impact action" 엔진 기능 없음 | Battle core v0.3 과제 |
| R3 | 필드는 남부 평야 1개 placeholder만 렌더 | 중 | 나머지 Location은 데이터/진행 엔진만 존재, 지역 전환·NPC 대화 UI 없음 | 다음 Task: Location 전환 + NPC 상호작용 UI |
| R4 | 휴식/회복 경로 제한 | 중 | REST 서비스는 데이터만 있고 UI 미연결. 현재 회복은 전초기지 점령 이벤트뿐 → 연속 전투 시 병력 고갈 | 마을/전초기지 휴식 UI 연결 |
| R5 | iOS Safari/PWA 실기기 미검증 | 높음(출시 Gate) | WebKit 미설치, 실기기 없음 | 실기기 QA 필수(PRD §16) |
| R6 | Phaser chunk 1.38 MB | 중 | 첫 진입 시 저속망 로딩 | 실측 후 scene 분할/압축 검토 |
| R7 | 역사 콘텐츠 검수 | 중 | `PROVISIONAL_CONTENT_REVIEW_REQUIRED`: 간옹 영입 이벤트/NPC, 숲의 은자(창작), 북부 관문 보스, 북부 지역 | 콘텐츠 검수 Gate |
| R8 | `?debug=1` 읽기 전용 hook가 production build에도 포함 | 낮음 | 싱글플레이·로컬 상태 조회만 가능 | 출시 전 `import.meta.env` 조건으로 제거 검토 |
| R9 | Lint 미도입 | 낮음 | strict tsc만 사용 | ESLint 도입 여부 결정 |

## 6. Human Gate (사람 승인 필요)
- PR #2(`implementation/foundation-nightly` → `implementation/bootstrap`) 검토·병합: **REQUIRED**
- PR #1(`implementation/bootstrap` → `main`) 병합: **REQUIRED**
- Production deploy / Release / Tag: **REQUIRED** (이번 실행에서 미수행)
- BD-01~03 제품 결정: **REQUIRED**

## 7. 재현 명령
```bash
npm ci
npm run verify:foundation        # 전체 gate (Chromium 있으면 E2E 포함)
npm run check                    # E2E 제외 gate
npm run sim:encounters           # 밸런스 프로브 (정보용, gate 아님)
UPDATE_GOLDEN=1 npx vitest run tests/domain/battle-golden.test.ts   # 의도적 golden 갱신 시에만
PW_CHROMIUM_PATH=/path/to/chromium npm run test:e2e                 # 다른 환경의 Chromium 지정
```
