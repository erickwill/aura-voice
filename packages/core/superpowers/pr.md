---
name: pr
description: Generate a comprehensive PR description from changes
trigger: /pr
multimodal: false
---

# PR Description Generator

This workflow generates a detailed pull request description.

## Step 1: Gather Changes (model: fast)

{{input}}

Use git and file tools to:
1. Run `git diff` to see current changes
2. Run `git log` to see recent commits on this branch
3. Identify which files have changed
4. Read the changed files to understand the modifications

Provide a structured summary of all changes found.

## Step 2: Analyze Impact (model: smart)

Based on the changes:

{{previous}}

Analyze the impact:
1. What problem does this solve?
2. What is the user-facing impact?
3. What are the technical changes?
4. Are there any breaking changes?
5. What areas might need extra testing?
6. Are there any dependencies added or removed?

Provide a detailed impact analysis.

## Step 3: Generate PR Description (model: fast)

Based on the changes and impact analysis:

Changes:
{{step1}}

Impact:
{{step2}}

Generate a professional PR description in this format:

```markdown
## Summary
[2-3 sentence summary of what this PR does]

## Changes
- [Bulleted list of changes]

## Impact
- [User-facing impact]
- [Technical impact]

## Testing
- [ ] [Testing checklist items]

## Screenshots
[If applicable, note where screenshots should go]

## Related Issues
[Note any related issues]
```
