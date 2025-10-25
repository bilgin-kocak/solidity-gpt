/**
 * Test Validator - Validates generated test code
 */

import type { TestValidation } from "../types.js";

export class TestValidator {
  /**
   * Validate generated test code
   */
  validate(
    testCode: string,
    format: "solidity" | "typescript"
  ): TestValidation {
    const errors: string[] = [];

    // Common validations
    if (!testCode || testCode.trim().length === 0) {
      errors.push("Generated test code is empty");
      return { valid: false, errors };
    }

    // Format-specific validation
    if (format === "solidity") {
      this.validateSolidity(testCode, errors);
    } else {
      this.validateTypeScript(testCode, errors);
    }

    // Security checks (common to both)
    this.validateSecurity(testCode, errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate Solidity test code
   */
  private validateSolidity(code: string, errors: string[]): void {
    // Check for SPDX license
    if (!code.includes("SPDX-License-Identifier")) {
      errors.push("Missing SPDX-License-Identifier");
    }

    // Check for pragma statement
    if (!code.includes("pragma solidity")) {
      errors.push("Missing pragma solidity statement");
    }

    // Check for Test import from forge-std
    if (!code.includes('import') || !code.includes('Test')) {
      errors.push("Missing import statement for forge-std/Test.sol");
    }

    // Check for contract declaration inheriting Test
    if (!code.match(/contract\s+\w+\s+is\s+Test/)) {
      errors.push("Test contract must inherit from Test");
    }

    // Check for test functions
    if (!code.match(/function\s+test\w+/)) {
      errors.push("No test functions found (must start with 'test')");
    }

    // Check for assertions
    const hasAssertions =
      code.includes("assert") ||
      code.includes("expect") ||
      code.includes("vm.expectRevert");

    if (!hasAssertions) {
      errors.push("No assertions found in test code");
    }

    // Check for setUp function (optional but recommended)
    if (!code.includes("function setUp()")) {
      // This is a warning, not an error
      console.warn("  ⚠️  No setUp() function found (recommended for test initialization)");
    }

    // Check for common syntax errors
    this.checkSoliditySyntax(code, errors);
  }

  /**
   * Validate TypeScript test code
   */
  private validateTypeScript(code: string, errors: string[]): void {
    // Check for required imports
    const hasChaiImport = code.includes('from "chai"');
    const hasHardhatImport = code.includes('from "hardhat"');

    if (!hasChaiImport) {
      errors.push("Missing Chai import (import { expect } from \"chai\")");
    }

    if (!hasHardhatImport) {
      errors.push("Missing Hardhat import (import { ethers } from \"hardhat\")");
    }

    // Check for describe blocks
    if (!code.includes("describe(")) {
      errors.push("No describe blocks found");
    }

    // Check for test cases (it blocks)
    if (!code.includes("it(")) {
      errors.push("No test cases (it blocks) found");
    }

    // Check for expect assertions
    if (!code.includes("expect(")) {
      errors.push("No expect assertions found");
    }

    // Check for async/await patterns
    if (code.includes("await ") && !code.includes("async ")) {
      errors.push("Using 'await' without 'async' function declaration");
    }

    // Check for loadFixture usage (recommended)
    if (!code.includes("loadFixture")) {
      console.warn("  ⚠️  No loadFixture usage found (recommended for efficient testing)");
    }

    // Check for common TypeScript errors
    this.checkTypeScriptSyntax(code, errors);
  }

  /**
   * Security validation (common to both formats)
   */
  private validateSecurity(code: string, errors: string[]): void {
    // Check for selfdestruct (dangerous in tests)
    if (code.includes("selfdestruct")) {
      errors.push("Tests contain 'selfdestruct' - review required for safety");
    }

    // Check for delegatecall without proper checks
    if (code.includes("delegatecall") && !code.includes("vm.")) {
      errors.push("Direct delegatecall usage detected - ensure this is intentional");
    }

    // Check for hardcoded private keys (security issue)
    if (code.match(/[0-9a-fA-F]{64}/) && code.toLowerCase().includes("private")) {
      errors.push("Potential hardcoded private key detected");
    }

    // Check for console.log in production code (not in comments)
    const codeWithoutComments = code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    if (codeWithoutComments.includes("console.log") && !codeWithoutComments.includes("console2")) {
      console.warn("  ⚠️  console.log found (use console2 from forge-std for Solidity)");
    }
  }

  /**
   * Check for common Solidity syntax errors
   */
  private checkSoliditySyntax(code: string, errors: string[]): void {
    // Check for balanced braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push(`Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`);
    }

    // Check for balanced parentheses
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      errors.push(`Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`);
    }

    // Check for function visibility
    const functionMatches = code.matchAll(/function\s+\w+\s*\([^)]*\)/g);
    for (const match of functionMatches) {
      const funcDecl = match[0];
      if (!funcDecl.includes("public") && !funcDecl.includes("external") &&
          !funcDecl.includes("internal") && !funcDecl.includes("private")) {
        // This is OK for Solidity 0.7+ where public is default for tests
        continue;
      }
    }

