/**
 * 測驗系統 (Quiz System)
 * Copyright © 2024 Ying-Fan Lin
 * All rights reserved.
 * 
 * 此代碼受版權法保護。未經作者明確許可，
 * 不得以任何形式複製、修改或分發本軟件。
 */

// 測驗系統設定
const CONFIG = {
    maxQuestionsPerQuiz: 10,  // 每次測驗的最大題目數量
    questionsPath: window.location.hostname.includes('github.io') 
        ? './questions/'  // 修改為相對路徑
        : './questions/',  // 本地開發路徑
    isLocalDevelopment: !window.location.hostname.includes('github.io')
};

// 修改變量定義
let currentQuiz = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let studentName = '';
let quizInfo = null;
let startTime = null;
let endTime = null;

// 添加文件上傳相關變量
let uploadedQuestions = null;

// 題庫列表
let availableQuizzes = [];

// DOM 元素變量
let startScreen, quizScreen, resultScreen, studentNameInput, startBtn;
let questionText, optionsContainer, nextBtn, finalScore, contributionScore;
let feedback, wrongQuestions, fileInput, uploadBtn, saveResultButton, quizInfoDiv;
let quizList;  // 明確定義quizList變量

// 等待DOM完全加載後初始化
document.addEventListener('DOMContentLoaded', initializeApp);

// 初始化應用程序
function initializeApp() {
    console.log('初始化測驗系統...');

    // 獲取所有DOM元素
    startScreen = document.getElementById('start-screen');
    quizScreen = document.getElementById('quiz-screen');
    resultScreen = document.getElementById('result-screen');
    studentNameInput = document.getElementById('student-name');
    startBtn = document.getElementById('start-btn');
    questionText = document.getElementById('question-text');
    optionsContainer = document.getElementById('options-container');
    nextBtn = document.getElementById('next-btn');
    finalScore = document.getElementById('final-score');
    contributionScore = document.getElementById('contribution-score');
    feedback = document.getElementById('feedback');
    wrongQuestions = document.getElementById('wrong-questions');
    fileInput = document.getElementById('questionFile');
    uploadBtn = document.getElementById('uploadBtn');
    saveResultButton = document.getElementById('save-result');
    quizInfoDiv = document.getElementById('quizInfo');
    quizList = document.getElementById('quiz-list');

    // 確保必要的DOM元素存在
    if (!quizList) {
        console.warn('找不到題庫列表容器，嘗試創建一個');
        quizList = document.createElement('div');
        quizList.id = 'quiz-list';
        quizList.className = 'quiz-list';
        quizList.style.display = 'none';
        
        // 找到合適的位置插入題庫列表
        const inputGroup = document.querySelector('.input-group');
        if (inputGroup) {
            if (quizInfoDiv) {
                inputGroup.insertBefore(quizList, quizInfoDiv);
            } else {
                inputGroup.appendChild(quizList);
            }
        } else if (startScreen) {
            startScreen.appendChild(quizList);
        } else {
            document.body.appendChild(quizList);
            console.error('無法找到合適的容器來放置題庫列表');
        }
    }

    // 添加事件監聽器
    if (uploadBtn) {
        uploadBtn.addEventListener('click', handleUploadBtnClick);
    } else {
        console.error('找不到上傳按鈕元素');
    }

    if (studentNameInput) {
        studentNameInput.addEventListener('input', () => {
            const name = studentNameInput.value.trim();
            startBtn.disabled = !name || !currentQuestions;
        });
    }

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            studentName = studentNameInput.value.trim();
            if (!studentName || !currentQuestions) return;

            try {
                startQuiz();
            } catch (error) {
                console.error('開始測驗失敗:', error);
                alert('開始測驗失敗，請稍後再試');
            }
        });
    }

    // 防止重新整理和重複作答
    window.onbeforeunload = function() {
        return "確定要離開測驗嗎？您的進度將會遺失。";
    };
}

