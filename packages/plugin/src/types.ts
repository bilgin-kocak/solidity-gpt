/**
 * Type definitions for SolidityGPT plugin
 */

export interface SolidityGPTConfig {
  apiKey?: string;
  anthropicApiKey?: string;
  model?: "gpt-4o" | "claude-sonnet-4";
  testFormat?: "typescript" | "solidity";
  temperature?: number;
  maxTokens?: number;
}

export interface ContractFile {
  path: string;
  name: string;
  source: string;
}

export interface ParameterInfo {
  type: string;
  name?: string;
}

export interface FunctionInfo {
  name: string;
  visibility: string;
  stateMutability?: string;
  parameters: ParameterInfo[];
  returnParameters: ParameterInfo[];
  modifiers: string[];
}

export interface StateVariable {
  name: string;
  typeName: string;
  visibility?: string;
  isConstant?: boolean;
}

export interface ModifierInfo {
  name: string;
  parameters: ParameterInfo[];
}

export interface EventInfo {
  name: string;
  parameters: Array<{
    type: string;
    name?: string;
    indexed: boolean;
  }>;
}

export interface ImportInfo {
  path: string;
  symbols: string[];
}

export interface ContractInfo {
  functions: FunctionInfo[];
  stateVariables: StateVariable[];
  modifiers: ModifierInfo[];
  events: EventInfo[];
  imports: ImportInfo[];
}

export interface SecurityAnalysis {
  reentrancyRisk: Array<{ function: string; reason: string }>;
  accessControl: Array<{ function: string; modifiers: string[] }>;
  arithmeticOps: Array<{ operator: string; location: string }>;
  externalCalls: Array<{ function: string; target: string }>;
  uncheckedCalls: Array<{ type: string; location: string }>;
}

export interface EdgeCase {
  param: string;
  test: string;
  value: string;
}

export interface PromptOptions {
  contract: string;
  functions: FunctionInfo[];
  security?: SecurityAnalysis;
  format: "typescript" | "solidity";
  includeSecurity: boolean;
}

export interface TestValidation {
  valid: boolean;
  errors: string[];
}

export interface GenerateTestsOptions {
  contract?: string;
  format: "typescript" | "solidity";
  security: boolean;
  coverage?: boolean;
  refine?: boolean;
}
