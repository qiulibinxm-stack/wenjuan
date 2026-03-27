/**
 * 李密·IP深度挖掘问卷 - 主要逻辑
 * 支持语音回答的深度访谈问卷系统
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化所有组件
    initQuestionnaire();
    initNavigation();
    initProgressTracking();
    initFormValidation();
    initVoiceControls();
    initModal();
});

/**
 * 初始化问卷主体逻辑
 */
function initQuestionnaire() {
    console.log('初始化IP深度挖掘问卷系统...');
    
    // 监听所有文本输入框的输入事件
    const textInputs = document.querySelectorAll('.text-input');
    textInputs.forEach(input => {
        // 绑定输入事件，实时更新字数统计
        input.addEventListener('input', function() {
            updateWordCount(this);
        });
        
        // 绑定焦点事件，激活对应导航项
        input.addEventListener('focus', function() {
            const questionId = this.dataset.question;
            highlightActiveSection(questionId);
        });
        
        // 绑定失焦事件，标记完成状态
        input.addEventListener('blur', function() {
            if (this.value.trim() !== '') {
                markQuestionComplete(this.dataset.question);
            }
        });
        
        // 初始字数统计
        updateWordCount(input);
    });
    
    // 表单提交事件
    const form = document.getElementById('ipQuestionnaire');
    form.addEventListener('submit', handleFormSubmit);
}

/**
 * 初始化导航功能
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href');
            scrollToSection(sectionId);
        });
    });
    
    // 滚动时高亮当前部分
    window.addEventListener('scroll', highlightCurrentSection);
}

/**
 * 初始化进度跟踪
 */
function initProgressTracking() {
    // 监听所有输入的变化来更新进度
    const inputs = document.querySelectorAll('.text-input');
    const voiceButtons = document.querySelectorAll('.btn-voice-record');
    const allInputs = [...inputs, ...voiceButtons];
    
    allInputs.forEach(input => {
        input.addEventListener('change', updateProgress);
        input.addEventListener('input', updateProgress);
    });
    
    // 初始更新进度
    updateProgress();
}

/**
 * 初始化表单验证
 */
function initFormValidation() {
    const form = document.getElementById('ipQuestionnaire');
    const requiredInputs = form.querySelectorAll('[required]');
    
    requiredInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateInput(this);
        });
        
        input.addEventListener('input', function() {
            clearValidationError(this);
        });
    });
}

/**
 * 初始化语音控制
 */
function initVoiceControls() {
    const voiceButtons = document.querySelectorAll('.btn-voice-record');
    voiceButtons.forEach(button => {
        button.addEventListener('click', function() {
            const questionId = this.dataset.question;
            startVoiceRecording(questionId);
        });
    });
    
    // 删除语音按钮
    const removeButtons = document.querySelectorAll('.btn-remove-voice');
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const parentPlayer = this.closest('.voice-player');
            const questionId = parentPlayer.dataset.question;
            removeVoiceRecording(questionId);
        });
    });
}

/**
 * 初始化模态框
 */
function initModal() {
    // 预览按钮
    const previewBtn = document.querySelector('.btn-preview');
    if (previewBtn) {
        previewBtn.addEventListener('click', showPreview);
    }
    
    // 关闭预览按钮
    const closePreviewBtn = document.getElementById('btnClosePreview');
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', closePreview);
    }
    
    // 关闭模态框按钮
    const closeModalBtn = document.querySelector('.btn-close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closePreview);
    }
    
    // 模态框背景点击关闭
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closePreview);
    }
}

/**
 * 更新字数统计
 */
function updateWordCount(textarea) {
    const questionId = textarea.dataset.question;
    const wordCountElement = textarea.closest('.question-item')
        .querySelector('.word-count');
    
    if (wordCountElement) {
        const charCount = textarea.value.length;
        const maxLength = parseInt(textarea.getAttribute('maxlength') || '9999');
        wordCountElement.textContent = `${charCount}/${maxLength}`;
        
        // 接近限制时显示警告
        if (charCount > maxLength * 0.9) {
            wordCountElement.style.color = 'var(--warning-color)';
        } else if (charCount > maxLength * 0.75) {
            wordCountElement.style.color = 'var(--danger-color)';
        } else {
            wordCountElement.style.color = 'var(--text-light)';
        }
    }
}

