import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface SimplicityExample {
  name: string;
  code: string;
  witness?: string;
  args?: string;
  description?: string;
}

/**
 * Carrega todos os exemplos de Simplicity da pasta examples-ai
 */
export function loadSimplicityExamples(): SimplicityExample[] {
  // Tenta diferentes caminhos possíveis
  const possiblePaths = [
    join(process.cwd(), 'src/lib/examples-ai'),
    join(process.cwd(), 'src', 'lib', 'examples-ai'),
    join(__dirname, '..', '..', 'examples-ai'),
  ];

  let examplesDir: string | null = null;
  for (const path of possiblePaths) {
    try {
      readdirSync(path);
      examplesDir = path;
      break;
    } catch {
      // Continua tentando
    }
  }

  if (!examplesDir) {
    console.warn('Could not find examples directory');
    return [];
  }

  const files = readdirSync(examplesDir);
  
  const examples: Map<string, SimplicityExample> = new Map();

  // Agrupa arquivos por nome base
  for (const file of files) {
    const baseName = file.replace(/\.(simf|wit|args)$/, '').replace(/\.(transfer|timeout|complete|inherit)$/, '');
    
    if (!examples.has(baseName)) {
      examples.set(baseName, {
        name: baseName,
        code: '',
        description: '',
      });
    }

    const example = examples.get(baseName)!;
    const filePath = join(examplesDir, file);
    const content = readFileSync(filePath, 'utf-8');

    if (file.endsWith('.simf')) {
      example.code = content;
      // Extrai descrição do comentário no topo
      const commentMatch = content.match(/\/\*\s*\*\s*(.+?)\s*\*\//s);
      if (commentMatch && commentMatch[1]) {
        example.description = commentMatch[1]
          .split('\n')
          .map(line => line.replace(/^\s*\*\s*/, '').trim())
          .filter(line => line.length > 0)
          .join(' ');
      }
    } else if (file.endsWith('.wit')) {
      example.witness = content;
    } else if (file.endsWith('.args')) {
      example.args = content;
    }
  }

  return Array.from(examples.values()).filter(ex => ex.code.length > 0);
}

/**
 * Busca exemplos relevantes baseado em palavras-chave
 */
export function findRelevantExamples(query: string, examples: SimplicityExample[]): SimplicityExample[] {
  const lowerQuery = query.toLowerCase();
  const keywords = lowerQuery.split(/\s+/).filter(k => k.length > 2);

  return examples
    .map(example => {
      let score = 0;
      const description = example.description || '';
      const searchText = `${example.name} ${description} ${example.code}`.toLowerCase();

      // Pontuação baseada em matches
      for (const keyword of keywords) {
        if (example.name.toLowerCase().includes(keyword)) score += 3;
        if (description.toLowerCase().includes(keyword)) score += 2;
        if (searchText.includes(keyword)) score += 1;
      }

      return { example, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Top 5 exemplos mais relevantes
    .map(({ example }) => example);
}

/**
 * Formata exemplos para incluir no prompt
 */
export function formatExamplesForPrompt(examples: SimplicityExample[]): string {
  if (examples.length === 0) return '';

  let formatted = '\n\n## Exemplos de Código Simplicity:\n\n';

  for (const example of examples) {
    formatted += `### ${example.name}\n`;
    if (example.description) {
      formatted += `${example.description}\n\n`;
    }
    formatted += '```simplicity\n';
    formatted += example.code;
    formatted += '\n```\n\n';
    
    if (example.witness) {
      formatted += '**Witness:**\n```json\n';
      formatted += example.witness;
      formatted += '\n```\n\n';
    }
  }

  return formatted;
}

