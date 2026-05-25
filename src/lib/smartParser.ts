import type { Task, ContextType } from '../types';
import { parseTaskInput } from './parser';

const OPENAI_API_URL = 'https://api.openai.com/v1';

const CONTEXTS = ['PM', 'Esdra', 'Pessoal', 'Familia', 'CCB', 'Estudo', 'Saude'];

export async function parseMultipleTasks(rawText: string, defaultContext: ContextType, apiKey?: string | null): Promise<Partial<Task>[]> {
  if (!apiKey) {
    // Fallback "burro" se não tiver chave, separando por conectivos simples
    const parts = rawText.split(/(?:,|\be\b|\bdepois\b|\blogo\b)/i).filter(p => p.trim().length > 3);
    if (parts.length === 0) parts.push(rawText);
    
    return parts.map(p => parseTaskInput(p.trim(), defaultContext));
  }

  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);

  const systemPrompt = `Você é um extrator de tarefas estruturadas. 
O usuário vai enviar um texto que pode conter uma, VÁRIAS ou DEZENAS de tarefas misturadas em linguagem natural ou em lista (bullet points).
Sua missão é extrair CADA TAREFA isoladamente, SEM PULAR NENHUMA (se houver 30 itens, devolva 30 objetos), e devolver um JSON com um array chamado "tasks". 
Cada objeto deve ter estritamente:
- title: string (o que fazer, limpo de datas e horas e bullets)
- context: string (Deve ser OBRIGATORIAMENTE um destes: 'PM', 'Esdra', 'Pessoal', 'Familia', 'CCB', 'Estudo', ou 'Saude'. Escolha o mais coerente).
- priority: number (0 a 10. Alta/urgente=10, media=5, baixa=2. Padrão 0).
- energy: number (0 a 10. Alta=8, media=5, baixa=2. Padrão 0).
- due_at: string ou null (Formato ISO 8601 UTC exato. A data local de HOJE AGORA é ${localISOTime}. Se a tarefa incluir uma data explicita como "(25/05/2026 08:30)", converta EXATAMENTE para esse horário ISO. Converta termos relativos como "amanhã" também. Se não disser hora, use 09:00:00).
- recurrence_rule: string ou null ('daily', 'weekly', 'monthly', etc).

Responda APENAS com o JSON válido do array "tasks".`;

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
        { role: 'user', content: rawText }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    console.error('Falha na API da OpenAI, usando fallback');
    return [parseTaskInput(rawText, defaultContext)];
  }

  try {
    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    
    if (content.tasks && Array.isArray(content.tasks)) {
      return content.tasks.map((t: any) => {
        // Garantir que a data é parseável (se falhar, cai pra null)
        let finalDueAt = t.due_at;
        if (finalDueAt) {
          const d = new Date(finalDueAt);
          if (isNaN(d.getTime())) finalDueAt = undefined;
        }

        return {
          title: String(t.title || rawText),
          context: CONTEXTS.includes(t.context) ? t.context as ContextType : defaultContext,
          priority: Number(t.priority) || 0,
          energy: Number(t.energy) || 0,
          due_at: finalDueAt,
          recurrence_rule: t.recurrence_rule || undefined
        };
      });
    }
  } catch (e) {
    console.error('Falha no parse do JSON da OpenAI', e);
  }

  return [parseTaskInput(rawText, defaultContext)];
}
