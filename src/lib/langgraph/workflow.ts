import { RouterAgent } from './agents/router.agent';
import { SimplicityDocsAgent } from './agents/simplicity-docs.agent';
import { SimplicityCodeAgent } from './agents/simplicity-code.agent';
import { GeneralAgent } from './agents/general.agent';
import { AgentType, type AgentContext, type AgentResponse } from './types';

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
      const routingDecision = await this.routerAgent.route(input, context);

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
        response: 'Sorry, I encountered an error processing your request. Please try again. SimplyIDE enables you to write, compile (WASM), and deploy Simplicity contracts to Liquid Testnet all from your browser!',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async *processStreaming(
    input: string,
    context: AgentContext,
  ): AsyncGenerator<{ type: string; data: unknown }, void, unknown> {
    try {
      yield {
        type: 'thinking',
        data: {
          message: 'Understanding your request...',
        },
      };

      await new Promise((resolve) => setTimeout(resolve, 300));

      yield {
        type: 'thinking',
        data: {
          message: 'Analyzing intent and routing to the right agent...',
        },
      };

      const routingDecision = await this.routerAgent.route(input, context);

      let processingMessages: string[] = [];
      
      switch (routingDecision.targetAgent) {
        case AgentType.SIMPLICITY_DOCS:
          processingMessages = [
            'Loading Simplicity documentation...',
            'Understanding concepts and formal verification...',
            'Preparing explanation in plain English...',
          ];
          break;
        case AgentType.SIMPLICITY_CODE:
          processingMessages = [
            'Loading Simplicity code examples...',
            'Analyzing patterns and best practices...',
            'Crafting production-ready Simplicity code...',
            'Ensuring formal verification compatibility...',
          ];
          break;
        case AgentType.GENERAL:
        default:
          processingMessages = [
            'Processing your request...',
            'Gathering relevant information...',
          ];
          break;
      }

      for (const message of processingMessages) {
        yield {
          type: 'thinking',
          data: {
            message,
          },
        };
        await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 300));
      }

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
        type: 'thinking',
        data: {
          message: 'Finalizing response...',
        },
      };
      
      await new Promise((resolve) => setTimeout(resolve, 200));

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
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      yield {
        type: 'done',
        data: {
          message: 'Response complete',
          response,
        },
      };
    } catch (error) {
      yield {
        type: 'error',
        data: {
          message: 'Error processing request',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}

