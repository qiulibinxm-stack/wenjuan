/**
 * 语音录制功能 - 支持HTML5录音API
 */

class VoiceRecorder {
    constructor() {
        this.recorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isPaused = false;
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.currentQuestionId = null;
        
        // 音频上下文用于可视化
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.visualizerCanvas = null;
        this.visualizerCtx = null;
        this.animationFrameId = null;
        
        this.init();
    }
    
    init() {
        console.log('初始化语音录制系统...');
        
        this.bindEvents();
        this.checkBrowserSupport();
        this.initVisualizer();
    }
    
    bindEvents() {
        // 录制按钮事件
        const recordStartBtn = document.getElementById('btnRecordStart');
        const recordPauseBtn = document.getElementById('btnRecordPause');
        const recordResumeBtn = document.getElementById('btnRecordResume');
        const recordStopBtn = document.getElementById('btnRecordStop');
        const recordDiscardBtn = document.querySelector('.btn-record-discard');
        const closeRecorderBtn = document.querySelector('.btn-close-recorder');
        
        if (recordStartBtn) {
            recordStartBtn.addEventListener('click', () => this.startRecording());
        }
        
        if (recordPauseBtn) {
            recordPauseBtn.addEventListener('click', () => this.pauseRecording());
        }
        
        if (recordResumeBtn) {
            recordResumeBtn.addEventListener('click', () => this.resumeRecording());
        }
        
        if (recordStopBtn) {
            recordStopBtn.addEventListener('click', () => this.stopRecording());
        }
        
        if (recordDiscardBtn) {
            recordDiscardBtn.addEventListener('click', () => this.discardRecording());
        }
        
        if (closeRecorderBtn) {
            closeRecorderBtn.addEventListener('click', () => this.closeRecorder());
        }
    }
    
    checkBrowserSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showBrowserError('你的浏览器不支持录音功能。请使用最新版本的Chrome、Firefox或Edge浏览器。');
            return false;
        }
        
        // 检查MediaRecorder支持
        if (typeof MediaRecorder === 'undefined') {
            this.showBrowserError('你的浏览器不支持MediaRecorder API。请更新浏览器或更换浏览器。');
            return false;
        }
        
        return true;
    }
    
    initVisualizer() {
        this.visualizerCanvas = document.getElementById('voiceVisualizer');
        if (!this.visualizerCanvas) return;
        
        this.visualizerCtx = this.visualizerCanvas.getContext('2d');
        this.resizeVisualizer();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => this.resizeVisualizer());
    }
    
    resizeVisualizer() {
        if (!this.visualizerCanvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = this.visualizerCanvas.getBoundingClientRect();
        
        this.visualizerCanvas.width = rect.width * dpr;
        this.visualizerCanvas.height = rect.height * dpr;
        
        this.visualizerCtx.scale(dpr, dpr);
        
        if (!this.isRecording) {
            this.drawIdleVisualizer();
        }
    }
    
    drawIdleVisualizer() {
        if (!this.visualizerCtx) return;
        
        const width = this.visualizerCanvas.width / (window.devicePixelRatio || 1);
        const height = this.visualizerCanvas.height / (window.devicePixelRatio || 1);
        
        this.visualizerCtx.clearRect(0, 0, width, height);
        
        // 绘制背景
        this.visualizerCtx.fillStyle = '#f5f5f5';
        this.visualizerCtx.fillRect(0, 0, width, height);
        
        // 绘制等待录音的提示
        this.visualizerCtx.fillStyle = '#ccc';
        this.visualizerCtx.font = '14px Arial';
        this.visualizerCtx.textAlign = 'center';
        this.visualizerCtx.textBaseline = 'middle';
        this.visualizerCtx.fillText('点击"开始录制"按钮开始录音', width / 2, height / 2);
    }
    
    async startRecording() {
        // 获取当前问题ID
        const recorderPanel = document.getElementById('voiceRecorderPanel');
        this.currentQuestionId = recorderPanel ? recorderPanel.dataset.currentQuestion : null;
        
        if (!this.checkBrowserSupport()) {
            return;
        }
        
        try {
            // 请求麦克风权限
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1, // 单声道
                    sampleRate: 44100, // 采样率
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // 初始化音频上下文用于可视化
            this.initAudioContext(stream);
            
            // 创建MediaRecorder
            const options = {
                mimeType: this.getSupportedMimeType(),
                audioBitsPerSecond: 128000 // 128kbps，良好的音质
            };
            
            console.log('使用MIME类型:', options.mimeType);
            this.recorder = new MediaRecorder(stream, options);
            this.audioChunks = [];
            
            // 监听数据可用事件
            this.recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            // 监听录制停止事件
            this.recorder.onstop = () => this.handleRecordingStop();
            
            // 监听录制错误事件
            this.recorder.onerror = (event) => {
                console.error('录音错误:', event.error);
                this.showRecordingError('录音过程中出现错误: ' + event.error.message);
                this.resetRecording();
            };
            
            // 开始录制
            this.recorder.start(100); // 每100ms收集一次数据
            this.isRecording = true;
            this.isPaused = false;
            this.recordingStartTime = Date.now();
            
            this.updateUIState('recording');
            this.startTimer();
            this.startVisualizer();
            
            console.log('开始录制语音回答，问题ID:', this.currentQuestionId);
            
        } catch (error) {
            console.error('无法开始录音:', error);
            
            if (error.name === 'NotAllowedError') {
                this.showRecordingError('需要麦克风权限。请允许网站访问你的麦克风，然后重试。');
            } else if (error.name === 'NotFoundError') {
                this.showRecordingError('未找到麦克风设备。请确保已连接麦克风。');
            } else {
                this.showRecordingError('无法开始录音: ' + error.message);
            }
        }
    }
    
    initAudioContext(stream) {
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        
        this.analyser.fftSize = 256;
        this.source.connect(this.analyser);
    }
    
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/ogg;codecs=opus',
            'audio/mp4',
            'audio/webm',
            'audio/ogg;codecs=vorbis'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        // 如果没有支持的编码，返回浏览器默认
        return '';
    }
    
    pauseRecording() {
        if (!this.recorder || !this.isRecording || this.isPaused) return;
        
        this.recorder.pause();
        this.isPaused = true;
        this.updateUIState('paused');
        this.stopVisualizer();
        
        console.log('录音已暂停');
    }
    
    resumeRecording() {
        if (!this.recorder || !this.isRecording || !this.isPaused) return;
        
        this.recorder.resume();
        this.isPaused = false;
        this.updateUIState('recording');
        this.startVisualizer();
        
        console.log('录音已恢复');
    }
    
    async stopRecording() {
        if (!this.recorder || !this.isRecording) return;
        
        this.recorder.stop();
        this.isRecording = false;
        this.isPaused = false;
        
        this.stopTimer();
        this.stopVisualizer();
        this.updateUIState('stopped');
        
        // 停止所有音轨
        if (this.recorder.stream) {
            this.recorder.stream.getTracks().forEach(track => track.stop());
        }
        
        console.log('录音已停止，等待数据处理...');
    }
    
    async handleRecordingStop() {
        if (this.audioChunks.length === 0) {
            console.warn('没有录制到音频数据');
            this.showRecordingError('没有检测到声音，请重新录制。');
            this.resetRecording();
            return;
        }
        
        try {
            const audioBlob = new Blob(this.audioChunks, { type: this.recorder.mimeType });
            const duration = Date.now() - this.recordingStartTime;
            
            // 创建音频URL用于预览
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // 保存录音数据
            await this.saveRecording(audioBlob, audioUrl, duration);
            
            // 显示成功消息
            this.showRecordingSuccess();
            
            // 关闭录音面板
            setTimeout(() => this.closeRecorder(), 1000);
            
        } catch (error) {
            console.error('处理录音数据时出错:', error);
            this.showRecordingError('处理录音数据时出错: ' + error.message);
        } finally {
            this.resetRecording();
        }
    }
    
    async saveRecording(blob, url, duration) {
        if (!this.currentQuestionId) {
            throw new Error('未指定问题ID');
        }
        
        // 转换为base64以便存储（限制大小）
        const base64Audio = await this.blobToBase64(blob);
        
        // 准备录音数据
        const voiceData = {
            questionId: this.currentQuestionId,
            audioBlob: base64Audio,
            audioUrl: url,
            mimeType: blob.type,
            duration: Math.round(duration / 1000), // 转换为秒
            fileSize: blob.size,
            timestamp: new Date().toISOString()
        };
        
        // 保存到localStorage（实际项目中应上传到服务器）
        const storageKey = `voice_answer_${this.currentQuestionId}`;
        localStorage.setItem(storageKey, JSON.stringify(voiceData));
        
        console.log(`语音回答已保存到localStorage (${storageKey}):`, voiceData);
        
        // 更新UI显示语音播放器
        this.updateVoicePlayer(voiceData);
        
        return voiceData;
    }
    
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                resolve(base64data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    updateVoicePlayer(voiceData) {
        const questionId = voiceData.questionId;
        
        // 隐藏语音控制按钮
        const voiceControls = document.querySelector(`.voice-controls[data-question="${questionId}"]`);
        if (voiceControls) {
            voiceControls.classList.add('hidden');
        }
        
        // 显示语音播放器
        const voicePlayer = document.querySelector(`.voice-player[data-question="${questionId}"]`);
        if (voicePlayer) {
            voicePlayer.classList.remove('hidden');
            
            // 更新音频播放器
            const audioPlayer = voicePlayer.querySelector('.audio-player');
            if (audioPlayer) {
                audioPlayer.src = voiceData.audioUrl;
                audioPlayer.load();
            }
            
            // 更新语音状态
            const voiceStatus = document.querySelector(`.voice-status[data-question="${questionId}"] span`);
            if (voiceStatus) {
                voiceStatus.textContent = `已录制 (${voiceData.duration}秒)`;
            }
        }
        
        // 标记问题完成
        if (window.QuestionnaireSystem && window.QuestionnaireSystem.markQuestionComplete) {
            window.QuestionnaireSystem.markQuestionComplete(questionId);
        }
        
        // 更新进度
        if (window.QuestionnaireSystem && window.QuestionnaireSystem.updateProgress) {
            window.QuestionnaireSystem.updateProgress();
        }
    }
    
    discardRecording() {
        if (this.isRecording) {
            this.stopRecording();
        }
        
        this.resetRecording();
        this.closeRecorder();
        
        console.log('录音已放弃');
    }
    
    resetRecording() {
        this.isRecording = false;
        this.isPaused = false;
        this.recordingStartTime = null;
        this.audioChunks = [];
        
        this.stopTimer();
        this.stopVisualizer();
        this.updateUIState('idle');
        
        // 关闭音频上下文
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
            this.analyser = null;
            this.source = null;
        }
        
        // 停止所有媒体流
        if (this.recorder && this.recorder.stream) {
            this.recorder.stream.getTracks().forEach(track => track.stop());
        }
        
        this.recorder = null;
    }
    
    startTimer() {
        this.stopTimer();
        
        const timerElement = document.getElementById('recordingTimer');
        if (!timerElement) return;
        
        this.recordingStartTime = Date.now();
        
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            
            // 如果录制超过5分钟，自动停止（防止内存占用过大）
            if (minutes >= 5) {
                this.stopRecording();
                this.showRecordingError('录音时间过长，已自动停止。建议分段录制。');
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    startVisualizer() {
        if (!this.visualizerCanvas || !this.analyser) return;
        
        this.stopVisualizer();
        this.drawVisualizer();
    }
    
    drawVisualizer() {
        if (!this.visualizerCanvas || !this.analyser || !this.isRecording || this.isPaused) {
            return;
        }
        
        const width = this.visualizerCanvas.width / (window.devicePixelRatio || 1);
        const height = this.visualizerCanvas.height / (window.devicePixelRatio || 1);
        
        this.visualizerCtx.clearRect(0, 0, width, height);
        
        // 获取音频数据
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        
        // 绘制频谱
        const barWidth = (width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * height;
            
            // 创建渐变颜色
            const gradient = this.visualizerCtx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, '#1890ff');
            gradient.addColorStop(0.7, '#13c2c2');
            gradient.addColorStop(1, '#52c41a');
            
            this.visualizerCtx.fillStyle = gradient;
            this.visualizerCtx.fillRect(x, height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
        
        this.animationFrameId = requestAnimationFrame(() => this.drawVisualizer());
    }
    
    stopVisualizer() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        if (this.visualizerCanvas) {
            this.drawIdleVisualizer();
        }
    }
    
    updateUIState(state) {
        // 更新按钮可见性
        const startBtn = document.getElementById('btnRecordStart');
        const pauseBtn = document.getElementById('btnRecordPause');
        const resumeBtn = document.getElementById('btnRecordResume');
        const stopBtn = document.getElementById('btnRecordStop');
        
        // 更新状态文本
        const statusElement = document.getElementById('recordingStatus');
        const indicatorElement = document.querySelector('.recording-indicator');
        
        switch (state) {
            case 'idle':
                if (startBtn) startBtn.classList.remove('hidden');
                if (pauseBtn) pauseBtn.classList.add('hidden');
                if (resumeBtn) resumeBtn.classList.add('hidden');
                if (stopBtn) stopBtn.classList.add('hidden');
                
                if (statusElement) statusElement.textContent = '准备录制';
                if (indicatorElement) indicatorElement.style.animation = 'none';
                break;
                
            case 'recording':
                if (startBtn) startBtn.classList.add('hidden');
                if (pauseBtn) pauseBtn.classList.remove('hidden');
                if (resumeBtn) resumeBtn.classList.add('hidden');
                if (stopBtn) stopBtn.classList.remove('hidden');
                
                if (statusElement) statusElement.textContent = '正在录制...';
                if (indicatorElement) {
                    indicatorElement.style.animation = 'pulse 1s infinite';
                    indicatorElement.style.color = 'var(--danger-color)';
                }
                break;
                
            case 'paused':
                if (startBtn) startBtn.classList.add('hidden');
                if (pauseBtn) pauseBtn.classList.add('hidden');
                if (resumeBtn) resumeBtn.classList.remove('hidden');
                if (stopBtn) stopBtn.classList.remove('hidden');
                
                if (statusElement) statusElement.textContent = '已暂停';
                if (indicatorElement) {
                    indicatorElement.style.animation = 'none';
                    indicatorElement.style.color = 'var(--warning-color)';
                }
                break;
                
            case 'stopped':
                if (startBtn) startBtn.classList.remove('hidden');
                if (pauseBtn) pauseBtn.classList.add('hidden');
                if (resumeBtn) resumeBtn.classList.add('hidden');
                if (stopBtn) stopBtn.classList.add('hidden');
                
                if (statusElement) statusElement.textContent = '正在处理...';
                if (indicatorElement) indicatorElement.style.animation = 'none';
                break;
        }
    }
    
    closeRecorder() {
        const recorderPanel = document.getElementById('voiceRecorderPanel');
        if (recorderPanel) {
            recorderPanel.classList.add('hidden');
        }
        
        // 如果有正在进行的录音，先停止
        if (this.isRecording) {
            this.discardRecording();
        }
    }
    
    showRecordingSuccess() {
        if (window.QuestionnaireSystem && window.QuestionnaireSystem.showToast) {
            window.QuestionnaireSystem.showToast('语音回答录制成功！', 'success');
        } else {
            alert('语音回答录制成功！');
        }
    }
    
    showRecordingError(message) {
        if (window.QuestionnaireSystem && window.QuestionnaireSystem.showToast) {
            window.QuestionnaireSystem.showToast(message, 'error');
        } else {
            alert('错误: ' + message);
        }
    }
    
    showBrowserError(message) {
        console.error('浏览器不支持:', message);
        
        // 禁用录音按钮
        const voiceButtons = document.querySelectorAll('.btn-voice-record');
        voiceButtons.forEach(button => {
            button.disabled = true;
            button.title = '浏览器不支持录音功能';
            button.innerHTML = '<i class="fas fa-ban"></i> <span>浏览器不支持</span>';
        });
        
        // 显示错误提示
        const recorderPanel = document.getElementById('voiceRecorderPanel');
        if (recorderPanel) {
            const content = recorderPanel.querySelector('.recorder-content');
            if (content) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'browser-error';
                errorDiv.innerHTML = `
                    <div style="background: #fff2f0; border: 1px solid #ffccc7; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                        <h4 style="color: #cf1322; margin-bottom: 8px;">
                            <i class="fas fa-exclamation-triangle"></i> 浏览器不支持
                        </h4>
                        <p style="color: #595959; margin-bottom: 8px;">${message}</p>
                        <p style="color: #8c8c8c; font-size: 0.9rem;">
                            建议使用最新版本的 Chrome、Firefox 或 Edge 浏览器。
                        </p>
                    </div>
                `;
                content.insertBefore(errorDiv, content.firstChild);
            }
        }
    }
}

// 页面加载完成后初始化语音录制系统
document.addEventListener('DOMContentLoaded', function() {
    window.VoiceRecorder = new VoiceRecorder();
    
    // 绑定语音录制按钮事件
    const voiceButtons = document.querySelectorAll('.btn-voice-record');
    voiceButtons.forEach(button => {
        button.addEventListener('click', function() {
            const questionId = this.dataset.question;
            const recorderPanel = document.getElementById('voiceRecorderPanel');
            
            if (recorderPanel) {
                recorderPanel.classList.remove('hidden');
                recorderPanel.dataset.currentQuestion = questionId;
                
                // 更新状态显示
                const recordingStatus = document.getElementById('recordingStatus');
                if (recordingStatus) {
                    recordingStatus.textContent = `准备为问题${questionId}录制语音回答`;
                }
            }
        });
    });
});

console.log('语音录制系统已加载');