/**
 * 高亮当前激活的部分
 */
function highlightActiveSection(questionId) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // 根据问题ID确定属于哪个部分（问题1-2是第一部分，以此类推）
    const sectionNum = Math.ceil(questionId / 2); // 每部分有2个问题
    const activeNavItem = document.querySelector(`.nav-item[data-section="${sectionNum}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
}

/**
 * 滚动到指定部分
 */
function scrollToSection(sectionId) {
    const section = document.querySelector(sectionId);
    if (section) {
        const headerHeight = document.querySelector('.questionnaire-header').offsetHeight;
        const offsetTop = section.offsetTop - headerHeight - 20;
        
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
        
        // 更新导航激活状态
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        const clickedNav = document.querySelector(`.nav-item[href="${sectionId}"]`);
        if (clickedNav) {
            clickedNav.classList.add('active');
        }
    }
}

/**
 * 高亮当前滚动到的部分
 */
function highlightCurrentSection() {
    const sections = document.querySelectorAll('.question-section');
    const navItems = document.querySelectorAll('.nav-item');
    
    let currentSection = null;
    
    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const headerHeight = document.querySelector('.questionnaire-header').offsetHeight;
        
        // 如果section顶部在视口中部，则视为当前section
        if (rect.top <= headerHeight + 100 && rect.bottom > headerHeight + 100) {
            currentSection = section;
        }
    });
    
    if (currentSection) {
        const sectionId = currentSection.id;
        const sectionNum = sectionId.split('-')[1];
        
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`.nav-item[data-section="${sectionNum}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
    }
}

/**
 * 标记问题已完成
 */
function markQuestionComplete(questionId) {
    const sectionNum = Math.ceil(questionId / 2);
    const navItem = document.querySelector(`.nav-item[data-section="${sectionNum}"]`);
    
    if (navItem) {
        const completionIcon = navItem.querySelector('.completion-icon');
        if (completionIcon) {
            completionIcon.classList.remove('hidden');
        }
    }
}

/**
 * 更新进度条
 */
