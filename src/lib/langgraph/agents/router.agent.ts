import { ChatOpenAI } from '@langchain/openai';
import { AgentType, type AgentContext, type RoutingDecision } from '../types';
import { AGENT_SYSTEM_PROMPTS } from '../constants';

export class RouterAgent {
  private llm: ChatOpenAI;

  constructor(apiKey: string) {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      openAIApiKey: apiKey,
    });
  }

  async route(input: string, _context: AgentContext): Promise<RoutingDecision> {
    try {
      const keywordMatch = this.matchByKeywords(input);
      if (keywordMatch) {
        return {
          targetAgent: keywordMatch,
          confidence: 90,
          reasoning: 'Keyword match',
        };
      }

      const response = await this.llm.invoke([
        {
          role: 'system',
          content: AGENT_SYSTEM_PROMPTS.ROUTER,
        },
        {
          role: 'user',
          content: `Analyze this request and determine the appropriate agent for SimplyIDE (browser-based IDE for Bitcoin smart contracts): "${input}"`,
        },
      ]);

      const agentChoice = (typeof response.content === "string" ? response.content : "").trim().toUpperCase();
      let targetAgent: AgentType;
      let confidence: number;

      if (agentChoice.includes('SIMPLICITY_DOCS') || agentChoice.includes('DOCS')) {
        targetAgent = AgentType.SIMPLICITY_DOCS;
        confidence = 85;
      } else if (agentChoice.includes('SIMPLICITY_CODE') || agentChoice.includes('CODE')) {
        targetAgent = AgentType.SIMPLICITY_CODE;
        confidence = 85;
      } else {
        targetAgent = AgentType.GENERAL;
        confidence = 70;
      }

        return {
          targetAgent,
          confidence,
          reasoning: `LLM decision: ${agentChoice}`,
        };
    } catch (error) {
        return {
          targetAgent: AgentType.GENERAL,
          confidence: 50,
          reasoning: `Routing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
  }

  private matchByKeywords(input: string): AgentType | null {
    const lowerInput = input.toLowerCase();

    const docsKeywords = [
      'what is',
      'how does',
      'explain',
      'documentation',
      'concept',
      'question',
      'what',
      'which',
      'formal verification',
      'covenant',
      'bitcoin smart contract',
      'simplicity language',
    ];

    const codeKeywords = [
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

    const hasDocsKeywords = docsKeywords.some((keyword) => lowerInput.includes(keyword));
    const hasCodeKeywords = codeKeywords.some((keyword) => lowerInput.includes(keyword));

    if (hasCodeKeywords) {
      return AgentType.SIMPLICITY_CODE;
    }

    if (hasDocsKeywords) {
      return AgentType.SIMPLICITY_DOCS;
    }

    return null;
  }
}

