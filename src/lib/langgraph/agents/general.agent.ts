import { ChatOpenAI } from '@langchain/openai';
import { AgentType, AgentContext, AgentResponse } from '../types';

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
      const messages = [
        {
          role: 'system' as const,
          content: `Você é um assistente útil especializado em Simplicity HL, a linguagem de programação de contratos inteligentes para Bitcoin. 
Você ajuda desenvolvedores a entender e construir contratos Simplicity. Seja claro, didático e forneça exemplos práticos quando possível.`,
        },
      ];

      // Adiciona histórico de conversa recente
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        const recentHistory = context.conversationHistory.slice(-6);
        messages.push(...recentHistory);
      }

      messages.push({
        role: 'user' as const,
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
        response: 'Erro ao processar sua solicitação.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

