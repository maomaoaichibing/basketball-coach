#!/bin/bash

# 部署前检查脚本
# 验证数据库schema一致性、代码状态、环境配置等

set -e

echo "🚀 开始部署前检查..."
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 错误计数
ERRORS=0

# 检查函数
check_error() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

check_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. 检查Git状态
echo ""
echo "📦 检查Git状态..."
if [ -n "$(git status --porcelain)" ]; then
    check_warning "存在未提交的更改："
    git status --short
    read -p "是否继续部署？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        check_error "部署已取消"
        exit 1
    fi
else
    check_success "工作区干净，无未提交更改"
fi

# 2. 检查是否有未推送的提交
echo ""
echo "🌐 检查远程同步状态..."
if [ -n "$(git log origin/main..main 2>/dev/null)" ]; then
    check_warning "存在未推送的本地提交"
    echo "请执行: git push origin main"
else
    check_success "与远程仓库同步"
fi

# 3. 检查环境变量
echo ""
echo "🔧 检查环境变量..."
if [ ! -f ".env.production" ]; then
    check_warning ".env.production 文件不存在，将使用 .env"
else
    check_success ".env.production 文件存在"
    
    # 检查必要的环境变量
    required_vars=("DATABASE_URL" "NEXTAUTH_SECRET")
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env.production; then
            check_success "$var 已配置"
        else
            check_error "$var 未配置"
        fi
    done
fi

# 4. 检查Prisma schema一致性
echo ""
echo "🗄️  检查Prisma Schema..."

# 生成Prisma客户端
npx prisma generate > /dev/null 2>&1
check_success "Prisma客户端生成成功"

# 检查schema语法
if npx prisma validate > /dev/null 2>&1; then
    check_success "Prisma schema语法正确"
else
    check_error "Prisma schema语法错误"
fi

# 5. 检查数据库连接
echo ""
echo "🔗 检查数据库连接..."
if npx prisma db execute --stdin <<EOF > /dev/null 2>&1
SELECT 1;
EOF
    check_success "数据库连接正常"
else
    check_error "数据库连接失败，请检查DATABASE_URL"
fi

# 6. 检查是否有未执行的migration
echo ""
echo "🔄 检查Migration状态..."
pending_migrations=$(npx prisma migrate status 2>&1 | grep -c "have not been applied" || true)
if [ "$pending_migrations" -gt 0 ]; then
    check_warning "存在未执行的migration"
    echo "请执行: npx prisma migrate deploy"
else
    check_success "所有migration已执行"
fi

# 7. 检查TypeScript编译
echo ""
echo "📘 检查TypeScript类型..."
if npx tsc --noEmit > /dev/null 2>&1; then
    check_success "TypeScript编译通过"
else
    check_error "TypeScript编译失败"
    npx tsc --noEmit
fi

# 8. 检查ESLint
echo ""
echo "🔍 检查代码规范..."
if npm run lint 2>/dev/null; then
    check_success "ESLint检查通过"
else
    check_warning "ESLint检查失败，建议修复但可继续部署"
fi

# 9. 检查依赖包
echo ""
echo "📋 检查依赖包..."
if [ -d "node_modules" ]; then
    check_success "node_modules 存在"
else
    check_warning "node_modules 不存在，将执行 npm install"
fi

# 10. 检查构建能力
echo ""
echo "🏗️  测试构建过程..."
echo "运行: npm run build"
if npm run build > /tmp/build.log 2>&1; then
    check_success "构建测试通过"
    rm -f /tmp/build.log
else
    check_error "构建失败，请查看错误日志:"
    cat /tmp/build.log
fi

# 11. 检查PM2配置
echo ""
echo "⚙️  检查PM2配置..."
if [ -f "ecosystem.config.js" ]; then
    check_success "ecosystem.config.js 存在"
else
    check_warning "ecosystem.config.js 不存在，将使用默认配置"
fi

# 总结
echo ""
echo "================================"
echo "📊 检查完成"
echo "错误数: $ERRORS"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有检查通过，可以安全部署！${NC}"
    echo ""
    echo "执行以下命令开始部署:"
    echo "  ./scripts/deploy.sh"
    exit 0
else
    echo -e "${RED}❌ 发现 $ERRORS 个问题，请先修复再部署${NC}"
    echo ""
    echo "修复后重新运行:"
    echo "  ./scripts/pre-deploy-check.sh"
    exit 1
fi