// 處理上傳按鈕點擊事件
async function handleUploadBtnClick() {
    try {
        // 重新載入可用題庫
        await loadAvailableQuizzes();
        
        if (availableQuizzes.length === 0) {
            alert('未找到任何題庫文件。請確保questions目錄中有可用的題庫文件。');
            return;
        }
        
        // 直接顯示題庫列表，不使用對話框
        displayQuizList();
        
    } catch (error) {
        console.error('載入題庫失敗:', error);
        alert('載入題庫失敗：' + error.message + '\n請確保 questions 目錄中有正確的題庫文件。');
    }
}

// 載入可用題庫
async function loadAvailableQuizzes() {
    try {
        console.log('正在載入題庫列表...');
        console.log('當前路徑:', CONFIG.questionsPath);
        console.log('是否本地開發:', CONFIG.isLocalDevelopment);
        
        // 預設的題庫文件名列表（確保原有題庫文件被包含）
        const possibleQuizFiles = [
            "final_island_questions.json",
            "barker1988_questions_complete_corrected.json",
            "lagging_model_questions_complete.json",
            "quiz_1.json",
            "questions_2.json",
            "test_3.json",
            "exam_4.json"
        ];
        
        // 如果是本地開發環境，使用內嵌的題庫列表
        if (CONFIG.isLocalDevelopment) {
            console.log('檢測到本地開發環境，使用內嵌題庫列表');
            const defaultQuizzes = [
                {
                    name: "海島組測驗",
                    file: "island_questions.json",
                    description: "與海島環境研究相關的測驗"
                },
                {
                    name: "定向組測驗",
                    file: "dingxiang_questions.json",
                    description: "與定向研究相關的測驗"
                },
                {
                    name: "預想組測驗",
                    file: "yuxiang_questions.json",
                    description: "與預想研究相關的測驗"
                },
                {
                    name: "熱力組測驗",
                    file: "thermal_questions.json",
                    description: "與熱力研究相關的測驗"
                }
            ];
            
            availableQuizzes = defaultQuizzes;
            console.log('使用內嵌題庫列表:', availableQuizzes);
            displayQuizList();
            return;
        }
        
        // 自動探測題庫文件
        availableQuizzes = [];
        console.log('開始自動探測questions目錄中的JSON文件');
        
        // 先檢查預設的題庫文件
        for (const file of possibleQuizFiles) {
            try {
                const response = await fetch(CONFIG.questionsPath + file);
                if (response.ok) {
                    try {
                        const quizData = await response.json();
                        if (quizData && quizData.questions) {
                            availableQuizzes.push({
                                name: quizData.info?.name || file.replace(/_/g, ' ').replace('.json', ''),
                                file: file,
                                description: quizData.info?.description || '自動探測的題庫'
                            });
                            console.log(`發現題庫文件: ${file}`);
                        }
                    } catch (parseError) {
                        console.log(`題庫文件 ${file} 格式無效:`, parseError);
                    }
                }
            } catch (error) {
                console.log(`檢查題庫文件 ${file} 時出錯:`, error);
            }
        }
        
        // 嘗試尋找更多題庫文件（通過命名模式）
        const filePatterns = [
            "questions_*.json", 
            "quiz_*.json", 
            "test_*.json", 
            "exam_*.json"
        ];
        
        // 嘗試使用通配符數字來探測更多文件
        for (let i = 1; i <= 20; i++) {
            const potentialFiles = [
                `questions_${i}.json`,
                `quiz_${i}.json`,
                `test_${i}.json`,
                `exam_${i}.json`
            ];
            
            for (const file of potentialFiles) {
                // 檢查是否已經添加過這個文件
                if (availableQuizzes.some(q => q.file === file)) {
                    continue;
                }
                
                try {
                    const response = await fetch(CONFIG.questionsPath + file);
                    if (response.ok) {
                        try {
                            const quizData = await response.json();
                            if (quizData && quizData.questions) {
                                availableQuizzes.push({
                                    name: quizData.info?.name || file.replace(/_/g, ' ').replace('.json', ''),
                                    file: file,
                                    description: quizData.info?.description || '自動探測的題庫'
                                });
                                console.log(`發現題庫文件: ${file}`);
                            }
                        } catch (parseError) {
                            console.log(`題庫文件 ${file} 格式無效:`, parseError);
                        }
                    }
                } catch (error) {
                    // 靜默失敗，因為我們只是在嘗試探測可能的文件
                }
            }
        }
        
        // 嘗試加載quiz_list.json作為補充（不再優先，只作為補充）
        try {
            const quizListUrl = CONFIG.questionsPath + 'quiz_list.json';
            console.log('補充方式從quiz_list.json載入題庫列表:', quizListUrl);
            
            const response = await fetch(quizListUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.quizzes && Array.isArray(data.quizzes)) {
                    console.log('從quiz_list.json找到題庫列表:', data.quizzes);
                    
                    // 合併題庫，避免重複添加
                    for (const quiz of data.quizzes) {
                        if (!availableQuizzes.some(q => q.file === quiz.file)) {
                            availableQuizzes.push(quiz);
                            console.log(`從quiz_list.json添加題庫: ${quiz.name}`);
                        }
                    }
                }
            }
        } catch (error) {
            console.log('從quiz_list.json載入失敗（非關鍵錯誤）:', error);
        }
        
        console.log('最終探測到的題庫列表:', availableQuizzes);
        
        if (availableQuizzes.length === 0) {
            console.warn('未找到任何題庫文件');
            alert('未找到任何題庫文件。請確保questions目錄中包含有效的JSON題庫文件。');
        }
        
        // 顯示題庫列表
        displayQuizList();
    } catch (error) {
        console.error('載入題庫列表失敗:', error);
        alert('載入題庫列表失敗：' + error.message + '\n請檢查瀏覽器控制台以獲取更多信息。');
    }
}

