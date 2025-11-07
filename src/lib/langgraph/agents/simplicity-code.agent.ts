import { ChatOpenAI } from '@langchain/openai';
import { AgentType } from '../types';
import type { AgentContext, AgentResponse } from '../types';
import { AGENT_SYSTEM_PROMPTS, SIMPLICITY_GITHUB_URL } from '../constants';
import {
  loadSimplicityExamples,
  findRelevantExamples,
  formatExamplesForPrompt,
  type SimplicityExample,
} from '../examples/load-examples';

export class SimplicityCodeAgent {
  private readonly agentType = AgentType.SIMPLICITY_CODE;
  private llm: ChatOpenAI;
  private examples: SimplicityExample[] | null = null;

  constructor(apiKey: string) {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.2,
      openAIApiKey: apiKey,
    });
  }

  private loadExamples(): SimplicityExample[] {
    if (this.examples === null) {
      try {
        this.examples = loadSimplicityExamples();
      } catch (error) {
        console.error('Error loading examples:', error);
        this.examples = [];
      }
    }
    return this.examples;
  }

  async process(input: string, context: AgentContext): Promise<AgentResponse> {
    try {
      const allExamples = this.loadExamples();
      let relevantExamples = findRelevantExamples(input, allExamples);
      
      if (relevantExamples.length < 3 && allExamples.length > 0) {
        const fallbackExamples: SimplicityExample[] = [];
        
        const escrowExample = allExamples.find(ex => ex.name.includes('escrow'));
        const p2pkExample = allExamples.find(ex => ex.name.includes('p2pk'));
        const htlcExample = allExamples.find(ex => ex.name.includes('htlc'));
        const p2pkhExample = allExamples.find(ex => ex.name.includes('p2pkh'));
        const vaultExample = allExamples.find(ex => ex.name.includes('vault'));
        
        [escrowExample, p2pkExample, htlcExample, p2pkhExample, vaultExample].forEach(ex => {
          if (ex && !fallbackExamples.some(f => f.name === ex.name)) {
            fallbackExamples.push(ex);
          }
        });
        
        if (fallbackExamples.length < 3) {
          for (const ex of allExamples) {
            if (!fallbackExamples.some(f => f.name === ex.name)) {
              fallbackExamples.push(ex);
              if (fallbackExamples.length >= 5) break;
            }
          }
        }
        
        const combined = [...relevantExamples];
        fallbackExamples.forEach(ex => {
          if (!combined.some(c => c.name === ex.name)) {
            combined.push(ex);
          }
        });
        
        relevantExamples = combined.slice(0, 5); 
      }
      
      const examplesText = formatExamplesForPrompt(relevantExamples);

      let systemPrompt = `${AGENT_SYSTEM_PROMPTS.SIMPLICITY_CODE}\n\nGitHub Repository: ${SIMPLICITY_GITHUB_URL}`;
      
      if (examplesText) {
        systemPrompt += `\n\n${examplesText}`;
        systemPrompt += `\n\nCRITICAL INSTRUCTIONS:
- You MUST ALWAYS return ONLY Simplicity code (file extension .simf)
- NEVER return code in other languages (Solidity, JavaScript, Python, etc.)
- Base your code on the patterns, functions, and structures shown in the examples above
- Use Simplicity syntax, types, and functions (jet::*, witness::*, etc.)
- All code must be valid Simplicity that can compile via WASM in SimplyIDE
- Remember: users are working in SimplyIDE — a browser-based IDE where code compiles instantly via WASM and deploys directly to Liquid Testnet with one click
- If the user asks for code, they want Simplicity code, not any other language`;
      } else {
        systemPrompt += `\n\nCRITICAL: You MUST ALWAYS return ONLY Simplicity code. NEVER return code in other languages. All code must be valid Simplicity syntax.`;
      }

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: systemPrompt,
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
        response: 'Sorry, I encountered an error processing your Simplicity code request. Please try again, or rephrase your question. Remember, in SimplyIDE you can write, compile (WASM), and deploy to Liquid Testnet all from your browser!',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async canHandle(input: string): Promise<boolean> {
    const lowerInput = input.toLowerCase();
    const keywords = [
      'code',
      'example',
      'implementation',
      'github',
      'repository',
      'show',
      'how to',
      'create',
      'contract',
      'smart contract',
      'deploy',
      'compile',
      'debug',
      'optimize',
      'write',
    ];
    return keywords.some((keyword) => lowerInput.includes(keyword));
  }
}

