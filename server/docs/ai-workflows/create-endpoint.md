# Workflow: Creating a New Backend Endpoint

This workflow guides developers and AI agents through the process of adding a new backend endpoint in the server codebase. Always pause and ask the developer the following questions before proceeding:

---

## 1. What route name do you want for this endpoint?

- Example: `/member-profiles`, `/trips`, `/custom-endpoint`

## 2. What HTTP method(s) will this endpoint support?

- Example: GET, POST, PATCH, DELETE

## 3. Is anything being passed through from the frontend? If so, what?

- Example: request body, query params, URL params
- Ask for sample payloads if possible

## 4. Is this route protected behind auth?

- If yes, use the `requireAuth` middleware.
- If no, do not include `requireAuth`.

## 5. What is the expected request/response shape?

- Ask for example input and output, including error cases.

---

**Reference:**

- See AGENTS.md for coding standards, error handling, and conventions.
- See existing files for implementation patterns: controllers, routes, middleware, and app registration.

_This workflow is designed to ensure clarity, security, and consistency when creating new backend endpoints._
