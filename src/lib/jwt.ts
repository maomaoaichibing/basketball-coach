// JWT 统一配置
// 所有认证相关模块统一使用此配置，禁止在各路由中硬编码
// 注意：Next.js Edge Runtime (middleware) 不支持 jsonwebtoken/crypto
// 所以 middleware 只检查 cookie 存在性，不验证 JWT 签名

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET 环境变量未设置或长度不足32位。请在 .env 文件中设置一个安全的密钥（至少32位随机字符串）。'
    );
  }
  return secret;
}

// 延迟获取 secret，避免启动时就崩溃（仅在首次验证时检查）
let _cachedSecret: string | null = null;

export const JWT_CONFIG = {
  get secret() {
    if (!_cachedSecret) {
      _cachedSecret = getJwtSecret();
    }
    return _cachedSecret;
  },
  expiresIn: '7d',
  refreshExpiresIn: '7d', // 从30天缩短到7天，更安全
} as const;
