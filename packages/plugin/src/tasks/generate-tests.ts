/**
 * Generate Tests Task - Main entry point for test generation
 */

import { task } from "hardhat/config";
import { ContractParser } from "../generator/parser.js";
import { SecurityAnalyzer } from "../generator/analyzer.js";
import { PromptBuilder } from "../generator/promptBuilder.js";
import { AIService } from "../generator/aiService.js";
import { TestWriter } from "../generator/writer.js";
import ora from "ora";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { GenerateTestsOptions } from "../types.js";

task("generate-tests", "Generate AI-powered tests for Solidity contracts")
  .addOptionalParam("contract", "Specific contract name to generate tests for")
  .addOptionalParam(
    "format",
    "Test format: 'typescript' or 'solidity'",
    "solidity"
  )
  .addFlag("security", "Include security-focused tests")
  .addFlag("coverage", "Run coverage after generation")
  .setAction(async (taskArgs: GenerateTestsOptions, hre: HardhatRuntimeEnvironment) => {
    const spinner = ora("Initializing SolidityGPT...").start();

    try {
      // Validate format
      if (taskArgs.format !== "typescript" && taskArgs.format !== "solidity") {
        throw new Error(
          `Invalid format: ${taskArgs.format}. Must be 'typescript' or 'solidity'`
        );
      }

      // Initialize services
      const parser = new ContractParser();
      const analyzer = new SecurityAnalyzer();
      const promptBuilder = new PromptBuilder();
      const writer = new TestWriter();

      // Initialize AI service with config
      const config = hre.config.solidityGPT || {};
      const aiService = new AIService({
        openaiApiKey: config.apiKey,
        anthropicApiKey: config.anthropicApiKey,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      spinner.succeed("SolidityGPT initialized");
      spinner.start("Reading contracts...");

      // Read contracts
      const contractsPath = hre.config.paths.sources;
      const contracts = await parser.readContracts(contractsPath);

      if (contracts.length === 0) {
        spinner.fail("No contracts found");
        return;
      }

      // Filter to specific contract if requested
      const targetContracts = taskArgs.contract
        ? contracts.filter((c) => c.name === taskArgs.contract)
        : contracts;

      if (targetContracts.length === 0) {
        spinner.fail(`Contract '${taskArgs.contract}' not found`);
        return;
      }

      spinner.succeed(
        `Found ${targetContracts.length} contract(s) to process`
      );

      // Process each contract
      for (const contract of targetContracts) {
        spinner.start(`Processing ${contract.name}...`);

        try {
          // Parse contract
          const ast = parser.parse(contract.source);
          const info = parser.extractInfo(ast, contract.source);

          if (info.functions.length === 0) {
            spinner.warn(
              `${contract.name} has no functions to test, skipping...`
            );
            continue;
          }

          spinner.text = `Analyzing ${contract.name}...`;

          // Analyze security patterns
          const security = analyzer.analyze(ast);

          // Build prompt
          spinner.text = `Building prompt for ${contract.name}...`;
          const prompt = promptBuilder.build({
            contract: contract.source,
            functions: info.functions,
            security: security,
            format: taskArgs.format,
            includeSecurity: taskArgs.security,
          });

          // Generate tests with AI
          spinner.text = `Generating tests for ${contract.name} (this may take 30-60s)...`;
          const tests = await aiService.generate(prompt);

          // Write test file
          spinner.text = `Writing test file for ${contract.name}...`;
          const testPath = await writer.writeTest(
            hre.config.paths.tests,
            contract.name,
            tests,
            taskArgs.format
          );

          spinner.succeed(
            `✓ Generated tests for ${contract.name} → ${testPath}`
          );

          // Show summary
          console.log(`  Functions tested: ${info.functions.length}`);
          if (taskArgs.security && security.reentrancyRisk.length > 0) {
            console.log(
              `  Reentrancy risks identified: ${security.reentrancyRisk.length}`
            );
          }
          if (taskArgs.security && security.accessControl.length > 0) {
            console.log(
              `  Access control functions: ${security.accessControl.length}`
            );
          }
        } catch (error: any) {
          spinner.fail(`Failed to generate tests for ${contract.name}`);
          console.error(`  Error: ${error.message}`);
          continue;
        }
      }

      spinner.succeed("Test generation complete!");

      // Run coverage if requested
      if (taskArgs.coverage) {
        spinner.start("Running coverage...");
        try {
          await hre.run("test", { coverage: true });
          spinner.succeed("Coverage analysis complete");
        } catch (error: any) {
          spinner.fail("Coverage analysis failed");
          console.error(`  Error: ${error.message}`);
        }
      }

      console.log("\n✨ All done! Run 'npx hardhat test' to execute the tests.");
    } catch (error: any) {
      spinner.fail("Test generation failed");
      console.error(`Error: ${error.message}`);
      throw error;
    }
  });
