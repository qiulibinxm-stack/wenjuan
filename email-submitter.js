/**
 * 邮件提交功能
 * 通过Formspree或EmailJS等服务发送邮件
 */

class EmailSubmitter {
    constructor() {
        this.services = {
            // 免费邮件发送服务（每月有限额）
            formspree: {
                enabled: true,
                baseUrl: 'https://formspree.io/f',
                formId: 'your-form-id-here', // 需要在formspree.io注册获取
                limit: 50 // 每月免费额度
            },
            emailjs: {
                enabled: false,
                serviceId: 'your-service-id',
                templateId: 'your-template-id',
                userId: 'your-user-id'
            },
            // 使用后端API（需要自己部署）
            custom: {
                enabled: false,
                endpoint: '/api/send-email'
            }
        };
        
        this.currentService = 'formspree';
        this.config = this.loadConfig();
    }
    
    loadConfig() {
        // 从URL参数获取配置
        const urlParams = new URLSearchParams(window.location.search);
        
        return {
            // 收件邮箱（如果使用Formspree，这里设置转发邮箱）
            receiver: urlParams.get('email') || 'your-email@example.com',
            
            // 发件人显示名称
            senderName: urlParams.get('name') || 'IP问卷系统',
            
            // 是否启用邮件通知
            enabled: urlParams.get('email') !== 'false',
            
            // 邮件主题模板
            subjectTemplate: '【IP问卷】新提交 - {name}',
            
            // 使用哪种服务
            service: urlParams.get('service') || 'formspree'
        };
    }
    
    /**
     * 配置Formspree表单
     * 需要在 formspree.io 注册并创建表单
     */
    setupFormspree(formId) {
        if (!formId) {
            console.warn('Formspree表单ID未设置，邮件功能将无法使用');
            console.info('请访问 https://formspree.io 注册并创建表单，然后将表单ID填入问卷链接');
            return null;
        }
        
        this.services.formspree.formId = formId;
        this.currentService = 'formspree';
        
        console.log('Formspree服务已配置，表单ID:', formId);
        return `https://formspree.io/f/${formId}`;
    }
    
    /**
     * 获取邮件发送端点
     */
    getSubmitEndpoint() {
        const service = this.services[this.currentService];
        if (!service || !service.enabled) {
            return null;
        }
        
        if (this.currentService === 'formspree') {
            return `https://formspree.io/f/${service.formId}`;
        }
        
        return service.endpoint;
    }
    
