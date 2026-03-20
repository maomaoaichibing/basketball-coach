module.exports = {
  apps: [{
    name: 'basketball-coach',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/basketball-coach',
    env: {
      NODE_ENV: 'production',
      // MiniMax API Key
      NEXT_PUBLIC_MINIMAX_API_KEY: 'sk-api-ilarjY5OhSL5CxnkGGWS_sOulfklBPh-bbg5iJbo-y6rANSVBmK3wpLaJE1MCDblVN1ksn5qfgTdcKbGCwOcjLMVwT4IwHhORkbqDTVFN1YvirCjCobmboc',
      // 外部教案数据路径（热更新，无需重新部署）
      LESSON_PLANS_PATH: '/var/www/basketball-coach-data/lesson_plans_raw.json'
    }
  }]
}
