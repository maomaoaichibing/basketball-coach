module.exports = {
  apps: [{
    name: 'basketball-coach',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/basketball-coach',
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_MINIMAX_API_KEY: 'sk-api-ilarjY5OhSL5CxnkGGWS_sOulfklBPh-bbg5iJbo-y6rANSVBmK3wpLaJE1MCDblVN1ksn5qfgTdcKbGCwOcjLMVwT4IwHhORkbqDTVFN1YvirCjCobmboc'
    }
  }]
}