function updateProgress() {
    const totalQuestions = 8; // 总问题数
    let answeredCount = 0;
    
    // 检查文本输入
    const textInputs = document.querySelectorAll('.text-input');
    textInputs.forEach(input => {
        if (input.value.trim() !== '') {
            answeredCount++;
        }
    });
    
    // 检查是否有语音回答（TODO: 需要与voice-recorder.js集成）
    
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (progressFill && progressText) {
        const percentage = (answeredCount / totalQuestions) * 100;
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${answeredCount}/${totalQuestions} 问题`;
    }
}

/**
 * 验证输入字段
 */
function validateInput(input) {
    const value = input.value.trim();
    
    if (input.hasAttribute('required') && value === '') {
        showValidationError(input, '此项为必填项');
        return false;
    }
    
    if (input.type === 'email' && value !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showValidationError(input, '请输入有效的邮箱地址');
            return false;
        }
    }
    
    clearValidationError(input);
    return true;
}

/**
 * 显示验证错误
 */
function showValidationError(input, message) {
    // 移除之前的错误信息
    clearValidationError(input);
    
    // 添加错误样式
    input.classList.add('error');
    
    // 创建错误消息元素
    const errorElement = document.createElement('div');
    errorElement.className = 'validation-error';
    errorElement.style.color = 'var(--danger-color)';
    errorElement.style.fontSize = '0.85rem';
    errorElement.style.marginTop = '4px';
    errorElement.textContent = message;
    
    // 插入错误信息
    input.parentNode.appendChild(errorElement);
}

/**
 * 清除验证错误
 */
function clearValidationError(input) {
    input.classList.remove('error');
    
    const existingError = input.parentNode.querySelector('.validation-error');
    if (existingError) {
        existingError.remove();
    }
}

/**
 * 开始语音录制
 */
function startVoiceRecording(questionId) {
    console.log(`开始为问题${questionId}录制语音回答`);
    
    // 显示语音录制面板
    const recorderPanel = document.getElementById('voiceRecorderPanel');
    if (recorderPanel) {
        recorderPanel.classList.remove('hidden');
        recorderPanel.dataset.currentQuestion = questionId;
        
        // 更新状态显示
        const recordingStatus = document.getElementById('recordingStatus');
        if (recordingStatus) {
            recordingStatus.textContent = '准备为问题' + questionId + '录制语音';
        }
    }
    
    // 标记问题正在进行语音录制
    const questionItem = document.querySelector(`.text-input[data-question="${questionId}"]`).closest('.question-item');
    if (questionItem) {
        questionItem.classList.add('recording-active');
    }
}

/**
 * 移除语音录制
 */
function removeVoiceRecording(questionId) {
    const voicePlayer = document.querySelector(`.voice-player[data-question="${questionId}"]`);
    const voiceControls = document.querySelector(`.voice-controls[data-question="${questionId}"]`);
    const voiceStatus = document.querySelector(`.voice-status[data-question="${questionId}"]`);
    
    if (voicePlayer) {
        voicePlayer.classList.add('hidden');
    }
    
    if (voiceControls) {
        voiceControls.classList.remove('hidden');
    }
    
    if (voiceStatus) {
        voiceStatus.querySelector('span').textContent = '点击录制语音回答';
    }
    
    // 从localStorage中删除语音数据
    const voiceDataKey = `voice_answer_${questionId}`;
    localStorage.removeItem(voiceDataKey);
    
    updateProgress();
    
    // 显示成功消息
    showToast('语音回答已删除', 'success');
}

/**
 * 处理表单提交
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    console.log('正在提交问卷...');
    
    // 验证所有必填字段
    const form = e.target;
    const requiredInputs = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredInputs.forEach(input => {
        if (!validateInput(input)) {
            isValid = false;
        }
    });
    
    // 验证至少填写了一定数量的问题
    const textInputs = document.querySelectorAll('.text-input');
    let filledCount = 0;
    textInputs.forEach(input => {
        if (input.value.trim() !== '') {
            filledCount++;
        }
    });
    
    if (filledCount < 3) {
        showToast('请至少回答3个以上的问题以获取有效分析', 'warning');
        isValid = false;
    }
    
    if (!isValid) {
        showToast('请检查并完善所有必填项', 'error');
        return;
    }
    
    // 检查隐私协议
    const privacyCheckbox = document.getElementById('privacyAgree');
    if (!privacyCheckbox.checked) {
        showToast('请同意隐私保护协议', 'error');
        return;
    }
    
    // 收集表单数据
    const formData = collectFormData();
    
    // 显示提交中状态
    const submitBtn = document.getElementById('submitQuestionnaire');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
    submitBtn.disabled = true;
    
    // 收集表单数据
    const formData = collectFormData();
    formData.id = 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // 1. 首先尝试发送邮件
    if (window.EmailSubmitter && window.EmailSubmitter.config.enabled) {
        console.log('尝试通过邮件发送问卷数据...');
        
        window.EmailSubmitter.sendQuestionnaireEmail(formData)
            .then(emailResult => {
                console.log('邮件发送结果:', emailResult);
                
                if (emailResult.success && !emailResult.disabled) {
                    // 邮件发送成功
                    showToast('问卷提交成功！数据已通过邮件发送，我们会尽快联系你', 'success');
                } else if (emailResult.disabled) {
                    // 邮件功能被禁用，使用本地存储
                    console.log('邮件功能被禁用，使用本地存储');
                    handleLocalSubmission(formData);
                } else {
                    // 邮件发送失败
                    console.warn('邮件发送失败，降级到本地存储');
                    showToast('提交成功！数据已保存（邮件发送失败，请稍后联系我们）', 'warning');
                    handleLocalSubmission(formData);
                }
                
                // 无论邮件是否成功，都显示感谢页面
                showThankYouPage(formData);
                
            })
            .catch(emailError => {
                console.error('邮件提交失败:', emailError);
                
                // 邮件失败，降级到本地存储
                handleLocalSubmission(formData);
                
                showToast('提交成功！数据已保存（邮件功能暂时不可用）', 'warning');
                showThankYouPage(formData);
                
            });
            
    } else {
        // 没有邮件配置，使用纯本地提交
        console.log('使用纯本地存储提交...');
        handleLocalSubmission(formData);
        showThankYouPage(formData);
    }
    
    // 恢复提交按钮状态
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
}

/**
 * API配置
 */
const API_CONFIG = {
    // 本地开发：使用本地存储
    // 生产环境：设置服务器API地址
    // baseUrl: 'http://localhost:3000/api',
    baseUrl: '', // 为空时使用localStorage
    useServerAPI: false // 切换为true以使用服务器API
};

/**
 * 收集表单数据
 */
function collectFormData() {
    const formData = {
        basicInfo: {
            name: document.getElementById('userName').value,
            contact: document.getElementById('userContact').value,
            email: document.getElementById('userEmail').value
        },
        answers: {},
        voiceAnswers: {}
    };
    
    // 收集所有问题答案
    const textInputs = document.querySelectorAll('.text-input');
    textInputs.forEach(input => {
        if (input.value.trim() !== '') {
            formData.answers[input.dataset.question] = input.value.trim();
        }
    });
    
    // 收集语音回答（从localStorage）
    for (let i = 1; i <= 8; i++) {
        const voiceDataKey = `voice_answer_${i}`;
        const voiceData = localStorage.getItem(voiceDataKey);
        if (voiceData) {
            formData.voiceAnswers[i] = JSON.parse(voiceData);
        }
    }
    
    return formData;
}

/**
 * 提交问卷到服务器
 */
async function submitToServer(formData) {
    if (!API_CONFIG.useServerAPI || !API_CONFIG.baseUrl) {
        // 使用本地存储
        return await saveToLocalStorage(formData);
    }
    
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`服务器错误: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 上传语音文件（如果有）
        await uploadVoiceFiles(formData.voiceAnswers, result.data?.id);
        
        return result;
        
    } catch (error) {
        console.error('提交到服务器失败:', error);
        
        // 失败时回退到本地存储
        showToast('服务器提交失败，正在保存到本地...', 'warning');
        return await saveToLocalStorage(formData);
    }
}

