# Contributing to RosterHub

Thank you for your interest in contributing to RosterHub! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher
- Docker & Docker Compose
- Git

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/RosterHub.git
   cd RosterHub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cd apps/api
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres redis
   ```

5. **Run database migrations**
   ```bash
   cd apps/api
   npm run prisma:migrate
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Verify setup**
   ```bash
   # Run tests
   npm run test
   npm run test:e2e
   ```

---

## Development Workflow

### Branch Strategy

We use a **feature branch workflow**:

- `main` - Production-ready code (protected)
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring
- `test/*` - Test additions/improvements

### Creating a Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in the feature branch
2. Write/update tests for your changes
3. Ensure all tests pass
4. Update documentation if needed
5. Commit your changes following our [commit convention](#commit-convention)

### Keeping Your Branch Updated

```bash
# While on your feature branch
git fetch origin
git rebase origin/main
```

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements

### Scopes

Common scopes in this project:

- `api` - API server changes
- `csv` - CSV import/export features
- `users` - User entity
- `orgs` - Organization entity
- `classes` - Class entity
- `auth` - Authentication/authorization
- `db` - Database changes
- `docker` - Docker configuration
- `ci` - CI/CD pipeline
- `docs` - Documentation

### Examples

```bash
# Feature
feat(csv): add streaming CSV parser for large files

# Bug fix
fix(auth): correct API key validation logic

# Documentation
docs(api): update OpenAPI specification

# Test
test(users): add E2E tests for user CRUD operations

# Refactor
refactor(filter): improve filter parser performance
```

### Commit Message Guidelines

- Use imperative mood ("add" not "added" or "adds")
- First line max 72 characters
- Reference issues/PRs when applicable
- Provide context in the body for complex changes

---

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**
   ```bash
   npm run test
   npm run test:e2e
   npm run lint
   ```

2. **Update documentation**
   - Update README if adding features
   - Add/update JSDoc comments
   - Update API documentation if needed

3. **Check code quality**
   ```bash
   npm run lint
   npm run format
   ```

### Submitting a Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request on GitHub**
   - Use a clear, descriptive title
   - Follow the PR template
   - Link related issues
   - Add screenshots/examples if applicable

3. **PR Title Format**
   ```
   <type>(<scope>): <description>
   ```

   Example:
   ```
   feat(csv): Add support for delta CSV export
   ```

4. **PR Description Template**
   ```markdown
   ## Summary
   Brief description of changes

   ## Changes
   - Change 1
   - Change 2

   ## Related Issues
   Closes #123

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] E2E tests added/updated
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows project style guidelines
   - [ ] Tests pass locally
   - [ ] Documentation updated
   - [ ] No breaking changes (or documented)
   ```

### Review Process

1. At least one maintainer review required
2. All CI checks must pass
3. No merge conflicts with main
4. All review comments addressed

### After Merge

- Delete your feature branch
- Update your local main branch
- Close related issues

---

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Avoid `any` type - use proper typing
- Use interfaces for object shapes
- Use enums for fixed sets of values

### Code Style

We use **Prettier** and **ESLint** for code formatting:

```bash
# Format code
npm run format

# Check linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `csv-import.service.ts`)
- **Classes**: `PascalCase` (e.g., `CsvImportService`)
- **Interfaces**: `PascalCase` with `I` prefix for domain models (e.g., `IUser`)
- **Functions/Methods**: `camelCase` (e.g., `validateCsv()`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`)
- **Private members**: Prefix with `_` or use `private` keyword

### Project Structure

Follow the existing project structure:

```
apps/api/src/
├── common/           # Shared utilities, guards, interceptors
├── database/         # Prisma module
├── oneroster/        # OneRoster implementation
│   ├── csv/          # CSV import/export
│   ├── entities/     # Entity modules (users, orgs, etc.)
│   └── common/       # OneRoster shared code
└── app.module.ts     # Root module
```

### Documentation

- Add JSDoc comments for public APIs
- Document complex logic with inline comments
- Update README for new features
- Create/update architecture diagrams for major changes

---

## Testing Guidelines

### Test Coverage Requirements

- **Unit Tests**: Minimum 80% coverage for new code
- **E2E Tests**: Required for API endpoints
- **Integration Tests**: Required for service interactions

### Writing Tests

#### Unit Tests

```typescript
describe('CsvValidatorService', () => {
  let service: CsvValidatorService;

  beforeEach(() => {
    service = new CsvValidatorService();
  });

  it('should validate required fields', () => {
    const headers = ['sourcedId', 'status', 'dateLastModified'];
    const result = service.validateHeaders(headers, 'users');
    expect(result.valid).toBe(false);
  });
});
```

#### E2E Tests

```typescript
describe('CSV Import API (e2e)', () => {
  it('POST /csv/import - should upload valid CSV', () => {
    return request(app.getHttpServer())
      .post('/ims/oneroster/v1p2/csv/import')
      .attach('file', './test/fixtures/users.csv')
      .field('entityType', 'users')
      .expect(202);
  });
});
```

### Running Tests

```bash
# All tests
npm run test

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

---

## Documentation

### Code Documentation

- Use JSDoc for public APIs
- Include examples in documentation
- Document error conditions and exceptions

Example:
```typescript
/**
 * Validates CSV headers against required fields for entity type
 *
 * @param headers - Array of CSV column headers
 * @param entityType - OneRoster entity type (users, orgs, etc.)
 * @returns Validation result with errors
 *
 * @example
 * ```typescript
 * const result = validator.validateHeaders(
 *   ['sourcedId', 'status'],
 *   'users'
 * );
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
validateHeaders(headers: string[], entityType: string): ValidationResult {
  // ...
}
```

### README Updates

When adding features, update:
- Feature list
- API documentation
- Setup instructions (if applicable)
- Examples

---

## Questions?

- **Documentation**: Check [docs/](docs/) directory
- **Issues**: [GitHub Issues](https://github.com/your-org/RosterHub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/RosterHub/discussions)

---

## License

By contributing to RosterHub, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to RosterHub!
