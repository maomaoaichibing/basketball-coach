'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface MediaRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  audioBlob: Blob | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
}

export function useMediaRecorder(): MediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 检查浏览器支持
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'MediaRecorder' in window;
    setIsSupported(supported);
    if (!supported) {
      setError('当前浏览器不支持录音功能，请使用 Chrome、Edge 或 Firefox');
    }
  }, []);

  // 开始录音
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('浏览器不支持录音功能');
      return;
    }

    try {
      setError(null);
      chunksRef.current = [];
      setAudioBlob(null);

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      // 创建 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      // 收集数据块
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // 录音停止时
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        // 停止所有 tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      // 开始录音
      mediaRecorder.start(100); // 每100ms收集一次数据
      setIsRecording(true);
    } catch (err) {
      console.error('开始录音失败:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('请允许使用麦克风权限');
        } else {
          setError(`录音失败: ${err.message}`);
        }
      } else {
        setError('录音失败，请重试');
      }
    }
  }, [isSupported]);

  // 停止录音
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  return {
    isRecording,
    isSupported,
    audioBlob,
    error,
    startRecording,
    stopRecording,
  };
}
