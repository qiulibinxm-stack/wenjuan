/**
 * 李密·IP深度挖掘问卷系统 - Node.js API 服务
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 配置中间件
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 创建日志目录
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 创建数据存储目录
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const submissionsDir = path.join(dataDir, 'submissions');
if (!fs.existsSync(submissionsDir)) {
    fs.mkdirSync(submissionsDir, { recursive: true });
}

const voiceDir = path.join(dataDir, 'voices');
if (!fs.existsSync(voiceDir)) {
    fs.mkdirSync(voiceDir, { recursive: true });
}

// 配置文件上传（语音文件）
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const today = new Date().toISOString().split('T')[0];
        const voiceDir = path.join(__dirname, 'data', 'voices', today);
        
        if (!fs.existsSync(voiceDir)) {
            fs.mkdirSync(voiceDir, { recursive: true });
        }
        
        cb(null, voiceDir);
    },
    filename: (req, res, cb) => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const questionId = req.body.questionId || 'unknown';
        cb(null, `${timestamp}_${questionId}_${random}.webm`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB限制
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传音频文件'));
        }
    }
});

// 速率限制（防止滥用）
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 每个IP限制100个请求
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// 日志中间件
app.use((req, res, next) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type')
    };
    
    const logFile = path.join(logDir, `access_${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    
    next();
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'IP问卷API',
        version: '1.0.0'
    });
});

// 提交问卷
app.post('/api/submit', (req, res) => {
    try {
        const submissionData = req.body;
        
        // 验证数据
        if (!submissionData.basicInfo || !submissionData.answers) {
            return res.status(400).json({
                success: false,
                message: '缺少必要数据: basicInfo 或 answers'
            });
        }
        
        // 生成唯一ID
        const submissionId = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();
        
        // 处理语音回答（如果有）
        const processedData = {
            id: submissionId,
            submittedAt: timestamp,
            basicInfo: processBasicInfo(submissionData.basicInfo),
            answers: processAnswers(submissionData.answers),
            voiceAnswers: [],
            status: 'pending',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };
        
        // 保存到文件
        const submissionPath = path.join(submissionsDir, `${submissionId}.json`);
        fs.writeFileSync(submissionPath, JSON.stringify(processedData, null, 2));
        
        // 发送通知（异步）
        sendNewSubmissionNotification(processedData);
        
        res.status(200).json({
            success: true,
            message: '问卷提交成功',
            data: {
                id: submissionId,
                submittedAt: timestamp,
                answersCount: Object.keys(processedData.answers).length
            }
        });
        
    } catch (error) {
        console.error('提交失败:', error);
        
        // 记录错误
        const errorLog = path.join(logDir, `errors_${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(errorLog, `${new Date().toISOString()} - ${error.message}\n${error.stack}\n\n`);
        
        res.status(500).json({
            success: false,
            message: '提交失败，请稍后再试',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 上传语音文件
app.post('/api/upload-voice', upload.single('voice'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: '没有上传文件' 
            });
        }
        
        const { questionId, submissionId } = req.body;
        
        const voiceData = {
            id: `VOICE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            questionId,
            submissionId,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: `voices/${req.file.filename}`,
            uploadedAt: new Date().toISOString()
        };
        
        // 保存语音元数据
        const voiceMetaPath = path.join(voiceDir, `${voiceData.id}.json`);
        fs.writeFileSync(voiceMetaPath, JSON.stringify(voiceData, null, 2));
        
        res.status(200).json({
            success: true,
            message: '语音文件上传成功',
            data: voiceData
        });
        
    } catch (error) {
        console.error('语音上传失败:', error);
        res.status(500).json({
            success: false,
            message: '语音上传失败'
        });
    }
});

// 获取问卷列表（管理员）
app.get('/api/submissions', (req, res) => {
    try {
        // 简单的API密钥验证
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
            return res.status(401).json({ 
                success: false, 
                message: '未授权访问' 
            });
        }
        
        const files = fs.readdirSync(submissionsDir);
        let submissions = [];
        
        // 读取最近50个提交
        const recentFiles = files.slice(-50).reverse();
        recentFiles.forEach(file => {
            try {
                const filePath = path.join(submissionsDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                
                // 简化数据返回
                submissions.push({
                    id: data.id,
                    submittedAt: data.submittedAt,
                    name: data.basicInfo?.name || '匿名',
                    email: data.basicInfo?.email || '',
                    answersCount: Object.keys(data.answers || {}).length,
                    voiceCount: Object.keys(data.voiceAnswers || {}).length,
                    status: data.status
                });
            } catch (err) {
                console.error(`读取文件失败 ${file}:`, err);
            }
        });
        
        res.status(200).json({
            success: true,
            data: submissions,
            total: files.length,
            count: submissions.length
        });
        
    } catch (error) {
        console.error('获取提交列表失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取数据失败' 
        });
    }
});

// 获取单个问卷详情
app.get('/api/submissions/:id', (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
            return res.status(401).json({ 
                success: false, 
                message: '未授权访问' 
            });
        }
        
        const submissionId = req.params.id;
        const filePath = path.join(submissionsDir, `${submissionId}.json`);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ 
                success: false, 
                message: '未找到该问卷' 
            });
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // 移除敏感信息
        delete data.ipAddress;
        delete data.userAgent;
        
        res.status(200).json({
            success: true,
            data: data
        });
        
    } catch (error) {
        console.error('获取问卷详情失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取详情失败' 
        });
    }
});

// 数据统计
app.get('/api/stats', (req, res) => {
    try {
        const files = fs.readdirSync(submissionsDir);
        
        // 计算统计数据
        let totalSubmissions = files.length;
        let todaySubmissions = 0;
        let completedSubmissions = 0;
        let totalVoiceFiles = 0;
        let averageAnswers = 0;
        
        const today = new Date().toISOString().split('T')[0];
        
        files.forEach(file => {
            try {
                const filePath = path.join(submissionsDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                
                // 今日提交
                if (data.submittedAt && data.submittedAt.startsWith(today)) {
                    todaySubmissions++;
                }
                
                // 已完成分析
                if (data.status === 'analyzed') {
                    completedSubmissions++;
                }
                
                // 语音文件数量
                totalVoiceFiles += Object.keys(data.voiceAnswers || {}).length;
                
                // 平均回答数量
                averageAnswers += Object.keys(data.answers || {}).length;
                
            } catch (err) {
                // 忽略错误文件
            }
        });
        
        averageAnswers = totalSubmissions > 0 ? (averageAnswers / totalSubmissions).toFixed(2) : 0;
        
        res.status(200).json({
            success: true,
            data: {
                totalSubmissions,
                todaySubmissions,
                completedSubmissions,
                totalVoiceFiles,
                averageAnswers: parseFloat(averageAnswers)
            }
        });
        
    } catch (error) {
        console.error('获取统计失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取统计数据失败' 
        });
    }
});

// 工具函数
function processBasicInfo(basicInfo) {
    return {
        name: sanitizeString(basicInfo.name || '', 100),
        contact: sanitizeString(basicInfo.contact || '', 100),
        email: isValidEmail(basicInfo.email) ? basicInfo.email : '',
        receivedAt: new Date().toISOString()
    };
}

function processAnswers(answers) {
    const processed = {};
    
    Object.keys(answers).forEach(questionId => {
        const answer = answers[questionId];
        if (typeof answer === 'string') {
            processed[questionId] = {
                text: sanitizeString(answer, 2000),
                type: 'text',
                processedAt: new Date().toISOString()
            };
        } else if (typeof answer === 'object' && answer.text) {
            processed[questionId] = {
                text: sanitizeString(answer.text, 2000),
                type: answer.type || 'text',
                processedAt: new Date().toISOString()
            };
        }
    });
    
    return processed;
}

function sanitizeString(str, maxLength) {
    if (typeof str !== 'string') return '';
    
    // 移除潜在危险字符
    let sanitized = str
        .replace(/[<>]/g, '') // 移除尖括号
        .replace(/javascript:/gi, '') // 移除javascript协议
        .replace(/on\w+\s*=/gi, '') // 移除事件处理器
        .trim();
    
    // 限制长度
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength - 3) + '...';
    }
    
    return sanitized;
}

function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function sendNewSubmissionNotification(data) {
    // 这里可以集成邮件通知、微信通知等
    // 为了简单起见，这里只记录日志
    
    const notificationLog = path.join(logDir, `notifications_${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'new_submission',
        submissionId: data.id,
        name: data.basicInfo.name,
        email: data.basicInfo.email,
        answersCount: Object.keys(data.answers).length
    };
    
    fs.appendFileSync(notificationLog, JSON.stringify(logEntry) + '\n');
    
    console.log(`新问卷提交: ${data.id} - ${data.basicInfo.name}`);
}

// 处理未匹配的路由
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在',
        path: req.path,
        method: req.method
    });
});

// 全局错误处理
app.use((err, req, res, next) => {
    console.error('应用错误:', err);
    
    const errorLog = path.join(logDir, `app_errors_${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(errorLog, `${new Date().toISOString()} - ${req.method} ${req.path}\n${err.stack}\n\n`);
    
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`
    🚀 李密·IP深度挖掘问卷系统API服务已启动
    👉 地址: http://localhost:${PORT}
    👉 健康检查: http://localhost:${PORT}/health
    👉 环境: ${process.env.NODE_ENV || 'development'}
    👉 数据目录: ${dataDir}
    👉 日志目录: ${logDir}
    
    可用接口:
    POST   /api/submit          提交问卷
    POST   /api/upload-voice    上传语音文件
    GET    /api/submissions     获取提交列表（需API密钥）
    GET    /api/submissions/:id 获取单个提交详情（需API密钥）
    GET    /api/stats           获取统计信息
    GET    /health              健康检查
    `);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，开始优雅关闭...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('收到SIGINT信号，开始优雅关闭...');
    process.exit(0);
});

module.exports = app;