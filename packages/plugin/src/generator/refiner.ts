/**
 * Test Refiner - Iteratively improves generated tests through compilation and testing
 */

import type { AIService } from "./aiService.js";
import type { CompilerHelper, CompilationResult, TestRunResult } from "../utils/compiler.js";
import type { TestWriter } from "./writer.js";
import type { TestValidator } from "../validators/testValidator.js";

export interface RefinementResult {
  success: boolean;
  iterations: RefinementIteration[]; // Array of iterations, not a count
  finalCode: string;
  finalQualityScore?: number; // Quality score after refinement
  history?: RefinementIteration[]; // Optional history alias
}

export interface RefinementIteration {
  iteration: number;
  code: string;
  compilationResult?: CompilationResult;
  testResult?: TestRunResult;
  errors: string[];
  action: "generated" | "compiled" | "tested" | "refined" | "failed";
  compiled?: boolean; // Whether it compiled successfully
  testsPassed?: boolean; // Whether tests passed
  qualityScore?: number; // Quality score for this iteration
}

export class TestRefiner {
  private maxIterations = 3;

  constructor(
    private aiService: AIService,
    private compiler: CompilerHelper,
    private writer: TestWriter,
    private validator: TestValidator
  ) {}

  /**
   * Refine generated tests through iterative compilation and testing
   */
  async refine(
    initialCode: string,
    contractSource: string,
    testDir: string,
    contractName: string,
    format: "solidity" | "typescript"
  ): Promise<RefinementResult> {
    const history: RefinementIteration[] = [];
    let currentCode = initialCode;
    let iteration = 0;

    // Initial iteration
    history.push({
      iteration: 0,
      code: initialCode,
      errors: [],
      action: "generated",
    });

    while (iteration < this.maxIterations) {
      iteration++;

      console.log(`  🔄 Refinement iteration ${iteration}/${this.maxIterations}...`);

      // Step 1: Validate syntax
      const validation = this.validator.validate(currentCode, format);

      if (!validation.valid) {
        console.log(`  ❌ Validation failed: ${validation.errors.join(", ")}`);

        // Try to refine based on validation errors
        currentCode = await this.refineFromValidation(
          currentCode,
          contractSource,
          validation.errors,
          format
        );

        history.push({
          iteration,
          code: currentCode,
          errors: validation.errors,
          action: "refined",
        });

        continue;
      }

      // Step 2: Write test file
      const testPath = await this.writer.writeTest(
        testDir,
        contractName,
        currentCode,
        format
      );

      console.log(`  📝 Wrote test file: ${testPath}`);

      // Step 3: Try to compile
      console.log(`  🔨 Compiling...`);
      const compilationResult = await this.compiler.compile();

      history.push({
        iteration,
        code: currentCode,
        compilationResult,
        errors: compilationResult.errors,
        action: "compiled",
        compiled: compilationResult.success,
        qualityScore: compilationResult.success ? 50 : 0, // Basic score
      });

      if (!compilationResult.success) {
        console.log(
          `  ❌ Compilation failed with ${compilationResult.errors.length} error(s)`
        );

        // Try to fix compilation errors
        currentCode = await this.refineFromCompilation(
          currentCode,
          contractSource,
          compilationResult.errors,
          format
        );

        history.push({
          iteration,
          code: currentCode,
          errors: compilationResult.errors,
          action: "refined",
        });

        continue;
      }

      console.log(`  ✅ Compilation successful`);

      // Step 4: Try to run tests
      console.log(`  🧪 Running tests...`);
      const testResult = await this.compiler.runTests(testPath);

      history.push({
        iteration,
        code: currentCode,
        testResult,
        errors: testResult.errors.map((e) => e.error),
        action: "tested",
        compiled: true,
        testsPassed: testResult.success,
        qualityScore: testResult.success ? 100 : 75,
      });

      if (!testResult.success) {
        console.log(`  ❌ Tests failed: ${testResult.failed} test(s) failing`);

        // Only refine if we have iterations left
        if (iteration < this.maxIterations) {
          currentCode = await this.refineFromTests(
            currentCode,
            contractSource,
            testResult.errors,
            format
          );

          history.push({
            iteration,
            code: currentCode,
            errors: testResult.errors.map((e) => e.error),
            action: "refined",
          });

          continue;
        } else {
          // Out of iterations, return what we have
          console.log(
            `  ⚠️  Reached max iterations. Tests still failing but returning best attempt.`
          );
          break;
        }
      }

      // Success!
      console.log(`  ✅ All tests passed!`);

      // Get final quality score from last validation
      const finalValidation = this.validator.validate(currentCode, format);

      return {
        success: true,
        iterations: history,
        finalCode: currentCode,
        finalQualityScore: finalValidation.qualityScore || 100,
        history,
      };
    }

    // Ran out of iterations or failed
    const finalValidation = this.validator.validate(currentCode, format);

    return {
      success: false,
      iterations: history,
      finalCode: currentCode,
      finalQualityScore: finalValidation.qualityScore || 0,
      history,
    };
  }

