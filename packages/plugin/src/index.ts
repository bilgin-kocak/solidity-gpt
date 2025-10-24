/**
 * SolidityGPT - AI-Powered Test Generator for Hardhat 3
 *
 * A Hardhat plugin that generates comprehensive Solidity tests using AI.
 */

import type { HardhatPlugin } from "hardhat/types";
import "./type-extensions.js";
import "./tasks/generate-tests.js";

const solidityGPT: HardhatPlugin = {
  id: "soliditygpt",

  config: {
    solidityGPT: {
      apiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-sonnet-4",
      testFormat: "solidity",
      temperature: 0.1,
      maxTokens: 4000,
    },
  },
};

export default solidityGPT;
