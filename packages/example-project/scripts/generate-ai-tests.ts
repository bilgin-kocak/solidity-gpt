/**
 * SolidityGPT - Full Test Generation Script
 *
 * Complete end-to-end AI-powered test generation using all Phase 2 modules
 *
 * Usage:
 *   npx hardhat run scripts/generate-ai-tests.ts
 *
 * Options (edit the config below):
 *   - contractName: Which contract to test
 *   - security: Include security-focused tests
 *   - refine: Use iterative refinement
 *   - format: "solidity" or "typescript"
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "url";

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
loadEnv();

// Import all Phase 2 modules
import { TestValidator } from "@soliditygpt/hardhat-plugin/validators/testValidator";
import { CompilerHelper } from "@soliditygpt/hardhat-plugin/utils/compiler";
import { TestRefiner } from "@soliditygpt/hardhat-plugin/generator/refiner";
import { ContractParser } from "@soliditygpt/hardhat-plugin/generator/parser";
import { SecurityAnalyzer } from "@soliditygpt/hardhat-plugin/generator/analyzer";
import { PromptBuilder } from "@soliditygpt/hardhat-plugin/generator/promptBuilder";
import { AIService } from "@soliditygpt/hardhat-plugin/generator/aiService";
import { TestWriter } from "@soliditygpt/hardhat-plugin/generator/writer";

// Configuration
const CONFIG = {
  contractName: "SimpleToken",  // Change this to test other contracts
  security: true,                // Include security-focused tests
  refine: false,                 // Use iterative refinement (requires multiple AI calls)
  format: "solidity" as const,   // "solidity" or "typescript"
};

console.log("\n🤖 SolidityGPT - AI-Powered Test Generation");
console.log("=".repeat(60));
console.log(`Contract: ${CONFIG.contractName}`);
console.log(`Security Tests: ${CONFIG.security ? "✅" : "❌"}`);
console.log(`Refinement: ${CONFIG.refine ? "✅" : "❌"}`);
console.log(`Format: ${CONFIG.format}`);
console.log("=".repeat(60));
console.log();

async function generateTests() {
  try {
    // Step 1: Initialize all Phase 2 modules
    console.log("📦 Step 1: Initializing Phase 2 modules...");
    const validator = new TestValidator();
    const compiler = new CompilerHelper(hre as any);
    const writer = new TestWriter();

    // Load API keys from environment
    const apiConfig = {
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      model: (hre.config as any).solidityGPT?.model || "claude-sonnet-4-5-20250929", // Claude Sonnet 4.5 (LATEST)
      temperature: (hre.config as any).solidityGPT?.temperature || 0.1,
      maxTokens: (hre.config as any).solidityGPT?.maxTokens || 16000,  // Increased for GPT-5/Claude Sonnet 4.5 longer context
    };

    console.log(`   API Keys: OpenAI=${!!apiConfig.openaiApiKey}, Anthropic=${!!apiConfig.anthropicApiKey}`);

    const aiService = new AIService(apiConfig);
    const refiner = new TestRefiner(aiService, compiler, writer, validator);
    const parser = new ContractParser();
    const analyzer = new SecurityAnalyzer();
    const promptBuilder = new PromptBuilder();
    console.log("   ✅ All modules initialized\n");

    // Step 2: Read contract source
    console.log("📄 Step 2: Reading contract source...");
    const contractPath = path.join(
      __dirname,
      "..",
      "contracts",
      `${CONFIG.contractName}.sol`
    );

    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract not found: ${contractPath}`);
    }

    const contractSource = fs.readFileSync(contractPath, "utf-8");
    console.log(`   ✅ Read ${contractSource.length} characters from ${CONFIG.contractName}.sol\n`);

    // Step 3: Parse contract
    console.log("🔍 Step 3: Parsing contract...");
    const ast = parser.parse(contractSource);
    const parsed = parser.extractInfo(ast, contractSource);
    parsed.contractName = CONFIG.contractName; // Set contract name from config

    console.log(`   Contract: ${parsed.contractName}`);
    console.log(`   Functions: ${parsed.functions.length}`);
    console.log(`   State Variables: ${parsed.stateVariables.length}`);
    console.log(`   Events: ${parsed.events.length}`);

    if (parsed.functions.length > 0) {
      console.log("\n   📋 Functions found:");
      parsed.functions.slice(0, 5).forEach((fn: any, i: number) => {
        const params = fn.parameters.map((p: any) => `${p.type} ${p.name}`).join(", ");
        console.log(`     ${i + 1}. ${fn.name}(${params})`);
      });
      if (parsed.functions.length > 5) {
        console.log(`     ... and ${parsed.functions.length - 5} more`);
      }
    }
    console.log();

    // Step 4: Security analysis (if enabled)
    let securityReport;
    if (CONFIG.security) {
      console.log("🔒 Step 4: Security analysis...");
      securityReport = analyzer.analyze(contractSource);
      console.log(`   Risk Level: ${securityReport.riskLevel ? securityReport.riskLevel.toUpperCase() : "LOW"}`);
      console.log(`   Vulnerabilities Found: ${securityReport.vulnerabilities?.length || 0}`);

      if (securityReport.vulnerabilities && securityReport.vulnerabilities.length > 0) {
        console.log("\n   ⚠️ Issues:");
        securityReport.vulnerabilities.slice(0, 3).forEach((vuln: any, i: number) => {
          console.log(`     ${i + 1}. [${vuln.severity}] ${vuln.type}: ${vuln.description}`);
        });
        if (securityReport.vulnerabilities.length > 3) {
          console.log(`     ... and ${securityReport.vulnerabilities.length - 3} more`);
        }
      } else {
        console.log("   ✅ No critical vulnerabilities detected");
      }

      if (securityReport.recommendations && securityReport.recommendations.length > 0) {
        console.log("\n   💡 Recommendations:");
        securityReport.recommendations.slice(0, 3).forEach((rec: string, i: number) => {
          console.log(`     ${i + 1}. ${rec}`);
        });
      }
      console.log();
    } else {
      console.log("⏭️  Step 4: Security analysis (skipped)\n");
    }

    // Step 5: Build AI prompt
    console.log("🧠 Step 5: Building AI prompt...");
    const prompt = promptBuilder.build(
      contractSource,
      parsed,
      securityReport,
      {
        security: CONFIG.security,
        format: CONFIG.format,
      }
    );
    console.log(`   ✅ Generated prompt (${prompt.length} characters)\n`);

    // Step 6: Generate tests with AI
    console.log("🤖 Step 6: Generating tests with AI...");
    console.log("   Calling AI service (this may take 10-30 seconds)...");

    const model = (hre.config as any).solidityGPT?.model || "claude-sonnet-4-5-20250929";
    console.log(`   Using AI model: ${model}`);
    const generatedCode = await aiService.generate(prompt, model as any);

    console.log(`   ✅ Generated ${generatedCode.length} characters of test code\n`);

    // Step 7: Validate generated tests
    console.log("✅ Step 7: Validating generated tests...");
    const validation = validator.validate(generatedCode, CONFIG.format);
    console.log(`   Valid: ${validation.isValid ? "✅" : "❌"}`);
    console.log(`   Quality Score: ${validation.qualityScore}/100`);

    if (validation.errors.length > 0) {
      console.log(`   Errors: ${validation.errors.length}`);
      validation.errors.slice(0, 3).forEach((err: string) => {
        console.log(`     - ${err}`);
      });
      if (validation.errors.length > 3) {
        console.log(`     ... and ${validation.errors.length - 3} more`);
      }
    }

    if (validation.suggestions && validation.suggestions.length > 0) {
      console.log(`   Suggestions: ${validation.suggestions.length}`);
      validation.suggestions.slice(0, 3).forEach((sug: string) => {
        console.log(`     - ${sug}`);
      });
      if (validation.suggestions.length > 3) {
        console.log(`     ... and ${validation.suggestions.length - 3} more`);
      }
    }
    console.log();

    // Step 8: Refinement (if enabled and validation failed)
    let finalCode = generatedCode;

    if (CONFIG.refine && !validation.isValid) {
      console.log("🔄 Step 8: Iterative refinement...");
      console.log("   Starting refinement process (up to 3 iterations)...");

      const testDir = path.join(__dirname, "..", "test");
      const refinementResult = await refiner.refine(
        generatedCode,
        contractSource,
        testDir,
        CONFIG.contractName,
        CONFIG.format
      );

      console.log(`   Refinement: ${refinementResult.success ? "✅" : "❌"}`);
      console.log(`   Iterations: ${refinementResult.iterations.length}`);
      console.log(`   Final Quality: ${refinementResult.finalQualityScore}/100`);

      refinementResult.iterations.forEach((iter: any, i: number) => {
        console.log(`   Iteration ${i + 1}:`);
        console.log(`     - Compiled: ${iter.compiled ? "✅" : "❌"}`);
        console.log(`     - Tests Passed: ${iter.testsPassed ? "✅" : "❌"}`);
        console.log(`     - Quality: ${iter.qualityScore}/100`);
      });

      finalCode = refinementResult.finalCode;
      console.log();
    } else if (CONFIG.refine) {
      console.log("✅ Step 8: Refinement (skipped - validation passed)\n");
    } else {
      console.log("⏭️  Step 8: Refinement (disabled)\n");
    }

    // Step 9: Write test file
    console.log("💾 Step 9: Writing test file...");
    const testFileName = CONFIG.format === "solidity"
      ? `${CONFIG.contractName}.t.sol`
      : `${CONFIG.contractName}.test.ts`;

    const testDir = path.join(__dirname, "..", "test");

    await writer.writeTest(
      testDir,
      CONFIG.contractName,
      finalCode,
      CONFIG.format
    );

    console.log(`   ✅ Test file written to: test/${testFileName}\n`);

    // Step 10: Try to compile the generated test
    console.log("🔨 Step 10: Compiling generated test...");
    try {
      const compileResult = await compiler.compile();
      if (compileResult.success) {
        console.log("   ✅ Compilation successful!\n");
      } else {
        console.log("   ❌ Compilation failed:");
        compileResult.errors.slice(0, 5).forEach((err: string) => {
          console.log(`     - ${err}`);
        });
        console.log();
      }
    } catch (error) {
      console.log(`   ⚠️  Compilation check skipped: ${error instanceof Error ? error.message : String(error)}\n`);
    }

    // Summary
    console.log("=".repeat(60));
    console.log("✨ Test Generation Complete!");
    console.log("=".repeat(60));
    console.log(`✅ Contract: ${CONFIG.contractName}`);
    console.log(`✅ Parsed: ${parsed.functions.length} functions, ${parsed.stateVariables.length} state variables`);
    if (CONFIG.security && securityReport) {
      console.log(`✅ Security: ${securityReport.vulnerabilities?.length || 0} issues found`);
    }
    console.log(`✅ Generated: ${finalCode.length} characters of test code`);
    console.log(`✅ Validation: ${validation.isValid ? "PASSED" : "FAILED"} (${validation.qualityScore}/100)`);
    console.log(`✅ Output: test/${testFileName}`);
    console.log();
    console.log("Next steps:");
    console.log(`  1. Review the generated test: test/${testFileName}`);
    console.log("  2. Run tests: npx hardhat test");
    console.log("  3. Make adjustments as needed");
    console.log();

  } catch (error) {
    console.error("\n❌ Error during test generation:");
    console.error(error);
    console.error("\nStack trace:");
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the generation
generateTests()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
