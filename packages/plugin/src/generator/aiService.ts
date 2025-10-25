/**
 * AI Service - Handles API calls to OpenAI and Anthropic
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type AIModel =
  | "gpt-5"                              // GPT-5 (latest)
  | "gpt-5-2025-08-07"                   // GPT-5 dated version
  | "gpt-5-codex"                        // GPT-5 optimized for coding
  | "gpt-4o"                             // GPT-4o (fallback)
  | "gpt-4o-2024-11-20"                  // GPT-4o dated
  | "claude-sonnet-4-5-20250929"         // Claude Sonnet 4.5 (LATEST - Sept 2025)
  | "claude-sonnet-4-5-20250929-thinking" // Claude Sonnet 4.5 with extended thinking
  | "claude-sonnet-4"                    // Claude Sonnet 4
  | "claude-3-5-sonnet-20241022";        // Claude 3.5 Sonnet (older)

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
    this.model = config.model || "claude-sonnet-4-5-20250929"; // Default to Claude Sonnet 4.5 (latest)
    this.temperature = config.temperature || 0.1;
    this.maxTokens = config.maxTokens || 8000;

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

    // Determine if model is Claude or GPT
    const isClaudeModel = model.startsWith("claude-");
    const isGPTModel = model.startsWith("gpt-");

    // Try the preferred model first
    try {
      if (isClaudeModel && this.anthropic) {
        return await this.generateWithClaude(prompt, model);
      } else if (isGPTModel && this.openai) {
        return await this.generateWithGPT(prompt, model);
      }
    } catch (error) {
      console.warn(`Failed with ${model}, trying fallback...`);
    }

    // Fallback to the other provider if available
    if (isClaudeModel && this.openai) {
      console.log("Falling back to GPT-5...");
      return await this.generateWithGPT(prompt, "gpt-5-2025-08-07");
    } else if (isGPTModel && this.anthropic) {
      console.log("Falling back to Claude Sonnet 4.5...");
      return await this.generateWithClaude(prompt, "claude-sonnet-4-5-20250929");
    }

    throw new Error("All AI providers failed or are not configured");
  }

  /**
   * Generate with Claude (Anthropic)
   */
  private async generateWithClaude(prompt: string, modelType?: AIModel): Promise<string> {
    if (!this.anthropic) {
      throw new Error("Anthropic API not configured");
    }

    // Map our model types to Anthropic model IDs
    let modelId: string;
    if (modelType === "claude-sonnet-4-5-20250929" || modelType === "claude-sonnet-4-5-20250929-thinking") {
      modelId = modelType; // Claude Sonnet 4.5 uses exact model ID
    } else if (modelType === "claude-3-5-sonnet-20241022") {
      modelId = "claude-3-5-sonnet-20241022"; // Claude 3.5 Sonnet
    } else {
      modelId = "claude-sonnet-4-20250514"; // Claude Sonnet 4 (fallback)
    }

    return this.retryWithBackoff(async () => {
      const response = await this.anthropic!.messages.create({
        model: modelId,
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
    }, `Claude (${modelId})`);
  }

  /**
   * Generate with GPT (OpenAI)
   */
  private async generateWithGPT(prompt: string, modelType?: AIModel): Promise<string> {
    if (!this.openai) {
      throw new Error("OpenAI API not configured");
    }

    // Map our model types to OpenAI model IDs
    let modelId: string;
    if (modelType === "gpt-5" || modelType === "gpt-5-2025-08-07") {
      modelId = modelType === "gpt-5-2025-08-07" ? "gpt-5-2025-08-07" : "gpt-5";
    } else if (modelType === "gpt-5-codex") {
      modelId = "gpt-5-codex"; // GPT-5 optimized for coding
    } else if (modelType === "gpt-4o-2024-11-20") {
      modelId = "gpt-4o-2024-11-20";
    } else {
      modelId = "gpt-4o"; // Default fallback
    }

    return this.retryWithBackoff(async () => {
      // GPT-5 has different API parameters:
      // - Uses max_completion_tokens instead of max_tokens
      // - Only supports temperature=1 (default)
      const isGPT5 = modelId.startsWith("gpt-5");
      const tokenParam = isGPT5 ? { max_completion_tokens: this.maxTokens } : { max_tokens: this.maxTokens };
      const temperatureParam = isGPT5 ? {} : { temperature: this.temperature }; // GPT-5 only supports default temperature

      const response = await this.openai!.chat.completions.create({
        model: modelId,
        ...temperatureParam,
        ...tokenParam,
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
        throw new Error("Empty response from GPT");
      }

      return this.extractCode(content);
    }, `GPT (${modelId})`);
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
