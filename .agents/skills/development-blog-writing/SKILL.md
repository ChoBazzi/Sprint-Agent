---
name: development-blog-writing
description: Turn development conversations, architectural decisions, implementation steps, debugging attempts, tradeoff analysis, and troubleshooting notes into a clear technical blog draft or publish-ready outline. Use when the user asks to "블로그로 정리", "개발 과정 정리", "트러블슈팅 글", "회고 글", "기술 블로그 초안", "what we decided", or wants decisions made during planning/building/debugging converted into a blog post.
---

# Development Blog Writing

## Overview

Convert raw development work into a useful technical blog artifact. Preserve the actual reasoning, decisions, failures, fixes, and tradeoffs instead of turning the post into a generic tutorial.

## Workflow

### 1. Collect Source Material

Use the current conversation, relevant docs, specs, commits, diffs, errors, terminal output summaries, and code references. If the user asks for a blog based on repository work, inspect the relevant files before drafting.

Capture:

- Initial goal and context
- Constraints and rejected options
- Key decisions and why they were made
- Implementation sequence
- Bugs, errors, failed attempts, and root causes
- Final solution and verification
- Remaining tradeoffs or next steps

Do not invent missing facts. Mark uncertain details as "확인 필요" or ask one focused question if the missing detail changes the story.

### 2. Choose the Post Angle

Pick one primary angle:

- Decision log: why one architecture or library was chosen
- Troubleshooting: how an error was diagnosed and fixed
- Build diary: how an MVP or feature was designed and implemented
- Retrospective: what changed between the initial idea and final direction
- Tutorial-with-context: how to reproduce the solution, including why each step exists

If multiple angles exist, prefer the one with the clearest problem, tension, and resolution.

### 3. Structure the Draft

Use this default structure unless the user requests a different style:

```markdown
# [Working Title]

## 시작 배경
[What problem or goal started the work.]

## 요구사항과 제약
[What had to be true, and what was explicitly out of scope.]

## 선택지 비교
[Options considered, with concrete tradeoffs.]

## 최종 결정
[Decision and rationale.]

## 구현 과정
[Step-by-step development flow.]

## 트러블슈팅
[Symptoms, failed attempts, root cause, fix, verification.]

## 결과와 다음 단계
[What now works, what remains, and what will be improved.]
```

For shorter outputs, produce an outline first:

```markdown
## 제목 후보
- ...

## 핵심 메시지
- ...

## 글 구조
1. ...
2. ...
3. ...
```

### 4. Preserve Technical Specificity

Include concrete names when available:

- Libraries, frameworks, versions, commands, endpoints, schema names, and file paths
- Error messages or failure symptoms, summarized accurately
- Before/after architecture
- Verification commands and outcomes
- Links to local files when the draft is delivered in chat

Avoid vague filler such as "성능을 개선했다" unless the metric or observed effect is known.

### 5. Protect Safety and Privacy

Before presenting the draft:

- Remove secrets, tokens, private URLs, personal identifiers, and company-confidential details.
- Do not include full logs if they contain sensitive paths or credentials.
- Do not claim benchmark numbers, market facts, or production impact unless verified.
- Separate facts from interpretation.

## Output Modes

Ask only when necessary. Otherwise infer the mode from the user's request.

- **Outline mode:** Use for early planning or when the user says "정리".
- **Draft mode:** Use for "블로그 글", "초안", or "글처럼 써줘".
- **Postmortem mode:** Use for incidents, failures, or troubleshooting-heavy work.
- **Decision record mode:** Use when the main value is why a stack, architecture, or library was chosen.

## Quality Bar

The result should read like a real engineer's record of work:

- Specific enough that the user can later reconstruct the decision.
- Honest about failed attempts and uncertainty.
- Useful to another developer facing a similar choice.
- Not inflated into a grand lesson when the work was small.
- Written in Korean by default unless the user asks otherwise.
