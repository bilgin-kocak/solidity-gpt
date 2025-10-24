/**
 * AI Service - Handles API calls to OpenAI and Anthropic
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type AIModel = "gpt-4o" | "claude-sonnet-4";

export interface AIServiceConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
}

export class AIService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private model: AIModel;
  private temperature: number;
  private maxTokens: number;

  constructor(config: AIServiceConfig) {
    this.model = config.model || "claude-sonnet-4";
    this.temperature = config.temperature || 0.1;
    this.maxTokens = config.maxTokens || 4000;

    // Initialize OpenAI if key is provided
    if (config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    }

    // Initialize Anthropic if key is provided
    if (config.anthropicApiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.anthropicApiKey,
      });
    }

    // Validate that at least one API is configured
    if (!this.openai && !this.anthropic) {
      throw new Error(
        "No API keys provided. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable."
      );
    }
  }

  /**
   * Generate tests using the configured AI model
   */
  async generate(prompt: string, preferredModel?: AIModel): Promise<string> {
    const model = preferredModel || this.model;

    // Try the preferred model first
    try {
      if (model === "claude-sonnet-4" && this.anthropic) {
        return await this.generateWithClaude(prompt);
      } else if (model === "gpt-4o" && this.openai) {
        return await this.generateWithGPT(prompt);
      }
    } catch (error) {
      console.warn(`Failed with ${model}, trying fallback...`);
    }

    // Fallback to the other provider if available
    if (model === "claude-sonnet-4" && this.openai) {
      console.log("Falling back to GPT-4o...");
      return await this.generateWithGPT(prompt);
    } else if (model === "gpt-4o" && this.anthropic) {
      console.log("Falling back to Claude...");
      return await this.generateWithClaude(prompt);
    }

    throw new Error("All AI providers failed or are not configured");
  }

  /**
   * Generate with Claude (Anthropic)
   */
  private async generateWithClaude(prompt: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error("Anthropic API not configured");
    }

    return this.retryWithBackoff(async () => {
      const response = await this.anthropic!.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === "text") {
        return this.extractCode(content.text);
      }

      throw new Error("Unexpected response format from Claude");
    }, "Claude");
  }

  /**
   * Generate with GPT-4o (OpenAI)
   */
  private async generateWithGPT(prompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error("OpenAI API not configured");
    }

    return this.retryWithBackoff(async () => {
      const response = await this.openai!.chat.completions.create({
        model: "gpt-4o",
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: "system",
            content:
              "You are an expert Solidity test generator focusing on security and comprehensive coverage. Generate clean, well-documented test code.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from GPT-4o");
      }

      return this.extractCode(content);
    }, "GPT-4o");
  }

  /**
   * Extract code from markdown-formatted responses
   */
  private extractCode(response: string): string {
    // Remove markdown code blocks if present
    const codeBlockRegex = /```(?:solidity|typescript|javascript)?\n?([\s\S]*?)```/g;
    const matches = [...response.matchAll(codeBlockRegex)];

    if (matches.length > 0) {
      // Return the first code block found
      return matches[0][1].trim();
    }

    // If no code blocks found, return the whole response
    // (AI might have returned just code without markdown)
    return response.trim();
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    serviceName: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s

        // Check if it's a rate limit error
        const isRateLimit =
          error.status === 429 ||
          error.message?.includes("rate limit") ||
          error.message?.includes("too many requests");

        if (isRateLimit && attempt < maxRetries - 1) {
          console.log(
            `${serviceName} rate limit hit, retrying in ${delay / 1000}s...`
          );
          await this.sleep(delay);
          continue;
        }

        // Check if it's a temporary error worth retrying
        const isRetryable =
          error.status >= 500 ||
          error.code === "ECONNRESET" ||
          error.message?.includes("timeout");

        if (!isRetryable || attempt === maxRetries - 1) {
          break;
        }

        console.log(
          `${serviceName} request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay / 1000}s...`
        );
        await this.sleep(delay);
      }
    }

    throw new Error(
      `${serviceName} failed after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get available models based on configured APIs
   */
  getAvailableModels(): AIModel[] {
    const models: AIModel[] = [];
    if (this.openai) models.push("gpt-4o");
    if (this.anthropic) models.push("claude-sonnet-4");
    return models;
  }
}
