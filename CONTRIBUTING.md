# Contributing Guidelines

Thank you for your interest in contributing to the H1T MICRO project. Please review the following standards and workflows prior to opening pull requests.

---

## 1. Code of Conduct & Principles

- Maintain technical precision and factual nutrition naming conventions.
- Strictly adhere to neutral marketing terminology and design consistency.
- Avoid using emoji icons in user interfaces, commit messages, and documentation.
- Maintain documentation integrity and preserve functional code comments.

---

## 2. Development Workflow

### Branching Strategy
- `main`: Production-ready branch. All changes merged here must pass automated CI checks.
- `develop`: Integration branch for active feature development.
- Feature branches: Use descriptive branch names with appropriate prefixes:
  - `feat/feature-name`
  - `fix/bug-description`
  - `refactor/component-name`
  - `docs/documentation-update`

### Task Runner Sequencing (AI Agents & Contributors)
When executing or implementing tasks specified in the `tasks/` directory:
- Complete tasks strictly in sequential order (00 -> 01 -> 02 -> 03 -> 04).
- Never begin task N+1 until task N passes compilation, static analysis, and unit tests.

---

## 3. Git Commit Conventions

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description in imperative present tense>
```

### Allowed Types:
- `feat`: A new feature or user-facing capability.
- `fix`: A bug fix or error correction.
- `docs`: Documentation modifications only.
- `style`: Changes that do not affect the meaning of the code (formatting, white-space).
- `refactor`: Code changes that neither fix a bug nor add a feature.
- `perf`: A code change that improves performance.
- `test`: Adding or correcting tests.
- `chore`: Changes to build process, dependency updates, or auxiliary tools.

### Examples:
- `feat(diary): add preworkout meal slot calculation`
- `fix(auth): correct token validation in admin middleware`
- `docs: add security and contribution guidelines`

---

## 4. Quality Assurance & Verification

Before submitting changes, ensure all verification steps pass locally:

### Backend Checks (`apps/api`):
```bash
cd apps/api
go vet ./...
go test -v ./...
go build ./cmd/server
```

### Frontend Checks (`apps/web`):
```bash
cd apps/web
npm run typecheck
npm run lint
npm run build
```

---

## 5. Pull Request Submission

1. Ensure your local branch is rebased onto the latest `main` branch.
2. Provide a clear summary of the changes, motivation, and verification steps in the pull request description.
3. Ensure all CI checks (Backend Go CI and Frontend Next.js CI) pass completely.
