const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DEEPSEEK_API_KEY) {
      return json({ error: 'DeepSeek API Key is not configured on the server.' }, 500);
    }

    const { session } = await request.json();
    validateSession(session);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL || 'deepseek-chat',
        temperature: 0.2,
        messages: buildScoringMessages(buildScoringContent(session)),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return json({ error: `DeepSeek request failed: ${response.status}`, detail: detail.slice(0, 500) }, response.status);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const scores = JSON.parse(stripJsonFence(raw));
    return json({ scores });
  } catch (error) {
    return json({ error: error.message || 'AI score request failed.' }, 500);
  }
}

function validateSession(session) {
  if (!session || !Array.isArray(session.responses)) {
    throw new Error('Invalid session payload.');
  }
  if (session.responses.length > 30) {
    throw new Error('Too many responses in one scoring request.');
  }
}

function buildScoringContent(session) {
  const sessionContext = [
    `Mode: ${session.mode?.label || session.mode?.id || 'practice'}`,
    `Topic: ${session.topic?.title_en || session.topic?.title_zh || 'N/A'}`,
    `Examiner: ${session.examiner?.name || 'N/A'}`,
  ].join('\n');
  const questions = session.responses.map((item, index) => ([
    `Q${index + 1}`,
    `Part: ${item.part}`,
    `Question: ${item.question}`,
    `Chinese note: ${item.zh || 'N/A'}`,
    `Cue card prompts: ${item.prompts?.length ? item.prompts.join(' | ') : 'N/A'}`,
    `Is follow-up: ${item.isFollowUp ? 'yes' : 'no'}`,
    `Answer duration seconds: ${item.durationSeconds ?? 'N/A'}`,
    `Candidate answer: ${item.answer || '(empty)'}`,
  ].join('\n'))).join('\n\n');
  return `${sessionContext}\n\n${questions}`;
}

function buildScoringMessages(content) {
  return [
    {
      role: 'system',
      content: [
        'You are an IELTS Speaking coach and examiner.',
        'Return strict JSON only. No markdown.',
        'Schema:',
        '{',
        '  "overall": number,',
        '  "summary": string,',
        '  "comment": string,',
        '  "criteria": {',
        '    "fluency": {"score": number, "comment": string},',
        '    "lexical": {"score": number, "comment": string},',
        '    "grammar": {"score": number, "comment": string},',
        '    "pronunciation": {"score": number, "comment": string}',
        '  },',
        '  "strengths": string[],',
        '  "weaknesses": string[],',
        '  "nextGoal": string,',
        '  "questionFeedback": [{',
        '    "question": string,',
        '    "issue": string,',
        '    "suggestion": string,',
        '    "answerFramework": string,',
        '    "contentGap": string,',
        '    "sampleUpgrade": string,',
        '    "usefulPhrases": string[]',
        '  }]',
        '}',
        'Scores are IELTS band scores from 0 to 9. Keep Chinese comments concise and practical.',
        'For questionFeedback, avoid generic repeated advice. Each item must be based on that exact question and candidate answer.',
        'For Part 1, give a 2-3 sentence answer structure. For Part 2, use the cue card prompts as the structure. For Part 3, give an opinion-reason-example/contrast structure.',
        'contentGap must say what this answer missed for this specific question. sampleUpgrade must be one improved answer fragment in natural English, not a full memorized essay.',
        'usefulPhrases must be topic-specific and should not repeat the same phrases across all questions unless genuinely relevant.',
      ].join('\n'),
    },
    { role: 'user', content },
  ];
}

function stripJsonFence(raw) {
  return raw.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
