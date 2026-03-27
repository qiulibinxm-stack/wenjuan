<?php
/**
 * 问卷提交API - PHP版本
 * 处理问卷数据提交和语音文件上传
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 设置时区
date_default_timezone_set('Asia/Shanghai');

// 错误处理
error_reporting(E_ALL);
ini_set('display_errors', 0);

// 响应助手函数
function jsonResponse($success = true, $message = '', $data = null, $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// 记录日志
function logActivity($action, $data = []) {
    $logDir = __DIR__ . '/../logs/';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logFile = $logDir . 'questionnaire_' . date('Y-m-d') . '.log';
    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'action' => $action,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ] + $data;
    
    file_put_contents($logFile, json_encode($logData, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND);
}

// 验证请求
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, '只支持POST请求', null, 405);
}

// 获取原始POST数据
$rawData = file_get_contents('php://input');
$jsonData = json_decode($rawData, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    jsonResponse(false, 'JSON数据格式错误: ' . json_last_error_msg(), null, 400);
}

// 验证必要字段
$requiredFields = ['basicInfo', 'answers'];
foreach ($requiredFields as $field) {
    if (!isset($jsonData[$field])) {
        jsonResponse(false, "缺少必要字段: {$field}", null, 400);
    }
}

try {
    // 处理数据
    $submissionData = processSubmission($jsonData);
    
    // 保存到数据库/文件
    $saved = saveSubmission($submissionData);
    
    if ($saved) {
        // 记录成功日志
        logActivity('questionnaire_submit', [
            'name' => $jsonData['basicInfo']['name'] ?? 'anonymous',
            'answers_count' => count($jsonData['answers']),
            'voice_count' => isset($jsonData['voiceAnswers']) ? count($jsonData['voiceAnswers']) : 0
        ]);
        
        // 发送通知（可选）
        sendNotification($submissionData);
        
        jsonResponse(true, '问卷提交成功', [
            'id' => $submissionData['id'],
            'submitted_at' => $submissionData['submitted_at']
        ]);
    } else {
        throw new Exception('保存数据时失败');
    }
    
} catch (Exception $e) {
    // 记录错误日志
    logActivity('error', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    jsonResponse(false, '提交失败: ' . $e->getMessage(), null, 500);
}

/**
 * 处理提交数据
 */
function processSubmission($data) {
    $timestamp = date('Y-m-d H:i:s');
    $id = 'SUB_' . date('YmdHis') . '_' . substr(md5(uniqid()), 0, 8);
    
    // 清理和验证基础信息
    $basicInfo = [
        'name' => filter_var($data['basicInfo']['name'] ?? '', FILTER_SANITIZE_STRING),
        'contact' => filter_var($data['basicInfo']['contact'] ?? '', FILTER_SANITIZE_STRING),
        'email' => filter_email($data['basicInfo']['email'] ?? ''),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ];
    
    // 处理答案
    $answers = [];
    foreach ($data['answers'] as $questionId => $answer) {
        if (is_string($answer)) {
            $answers[$questionId] = [
                'text' => trim(substr($answer, 0, 2000)), // 限制长度
                'type' => 'text'
            ];
        }
    }
    
    // 处理语音回答
    $voiceAnswers = [];
    if (isset($data['voiceAnswers'])) {
        foreach ($data['voiceAnswers'] as $questionId => $voiceData) {
            if (isset($voiceData['audioBlob'])) {
                $voiceFile = saveVoiceFile($voiceData['audioBlob'], $questionId, $id);
                if ($voiceFile) {
                    $voiceAnswers[$questionId] = [
                        'file_path' => $voiceFile,
                        'duration' => $voiceData['duration'] ?? 0,
                        'file_size' => $voiceData['fileSize'] ?? 0
                    ];
                }
            }
        }
    }
    
    return [
        'id' => $id,
        'submitted_at' => $timestamp,
        'basic_info' => $basicInfo,
        'answers' => $answers,
        'voice_answers' => $voiceAnswers,
        'status' => 'pending',
        'analysis_completed' => false
    ];
}

/**
 * 保存语音文件
 */
