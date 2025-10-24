/**
 * Type extensions for Hardhat
 */

import "hardhat/types/config";
import type { SolidityGPTConfig } from "./types.js";

declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    solidityGPT?: SolidityGPTConfig;
  }

  export interface HardhatConfig {
    solidityGPT: SolidityGPTConfig;
  }
}
