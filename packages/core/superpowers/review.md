---
name: review
description: Comprehensive code review with analysis and suggestions
trigger: /review
multimodal: false
---

# Code Review Superpower

This workflow performs a comprehensive code review in multiple steps.

## Step 1: Gather Context (model: fast)

First, let me understand what needs to be reviewed.

{{input}}

Use the available tools to:
1. Find the relevant files mentioned or implied
2. Read the code that needs review
3. Check for any related tests
4. Look at recent changes if this is about a PR or diff

Provide a summary of what you found and what will be reviewed.

## Step 2: Security Analysis (model: smart)

Based on the code gathered:

{{previous}}

Perform a security-focused review. Look for:
- Input validation issues
- SQL injection, XSS, or command injection risks
- Authentication/authorization flaws
- Sensitive data exposure
- Insecure dependencies
- Cryptographic weaknesses

List any security concerns found, with severity (Critical/High/Medium/Low).

## Step 3: Code Quality Analysis (model: smart)

Based on the code gathered:

{{step1}}

Analyze code quality. Consider:
- Code organization and structure
- Naming conventions
- DRY violations
- Complex functions that could be simplified
- Missing error handling
- Performance concerns
- Type safety issues

Provide specific suggestions for improvement.

## Step 4: Final Review Summary (model: fast)

Compile a final review based on:

Security Analysis:
{{step2}}

Code Quality Analysis:
{{step3}}

Provide a structured review summary with:
1. **Overview**: Brief summary of what was reviewed
2. **Security Issues**: List with severity
3. **Code Quality Issues**: List with priority
4. **Recommendations**: Top 3-5 actionable improvements
5. **Verdict**: Approve, Request Changes, or Needs Discussion
