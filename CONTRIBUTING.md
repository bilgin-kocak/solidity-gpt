# Contributing to SolidityGPT

Thank you for your interest in contributing to SolidityGPT! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- **Node.js**: v22 or later
- **pnpm**: v9 or later
- **Git**: Latest version
- **API Keys**: OpenAI and/or Anthropic API keys for testing

### First-Time Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
```bash
git clone https://github.com/YOUR_USERNAME/soliditygpt.git
cd soliditygpt
```

3. **Install Node.js v22** (if not already installed):
```bash
nvm install 22
nvm use 22
```

4. **Install dependencies**:
```bash
pnpm install
```

5. **Build the project**:
```bash
pnpm build
```

6. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env and add your API keys
```

7. **Test the setup**:
```bash
cd packages/example-project
npx hardhat generate-tests --contract SimpleToken
```

## Development Setup

### Installing pnpm

If you don't have pnpm installed:

```bash
npm install -g pnpm
```

### IDE Recommendations

**VS Code** is recommended with these extensions:

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Solidity**: Solidity language support
- **TypeScript and JavaScript**: Built-in

### Workspace Configuration

This is a **pnpm workspace monorepo** with:

- `packages/plugin`: Main SolidityGPT plugin
- `packages/example-project`: Example Hardhat project for testing

## Project Structure

```
soliditygpt/
├── packages/
│   ├── plugin/                      # Main plugin package
│   │   ├── src/
│   │   │   ├── generator/           # Core generation logic
│   │   │   │   ├── aiService.ts     # AI API integration
│   │   │   │   ├── analyzer.ts      # Security analysis
│   │   │   │   ├── parser.ts        # Contract parsing
│   │   │   │   ├── promptBuilder.ts # Prompt construction
│   │   │   │   ├── refiner.ts       # Test refinement
│   │   │   │   └── writer.ts        # File writing
│   │   │   ├── validators/
│   │   │   │   └── testValidator.ts # Test validation
│   │   │   ├── utils/
│   │   │   │   └── compiler.ts      # Compilation helpers
│   │   │   ├── tasks/
│   │   │   │   └── generate-tests.ts # Main Hardhat task
│   │   │   ├── types.ts             # TypeScript types
│   │   │   └── index.ts             # Plugin entry point
│   │   ├── test/                    # Unit tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── example-project/             # Testing environment
│       ├── contracts/               # Example contracts
│       ├── test/                    # Generated tests
│       ├── scripts/                 # Demo scripts
│       └── hardhat.config.ts
├── .env.example                     # Environment template
├── pnpm-workspace.yaml              # Workspace config
└── README.md
```

## Development Workflow

### Build and Watch

```bash
# Build all packages
pnpm build

# Build in watch mode (auto-rebuild on changes)
pnpm dev

# Clean build artifacts
pnpm clean
```

### Testing Changes

1. **Make changes** to the plugin code in `packages/plugin/src`

2. **Rebuild** the plugin:
```bash
pnpm build
```

3. **Test** with example project:
```bash
cd packages/example-project
npx hardhat generate-tests --contract SimpleToken --security
npx hardhat test
```

### Adding New Features

1. **Create a feature branch**:
```bash
git checkout -b feature/your-feature-name
```

2. **Implement the feature** following the coding standards

3. **Add tests** for the new functionality

4. **Update documentation** if needed

5. **Build and test**:
```bash
pnpm build
cd packages/example-project
npx hardhat generate-tests
```

6. **Commit changes** with clear messages:
```bash
git add .
git commit -m "feat: add your feature description"
```

## Coding Standards

### TypeScript

- **ES Modules**: Use ES module syntax (`import/export`)
- **Type Safety**: Avoid `any` where possible, use proper types
- **Naming Conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and interfaces
  - `UPPER_SNAKE_CASE` for constants

**Example**:
```typescript
// Good
export class TestGenerator {
  private apiService: AIService;

  async generate(contract: string): Promise<string> {
    // Implementation
  }
}

// Avoid
export class test_generator {
  private api_service: any;

