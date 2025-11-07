import { RouterAgent } from './agents/router.agent';
import { SimplicityDocsAgent } from './agents/simplicity-docs.agent';
import { SimplicityCodeAgent } from './agents/simplicity-code.agent';
import { GeneralAgent } from './agents/general.agent';
import { AgentType, AgentContext, AgentResponse } from './types';

export class SimplicityWorkflow {
  private routerAgent: RouterAgent;
  private docsAgent: SimplicityDocsAgent;
  private codeAgent: SimplicityCodeAgent;
  private generalAgent: GeneralAgent;

  constructor(apiKey: string) {
    this.routerAgent = new RouterAgent(apiKey);
    this.docsAgent = new SimplicityDocsAgent(apiKey);
    this.codeAgent = new SimplicityCodeAgent(apiKey);
    this.generalAgent = new GeneralAgent(apiKey);
  }

  async process(input: string, context: AgentContext): Promise<AgentResponse> {
    try {
      // 1. Roteamento
      const routingDecision = await this.routerAgent.route(input, context);

      // 2. Processamento com o agente escolhido
      let response: AgentResponse;

      switch (routingDecision.targetAgent) {
        case AgentType.SIMPLICITY_DOCS:
          response = await this.docsAgent.process(input, context);
          break;
        case AgentType.SIMPLICITY_CODE:
          response = await this.codeAgent.process(input, context);
          break;
        case AgentType.GENERAL:
        default:
          response = await this.generalAgent.process(input, context);
          break;
      }

      return response;
    } catch (error) {
      return {
        success: false,
        agentType: AgentType.GENERAL,
        response: 'Erro ao processar sua solicitação. Tente novamente.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async *processStreaming(
    input: string,
    context: AgentContext,
  ): AsyncGenerator<{ type: string; data: any }, void, unknown> {
    try {
      // Emite evento de início
      yield {
        type: 'step-start',
        data: {
          step: 'routing',
          message: 'Analisando sua solicitação...',
        },
      };

      // 1. Roteamento
      const routingDecision = await this.routerAgent.route(input, context);

      yield {
        type: 'step-complete',
        data: {
          step: 'routing',
          message: `Roteado para agente: ${routingDecision.targetAgent}`,
          result: routingDecision,
        },
      };

      yield {
        type: 'step-start',
        data: {
          step: 'processing',
          message: `Processando com ${routingDecision.targetAgent}...`,
        },
      };

      // 2. Processamento com o agente escolhido
      let response: AgentResponse;

      switch (routingDecision.targetAgent) {
        case AgentType.SIMPLICITY_DOCS:
          response = await this.docsAgent.process(input, context);
          break;
        case AgentType.SIMPLICITY_CODE:
          response = await this.codeAgent.process(input, context);
          break;
        case AgentType.GENERAL:
        default:
          response = await this.generalAgent.process(input, context);
          break;
      }

      yield {
        type: 'step-complete',
        data: {
          step: 'processing',
          message: 'Processamento concluído',
        },
      };

      // 3. Streaming da resposta (simula digitação)
      if (response.success && response.response) {
        const text = response.response;
        let accumulated = '';

        for (let i = 0; i < text.length; i++) {
          accumulated += text[i];
          yield {
            type: 'text',
            data: {
              text: text[i],
              accumulated,
              isComplete: i === text.length - 1,
            },
          };
          // Pequena pausa para simular digitação
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      yield {
        type: 'done',
        data: {
          message: 'Resposta completa',
          response,
        },
      };
    } catch (error) {
      yield {
        type: 'error',
        data: {
          message: 'Erro ao processar solicitação',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}

