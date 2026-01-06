# Review PR

Review a GitHub Pull Request and provide detailed feedback.

## Usage

```
/review-pr <PR_URL>
```

Example: `/review-pr https://github.com/owner/repo/pull/123`

## Instructions

When the user provides a PR URL, follow these steps:

1. **Extract PR info** from the URL (owner, repo, PR number)

2. **Fetch PR details** using the `gh` CLI:
   ```bash
   gh pr view <PR_NUMBER> --repo <OWNER/REPO> --json title,body,author,baseRefName,headRefName,files,additions,deletions
   ```

3. **Fetch the diff**:
   ```bash
   gh pr diff <PR_NUMBER> --repo <OWNER/REPO>
   ```

4. **Review the changes** and check for:
   - **Bugs or logic errors** - Off-by-one errors, null checks, race conditions
   - **Security issues** - Injection vulnerabilities, exposed secrets, auth problems
   - **Code quality** - Readability, naming, DRY principles
   - **Performance** - Unnecessary loops, N+1 queries, memory leaks
   - **TypeScript issues** - Type safety, any abuse, missing types
   - **Best practices** - Error handling, edge cases, testing considerations

5. **Provide a summary** with:
   - Overall assessment (approve, request changes, or needs discussion)
   - Specific issues found with file and line references
   - Suggestions for improvement
   - Positive callouts for good code

## Output Format

```
## PR Review: [PR Title]

**Author:** [author]
**Branch:** [head] -> [base]
**Files changed:** [count] (+[additions] -[deletions])

### Summary
[1-2 sentence overall assessment]

### Issues Found
- **[severity]** `file.ts:line` - [description]

### Suggestions
- [suggestion]

### What Looks Good
- [positive feedback]

### Verdict
[APPROVE / REQUEST CHANGES / NEEDS DISCUSSION]
```
