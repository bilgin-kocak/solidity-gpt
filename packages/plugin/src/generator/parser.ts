/**
 * Contract Parser - Extracts contract information using @solidity-parser/parser
 */

import * as parser from "@solidity-parser/parser";
import * as fs from "fs";
import * as path from "path";
import type {
  ContractFile,
  ContractInfo,
  FunctionInfo,
  StateVariable,
  ModifierInfo,
  EventInfo,
  ImportInfo,
  ParameterInfo,
} from "../types.js";

export class ContractParser {
  /**
   * Parse a Solidity contract source code
   */
  parse(source: string): any {
    try {
      return parser.parse(source, {
        loc: true,
        range: true,
        tolerant: false,
      });
    } catch (error) {
      if (error instanceof parser.ParserError) {
        throw new Error(
          `Solidity parsing failed: ${error.errors.map((e) => e.message).join(", ")}`
        );
      }
      throw error;
    }
  }

  /**
   * Extract comprehensive contract information from AST
   */
  extractInfo(ast: any, source: string): ContractInfo {
    const info: ContractInfo = {
      functions: [],
      stateVariables: [],
      modifiers: [],
      events: [],
      imports: [],
    };

    parser.visit(ast, {
      FunctionDefinition: (node: any) => {
        // Skip constructor and receive/fallback functions for now
        if (!node.name || node.isConstructor) {
          return;
        }

        info.functions.push({
          name: node.name,
          visibility: node.visibility || "public",
          stateMutability: node.stateMutability,
          parameters: this.extractParameters(node.parameters),
          returnParameters: this.extractParameters(node.returnParameters),
          modifiers: node.modifiers?.map((m: any) => m.name || "") || [],
        });
      },

      StateVariableDeclaration: (node: any) => {
        node.variables?.forEach((v: any) => {
          info.stateVariables.push({
            name: v.name || "",
            typeName: this.getTypeName(v.typeName),
            visibility: v.visibility,
            isConstant: v.isDeclaredConst || false,
          });
        });
      },

      ModifierDefinition: (node: any) => {
        info.modifiers.push({
          name: node.name || "",
          parameters: this.extractParameters(node.parameters),
        });
      },

      EventDefinition: (node: any) => {
        info.events.push({
          name: node.name || "",
          parameters:
            node.parameters?.map((p: any) => ({
              type: this.getTypeName(p.typeName),
              name: p.name,
              indexed: p.isIndexed || false,
            })) || [],
        });
      },

      ImportDirective: (node: any) => {
        info.imports.push({
          path: node.path || "",
          symbols: node.symbolAliases?.map((s: any) => s[0]) || [],
        });
      },
    });

    return info;
  }

  /**
   * Extract parameter information from AST nodes
   */
  private extractParameters(parameters: any): ParameterInfo[] {
    if (!parameters || !Array.isArray(parameters)) {
      return [];
    }

    return parameters.map((p: any) => ({
      type: this.getTypeName(p.typeName),
      name: p.name,
    }));
  }

  /**
   * Get type name string from type node
   */
  private getTypeName(typeNode: any): string {
    if (!typeNode) return "unknown";

    if (typeNode.name) {
      return typeNode.name;
    }

    if (typeNode.type === "ElementaryTypeName") {
      return typeNode.name || "unknown";
    }

    if (typeNode.type === "UserDefinedTypeName") {
      return typeNode.namePath || "unknown";
    }

    if (typeNode.type === "Mapping") {
      return `mapping(${this.getTypeName(typeNode.keyType)} => ${this.getTypeName(typeNode.valueType)})`;
    }

    if (typeNode.type === "ArrayTypeName") {
      return `${this.getTypeName(typeNode.baseTypeName)}[]`;
    }

    return typeNode.type || "unknown";
  }

  /**
   * Read all Solidity contract files from a directory
   */
  async readContracts(contractsDir: string): Promise<ContractFile[]> {
    const contracts: ContractFile[] = [];

    const walkDir = async (dir: string) => {
      const files = await fs.promises.readdir(dir, { withFileTypes: true });

      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(dir, file.name);

          if (file.isDirectory()) {
            await walkDir(filePath);
          } else if (file.name.endsWith(".sol") && !file.name.endsWith(".t.sol")) {
            try {
              const source = await fs.promises.readFile(filePath, "utf8");
              contracts.push({
                path: filePath,
                name: path.basename(file.name, ".sol"),
                source,
              });
            } catch (error) {
              console.warn(`Warning: Could not read ${filePath}: ${error}`);
            }
          }
        })
      );
    };

    await walkDir(contractsDir);
    return contracts;
  }

  /**
   * Get contract name from source code
   */
  getContractName(ast: any): string | null {
    let contractName: string | null = null;

    parser.visit(ast, {
      ContractDefinition: (node: any) => {
        if (!contractName) {
          contractName = node.name;
        }
      },
    });

    return contractName;
  }
}
