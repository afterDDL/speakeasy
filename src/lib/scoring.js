import { getSettings } from './storage.js';

export function buildLocalScores(responses) {
  const text = responses.map((item) => item.answer).join(' ').trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const unique = new Set(words.map((word) => word.toLowerCase().replace(/[^a-z']/g, '')).filter(Boolean)).size;
  const avgWords = responses.length ? words.length / responses.length : 0;
  const answered = responses.filter((item) => item.answer?.trim()).length;

  const lexical = roundHalf(clamp(5 + unique / 45, 4, 8));
  const fluency = roundHalf(clamp(4.8 + avgWords / 35, 4, 8));
  const grammar = roundHalf(clamp(5.2 + Math.min(words.length, 260) / 180, 4, 8));
  const pronunciation = 6;
  const overall = roundHalf((fluency + lexical + grammar + pronunciation) / 4);

  const shortAnswers = avgWords < 25;
  const enoughCoverage = answered >= Math.max(1, Math.ceil(responses.length * 0.75));
  const strengths = [
    enoughCoverage ? '完成度不错，大部分题目都有回答记录。' : '已经开始形成练习闭环，可以继续提高每题完成度。',
    unique > 60 ? '词汇覆盖面较广，能使用不同表达推进回答。' : '表达清楚，适合作为继续扩展内容的基础。',
  ];
  const weaknesses = [
    shortAnswers ? '部分回答偏短，观点、原因和例子还不够完整。' : '回答有内容，但还可以加入更多具体例子和细节。',
    '浏览器转写无法真正评估发音，Pronunciation 目前是保守参考分。',
  ];
  const nextGoal = shortAnswers
    ? '下一轮每题至少回答 3 句：直接回答 + 原因 + 具体例子。'
    : '下一轮重点练习连接词和例子展开，让每个回答更像自然对话。';

  return normalizeScores({
    fluency,
    lexical,
    grammar,
    pronunciation,
    overall,
    summary: getSummary(overall),
    comment: shortAnswers
      ? '本次回答偏短。建议先把答案扩展到完整的观点、原因和例子，再追求高级表达。'
      : '本次回答已经形成基本内容。下一步可以加强连接词、具体例子和更准确的动词搭配。',
    strengths,
    weaknesses,
    nextGoal,
    criteria: {
      fluency: { score: fluency, comment: shortAnswers ? '回答长度偏短，流利度判断较保守。' : '能持续表达，但可减少停顿并延长回答。' },
      lexical: { score: lexical, comment: unique > 60 ? '词汇有一定多样性。' : '可加入更具体的名词、动词和话题词。' },
      grammar: { score: grammar, comment: '本地评分只能粗略估算语法，需要 AI 进一步检查具体错误。' },
      pronunciation: { score: pronunciation, comment: '当前浏览器转写不提供音素级发音分析。' },
    },
    questionFeedback: responses.map((item, index) => buildQuestionFeedback(item, index)),
  });
}

export async function scoreWithDeepSeek(session) {
  const settings = getSettings();
  try {
    return await scoreViaProxy(session, settings);
  } catch (error) {
    if (!settings.deepseekApiKey) {
      throw new Error(`${error.message} 如果你在本地开发，请先部署或启动后端代理；也可以临时在设置页填写 DeepSeek API Key 走本地兜底。`);
    }
    console.warn('AI score proxy failed; falling back to direct DeepSeek call.', error);
  }

  if (!settings.deepseekApiKey) {
    throw new Error('AI 评分代理不可用。请部署后端代理，或在本地开发时临时填写 DeepSeek API Key。');
  }
  const content = buildScoringContent(session);
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: settings.deepseekModel || 'deepseek-chat',
      temperature: 0.2,
      messages: buildScoringMessages(content),
    }),
  });
  if (!response.ok) {
    throw new Error(`DeepSeek 请求失败：${response.status}`);
  }
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(raw.replace(/^```json/i, '').replace(/```$/i, '').trim());
  return normalizeScores(parsed);
}

async function scoreViaProxy(session, settings) {
  const response = await fetch(`${getApiBaseUrl(settings)}/api/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session }),
  });
  if (!response.ok) {
    const data = await safeJson(response);
    throw new Error(data?.error || `AI 评分代理请求失败：${response.status}`);
  }
  const data = await response.json();
  return normalizeScores(data.scores || data);
}

function getApiBaseUrl(settings) {
  return (settings.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
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

export function normalizeScores(scores) {
  const criteria = scores.criteria || {};
  const fluency = Number(criteria.fluency?.score ?? scores.fluency ?? 0);
  const lexical = Number(criteria.lexical?.score ?? scores.lexical ?? 0);
  const grammar = Number(criteria.grammar?.score ?? scores.grammar ?? 0);
  const pronunciation = Number(criteria.pronunciation?.score ?? scores.pronunciation ?? 0);
  const overall = Number(scores.overall || roundHalf((fluency + lexical + grammar + pronunciation) / 4));
  return {
    fluency,
    lexical,
    grammar,
    pronunciation,
    overall,
    summary: scores.summary || getSummary(overall),
    comment: scores.comment || '本次报告已生成。建议结合逐题反馈继续练习。',
    strengths: ensureList(scores.strengths),
    weaknesses: ensureList(scores.weaknesses),
    nextGoal: scores.nextGoal || '下一轮选择一个具体目标集中练习。',
    criteria: {
      fluency: { score: fluency, comment: criteria.fluency?.comment || '继续保持表达连续性。' },
      lexical: { score: lexical, comment: criteria.lexical?.comment || '继续积累话题词和准确搭配。' },
      grammar: { score: grammar, comment: criteria.grammar?.comment || '注意句子结构和时态准确性。' },
      pronunciation: { score: pronunciation, comment: criteria.pronunciation?.comment || '当前发音分为参考估算。' },
    },
    questionFeedback: Array.isArray(scores.questionFeedback) ? scores.questionFeedback : [],
  };
}

function buildQuestionFeedback(item, index) {
  const answer = item.answer?.trim() || '';
  const wordCount = answer ? answer.split(/\s+/).length : 0;
  return {
    question: item.question,
    issue: wordCount === 0
      ? '这一题还没有有效回答记录。'
      : wordCount < 25
        ? '回答偏短，缺少原因或例子。'
        : '回答有基本内容，可以继续提升表达精确度。',
    suggestion: wordCount < 25
      ? '尝试用“I think..., because..., for example...”把答案扩展成三句。'
      : '尝试加入一个具体经历或对比，让答案更自然。',
    usefulPhrases: getUsefulPhrases(item.part, index),
  };
}

function getUsefulPhrases(part, index) {
  const banks = {
    part1: ['I would say...', 'The main reason is that...', 'For example...'],
    part2: ['I would like to talk about...', 'What impressed me most was...', 'Looking back, I felt...'],
    part3: ['From a broader perspective...', 'It depends on the situation.', 'Compared with the past...'],
  };
  return banks[part] || banks.part1;
}

function getSummary(overall) {
  if (overall >= 7) return '表达基础较好，下一步重点是细节、准确性和自然度。';
  if (overall >= 6) return '已经具备可交流的基础，需要加强展开和语言质量。';
  return '目前更适合先建立完整回答结构，再逐步提升词汇和语法。';
}

function ensureList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundHalf(value) {
  return Math.round(value * 2) / 2;
}
