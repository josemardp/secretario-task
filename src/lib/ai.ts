import type { Task } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1';

export async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(`${OPENAI_API_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    throw new Error('Falha ao gerar embedding');
  }

  const data = await response.json();
  return data.data[0].embedding;
}

export async function generateSmartBriefing(
  tasks: Task[], 
  energy: number, 
  apiKey: string
): Promise<string> {
  const tasksListText = tasks
    .slice(0, 10) // Limit context to top 10 tasks to save tokens
    .map(t => `- ${t.title} (Prioridade: ${t.priority}, Energia exigida: ${t.energy}, Contexto: ${t.context})`)
    .join('\n');

  const systemPrompt = `Você é um assistente pessoal de produtividade (SecretárioTask).
Seu objetivo é dar um briefing motivacional e super direto para o usuário começar o dia ou a sessão de trabalho.
O usuário tem um nível de energia atual de ${energy}/10. 
Adapte o seu tom: se a energia for alta (8-10), seja altamente encorajador para tarefas difíceis. Se for baixa (1-3), recomende pegar leve e focar no que é fácil.

Tarefas do Top Ranking atual:
${tasksListText}

Gere um parágrafo único (máximo de 3 frases) com uma sugestão clara de por onde ele deve começar considerando a energia atual dele. Seja amigável mas direto ao ponto. Sem saudações clichês compridas.`;

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.7,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    throw new Error('Falha ao gerar briefing inteligente');
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}
