import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  Download,
  Eye,
  EyeOff,
  History,
  Home,
  Mic,
  MicOff,
  Play,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import { questionBank as defaultQuestionBank } from './data/questionBank.js';
import {
  clearSessions,
  createId,
  getSettings,
  getSession,
  getSessions,
  getStoredQuestionBank,
  saveSession,
  saveQuestionBank,
  saveSettings,
  resetQuestionBank,
} from './lib/storage.js';
import { buildLocalScores, scoreWithDeepSeek } from './lib/scoring.js';
import './styles.css';

const examiners = [
  { id: 'alex', name: 'Alex', profile: '英国男考官', traits: '正式 · 稳定 · 考场感', color: '#007AFF', image: '/examiners/alex.jpg' },
  { id: 'priya', name: 'Priya', profile: '印度裔女考官', traits: '清晰 · 耐心 · 引导感', color: '#AF52DE', image: '/examiners/priya.jpg' },
  { id: 'kenji', name: 'Kenji', profile: '亚裔男考官', traits: '温和 · 理性 · 结构化', color: '#34C759', image: '/examiners/kenji.jpg' },
  { id: 'maya', name: 'Maya', profile: '黑人女考官', traits: '友好 · 鼓励 · 放松感', color: '#FF9500', image: '/examiners/maya.jpg' },
];

const modes = [
  { id: 'part1', label: 'Part 1 专项', detail: '日常话题练习', minutes: '~8分钟' },
  { id: 'part2', label: 'Part 2 专项', detail: '长独白练习', minutes: '~5分钟' },
  { id: 'part3', label: 'Part 3 专项', detail: '深度讨论练习', minutes: '~8分钟' },
  { id: 'full', label: '完整模拟', detail: 'Part 1 + 2 + 3', minutes: '~20分钟' },
];

function navigate(path) {
  window.location.hash = path;
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const onHash = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const [path, queryString = ''] = hash.replace(/^#/, '').split('?');
  return { path: path || '/', params: new URLSearchParams(queryString) };
}

function App() {
  const { path, params } = useHashRoute();
  if (path === '/practice') return <Practice key={`${params.get('examiner') || ''}-${params.get('mode') || ''}`} params={params} />;
  if (path === '/report') return <Report id={params.get('id')} />;
  if (path === '/history') return <HistoryPage />;
  if (path === '/questions') return <QuestionBank />;
  if (path === '/settings') return <SettingsPage />;
  if (path === '/share') return <SharePage id={params.get('id')} />;
  return <HomePage />;
}

function Shell({ children, title, back = '/', actions, onBack }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-link" onClick={onBack || (() => navigate(back))} aria-label="返回">
          {back === '/' ? <Home size={21} /> : <ArrowLeft size={22} />}
        </button>
        <strong className="topbar-title">{title}</strong>
        <div className="topbar-actions">{actions}</div>
      </header>
      {children}
    </div>
  );
}

function HomePage() {
  const [examiner, setExaminer] = useState(examiners[1]);
  const [mode, setMode] = useState(modes[0]);
  return (
    <Shell
      title="SpeakEasy"
      actions={
        <>
          <button className="icon-link" onClick={() => navigate('/questions')} aria-label="题库"><BookOpen size={20} /></button>
          <button className="icon-link" onClick={() => navigate('/history')} aria-label="历史"><History size={20} /></button>
          <button className="icon-link" onClick={() => navigate('/settings')} aria-label="设置"><Settings size={20} /></button>
        </>
      }
    >
      <main className="page">
        <section className="section-head">
          <h1>口语练习</h1>
          <p>选择考官与练习模式，开始一次真实保存的口语练习。</p>
        </section>
        <h2 className="label">选择考官形象</h2>
        <div className="examiner-grid">
          {examiners.map((item) => (
            <button
              key={item.id}
              className={`examiner ${examiner.id === item.id ? 'selected' : ''}`}
              onClick={() => setExaminer(item)}
            >
              <span className="avatar image-avatar" style={{ background: item.color }}>
                <img src={item.image} alt={`${item.name} examiner portrait`} />
              </span>
              <strong>{item.name}</strong>
              <small>{item.profile}</small>
              <small>{item.traits}</small>
            </button>
          ))}
        </div>

        <h2 className="label">选择练习模式</h2>
        <div className="mode-grid">
          {modes.map((item, index) => (
            <button key={item.id} className={`mode-card ${mode.id === item.id ? 'selected' : ''}`} onClick={() => setMode(item)}>
              <span className="mode-index">{item.id === 'full' ? <Sparkles size={22} /> : index + 1}</span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
              <small>{item.minutes}</small>
            </button>
          ))}
        </div>

        <button className="primary wide" onClick={() => navigate(`/practice?examiner=${examiner.id}&mode=${mode.id}`)}>
          <Play size={18} /> 开始练习
        </button>
      </main>
    </Shell>
  );
}

