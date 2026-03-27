@echo off
echo ========================================
echo   李密·IP深度挖掘问卷系统 - 一键部署工具
echo ========================================
echo.

echo [1/4] 检查文件完整性...
if not exist "index.html" (
    echo 错误: 找不到 index.html 文件
    pause
    exit /b 1
)

if not exist "vercel.json" (
    echo 提示: 缺少 Vercel 配置文件，已为您创建
    echo {"version": 2,"name": "ip-questionnaire","builds": [{"src": "index.html","use": "@vercel/static"}],"routes": [{"src": "/(.*)","dest": "/$1"}]} > vercel.json
)

echo.
echo [2/4] 准备上传到 GitHub...
echo 请确保您已经:
echo 1. 登录 GitHub: https://github.com
echo 2. 创建仓库: https://github.com/qiulibinxm-stack/wenjuan
echo 3. 获得仓库访问权限
echo.

echo 如果您还没有操作，请按以下步骤:
echo 步骤 1: 访问 https://github.com/qiulibinxm-stack/wenjuan
echo 步骤 2: 如果有"上传文件"按钮，点击上传所有文件
echo 步骤 3: 或者使用 Git 命令行上传
echo.

echo [3/4] 部署到 Vercel...
echo 手动部署步骤:
echo 1. 访问 https://vercel.com
echo 2. 登录您的账号
echo 3. 点击 "New Project"
echo 4. 导入您的 GitHub 仓库
echo 5. 点击 "Deploy"
echo.

echo [4/4] 生成测试链接...
echo 部署完成后，您将获得类似以下的链接:
echo https://wenjuan.vercel.app
echo.
echo 要配置邮箱接收数据，请使用以下格式的链接:
echo https://wenjuan.vercel.app/?email=您的邮箱@example.com
echo.

echo 快速测试链接 (复制到浏览器):
echo https://wenjuan.vercel.app/?email=test@example.com^&title=测试问卷
echo.

echo ========================================
echo   部署完成！请执行以下步骤：
echo 1. 将所有文件上传到 GitHub 仓库
echo 2. 在 Vercel 导入仓库完成部署
echo 3. 测试问卷功能
echo 4. 分享给客户使用
echo ========================================
echo.

pause