// 顯示題庫列表
function displayQuizList() {
    console.log('開始顯示題庫列表...');
    
    // 確保列表容器存在
    if (!quizList) {
        console.error('找不到題庫列表容器 (id="quiz-list")');
        alert('系統錯誤：找不到題庫列表容器。請檢查控制台獲取更多信息。');
        return;
    }
    
    // 清空列表
    quizList.innerHTML = '';
    
    // 如果沒有可用題庫，顯示提示信息
    if (!availableQuizzes || availableQuizzes.length === 0) {
        quizList.innerHTML = '<p style="text-align: center; color: white;">目前沒有可用的題庫</p>';
        quizList.style.display = 'block';
        return;
    }
    
    // 顯示題庫列表
    availableQuizzes.forEach(quiz => {
        const quizButton = document.createElement('button');
        quizButton.className = 'quiz-option';
        quizButton.textContent = quiz.name;
        quizButton.setAttribute('data-file', quiz.file);
        quizButton.title = quiz.description || '';
        quizButton.addEventListener('click', () => selectQuiz(quiz));
        quizList.appendChild(quizButton);
    });
    
    // 顯示列表容器
    quizList.style.display = 'flex';
    
    console.log('題庫列表顯示完成');
}

// 選擇題庫
async function selectQuiz(quiz) {
    try {
        console.log('選擇題庫:', quiz);
        
        // 移除其他按鈕的選中狀態
        document.querySelectorAll('.quiz-option').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // 添加當前按鈕的選中狀態
        event.target.classList.add('selected');
        
        // 如果是本地開發環境，使用內嵌的題目數據
        if (CONFIG.isLocalDevelopment) {
            console.log('檢測到本地開發環境，使用內嵌題目數據');
            const response = await fetch(CONFIG.questionsPath + quiz.file);
            if (!response.ok) {
                throw new Error(`無法載入題庫文件: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('成功載入題庫:', data);
            
            // 保存題庫信息
            quizInfo = data.info;
            currentQuestions = data.questions;
            
            // 啟用開始按鈕
            startBtn.disabled = !studentNameInput.value.trim();
            
            console.log('題庫選擇完成');
            return;
        }
        
        // 如果是通過 HTTP/HTTPS 訪問，從服務器載入題庫
        const quizUrl = CONFIG.questionsPath + quiz.file;
        console.log('嘗試載入題庫文件:', quizUrl);
        
        const response = await fetch(quizUrl);
        if (!response.ok) {
            throw new Error(`無法載入題庫文件: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('成功載入題庫:', data);
        
        // 保存題庫信息
        quizInfo = data.info;
        currentQuestions = data.questions;
        
        // 啟用開始按鈕
        startBtn.disabled = !studentNameInput.value.trim();
        
        console.log('題庫選擇完成');
    } catch (error) {
        console.error('載入題庫失敗:', error);
        alert('載入題庫失敗：' + error.message + '\n請檢查瀏覽器控制台以獲取更多信息。');
    }
}

// 隨機打亂題目順序
function shuffleQuestions(questions) {
    for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
    }
}

// 顯示當前題目
function showQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    questionText.textContent = question.question;
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.addEventListener('click', () => selectOption(index));
        optionsContainer.appendChild(button);
    });

    nextBtn.disabled = true;
    updateProgressBar();
}

