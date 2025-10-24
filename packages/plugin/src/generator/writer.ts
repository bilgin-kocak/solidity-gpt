/**
 * Test Writer - Writes generated tests to files
 */

import * as fs from "fs";
import * as path from "path";

export class TestWriter {
  /**
   * Write test file to the appropriate directory
   */
  async writeTest(
    testDir: string,
    contractName: string,
    testContent: string,
    format: "solidity" | "typescript"
  ): Promise<string> {
    // Ensure test directory exists
    await fs.promises.mkdir(testDir, { recursive: true });

    // Determine file extension and path
    const extension = format === "solidity" ? ".t.sol" : ".test.ts";
    const testFileName = `${contractName}${extension}`;
    const testFilePath = path.join(testDir, testFileName);

    // Add file header if not present
    const contentWithHeader = this.ensureProperFormat(
      testContent,
      contractName,
      format
    );

    // Write the file
    await fs.promises.writeFile(testFilePath, contentWithHeader, "utf8");

    return testFilePath;
  }

  /**
   * Ensure the test content has proper formatting
   */
  private ensureProperFormat(
    content: string,
    contractName: string,
    format: "solidity" | "typescript"
  ): string {
    if (format === "solidity") {
      // Check if SPDX license is present
      if (!content.includes("SPDX-License-Identifier")) {
        return `// SPDX-License-Identifier: MIT\n${content}`;
      }
      return content;
    } else {
      // TypeScript tests - ensure imports are present
      if (!content.includes("import")) {
        const header = `import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

`;
        return header + content;
      }
      return content;
    }
  }

  /**
   * Read existing test file
   */
  async readTest(testFilePath: string): Promise<string> {
    return fs.promises.readFile(testFilePath, "utf8");
  }

  /**
   * Check if test file exists
   */
  async testExists(
    testDir: string,
    contractName: string,
    format: "solidity" | "typescript"
  ): Promise<boolean> {
    const extension = format === "solidity" ? ".t.sol" : ".test.ts";
    const testFileName = `${contractName}${extension}`;
    const testFilePath = path.join(testDir, testFileName);

    try {
      await fs.promises.access(testFilePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Backup existing test file before overwriting
   */
  async backupTest(
    testDir: string,
    contractName: string,
    format: "solidity" | "typescript"
  ): Promise<string | null> {
    const extension = format === "solidity" ? ".t.sol" : ".test.ts";
    const testFileName = `${contractName}${extension}`;
    const testFilePath = path.join(testDir, testFileName);

    const exists = await this.testExists(testDir, contractName, format);
    if (!exists) {
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `${contractName}.backup-${timestamp}${extension}`;
    const backupFilePath = path.join(testDir, backupFileName);

    await fs.promises.copyFile(testFilePath, backupFilePath);
    return backupFilePath;
  }
}
