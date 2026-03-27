/**
 * 问卷系统配置管理器
 * 支持动态配置，无需修改代码
 */

class QuestionnaireConfig {
    constructor() {
        this.defaultConfig = {
            // 邮件配置
            emailReceiver: 'admin@limi-ip.com',
            emailSubject: '【IP问卷】新提交 - {name}',
            emailEnabled: true,
            
            // 问卷配置
            questionnaireTitle: '李密·IP深度挖掘与资料溯源问卷',
            questionnaireSubtitle: '创始人信任资产与商业底盘深度盘查工具',
            
            // 功能开关
            enableVoiceRecording: true,
            enableLocalStorage: true,
            enableDataExport: true,
            
            // 显示配置
            showProgressBar: true,
            showWordCount: true,
            showVoiceRecorder: true,
            
            // 微信分享
            wechatShareTitle: '李密·IP深度挖掘问卷',
            wechatShareDesc: '8个犀利问题，彻底盘点你的商业底盘',
            wechatShareImage: '',
            
            // 管理员设置
            adminContact: 'IP',
            adminWechat: 'IP_Support',
            adminPhone: '400-888-1234'
        };
        
        this.userConfig = {};
        this.loadConfig();
    }
    
    // 从URL参数加载配置
    loadConfig() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 邮箱配置（最重要的参数）
        const emailFromUrl = urlParams.get('email');
        if (emailFromUrl && this.validateEmail(emailFromUrl)) {
            this.userConfig.emailReceiver = emailFromUrl;
        }
        
        // 标题配置
        const titleFromUrl = urlParams.get('title');
        if (titleFromUrl) {
            this.userConfig.questionnaireTitle = decodeURIComponent(titleFromUrl);
        }
        
        // 联系信息
        const contactFromUrl = urlParams.get('contact');
        if (contactFromUrl) {
            this.userConfig.adminContact = decodeURIComponent(contactFromUrl);
        }
        
        // 功能开关
        const voiceParam = urlParams.get('voice');
        if (voiceParam !== null) {
            this.userConfig.enableVoiceRecording = voiceParam !== 'false';
        }
        
        // 尝试从localStorage加载之前保存的配置
        try {
            const savedConfig = localStorage.getItem('questionnaire_config');
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                this.userConfig = { ...this.userConfig, ...parsedConfig };
            }
        } catch (error) {
            console.warn('加载本地配置失败:', error);
        }
    }
    
    // 获取配置值
    get(key) {
        // 优先级：URL参数 > 用户配置 > 默认配置
        const urlParams = new URLSearchParams(window.location.search);
        const urlValue = urlParams.get(key);
        
        if (urlValue !== null) {
            return urlValue;
        }
        
        if (this.userConfig[key] !== undefined) {
            return this.userConfig[key];
        }
        
        return this.defaultConfig[key];
    }
    
    // 设置配置值
    set(key, value) {
        this.userConfig[key] = value;
        this.saveToLocalStorage();
    }
    
    // 保存配置到localStorage
    saveToLocalStorage() {
        try {
            localStorage.setItem('questionnaire_config', JSON.stringify(this.userConfig));
        } catch (error) {
            console.warn('保存配置到本地存储失败:', error);
        }
    }
    
    // 验证邮箱格式
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // 获取完整配置
    getAll() {
        return {
            ...this.defaultConfig,
            ...this.userConfig
        };
    }
    
    // 生成带配置的分享链接
    generateShareUrl(baseUrl, config = {}) {
        const url = new URL(baseUrl);
        
        Object.entries(config).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, encodeURIComponent(value));
            }
        });
        
        return url.toString();
    }
    
    // 生成针对不同客户的分享链接
    generateClientLink(clientConfig) {
        const baseConfig = {
            title: this.get('questionnaireTitle'),
            contact: this.get('adminContact')
        };
        
        const finalConfig = { ...baseConfig, ...clientConfig };
        return this.generateShareUrl(window.location.origin + window.location.pathname, finalConfig);
    }
    
    // 应用到页面
    applyToPage() {
        // 设置页面标题
        const title = this.get('questionnaireTitle');
        const subtitle = this.get('questionnaireSubtitle');
        
        document.title = title;
        
        const titleElement = document.querySelector('.questionnaire-header h1');
        const subtitleElement = document.querySelector('.questionnaire-header .subtitle');
        
        if (titleElement) {
            titleElement.textContent = title;
        }
        
        if (subtitleElement) {
            subtitleElement.textContent = subtitle;
        }
        
        // 更新管理员联系信息
        this.updateContactInfo();
        
        // 应用功能开关
        this.applyFeatureToggles();
    }
    
    // 更新联系信息
    updateContactInfo() {
        const adminContact = this.get('adminContact');
        const adminWechat = this.get('adminWechat');
        const adminPhone = this.get('adminPhone');
        
        // 更新页面上所有联系信息显示
        const contactElements = document.querySelectorAll('.admin-contact');
        contactElements.forEach(element => {
            const text = element.textContent;
            
            if (text.includes('IP')) {
                element.textContent = text.replace('IP', adminContact || '管理员');
            }
        });
        
        // 更新技术支持部分
        const supportElements = document.querySelectorAll('.support-methods p');
        supportElements.forEach(element => {
            if (element.textContent.includes('IP_Support')) {
                element.innerHTML = element.innerHTML.replace('IP_Support', adminWechat || 'IP_Support');
            }
        });
    }
    
    // 应用功能开关
    applyFeatureToggles() {
        const enableVoice = this.get('enableVoiceRecording');
        const voiceElements = document.querySelectorAll('.voice-answer, .btn-voice-record');
        
        if (!enableVoice) {
            voiceElements.forEach(element => {
                element.style.display = 'none';
            });
            
            const voiceButtons = document.querySelectorAll('.btn-voice-record');
            voiceButtons.forEach(button => {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-ban"></i> <span>语音功能已关闭</span>';
            });
        }
    }
    
    // 获取邮件配置
    getEmailConfig() {
        const receiver = this.get('emailReceiver');
        const subjectTemplate = this.get('emailSubject');
        const enabled = this.get('emailEnabled');
        
        return {
            receiver,
            subjectTemplate,
            enabled,
            // 邮件服务器配置（这里简化处理，实际需要后端支持）
            useBackend: true // 标记需要使用后端发送邮件
        };
    }
    
    // 获取当前配置的摘要
    getConfigSummary() {
        const config = this.getAll();
        return {
            接收邮箱: config.emailReceiver,
            问卷标题: config.questionnaireTitle,
            管理员: config.adminContact,
            语音功能: config.enableVoiceRecording ? '启用' : '禁用',
            数据存储: config.enableLocalStorage ? '本地+邮件' : '仅邮件',
            微信分享标题: config.wechatShareTitle
        };
    }
}

// 创建全局配置实例
window.QuestionnaireConfig = new QuestionnaireConfig();

// 初始化时应用到页面
document.addEventListener('DOMContentLoaded', function() {
    window.QuestionnaireConfig.applyToPage();
    
    // 显示当前配置（开发模式）
    if (window.location.search.includes('debug=config')) {
        console.log('当前问卷配置:', window.QuestionnaireConfig.getConfigSummary());
        console.log('完整配置对象:', window.QuestionnaireConfig.getAll());
        console.log('分享链接示例:', window.QuestionnaireConfig.generateClientLink({
            email: 'test@example.com',
            title: '定制版问卷',
            contact: '张三'
        }));
    }
});

console.log('问卷配置系统已加载');