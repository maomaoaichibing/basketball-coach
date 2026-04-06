// JWT 统一配置
// 所有认证相关模块统一使用此配置，禁止在各路由中硬编码
// 注意：Next.js Edge Runtime (middleware) 不支持 jsonwebtoken/crypto
// 所以 middleware 只检查 cookie 存在性，不验证 JWT 签名

export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'basketball-coach-dev-secret-2024',
  expiresIn: '7d',
  refreshExpiresIn: '30d',
} as const;
