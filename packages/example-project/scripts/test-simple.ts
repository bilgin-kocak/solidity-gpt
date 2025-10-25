import hre from "hardhat";

console.log("Script is running!");
console.log("HRE has solidityGPT:", !!(hre as any).solidityGPT);

if ((hre as any).solidityGPT) {
  console.log("✅ Plugin loaded successfully!");
} else {
  console.log("❌ Plugin not loaded!");
}
