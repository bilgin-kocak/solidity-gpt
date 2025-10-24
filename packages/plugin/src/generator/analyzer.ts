/**
 * Security Analyzer - Identifies potential security vulnerabilities
 */

import * as parser from "@solidity-parser/parser";
import type { SecurityAnalysis } from "../types.js";

export class SecurityAnalyzer {
  /**
   * Analyze contract for security patterns
   */
  analyze(ast: parser.ASTNode): SecurityAnalysis {
    const analysis: SecurityAnalysis = {
      reentrancyRisk: [],
      accessControl: [],
      arithmeticOps: [],
      externalCalls: [],
      uncheckedCalls: [],
    };

    let currentFunction: string | null = null;

    parser.visit(ast, {
      FunctionDefinition: (node: any) => {
        currentFunction = node.name || "unknown";

        // Check for access control modifiers
        const accessModifiers = node.modifiers?.filter((m: any) =>
          ["onlyOwner", "onlyRole", "onlyAdmin", "onlyGovernance"].includes(
            m.name
          )
        );

        if (accessModifiers && accessModifiers.length > 0) {
          analysis.accessControl.push({
            function: currentFunction,
            modifiers: accessModifiers.map((m: any) => m.name),
          });
        }

        // Check for potential reentrancy (functions that are not view/pure)
        if (
          node.stateMutability !== "view" &&
          node.stateMutability !== "pure"
        ) {
          const hasExternalCalls = this.hasExternalCalls(node.body);
          if (hasExternalCalls) {
            analysis.reentrancyRisk.push({
              function: currentFunction,
              reason: "Contains external calls in state-modifying function",
            });
          }
        }
      },

      FunctionCall: (node: any) => {
        const methodName = node.expression?.memberName;

        // Check for low-level calls
        if (["call", "delegatecall", "staticcall"].includes(methodName)) {
          analysis.uncheckedCalls.push({
            type: methodName,
            location: node.loc?.start?.line?.toString() || "unknown",
          });
        }

        // Track external calls
        if (node.expression?.type === "MemberAccess") {
          const target = node.expression?.expression?.name || "external";
          if (currentFunction) {
            analysis.externalCalls.push({
              function: currentFunction,
              target,
            });
          }
        }
      },

      BinaryOperation: (node: any) => {
        // Track arithmetic operations
        if (["+", "-", "*", "/", "%", "**"].includes(node.operator)) {
          analysis.arithmeticOps.push({
            operator: node.operator,
            location: node.loc?.start?.line?.toString() || "unknown",
          });
        }
      },
    });

    return analysis;
  }

  /**
   * Check if a node contains external calls
   */
  private hasExternalCalls(node: any): boolean {
    if (!node) return false;

    let hasCall = false;

    try {
      parser.visit(node, {
        FunctionCall: (funcNode: any) => {
          const methodName = funcNode.expression?.memberName;
          // Check for transfer, send, call, or external function calls
          if (
            ["transfer", "send", "call", "delegatecall"].includes(methodName) ||
            funcNode.expression?.type === "MemberAccess"
          ) {
            hasCall = true;
          }
        },
      });
    } catch {
      // If visit fails, assume no external calls
    }

    return hasCall;
  }

  /**
   * Identify edge cases based on function parameters
   */
  identifyEdgeCases(
    parameters: Array<{ type: string; name?: string }>
  ): Array<{ param: string; test: string; value: string }> {
    const cases: Array<{ param: string; test: string; value: string }> = [];

    parameters.forEach((param) => {
      const paramName = param.name || "param";

      if (param.type === "uint256" || param.type.startsWith("uint")) {
        cases.push({ param: paramName, test: "zero value", value: "0" });
        cases.push({
          param: paramName,
          test: "max value",
          value: "type(uint256).max",
        });
      }

      if (param.type === "int256" || param.type.startsWith("int")) {
        cases.push({ param: paramName, test: "negative value", value: "-1" });
        cases.push({
          param: paramName,
          test: "max positive",
          value: "type(int256).max",
        });
        cases.push({
          param: paramName,
          test: "min negative",
          value: "type(int256).min",
        });
      }

      if (param.type === "address") {
        cases.push({
          param: paramName,
          test: "zero address",
          value: "address(0)",
        });
      }

      if (param.type === "bytes" || param.type.startsWith("bytes")) {
        cases.push({ param: paramName, test: "empty bytes", value: '""' });
      }

      if (param.type === "string") {
        cases.push({ param: paramName, test: "empty string", value: '""' });
      }
    });

    return cases;
  }
}
