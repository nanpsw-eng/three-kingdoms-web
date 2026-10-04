# PROJECT BOOTSTRAP SUMMARY

```yaml
project_bootstrap_summary:
  repository: nanpsw-eng/three-kingdoms-web
  repository_visibility: PUBLIC
  selected_ref: implementation/bootstrap
  ai_os_binding: v0.4.4@64b5115a698cc6a94cd8df80abb2ee7109010764
  binding_status: EXECUTION_CONFIRMED
  project_rules: AGENTS.md
  product_source_of_truth: docs/product/PRD.md
  decisions: docs/decisions/DECISION_INDEX.md
  handoff: docs/ai-dev/SESSION_HANDOFF.md
  domains:
    required:
      - product-management
      - product-design-ux-ui
    supporting:
      - software-engineering
    on_demand:
      - qa-reliability
      - application-security-privacy
      - platform-devops
  risk_tier: RISK_MEDIUM
  context_budget: FOCUSED
  agent_budget: 1
  test_budget: NOT_RUN
  ci_policy: LOCAL_FIRST / GITHUB_ACTIONS_DISABLED
  next_action: implement scaffold, repository-local validation scripts, schemas and deterministic battle core
  human_gate: REQUIRED_FOR_MERGE_AND_PRODUCTION_RELEASE
```