function makePlan(mode) {
  const bank = getStoredQuestionBank(defaultQuestionBank);
  const topic = getRandomPart2TopicFromBank(bank);
  const part1 = getPart1QuestionsFromBank(bank, mode === 'full' ? 5 : 8).map((q) => ({
    type: 'part1',
    question: q.en,
    zh: q.zh,
    topicName: q.topicName,
    topicId: q.topicId,
  }));
  const part2 = [{ type: 'part2', question: topic.title_en, zh: topic.title_zh, prompts: topic.prompts }];
  const part3 = getPart3QuestionsFromBank(bank, topic, mode === 'full' ? 4 : 6).map((q) => ({ type: 'part3', question: q.en, zh: q.zh }));
  if (mode === 'part1') return { topic, steps: part1 };
  if (mode === 'part2') return { topic, steps: part2 };
  if (mode === 'part3') return { topic, steps: part3 };
  return { topic, steps: [...part1, ...part2, ...part3] };
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getPart1QuestionsFromBank(bank, limit = 8) {
  const categories = bank.part1.categories || [];
  const workStudy = categories.find((category) => /work\s*or\s*stud/i.test(category.name_en || ''));
  const workStudyQuestions = (workStudy?.questions || []).map((question) => withPart1Topic(question, workStudy));
  const requiredWorkStudy = workStudyQuestions.slice(0, Math.min(3, limit));
  const remainingPool = categories
    .filter((category) => category.id !== workStudy?.id)
    .flatMap((category) => category.questions.map((question) => withPart1Topic(question, category)));
  return [...requiredWorkStudy, ...shuffle(remainingPool).slice(0, Math.max(0, limit - requiredWorkStudy.length))];
}

function withPart1Topic(question, category) {
  return {
    ...question,
    topicId: category.id,
    topicName: category.name_en || category.name_zh || 'this topic',
  };
}

function getRandomPart2TopicFromBank(bank) {
  const topics = bank.part2_3.categories.flatMap((category) => category.topic_cards);
  return topics[Math.floor(Math.random() * topics.length)] || {
    id: 'fallback-topic',
    category_id: '',
    title_en: 'Describe an interesting experience you had',
    title_zh: '一次有趣的经历',
    prompts: ['What happened', 'Where it happened', 'Who was with you', 'And explain why it was interesting'],
    follow_ups: [],
  };
}

function getPart3QuestionsFromBank(bank, topic, limit = 6) {
  if (topic?.follow_ups?.length) {
    return shuffle(topic.follow_ups).slice(0, limit);
  }
  const sameCategory = bank.part3_topics
    .filter((part3Topic) => part3Topic.category_id === topic?.category_id)
    .flatMap((part3Topic) => part3Topic.questions);
  const pool = sameCategory.length
    ? sameCategory
    : bank.part3_topics.flatMap((part3Topic) => part3Topic.questions);
  return shuffle(pool).slice(0, limit);
}

function Practice({ params }) {
  const examiner = examiners.find((item) => item.id === params.get('examiner')) || examiners[0];
  const mode = modes.find((item) => item.id === params.get('mode')) || modes[0];
  const settings = getSettings();
  const plan = useMemo(() => makePlan(mode.id), [mode.id]);
  const isFullExam = mode.id === 'full';
  const [examStarted, setExamStarted] = useState(!isFullExam);
  const [flowSteps, setFlowSteps] = useState(plan.steps);
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [answer, setAnswer] = useState('');
  const [questionVisible, setQuestionVisible] = useState(() => !['part1', 'part3'].includes(plan.steps[0]?.type));
  const [phase, setPhase] = useState(plan.steps[0]?.type === 'part2' ? 'prep' : 'answer');
  const [prepLeft, setPrepLeft] = useState(settings.part2PrepSeconds);
  const [answerLeft, setAnswerLeft] = useState(getAnswerSeconds(plan.steps[0], settings, isFullExam));
  const [examinerSpeaking, setExaminerSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const completingRef = useRef(false);
  const step = flowSteps[index];
  const isLast = index === flowSteps.length - 1;
  const previousStep = flowSteps[index - 1];
  const examinerCue = isFullExam && examStarted ? getExaminerCue(step, previousStep, phase, index, examiner) : '';

  useEffect(() => {
    if (!step) return;
    completingRef.current = false;
    setAnswer('');
    setQuestionVisible(!['part1', 'part3'].includes(step.type));
    setPhase(step.type === 'part2' && !step.isFollowUp ? 'prep' : 'answer');
    setPrepLeft(settings.part2PrepSeconds);
    setAnswerLeft(getAnswerSeconds(step, settings, isFullExam));
  }, [index, flowSteps.length]);

  useEffect(() => {
    if (!step || !examStarted) return undefined;
    const timer = window.setTimeout(() => {
      const hooks = {
        onStart: () => {
          setSpeechError('');
          setExaminerSpeaking(true);
        },
        onEnd: () => setExaminerSpeaking(false),
        onError: (message) => {
          setExaminerSpeaking(false);
          setSpeechError(message);
        },
      };
      if (isFullExam) {
        speakExamText(buildExamSpeechText(step, previousStep, phase, index), examiner, hooks);
      } else {
        speakQuestion(step, examiner, hooks);
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      window.speechSynthesis?.cancel();
      setExaminerSpeaking(false);
    };
  }, [index, examStarted]);

  useEffect(() => {
    if (!examStarted || phase !== 'prep') return undefined;
    const timer = window.setInterval(() => {
      setPrepLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setPhase('answer');
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, examStarted]);

  useEffect(() => {
    if (!examStarted || phase !== 'answer') return undefined;
    const timer = window.setInterval(() => {
      setAnswerLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, index, examStarted]);

  useEffect(() => {
    if (!isFullExam || !examStarted || phase !== 'answer' || answerLeft !== 0) return undefined;
    const timer = window.setTimeout(() => saveAndMove({ auto: true }), 200);
    return () => window.clearTimeout(timer);
  }, [answerLeft, phase, isFullExam, examStarted, answer]);

  useEffect(() => {
    if (!isFullExam || !examStarted || phase !== 'answer' || step?.type !== 'part2') return undefined;
    if (answerLeft !== getAnswerSeconds(step, settings, isFullExam)) return undefined;
    const timer = window.setTimeout(() => speakExamText('Your preparation time is over. Please start speaking now.', examiner, {
      onStart: () => {
        setSpeechError('');
        setExaminerSpeaking(true);
      },
      onEnd: () => setExaminerSpeaking(false),
      onError: (message) => {
        setExaminerSpeaking(false);
        setSpeechError(message);
      },
    }), 350);
    return () => window.clearTimeout(timer);
  }, [phase, index]);

  useEffect(() => {
    if (!isFullExam || !examStarted) return undefined;
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isFullExam, examStarted]);

  function startExam() {
    setExamStarted(true);
  }

  function exitPractice() {
    if (isFullExam && examStarted && !window.confirm('完整模拟尚未结束，确定要退出吗？本次未完成内容不会生成报告。')) return;
    navigate('/');
  }

  function saveAndMove({ auto = false } = {}) {
    if (!step || completingRef.current) return;
    completingRef.current = true;
    const clean = answer.trim();
    const nextResponses = [
      ...responses,
      {
        id: createId('response'),
        part: step.type,
        question: step.question,
        zh: step.zh,
        prompts: step.prompts || [],
        isFollowUp: Boolean(step.isFollowUp),
        followUpKind: step.followUpKind || null,
        autoEnded: auto,
        answer: clean,
        durationSeconds: getAnswerSeconds(step, settings, isFullExam) - answerLeft,
      },
    ];
    const followUp = getNextFollowUpStep(step, clean, nextResponses, mode.id);
    if (followUp) {
      setResponses(nextResponses);
      setFlowSteps((items) => [...items.slice(0, index + 1), followUp, ...items.slice(index + 1)]);
      setIndex((value) => value + 1);
      return;
    }
    if (!isLast) {
      setResponses(nextResponses);
      setIndex((value) => value + 1);
      return;
    }
    const session = {
      id: createId('session'),
      createdAt: new Date().toISOString(),
      examiner,
      mode,
      topic: plan.topic,
      responses: nextResponses,
      examMeta: isFullExam ? buildFullExamMeta(nextResponses) : null,
      scores: buildLocalScores(nextResponses),
      aiProvider: null,
    };
    saveSession(session);
    navigate(`/report?id=${session.id}`);
  }

  if (isFullExam && !examStarted) {
    return (
      <Shell title={mode.label} back="/">
        <main className="practice-page">
          <section className="exam-lobby">
            <span className="avatar large image-avatar" style={{ background: examiner.color }}>
              <img src={examiner.image} alt={`${examiner.name} examiner portrait`} />
            </span>
            <span className="pill">IELTS Speaking Mock Test</span>
            <h1>完整模拟即将开始</h1>
            <p>开始后将按 Part 1、Part 2、Part 3 自动推进。Part 2 会保留正式准备时间；答题时间结束会自动进入下一步；回答明显过短时，考官可能追加追问。</p>
            <div className="exam-rule-grid">
              <div><strong>{examiner.name}</strong><span>本场考官</span></div>
              <div><strong>{flowSteps.length}</strong><span>基础题目</span></div>
              <div><strong>严格计时</strong><span>自动推进</span></div>
            </div>
            <button className="primary wide" onClick={startExam}><Play size={18} /> 开始考试</button>
          </section>
        </main>
      </Shell>
    );
  }

  return (
    <Shell title={mode.label} back="/" onBack={isFullExam ? exitPractice : undefined} actions={isFullExam ? <button className="secondary compact-button" onClick={exitPractice}>退出</button> : null}>
      <main className="practice-page">
        <div className="practice-progress">
          <span>{partLabel(step.type)} · {index + 1}/{flowSteps.length}</span>
          <div><i style={{ width: `${((index + 1) / flowSteps.length) * 100}%` }} /></div>
        </div>
        <div className="examiner-focus">
          <ExaminerAvatar examiner={examiner} speaking={examinerSpeaking} />
          <strong>{examiner.name}</strong>
          <small>{examinerSpeaking ? '考官正在读题' : isFullExam ? '完整模拟进行中' : phase === 'prep' ? '请准备话题卡' : '考官正在聆听'}</small>
        </div>

        <QuestionCard
          step={step}
          phase={phase}
          prepLeft={prepLeft}
          examinerCue={examinerCue}
          speechError={speechError}
          strictExam={isFullExam}
          questionVisible={questionVisible}
          onToggleQuestion={() => setQuestionVisible((value) => !value)}
          onReplayQuestion={() => {
            const hooks = {
              onStart: () => {
                setSpeechError('');
                setExaminerSpeaking(true);
              },
              onEnd: () => setExaminerSpeaking(false),
              onError: (message) => {
                setExaminerSpeaking(false);
                setSpeechError(message);
              },
            };
            if (isFullExam) speakExamText(buildExamSpeechText(step, previousStep, phase, index), examiner, hooks);
            else speakQuestion(step, examiner, hooks);
          }}
          onSkipPrep={() => setPhase('answer')}
        />

        {phase === 'answer' && (
          <>
            <SpeechBox key={`${index}-${step.question}`} value={answer} onChange={setAnswer} lang="en-US" showTranscript={settings.showAnswerDuringPractice} />
            <div className="practice-controls">
              <span><Clock3 size={16} /> {isFullExam ? '考试计时' : '剩余'} {formatTime(answerLeft)}</span>
              <button className="primary" onClick={() => saveAndMove()} disabled={!isFullExam && !answer.trim()}>
                {isLast ? <Check size={18} /> : <Play size={18} />}
                {isFullExam ? (isLast ? '结束考试' : '我答完了') : (isLast ? '完成并生成报告' : '保存，下一题')}
              </button>
            </div>
          </>
        )}
      </main>
    </Shell>
  );
}

function QuestionCard({ step, phase, prepLeft, examinerCue, speechError, strictExam, questionVisible, onToggleQuestion, onReplayQuestion, onSkipPrep }) {
  const canHideQuestion = step.type === 'part1' || step.type === 'part3';
  return (
    <section className={`question-card ${canHideQuestion && !questionVisible ? 'question-card-hidden' : ''}`}>
      {examinerCue && <div className="examiner-cue"><Volume2 size={16} /><span>{examinerCue}</span></div>}
      {speechError && <div className="inline-warning"><strong>考官朗读不可用</strong><span>{speechError}</span></div>}
      <div className="question-card-head">
        <span className="pill">{partLabel(step.type)}</span>
        {canHideQuestion && (
          <div className="question-actions">
            <button className="ghost-button" onClick={onReplayQuestion}>
              <Volume2 size={16} />
              重播题目
            </button>
            <button className="ghost-button" onClick={onToggleQuestion}>
              {questionVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              {questionVisible ? '隐藏题目' : '显示题目'}
            </button>
          </div>
        )}
        {!canHideQuestion && (
          <button className="ghost-button" onClick={onReplayQuestion}>
            <Volume2 size={16} />
            重播题目
          </button>
        )}
      </div>
      {(!canHideQuestion || questionVisible) ? (
        <div className="question-content">
          <h1>{step.question}</h1>
          <p>{step.zh}</p>
          {step.prompts?.length > 0 && (
            <ul className="prompt-list">
              {step.prompts.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
        </div>
      ) : (
        <div className="hidden-question-state">
          <EyeOff size={22} />
          <strong>题目已隐藏</strong>
          <span>请根据考官语音完成回答，模拟真实口语考试环境。</span>
        </div>
      )}
      {phase === 'prep' && (
        <div className="prep-panel">
          <strong>{formatTime(prepLeft)}</strong>
          <span>准备时间</span>
          {!strictExam && <button className="secondary" onClick={onSkipPrep}>准备完成，开始作答</button>}
          {strictExam && <small>正式模拟中请等待准备时间结束。</small>}
        </div>
      )}
    </section>
  );
}

function ExaminerAvatar({ examiner, speaking = false }) {
  return (
    <div className={`speaking-avatar ${speaking ? 'speaking' : ''}`}>
      <span className="avatar large image-avatar" style={{ background: examiner.color }}>
        <img src={examiner.image} alt={`${examiner.name} examiner portrait`} />
      </span>
      <span className="voice-wave" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function SpeechBox({ value, onChange, lang, showTranscript = true }) {
  const recognitionRef = useRef(null);
  const finalTextRef = useRef('');
  const resultSegmentsRef = useRef([]);
  const manualStopRef = useRef(false);
  const [supported] = useState(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => recognitionRef.current?.stop(), []);

  async function start() {
    if (!supported) {
      setError('当前浏览器不支持 SpeechRecognition，请使用下方文本输入。');
      return;
    }
    window.speechSynthesis?.cancel();
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      setError('麦克风权限不可用。请在浏览器地址栏允许麦克风权限后重试。');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    manualStopRef.current = false;
    finalTextRef.current = value ? `${value.trim()} ` : '';
    resultSegmentsRef.current = value ? [value.trim()] : [];
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setListening(true);
      setError('');
    };
    recognition.onresult = (event) => {
      const segments = [...resultSegmentsRef.current];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        segments[i] = transcript.trim();
      }
      resultSegmentsRef.current = segments;
      const text = segments.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      finalTextRef.current = text ? `${text} ` : '';
      onChange(text);
    };
    recognition.onerror = (event) => {
      if (event.error === 'aborted' && manualStopRef.current) return;
      setError(getSpeechErrorMessage(event.error));
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setError('语音识别启动失败。请刷新页面，确认没有其他标签页正在占用麦克风。');
    }
  }

  function stop() {
    manualStopRef.current = true;
    recognitionRef.current?.stop();
    setListening(false);
  }

  return (
    <section className="speech-box">
      <div className="speech-toolbar">
        <button className={`mic-button ${listening ? 'recording' : ''}`} onClick={listening ? stop : start}>
          {listening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        <div>
          <strong>{listening ? '正在识别英文回答...' : '点击麦克风开始转写'}</strong>
          <small>{supported ? '支持 Chrome / Edge / Safari，结果可手动修改。' : '请使用文本输入兜底。'}</small>
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}
      {showTranscript ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="你的语音转写或手动输入会显示在这里..."
        />
      ) : (
        <div className="transcript-hidden-box">
          <EyeOff size={20} />
          <strong>已隐藏我的回答</strong>
          <span>系统仍会保存语音转文字用于报告；你在练习中不会看到实时文本。</span>
        </div>
      )}
    </section>
  );
}

function Report({ id }) {
  const [session, setSession] = useState(() => getSession(id));
  const [busy, setBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const autoScoreStartedRef = useRef(false);
  useEffect(() => {
    if (!session || session.aiProvider || autoScoreStartedRef.current) return;
    autoScoreStartedRef.current = true;
    runDeepSeek();
  }, [session?.id]);

  if (!session) {
    return <Shell title="练习报告" back="/"><main className="page empty">没有找到这次练习记录。</main></Shell>;
  }
  const scores = normalizeReportScores(session);

  async function runDeepSeek() {
    setBusy(true);
    setAiError('');
    try {
      const result = await scoreWithDeepSeek(session);
      const updated = { ...session, scores: result, aiProvider: 'deepseek' };
      saveSession(updated);
      setSession(updated);
    } catch (error) {
      setAiError(error.message || 'AI 反馈生成失败，请稍后重试。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="练习报告" back="/" actions={<button className="icon-link" onClick={() => navigate(`/share?id=${session.id}`)}><Share2 size={20} /></button>}>
      <main className="page">
        <section className="report-hero">
          <Check size={28} />
          <h1>练习完成</h1>
          <p>{session.examiner.name} · {session.mode.label} · {formatDate(session.createdAt)}</p>
        </section>
        <div className="score-grid">
          <div className="score-card"><span>综合评分</span><strong>{scores.overall.toFixed(1)}</strong><small>{session.aiProvider ? 'DeepSeek 评分' : '本地启发式评分'}</small></div>
          <div className="score-card"><span>雅思参考</span><strong>Band {Math.round(scores.overall)}</strong><small>非官方估算</small></div>
        </div>
        <section className="coach-summary">
          <span>总评</span>
          <strong>{scores.summary}</strong>
          <p>{scores.comment}</p>
        </section>
        {session.examMeta?.strictTiming && (
          <section className="exam-meta-panel">
            <div>
              <span>完整模拟</span>
              <strong>严格计时已开启</strong>
            </div>
            <div>
              <span>自动结束</span>
              <strong>{session.examMeta.autoEnded || 0} 题</strong>
            </div>
            <div>
              <span>考官追问</span>
              <strong>{session.examMeta.followUps || 0} 次</strong>
            </div>
          </section>
        )}
        <section className="panel">
          <h2>评分详情</h2>
          {scoreRows(scores).map((row) => <ScoreRow key={row.label} {...row} />)}
        </section>
        <section className="feedback-grid">
          <div className="panel">
            <h2>本次亮点</h2>
            <InsightList items={scores.strengths} fallback="完成了一次有效练习。" />
          </div>
          <div className="panel">
            <h2>主要问题</h2>
            <InsightList items={scores.weaknesses} fallback="建议继续增加回答细节。" />
          </div>
        </section>
        <section className="next-goal">
          <span>下次练习目标</span>
          <strong>{scores.nextGoal}</strong>
        </section>
        <section className="panel">
          <div className="panel-title-row">
            <h2>逐题回看</h2>
            <button className="secondary" disabled={busy} onClick={runDeepSeek}>
              <Sparkles size={17} /> {busy ? '正在请求 DeepSeek...' : session.aiProvider ? '重新生成 DeepSeek 反馈' : '用 DeepSeek 生成精细反馈'}
            </button>
          </div>
          {aiError && (
            <div className="inline-error">
              <strong>AI 反馈暂时不可用</strong>
              <span>{aiError}</span>
            </div>
          )}
          <div className="qa-list">
            {session.responses.map((item, idx) => (
              <article key={item.id}>
                <strong>Question {idx + 1}: {item.question}</strong>
                <small>{item.zh}</small>
                <p>{item.answer || '未记录回答'}</p>
                <QuestionFeedback feedback={scores.questionFeedback[idx]} />
              </article>
            ))}
          </div>
        </section>
      </main>
    </Shell>
  );
}

function InsightList({ items, fallback }) {
  const list = items?.length ? items : [fallback];
  return (
    <ul className="insight-list">
      {list.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

function QuestionFeedback({ feedback }) {
  if (!feedback) return null;
  return (
    <div className="question-feedback">
      <span>{feedback.issue}</span>
      <p>{feedback.suggestion}</p>
      {feedback.usefulPhrases?.length > 0 && (
        <div className="phrase-row">
          {feedback.usefulPhrases.map((phrase) => <code key={phrase}>{phrase}</code>)}
        </div>
      )}
    </div>
  );
}

function HistoryPage() {
  const [sessions, setSessions] = useState(getSessions());
  function clearAll() {
    if (!window.confirm('确定清空所有练习记录吗？')) return;
    clearSessions();
    setSessions([]);
  }
  return (
    <Shell title="历史记录" back="/" actions={<button className="icon-link danger" onClick={clearAll}><Trash2 size={19} /></button>}>
      <main className="page">
        {sessions.length === 0 && <div className="empty">暂无练习记录。</div>}
        <div className="history-list">
          {sessions.map((item) => (
            <button key={item.id} className="history-card" onClick={() => navigate(`/report?id=${item.id}`)}>
              <span>{formatDate(item.createdAt)} · {item.mode.label}</span>
              <small>考官：{item.examiner.name} · {item.responses.length} 题</small>
              <strong>AI {item.scores.overall.toFixed(1)}</strong>
            </button>
          ))}
        </div>
      </main>
    </Shell>
  );
}

function QuestionBank() {
  const fileInputRef = useRef(null);
  const [bank, setBank] = useState(() => getStoredQuestionBank(defaultQuestionBank));
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [openTopicId, setOpenTopicId] = useState('');
  const [manageOpen, setManageOpen] = useState(false);
  const [p1Draft, setP1Draft] = useState({ categoryId: '', en: '', zh: '' });
  const [topicDraft, setTopicDraft] = useState({ categoryId: '', title_en: '', title_zh: '', prompts: '', follow_ups: '' });
  const part1Categories = bank.part1.categories;
  const part23Categories = bank.part2_3.categories;
  const bankStats = getBankStats(bank);
  const categoryOptions = [
    ...part1Categories.map((cat) => ({ value: `p1:${cat.id}`, label: `Part 1 · ${cat.name_en || cat.name_zh}` })),
    ...part23Categories.map((cat) => ({ value: `p23:${cat.id}`, label: `Part 2&3 · ${cat.name_en || cat.name_zh}` })),
  ];
  const filteredP1Categories = filterPart1Categories(part1Categories, query, categoryFilter);
  const filteredPart23Categories = filterPart23Categories(part23Categories, query, categoryFilter);

  function commit(nextBank) {
    setBank(nextBank);
    saveQuestionBank(nextBank);
  }

  function addP1Question(event) {
    event.preventDefault();
    if (!p1Draft.categoryId || !p1Draft.en.trim()) return;
    const next = cloneBank(bank);
    const category = next.part1.categories.find((cat) => cat.id === p1Draft.categoryId);
    category.questions.push({ en: p1Draft.en.trim(), zh: p1Draft.zh.trim() });
    commit(next);
    setP1Draft({ ...p1Draft, en: '', zh: '' });
  }

  function updateP1Question(categoryId, questionIndex, patch) {
    const next = cloneBank(bank);
    Object.assign(next.part1.categories.find((cat) => cat.id === categoryId).questions[questionIndex], patch);
    commit(next);
  }

  function deleteP1Question(categoryId, questionIndex) {
    if (!window.confirm('确定删除这道 Part 1 题目吗？')) return;
    const next = cloneBank(bank);
    next.part1.categories.find((cat) => cat.id === categoryId).questions.splice(questionIndex, 1);
    commit(next);
  }

  function addTopic(event) {
    event.preventDefault();
    if (!topicDraft.categoryId || !topicDraft.title_en.trim()) return;
    const next = cloneBank(bank);
    const category = next.part2_3.categories.find((cat) => cat.id === topicDraft.categoryId);
    const topic = {
      id: createId('topic'),
      category_id: category.id,
      title_en: topicDraft.title_en.trim(),
      title_zh: topicDraft.title_zh.trim(),
      prompts: splitLines(topicDraft.prompts),
      follow_ups: splitLines(topicDraft.follow_ups).map((en) => ({ en, zh: '' })),
      p3_match: 'manual',
    };
    category.topic_cards.unshift(topic);
    commit(next);
    setTopicDraft({ ...topicDraft, title_en: '', title_zh: '', prompts: '', follow_ups: '' });
    setOpenTopicId(topic.id);
  }

  function updateTopic(categoryId, topicId, patch) {
    const next = cloneBank(bank);
    const topic = next.part2_3.categories.find((cat) => cat.id === categoryId).topic_cards.find((item) => item.id === topicId);
    Object.assign(topic, patch);
    commit(next);
  }

  function deleteTopic(categoryId, topicId) {
    if (!window.confirm('确定删除这张 Part 2 题卡吗？')) return;
    const next = cloneBank(bank);
    const category = next.part2_3.categories.find((cat) => cat.id === categoryId);
    category.topic_cards = category.topic_cards.filter((item) => item.id !== topicId);
    commit(next);
  }

  function exportBank() {
    const blob = new Blob([JSON.stringify(bank, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `speakeasy-question-bank-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function downloadImportTemplate() {
    const blob = new Blob([JSON.stringify(getQuestionBankImportTemplate(), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'speakeasy-question-bank-template.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function importBank(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      validateQuestionBank(imported);
      commit(imported);
      setOpenTopicId('');
      alert('题库导入成功。');
    } catch (error) {
      alert(`导入失败：${error.message}`);
    } finally {
      event.target.value = '';
    }
  }

  function restoreDefaultBank() {
    if (!window.confirm('确定恢复到内置真实题库吗？当前本地编辑会被覆盖。')) return;
    resetQuestionBank();
    setBank(cloneBank(defaultQuestionBank));
    setOpenTopicId('');
  }

  return (
    <Shell title="题库管理" back="/">
      <main className="page">
        <section className="panel compact">
          <div className="panel-title-row">
            <div>
              <h2>当前题库</h2>
              <p>浏览当前 IELTS 口语题库，按分类或关键词查找 Part 1、Part 2 和 Part 3 题目。</p>
              <small>Part 1：{bankStats.part1} 题 · Part 2：{bankStats.part2} 张题卡 · Part 3：{bankStats.part3} 题</small>
            </div>
            <button className="secondary compact-button" onClick={() => setManageOpen((value) => !value)}>
              {manageOpen ? '收起管理工具' : '管理题库'}
            </button>
          </div>
        </section>

        {manageOpen && (
          <section className="panel compact manage-panel">
            <div className="panel-title-row">
              <div>
                <h2>管理工具</h2>
                <p>导入、导出和编辑会保存在本机浏览器中，后续练习会直接使用当前版本。</p>
              </div>
              <div className="toolbar-actions">
                <button className="secondary" onClick={downloadImportTemplate}>下载导入模板</button>
                <button className="secondary" onClick={exportBank}>导出 JSON</button>
                <button className="secondary" onClick={() => fileInputRef.current?.click()}>导入 JSON</button>
                <button className="ghost-button danger" onClick={restoreDefaultBank}>恢复内置</button>
                <input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json" onChange={importBank} />
              </div>
            </div>
          </section>
        )}

        <section className="bank-tools">
          <input value={query} placeholder="搜索英文题目、中文题名、分类..." onChange={(e) => setQuery(e.target.value)} />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">全部分类</option>
            {categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </section>

        <div className="tabs">
          {['all', 'part1', 'part23'].map((item) => (
            <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item === 'all' ? '全部' : item === 'part1' ? 'Part 1' : 'Part 2 & 3'}</button>
          ))}
        </div>

        {manageOpen && (tab === 'all' || tab === 'part1') && (
          <section className="panel compact bank-editor">
            <h2>新增 Part 1 题目</h2>
            <form className="bank-form" onSubmit={addP1Question}>
              <select value={p1Draft.categoryId} onChange={(e) => setP1Draft({ ...p1Draft, categoryId: e.target.value })}>
                <option value="">选择分类</option>
                {part1Categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name_en}</option>)}
              </select>
              <input value={p1Draft.en} placeholder="英文题目" onChange={(e) => setP1Draft({ ...p1Draft, en: e.target.value })} />
              <input value={p1Draft.zh} placeholder="中文备注，可选" onChange={(e) => setP1Draft({ ...p1Draft, zh: e.target.value })} />
              <button className="primary" type="submit">添加</button>
            </form>
          </section>
        )}

        {(tab === 'all' || tab === 'part1') && filteredP1Categories.map((cat) => (
          <section className="panel compact" key={cat.id}>
            <h2>{cat.name_en}</h2>
            {manageOpen ? (
              <div className="editable-list">
                {cat.questions.map((q) => (
                  <article className="editable-row" key={`${cat.id}-${q.originalIndex}`}>
                    <input value={q.en} onChange={(e) => updateP1Question(cat.id, q.originalIndex, { en: e.target.value })} />
                    <input value={q.zh || ''} placeholder="中文备注" onChange={(e) => updateP1Question(cat.id, q.originalIndex, { zh: e.target.value })} />
                    <button className="icon-link danger" onClick={() => deleteP1Question(cat.id, q.originalIndex)}><Trash2 size={18} /></button>
                  </article>
                ))}
              </div>
            ) : (
              <ul className="browse-question-list">
                {cat.questions.map((q) => <li key={`${cat.id}-${q.originalIndex}`}>{q.en}</li>)}
              </ul>
            )}
          </section>
        ))}

        {manageOpen && (tab === 'all' || tab === 'part23') && (
          <section className="panel compact bank-editor">
            <h2>新增 Part 2 题卡</h2>
            <form className="bank-form topic-form" onSubmit={addTopic}>
              <select value={topicDraft.categoryId} onChange={(e) => setTopicDraft({ ...topicDraft, categoryId: e.target.value })}>
                <option value="">选择分类</option>
                {part23Categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name_zh || cat.name_en}</option>)}
              </select>
              <input value={topicDraft.title_en} placeholder="Describe..." onChange={(e) => setTopicDraft({ ...topicDraft, title_en: e.target.value })} />
              <input value={topicDraft.title_zh} placeholder="中文题名" onChange={(e) => setTopicDraft({ ...topicDraft, title_zh: e.target.value })} />
              <textarea value={topicDraft.prompts} placeholder="P2 prompts，每行一条" onChange={(e) => setTopicDraft({ ...topicDraft, prompts: e.target.value })} />
              <textarea value={topicDraft.follow_ups} placeholder="P3 追问，每行一条" onChange={(e) => setTopicDraft({ ...topicDraft, follow_ups: e.target.value })} />
              <button className="primary" type="submit">添加题卡</button>
            </form>
          </section>
        )}

        {(tab === 'all' || tab === 'part23') && filteredPart23Categories.map((cat) => cat.topic_cards.map((topic) => {
          const isOpen = openTopicId === topic.id;
          return (
            <section className={`panel compact topic-bank-card ${isOpen ? 'open' : ''}`} key={topic.id}>
              <button className="topic-bank-summary" onClick={() => setOpenTopicId(isOpen ? '' : topic.id)}>
                <span>
                  <strong>{topic.title_en}</strong>
                  <small>{cat.name_zh} · {topic.title_zh}</small>
                </span>
                <b>{isOpen ? '收起' : '查看完整题卡'}</b>
              </button>
              {isOpen && (
                <div className="topic-bank-detail">
                  {manageOpen ? (
                    <>
                      <label>英文题卡
                        <input value={topic.title_en} onChange={(e) => updateTopic(cat.id, topic.id, { title_en: e.target.value })} />
                      </label>
                      <label>中文题名
                        <input value={topic.title_zh || ''} onChange={(e) => updateTopic(cat.id, topic.id, { title_zh: e.target.value })} />
                      </label>
                      <label>Part 2 prompts
                        <textarea value={(topic.prompts || []).join('\n')} onChange={(e) => updateTopic(cat.id, topic.id, { prompts: splitLines(e.target.value) })} />
                      </label>
                      <div className="followup-block">
                        <strong>Part 3 追问</strong>
                        <textarea value={(topic.follow_ups || []).map((item) => item.en).join('\n')} onChange={(e) => updateTopic(cat.id, topic.id, { follow_ups: splitLines(e.target.value).map((en) => ({ en, zh: '' })) })} />
                      </div>
                      <button className="secondary danger-text" onClick={() => deleteTopic(cat.id, topic.id)}>删除题卡</button>
                    </>
                  ) : (
                    <>
                      <h3>{topic.title_en}</h3>
                      <p>{topic.title_zh}</p>
                      {topic.prompts?.length > 0 && (
                        <ul className="prompt-list">
                          {topic.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
                        </ul>
                      )}
                      <div className="followup-block">
                        <strong>Part 3 追问</strong>
                        {topic.follow_ups?.length > 0 ? (
                          <ol>
                            {topic.follow_ups.map((item) => <li key={item.en}>{item.en}</li>)}
                          </ol>
                        ) : (
                          <p>该题暂无明确关联追问，练习时会从同类 P3 题池抽题。</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          );
        }))}
        {filteredP1Categories.length === 0 && filteredPart23Categories.length === 0 && <div className="empty">没有匹配的题目。</div>}
      </main>
    </Shell>
  );
}

function cloneBank(bank) {
  return JSON.parse(JSON.stringify(bank));
}

function splitLines(text) {
  return text.split('\n').map((item) => item.trim()).filter(Boolean);
}

function getBankStats(bank) {
  return {
    part1: bank.part1.categories.reduce((n, cat) => n + cat.questions.length, 0),
    part2: bank.part2_3.categories.reduce((n, cat) => n + cat.topic_cards.length, 0),
    part3: bank.part3_topics.reduce((n, topic) => n + topic.questions.length, 0),
  };
}

function filterPart1Categories(categories, query, categoryFilter) {
  const text = query.trim().toLowerCase();
  return categories
    .filter((cat) => categoryFilter === 'all' || categoryFilter === `p1:${cat.id}`)
    .map((cat) => ({
      ...cat,
      questions: cat.questions
        .map((question, originalIndex) => ({ ...question, originalIndex }))
        .filter((question) => matchesText([cat.name_en, cat.name_zh, question.en, question.zh], text)),
    }))
    .filter((cat) => cat.questions.length > 0 || (!text && categoryFilter !== 'all'));
}

function filterPart23Categories(categories, query, categoryFilter) {
  const text = query.trim().toLowerCase();
  return categories
    .filter((cat) => categoryFilter === 'all' || categoryFilter === `p23:${cat.id}`)
    .map((cat) => ({
      ...cat,
      topic_cards: cat.topic_cards.filter((topic) => matchesText([
        cat.name_en,
        cat.name_zh,
        topic.title_en,
        topic.title_zh,
        ...(topic.prompts || []),
        ...(topic.follow_ups || []).map((item) => item.en),
      ], text)),
    }))
    .filter((cat) => cat.topic_cards.length > 0 || (!text && categoryFilter !== 'all'));
}

function matchesText(values, query) {
  if (!query) return true;
  return values.some((value) => String(value || '').toLowerCase().includes(query));
}

function validateQuestionBank(bank) {
  if (!bank?.part1?.categories || !bank?.part2_3?.categories || !bank?.part3_topics) {
    throw new Error('JSON 结构不符合 SpeakEasy 题库格式。');
  }
  if (!Array.isArray(bank.part1.categories) || !Array.isArray(bank.part2_3.categories) || !Array.isArray(bank.part3_topics)) {
    throw new Error('题库分类必须是数组。');
  }
}

function getQuestionBankImportTemplate() {
  return {
    source: {
      note: 'SpeakEasy 题库导入模板。保留字段名，替换示例内容即可。',
    },
    part1: {
      categories: [
        {
          id: 'p1-sample',
          name_en: 'Work or Study',
          name_zh: '工作或学习',
          questions: [
            { en: 'Do you work or are you a student?', zh: '你工作还是学习？' },
            { en: 'What do you like most about your work or studies?', zh: '你最喜欢工作或学习中的哪一点？' },
          ],
        },
      ],
    },
    part2_3: {
      categories: [
        {
          id: 'experience',
          name_en: 'Experience',
          name_zh: '经历类',
          topic_cards: [
            {
              id: 'p2-sample',
              category_id: 'experience',
              title_zh: '一次有趣的经历',
              title_en: 'Describe an interesting experience you had',
              prompts: [
                'What happened',
                'Where it happened',
                'Who was with you',
                'And explain why it was interesting',
              ],
              follow_ups: [
                { en: 'Why do people remember special experiences for a long time?', zh: '' },
                { en: 'Do young people and older people enjoy the same kinds of experiences?', zh: '' },
              ],
              p3_match: 'manual',
            },
          ],
        },
      ],
    },
    part3_topics: [
      {
        id: 'p3-sample',
        category_id: 'experience',
        title_zh: '经历类兜底追问',
        questions: [
          { en: 'Why are some experiences more memorable than others?', zh: '' },
          { en: 'How can people learn from difficult experiences?', zh: '' },
        ],
      },
    ],
  };
}

function SettingsPage() {
  const [settings, setLocalSettings] = useState(getSettings());
  const [developerOpen, setDeveloperOpen] = useState(false);
  function update(patch) {
    const next = { ...settings, ...patch };
    setLocalSettings(next);
    saveSettings(next);
  }
  return (
    <Shell title="设置" back="/">
      <main className="page">
        <section className="panel settings-panel">
          <h2>语音设置</h2>
          <label>Part 2 准备时间
            <select value={settings.part2PrepSeconds} onChange={(e) => update({ part2PrepSeconds: Number(e.target.value) })}>
              <option value={60}>60秒</option><option value={90}>90秒</option><option value={120}>120秒</option>
            </select>
          </label>
          <label>自动结束等待
            <select value={settings.autoStopSeconds} onChange={(e) => update({ autoStopSeconds: Number(e.target.value) })}>
              {[0, 5, 10, 15, 20, 25, 30].map((n) => <option value={n} key={n}>{n}秒</option>)}
            </select>
          </label>
          <label className="toggle-row">显示我的回答
            <input
              type="checkbox"
              checked={settings.showAnswerDuringPractice}
              onChange={(e) => update({ showAnswerDuringPractice: e.target.checked })}
            />
          </label>
          <p className="hint">关闭后，练习时不会显示实时语音转文字，但报告页仍会保存和展示转写结果。</p>
        </section>
        <section className="panel settings-panel">
          <div className="panel-title-row">
            <div>
              <h2>开发者设置</h2>
              <p className="hint">线上版本已通过后端代理连接 AI 评分，普通练习无需修改这里。</p>
            </div>
            <button className="secondary compact-button" onClick={() => setDeveloperOpen((value) => !value)}>
              {developerOpen ? '收起' : '展开'}
            </button>
          </div>
          {developerOpen && (
            <div className="developer-settings">
              <label>后端代理地址
                <input value={settings.apiBaseUrl} placeholder="留空表示同源 /api/score" onChange={(e) => update({ apiBaseUrl: e.target.value })} />
              </label>
              <label>API Key
                <input value={settings.deepseekApiKey} type="password" placeholder="sk-..." onChange={(e) => update({ deepseekApiKey: e.target.value })} />
              </label>
              <label>模型
                <input value={settings.deepseekModel} onChange={(e) => update({ deepseekModel: e.target.value })} />
              </label>
              <p className="hint">这些选项仅用于本地开发或临时代理测试。公开部署请在 Cloudflare 环境变量中配置 DeepSeek Key。</p>
            </div>
          )}
        </section>
        <section className="developer-credit">
          <span>开发者 afterDDL 的 GitHub：</span>
          <a href="https://github.com/afterDDL" target="_blank" rel="noreferrer">https://github.com/afterDDL</a>
        </section>
      </main>
    </Shell>
  );
}

function SharePage({ id }) {
  const session = getSession(id);
  if (!session) return <Shell title="分享预览" back="/"><main className="page empty">没有可分享的报告。</main></Shell>;

  function download() {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#F2F2F7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    roundedRect(ctx, 90, 90, 720, 960, 32, '#FFFFFF');
    ctx.fillStyle = '#1D1D1F';
    ctx.font = 'bold 44px Arial';
    ctx.fillText('SpeakEasy', 150, 180);
    ctx.font = '28px Arial';
    ctx.fillText(session.mode.label, 150, 255);
    ctx.fillText(session.examiner.name, 650, 255);
    ctx.strokeStyle = '#E5E5EA';
    ctx.beginPath(); ctx.moveTo(150, 305); ctx.lineTo(750, 305); ctx.stroke();
    ctx.fillStyle = '#8E8E93';
    ctx.font = '24px Arial';
    ctx.fillText('AI建议评分', 150, 380);
    ctx.fillText('雅思参考', 570, 380);
    ctx.fillStyle = '#007AFF';
    ctx.font = 'bold 78px Arial';
    ctx.fillText(session.scores.overall.toFixed(1), 150, 470);
    ctx.fillStyle = '#1D1D1F';
    ctx.font = 'bold 52px Arial';
    ctx.fillText(`Band ${Math.round(session.scores.overall)}`, 570, 465);
    ctx.fillStyle = '#636366';
    ctx.font = '24px Arial';
    wrapText(ctx, session.scores.comment, 150, 570, 600, 36);
    ctx.fillStyle = '#8E8E93';
    ctx.font = '22px Arial';
    ctx.fillText(formatDate(session.createdAt), 150, 890);
    ctx.fillStyle = '#1D1D1F';
    ctx.font = 'bold 26px Arial';
    ctx.fillText('雅思口语 AI 陪练', 150, 955);
    const link = document.createElement('a');
    link.download = `speakeasy-${session.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <Shell title="分享预览" back={`/report?id=${session.id}`}>
      <main className="share-page">
        <section className="share-card">
          <div className="share-row"><strong>{session.mode.label}</strong><span>{session.examiner.name}</span></div>
          <div className="share-score"><div><span>AI建议评分</span><strong>{session.scores.overall.toFixed(1)}</strong></div><div><span>雅思参考</span><strong>Band {Math.round(session.scores.overall)}</strong></div></div>
          <p>{formatDate(session.createdAt)}</p>
          <b>雅思口语 AI 陪练</b>
        </section>
        <button className="primary" onClick={download}><Download size={18} /> 生成并下载图片</button>
      </main>
    </Shell>
  );
}

function ScoreRow({ label, value }) {
  const safeValue = Number(value) || 0;
  return <div className="score-row"><span>{label}</span><div><i style={{ width: `${(safeValue / 9) * 100}%` }} /></div><b>{safeValue.toFixed(1)}</b></div>;
}

function scoreRows(scores) {
  const criteria = scores.criteria || {};
  return [
    { label: '流利度', value: criteria.fluency?.score ?? scores.fluency },
    { label: '词汇', value: criteria.lexical?.score ?? scores.lexical },
    { label: '语法', value: criteria.grammar?.score ?? scores.grammar },
    { label: '发音', value: criteria.pronunciation?.score ?? scores.pronunciation },
  ];
}

function normalizeReportScores(session) {
  const scores = session.scores || {};
  const criteria = scores.criteria || {};
  const fluency = Number(criteria.fluency?.score ?? scores.fluency ?? 0);
  const lexical = Number(criteria.lexical?.score ?? scores.lexical ?? 0);
  const grammar = Number(criteria.grammar?.score ?? scores.grammar ?? 0);
  const pronunciation = Number(criteria.pronunciation?.score ?? scores.pronunciation ?? 0);
  const overall = Number(scores.overall || ((fluency + lexical + grammar + pronunciation) / 4) || 0);
  const fallback = buildLocalScores(session.responses || []);
  return {
    ...fallback,
    ...scores,
    fluency,
    lexical,
    grammar,
    pronunciation,
    overall,
    criteria: {
      ...fallback.criteria,
      ...criteria,
    },
    strengths: scores.strengths?.length ? scores.strengths : fallback.strengths,
    weaknesses: scores.weaknesses?.length ? scores.weaknesses : fallback.weaknesses,
    nextGoal: scores.nextGoal || fallback.nextGoal,
    questionFeedback: scores.questionFeedback?.length ? scores.questionFeedback : fallback.questionFeedback,
  };
}

function getExaminerCue(step, previousStep, phase, index, examiner) {
  if (!step) return '';
  if (step.isFollowUp) return 'I would like to ask one quick follow-up.';
  if (index === 0) return `Good morning. My name is ${examiner?.name || 'your examiner'}. First, let's talk about your work or studies.`;
  if (step.type === 'part1' && previousStep?.type === 'part1' && previousStep.topicId !== step.topicId) {
    return `Now let's talk about ${step.topicName || 'another topic'}.`;
  }
  if (previousStep?.type !== step.type && step.type === 'part2') {
    return 'Now I am going to give you a topic. You have one minute to prepare.';
  }
  if (previousStep?.type !== step.type && step.type === 'part3') {
    return 'We have been talking about this topic. I would like to discuss it more generally now.';
  }
  if (phase === 'prep') return 'You may make notes during your preparation time.';
  return 'Please answer the question.';
}

function buildExamSpeechText(step, previousStep, phase, index) {
  if (!step) return '';
  const lines = [];
  if (index === 0) {
    lines.push('Good morning. My name is your examiner. This is your IELTS Speaking test. Can you tell me your full name, please?');
    lines.push('Thank you. First, let us talk about your work or studies.');
  } else if (step.isFollowUp) {
    lines.push('I would like to ask one quick follow-up.');
  } else if (step.type === 'part1' && previousStep?.type === 'part1' && previousStep.topicId !== step.topicId) {
    lines.push(`Now let us talk about ${step.topicName || 'another topic'}.`);
  } else if (previousStep?.type !== step.type && step.type === 'part2') {
    lines.push('Now I am going to give you a topic. You will have one minute to prepare, and then you should speak for one to two minutes. You can make notes if you wish.');
  } else if (previousStep?.type !== step.type && step.type === 'part3') {
    lines.push('We have been talking about this topic. I would like to discuss it more generally now.');
  }

  if (step.type === 'part2' && phase === 'prep') {
    lines.push(buildQuestionSpeechText(step));
    lines.push('Your preparation time starts now.');
  } else {
    lines.push(step.question);
  }
  return lines.join(' ');
}

function speakExamText(text, examiner, hooks = {}) {
  return speakText(text, examiner, 0.9, hooks);
}

function speakQuestion(step, examiner, hooks = {}) {
  if (!step) return false;
  return speakText(buildQuestionSpeechText(step), examiner, 0.92, hooks);
}

function speakText(text, examiner, rate, hooks = {}) {
  if (!text) return false;
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    hooks.onError?.('当前浏览器不支持语音合成。请使用 Chrome / Edge 打开；如果是在应用内置浏览器或微信内置浏览器中访问，考官朗读可能不可用。');
    return false;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume?.();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.pitch = examiner?.id === 'kenji' ? 0.92 : 1;
  utterance.onstart = hooks.onStart || null;
  utterance.onend = hooks.onEnd || null;
  utterance.onerror = () => hooks.onError?.('浏览器中断了本次朗读。请点“重播题目”再试，或换用 Chrome / Edge。');
  const preferred = pickEnglishVoice();
  if (preferred) utterance.voice = preferred;
  window.setTimeout(() => {
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.resume?.();
  }, 80);
  return true;
}

function pickEnglishVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.lang?.toLowerCase().startsWith('en') && /natural|online|aria|jenny|guy|susan|google|microsoft/i.test(voice.name))
    || voices.find((voice) => voice.lang?.toLowerCase().startsWith('en'));
}

function buildQuestionSpeechText(step) {
  if (step.type === 'part2') {
    const prompts = step.prompts?.length ? ` You should say: ${step.prompts.join('. ')}.` : '';
    return `${step.question}.${prompts}`;
  }
  return step.question;
}

function getSpeechErrorMessage(error) {
  if (error === 'network') {
    return '语音识别异常：network。Edge/Chrome 的浏览器语音识别依赖在线服务，当前网络没有连上识别服务。可以换 Chrome/Edge、切换网络或代理后重试；也可以先用文本输入兜底。';
  }
  if (error === 'aborted') {
    return '语音识别异常：aborted。浏览器中断了本次识别，常见原因是麦克风被重新授权、页面失焦、网络识别服务不可用或启动太快。请等题目朗读结束后再点麦克风重试。';
  }
  if (error === 'not-allowed') {
    return '麦克风权限被拒绝。请在浏览器地址栏允许麦克风权限后重试。';
  }
  if (error === 'no-speech') {
    return '没有检测到语音。请靠近麦克风，或稍微提高音量后重试。';
  }
  return `语音识别异常：${error}`;
}

function getAnswerSeconds(step, settings, strictExam = false) {
  if (!step) return 0;
  if (step.isFollowUp) return 35;
  if (step.type === 'part2') return settings.part2AnswerSeconds;
  if (!strictExam) return 60;
  return step.type === 'part3' ? 60 : 35;
}

function getNextFollowUpStep(step, answer, responses, modeId) {
  if (!step || step.isFollowUp) return null;
  const canAskPart2FollowUp = modeId === 'full' || modeId === 'part2';
  const canAskPart3FollowUp = modeId === 'full' || modeId === 'part3';
  if (canAskPart2FollowUp && step.type === 'part2' && !hasFollowUp(responses, 'part2', 'part2-story') && Math.random() < 0.4) {
    return buildFollowUpStep(step, answer, 'part2-story');
  }
  if (canAskPart3FollowUp && step.type === 'part3' && countWords(answer) >= 6 && countFollowUps(responses, 'part3') < 2) {
    return buildFollowUpStep(step, answer, 'part3-content');
  }
  if (modeId === 'full' && shouldAskShortAnswerFollowUp(step, answer) && (step.type !== 'part3' || countFollowUps(responses, 'part3') < 2)) {
    return buildFollowUpStep(step, answer, 'short-answer');
  }
  return null;
}

function hasFollowUp(responses, part, kind) {
  return responses.some((item) => item.part === part && item.isFollowUp && item.followUpKind === kind);
}

function countFollowUps(responses, part) {
  return responses.filter((item) => item.part === part && item.isFollowUp).length;
}

function shouldAskShortAnswerFollowUp(step, answer) {
  if (!step || step.isFollowUp || step.type === 'part2') return false;
  const words = countWords(answer);
  if (step.type === 'part1') return words > 0 && words < 14;
  if (step.type === 'part3') return words > 0 && words < 28;
  return false;
}

function buildFollowUpStep(step, answer, kind) {
  const question = getFollowUpQuestion(step, answer, kind);
  return {
    id: createId('followup'),
    type: step.type,
    question,
    zh: kind === 'part2-story'
      ? 'Part 2 结束后的简短追问'
      : '考官根据你的回答内容追加的追问',
    prompts: [],
    isFollowUp: true,
    followUpKind: kind,
  };
}

function getFollowUpQuestion(step, answer, kind) {
  if (kind === 'part2-story') {
    return 'Have you ever told this story to anyone else?';
  }
  if (kind === 'part3-content') {
    return buildContentAwarePart3Question(answer);
  }
  return step.type === 'part3'
    ? 'Can you explain your answer in more detail?'
    : 'Why do you think so?';
}

function buildContentAwarePart3Question(answer) {
  const text = answer.toLowerCase();
  const rules = [
    { pattern: /\b(parent|parents|family|mother|father|children|kid|kids)\b/, question: 'How does family influence this issue in real life?' },
    { pattern: /\b(friend|friends|classmate|colleague|people around me)\b/, question: 'Do people around you usually have the same opinion about this?' },
    { pattern: /\b(work|job|career|company|office|employee|employer)\b/, question: 'How might this affect people in the workplace?' },
    { pattern: /\b(school|student|teacher|university|education|study|studying)\b/, question: 'What role should schools play in this situation?' },
    { pattern: /\b(technology|internet|online|phone|app|social media|ai|computer)\b/, question: 'Has technology made this problem better or worse?' },
    { pattern: /\b(money|cost|expensive|cheap|price|income|rich|poor)\b/, question: 'How important is money when people make this kind of decision?' },
    { pattern: /\b(government|law|policy|public|society)\b/, question: 'Do you think the government should be involved in this issue?' },
    { pattern: /\b(old|older|young|younger|generation|teenager|adult)\b/, question: 'Do younger and older people see this differently?' },
    { pattern: /\b(city|cities|countryside|rural|urban|community)\b/, question: 'Would this be different in a big city and in a smaller community?' },
    { pattern: /\b(past|before|nowadays|future|change|changed)\b/, question: 'How do you think this may change in the future?' },
  ];
  return rules.find((rule) => rule.pattern.test(text))?.question
    || 'What is the main reason behind the opinion you just gave?';
}

function buildFullExamMeta(responses) {
  const autoEnded = responses.filter((item) => item.autoEnded).length;
  const followUps = responses.filter((item) => item.isFollowUp).length;
  return {
    strictTiming: true,
    autoEnded,
    followUps,
    partBreakdown: ['part1', 'part2', 'part3'].map((part) => ({
      part,
      answered: responses.filter((item) => item.part === part && item.answer?.trim()).length,
      total: responses.filter((item) => item.part === part).length,
    })),
  };
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function partLabel(type) {
  return { part1: 'Part 1', part2: 'Part 2', part3: 'Part 3' }[type] || type;
}

function formatTime(total) {
  const min = Math.floor(total / 60);
  const sec = String(total % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

function formatDate(iso) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function roundedRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split('');
  let line = '';
  for (let i = 0; i < words.length; i += 1) {
    const testLine = line + words[i];
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

createRoot(document.getElementById('root')).render(<App />);
