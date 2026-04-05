import { NextRequest, NextResponse } from 'next/server';

// 腾讯云一句话识别配置
const TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID || '';
const TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY || '';

// 语音识别服务配置
const ASR_CONFIG = {
  region: 'ap-beijing',
  engineModelType: '16k_zh',
  sourceType: 1, // 1 = 语音数据(base64)
  voiceFormat: 1, // 1 = pcm
  filterDirty: 1,
  filterModal: 1,
  filterPunc: 0, // 保留标点，方便解析
  convertNumMode: 1, // 数字转换
};

/**
 * 生成腾讯云 API 签名
 * 使用 TC3-HMAC-SHA256 签名方法
 */
async function generateSignature(
  payload: string,
  timestamp: number,
  action: string
): Promise<{ authorization: string; headers: Record<string, string> }> {
  const service = 'aai';
  const host = 'aai.tencentcloudapi.com';
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];

  const credentialScope = `${date}/${service}/tc3_request`;

  // Step 1: 拼接规范请求串
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const contentType = 'application/json; charset=utf-8';
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';

  const hashedPayload = await hashSHA256(payload);
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join('\n');

  // Step 2: 拼接待签名字符串
  const algorithm = 'TC3-HMAC-SHA256';
  const hashedCanonicalRequest = await hashSHA256(canonicalRequest);
  const stringToSign = [algorithm, String(timestamp), credentialScope, hashedCanonicalRequest].join(
    '\n'
  );

  // Step 3: 计算签名
  const secretDate = hmacSHA256(`TC3${TENCENT_SECRET_KEY}`, date);
  const secretService = hmacSHA256(secretDate, service);
  const secretSigning = hmacSHA256(secretService, 'tc3_request');
  const signature = hmacSHA256Hex(secretSigning, stringToSign);

  // Step 4: 拼接 Authorization
  const authorization = `${algorithm} Credential=${TENCENT_SECRET_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    authorization,
    headers: {
      'Content-Type': contentType,
      Host: host,
      'X-TC-Action': action,
      'X-TC-Version': '2019-06-14',
      'X-TC-Region': ASR_CONFIG.region,
      'X-TC-Timestamp': String(timestamp),
      Authorization: authorization,
    },
  };
}

// SHA-256 hash
async function hashSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// HMAC-SHA256 (returns ArrayBuffer)
function hmacSHA256(key: string | ArrayBuffer, data: string): ArrayBuffer {
  const encoder = new TextEncoder();
  let keyBuffer: ArrayBuffer;

  if (typeof key === 'string') {
    keyBuffer = encoder.encode(key).buffer as ArrayBuffer;
  } else {
    keyBuffer = key;
  }

  const dataBuffer = encoder.encode(data);

  // Node.js crypto
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', Buffer.from(keyBuffer));
  hmac.update(Buffer.from(dataBuffer));
  return hmac.digest().buffer as ArrayBuffer;
}

// HMAC-SHA256 Hex string
function hmacSHA256Hex(key: ArrayBuffer, data: string): string {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', Buffer.from(key));
  hmac.update(data);
  return hmac.digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    // 检查配置
    if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: '语音识别服务未配置，请在 .env 中设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY',
        },
        { status: 500 }
      );
    }

    // 获取请求体 - 期望 base64 编码的 PCM 音频数据
    const body = await request.json();
    const { audio, audioLength } = body;

    if (!audio) {
      return NextResponse.json({ success: false, error: '缺少音频数据' }, { status: 400 });
    }

    // 检查音频长度（一句话识别限制 60 秒）
    if (audioLength && audioLength > 60000) {
      return NextResponse.json(
        { success: false, error: '音频过长，请控制在60秒以内' },
        { status: 400 }
      );
    }

    console.log(`[ASR] 收到音频数据，长度: ${audioLength || '未知'}ms`);

    // 构建请求参数
    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
      ProjectId: 0,
      SubServiceType: 2, // 2 = 一句话识别
      EngSerViceType: ASR_CONFIG.engineModelType,
      SourceType: ASR_CONFIG.sourceType,
      VoiceFormat: ASR_CONFIG.voiceFormat,
      UsrAudioKey: `basketball-coach-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      Data: audio,
      DataLen: Buffer.from(audio, 'base64').length,
      FilterDirty: ASR_CONFIG.filterDirty,
      FilterModal: ASR_CONFIG.filterModal,
      FilterPunc: ASR_CONFIG.filterPunc,
      ConvertNumMode: ASR_CONFIG.convertNumMode,
    };

    const payload = JSON.stringify(params);
    const { authorization, headers } = await generateSignature(
      payload,
      timestamp,
      'SentenceRecognition'
    );

    // 调用腾讯云 API
    console.log('[ASR] 调用腾讯云一句话识别...');
    const response = await fetch(`https://${headers['Host']}`, {
      method: 'POST',
      headers: {
        ...headers,
        Authorization: authorization,
      },
      body: payload,
    });

    const result = await response.json();

    console.log('[ASR] 腾讯云响应:', JSON.stringify(result).slice(0, 200));

    if (result.Response && result.Response.Error) {
      console.error('[ASR] 错误:', result.Response.Error);
      return NextResponse.json(
        {
          success: false,
          error: `语音识别失败: ${result.Response.Error.Message}`,
        },
        { status: 500 }
      );
    }

    if (result.Response && result.Response.Result) {
      const text = result.Response.Result.trim();
      const duration = result.Response.AudioDuration || 0;

      console.log(`[ASR] 识别成功: "${text}" (${duration}ms)`);

      return NextResponse.json({
        success: true,
        text,
        duration,
      });
    }

    return NextResponse.json({ success: false, error: '未识别到语音内容' }, { status: 400 });
  } catch (error) {
    console.error('[ASR] 异常:', error);
    return NextResponse.json(
      {
        success: false,
        error: `语音识别服务异常: ${error instanceof Error ? error.message : '未知错误'}`,
      },
      { status: 500 }
    );
  }
}

// 健康检查
export async function GET() {
  const configured = !!(TENCENT_SECRET_ID && TENCENT_SECRET_KEY);
  return NextResponse.json({
    service: 'voice-recognition',
    status: configured ? 'ready' : 'not_configured',
    message: configured
      ? '腾讯云语音识别已配置'
      : '请设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY 环境变量',
  });
}
