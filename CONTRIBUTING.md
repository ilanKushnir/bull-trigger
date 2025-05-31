# Contributing to Bull Trigger

Thanks for your interest in contributing! :tada:

## Workflow

1. **Fork** the repo and clone your fork.
2. Run `make bootstrap` to install deps.
3. Create feature branch: `git checkout -b feature/<topic>`.
4. Commit small, logical changes with Conventional Commits.
5. `npm test` must pass; `make up` should run cleanly.
6. Push and open Pull Request against `main`.
7. CI must be green. A CODEOWNER will review.

### PR Guidelines
- Describe **what** & **why** in the description.
- Reference any related issues.
- If adding UI, include a screenshot/GIF.
- Update docs/ and CHANGELOG when appropriate.

## Project Structure
- `backend/` Fastify API + strategies
- `frontend/` React Strategy Builder
- `packages/common` shared DTOs

Happy hacking! 🚀 