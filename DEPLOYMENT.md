# 李密·IP深度挖掘问卷系统 - 部署指南

## 概述
这是一个支持语音回答的深度访谈问卷系统，专为IP创始人设计，用于收集高价值的商业洞察信息。

## 系统功能
- ✅ 专业的深度访谈问题框架（8个核心问题）
- ✅ 支持文字和语音两种回答方式
- ✅ 响应式设计，移动端友好
- ✅ 实时进度跟踪和导航
- ✅ 数据本地存储（可扩展至服务器存储）
- ✅ 问卷预览和导出功能

## 快速部署方案

### 方案A：静态托管（最快捷）
1. **准备**：将整个项目文件夹上传到任何Web服务器
2. **访问**：通过浏览器访问 `index.html`
3. **使用**：用户可以直接填写问卷，语音功能需要现代浏览器支持（Chrome/Firefox/Edge）

**推荐托管平台**：
- GitHub Pages（免费）
- Vercel（免费，自动HTTPS）
- Netlify（免费，支持表单）
- 阿里云/腾讯云对象存储OSS（付费）

### 方案B：微信集成（需要微信公众号）
1. **准备认证公众号**：需要企业认证的订阅号或服务号
2. **配置JS-SDK**：在公众号后台添加域名白名单
3. **集成微信录音**：使用微信JS-SDK的录音功能
4. **部署**：将系统部署到已配置的服务器

### 方案C：小程序开发（最佳体验）
使用微信小程序原生开发，需要：
1. 小程序开发者账号
2. 配置录音权限
3. 开发上传功能
4. 提交微信审核

## 部署步骤

### 1. 基础部署
```bash
# 上传文件到服务器
scp -r project/* user@your-server:/var/www/html/questionnaire/

# 设置正确的文件权限
chmod -R 755 /var/www/html/questionnaire/

# 确保HTTPS可用（录音功能需要）
# 申请SSL证书或使用云服务商的免费证书
```

### 2. 微信集成（方案B）
```javascript
// 在questionnaire.js中添加微信JS-SDK配置
function initWeChatSDK() {
    wx.config({
        debug: false,
        appId: 'YOUR_APPID',
        timestamp: timestamp,
        nonceStr: 'YOUR_NONCESTR',
        signature: signature,
        jsApiList: [
            'startRecord',
            'stopRecord',
            'onVoiceRecordEnd',
            'uploadVoice'
        ]
    });
}
```

### 3. 服务器端API（可选）
创建简单的PHP/Python/Node.js API来处理问卷数据：

```javascript
// 示例Node.js API（server/api/submit.js）
const express = require('express');
const router = express.Router();

router.post('/submit', async (req, res) => {
    try {
        const data = req.body;
        // 1. 保存到数据库
        // 2. 发送通知邮件
        // 3. 返回成功响应
        res.json({ success: true, message: '问卷提交成功' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

## 配置说明

### 1. 修改问卷问题
编辑 `index.html` 中的问题内容：
- 查找 `<section class="question-section">` 修改问题文本
- 每个问题对应一个 `textarea` 元素

### 2. 自定义样式
编辑 `style.css` 文件：
- 修改颜色主题：调整 `:root` 中的CSS变量
- 响应式断点：768px（移动设备）

### 3. 配置数据存储
当前使用localStorage，可修改为：

**A. 使用Supabase（推荐）**：
```javascript
// 在questionnaire.js中替换localStorage存储
async function saveToSupabase(data) {
    const { data: result, error } = await supabase
        .from('questionnaires')
        .insert([data]);
}
```

**B. 使用Firebase**：
```javascript
// 添加Firebase配置
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
```

### 4. 语音文件存储
语音文件默认以base64格式存储在localStorage，建议：

1. **转换**：将base64转为文件上传到云存储
2. **上传**：使用formData上传到服务器
3. **存储**：阿里云OSS、腾讯云COS、AWS S3等

```javascript
async function uploadVoiceFile(blob, questionId) {
    const formData = new FormData();
    formData.append('voice', blob, `voice_${questionId}_${Date.now()}.webm`);
    formData.append('questionId', questionId);
    
    const response = await fetch('/api/upload-voice', {
        method: 'POST',
        body: formData
    });
    return await response.json();
}
```

## 安全考虑

### 1. 数据保护
- 问卷数据包含敏感商业信息
- 建议实施端到端加密
- 使用HTTPS传输
- 定期备份数据

### 2. 隐私合规
- 明确告知用户数据用途
- 提供隐私政策链接
- 允许用户删除数据
- 符合GDPR等法规要求

### 3. 访问控制
- 问卷链接可设置访问密码
- 限制IP访问频率
- 验证用户身份（可选）

## 维护与监控

### 1. 日志记录
```javascript
// 添加操作日志
function logUserAction(action, data) {
    const log = {
        timestamp: new Date().toISOString(),
        action,
        data,
        userAgent: navigator.userAgent,
        ip: await getClientIP() // 需要后端支持
    };
    
    // 发送到日志服务
    fetch('/api/logs', { method: 'POST', body: JSON.stringify(log) });
}
```

### 2. 性能监控
- 页面加载时间
- 语音录制成功率
- 表单提交成功率
- 错误率监控

### 3. 定期备份
```bash
# 数据库备份脚本
0 2 * * * /path/to/backup-script.sh
```

## 故障排除

### 常见问题1：语音录制失败
**症状**：无法获取麦克风权限
**解决**：
1. 检查浏览器是否支持MediaRecorder
2. 确认HTTPS配置（部分浏览器要求HTTPS）
3. 检查域名是否在授权列表中（微信集成）

### 常见问题2：数据丢失
**症状**：刷新页面后数据丢失
**解决**：
1. 检查localStorage是否可用
2. 添加自动保存功能
3. 实现服务端存储

### 常见问题3：移动端兼容性
**症状**：在手机上样式错乱
**解决**：
1. 检查响应式CSS
2. 测试不同屏幕尺寸
3. 优化触控操作

## 扩展功能

### 1. 数据分析面板
```javascript
// 创建管理后台展示数据
function createAdminDashboard(data) {
    // 可视化分析：词频分析、语音时长统计、完成率等
}
```

### 2. 自动化报告生成
```javascript
// 根据问卷自动生成PDF报告
function generateReport(formData) {
    // 使用jsPDF或服务端生成
}
```

### 3. 微信消息提醒
```javascript
// 有新问卷提交时发送微信通知
function sendWeChatNotification(submission) {
    // 使用微信模板消息API
}
```

## 联系支持
如有部署问题或定制需求，请联系：
- **技术支持**：IP_Support（微信）
- **电子邮件**：support@limi-ip.com
- **电话**：400-888-1234

## 更新日志
- v1.0.0 (2026-03-27) 初始版本发布
- 包含基础问卷功能、语音录制、数据存储

---

**重要提示**：生产环境部署前，请在测试环境充分验证所有功能。