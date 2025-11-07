// Tipos para sistema multi-agentes no front-end

export enum AgentType {
  ROUTER = 'router',
  SIMPLICITY_DOCS = 'simplicity_docs',
  SIMPLICITY_CODE = 'simplicity_code',
  GENERAL = 'general',
}

export interface AgentContext {
  userId?: string;
  chatId?: string;
  conversationHistory: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: Date;
  }>;
}

export interface AgentResponse {
  success: boolean;
  agentType: AgentType;
  response: string;
  error?: string;
}

export interface RoutingDecision {
  targetAgent: AgentType;
  confidence: number;
  reasoning: string;
}

