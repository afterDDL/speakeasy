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
  return session.responses.map((item, index) => (
    `Q${index + 1} (${item.part}): ${item.question}\nCandidate answer: ${item.answer || '(empty)'}`
  )).join('\n\n');
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
        '  "questionFeedback": [{"question": string, "issue": string, "suggestion": string, "usefulPhrases": string[]}]',
        '}',
        'Scores are IELTS band scores from 0 to 9. Keep Chinese comments concise and practical.',
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
