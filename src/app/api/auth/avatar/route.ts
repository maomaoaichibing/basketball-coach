import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// 头像保存目录
const AVATAR_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
// 最大文件大小：2MB
const MAX_SIZE = 2 * 1024 * 1024;
// 允许的图片类型
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.success) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: '请选择头像文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: '仅支持 JPG、PNG、GIF、WebP 格式' },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: '头像文件不能超过 2MB' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 生成文件名：{userId}_{timestamp}.{ext}
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${auth.user.id}_${Date.now()}.${ext}`;

    // 确保目录存在
    await mkdir(AVATAR_DIR, { recursive: true });

    // 写入文件
    const filePath = path.join(AVATAR_DIR, fileName);
    await writeFile(filePath, buffer);

    // 生成 URL 路径
    const avatarUrl = `/uploads/avatars/${fileName}`;

    // 更新数据库
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.coach.update({
      where: { id: auth.user.id },
      data: { avatar: avatarUrl },
    });

    return NextResponse.json({
      success: true,
      message: '头像上传成功',
      data: { avatar: avatarUrl },
    });
  } catch (error) {
    console.error('头像上传错误:', error);
    return NextResponse.json(
      { success: false, message: '上传失败，请重试' },
      { status: 500 }
    );
  }
}
