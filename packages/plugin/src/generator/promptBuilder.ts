/**
 * Prompt Builder - Constructs optimized prompts for AI test generation
 */

import type { SecurityAnalysis, FunctionInfo, ContractInfo } from "../types.js";

export class PromptBuilder {
  /**
   * Build a comprehensive prompt for test generation (script-friendly signature)
   */
  build(
    contractSource: string,
    contractInfo: ContractInfo,
    securityAnalysis: SecurityAnalysis | any,
    options: { security: boolean; format: "solidity" | "typescript" }
  ): string {
    const examples = this.getExamples(options.format);
    const securitySection = options.security && securityAnalysis
      ? this.buildSecuritySection(securityAnalysis)
      : "";

    const formatInstructions = options.format === "solidity"
      ? `
⚠️ CRITICAL: You MUST generate SOLIDITY test code using Foundry framework.
⚠️ DO NOT generate TypeScript/JavaScript code.
⚠️ DO NOT use chai, ethers, or Hardhat testing syntax.
⚠️ ONLY use Solidity with forge-std/Test.sol imports.
`
      : "";

    return `You are an expert Solidity security auditor creating comprehensive tests.
${formatInstructions}
TARGET CONTRACT:
\`\`\`solidity
${contractSource}
\`\`\`

PARSED CONTRACT INFO:
- Functions: ${contractInfo.functions.length}
- State Variables: ${contractInfo.stateVariables.length}
- Events: ${contractInfo.events.length}

${securitySection}

REQUIREMENTS:
${this.getRequirements(options.format)}

${examples}

Generate comprehensive tests covering:
1. All public/external functions
2. Edge cases (zero values, max values, address(0))
3. Access control and security concerns
4. Event emissions
5. Error conditions with proper revert tests

${options.format === "solidity" ? "⚠️ IMPORTANT: Output ONLY Solidity test code using Foundry (forge-std/Test.sol), NOT TypeScript!" : ""}

Return ONLY the test code, no explanations or markdown.`;
  }

  /**
   * Get requirements based on test format
   */
  private getRequirements(format: string): string {
    if (format === "solidity") {
      return `- Use Foundry testing framework (forge-std/Test.sol)
- Include setUp() function that runs before each test
- Test functions must start with "test" prefix
- Use vm.prank(address) for testing with different msg.sender
- Use vm.expectRevert() for testing reverts
- Use vm.expectEmit() for testing events
- Add fuzz tests (testFuzz_FunctionName) for numeric parameters
- Use descriptive names: test_FunctionName_Condition()
- Include comments explaining what each test validates`;
    } else {
      return `- Use Hardhat with Chai assertions
- Use loadFixture for efficient test setup
- Test all public/external functions
- Include edge cases (zero, max values, address(0))
- Use descriptive test names
- Test event emissions with .to.emit()
- Test reverts with .to.be.revertedWith() or .to.be.revertedWithCustomError()
- Use ethers.js for contract interactions`;
    }
  }

  /**
   * Build security analysis section
   */
  private buildSecuritySection(analysis: SecurityAnalysis): string {
    const issues: string[] = [];

    if (analysis.reentrancyRisk.length > 0) {
      issues.push(
        `- Reentrancy vulnerabilities detected in: ${analysis.reentrancyRisk
          .map((r) => r.function)
          .join(", ")}`
      );
    }

    if (analysis.accessControl.length > 0) {
      issues.push(
        `- Access control functions: ${analysis.accessControl
          .map((a) => `${a.function} (${a.modifiers.join(", ")})`)
          .join(", ")}`
      );
    }

    if (analysis.uncheckedCalls.length > 0) {
      issues.push(
        `- Low-level calls detected: ${analysis.uncheckedCalls.length} instances`
      );
    }

    if (issues.length === 0) return "";

    return `SECURITY ANALYSIS:
${issues.join("\n")}

Ensure tests verify these security properties and test attack scenarios.`;
  }