/**
 * 保存到本地存储
 */
async function saveToLocalStorage(formData) {
    const submissions = JSON.parse(localStorage.getItem('ip_questionnaire_submissions') || '[]');
    formData.submittedAt = new Date().toISOString();
    formData.id = 'submission_' + Date.now();
    submissions.push(formData);
    
    try {
        localStorage.setItem('ip_questionnaire_submissions', JSON.stringify(submissions));
        return {
            success: true,
            data: {
                id: formData.id,
                submittedAt: formData.submittedAt
            }
        };
    } catch (error) {
        console.error('本地存储失败:', error);
        throw error;
    }
}

/**
 * 上传语音文件
 */
async function uploadVoiceFiles(voiceAnswers, submissionId) {
    if (!voiceAnswers || !submissionId) return;
    
    const uploadPromises = [];
    
    Object.keys(voiceAnswers).forEach(questionId => {
        const voiceData = voiceAnswers[questionId];
        if (voiceData && voiceData.audioBlob) {
            uploadPromises.push(uploadSingleVoiceFile(voiceData, questionId, submissionId));
        }
    });
    
    try {
        await Promise.all(uploadPromises);
        console.log('所有语音文件上传完成');
    } catch (error) {
        console.error('部分语音文件上传失败:', error);
    }
}

/**
 * 上传单个语音文件
 */
