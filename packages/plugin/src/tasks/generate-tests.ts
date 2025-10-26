/**
 * Generate Tests Task - Main entry point for test generation
 */

import { task } from "hardhat/config";
import { ContractParser } from "../generator/parser.js";
import { SecurityAnalyzer } from "../generator/analyzer.js";
import { PromptBuilder } from "../generator/promptBuilder.js";
import { AIService } from "../generator/aiService.js";
import { TestWriter } from "../generator/writer.js";
import { TestValidator } from "../validators/testValidator.js";
import { TestRefiner } from "../generator/refiner.js";
import { CompilerHelper } from "../utils/compiler.js";
import ora from "ora";
import chalk from "chalk";
import type { GenerateTestsOptions } from "../types.js";

type HardhatRuntimeEnvironment = any;

interface ContractStats {
  name: string;
  functionCount: number;
  testPath: string;
  qualityScore: number;
  securityIssues: number;
  iterations?: number;
  success: boolean;
}

// Hardhat 3 task definition
// Note: Type assertions needed due to incomplete type definitions in Hardhat 3.0.9
(task("generate-tests", "Generate AI-powered tests for Solidity contracts") as any)
  .addOption({
    name: "contract",
    description: "Specific contract name to generate tests for",
    defaultValue: "",  // Empty string for optional
  })
  .addOption({
    name: "format",
    description: "Test format: 'typescript' or 'solidity'",
    defaultValue: "solidity",
  })
  .addFlag({
    name: "security",
    description: "Include security-focused tests",
  })
  .addFlag({
    name: "coverage",
    description: "Run coverage after generation",
  })
  .addFlag({
    name: "refine",
    description: "Enable iterative refinement (compile, test, fix)",
  })
  .setAction(async (taskArgs: any, hre: any) => {
    const startTime = Date.now();
    const contractStats: ContractStats[] = [];

    console.log(chalk.bold.cyan("\n🤖 SolidityGPT - AI-Powered Test Generator"));
    console.log(chalk.gray("=" .repeat(60)) + "\n");

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
      const validator = new TestValidator();

      // Initialize AI service with config
      const config = hre.config.solidityGPT || {};
      const aiService = new AIService({
        openaiApiKey: config.apiKey,
        anthropicApiKey: config.anthropicApiKey,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      // Initialize refiner if requested
      let refiner: TestRefiner | null = null;
      let compiler: CompilerHelper | null = null;
      if (taskArgs.refine) {
        compiler = new CompilerHelper(hre);
        refiner = new TestRefiner(aiService, compiler, writer, validator);
      }

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

      spinner.succeed(chalk.green(`Found ${targetContracts.length} contract(s) to process`));
      console.log();

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
          const prompt = promptBuilder.build(
            contract.source,
            info,
            security,
            {
              security: taskArgs.security,
              format: taskArgs.format,
            }
          );

          // Generate tests with AI
          spinner.text = `Generating tests for ${contract.name} (this may take 30-60s)...`;
          let tests = await aiService.generate(prompt);

          // Validate generated tests
          spinner.text = `Validating tests for ${contract.name}...`;
          const validation = validator.validate(tests, taskArgs.format);

          if (!validation.valid) {
            spinner.warn(chalk.yellow(`Validation warnings for ${contract.name}:`));
            validation.errors.forEach((err) => console.log(chalk.yellow(`  ⚠️  ${err}`)));

            // If refine is enabled, this will be fixed during refinement
            if (!taskArgs.refine) {
              console.log(chalk.cyan("  💡 Tip: Use --refine flag to automatically fix validation issues"));
            }
          }

          // Check test quality
          const quality = validator.validateTestQuality(tests, taskArgs.format);
          if (quality.score < 80 && quality.feedback.length > 0) {
            console.log(chalk.blue(`  📊 Test quality score: ${quality.score}/100`));
            quality.feedback.forEach((feedback) =>
              console.log(chalk.cyan(`  💡 ${feedback}`))
            );
          }

          let testPath: string;

          // Use iterative refinement if enabled
          if (taskArgs.refine && refiner) {
            spinner.text = `Refining tests for ${contract.name}...`;
            console.log(""); // New line for refinement output

            const refinementResult = await refiner.refine(
              tests,
              contract.source,
              hre.config.paths.tests,
              contract.name,
              taskArgs.format
            );

            tests = refinementResult.finalCode;

            if (refinementResult.success) {
              spinner.succeed(
                chalk.green(`✓ Generated and refined tests for ${contract.name} (${refinementResult.iterations.length} iterations)`)
              );
            } else {
              spinner.warn(
                chalk.yellow(`Tests generated for ${contract.name} but refinement incomplete`)
              );
              console.log(
                chalk.yellow(`  Used ${refinementResult.iterations.length} iterations, some issues may remain`)
              );
            }

            // Test path was already created by refiner
            testPath = `${hre.config.paths.tests}/${contract.name}${taskArgs.format === "solidity" ? ".t.sol" : ".test.ts"}`;

            // Track stats
            contractStats.push({
              name: contract.name,
              functionCount: info.functions.length,
              testPath,
              qualityScore: quality.score,
              securityIssues: (security.reentrancyRisk?.length || 0) + (security.accessControl?.length || 0),
              iterations: refinementResult.iterations.length,
              success: refinementResult.success
            });
          } else {
            // Write test file without refinement
            spinner.text = `Writing test file for ${contract.name}...`;
            testPath = await writer.writeTest(
              hre.config.paths.tests,
              contract.name,
              tests,
              taskArgs.format
            );

            spinner.succeed(
              chalk.green(`✓ Generated tests for ${contract.name} → ${chalk.gray(testPath)}`)
            );

            // Track stats
            contractStats.push({
              name: contract.name,
              functionCount: info.functions.length,
              testPath,
              qualityScore: quality.score,
              securityIssues: (security.reentrancyRisk?.length || 0) + (security.accessControl?.length || 0),
              success: true
            });
          }

          // Show summary
          console.log(chalk.gray(`  Functions tested: ${info.functions.length}`));
          if (taskArgs.security && security.reentrancyRisk.length > 0) {
            console.log(
              chalk.yellow(`  ⚠️  Reentrancy risks identified: ${security.reentrancyRisk.length}`)
            );
          }
          if (taskArgs.security && security.accessControl.length > 0) {
            console.log(
              chalk.blue(`  🔒 Access control functions: ${security.accessControl.length}`)
            );
          }
          if (quality.score >= 80) {
            console.log(chalk.green(`  ✨ Quality score: ${quality.score}/100`));
          }
          console.log(); // Add spacing between contracts
        } catch (error: any) {
          spinner.fail(chalk.red(`Failed to generate tests for ${contract.name}`));
          console.error(chalk.red(`  Error: ${error.message}`));

          // Track failed contract
          contractStats.push({
            name: contract.name,
            functionCount: 0,
            testPath: "",
            qualityScore: 0,
            securityIssues: 0,
            success: false
          });
          console.log();
          continue;
        }
      }

      spinner.succeed(chalk.green.bold("Test generation complete!"));

      // Run coverage if requested
      if (taskArgs.coverage) {
        console.log();
        spinner.start("Running coverage...");
        try {
          await hre.run("test", { coverage: true });
          spinner.succeed(chalk.green("Coverage analysis complete"));
        } catch (error: any) {
          spinner.fail(chalk.red("Coverage analysis failed"));
          console.error(chalk.red(`  Error: ${error.message}`));
        }
      }

      // Print summary statistics
      const endTime = Date.now();
      const totalTime = ((endTime - startTime) / 1000).toFixed(2);
      const successCount = contractStats.filter(s => s.success).length;
      const failCount = contractStats.length - successCount;
      const totalFunctions = contractStats.reduce((sum, s) => sum + s.functionCount, 0);
      const avgQuality = contractStats.length > 0
        ? (contractStats.reduce((sum, s) => sum + s.qualityScore, 0) / contractStats.length).toFixed(1)
        : 0;
      const totalSecurityIssues = contractStats.reduce((sum, s) => sum + s.securityIssues, 0);

      console.log("\n" + chalk.bold.cyan("=" .repeat(60)));
      console.log(chalk.bold.cyan("📊 Summary"));
      console.log(chalk.bold.cyan("=" .repeat(60)));
      console.log(chalk.gray(`  Time taken:          ${chalk.white(totalTime + 's')}`));
      console.log(chalk.gray(`  Contracts processed: ${chalk.white(contractStats.length)}`));
      console.log(chalk.green(`  ✓ Successful:        ${chalk.white(successCount)}`));
      if (failCount > 0) {
        console.log(chalk.red(`  ✗ Failed:            ${chalk.white(failCount)}`));
      }
      console.log(chalk.gray(`  Total functions:     ${chalk.white(totalFunctions)}`));
      console.log(chalk.gray(`  Avg quality score:   ${chalk.white(avgQuality + '/100')}`));
      if (totalSecurityIssues > 0) {
        console.log(chalk.yellow(`  Security issues:     ${chalk.white(totalSecurityIssues)}`));
      }

      if (successCount > 0) {
        console.log("\n" + chalk.bold.green("  Generated test files:"));
        contractStats.filter(s => s.success).forEach(stat => {
          console.log(chalk.gray(`    • ${stat.name} → ${chalk.white(stat.testPath)}`));
        });
      }

      console.log(chalk.bold.cyan("\n=" .repeat(60)));
      console.log(chalk.green.bold("\n✨ All done! ") + chalk.gray("Run ") + chalk.cyan("'npx hardhat test'") + chalk.gray(" to execute the tests."));
      console.log();
    } catch (error: any) {
      spinner.fail(chalk.red.bold("Test generation failed"));
      console.error(chalk.red(`Error: ${error.message}`));
      throw error;
    }
  });
