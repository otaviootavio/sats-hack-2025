import { ChatOpenAI } from '@langchain/openai';
import { AgentType, type AgentContext, type AgentResponse } from '../types';

export class GeneralAgent {
  private readonly agentType = AgentType.GENERAL;
  private llm: ChatOpenAI;

  constructor(apiKey: string) {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.5,
      openAIApiKey: apiKey,
    });
  }

  async process(input: string, context: AgentContext): Promise<AgentResponse> {
    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: `You are the AI Co-Pilot for SimplyIDE — the world's first browser-based IDE for Bitcoin smart contracts written in Simplicity.

          CONTEXT:
          SimplyIDE enables developers to write, compile (via in-browser WASM), and deploy Simplicity contracts directly to Liquid Testnet — all with zero setup, no nodes, no RPCs, no manual builds.

          YOUR ROLE:
          You are a helpful assistant specialized in Simplicity, the formally verified smart contract programming language that defines Bitcoin's next era of programmable finance. You help developers understand and build Simplicity contracts, navigate the SimplyIDE platform, and deploy to Bitcoin's ecosystem.

          KEY POINTS:
          - SimplyIDE is browser-based — no local setup required
          - Instant compilation via WASM compiler in the browser
          - One-click deployment to Liquid Testnet
          - All contracts are formally verified with mathematical guarantees
          - Simplicity enables DeFi, layer-2 protocols, escrow, payment channels, covenants, and more

          COMMUNICATION STYLE:
          - Be clear, instructive, and accessible
          - Explain concepts in plain English
          - Provide practical examples when possible
          - Emphasize the zero-setup, browser-based experience
          - Help developers transition from Ethereum/Solidity to Simplicity
          - Connect answers to real-world Bitcoin use cases

          If the question is about Simplicity concepts or documentation, you can mention the Docs Agent. If it's about code or implementation, mention the Code Agent.`,
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
        response: String(response.content),
      };
    } catch (error) {
      return {
        success: false,
        agentType: this.agentType,
        response: 'Sorry, I encountered an error processing your request. Please try again. Remember, SimplyIDE lets you write, compile (WASM), and deploy Simplicity contracts to Liquid Testnet all from your browser with zero setup!',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

