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
      // Carrega exemplos e encontra os mais relevantes
      const allExamples = this.loadExamples();
      const relevantExamples = findRelevantExamples(input, allExamples);
      const examplesText = formatExamplesForPrompt(relevantExamples);

      // Constrói o prompt do sistema com exemplos
      let systemPrompt = `${AGENT_SYSTEM_PROMPTS.SIMPLICITY_CODE}\n\nRepositório GitHub: ${SIMPLICITY_GITHUB_URL}`;
      
      if (examplesText) {
        systemPrompt += `\n\n${examplesText}`;
        systemPrompt += `\n\nIMPORTANTE: Use esses exemplos como referência para criar código Simplicity. Baseie-se nos padrões, funções e estruturas mostradas nos exemplos acima.`;
      }

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: systemPrompt,
        },
      ];

      // Adiciona histórico de conversa recente
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
        response: 'Erro ao processar sua solicitação de código Simplicity.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async canHandle(input: string): Promise<boolean> {
    const lowerInput = input.toLowerCase();
    const keywords = [
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
    ];
    return keywords.some((keyword) => lowerInput.includes(keyword));
  }
}

