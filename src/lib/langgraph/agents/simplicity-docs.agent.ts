import { ChatOpenAI } from '@langchain/openai';
import { AgentType } from '../types';
import type { AgentContext, AgentResponse } from '../types';
import { AGENT_SYSTEM_PROMPTS, SIMPLICITY_DOCS_URL } from '../constants';

export class SimplicityDocsAgent {
  private readonly agentType = AgentType.SIMPLICITY_DOCS;
  private llm: ChatOpenAI;

  constructor(apiKey: string) {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      openAIApiKey: apiKey,
    });
  }

  async process(input: string, context: AgentContext): Promise<AgentResponse> {
    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: `${AGENT_SYSTEM_PROMPTS.SIMPLICITY_DOCS}\n\nOfficial Documentation: ${SIMPLICITY_DOCS_URL}\n\nRemember: You're helping users in SimplyIDE — the browser-based IDE where they can write, compile (WASM), and deploy Simplicity contracts to Liquid Testnet with zero setup.`,
        },
      ];

      if (context.conversationHistory && context.conversationHistory.length > 0) {
        const recentHistory = context.conversationHistory.slice(-6);
        for (const msg of recentHistory) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({
              role: msg.role,
              content: msg.content,
            });
          }
        }
      }

      messages.push({
        role: 'user',
        content: input,
      });

      const response = await this.llm.invoke(messages);

      return {
        success: true,
        agentType: this.agentType,
        response: typeof response.content === "string" ? response.content : "",
      };
    } catch (error) {
      return {
        success: false,
        agentType: this.agentType,
        response: 'Sorry, I encountered an error processing your question about Simplicity. Please try again, or rephrase your question. In SimplyIDE, you can learn about Simplicity and deploy contracts all from your browser!',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async canHandle(input: string): Promise<boolean> {
    const lowerInput = input.toLowerCase();
    const keywords = [
      'what is',
      'how does',
      'explain',
      'documentation',
      'concept',
      'simplicity',
      'question',
      'what',
      'which',
      'formal verification',
      'covenant',
      'bitcoin smart contract',
      'simplicity language',
    ];
    return keywords.some((keyword) => lowerInput.includes(keyword));
  }
}

