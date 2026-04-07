'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface VoiceRecognitionReturn {
  isRecording: boolean;
  isRecognizing: boolean; // 正在云端识别
  isSupported: boolean;
  transcript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>; // 返回识别文字
  reset: () => void;
}

/**
 * 云端语音识别 Hook
 *
 * 原理：
 * 1. 用 Web Audio API 获取麦克风流，降采样到 16kHz
 * 2. 将 Float32 PCM 转为 Int16 PCM
 * 3. 录音停止后，将 PCM 数据 base64 编码
 * 4. 上传到 /api/voice/recognize 调用腾讯云一句话识别
 *
 * 优势：不受浏览器安全上下文限制，HTTP+IP 也能用
 */
export function useCloudVoiceRecognition(): VoiceRecognitionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Int16Array[]>([]);
  const startTimeRef = useRef<number>(0);

  // 检查浏览器支持
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSupported(false);
      return;
    }
    const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setIsSupported(supported);
    if (!supported) {
      setError('当前浏览器不支持录音功能，请使用 Chrome、Edge 或 Safari');
    }
  }, []);

  // Float32 -> Int16 PCM 转换
  const float32ToInt16 = useCallback((float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }, []);

  // 降采样：从原始采样率到 16kHz
  const downsample = useCallback((buffer: Float32Array, inputSampleRate: number): Float32Array => {
    if (inputSampleRate === 16000) return buffer;

    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const idx = i * ratio;
      const low = Math.floor(idx);
      const high = Math.min(low + 1, buffer.length - 1);
      const frac = idx - low;
      result[i] = buffer[low] * (1 - frac) + buffer[high] * frac;
    }

    return result;
  }, []);

  // 清理录音资源
  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
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
      setTranscript('');
      pcmChunksRef.current = [];
      startTimeRef.current = Date.now();

      // 获取麦克风流
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // 创建 AudioContext
      const audioContext = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const inputSampleRate = audioContext.sampleRate;

      // 创建 ScriptProcessorNode 用于实时采集 PCM 数据
      // bufferSize 4096，单声道
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const float32Data = e.inputBuffer.getChannelData(0);
        // 降采样到 16kHz
        const downsampled = downsample(float32Data, inputSampleRate);
        // 转为 Int16
        const int16Data = float32ToInt16(downsampled);
        pcmChunksRef.current.push(int16Data);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setIsRecording(true);

      console.log('[Voice] 开始录音, 采样率:', inputSampleRate, '→ 16kHz');
    } catch (err) {
      console.error('[Voice] 开始录音失败:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('请允许使用麦克风权限');
        } else if (err.name === 'NotFoundError') {
          setError('未找到麦克风设备');
        } else {
          setError(`录音失败: ${err.message}`);
        }
      } else {
        setError('录音失败，请重试');
      }
      cleanup();
    }
  }, [isSupported, downsample, float32ToInt16, cleanup]);

  // 停止录音并识别
  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      // 停止录音
      setIsRecording(false);

      // 收集所有 PCM 数据
      const pcmChunks = pcmChunksRef.current;
      if (pcmChunks.length === 0) {
        setError('没有录制到音频');
        cleanup();
        resolve(null);
        return;
      }

      // 合并所有 chunk
      const totalLength = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const mergedPcm = new Int16Array(totalLength);
      let offset = 0;
      for (const chunk of pcmChunks) {
        mergedPcm.set(chunk, offset);
        offset += chunk.length;
      }

      // 清理录音资源
      cleanup();

      // 计算音频时长（ms）
      const duration = Math.round((mergedPcm.length / 16000) * 1000);
      console.log(`[Voice] 录音完成, PCM数据: ${mergedPcm.length} samples, 时长: ${duration}ms`);

      if (duration < 200) {
        setError('录音时间太短，请说久一点');
        resolve(null);
        return;
      }

      // Int16 -> ArrayBuffer -> Base64
      const pcmBuffer = mergedPcm.buffer;
      const base64Audio = arrayBufferToBase64(pcmBuffer);

      // 调用后端识别 API
      setIsRecognizing(true);
      setError(null);

      fetch('/api/voice/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          audioLength: duration,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setIsRecognizing(false);
          if (data.success && data.text) {
            console.log(`[Voice] 识别结果: "${data.text}"`);
            setTranscript(data.text);
            resolve(data.text);
          } else {
            const errMsg = data.error || '未识别到语音内容';
            setError(errMsg);
            resolve(null);
          }
        })
        .catch((err) => {
          setIsRecognizing(false);
          console.error('[Voice] 识别请求失败:', err);
          setError('语音识别请求失败，请检查网络');
          resolve(null);
        });
    });
  }, [cleanup]);

  // 重置状态
  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
    setIsRecording(false);
    setIsRecognizing(false);
    pcmChunksRef.current = [];
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    isRecognizing,
    isSupported,
    transcript,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}

// ArrayBuffer → Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
