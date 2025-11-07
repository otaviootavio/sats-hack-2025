import { ChatOpenAI } from '@langchain/openai';
import { AgentType, AgentContext, RoutingDecision } from '../types';
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

  async route(input: string, context: AgentContext): Promise<RoutingDecision> {
    try {
      // Primeiro tenta match por palavras-chave
      const keywordMatch = this.matchByKeywords(input);
      if (keywordMatch) {
        return {
          targetAgent: keywordMatch,
          confidence: 90,
          reasoning: 'Match por palavras-chave',
        };
      }

      // Se não encontrar, usa LLM para análise semântica
      const response = await this.llm.invoke([
        {
          role: 'system',
          content: AGENT_SYSTEM_PROMPTS.ROUTER,
        },
        {
          role: 'user',
          content: `Analise esta solicitação e determine o agente apropriado: "${input}"`,
        },
      ]);

      const agentChoice = String(response.content).trim().toUpperCase();
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
        reasoning: `Decisão do LLM: ${agentChoice}`,
      };
    } catch (error) {
      // Fallback para agente geral em caso de erro
      return {
        targetAgent: AgentType.GENERAL,
        confidence: 50,
        reasoning: `Erro no roteamento: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private matchByKeywords(input: string): AgentType | null {
    const lowerInput = input.toLowerCase();

    // Keywords para Simplicity Docs
    const docsKeywords = [
      'o que é',
      'como funciona',
      'explicar',
      'documentação',
      'conceito',
      'dúvida',
      'pergunta',
      'o que',
      'qual',
    ];

    // Keywords para Simplicity Code
    const codeKeywords = [
      'código',
      'code',
      'exemplo',
      'implementação',
      'github',
      'repositório',
      'mostre',
      'como fazer',
      'como criar',
      'contrato',
      'smart contract',
    ];

    const hasDocsKeywords = docsKeywords.some((keyword) => lowerInput.includes(keyword));
    const hasCodeKeywords = codeKeywords.some((keyword) => lowerInput.includes(keyword));

    // Se tem keywords de código, prioriza código
    if (hasCodeKeywords) {
      return AgentType.SIMPLICITY_CODE;
    }

    // Se tem keywords de docs, usa docs
    if (hasDocsKeywords) {
      return AgentType.SIMPLICITY_DOCS;
    }

    return null;
  }
}

