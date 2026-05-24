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

export async function estimateTaskTime(
  taskTitle: string,
  recentCompletedTasks: Task[],
  apiKey: string
): Promise<number> {
  const historyText = recentCompletedTasks
    .filter(t => t.actual_minutes)
    .slice(0, 5) // Últimas 5 tarefas com tempo real
    .map(t => `- "${t.title}": levou ${t.actual_minutes} minutos. (Estimado antes era ${t.estimated_minutes})`)
    .join('\n');

  const systemPrompt = `Você é um estimador de tempo (em minutos) hiper-realista e especialista em produtividade.
Seu objetivo é chutar quantos minutos o usuário levará para concluir uma nova tarefa.

Regras:
1. Retorne APENAS um número inteiro (ex: 15, 30, 45, 60, 90, 120).
2. Não retorne nenhum texto extra. Se não souber, chute 30.
3. Arredonde sempre para múltiplos de 15 minutos (ex: 15, 30, 45, 60), exceto para coisas muitos rápidas que podem ser 5 ou 10.
4. Aprenda com o histórico recente do usuário, se houver:
${historyText || "(Sem histórico ainda. Assuma tempos normais: emails=15m, codar=60m, ler=30m, etc.)"}
`;

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Tarefa: ${taskTitle}` }
      ],
      temperature: 0.3,
      max_tokens: 10,
    }),
  });

  if (!response.ok) {
    return 30; // Fallback seguro de 30 minutos em caso de falha de rede/API
  }

  const data = await response.json();
  const textVal = data.choices[0].message.content.trim();
  const parsed = parseInt(textVal, 10);
  
  if (isNaN(parsed) || parsed <= 0) return 30;
  return parsed;
}
