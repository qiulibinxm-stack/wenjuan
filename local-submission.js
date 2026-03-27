/**
 * 本地提交处理 - 当邮件功能不可用时使用
 */

class LocalSubmissionManager {
    constructor() {
        this.storageKey = 'ip_questionnaire_submissions';
        this.maxSubmissions = 100; // 本地存储最大数量
    }
    
    /**
     * 保存到本地存储
     */
    saveToLocal(formData) {
        try {
            // 获取现有提交
            const existing = this.getAllSubmissions();
            
            // 准备提交数据
            const submission = {
                id: formData.id || this.generateId(),
                submittedAt: new Date().toISOString(),
                basicInfo: formData.basicInfo,
                answers: formData.answers,
                voiceAnswers: formData.voiceAnswers || {},
                status: 'pending',
                source: window.location.href,
                userAgent: navigator.userAgent
            };
            
            // 添加到列表
            existing.push(submission);
            
            // 限制数量
            if (existing.length > this.maxSubmissions) {
                existing.splice(0, existing.length - this.maxSubmissions);
            }
            
            // 保存到localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(existing));
            
            console.log('问卷已保存到本地存储，总数:', existing.length);
            
            // 清理语音文件（避免重复占用空间）
            this.cleanupVoiceFiles();
            
            return {
                success: true,
                id: submission.id,
                timestamp: submission.submittedAt,
                count: existing.length
            };
            
        } catch (error) {
            console.error('保存到本地存储失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 获取所有本地提交
     */
    getAllSubmissions() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('获取本地提交失败:', error);
            return [];
        }
    }
    
    /**
     * 导出本地数据
     */
    exportSubmissions(format = 'json') {
        const submissions = this.getAllSubmissions();
        
        if (submissions.length === 0) {
            return { success: false, message: '没有本地存储的数据' };
        }
        
        try {
            let exportData;
            let filename;
            let mimeType;
            
            if (format === 'json') {
                exportData = JSON.stringify(submissions, null, 2);
                filename = `ip_questionnaire_export_${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
                
            } else if (format === 'csv') {
                // 简化的CSV格式
                const csvRows = ['ID,提交时间,姓名,联系方式,邮箱,回答数量,语音数量'];
                
                submissions.forEach(sub => {
                    csvRows.push([
                        `"${sub.id}"`,
                        `"${sub.submittedAt}"`,
                        `"${sub.basicInfo?.name || ''}"`,
                        `"${sub.basicInfo?.contact || ''}"`,
                        `"${sub.basicInfo?.email || ''}"`,
                        Object.keys(sub.answers || {}).length,
                        Object.keys(sub.voiceAnswers || {}).length
                    ].join(','));
                });
                
                exportData = csvRows.join('\n');
                filename = `ip_questionnaire_export_${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
                
            } else if (format === 'text') {
                // 纯文本格式，便于阅读
                let text = `李密·IP深度挖掘问卷 - 数据导出\n`;
                text += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
                text += `共计: ${submissions.length} 份问卷\n\n`;
                
                submissions.forEach((sub, index) => {
                    text += `=== 问卷 ${index + 1} ===\n`;
                    text += `ID: ${sub.id}\n`;
                    text += `提交时间: ${sub.submittedAt}\n`;
                    text += `姓名: ${sub.basicInfo?.name || ''}\n`;
                    text += `联系方式: ${sub.basicInfo?.contact || ''}\n`;
                    text += `邮箱: ${sub.basicInfo?.email || ''}\n`;
                    text += `回答数量: ${Object.keys(sub.answers || {}).length} / 语音数量: ${Object.keys(sub.voiceAnswers || {}).length}\n`;
                    
                    // 添加问题和回答
                    Object.entries(sub.answers || {}).forEach(([qId, answer]) => {
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
                        
                        if (questionTitles[qId-1]) {
                            text += `\n${questionTitles[qId-1]}:\n${answer}\n`;
                        }
                    });
                    
                    text += '\n---\n\n';
                });
                
                exportData = text;
                filename = `ip_questionnaire_export_${new Date().toISOString().split('T')[0]}.txt`;
                mimeType = 'text/plain';
                
            } else {
                throw new Error(`不支持的导出格式: ${format}`);
            }
            
            // 触发下载
            const blob = new Blob([exportData], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            
            // 添加到页面触发点击
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            return {
                success: true,
                format: format,
                count: submissions.length,
                filename: filename
            };
            
        } catch (error) {
            console.error('导出数据失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 清理本地数据
     */
    clearSubmissions() {
        try {
            // 备份一份再删除
            const backup = this.getAllSubmissions();
            const backupKey = `ip_questionnaire_backup_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify(backup));
            
            // 清理主存储
            localStorage.removeItem(this.storageKey);
            
            // 清理过期备份（保留最近10个）
            this.cleanupBackups();
            
            console.log('已清理问卷数据，备份到:', backupKey);
            
            return {
                success: true,
                cleared: backup.length,
                backupKey: backupKey
            };
            
        } catch (error) {
            console.error('清理数据失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 清理备份数据
     */
    cleanupBackups() {
        const backupKeys = [];
        
        // 找到所有备份
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('ip_questionnaire_backup_')) {
                backupKeys.push(key);
            }
        }
        
        // 按时间戳排序
        backupKeys.sort();
        
        // 保留最近的10个，删除旧的
        if (backupKeys.length > 10) {
            const toDelete = backupKeys.slice(0, backupKeys.length - 10);
            toDelete.forEach(key => {
                localStorage.removeItem(key);
                console.log('删除旧备份:', key);
            });
        }
    }
    
    /**
     * 清理语音文件
     */
    cleanupVoiceFiles() {
        // 清理语音文件（base64数据）
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('voice_answer_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    // 如果语音数据超过1天，删除
                    if (data && data.timestamp) {
                        const age = Date.now() - new Date(data.timestamp).getTime();
                        const daysOld = age / (1000 * 60 * 60 * 24);
                        
                        if (daysOld > 7) { // 超过7天的语音数据
                            localStorage.removeItem(key);
                            console.log(`清理过期语音数据: ${key} (${daysOld.toFixed(1)}天)`);
                        }
                    }
                } catch (error) {
                    // 无效数据，删除
                    localStorage.removeItem(key);
                }
            }
        });
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const submissions = this.getAllSubmissions();
        
        const today = new Date().toISOString().split('T')[0];
        const recentSubmissions = submissions.filter(sub => 
            sub.submittedAt && sub.submittedAt.startsWith(today)
        );
        
        const totalAnswers = submissions.reduce((sum, sub) => 
            sum + Object.keys(sub.answers || {}).length, 0
        );
        
        const totalVoices = submissions.reduce((sum, sub) => 
            sum + Object.keys(sub.voiceAnswers || {}).length, 0
        );
        
        const uniqueContacts = new Set(
            submissions.map(sub => sub.basicInfo?.contact).filter(Boolean)
        );
        
        return {
            totalSubmissions: submissions.length,
            todaySubmissions: recentSubmissions.length,
            totalAnswers: totalAnswers,
            totalVoices: totalVoices,
            averageAnswers: submissions.length > 0 ? (totalAnswers / submissions.length).toFixed(2) : 0,
            uniqueContacts: uniqueContacts.size,
            lastSubmission: submissions.length > 0 ? submissions[submissions.length - 1].submittedAt : null
        };
    }
    
    /**
     * 生成唯一ID
     */
    generateId() {
        return 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }
    
    /**
     * 检查存储空间
     */
    checkStorageSpace() {
        try {
            const testData = new Array(1024 * 1024).join('X'); // 1MB测试数据
            const key = 'storage_test_' + Date.now();
            
            localStorage.setItem(key, testData);
            const used = localStorage.getItem(key).length;
            localStorage.removeItem(key);
            
            return {
                canStoreData: true,
                estimatedMaxItems: Math.floor((5 * 1024 * 1024) / used), // 假设localStorage限制5MB
                testSizeBytes: used
            };
        } catch (error) {
            console.warn('存储空间检查失败:', error);
            return {
                canStoreData: false,
                error: error.message
            };
        }
    }
}

// 创建全局实例
window.LocalSubmissionManager = new LocalSubmissionManager();

// 导出处理函数
function handleLocalSubmission(formData) {
    if (!window.LocalSubmissionManager) {
        console.error('本地提交管理器未初始化');
        return { success: false, error: '系统错误' };
    }
    
    const result = window.LocalSubmissionManager.saveToLocal(formData);
    
    if (result.success) {
        // 清除已保存的语音文件（避免重复占用空间）
        clearVoiceRecords();
        
        // 显示成功消息
        const stats = window.LocalSubmissionManager.getStats();
        console.log('本地保存成功，当前统计:', stats);
        
        return {
            ...result,
            stats: stats,
            message: '问卷已成功保存到本地设备'
        };
    } else {
        console.error('本地保存失败:', result.error);
        return result;
    }
}

// 全局导出函数
window.handleLocalSubmission = handleLocalSubmission;

console.log('本地提交管理器已加载');
console.log('当前本地存储状态:', window.LocalSubmissionManager.getStats());