    /**
     * 准备邮件数据
     */
    prepareEmailData(formData) {
        const config = this.config;
        
        // 构建邮件内容
        let emailContent = `
        <h2>🎯 新问卷提交通知</h2>
        <p><strong>提交时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
        <p><strong>提交人：</strong>${formData.basicInfo.name}</p>
        <p><strong>联系方式：</strong>${formData.basicInfo.contact}</p>
        <p><strong>邮箱：</strong>${formData.basicInfo.email || '未提供'}</p>
        
        <hr>
        <h3>📋 问卷回答摘要</h3>
        `;
        
        // 添加回答摘要
        const questionTitles = [
            '1. 核心盈利模式与高客单价产品',
            '2. 为客户带来的终极改变',
            '3. 超级客户画像',
            '4. 客户最深的焦虑与恐惧',
            '5. 行业最扯淡的潜规则',
            '6. 逆向思维解决客户问题的3个案例',
            '7. 最偏执的商业决定',
            '8. 最看不惯的人与专业底线'
        ];
        
        Object.entries(formData.answers).forEach(([qId, answer], index) => {
            emailContent += `
            <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                <h4 style="margin: 0 0 10px 0; color: #1890ff;">${questionTitles[qId-1]}</h4>
                <p style="margin: 0; white-space: pre-wrap;">${answer}</p>
            </div>
            `;
        });
        
        // 语音回答统计
        const voiceCount = Object.keys(formData.voiceAnswers || {}).length;
        if (voiceCount > 0) {
            emailContent += `
            <div style="margin-top: 20px; padding: 15px; background: #e6f7ff; border-radius: 5px;">
                <h4 style="margin: 0 0 10px 0; color: #13c2c2;">🎤 语音回答</h4>
                <p>本次提交包含 <strong>${voiceCount}</strong> 个语音回答，请登录管理后台查看。</p>
            </div>
            `;
        }
        
        emailContent += `
        <hr>
        <div style="font-size: 12px; color: #666;">
            <p>问卷提交ID: ${formData.id || 'N/A'}</p>
            <p>填写完成度: ${Object.keys(formData.answers).length}/8 文字回答，${voiceCount}/8 语音回答</p>
            <p>IP: ${navigator.userAgent}</p>
            <p>系统生成，如有问题请联系管理员。</p>
        </div>
        `;
        
        // 准备Formspree数据格式
        const formspreeData = {
            _subject: config.subjectTemplate.replace('{name}', formData.basicInfo.name),
            name: formData.basicInfo.name,
            contact: formData.basicInfo.contact,
            email: formData.basicInfo.email || '未提供',
            content: emailContent,
            source: 'IP深度挖掘问卷',
            timestamp: new Date().toISOString(),
            answers_count: Object.keys(formData.answers).length,
            voice_count: voiceCount,
            // 将每个问题的回答单独作为字段（便于整理）
            ...Object.entries(formData.answers).reduce((acc, [qId, answer]) => {
                acc[`question_${qId}`] = answer.substring(0, 500); // 限制长度
                return acc;
            }, {})
        };
        
        return {
            formspree: formspreeData,
            raw: {
                to: config.receiver,
                subject: config.subjectTemplate.replace('{name}', formData.basicInfo.name),
                html: emailContent
            },
            summary: {
                name: formData.basicInfo.name,
                contact: formData.basicInfo.contact,
                email: formData.basicInfo.email,
                answersCount: Object.keys(formData.answers).length,
                voiceCount: voiceCount,
                submissionId: formData.id
            }
        };
    }
    
    /**
     * 通过Formspree发送邮件
     */
    async sendViaFormspree(formData) {
        const service = this.services.formspree;
        if (!service.enabled || !service.formId) {
            throw new Error('Formspree服务未配置或已禁用');
        }
        
        const emailData = this.prepareEmailData(formData);
        const endpoint = this.getSubmitEndpoint();
        
        console.log('通过Formspree发送邮件，端点:', endpoint);
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(emailData.formspree)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Formspree发送成功:', result);
                
                // 检查是否成功
                if (result.ok || response.status === 200) {
                    return {
                        success: true,
                        service: 'formspree',
                        next: result.next
                    };
                }
            }
            