  /**
   * Get format-specific examples
   */
  private getExamples(format: string): string {
    if (format === "solidity") {
      return this.getSolidityExample();
    } else {
      return this.getTypeScriptExample();
    }
  }

  /**
   * Get Solidity test example
   */
  private getSolidityExample(): string {
    return `EXAMPLE TEST STRUCTURE (Solidity):
\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {MyContract} from "../contracts/MyContract.sol";

contract MyContractTest is Test {
    MyContract public myContract;
    address public owner;
    address public user;

    function setUp() public {
        owner = address(this);
        user = makeAddr("user");

        myContract = new MyContract();

        // Setup: give users some ETH
        vm.deal(user, 100 ether);
    }

    function test_InitialState() public {
        assertEq(myContract.owner(), owner);
    }

    function test_Transfer_Success() public {
        uint256 amount = 100;

        vm.prank(user);
        myContract.transfer(user, amount);

        assertEq(myContract.balanceOf(user), amount);
    }

    function test_RevertWhen_Unauthorized() public {
        vm.prank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        myContract.restrictedFunction();
    }

    function testFuzz_Deposit(uint256 amount) public {
        vm.assume(amount > 0 && amount < 1000 ether);

        vm.prank(user);
        myContract.deposit{value: amount}();

        assertEq(myContract.balanceOf(user), amount);
    }
}
\`\`\``;
  }

  /**
   * Get TypeScript test example
   */
  private getTypeScriptExample(): string {
    return `EXAMPLE TEST STRUCTURE (TypeScript):
\`\`\`typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { MyContract } from "../typechain-types";

describe("MyContract", function () {
  async function deployFixture() {
    const [owner, user] = await ethers.getSigners();

    const MyContract = await ethers.getContractFactory("MyContract");
    const myContract = await MyContract.deploy();

    return { myContract, owner, user };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { myContract, owner } = await loadFixture(deployFixture);
      expect(await myContract.owner()).to.equal(owner.address);
    });
  });

  describe("Transfer", function () {
    it("Should transfer tokens successfully", async function () {
      const { myContract, user } = await loadFixture(deployFixture);
      const amount = 100n;

      await myContract.connect(user).transfer(user.address, amount);

      expect(await myContract.balanceOf(user.address)).to.equal(amount);
    });

    it("Should revert when unauthorized", async function () {
      const { myContract, user } = await loadFixture(deployFixture);

      await expect(
        myContract.connect(user).restrictedFunction()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should emit event on transfer", async function () {
      const { myContract, user } = await loadFixture(deployFixture);
      const amount = 100n;

      await expect(myContract.transfer(user.address, amount))
        .to.emit(myContract, "Transfer")
        .withArgs(ethers.ZeroAddress, user.address, amount);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount", async function () {
      const { myContract, user } = await loadFixture(deployFixture);
      await expect(myContract.transfer(user.address, 0n)).to.not.be.reverted;
    });

    it("Should revert on zero address", async function () {
      const { myContract } = await loadFixture(deployFixture);
      await expect(
        myContract.transfer(ethers.ZeroAddress, 100n)
      ).to.be.revertedWith("Invalid address");
    });
  });
});
\`\`\``;
  }

  /**
   * Build a simplified prompt for function-specific tests
   */
  buildFunctionPrompt(
    contractSource: string,
    functionInfo: FunctionInfo,
    format: "typescript" | "solidity"
  ): string {
    return `Generate tests for this specific function:

CONTRACT:
\`\`\`solidity
${contractSource}
\`\`\`

FUNCTION TO TEST:
- Name: ${functionInfo.name}
- Visibility: ${functionInfo.visibility}
- Parameters: ${functionInfo.parameters.map((p) => `${p.type} ${p.name || ""}`).join(", ")}
- Modifiers: ${functionInfo.modifiers.join(", ") || "none"}

Generate 3-5 ${format} test functions covering:
1. Normal execution (happy path)
2. Edge cases based on parameter types
3. Error conditions and reverts
4. Event emissions if applicable

Return ONLY the test code.`;
  }
}
