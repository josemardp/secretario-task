import type { Task } from '../types';
import {
  buildDeterministicCoachNarrative,
  buildGovernedCoachAIPayload,
  buildGovernedCoachPrompt,
  formatGovernedCoachNarrative,
  parseGovernedCoachAIResponse,
  type GovernedCoachAIPayload,
} from './coachAIGuardrails';
import { isActionableBriefingTask } from './taskFilters';

const OPENAI_API_URL = 'https://api.openai.com/v1';

export type EstimatedTimeResult = {
  minutes: number;
  source: 'ai' | 'default_30';
};

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
  apiKey: string,
  governedPayload?: GovernedCoachAIPayload,
): Promise<string> {
  const now = new Date();
  const payload = governedPayload ?? buildGovernedCoachAIPayload({
    topTasks: tasks.filter((task) => isActionableBriefingTask(task, now)),
    allTasks: tasks,
    energy,
    now,
  });
  const systemPrompt = buildGovernedCoachPrompt(payload);

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0,
        max_tokens: 220,
      }),
    });

    if (!response.ok) {
      return buildDeterministicCoachNarrative(payload);
    }

    const data = await response.json();
    const rawText = String(data.choices?.[0]?.message?.content ?? '').trim();
    const governedResponse = parseGovernedCoachAIResponse(rawText, payload);
    return formatGovernedCoachNarrative(governedResponse);
  } catch (err) {
    console.warn('Fallback deterministico do briefing ativado:', err);
    return buildDeterministicCoachNarrative(payload);
  }
}

export async function estimateTaskTime(
  taskTitle: string,
  recentCompletedTasks: Task[],
  apiKey: string
): Promise<EstimatedTimeResult> {
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

  try {
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
      return { minutes: 30, source: 'default_30' };
    }

    const data = await response.json();
    const textVal = data.choices[0].message.content.trim();
    const parsed = parseInt(textVal, 10);

    if (isNaN(parsed) || parsed <= 0) return { minutes: 30, source: 'default_30' };
    return { minutes: parsed, source: 'ai' };
  } catch {
    return { minutes: 30, source: 'default_30' };
  }
}

export async function transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string | null> {
  const formData = new FormData();
  // Whisper requires a file name with an extension to guess the format
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'pt'); // Force Portuguese to improve accuracy for neurodivergent stutters/accents

  try {
    const response = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn('Whisper API Error:', errorBody);
      return null;
    }

    const data = await response.json();
    return String(data.text ?? '').trim() || null;
  } catch (err) {
    console.warn('Falha nao-critica ao transcrever audio:', err);
    return null;
  }
}
