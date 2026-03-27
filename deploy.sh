#!/bin/bash

echo "========================================"
echo "  李密·IP深度挖掘问卷系统 - 部署助手"
echo "========================================"
echo

echo "[1/4] 检查文件完整性..."
if [ ! -f "index.html" ]; then
    echo "❌ 错误: 找不到 index.html 文件"
    exit 1
fi

if [ ! -f "vercel.json" ]; then
    echo "⚠️  提示: 缺少 Vercel 配置文件，已为您创建"
    cat > vercel.json << EOF
{
  "version": 2,
  "name": "ip-questionnaire",
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
EOF
    echo "✅ 已创建 vercel.json 配置文件"
fi

echo
echo "[2/4] GitHub 部署准备..."
echo "您的 GitHub 仓库: https://github.com/qiulibinxm-stack/wenjuan"
echo
echo "如果您还没有上传文件，请执行以下命令："
echo "git init"
echo "git add ."
echo "git commit -m '初始化: 李密IP问卷系统'"
echo "git branch -M main"
echo "git remote add origin https://github.com/qiulibinxm-stack/wenjuan.git"
echo "git push -u origin main"
echo

echo "[3/4] Vercel 部署步骤..."
echo "1. 访问 https://vercel.com"
echo "2. 使用 GitHub 账号登录"
echo "3. 点击 'New Project'"
echo "4. 选择您的仓库"
echo "5. 点击 'Deploy'"
echo

echo "[4/4] 测试链接生成..."
echo "部署完成后，您可以访问："
echo "https://wenjuan.vercel.app"
echo
echo "配置邮箱接收数据："
echo "https://wenjuan.vercel.app/?email=您的邮箱@example.com"
echo
echo "测试链接："
echo "https://wenjuan.vercel.app/?email=test@example.com&title=测试问卷"
echo

echo "========================================"
echo "             快速开始指南"
echo "========================================"
echo
echo "1. 测试问卷流程"
echo "   打开测试链接 → 填写问卷 → 提交 → 检查邮箱"
echo
echo "2. 微信内测试"
echo "   将链接分享到微信 → 打开 → 测试语音功能"
echo
echo "3. 正式使用"
echo "   为每个客户生成专属链接："
echo "   https://wenjuan.vercel.app/?email=客户邮箱&title=专属问卷"
echo
echo "4. 数据接收"
echo "   - 问卷数据会自动发送到指定邮箱"
echo "   - 同时在本地方备份存储"
echo "   - 可通过后台导出所有数据"
echo

read -p "是否要查看文件结构？(y/n): " view_files
if [ "$view_files" = "y" ] || [ "$view_files" = "Y" ]; then
    echo
    echo "📁 项目文件结构："
    find . -type f -name "*.html" -o -name "*.js" -o -name "*.css" -o -name "*.json" -o -name "*.md" | sort
    echo
    echo "总文件数："$(find . -type f -name "*.html" -o -name "*.js" -o -name "*.css" -o -name "*.json" -o -name "*.md" | wc -l)
fi

echo
echo "🎯 下一步行动建议："
echo "1. 立即上传文件到 GitHub"
echo "2. 部署到 Vercel 获得可访问链接"
echo "3. 小范围测试（1-3人）"
echo "4. 根据反馈微调"
echo "5. 正式推广使用"
echo

echo "✅ 部署助手运行完成！"
echo "如有问题，请参考 README.md 和 DEPLOYMENT.md 文档"