/**
 * PM2 部署配置
 *
 * 安全说明：
 * API Key 等敏感信息必须通过服务器环境变量配置，不能硬编码在此文件
 *
 * 服务器配置步骤：
 * 1. 在 /var/www/basketball-coach/ 目录创建 .env 文件
 * 2. 添加: NEXT_PUBLIC_MINIMAX_API_KEY=your_api_key_here
 * 3. 或者在 /etc/environment 中设置环境变量
 */

module.exports = {
  apps: [{
    name: 'basketball-coach',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/basketball-coach',
    env_production: {
      NODE_ENV: 'production',
      // API Key 必须通过服务器环境变量配置
      // 在服务器上执行: echo "NEXT_PUBLIC_MINIMAX_API_KEY=your_key" >> ~/.bashrc && source ~/.bashrc
    },
    env: {
      NODE_ENV: 'production',
      // 本地开发使用 .env.local 中的配置
    }
  }]
}
