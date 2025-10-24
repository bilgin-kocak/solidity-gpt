# @soliditygpt/hardhat-plugin

AI-powered test generator plugin for Hardhat 3.

## Installation

```bash
npm install @soliditygpt/hardhat-plugin
# or
yarn add @soliditygpt/hardhat-plugin
# or
pnpm add @soliditygpt/hardhat-plugin
```

## Setup

Add to your `hardhat.config.ts`:

```typescript
import solidityGPT from "@soliditygpt/hardhat-plugin";

const config: HardhatUserConfig = {
  plugins: [solidityGPT],
  // ... other config
};

export default config;
```

Set environment variables:

```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

```bash
# Generate tests for all contracts
npx hardhat generate-tests

# Generate for specific contract
npx hardhat generate-tests --contract MyContract

# Generate TypeScript tests
npx hardhat generate-tests --format typescript

# Include security tests
npx hardhat generate-tests --security
```

## Configuration

Customize in `hardhat.config.ts`:

```typescript
const config: HardhatUserConfig = {
  plugins: [solidityGPT],
  solidityGPT: {
    model: "claude-sonnet-4", // or "gpt-4o"
    testFormat: "solidity",     // or "typescript"
    temperature: 0.1,
    maxTokens: 4000,
  },
};
```

## Features

- Dual AI support (GPT-4o + Claude Sonnet 4)
- Multiple test formats (Solidity + TypeScript)
- Security vulnerability detection
- Edge case generation
- Automatic retries

## License

MIT