// 修改 selectOption 函數
function selectOption(selectedIndex) {
    const question = currentQuestions[currentQuestionIndex];
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    
    // 記錄選擇的答案
    question.selectedAnswer = selectedIndex;
    
    // 停用所有按鈕
    buttons.forEach(button => {
        button.disabled = true;
    });

    // 記錄分數
    if (selectedIndex === question.correct) {
        score++;
    }

    // 直接進入下一題
    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            updateQuestion();
        } else {
            showResult();
        }
    }, 500); // 延遲 500ms 後進入下一題，讓用戶能看到自己的選擇
}

// 更新進度條
function updateProgressBar() {
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    document.querySelector('.progress').style.width = `${progress}%`;
}

// 修改 updateQuestion 函數
function updateQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        showResult();
        return;
    }

    const question = currentQuestions[currentQuestionIndex];
    questionText.textContent = question.question;
    optionsContainer.innerHTML = '';
    
    // 更新剩餘題數顯示
    const remainingQuestions = currentQuestions.length - currentQuestionIndex;
    const progressText = document.querySelector('.progress-text');
    if (progressText) {
        progressText.textContent = `剩餘題數：${remainingQuestions} / ${currentQuestions.length}`;
    } else {
        const newProgressText = document.createElement('div');
        newProgressText.className = 'progress-text';
        newProgressText.textContent = `剩餘題數：${remainingQuestions} / ${currentQuestions.length}`;
        document.querySelector('.question-container').appendChild(newProgressText);
    }
    
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.addEventListener('click', () => selectOption(index));
        optionsContainer.appendChild(button);
    });

    updateProgressBar();
}

