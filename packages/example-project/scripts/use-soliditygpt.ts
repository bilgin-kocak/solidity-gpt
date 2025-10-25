/**
 * Example script demonstrating SolidityGPT Hook-Based API
 *
 * This script shows how to use the hook-based Hardhat 3 plugin
 * to generate AI-powered tests for Solidity contracts.
 *
 * Usage:
 *   npx hardhat run scripts/use-soliditygpt.ts
 */

import { HardhatRuntimeEnvironment } from "hardhat/types";

export default async function main(hre: HardhatRuntimeEnvironment) {
  console.log("\n🚀 SolidityGPT Hook-Based Demo\n");
  console.log("=" .repeat(60));

  // Access the hook-based SolidityGPT API
  const { solidityGPT } = hre;

  // Check if plugin is properly initialized
  if (!solidityGPT) {
    console.error("❌ SolidityGPT plugin not initialized!");
    console.error("Make sure the plugin is registered in hardhat.config.ts");
    return;
  }

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
    const validation = solidityGPT.validator.validate(exampleTestCode, "solidity");
    console.log(`\n✅ Validation Result: ${validation.isValid ? "PASSED" : "FAILED"}`);
    console.log(`📊 Quality Score: ${validation.qualityScore}/100`);

    if (validation.errors.length > 0) {
      console.log("\n⚠️  Errors:");
      validation.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    }

    if (validation.suggestions.length > 0) {
      console.log("\n💡 Suggestions:");
      validation.suggestions.forEach((sug, i) => console.log(`   ${i + 1}. ${sug}`));
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

    const parsed = solidityGPT.parser.parse(contractSource);
    console.log(`\n📄 Contract Name: ${parsed.contractName}`);
    console.log(`🔧 Functions Found: ${parsed.functions.length}`);
    parsed.functions.forEach((fn, i) => {
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

    const securityReport = solidityGPT.analyzer.analyze(vulnerableCode);
    console.log(`\n🔒 Risk Level: ${securityReport.riskLevel}`);
    console.log(`⚠️  Vulnerabilities Found: ${securityReport.vulnerabilities.length}`);
    securityReport.vulnerabilities.forEach((vuln, i) => {
      console.log(`   ${i + 1}. [${vuln.severity}] ${vuln.type}: ${vuln.description}`);
    });
    console.log(`✅ Recommendations: ${securityReport.recommendations.length}`);
    securityReport.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
  } catch (error) {
    console.log(`⚠️  Analysis skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Example 4: High-Level API - Generate Tests
  console.log("\n" + "=".repeat(60));
  console.log("Example 4: Test Generation API");
  console.log("=" .repeat(60));

  try {
    console.log("\n📝 Generating tests for SimpleToken...");

    const result = await solidityGPT.generateTests({
      contract: "SimpleToken",
      format: "solidity",
      security: true,
      refine: false,
    });

    console.log(`\n${result.success ? "✅" : "❌"} ${result.message}`);
  } catch (error) {
    console.log(`⚠️  Generation skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📚 Next Steps:");
  console.log("=" .repeat(60));
  console.log("\n1. Set your API keys in .env file:");
  console.log("   OPENAI_API_KEY=your_key_here");
  console.log("   ANTHROPIC_API_KEY=your_key_here");
  console.log("\n2. Configure solidityGPT in hardhat.config.ts");
  console.log("\n3. Use the services in your own scripts:");
  console.log("   const { solidityGPT } = hre;");
  console.log("   await solidityGPT.generateTests({ contract: 'MyContract' });");
  console.log("\n4. Access individual services:");
  console.log("   const validation = solidityGPT.validator.validate(code, 'solidity');");
  console.log("   const parsed = solidityGPT.parser.parse(source);");
  console.log("   const analysis = solidityGPT.analyzer.analyze(code);");
  console.log("\n");
}
