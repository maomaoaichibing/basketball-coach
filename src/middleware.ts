import { NextRequest, NextResponse } from 'next/server';

// 公开路由（无需登录即可访问）
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/version',
  '/parent',
  '/parent/checkin',
  '/parent/leave',
  '/parent/messages',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过 API 路由（API 鉴权在各路由内自行处理）
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 跳过静态资源和 _next 内部路由
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // 检查是否为公开路由
  const isPublic = PUBLIC_PATHS.some(
    path => pathname === path || (path !== '/' && pathname.startsWith(path + '/'))
  );

  if (isPublic) {
    return NextResponse.next();
  }

  // 受保护路由：检查 auth_token cookie 是否存在
  // 注意：Edge Runtime 不支持 Node.js crypto，无法在 middleware 中验证 JWT
  // 所以这里只检查 cookie 存在性，真正的 token 验证在客户端和 API 路由中进行
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
