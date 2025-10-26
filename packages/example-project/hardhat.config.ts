import type { HardhatUserConfig } from "hardhat/config";
// import "@nomicfoundation/hardhat-toolbox";  // Incompatible with Hardhat 3
import solidityGPTPlugin from "@soliditygpt/hardhat-plugin";
// Import tasks - Hardhat 3 requires tasks to be imported in config file
import "@soliditygpt/hardhat-plugin/tasks/generate-tests";

const config: HardhatUserConfig = {
  // Hardhat 3 requires plugins to be declared in the plugins array
  plugins: [solidityGPTPlugin],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  solidityGPT: {
    apiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    model: "claude-sonnet-4",
    testFormat: "solidity",
    temperature: 0.1,
    maxTokens: 4000,
  },
};

export default config;
