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
          content: `${AGENT_SYSTEM_PROMPTS.SIMPLICITY_DOCS}\n\nDocumentação oficial: ${SIMPLICITY_DOCS_URL}`,
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
        response: 'Erro ao processar sua dúvida sobre Simplicity.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async canHandle(input: string): Promise<boolean> {
    const lowerInput = input.toLowerCase();
    const keywords = [
      'o que é',
      'como funciona',
      'explicar',
      'documentação',
      'conceito',
      'simplicity',
      'dúvida',
      'pergunta',
    ];
    return keywords.some((keyword) => lowerInput.includes(keyword));
  }
}

