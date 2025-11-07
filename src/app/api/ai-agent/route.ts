import { NextRequest, NextResponse } from 'next/server';
import { SimplicityWorkflow } from '~/lib/langgraph/workflow';
import type { AgentContext } from '~/lib/langgraph/types';
import { env } from '~/env';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Verifica se tem API key do OpenAI
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Cria contexto do agente
    const context: AgentContext = {
      conversationHistory: conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    };

    // Cria workflow e processa
    const workflow = new SimplicityWorkflow(apiKey);

    // Para streaming, retorna um ReadableStream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of workflow.processStreaming(message, context)) {
            const data = JSON.stringify(event) + '\n';
            controller.enqueue(encoder.encode(data));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in AI agent route:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

