/**
 * ⚠️ DEPRECATED: Hook-Based API Not Available in Hardhat 3
 *
 * Hardhat 3 does NOT support extending the HRE through hooks.
 * This script demonstrates the CORRECT approach using direct imports.
 *
 * For the full working example, see:
 *   scripts/generate-ai-tests.ts  (Full AI-powered test generation)
 *   scripts/demo-pipeline.ts       (Pipeline demo without AI)
 *
 * Usage:
 *   npx hardhat run scripts/use-soliditygpt.ts
 */

// ✅ CORRECT: Import modules directly from the plugin
import { TestValidator } from "@soliditygpt/hardhat-plugin/validators/testValidator";
import { ContractParser } from "@soliditygpt/hardhat-plugin/generator/parser";
import { SecurityAnalyzer } from "@soliditygpt/hardhat-plugin/generator/analyzer";

export default async function main() {
  console.log("\n🚀 SolidityGPT - Correct Usage in Hardhat 3\n");
  console.log("=" .repeat(60));
  console.log("⚠️  NOTE: hre.solidityGPT does NOT exist in Hardhat 3");
  console.log("✅ Instead, import modules directly from the plugin");
  console.log("=" .repeat(60) + "\n");

  // ✅ CORRECT: Instantiate modules directly
  const validator = new TestValidator();
  const parser = new ContractParser();
  const analyzer = new SecurityAnalyzer();

  console.log("✅ SolidityGPT plugin loaded successfully\n");

  // Display available services
  console.log("📦 Available Services:");
  console.log("  - validator: Test validation and quality scoring");
  console.log("  - compiler: Programmatic compilation and test execution");
  console.log("  - refiner: Iterative test refinement system");
  console.log("  - parser: Contract parsing and analysis");
  console.log("  - analyzer: Security analysis");
  console.log("  - promptBuilder: AI prompt generation");
  console.log("  - ai: AI service integration");
  console.log("  - writer: Test file writing");
  console.log("\n");

  // Example 1: Validate existing test code
  console.log("=" .repeat(60));
  console.log("Example 1: Test Validation");
  console.log("=" .repeat(60));

  const exampleTestCode = `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.28;

    import {Test} from "forge-std/Test.sol";
    import {SimpleToken} from "../contracts/SimpleToken.sol";

    contract SimpleTokenTest is Test {
        SimpleToken token;

        function setUp() public {
            token = new SimpleToken("Test", "TST", 1000000);
        }

        function testInitialSupply() public {
            assertEq(token.totalSupply(), 1000000);
        }
    }
  `;

  try {
    const validation = validator.validate(exampleTestCode, "solidity");
    console.log(`\n✅ Validation Result: ${validation.isValid ? "PASSED" : "FAILED"}`);
    console.log(`📊 Quality Score: ${validation.qualityScore}/100`);

    if (validation.errors.length > 0) {
      console.log("\n⚠️  Errors:");
      validation.errors.forEach((err: string, i: number) => console.log(`   ${i + 1}. ${err}`));
    }

    if (validation.suggestions && validation.suggestions.length > 0) {
      console.log("\n💡 Suggestions:");
      validation.suggestions.forEach((sug: string, i: number) => console.log(`   ${i + 1}. ${sug}`));
    }
  } catch (error) {
    console.log(`⚠️  Validation skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Example 2: Parse contract source
  console.log("\n" + "=".repeat(60));
  console.log("Example 2: Contract Parsing");
  console.log("=" .repeat(60));

  try {
    const contractSource = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.28;

      contract SimpleToken {
          string public name;
          uint256 public totalSupply;

          function transfer(address to, uint256 amount) public returns (bool) {
              return true;
          }
      }
    `;

    const ast = parser.parse(contractSource);
    const parsed = parser.extractInfo(ast, contractSource);
    console.log(`\n📄 Contract Name: ${parsed.contractName || 'SimpleToken'}`);
    console.log(`🔧 Functions Found: ${parsed.functions.length}`);
    parsed.functions.forEach((fn: any, i: number) => {
      console.log(`   ${i + 1}. ${fn.name}(${fn.parameters.map((p: any) => p.type).join(", ")})`);
    });
    console.log(`📊 State Variables: ${parsed.stateVariables.length}`);
    parsed.stateVariables.forEach((sv: any, i: number) => {
      console.log(`   ${i + 1}. ${sv.type} ${sv.name}`);
    });
  } catch (error) {
    console.log(`⚠️  Parsing skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Example 3: Security Analysis
  console.log("\n" + "=".repeat(60));
  console.log("Example 3: Security Analysis");
  console.log("=" .repeat(60));

  try {
    const vulnerableCode = `
      contract Vulnerable {
          function withdraw(uint amount) public {
              msg.sender.call{value: amount}("");
          }
      }
    `;

    const securityReport = analyzer.analyze(vulnerableCode);
    console.log(`\n🔒 Risk Level: ${securityReport.riskLevel || 'UNKNOWN'}`);
    console.log(`⚠️  Vulnerabilities Found: ${securityReport.vulnerabilities?.length || 0}`);
    if (securityReport.vulnerabilities) {
      securityReport.vulnerabilities.forEach((vuln: any, i: number) => {
        console.log(`   ${i + 1}. [${vuln.severity}] ${vuln.type}: ${vuln.description}`);
      });
    }
    console.log(`✅ Recommendations: ${securityReport.recommendations?.length || 0}`);
    if (securityReport.recommendations) {
      securityReport.recommendations.forEach((rec: string, i: number) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
  } catch (error) {
    console.log(`⚠️  Analysis skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Example 4: High-Level API - Generate Tests
  console.log("\n" + "=".repeat(60));
  console.log("Example 4: Full Test Generation Pipeline");
  console.log("=" .repeat(60));

  console.log("\n⚠️  For full AI-powered test generation, use the dedicated script:");
  console.log("   npx hardhat run scripts/generate-ai-tests.ts");
  console.log("\nThis combines all modules (parser, analyzer, AI, validator, refiner)");
  console.log("into a complete end-to-end test generation pipeline.");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📚 Next Steps:");
  console.log("=" .repeat(60));
  console.log("\n1. Set your API keys in .env file:");
  console.log("   OPENAI_API_KEY=your_key_here");
  console.log("   ANTHROPIC_API_KEY=your_key_here");
  console.log("\n2. Configure solidityGPT in hardhat.config.ts");
  console.log("\n3. Import and use services in your scripts:");
  console.log("   import { TestValidator } from '@soliditygpt/hardhat-plugin/validators/testValidator';");
  console.log("   const validator = new TestValidator();");
  console.log("   const validation = validator.validate(code, 'solidity');");
  console.log("\n4. For full test generation, use the generate-ai-tests.ts script:");
  console.log("   npx hardhat run scripts/generate-ai-tests.ts");
  console.log("\n");
}