    // Check for missing semicolons (basic check)
    const lines = code.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Check if line looks like a statement but doesn't end with ; or { or }
      if (
        line.length > 0 &&
        !line.startsWith("//") &&
        !line.startsWith("/*") &&
        !line.startsWith("*") &&
        !line.startsWith("pragma") &&
        !line.startsWith("import") &&
        !line.startsWith("contract") &&
        !line.startsWith("function") &&
        !line.startsWith("if") &&
        !line.startsWith("for") &&
        !line.startsWith("while") &&
        !line.endsWith(";") &&
        !line.endsWith("{") &&
        !line.endsWith("}") &&
        !line.endsWith("*/") &&
        line.includes("=")
      ) {
        // Potential missing semicolon, but don't error - just warn
        console.warn(`  ⚠️  Line ${i + 1} might be missing a semicolon: ${line.substring(0, 50)}...`);
      }
    }
  }

  /**
   * Check for common TypeScript syntax errors
   */
  private checkTypeScriptSyntax(code: string, errors: string[]): void {
    // Check for balanced braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push(`Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`);
    }

    // Check for balanced parentheses
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      errors.push(`Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`);
    }

    // Check for proper describe structure
    if (code.includes("describe(") && !code.includes("function ()")) {
      // Using arrow functions is fine, but check they're used correctly
      const describeBlocks = code.match(/describe\s*\(/g) || [];
      const functionDecls = code.match(/function\s*\(/g) || [];

      if (describeBlocks.length > 0 && functionDecls.length === 0 && !code.includes("() =>")) {
        errors.push("Describe blocks should contain function declarations");
      }
    }

    // Check for expect usage
    if (code.includes("expect(")) {
      // Make sure expect is actually used for assertions
      if (!code.includes(".to.") && !code.includes(".be.") && !code.includes(".equal")) {
        errors.push("expect() used but no assertions found (.to, .be, .equal, etc.)");
      }
    }
  }

  /**
   * Validate that test code contains meaningful tests
   */
  validateTestQuality(code: string, format: "solidity" | "typescript"): {
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 100;

    if (format === "solidity") {
      // Count test functions
      const testFunctions = (code.match(/function\s+test\w+/g) || []).length;
      if (testFunctions < 3) {
        feedback.push("Consider adding more test functions (at least 3-5 recommended)");
        score -= 10;
      }

      // Check for fuzz tests
      if (!code.includes("testFuzz_")) {
        feedback.push("No fuzz tests found (consider adding testFuzz_ functions)");
        score -= 5;
      }

      // Check for event testing
      if (!code.includes("vm.expectEmit")) {
        feedback.push("No event emission tests found (use vm.expectEmit)");
        score -= 5;
      }

      // Check for revert testing
      if (!code.includes("vm.expectRevert")) {
        feedback.push("No revert tests found (use vm.expectRevert for error testing)");
        score -= 5;
      }
    } else {
      // Count test cases
      const itBlocks = (code.match(/it\s*\(/g) || []).length;
      if (itBlocks < 3) {
        feedback.push("Consider adding more test cases (at least 3-5 recommended)");
        score -= 10;
      }

      // Check for edge case testing
      if (!code.toLowerCase().includes("edge") && !code.toLowerCase().includes("zero") &&
          !code.toLowerCase().includes("max")) {
        feedback.push("No obvious edge case tests found");
        score -= 5;
      }

      // Check for error testing
      if (!code.includes("revertedWith") && !code.includes("revertedWithCustomError")) {
        feedback.push("No revert tests found (use .to.be.revertedWith)");
        score -= 5;
      }

      // Check for event testing
      if (!code.includes(".to.emit")) {
        feedback.push("No event emission tests found (use .to.emit)");
        score -= 5;
      }
    }

    return {
      score: Math.max(0, score),
      feedback,
    };
  }
}
