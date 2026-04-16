import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始创建测试账号...');

  // 测试账号数据
  const testAccounts = [
    {
      name: '测试教练',
      email: 'test@basketball-coach.com',
      phone: '13800138001',
      password: '123456',
      role: 'coach',
      status: 'active',
    },
    {
      name: '管理员',
      email: 'admin@basketball-coach.com',
      phone: '13800138002',
      password: '123456',
      role: 'admin',
      status: 'active',
    },
    {
      name: '教练',
      email: 'coach@basketball-coach.com',
      phone: '13800138003',
      password: '123456',
      role: 'coach',
      status: 'active',
    },
  ];

  for (const account of testAccounts) {
    // 检查是否已存在
    const existing = await prisma.coach.findFirst({
      where: { OR: [{ email: account.email }, { phone: account.phone }] },
    });

    if (existing) {
      console.log(`✅ 账号 ${account.email} 已存在，跳过`);
      continue;
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(account.password, 10);

    // 创建账号
    const coach = await prisma.coach.create({
      data: {
        name: account.name,
        email: account.email,
        phone: account.phone,
        password: hashedPassword,
        role: account.role,
        status: account.status,
        mustChangePassword: false,
      },
    });

    console.log(`✅ 账号 ${account.email} 创建成功`);
  }

  console.log('🌱 测试账号创建完成！');
}

main()
  .catch((e) => {
    console.error('❌ 种子脚本执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
