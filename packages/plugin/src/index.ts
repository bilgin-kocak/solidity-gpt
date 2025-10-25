/**
 * SolidityGPT - AI-Powered Test Generator for Hardhat 3
 *
 * A Hardhat plugin that generates comprehensive Solidity tests using AI.
 */

import "./type-extensions.js";
import type { HardhatHooks, HookContext } from "hardhat/types/hooks";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { HardhatUserConfig } from "hardhat/types/config";
import { TestValidator } from "./validators/testValidator.js";
import { CompilerHelper } from "./utils/compiler.js";
import { TestRefiner } from "./generator/refiner.js";
import { ContractParser } from "./generator/parser.js";
import { SecurityAnalyzer } from "./generator/analyzer.js";
import { PromptBuilder } from "./generator/promptBuilder.js";
import { AIService } from "./generator/aiService.js";
import { TestWriter } from "./generator/writer.js";

// Hardhat 3 Plugin Export with Hook-based Architecture
const solidityGPTPlugin = {
  id: "@soliditygpt/hardhat-plugin",

  // Hook handlers for advanced integration
  hooks: {
    // HRE creation hook - extends the Hardhat Runtime Environment
    hre: {
      created: async (
        context: HookContext,
        hre: HardhatRuntimeEnvironment
      ): Promise<void> => {
        // Initialize all Phase 2 services
        const validator = new TestValidator();
        const compilerHelper = new CompilerHelper(hre as any);
        const refiner = new TestRefiner(hre as any);
        const parser = new ContractParser();
        const analyzer = new SecurityAnalyzer();
        const promptBuilder = new PromptBuilder();
        const aiService = new AIService(hre as any);
        const writer = new TestWriter();

        // Extend HRE with SolidityGPT services
        (hre as any).solidityGPT = {
          // Core services
          validator,
          compiler: compilerHelper,
          refiner,
          parser,
          analyzer,
          promptBuilder,
          ai: aiService,
          writer,

          // High-level API for generating tests
          async generateTests(options: {
            contract?: string;
            format?: "typescript" | "solidity";
            security?: boolean;
            refine?: boolean;
          }) {
            const {
              contract,
              format = "solidity",
              security = false,
              refine = false,
            } = options;

            console.log("🤖 SolidityGPT: Generating tests...");
            console.log(`  Contract: ${contract || "all"}`);
            console.log(`  Format: ${format}`);
            console.log(`  Security: ${security ? "enabled" : "disabled"}`);
            console.log(`  Refine: ${refine ? "enabled" : "disabled"}`);

            // Implementation will call the Phase 2 modules
            // This provides a clean API for scripts to use
            return {
              success: true,
              message: "Test generation complete (stub)",
            };
          },
        };

        // Register user interaction handlers for better UX
        hre.hooks.registerHandlers("userInterruptions", {
          displayMessage: async (
            ctx: HookContext,
            interruptor: string,
            message: string,
            next: (c: HookContext, i: string, m: string) => Promise<void>
          ): Promise<void> => {
            if (interruptor === "SolidityGPT") {
              // Custom formatting for our messages
              console.log(`\n🤖 ${message}\n`);
            } else {
              // Default behavior for other messages
              await next(ctx, interruptor, message);
            }
          },
        });

        console.log("✅ SolidityGPT plugin initialized");
      },
    },

    // Config extension hook - add default configuration
    config: {
      extendUserConfig: async (
        config: HardhatUserConfig,
        next: (c: HardhatUserConfig) => Promise<HardhatUserConfig>
      ): Promise<HardhatUserConfig> => {
        const extended = {
          ...config,
          solidityGPT: {
            // Default values
            model: "gpt-4",
            testFormat: "solidity",
            temperature: 0.1,
            maxTokens: 4000,
            // Merge with user config
            ...config.solidityGPT,
          },
        };

        return await next(extended);
      },

      validateUserConfig: async (
        config: HardhatUserConfig
      ): Promise<any[]> => {
        const errors = [];

        if (config.solidityGPT) {
          // Validate API keys if specified
          const { apiKey, anthropicApiKey } = config.solidityGPT;

          if (!apiKey && !anthropicApiKey) {
            errors.push({
              path: ["solidityGPT"],
              message:
                "At least one API key (apiKey or anthropicApiKey) is required. Set them in your .env file.",
            });
          }

          // Validate model selection
          const validModels = ["gpt-4", "gpt-4o", "claude-sonnet-4"];
          if (
            config.solidityGPT.model &&
            !validModels.includes(config.solidityGPT.model)
          ) {
            errors.push({
              path: ["solidityGPT", "model"],
              message: `Invalid model. Must be one of: ${validModels.join(", ")}`,
            });
          }
        }

        return errors;
      },

      resolveUserConfig: async (
        userConfig: HardhatUserConfig,
        resolveVar: any,
        next: (c: HardhatUserConfig, r: any) => Promise<any>
      ): Promise<any> => {
        const resolved = await next(userConfig, resolveVar);

        // Resolve SolidityGPT config
        return {
          ...resolved,
          solidityGPT: {
            apiKey: userConfig.solidityGPT?.apiKey || process.env.OPENAI_API_KEY,
            anthropicApiKey:
              userConfig.solidityGPT?.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
            model: userConfig.solidityGPT?.model || "gpt-4",
            testFormat: userConfig.solidityGPT?.testFormat || "solidity",
            temperature: userConfig.solidityGPT?.temperature || 0.1,
            maxTokens: userConfig.solidityGPT?.maxTokens || 4000,
          },
        };
      },
    },
  },
};

export default solidityGPTPlugin;