  /**
   * Refine code based on validation errors
   */
  private async refineFromValidation(
    code: string,
    contractSource: string,
    errors: string[],
    format: "solidity" | "typescript"
  ): Promise<string> {
    const prompt = `The following ${format} test code has validation errors. Please fix them and return the corrected code.

ORIGINAL TEST CODE:
\`\`\`${format}
${code}
\`\`\`

VALIDATION ERRORS:
${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}

REQUIREMENTS:
- Fix all validation errors
- Maintain all existing test logic
- Ensure proper imports and structure
- Return ONLY the corrected code, no explanations

CORRECTED CODE:`;

    try {
      return await this.aiService.generate(prompt);
    } catch (error) {
      console.error("Failed to refine from validation errors:", error);
      return code; // Return original if refinement fails
    }
  }

  /**
   * Refine code based on compilation errors
   */
  private async refineFromCompilation(
    code: string,
    contractSource: string,
    errors: string[],
    format: "solidity" | "typescript"
  ): Promise<string> {
    const prompt = `The following ${format} test code failed to compile. Please fix the compilation errors and return the corrected code.

TEST CODE WITH ERRORS:
\`\`\`${format}
${code}
\`\`\`

CONTRACT BEING TESTED:
\`\`\`solidity
${contractSource.substring(0, 3000)}
\`\`\`

COMPILATION ERRORS:
${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}

REQUIREMENTS:
- Fix all compilation errors
- Ensure correct imports and contract references
- Match the contract's actual function signatures
- Maintain all existing test coverage
- Return ONLY the corrected code, no explanations

CORRECTED CODE:`;

    try {
      return await this.aiService.generate(prompt);
    } catch (error) {
      console.error("Failed to refine from compilation errors:", error);
      return code;
    }
  }

  /**
   * Refine code based on test failures
   */
  private async refineFromTests(
    code: string,
    contractSource: string,
    errors: Array<{ testName: string; error: string }>,
    format: "solidity" | "typescript"
  ): Promise<string> {
    const prompt = `The following ${format} tests compiled successfully but are failing. Please fix the test logic and return the corrected code.

TEST CODE WITH FAILING TESTS:
\`\`\`${format}
${code}
\`\`\`

CONTRACT BEING TESTED:
\`\`\`solidity
${contractSource.substring(0, 3000)}
\`\`\`

TEST FAILURES:
${errors.map((e, i) => `${i + 1}. Test: ${e.testName}\n   Error: ${e.error}`).join("\n\n")}

REQUIREMENTS:
- Fix the failing tests by correcting expectations and test logic
- The contract code is correct, adjust tests to match actual behavior
- Fix incorrect assertions and expected values
- Maintain test coverage
- Return ONLY the corrected code, no explanations

CORRECTED CODE:`;

    try {
      return await this.aiService.generate(prompt);
    } catch (error) {
      console.error("Failed to refine from test failures:", error);
      return code;
    }
  }

  /**
   * Set maximum refinement iterations
   */
  setMaxIterations(max: number): void {
    this.maxIterations = Math.max(1, Math.min(max, 5)); // Between 1 and 5
  }

  /**
   * Get current max iterations
   */
  getMaxIterations(): number {
    return this.maxIterations;
  }
}
