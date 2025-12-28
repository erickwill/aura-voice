---
name: refactor
description: Guided refactoring with analysis, plan, and implementation
trigger: /refactor
multimodal: false
---

# Refactoring Assistant

This workflow guides you through a safe refactoring process.

## Step 1: Understand Current State (model: fast)

{{input}}

Use tools to:
1. Find and read the code that needs refactoring
2. Identify dependencies and usages of this code
3. Check for existing tests
4. Note the current architecture/patterns

Provide a summary of:
- What the code currently does
- How it's structured
- What tests exist
- What depends on this code

## Step 2: Identify Issues and Opportunities (model: smart)

Based on the current state:

{{previous}}

Identify:
1. **Code Smells**: What makes this code hard to maintain?
2. **Technical Debt**: What shortcuts were taken?
3. **Performance Issues**: Any obvious bottlenecks?
4. **Complexity**: What's unnecessarily complex?
5. **Opportunities**: How could this be improved?

Provide a prioritized list of refactoring opportunities.

## Step 3: Create Refactoring Plan (model: smart)

Based on the issues identified:

{{step2}}

Create a safe refactoring plan:

1. **Goal**: What the refactored code should look like
2. **Steps**: Ordered list of small, safe changes
3. **Tests First**: What tests to add before refactoring
4. **Risk Assessment**: What could go wrong
5. **Rollback Plan**: How to undo if needed

Important: Each step should be small enough to:
- Be easily reviewed
- Not break existing functionality
- Be independently testable

## Step 4: Implement Refactoring (model: smart)

Following the plan:

{{step3}}

Now implement the refactoring step by step:

1. First, ensure tests exist (create if needed)
2. Make one small change at a time
3. Verify the change works
4. Move to the next step

Use the edit and write tools to make the changes. After each significant change, summarize what was done.
