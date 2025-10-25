/**
 * SolidityGPT - Pipeline Demo (No AI Required)
 *
 * Demonstrates all Phase 2 modules working together WITHOUT making AI calls.
 * Perfect for testing the pipeline and verifying everything is wired up correctly.
 *
 * Usage:
 *   npx hardhat run scripts/demo-pipeline.ts
 */

import fs from "fs";
import path from "path";

// Import all Phase 2 modules
import { TestValidator } from "@soliditygpt/hardhat-plugin/validators/testValidator";
import { ContractParser } from "@soliditygpt/hardhat-plugin/generator/parser";
import { SecurityAnalyzer } from "@soliditygpt/hardhat-plugin/generator/analyzer";
import { PromptBuilder } from "@soliditygpt/hardhat-plugin/generator/promptBuilder";

console.log("\n🧪 SolidityGPT - Pipeline Demo");
console.log("=".repeat(60));
console.log("Testing all Phase 2 modules (no AI calls required)");
console.log("=".repeat(60));
console.log();

async function demoPipeline() {
  try {
    // Step 1: Read SimpleToken contract
    console.log("📄 Step 1: Reading SimpleToken.sol...");
    const contractPath = path.join(__dirname, "..", "contracts", "SimpleToken.sol");
    const contractSource = fs.readFileSync(contractPath, "utf-8");
    console.log(`   ✅ Read ${contractSource.length} characters\n`);

    // Step 2: Parse the contract
    console.log("🔍 Step 2: Parsing contract structure...");
    const parser = new ContractParser();
    const parsed = parser.parse(contractSource);

    console.log(`   Contract Name: ${parsed.contractName}`);
    console.log(`   Functions: ${parsed.functions.length}`);
    console.log(`   State Variables: ${parsed.stateVariables.length}`);
    console.log(`   Events: ${parsed.events.length}`);
    console.log(`   Modifiers: ${parsed.modifiers.length}`);

    if (parsed.functions.length > 0) {
      console.log("\n   📋 Functions found:");
      parsed.functions.forEach((fn: any, i: number) => {
        const params = fn.parameters.map((p: any) => `${p.type} ${p.name}`).join(", ");
        console.log(`     ${i + 1}. ${fn.name}(${params}) ${fn.visibility} ${fn.returns ? `returns (${fn.returns})` : ""}`);
      });
    }

    if (parsed.stateVariables.length > 0) {
      console.log("\n   📊 State Variables:");
      parsed.stateVariables.forEach((sv: any) => {
        console.log(`     - ${sv.type} ${sv.name} (${sv.visibility})`);
      });
    }

    if (parsed.events.length > 0) {
      console.log("\n   📢 Events:");
      parsed.events.forEach((event: any) => {
        console.log(`     - ${event.name}(${event.parameters.map((p: any) => p.type).join(", ")})`);
      });
    }
    console.log();

    // Step 3: Security analysis
    console.log("🔒 Step 3: Analyzing security...");
    const analyzer = new SecurityAnalyzer();
    const securityReport = analyzer.analyze(contractSource);

    console.log(`   Risk Level: ${securityReport.riskLevel.toUpperCase()}`);
    console.log(`   Vulnerabilities: ${securityReport.vulnerabilities.length}`);

    if (securityReport.vulnerabilities.length > 0) {
      console.log("\n   ⚠️  Issues Found:");
      securityReport.vulnerabilities.forEach((vuln: any, i: number) => {
        console.log(`     ${i + 1}. [${vuln.severity.toUpperCase()}] ${vuln.type}`);
        console.log(`        ${vuln.description}`);
      });
    } else {
      console.log("   ✅ No critical vulnerabilities detected");
    }

    if (securityReport.recommendations.length > 0) {
      console.log("\n   💡 Recommendations:");
      securityReport.recommendations.forEach((rec: string, i: number) => {
        console.log(`     ${i + 1}. ${rec}`);
      });
    }

    if (securityReport.gasOptimizations.length > 0) {
      console.log("\n   ⚡ Gas Optimizations:");
      securityReport.gasOptimizations.forEach((opt: string, i: number) => {
        console.log(`     ${i + 1}. ${opt}`);
      });
    }
    console.log();

    // Step 4: Build AI prompt (demonstrate, don't send)
    console.log("🧠 Step 4: Building AI prompt...");
    const promptBuilder = new PromptBuilder();
    const prompt = promptBuilder.build(
      contractSource,
      parsed,
      securityReport,
      {
        security: true,
        format: "solidity",
      }
    );

    console.log(`   ✅ Generated prompt: ${prompt.length} characters`);
    console.log(`   Prompt includes:`);
    console.log(`     - Contract source code`);
    console.log(`     - ${parsed.functions.length} functions to test`);
    console.log(`     - ${securityReport.vulnerabilities.length} security concerns`);
    console.log(`     - Test generation instructions`);
    console.log();

    // Step 5: Validate a sample test
    console.log("✅ Step 5: Validating sample test code...");
    const sampleTest = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SimpleToken} from "../contracts/SimpleToken.sol";

contract SimpleTokenTest is Test {
    SimpleToken token;
    address user = address(0x1);

    function setUp() public {
        token = new SimpleToken("Test Token", "TST", 1000000);
    }

    function testInitialSupply() public {
        assertEq(token.totalSupply(), 1000000);
    }

    function testTransfer() public {
        uint256 amount = 100;
        token.transfer(user, amount);
        assertEq(token.balanceOf(user), amount);
    }

    function testTransferFailsWithInsufficientBalance() public {
        vm.prank(user);
        vm.expectRevert();
        token.transfer(address(0x2), 100);
    }
}`;

    const validator = new TestValidator();
    const validation = validator.validate(sampleTest, "solidity");

    console.log(`   Valid: ${validation.isValid ? "✅" : "❌"}`);
    console.log(`   Quality Score: ${validation.qualityScore}/100`);

    if (validation.errors.length > 0) {
      console.log(`\n   ❌ Errors (${validation.errors.length}):`);
      validation.errors.forEach((err: string, i: number) => {
        console.log(`     ${i + 1}. ${err}`);
      });
    }

    if (validation.suggestions.length > 0) {
      console.log(`\n   💡 Suggestions (${validation.suggestions.length}):`);
      validation.suggestions.forEach((sug: string, i: number) => {
        console.log(`     ${i + 1}. ${sug}`);
      });
    }

    if (validation.warnings.length > 0) {
      console.log(`\n   ⚠️  Warnings (${validation.warnings.length}):`);
      validation.warnings.forEach((warn: string, i: number) => {
        console.log(`     ${i + 1}. ${warn}`);
      });
    }
    console.log();

    // Summary
    console.log("=".repeat(60));
    console.log("✨ Pipeline Demo Complete!");
    console.log("=".repeat(60));
    console.log();
    console.log("✅ All Phase 2 modules tested successfully:");
    console.log(`   📄 ContractParser - Parsed ${parsed.functions.length} functions`);
    console.log(`   🔒 SecurityAnalyzer - Found ${securityReport.vulnerabilities.length} issues`);
    console.log(`   🧠 PromptBuilder - Generated ${prompt.length} char prompt`);
    console.log(`   ✅ TestValidator - Scored sample test ${validation.qualityScore}/100`);
    console.log();
    console.log("🎯 Ready for AI-powered test generation!");
    console.log();
    console.log("Next steps:");
    console.log("  1. Set up your API keys in .env file");
    console.log("  2. Run: npx hardhat run scripts/generate-ai-tests.ts");
    console.log("  3. Watch as AI generates comprehensive tests!");
    console.log();

  } catch (error) {
    console.error("\n❌ Error during demo:");
    console.error(error);
    if (error instanceof Error) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the demo
demoPipeline()
  .then(() => {
    console.log("✅ Demo completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  });
