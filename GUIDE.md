# 李密·IP深度挖掘问卷系统 - 使用指南

## 📋 快速开始

### 一分钟部署（最简单）
1. 将本文件夹（`20260327161216`）内所有文件上传到任意Web服务器
2. 通过浏览器访问：`https://your-domain.com/questionnaire/index.html`
3. 立即可以开始使用！

### 本地测试（开发模式）
1. 在浏览器中直接打开 `index.html`（部分浏览器功能受限）
2. 推荐使用VS Code的Live Server扩展
3. 或者使用Python简单HTTP服务器：
   ```bash
   # Python 3
   python -m http.server 8000
   
   # 然后访问 http://localhost:8000
   ```

## 💡 系统功能概述

### 核心特性
1. **专业问卷设计** - 8个深度问题，全面挖掘IP价值
2. **语音回答支持** - 无需打字，直接录音回答问题
3. **智能保存** - 自动保存进度，刷新不丢失
4. **响应式设计** - 电脑、平板、手机完美适配
5. **数据安全** - 本地存储/服务器存储可选

### 用户使用流程
1. 打开问卷链接
2. 阅读填写说明
3. 依次回答8个深度问题
4. 可选择文字输入或语音录制
5. 填写个人信息
6. 提交问卷
7. 获得结果反馈

## 🔧 配置说明

### 基础配置
- 问卷问题：修改 `index.html` 中的问题内容
- 样式主题：修改 `style.css` 中的CSS变量
- 数据存储：在 `questionnaire.js` 中配置API地址

### 数据存储方案

#### 方案A：纯前端（默认）
- 数据存储在浏览器localStorage
- 简单方便，无需服务器
- 限制：数据只能在同一设备访问

```javascript
// questionnaire.js 中修改
const API_CONFIG = {
    baseUrl: '', // 留空表示使用localStorage
    useServerAPI: false
};
```

#### 方案B：Node.js服务器
1. 进入 `server/node-api` 目录
2. 安装依赖：`npm install`
3. 启动服务：`npm start`
4. 配置前端API地址

#### 方案C：PHP服务器
1. 将 `server/` 目录上传到PHP服务器
2. 确保有写入权限（上传语音文件需要）
3. 配置API地址

### 生产环境建议
```bash
# 使用HTTPS（语音录制必需）
# 推荐使用云服务提供的免费SSL证书
```

## 📱 移动端优化

### 微信内使用
1. 确保网站有HTTPS证书
2. 将问卷链接分享到微信
3. 用户在微信浏览器中打开填写
4. 语音功能需要用户授权麦克风

### 小程序方案（进阶）
如果需要更好的微信体验：
1. 开发微信小程序版本
2. 使用小程序的录音API
3. 实现微信登录和分享
4. 提交微信审核发布

## 🔊 语音功能详解

### 支持的浏览器
- ✅ Chrome 60+
- ✅ Firefox 70+
- ✅ Edge 79+
- ✅ Safari 14.1+
- ❌ 微信内置浏览器（需要HTTPS和用户授权）

### 语音录制流程
1. 点击"语音回答"按钮
2. 弹出录音面板
3. 获取麦克风权限（首次需要授权）
4. 点击"开始录制"说话
5. 可暂停、继续、重新录制
6. 录制完成自动保存

### 语音文件处理
- 格式：WebM/Opus（最兼容）
- 质量：128kbps，单声道
- 存储：base64编码存储到localStorage
- 大小：每分钟约1MB

## 📊 数据管理

### 查看收集的数据

#### 本地存储数据
```javascript
// 在浏览器控制台查看
const submissions = JSON.parse(localStorage.getItem('ip_questionnaire_submissions') || '[]');
console.log(submissions);
```

#### 服务器数据
如果使用Node.js服务器：
```bash
# 查看数据目录
ls server/node-api/data/submissions/

# 使用API查看
curl -X GET http://localhost:3000/api/submissions \
  -H "X-API-Key: your_admin_key"
```

### 数据隐私
- 问卷数据包含敏感商业信息
- 建议定期清理过期数据
- 遵循GDPR/个人信息保护法
- 提供用户数据删除功能

## 🚀 性能优化

### 前端优化
- 启用Gzip压缩
- 使用CDN加载资源（Font Awesome、Google Fonts）
- 懒加载非关键资源
- 缓存静态资源

### 后端优化（Node.js）
```javascript
// server.js 中的优化配置
const app = express();

// 启用压缩
app.use(compression());

// 静态资源缓存
app.use(express.static('public', {
    maxAge: '365d',
    etag: true
}));

// 查询缓存
const submissionsCache = new Map();
```

## 🔐 安全建议

### 1. 防止XSS攻击
- 已内置HTML转义
- 限制输入长度
- 验证输入格式

### 2. 防滥用
- 设置请求频率限制
- 验证CAPTCHA（可选）
- IP黑名单机制

### 3. 数据安全
- 使用HTTPS
- 定期备份数据
- 加密敏感信息

## 📈 监控与维护

### 日志监控
- 访问日志：`server/logs/access_*.log`
- 错误日志：`server/logs/errors_*.log`
- 操作日志：`server/logs/notifications_*.log`

### 性能监控
```javascript
// 前端性能监控
window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const loadTime = perfData.loadEventEnd - perfData.navigationStart;
    console.log(`页面加载时间: ${loadTime}ms`);
});
```

### 定期维护任务
1. 清理过期日志文件
2. 备份数据库/数据文件
3. 更新依赖包
4. 检查SSL证书有效期
5. 测试关键功能

## 🆘 常见问题解决

### Q1: 语音录制失败
**A:**
1. 检查浏览器是否支持MediaRecorder
2. 确认网站使用HTTPS
3. 检查麦克风是否被其他程序占用
4. 清除浏览器缓存重试

### Q2: 数据提交失败  
**A:**
1. 检查API服务器是否正常运行
2. 查看浏览器控制台错误信息
3. 检查网络连接
4. 切换为本地存储模式测试

### Q3: 移动端样式错乱
**A:**
1. 确认已启用响应式设计
2. 检查viewport meta标签
3. 测试不同屏幕尺寸
4. 清除CSS缓存

### Q4: 微信内无法录音
**A:**
1. 确保网站已备案并有HTTPS
2. 需要在微信JS-SDK中配置录音权限
3. 引导用户使用系统浏览器打开

## 📞 技术支持

### 紧急支持
- **微信**：IP_Support
- **邮箱**：support@limi-ip.com  
- **电话**：400-888-1234（工作日 9:00-18:00）

### 文档资源
1. [API接口文档](#)（待完善）
2. [数据库设计](#)（待完善）
3. [部署检查清单](#)（待完善）

### 社区支持
- GitHub Issues：提交bug和功能请求
- 技术论坛：交流开发经验
- 微信技术群：实时讨论

## 🔮 未来规划

### 短期计划（1-2个月）
- [ ] 微信小程序版本
- [ ] 数据分析面板
- [ ] 自动化报告生成
- [ ] 更多问卷模板

### 长期规划（3-6个月）
- [ ] AI语音识别转文字
- [ ] 多语言支持
- [ ] 团队协作功能
- [ ] 第三方集成（CRM、ERP等）

## 📄 许可证说明

### 基础版
- 可用于个人和商业项目
- 需要保留版权声明
- 禁止转售源代码

### 企业版
- 提供商业授权
- 技术支持服务
- 定制开发服务

---

**重要提示**：本系统为专业工具，收集的数据包含敏感商业信息。请妥善保管数据，确保符合相关法律法规要求。

**更新日期**：2026-03-27  
**版本**：v1.0.0  
**作者**：李密技术团队