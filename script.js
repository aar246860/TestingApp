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

// 防止重新整理和重複作答
window.onbeforeunload = function() {
    return "確定要離開測驗嗎？您的進度將會遺失。";
};

// 檢查是否已經完成測驗
function checkQuizCompletion(quizType) {
    // 移除檢查，允許重複作答
    return false;
}

// 標記測驗完成
function markQuizCompleted(quizType) {
    // 移除記錄，允許重複作答
    // localStorage.setItem(`quizCompleted_${quizType}`, 'true');
    // localStorage.setItem(`completionTime_${quizType}`, new Date().toISOString());
}

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

// DOM 元素
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const studentNameInput = document.getElementById('student-name');
const startBtn = document.getElementById('start-btn');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const nextBtn = document.getElementById('next-btn');
const finalScore = document.getElementById('final-score');
const contributionScore = document.getElementById('contribution-score');
const feedback = document.getElementById('feedback');
const wrongQuestions = document.getElementById('wrong-questions');
const fileInput = document.getElementById('questionFile');
const uploadBtn = document.getElementById('uploadBtn');
const saveResultButton = document.getElementById('save-result');
const quizInfoDiv = document.getElementById('quizInfo');

// 題庫列表
let availableQuizzes = [];

// 載入可用題庫
async function loadAvailableQuizzes() {
    try {
        console.log('正在載入題庫列表...');
        console.log('當前路徑:', CONFIG.questionsPath);
        console.log('是否本地開發:', CONFIG.isLocalDevelopment);
        
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
        
        // 如果是通過 HTTP/HTTPS 訪問，嘗試從服務器載入題庫列表
        const quizListUrl = CONFIG.questionsPath + 'quiz_list.json';
        console.log('嘗試載入題庫列表:', quizListUrl);
        
        const response = await fetch(quizListUrl);
        if (!response.ok) {
            throw new Error(`無法載入題庫列表: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('成功載入題庫列表:', data);
        
        if (!data.quizzes || !Array.isArray(data.quizzes)) {
            throw new Error('題庫列表格式不正確');
        }
        
        availableQuizzes = data.quizzes;
        console.log('可用題庫:', availableQuizzes);
        
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
    quizList.innerHTML = '';
    
    if (!availableQuizzes || availableQuizzes.length === 0) {
        quizList.innerHTML = '<p>目前沒有可用的題庫</p>';
        return;
    }
    
    availableQuizzes.forEach(quiz => {
        const quizButton = document.createElement('button');
        quizButton.className = 'quiz-option';
        quizButton.textContent = quiz.name;
        quizButton.addEventListener('click', () => selectQuiz(quiz));
        quizList.appendChild(quizButton);
    });
    
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

// 修改姓名輸入驗證
studentNameInput.addEventListener('input', () => {
    const name = studentNameInput.value.trim();
    startBtn.disabled = !name || !currentQuestions;
});

// 修改開始測驗按鈕事件
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

// 修改文件上傳事件監聽器
uploadBtn.addEventListener('click', async () => {
    try {
        const quizListPath = CONFIG.questionsPath + 'quiz_list.json';
        console.log('嘗試載入題庫列表:', quizListPath);
        
        const response = await fetch(quizListPath);
        if (!response.ok) {
            throw new Error(`無法載入題庫列表: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!data.quizzes || !Array.isArray(data.quizzes)) {
            throw new Error('題庫列表格式不正確');
        }

        // 創建選擇題庫的對話框
        const dialogDiv = document.createElement('div');
        dialogDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a1a;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: 1000;
            min-width: 300px;
            text-align: center;
            color: white;
        `;
        
        dialogDiv.innerHTML = `
            <h3 style="margin-top: 0; color: white;">請選擇題庫</h3>
            <div id="quiz-buttons" style="display: flex; flex-direction: column; gap: 10px; margin: 20px 0;">
                ${data.quizzes.map(quiz => `
                    <button class="quiz-select-btn" style="
                        padding: 15px;
                        border: none;
                        background: #6c5ce7;
                        color: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 16px;
                        transition: all 0.3s;
                        border: 2px solid transparent;
                    ">${quiz.name}</button>
                `).join('')}
            </div>
            <button id="cancel-select" style="
                padding: 10px 25px;
                border: none;
                background: #a8a8a8;
                color: white;
                border-radius: 8px;
                cursor: pointer;
                margin-top: 10px;
                transition: all 0.3s;
            ">取消</button>
        `;

        // 添加遮罩
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 999;
            backdrop-filter: blur(3px);
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(dialogDiv);

        // 添加按鈕事件
        const buttons = dialogDiv.querySelectorAll('.quiz-select-btn');
        buttons.forEach(button => {
            button.addEventListener('mouseover', () => {
                button.style.background = '#5048b5';
                button.style.borderColor = '#8677f0';
                button.style.transform = 'translateY(-2px)';
            });
            button.addEventListener('mouseout', () => {
                button.style.background = '#6c5ce7';
                button.style.borderColor = 'transparent';
                button.style.transform = 'translateY(0)';
            });
            button.addEventListener('click', async () => {
                const selectedQuiz = data.quizzes.find(q => q.name === button.textContent);
                if (selectedQuiz) {
                    try {
                        const quizResponse = await fetch(CONFIG.questionsPath + selectedQuiz.file);
                        if (!quizResponse.ok) {
                            throw new Error(`無法載入題庫文件: ${quizResponse.status} ${quizResponse.statusText}`);
                        }
                        
                        const quizData = await quizResponse.json();
                        
                        // 保存題庫信息
                        quizInfo = {
                            name: selectedQuiz.name,
                            description: quizData.info?.description || selectedQuiz.description,
                            version: quizData.info?.version || '1.0'
                        };
                        currentQuestions = quizData.questions;

                        // 顯示題庫信息
                        quizInfoDiv.innerHTML = `
                            <div class="quiz-info-content">
                                <h4>題庫信息</h4>
                                <p>名稱：${quizInfo.name}</p>
                                <p>描述：${quizInfo.description}</p>
                                <p>題目數量：${currentQuestions.length}</p>
                            </div>
                        `;
                        quizInfoDiv.style.display = 'block';

                        // 啟用開始按鈕
                        startBtn.disabled = !studentNameInput.value.trim();
                        
                        // 關閉對話框
                        document.body.removeChild(overlay);
                        document.body.removeChild(dialogDiv);
                    } catch (error) {
                        console.error('載入題庫失敗:', error);
                        alert('載入題庫失敗：' + error.message);
                    }
                }
            });
        });

        // 取消按鈕事件
        const cancelBtn = dialogDiv.querySelector('#cancel-select');
        cancelBtn.addEventListener('mouseover', () => {
            cancelBtn.style.background = '#8a8a8a';
        });
        cancelBtn.addEventListener('mouseout', () => {
            cancelBtn.style.background = '#a8a8a8';
        });
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            document.body.removeChild(dialogDiv);
        });
        
    } catch (error) {
        console.error('載入題庫失敗:', error);
        alert('載入題庫失敗：' + error.message + '\n請確保 questions 目錄中有正確的題庫文件。');
    }
});

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