  async Generate(contract: any): Promise<any> {
    // Implementation
  }
}
```

### File Organization

- **One class per file** (with matching filename)
- **Group related files** in directories
- **Export types** from `types.ts`
- **Barrel exports**: Use `index.ts` for module exports

### Comments and Documentation

- **TSDoc comments** for public APIs:
```typescript
/**
 * Generate tests for a Solidity contract
 * @param contract The contract source code
 * @param options Generation options
 * @returns Generated test code
 */
async generate(contract: string, options: Options): Promise<string>
```

- **Inline comments** for complex logic
- **No comments** for self-explanatory code

### Error Handling

- **Use descriptive errors**:
```typescript
throw new Error(`Failed to generate tests for ${contractName}: ${reason}`);
```

- **Handle async errors** with try/catch
- **Log errors** with context for debugging

### Code Style

We use Prettier and ESLint (configuration inherited from project):

- **2 spaces** for indentation
- **Double quotes** for strings
- **Semicolons** required
- **Trailing commas** in multiline

## Testing Guidelines

### Unit Tests

Create tests in `packages/plugin/test/`:

```typescript
import { expect } from "chai";
import { ContractParser } from "../src/generator/parser";

describe("ContractParser", () => {
  it("should parse a simple contract", () => {
    const parser = new ContractParser();
    const source = `contract Test { }`;
    const ast = parser.parse(source);
    expect(ast).to.not.be.null;
  });
});
```

### Integration Tests

Test with real contracts in `packages/example-project`:

1. **Add test contract** in `contracts/`
2. **Run generation**:
```bash
npx hardhat generate-tests --contract YourContract
```
3. **Verify output**:
```bash
npx hardhat test
```

### Manual Testing Checklist

Before submitting a PR, test:

- ✅ Plugin builds without errors
- ✅ All example contracts generate tests successfully
- ✅ Generated tests compile
- ✅ Generated tests pass
- ✅ `--security` flag works
- ✅ `--refine` flag works
- ✅ `--format typescript` and `--format solidity` both work
- ✅ Error handling works (invalid inputs, missing API keys, etc.)

## Pull Request Process

### Before Submitting

1. **Update from main**:
```bash
git fetch upstream
git rebase upstream/main
```

2. **Build and test**:
```bash
pnpm clean
pnpm install
pnpm build
```

3. **Check code quality**:
```bash
pnpm lint  # If linting is configured
```

4. **Update documentation** if needed

### PR Guidelines

**Title Format**:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `refactor: improve code structure`
- `test: add or update tests`
- `chore: maintenance tasks`

**Description Should Include**:
- **What** changed
- **Why** it changed
- **How** to test it
- **Screenshots** (if UI changes)
- **Breaking changes** (if any)

**Example**:
```markdown
## What
Add support for generating invariant tests

## Why
Users requested the ability to generate stateful fuzzing tests

## How to Test
1. Run `npx hardhat generate-tests --invariant`
2. Verify generated tests include invariant test handlers

## Breaking Changes
None
```

### Review Process

1. **Automated checks** must pass (build, tests)
2. **Code review** by maintainers
3. **Address feedback** and update PR
4. **Approval** from at least one maintainer
5. **Merge** by maintainers

## Reporting Bugs

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Test with latest version**
3. **Reproduce the bug** consistently

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Run command '...'
2. With contract '...'
3. See error

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Environment**
- Node.js version:
- pnpm version:
- Hardhat version:
- OS:

**Additional context**
Any other relevant information, logs, screenshots, etc.
```

## Feature Requests

### Before Requesting

1. **Check existing issues** and roadmap
2. **Consider the scope** - does it fit the project goals?
3. **Think about implementation** - is it feasible?

### Feature Request Template

```markdown
**Problem to solve**
Describe the problem or use case.

**Proposed solution**
How would this feature work?

**Alternatives considered**
What other approaches did you consider?

**Additional context**
Any examples, mockups, or related projects.
```

## Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Documentation**: Check README and other docs first

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to SolidityGPT! 🎉