async function uploadSingleVoiceFile(voiceData, questionId, submissionId) {
    try {
        // 将base64转换为Blob
        const base64Response = await fetch(voiceData.audioBlob);
        const blob = await base64Response.blob();
        
        const formData = new FormData();
        formData.append('voice', blob, `voice_${questionId}.webm`);
        formData.append('questionId', questionId);
        formData.append('submissionId', submissionId);
        
        const response = await fetch(`${API_CONFIG.baseUrl}/upload-voice`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`上传失败: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error(`上传语音文件失败（问题${questionId}）:`, error);
        throw error;
    }
}

/**
 * 显示预览
 */
function showPreview() {
    const previewContent = document.getElementById('previewContent');
    const formData = collectFormData();
    
    let previewHtml = `
        <div class="preview-container">
            <h4><i class="fas fa-user"></i> 基本信息</h4>
            <div class="preview-info">
                <p><strong>姓名/昵称：</strong>${formData.basicInfo.name || '未填写'}</p>
                <p><strong>联系方式：</strong>${formData.basicInfo.contact || '未填写'}</p>
                <p><strong>邮箱：</strong>${formData.basicInfo.email || '未填写'}</p>
            </div>
    `;
    
    // 添加问题回答预览
    for (let i = 1; i <= 8; i++) {
        if (formData.answers[i] || formData.voiceAnswers[i]) {
            previewHtml += `
                <div class="preview-question">
                    <h5>问题${i}</h5>
                    ${formData.answers[i] ? `<p><strong>文字回答：</strong><br>${formData.answers[i]}</p>` : ''}
                    ${formData.voiceAnswers[i] ? `<p><strong>语音回答：</strong> 已录制 (${formData.voiceAnswers[i].duration || '未知'}秒)</p>` : ''}
                </div>
            `;
        }
    }
    
    previewHtml += `
            <div class="preview-stats">
                <p><i class="fas fa-chart-bar"></i> 共填写了${Object.keys(formData.answers).length}个文字回答和${Object.keys(formData.voiceAnswers).length}个语音回答。</p>
            </div>
        </div>
    `;
    
    previewContent.innerHTML = previewHtml;
    
    // 显示模态框
    const modal = document.getElementById('previewModal');
    const overlay = document.getElementById('modalOverlay');
    
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

/**
 * 关闭预览
 */
function closePreview() {
    const modal = document.getElementById('previewModal');
    const overlay = document.getElementById('modalOverlay');
    
    modal.classList.add('hidden');
    overlay.classList.add('hidden');
}

/**
 * 显示感谢页面
 */
function showThankYouPage(formData) {
    const formContainer = document.querySelector('main');
    const originalContent = formContainer.innerHTML;
    
    const thankYouHtml = `
        <div class="thank-you-section">
            <div class="thank-you-card">
                <div class="thank-you-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2><i class="fas fa-star"></i> 问卷提交成功！</h2>
                <p class="thank-you-message">
                    感谢你花费宝贵时间完成这份深度问卷。你的真实回答是我们为你打造高转化率IP定位的基础。
                </p>
                
                <div class="thank-you-details">
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <div>
                            <h4>接下来的安排</h4>
                            <p>我们的IP顾问会在24小时内联系你，进行1对1深度访谈确认</p>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <i class="fas fa-file-alt"></i>
                        <div>
                            <h4>交付物</h4>
                            <p>你将收到一份完整的《个人IP定位诊断报告》和《短视频IP内容策略》</p>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <i class="fas fa-headset"></i>
                        <div>
                            <h4>后续支持</h4>
                            <p>如需紧急联系，请通过微信 ${formData.basicInfo.contact} 与我们顾问沟通</p>
                        </div>
                    </div>
                </div>
                
                <div class="thank-you-actions">
                    <button class="btn btn-primary" id="btnDownloadSummary">
                        <i class="fas fa-download"></i> 下载问卷摘要
                    </button>
                    <button class="btn btn-secondary" id="btnBackToForm">
                        <i class="fas fa-edit"></i> 重新填写问卷
                    </button>
                </div>
            </div>
        </div>
    `;
    
    formContainer.innerHTML = thankYouHtml;
    
    // 添加返回按钮事件
    document.getElementById('btnBackToForm').addEventListener('click', function() {
        formContainer.innerHTML = originalContent;
        initQuestionnaire();
    });
    
    // 添加下载摘要事件
    document.getElementById('btnDownloadSummary').addEventListener('click', function() {
        downloadQuestionnaireSummary(formData);
    });
}

/**
 * 下载问卷摘要
 */
function downloadQuestionnaireSummary(formData) {
    const summaryText = generateSummaryText(formData);
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `IP问卷摘要_${formData.basicInfo.name || '匿名'}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('问卷摘要下载成功', 'success');
}

/**
 * 生成摘要文本
 */
function generateSummaryText(formData) {
    let text = `李密·IP深度挖掘问卷摘要\n`;
    text += `提交时间: ${new Date(formData.submittedAt || Date.now()).toLocaleString('zh-CN')}\n`;
    text += `提交人: ${formData.basicInfo.name || '匿名'}\n`;
    text += `联系方式: ${formData.basicInfo.contact || '未提供'}\n`;
    text += `邮箱: ${formData.basicInfo.email || '未提供'}\n\n`;
    text += `==================== 问卷回答 ====================\n\n`;
    
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
    
    for (let i = 1; i <= 8; i++) {
        if (formData.answers[i] || formData.voiceAnswers[i]) {
            text += `${questionTitles[i-1]}\n`;
            if (formData.answers[i]) {
                text += `文字回答: ${formData.answers[i]}\n`;
            }
            if (formData.voiceAnswers[i]) {
                text += `语音回答: 已录制 (${formData.voiceAnswers[i].duration || '未知'}秒)\n`;
            }
            text += `\n`;
        }
    }
    
    text += `\n==================== 分析建议 ====================\n`;
    text += `请与IP顾问预约1对1深度访谈，基于以上回答制定完整IP策略。\n`;
    
    return text;
}

/**
 * 清除语音记录
 */
function clearVoiceRecords() {
    for (let i = 1; i <= 8; i++) {
        const voiceDataKey = `voice_answer_${i}`;
        localStorage.removeItem(voiceDataKey);
        
        // 重置UI
        const voicePlayer = document.querySelector(`.voice-player[data-question="${i}"]`);
        const voiceControls = document.querySelector(`.voice-controls[data-question="${i}"]`);
        const voiceStatus = document.querySelector(`.voice-status[data-question="${i}"]`);
        
        if (voicePlayer) voicePlayer.classList.add('hidden');
        if (voiceControls) voiceControls.classList.remove('hidden');
        if (voiceStatus) voiceStatus.querySelector('span').textContent = '点击录制语音回答';
    }
}

/**
 * 显示消息提示
 */
function showToast(message, type = 'info') {
    // 移除之前的toast
    const existingToasts = document.querySelectorAll('.toast-message');
    existingToasts.forEach(toast => toast.remove());
    
    // 创建新的toast
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    // 添加样式
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getToastColor(type)};
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    
    // 添加动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .toast-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
        }
    `;
    document.head.appendChild(style);
    
    // 添加关闭按钮事件
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => toast.remove());
    
    document.body.appendChild(toast);
    
    // 自动消失
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

/**
 * 获取toast图标
 */
function getToastIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

/**
 * 获取toast颜色
 */
function getToastColor(type) {
    switch(type) {
        case 'success': return 'var(--secondary-color)';
        case 'error': return 'var(--danger-color)';
        case 'warning': return 'var(--warning-color)';
        default: return 'var(--info-color)';
    }
}

// 导出全局函数以便其他脚本调用
window.QuestionnaireSystem = {
    showPreview,
    startVoiceRecording,
    removeVoiceRecording,
    collectFormData
};

console.log('问卷系统初始化完成');