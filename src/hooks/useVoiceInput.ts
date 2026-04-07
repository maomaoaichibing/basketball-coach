'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInterface {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface VoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

// 检查浏览器支持
const isSpeechRecognitionSupported = () => {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
};

export function useVoiceInput(): VoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const isSupported = isSpeechRecognitionSupported();

  useEffect(() => {
    if (!isSupported) {
      setError('当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器');
      return;
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInterface })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInterface })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('SpeechRecognition API not available');
      return;
    }

    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'zh-CN';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
      setInterimTranscript(interimTranscript);
    };

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('语音识别错误:', event.error);
      if (event.error === 'no-speech') {
        setError('没有检测到语音，请重试');
      } else if (event.error === 'not-allowed') {
        setError('请允许麦克风权限');
      } else {
        setError(`语音识别错误: ${event.error}`);
      }
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('浏览器不支持语音识别');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');

    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error('启动语音识别失败:', e);
      setError('启动语音识别失败');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    error,
  };
}

// 解析语音命令
export function parseVoiceCommand(transcript: string): {
  action: 'create_plan' | 'query_player' | 'attendance' | 'unknown';
  playerName?: string;
  ageGroup?: string;
  skills?: string[];
  raw: string;
} {
  const text = transcript.trim();

  // 匹配"今天XXX来上课"或"XXX来上课"
  const attendanceMatch = text.match(/今天?(.+?)来?上课/);
  if (attendanceMatch) {
    const playerName = attendanceMatch[1].replace(/谁|同学|学员/g, '').trim();
    return {
      action: 'attendance',
      playerName,
      raw: text,
    };
  }

  // 匹配"生成教案"
  const planMatch = text.match(/生成教案|创建教案|帮我?生成教案/);
  if (planMatch) {
    // 提取年龄段
    const ageGroupMatch = text.match(/U\d+|U系列|U[6-9]/i);
    const ageGroup = ageGroupMatch ? ageGroupMatch[0].toUpperCase() : undefined;

    // 提取技能关键词
    const skills: string[] = [];
    const skillKeywords = ['运球', '传球', '投篮', '防守', '体能', '战术'];
    skillKeywords.forEach((skill) => {
      if (text.includes(skill)) {
        skills.push(skill);
      }
    });

    return {
      action: 'create_plan',
      ageGroup,
      skills: skills.length > 0 ? skills : undefined,
      raw: text,
    };
  }

  return {
    action: 'unknown',
    raw: text,
  };
}