            throw new Error(`Formspree发送失败: ${response.status}`);
            
        } catch (error) {
            console.error('Formspree发送失败:', error);
            throw error;
        }
    }
    
    /**
     * 发送邮件摘要到配置的邮箱
     * 这是主要调用接口
     */
    async sendQuestionnaireEmail(formData) {
        // 检查邮件功能是否启用
        if (!this.config.enabled) {
            console.log('邮件通知功能已禁用');
            return { success: true, disabled: true };
        }
        
        // 检查至少有一个配置好的服务
        const availableServices = Object.entries(this.services)
            .filter(([name, service]) => service.enabled)
            .map(([name]) => name);
        
        if (availableServices.length === 0) {
            throw new Error('没有可用的邮件服务');
        }
        
        // 记录发送尝试
        console.log(`开始发送问卷邮件到 ${this.config.receiver}，使用服务: ${this.currentService}`);
        
        try {
            let result;
            
            switch (this.currentService) {
                case 'formspree':
                    result = await this.sendViaFormspree(formData);
                    break;
                    
                case 'custom':
                    // 自定义API（需要部署后端）
                    console.warn('自定义API暂未实现，请使用Formspree或其他服务');
                    result = { success: false, message: '自定义API暂未实现' };
                    break;
                    
                default:
                    throw new Error(`不支持的服务类型: ${this.currentService}`);
            }
            
            if (result.success) {
                // 记录成功发送
                this.logEmailSent(formData, this.config.receiver);
                console.log('问卷邮件发送成功');
            }
            
            return result;
            
        } catch (error) {
            console.error('发送问卷邮件失败:', error);
            
            // 可以降级到其他方式
            const fallbackResult = await this.tryFallbackMethod(formData);
            if (fallbackResult.success) {
                console.log('使用备用方法成功发送');
                return fallbackResult;
            }
            
            throw error;
        }
    }
    
    /**
     * 备用发送方法（本地保存）
     */
    async tryFallbackMethod(formData) {
        console.log('尝试备用发送方法...');
        
        // 方法1：保存到localStorage，后续手动处理
        try {
            const emailQueue = JSON.parse(localStorage.getItem('email_queue') || '[]');
            const emailData = this.prepareEmailData(formData);
            
            emailQueue.push({
                timestamp: new Date().toISOString(),
                to: this.config.receiver,
                data: emailData.summary,
                raw: emailData.raw
            });
            
            // 限制队列大小
            if (emailQueue.length > 50) {
                emailQueue.splice(0, emailQueue.length - 50);
            }
            
            localStorage.setItem('email_queue', JSON.stringify(emailQueue));
            
            console.log('邮件已保存到本地队列，数量:', emailQueue.length);
            
            return {
                success: true,
                method: 'local_storage',
                queueSize: emailQueue.length,
                message: '邮件已保存到本地，请导出处理'
            };
            
        } catch (error) {
            console.error('备用方法也失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 记录邮件发送
     */
    logEmailSent(formData, email) {
        const logs = JSON.parse(localStorage.getItem('email_logs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            to: email,
            name: formData.basicInfo.name,
            contact: formData.basicInfo.contact,
            answersCount: Object.keys(formData.answers || {}).length,
            success: true
        });
        
        // 限制日志数量
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('email_logs', JSON.stringify(logs));
    }
    
    /**
     * 导出本地保存的邮件队列
     */
    exportEmailQueue() {
        try {
            const queue = JSON.parse(localStorage.getItem('email_queue') || '[]');
            if (queue.length === 0) {
                return { success: false, message: '邮件队列为空' };
            }
            
            // 生成可导出格式
            const exportData = {
                exportedAt: new Date().toISOString(),
                total: queue.length,
                emails: queue
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            // 尝试自动发送到服务器（需要后端支持）
            this.uploadExportToServer(exportData).catch(console.error);
            
            return {
                success: true,
                data: exportData,
                blob: blob,
                queueLength: queue.length
            };
            
        } catch (error) {
            console.error('导出邮件队列失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 上传导出数据到服务器
     */
    async uploadExportToServer(data) {
        // 这里需要后端API端点
        // 暂不实现，标记TODO
        return Promise.resolve({ success: false, message: '后端API未配置' });
    }
    
    /**
     * 生成带邮件配置的分享链接
     */
    generateShareLink(email, name = '') {
        const baseUrl = window.location.origin + window.location.pathname;
        const url = new URL(baseUrl);
        
        if (email && this.validateEmail(email)) {
            url.searchParams.set('email', email);
        }
        
        if (name) {
            url.searchParams.set('name', encodeURIComponent(name));
        }
        
        // 添加服务类型
        url.searchParams.set('service', this.currentService);
        
        return url.toString();
    }
    
    /**
     * 验证邮箱格式
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * 获取配置状态
     */
    getStatus() {
        return {
            enabled: this.config.enabled,
            receiver: this.config.receiver,
            service: this.currentService,
            serviceEnabled: this.services[this.currentService]?.enabled || false,
            queueSize: JSON.parse(localStorage.getItem('email_queue') || '[]').length,
            logsCount: JSON.parse(localStorage.getItem('email_logs') || '[]').length
        };
    }
}

// 创建全局实例
window.EmailSubmitter = new EmailSubmitter();

console.log('邮件提交系统已加载');