function saveVoiceFile($base64Data, $questionId, $submissionId) {
    // 检查是否是base64格式
    if (strpos($base64Data, 'data:audio/') !== 0) {
        return null;
    }
    
    // 获取MIME类型和纯base64数据
    list($type, $data) = explode(';', $base64Data);
    list(, $base64) = explode(',', $data);
    list(, $extension) = explode('/', $type);
    $extension = explode(';', $extension)[0];
    
    // 解码base64
    $audioData = base64_decode($base64);
    if (!$audioData) {
        return null;
    }
    
    // 创建存储目录
    $voiceDir = __DIR__ . '/../../uploads/voices/' . date('Y/m/d/');
    if (!is_dir($voiceDir)) {
        mkdir($voiceDir, 0755, true);
    }
    
    // 生成文件名
    $filename = sprintf('%s_%s_%s.%s', 
        $submissionId, 
        $questionId,
        substr(md5(uniqid()), 0, 8),
        $extension);
    
    $filePath = $voiceDir . $filename;
    
    // 保存文件
    if (file_put_contents($filePath, $audioData)) {
        return 'voices/' . date('Y/m/d/') . $filename;
    }
    
    return null;
}

/**
 * 保存提交数据
 */
function saveSubmission($data) {
    // 方式1：保存到JSON文件
    $storageDir = __DIR__ . '/../storage/submissions/';
    if (!is_dir($storageDir)) {
        mkdir($storageDir, 0755, true);
    }
    
    $filePath = $storageDir . $data['id'] . '.json';
    $jsonData = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
    return file_put_contents($filePath, $jsonData) !== false;
    
    /*
    // 方式2：保存到MySQL数据库（可选）
    // 需要预先创建数据库表
    $pdo = new PDO('mysql:host=localhost;dbname=questionnaire;charset=utf8mb4', 
                   'username', 'password');
    
    $stmt = $pdo->prepare('INSERT INTO submissions 
        (id, basic_info, answers, voice_answers, submitted_at, status) 
        VALUES (?, ?, ?, ?, ?, ?)');
    
    return $stmt->execute([
        $data['id'],
        json_encode($data['basic_info']),
        json_encode($data['answers']),
        json_encode($data['voice_answers']),
        $data['submitted_at'],
        $data['status']
    ]);
    */
}

/**
 * 发送通知
 */
function sendNotification($data) {
    // 发送邮件通知
    if (isset($data['basic_info']['email']) && $data['basic_info']['email']) {
        sendEmailNotification($data['basic_info']['email'], $data);
    }
    
    // 发送微信通知（需要配置）
    // sendWeChatNotification($data);
    
    return true;
}

/**
 * 发送邮件通知
 */
function sendEmailNotification($email, $data) {
    $subject = '【李密IP问卷】您有新问卷提交 - ' . $data['basic_info']['name'];
    
    $message = "
        <h3>新问卷提交通知</h3>
        <p><strong>提交时间：</strong>{$data['submitted_at']}</p>
        <p><strong>提交人：</strong>{$data['basic_info']['name']}</p>
        <p><strong>联系方式：</strong>{$data['basic_info']['contact']}</p>
        <p><strong>回答数量：</strong>" . count($data['answers']) . "个文字回答，"
                . count($data['voice_answers']) . "个语音回答</p>
        <hr>
        <p>问卷ID：{$data['id']}</p>
        <p>请及时查看并安排后续分析工作。</p>
    ";
    
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=utf-8',
        'From: 李密IP问卷系统 <noreply@limi-ip.com>',
        'Reply-To: support@limi-ip.com'
    ];
    
    // 实际发送邮件代码（使用SMTP或mail函数）
    // mail($email, $subject, $message, implode("\r\n", $headers));
    
    // 记录已尝试发送邮件
    $logDir = __DIR__ . '/../logs/';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $emailLog = $logDir . 'email_notifications.log';
    file_put_contents($emailLog, 
        date('Y-m-d H:i:s') . " - To: {$email}\n", 
        FILE_APPEND);
}

/**
 * 过滤和验证邮箱
 */
function filter_email($email) {
    $email = filter_var($email, FILTER_SANITIZE_EMAIL);
    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
}
?>