// 顯示結果
function showResult() {
    endTime = new Date(); // 記錄結束時間
    const duration = Math.floor((endTime - startTime) / 1000); // 計算測驗時間（秒）
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    quizScreen.classList.remove('active');
    resultScreen.classList.add('active');

    const finalScoreValue = Math.round((score / currentQuestions.length) * 100);
    finalScore.textContent = finalScoreValue;
    contributionScore.textContent = finalScoreValue;

    // 顯示回饋
    let feedbackText = '';
    if (finalScoreValue >= 90) {
        feedbackText = '太棒了！你的表現非常出色！請繼續保持！';
    } else if (finalScoreValue >= 70) {
        feedbackText = '做得不錯！還有進步空間，請繼續加油！';
    } else if (finalScoreValue >= 50) {
        feedbackText = '及格了！建議多複習一下，下次會更好！';
    } else {
        feedbackText = '需要多加努力！建議重新學習相關知識點。';
    }
    feedback.textContent = feedbackText;

    // 只顯示錯誤題目的答案詳情
    const wrongAnswersHTML = currentQuestions
        .filter(q => q.correct !== q.selectedAnswer) // 只篩選錯誤的題目
        .map((q, index) => {
            return `
                <div class="answer-item wrong">
                    <h4>第 ${currentQuestions.indexOf(q) + 1} 題</h4>
                    <p class="question">${q.question}</p>
                    <div class="options">
                        <div class="option wrong">
                            您的答案：${q.options[q.selectedAnswer]}
                        </div>
                        <div class="option correct">
                            正確答案：${q.options[q.correct]}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    // 添加測驗信息到結果頁面
    const resultInfo = document.createElement('div');
    resultInfo.className = 'result-info';
    resultInfo.innerHTML = `
        <h2>測驗結果</h2>
        <div class="test-info">
            <p>姓名：${studentName}</p>
            <p>題庫：${quizInfo.name}</p>
            <p>日期：${endTime.toLocaleDateString('zh-TW')}</p>
            <p>完成時間：${endTime.toLocaleTimeString('zh-TW')}</p>
            <p>測驗時長：${minutes}分${seconds}秒</p>
            <p>答對題數：${score} / ${currentQuestions.length}</p>
        </div>
    `;
    resultScreen.insertBefore(resultInfo, resultScreen.firstChild);

    const wrongCount = currentQuestions.filter(q => q.correct !== q.selectedAnswer).length;
    wrongQuestions.innerHTML = wrongCount > 0 ? `
        <h3>需要改進的題目（${wrongCount} 題）：</h3>
        ${wrongAnswersHTML}
    ` : '<h3>恭喜！您答對了所有題目！</h3>';

    // 自動截圖
    setTimeout(() => {
        captureResult();
    }, 1000);
}

// 截圖功能
async function captureResult() {
    try {
        // 創建成績單容器
        const resultContainer = document.createElement('div');
        resultContainer.className = 'result-container';
        resultContainer.innerHTML = `
            <div class="result-header">
                <h2>測驗成績單</h2>
                <p>姓名：${studentName}</p>
                <p>題庫：${quizInfo.name}</p>
                <p>日期：${endTime.toLocaleDateString('zh-TW')}</p>
                <p>完成時間：${endTime.toLocaleTimeString('zh-TW')}</p>
                <p>測驗時長：${Math.floor((endTime - startTime) / 60000)}分${Math.floor(((endTime - startTime) % 60000) / 1000)}秒</p>
                <p>答對題數：${score} / ${currentQuestions.length}</p>
            </div>
            <div class="result-content">
                <div class="score-summary">
                    <div class="score-box">
                        <h3>得分</h3>
                        <div class="score">${finalScore.textContent}</div>
                        <div class="score-label">/ 100</div>
                    </div>
                    <div class="score-box">
                        <h3>貢獻度</h3>
                        <div class="score">${contributionScore.textContent}</div>
                        <div class="score-label">%</div>
                    </div>
                </div>
                <div class="feedback">${feedback.textContent}</div>
                ${wrongQuestions.innerHTML}
            </div>
        `;

        // 設定成績單樣式
        const style = document.createElement('style');
        style.textContent = `
            .result-container {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                max-width: 800px;
                margin: 0 auto;
                position: fixed;
                top: -9999px;
                left: -9999px;
            }
            .result-header {
                text-align: center;
                margin-bottom: 2rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid #e2e8f0;
            }
            .result-header h2 {
                color: #1e293b;
                margin-bottom: 1rem;
            }
            .result-header p {
                color: #64748b;
                margin: 0.5rem 0;
            }
            .score-summary {
                display: flex;
                justify-content: center;
                gap: 2rem;
                margin-bottom: 2rem;
            }
            .score-box {
                background: #f8fafc;
                padding: 1.5rem;
                border-radius: 12px;
                min-width: 150px;
            }
            .score {
                font-size: 3rem;
                font-weight: bold;
                color: #6366f1;
                line-height: 1;
            }
            .score-label {
                font-size: 1rem;
                color: #64748b;
            }
            .feedback {
                margin: 2rem 0;
                padding: 1rem;
                background: #f8fafc;
                border-radius: 12px;
                font-size: 1.1rem;
            }
            .wrong-questions {
                margin: 2rem 0;
                padding: 1.5rem;
                background: #f8fafc;
                border-radius: 12px;
                text-align: left;
            }
            .wrong-question-item {
                margin-bottom: 1rem;
                padding: 1rem;
                background: white;
                border-radius: 12px;
                border-left: 4px solid #ef4444;
            }
        `;

        // 將成績單和樣式加入頁面
        document.body.appendChild(style);
        document.body.appendChild(resultContainer);

        // 截圖
        const canvas = await html2canvas(resultContainer, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        // 下載圖片
        const link = document.createElement('a');
        link.download = `${studentName}_${quizInfo.name}_測驗結果.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // 清理臨時元素
        document.body.removeChild(resultContainer);
        document.body.removeChild(style);

        // 顯示成功訊息
        alert('成績單已自動下載！');
    } catch (error) {
        console.error('截圖失敗:', error);
        alert('成績單生成失敗，請手動截圖。');
    }
}

// 修改 loadQuestions 函數
async function loadQuestions(quizType) {
    try {
        // 根據測驗類型選擇對應的CSV文件
        const csvFile = `./questions/${quizType}_questions.csv`;
        console.log('正在載入題庫文件:', csvFile);
        
        const response = await fetch(csvFile);
        if (!response.ok) {
            throw new Error(`找不到題庫文件：${csvFile}`);
        }
        
        const csvData = await response.text();
        console.log('成功讀取CSV文件');
        
        const questions = parseCSV(csvData);
        console.log('成功解析題目數量:', questions.length);
        
        if (questions.length === 0) {
            throw new Error('題庫為空');
        }
        
        // 隨機選擇10題
        const selectedQuestions = [];
        const usedIndices = new Set();
        
        while (selectedQuestions.length < 10) {
            const randomIndex = Math.floor(Math.random() * questions.length);
            if (!usedIndices.has(randomIndex)) {
                usedIndices.add(randomIndex);
                selectedQuestions.push(questions[randomIndex]);
            }
        }
        
        console.log('成功選擇題目數量:', selectedQuestions.length);
        return selectedQuestions;
    } catch (error) {
        console.error('載入題目失敗:', error);
        alert('載入題目失敗：' + error.message);
        return [];
    }
}

// 修改 startQuiz 函數
function startQuiz() {
    try {
        if (!currentQuestions || currentQuestions.length === 0) {
            throw new Error('請先匯入題庫');
        }

        // 隨機打亂題目順序
        currentQuestions = [...currentQuestions].sort(() => Math.random() - 0.5);

        currentQuestionIndex = 0;
        score = 0;
        startTime = new Date(); // 記錄開始時間

        // 隱藏開始畫面，顯示測驗畫面
        startScreen.classList.remove('active');
        quizScreen.classList.add('active');

        // 更新第一個問題
        updateQuestion();
    } catch (error) {
        console.error('開始測驗失敗:', error);
        alert('開始測驗失敗：' + error.message);
    }
}

// 添加 showScreen 函數
function showScreen(screenName) {
    // 隱藏所有畫面
    startScreen.classList.remove('active');
    quizScreen.classList.remove('active');
    resultScreen.classList.remove('active');

    // 顯示指定的畫面
    switch (screenName) {
        case 'start':
            startScreen.classList.add('active');
            break;
        case 'quiz':
            quizScreen.classList.add('active');
            break;
        case 'result':
            resultScreen.classList.add('active');
            break;
    }
}

// 修改 startTimer 函數
function startTimer() {
    const timerDisplay = document.createElement('div');
    timerDisplay.className = 'timer';
    timerDisplay.textContent = timeLeft;
    document.querySelector('.question-container').appendChild(timerDisplay);

    const timer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timer);
            timerDisplay.remove();
            nextBtn.disabled = false;
            selectOption(-1); // 超時自動選擇
        }
    }, 1000);
}

// 解析 CSV 檔案
function parseCSV(csvData) {
    const lines = csvData.split('\n');
    const questions = [];
    
    // 跳過標題行
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [id, question, option1, option2, option3, option4, correct, weight] = line.split(',');
        
        if (id && question && option1 && option2 && option3 && option4 && correct && weight) {
            questions.push({
                id: parseInt(id),
                question: question,
                options: [option1, option2, option3, option4],
                correct: parseInt(correct),
                weight: parseInt(weight)
            });
        }
    }
    
    return questions;
} 