# AI-OS Project Binding — PROJECT THREE KINGDOMS

## Canonical Binding
- AI-OS Repository: `nanpsw-eng/AI-OPERATING-SYSTEM`
- Stable Version: `v0.4.4`
- Exact Commit: `64b5115a698cc6a94cd8df80abb2ee7109010764`
- Binding Type: `PROJECT_BASELINE`
- Binding Status: `EXECUTION_CONFIRMED`
- Bound Date: `2026-10-01`

## Project Canonical Sources
- Project AI Rules: `AGENTS.md`
- Product Source of Truth: `docs/product/PRD.md`
- Durable Decisions: `docs/decisions/DECISION_INDEX.md`
- Session Handoff: `docs/ai-dev/SESSION_HANDOFF.md`

## Repository
- GitHub repository: `nanpsw-eng/three-kingdoms-web`
- Visibility: `PUBLIC`
- Default branch: `main`
- Integration branch: `implementation/bootstrap`
- Active feature branch: `feature/vertical-slice-e2e`
- Active feature PR: Draft PR #9 → `implementation/bootstrap`
- Foundation PR #2: MERGED into `implementation/bootstrap`
- Battle Strategy PR #3: MERGED
- World Interaction PR #4: MERGED
- Secret Area PR #5: MERGED
- Field Presentation PR #6: MERGED
- Field Presentation v2 PR #7: MERGED
- Progression & Retreat PR #8: MERGED

## Loading Rule
AI-OS가 필요한 작업에서만 위 exact commit 기준으로 필요한 Core Policy와 Domain Pack을 선택적으로 읽는다. 승인된 결정을 우선 재사용하고 현재 변경 위험을 통제하는 최소 Context·Agent·Test·Cost를 사용한다.

## Project Override Rule
프로젝트 고유 제품 요구사항과 더 엄격한 Hard Rule은 프로젝트 Source of Truth가 소유한다. 충돌은 적용 AI-OS의 Source-of-Truth 정책에 따라 처리한다.

## Update Rule
AI-OS Stable이 변경되어도 자동 추종하지 않는다. 호환성과 실제 필요성을 검토한 후 명시적으로 Binding을 갱신한다.
