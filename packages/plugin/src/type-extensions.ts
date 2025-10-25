/**
 * Type extensions for Hardhat
 */

import type {} from "hardhat/types/config";
import type {} from "hardhat/types/hre";
import type { SolidityGPTConfig } from "./types.js";
import type { TestValidator } from "./validators/testValidator.js";
import type { CompilerHelper } from "./utils/compiler.js";
import type { TestRefiner } from "./generator/refiner.js";
import type { ContractParser } from "./generator/parser.js";
import type { SecurityAnalyzer } from "./generator/analyzer.js";
import type { PromptBuilder } from "./generator/promptBuilder.js";
import type { AIService } from "./generator/aiService.js";
import type { TestWriter } from "./generator/writer.js";

declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    solidityGPT?: SolidityGPTConfig;
  }

  export interface HardhatConfig {
    solidityGPT: SolidityGPTConfig;
  }
}

declare module "hardhat/types/hre" {
  export interface HardhatRuntimeEnvironment {
    solidityGPT: {
      // Core services
      validator: TestValidator;
      compiler: CompilerHelper;
      refiner: TestRefiner;
      parser: ContractParser;
      analyzer: SecurityAnalyzer;
      promptBuilder: PromptBuilder;
      ai: AIService;
      writer: TestWriter;

      // High-level API
      generateTests(options: {
        contract?: string;
        format?: "typescript" | "solidity";
        security?: boolean;
        refine?: boolean;
      }): Promise<{ success: boolean; message: string }>;
    };
  }
}
