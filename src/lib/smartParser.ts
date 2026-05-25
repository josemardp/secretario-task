import type { Task, ContextType } from '../types';
import { parseTaskInput } from './parser';

const OPENAI_API_URL = 'https://api.openai.com/v1';

const CONTEXTS = ['PM', 'Esdra', 'Pessoal', 'Familia', 'CCB', 'Estudo', 'Saude'];

export async function parseMultipleTasks(rawText: string, defaultContext: ContextType, apiKey?: string | null): Promise<Partial<Task>[]> {
  if (!apiKey) {
    // Fallback "burro" se não tiver chave, separando por quebras de linha e conectivos
    const lines = rawText.split(/\r?\n/);
    const tasks: Partial<Task>[] = [];
    
    for (const line of lines) {
      const cleanLine = line.trim().replace(/^-/, '').trim();
      if (cleanLine.length < 3) continue;
      
      // Se a linha tem cara de bullet point, não tenta fatiar mais
      if (line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
        tasks.push(parseTaskInput(cleanLine, defaultContext));
      } else {
        const parts = cleanLine.split(/(?:,|\be\b|\bdepois\b|\blogo\b)/i).filter(p => p.trim().length > 3);
        if (parts.length === 0) parts.push(cleanLine);
        tasks.push(...parts.map(p => parseTaskInput(p.trim(), defaultContext)));
      }
    }
    
    return tasks;
  }

  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);

  const systemPrompt = `Você é um extrator de tarefas em português brasileiro. Extraia CADA TAREFA do texto e devolva APENAS JSON com array "tasks". Não pule nenhuma tarefa.

━━━ FORMATO DE HORÁRIO BRASILEIRO (CRÍTICO) ━━━
O formato "HHhMM" significa: número ANTES do h = HORA, número DEPOIS do h = MINUTOS.
"09h00" → hora 9, minuto 0  → ISO time: T09:00
"09h05" → hora 9, minuto 5  → ISO time: T09:05
"09h10" → hora 9, minuto 10 → ISO time: T09:10
"09h15" → hora 9, minuto 15 → ISO time: T09:15
"14h30" → hora 14, minuto 30 → ISO time: T14:30
NUNCA interprete o número após "h" como hora. Ele é sempre MINUTO.

━━━ FUSO HORÁRIO ━━━
Data/hora LOCAL atual (Brasília, UTC-3): ${localISOTime}
Para converter local → UTC: ADICIONE 3 horas.
Exemplos: 09:00 local = 12:00 UTC | 09:05 local = 12:05 UTC | 14:30 local = 17:30 UTC
due_at deve ser SEMPRE em UTC com sufixo Z.

━━━ RECORRÊNCIAS ━━━
Se o texto indicar repetição, preencha recurrence_rule com dias em inglês separados por vírgula:
"segunda a sexta" / "dias úteis" / "todo dia útil" → "monday,tuesday,wednesday,thursday,friday"
"todo dia" / "diariamente" / "todos os dias"       → "daily"
"toda semana" / "semanalmente"                      → "weekly"
"toda segunda"                                      → "monday"
"toda terça e quinta"                               → "tuesday,thursday"
Para tarefas recorrentes, due_at = primeira ocorrência futura a partir de agora.

━━━ CAMPOS DE CADA OBJETO ━━━
- title: string — título limpo sem datas, horas ou bullets
- context: "PM"|"Esdra"|"Pessoal"|"Familia"|"CCB"|"Estudo"|"Saude" — escolha o mais coerente
- priority: number 0-10 (urgente=10, alta=8, média=5, baixa=2, padrão=0)
- energy: number 0-10 (alta=8, média=5, baixa=2, padrão=0)
- due_at: string ISO 8601 UTC com Z, ou null. Se não houver hora explícita, use 12:00:00Z (= 09:00 local).
- recurrence_rule: string ou null

Responda APENAS com JSON válido contendo o array "tasks".`;

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
          { role: 'user', content: rawText }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errTxt = await response.text();
      console.error('Falha na API da OpenAI:', errTxt);
      // forçar erro para cair no catch e usar fallback inteligente
      throw new Error('API Falhou');
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    
    if (content.tasks && Array.isArray(content.tasks)) {
      return content.tasks.map((t: any) => {
        let finalDueAt = t.due_at;
        // Tratar caso a IA retorne DD/MM/YYYY HH:MM literalmente em vez de ISO
        if (finalDueAt && finalDueAt.match(/^\d{2}\/\d{2}\/\d{4}/)) {
           const [datePart, timePart] = finalDueAt.split(' ');
           const [d, m, y] = datePart.split('/');
           const [h, min] = timePart ? timePart.split(':') : ['09', '00'];
           const parsedD = new Date(Number(y), Number(m)-1, Number(d), Number(h), Number(min));
           finalDueAt = parsedD.toISOString();
        }

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
    console.error('Fallback ativado. Erro no parse:', e);
  }

  // Fallback se a API falhar ou não retornar array válido (reusa lógica de linhas)
  const lines = rawText.split(/\r?\n/);
  const tasks: Partial<Task>[] = [];
  for (const line of lines) {
    const cleanLine = line.trim().replace(/^-/, '').trim();
    if (cleanLine.length < 3) continue;
    if (line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
      tasks.push(parseTaskInput(cleanLine, defaultContext));
    } else {
      const parts = cleanLine.split(/(?:,|\be\b|\bdepois\b|\blogo\b)/i).filter(p => p.trim().length > 3);
      if (parts.length === 0) parts.push(cleanLine);
      tasks.push(...parts.map(p => parseTaskInput(p.trim(), defaultContext)));
    }
  }
  return tasks;
}
