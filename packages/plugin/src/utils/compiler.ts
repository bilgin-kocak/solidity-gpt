/**
 * Compiler Utility - Helpers for compiling and running tests
 */

type HardhatRuntimeEnvironment = any;

export interface CompilationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export interface TestRunResult {
  success: boolean;
  passed: number;
  failed: number;
  errors: TestError[];
}

export interface TestError {
  testName: string;
  error: string;
  stack?: string;
}

export class CompilerHelper {
  constructor(private hre: HardhatRuntimeEnvironment) {}

  /**
   * Compile the entire project
   */
  async compile(): Promise<CompilationResult> {
    try {
      // Hardhat 3 uses hre.tasks.run() instead of hre.run()
      if (this.hre.tasks?.run) {
        await this.hre.tasks.run("compile", { quiet: true });
      } else if (this.hre.run) {
        // Fallback for Hardhat 2 compatibility
        await this.hre.run("compile", { quiet: true });
      } else {
        // When running from scripts, hre doesn't have tasks.run or run
        // Try using dynamic import and subprocess instead
        const { execSync } = await import("child_process");
        try {
          execSync("npx hardhat compile", {
            cwd: this.hre.config?.paths?.root || process.cwd(),
            stdio: "pipe",
          });
        } catch (execError: any) {
          // Parse error output
          const output = execError.stdout?.toString() || execError.stderr?.toString() || execError.message;
          throw new Error(output);
        }
      }

      return {
        success: true,
        errors: [],
        warnings: [],
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);

      // Parse compilation errors
      const errors = this.parseCompilationErrors(errorMessage);

      return {
        success: false,
        errors,
        warnings: [],
      };
    }
  }

  /**
   * Run tests for a specific file
   */
  async runTests(testFile?: string): Promise<TestRunResult> {
    try {
      const args: any = { noCompile: true };

      if (testFile) {
        args.testFiles = [testFile];
      }

      // Hardhat 3 uses hre.tasks.run() instead of hre.run()
      if (this.hre.tasks?.run) {
        await this.hre.tasks.run("test", args);
      } else if (this.hre.run) {
        await this.hre.run("test", args);
      } else {
        throw new Error("Unable to run test task: hre.tasks.run or hre.run not available");
      }

      // If we get here, tests passed
      return {
        success: true,
        passed: 1, // We don't have exact count without parsing output
        failed: 0,
        errors: [],
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);

      // Parse test errors
      const errors = this.parseTestErrors(errorMessage);

      return {
        success: false,
        passed: 0,
        failed: errors.length,
        errors,
      };
    }
  }

  /**
   * Parse compilation error messages
   */
  private parseCompilationErrors(errorMessage: string): string[] {
    const errors: string[] = [];

    // Split by common error patterns
    const lines = errorMessage.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // Look for Solidity compiler errors
      if (
        trimmed.includes("Error:") ||
        trimmed.includes("TypeError:") ||
        trimmed.includes("ParserError:") ||
        trimmed.includes("DeclarationError:")
      ) {
        errors.push(trimmed);
      }

      // Look for file path indicators
      if (trimmed.includes("-->") && trimmed.includes(":")) {
        const nextLineIndex = lines.indexOf(line) + 1;
        if (nextLineIndex < lines.length) {
          const contextLine = lines[nextLineIndex].trim();
          if (contextLine) {
            errors.push(`${trimmed} ${contextLine}`);
          }
        }
      }
    }

    // If no specific errors found, return the whole message
    if (errors.length === 0) {
      errors.push(errorMessage.substring(0, 500)); // Limit length
    }

    return errors;
  }

  /**
   * Parse test error messages
   */
  private parseTestErrors(errorMessage: string): TestError[] {
    const errors: TestError[] = [];

    // Common test error patterns
    const testFailurePattern = /(\d+)\s+failing/;
    const testNamePattern = /\d+\)\s+(.+)/;

    const lines = errorMessage.split("\n");

    let currentTest = "";
    let currentError = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for test name
      const testMatch = line.match(testNamePattern);
      if (testMatch) {
        // Save previous test error if exists
        if (currentTest && currentError) {
          errors.push({
            testName: currentTest,
            error: currentError.trim(),
          });
        }

        currentTest = testMatch[1].trim();
        currentError = "";
        continue;
      }

      // Look for error details
      if (
        line.includes("Error:") ||
        line.includes("AssertionError:") ||
        line.includes("Expected") ||
        line.includes("AssertionError") ||
        line.includes("Revert") ||
        line.includes("TypeError")
      ) {
        currentError += line + "\n";
      }
    }

    // Save last test error
    if (currentTest && currentError) {
      errors.push({
        testName: currentTest,
        error: currentError.trim(),
      });
    }

    // If no structured errors found, create a generic one
    if (errors.length === 0) {
      errors.push({
        testName: "Unknown test",
        error: errorMessage.substring(0, 500),
      });
    }

    return errors;
  }

  /**
   * Check if a file exists and is compilable
   */
  async canCompile(filePath: string): Promise<boolean> {
    try {
      const fs = await import("fs");
      const exists = fs.existsSync(filePath);

      if (!exists) {
        return false;
      }

      // Try to read the file
      const content = fs.readFileSync(filePath, "utf8");

      // Basic checks
      if (filePath.endsWith(".sol")) {
        return content.includes("pragma solidity") || content.includes("contract");
      } else if (filePath.endsWith(".ts")) {
        return content.includes("describe") || content.includes("it(");
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get compilation cache status
   */
  async isCached(): Promise<boolean> {
    try {
      const path = await import("path");
      const fs = await import("fs");

      const cachePath = path.join(this.hre.config.paths.cache, "solidity-files-cache.json");
      return fs.existsSync(cachePath);
    } catch {
      return false;
    }
  }

  /**
   * Clean compilation cache
   */
  async cleanCache(): Promise<void> {
    try {
      // Hardhat 3 uses hre.tasks.run() instead of hre.run()
      if (this.hre.tasks?.run) {
        await this.hre.tasks.run("clean");
      } else if (this.hre.run) {
        await this.hre.run("clean");
      }
    } catch (error) {
      console.warn("Failed to clean cache:", error);
    }
  }
}
