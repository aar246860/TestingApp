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
    isLocalDevelopment: !window.location.hostname.includes('github.io'),
    noCacheParam: null
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
    
    // 添加調試函數
    window.debugLog = function(message) {
        console.log(message);
        const debugInfo = document.getElementById('debug-info');
        if (debugInfo) {
            debugInfo.style.display = 'block';
            const logMessage = document.createElement('div');
            logMessage.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
            debugInfo.appendChild(logMessage);
            // 限制顯示的消息數量
            if (debugInfo.children.length > 50) {
                debugInfo.removeChild(debugInfo.firstChild);
            }
            // 自動滾動到底部
            debugInfo.scrollTop = debugInfo.scrollHeight;
        }
    };
    
    // 啟用調試模式
    debugLog('測驗系統初始化中...');

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
    
    // 檢查關鍵元素是否存在
    if (!uploadBtn) debugLog('警告: 找不到上傳按鈕元素!');
    if (!quizList) debugLog('警告: 找不到題庫列表容器!');
    if (!startBtn) debugLog('警告: 找不到開始按鈕元素!');

    // 確保必要的DOM元素存在
    if (!quizList) {
        debugLog('找不到題庫列表容器，嘗試創建一個');
        quizList = document.createElement('div');
        quizList.id = 'quiz-list';
        quizList.className = 'quiz-list';
        
        // 找到合適的位置插入題庫列表
        const inputGroup = document.querySelector('.input-group');
        if (inputGroup) {
            if (quizInfoDiv) {
                inputGroup.insertBefore(quizList, quizInfoDiv);
            } else {
                inputGroup.appendChild(quizList);
            }
            debugLog('成功創建題庫列表容器');
        } else {
            document.body.appendChild(quizList);
            debugLog('無法找到合適的容器來放置題庫列表，已添加到body');
        }
    }

    // 添加事件監聽器
    if (uploadBtn) {
        // 先移除可能存在的舊事件監聽器
        uploadBtn.removeEventListener('click', handleUploadBtnClick);
        // 添加新的事件監聽器
        uploadBtn.addEventListener('click', handleUploadBtnClick);
        debugLog('已為匯入題庫按鈕添加事件監聽器');
    } else {
        debugLog('錯誤: 找不到上傳按鈕元素');
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
            if (!studentName || !currentQuestions) {
                debugLog('開始測驗失敗: 姓名或題庫未設置');
                if (!studentName) alert('請輸入姓名');
                else if (!currentQuestions || currentQuestions.length === 0) alert('請先匯入題庫');
                return;
            }

            try {
                startQuiz();
            } catch (error) {
                debugLog('開始測驗失敗: ' + error.message);
                alert('開始測驗失敗，請稍後再試');
            }
        });
    }

    // 防止重新整理和重複作答
    window.onbeforeunload = function() {
        return "確定要離開測驗嗎？您的進度將會遺失。";
    };
    
    // 初始化完成
    debugLog('測驗系統初始化完成');
    
    // 嘗試立即加載題庫
    setTimeout(handleUploadBtnClick, 500);
}

// 處理上傳按鈕點擊事件
async function handleUploadBtnClick() {
    try {
        debugLog('匯入題庫按鈕被點擊');
        
        // 添加視覺反饋，讓用戶知道按鈕已被點擊
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.textContent = '載入中...';
            uploadBtn.style.background = '#a29bfe';
        }
        
        // 添加防緩存參數
        const cacheParam = '?nocache=' + new Date().getTime();
        CONFIG.noCacheParam = cacheParam;
        
        // 重新載入可用題庫
        await loadAvailableQuizzes();
        
        // 恢復按鈕狀態
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = '匯入題庫';
            uploadBtn.style.background = '';
        }
        
        if (availableQuizzes.length === 0) {
            debugLog('未找到任何題庫文件');
            alert('未找到任何題庫文件。請確保questions目錄中有可用的題庫文件。');
            return;
        }
        
        // 直接顯示題庫列表，不使用對話框
        displayQuizList();
        
    } catch (error) {
        debugLog('載入題庫失敗: ' + error.message);
        console.error('載入題庫失敗:', error);
        alert('載入題庫失敗：' + error.message + '\n請確保 questions 目錄中有正確的題庫文件。');
        
        // 恢復按鈕狀態
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = '匯入題庫';
            uploadBtn.style.background = '';
        }
    }
}

// 載入可用題庫
async function loadAvailableQuizzes() {
    try {
        debugLog('正在載入題庫列表...');
        debugLog('當前路徑: ' + CONFIG.questionsPath);
        
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
            debugLog('本地開發環境，使用內嵌題庫列表');
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
            debugLog('使用內嵌題庫列表: ' + availableQuizzes.length + '個題庫');
            displayQuizList();
            return;
        }
        
        // 自動探測題庫文件
        availableQuizzes = [];
        debugLog('開始自動探測questions目錄中的JSON文件');
        
        // 先檢查預設的題庫文件
        for (const file of possibleQuizFiles) {
            try {
                const cacheParam = CONFIG.noCacheParam || '';
                const response = await fetch(CONFIG.questionsPath + file + cacheParam, {
                    cache: 'no-store' // 禁用緩存
                });
                debugLog(`嘗試讀取文件 ${file}: ${response.status}`);
                
                if (response.ok) {
                    try {
                        const quizData = await response.json();
                        if (quizData && quizData.questions) {
                            availableQuizzes.push({
                                name: quizData.info?.name || file.replace(/_/g, ' ').replace('.json', ''),
                                file: file,
                                description: quizData.info?.description || '自動探測的題庫'
                            });
                            debugLog(`發現題庫文件: ${file}`);
                        } else {
                            debugLog(`文件 ${file} 不含有效題目數據`);
                        }
                    } catch (parseError) {
                        debugLog(`題庫文件 ${file} 格式無效: ${parseError.message}`);
                    }
                } else {
                    debugLog(`文件 ${file} 不存在或無法訪問: ${response.status}`);
                }
            } catch (error) {
                debugLog(`檢查題庫文件 ${file} 時出錯: ${error.message}`);
            }
        }
        
        // 嘗試加載quiz_list.json作為補充
        try {
            const cacheParam = CONFIG.noCacheParam || '';
            const quizListUrl = CONFIG.questionsPath + 'quiz_list.json' + cacheParam;
            debugLog('從quiz_list.json載入題庫列表: ' + quizListUrl);
            
            const response = await fetch(quizListUrl, {
                cache: 'no-store' // 禁用緩存
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.quizzes && Array.isArray(data.quizzes)) {
                    debugLog('從quiz_list.json找到題庫列表: ' + data.quizzes.length + '個題庫');
                    
                    // 合併題庫，避免重複添加
                    for (const quiz of data.quizzes) {
                        if (!availableQuizzes.some(q => q.file === quiz.file)) {
                            availableQuizzes.push(quiz);
                            debugLog(`從quiz_list.json添加題庫: ${quiz.name}`);
                        }
                    }
                }
            } else {
                debugLog('quiz_list.json不存在或無法訪問: ' + response.status);
            }
        } catch (error) {
            debugLog('從quiz_list.json載入失敗: ' + error.message);
        }
        
        debugLog('最終探測到的題庫列表: ' + availableQuizzes.length + '個題庫');
        
        if (availableQuizzes.length === 0) {
            debugLog('未找到任何題庫文件');
            alert('未找到任何題庫文件。請確保questions目錄中包含有效的JSON題庫文件。');
        }
        
        // 顯示題庫列表
        displayQuizList();
    } catch (error) {
        debugLog('載入題庫列表失敗: ' + error.message);
        console.error('載入題庫列表失敗:', error);
        alert('載入題庫列表失敗：' + error.message + '\n請檢查瀏覽器控制台以獲取更多信息。');
    }
}

// 顯示題庫列表
function displayQuizList() {
    try {
        debugLog('開始顯示題庫列表，共有題庫數量: ' + availableQuizzes.length);
        
        // 確保quizList元素存在
        if (!quizList) {
            debugLog('嘗試重新獲取題庫列表容器');
            quizList = document.getElementById('quiz-list');
            
            // 如果仍然不存在，創建一個
            if (!quizList) {
                debugLog('需要重新創建題庫列表容器');
                quizList = document.createElement('div');
                quizList.id = 'quiz-list';
                quizList.className = 'quiz-list';
                
                // 找到合適的位置插入
                const inputGroup = document.querySelector('.input-group');
                if (inputGroup) {
                    if (quizInfoDiv) {
                        inputGroup.insertBefore(quizList, quizInfoDiv);
                    } else {
                        inputGroup.appendChild(quizList);
                    }
                    debugLog('重新創建題庫列表容器成功');
                } else {
                    document.body.appendChild(quizList);
                    debugLog('無法找到合適的容器，將題庫列表添加到body');
                }
            }
        }
        
        // 清空列表
        quizList.innerHTML = '';
        quizList.style.display = 'block';
        
        // 添加標題
        const titleElement = document.createElement('h3');
        titleElement.textContent = '可用題庫列表';
        titleElement.style.color = '#6c5ce7';
        titleElement.style.borderBottom = '2px solid #a29bfe';
        titleElement.style.paddingBottom = '10px';
        titleElement.style.marginBottom = '15px';
        quizList.appendChild(titleElement);
        
        // 檢查是否有可用題庫
        if (!availableQuizzes || availableQuizzes.length === 0) {
            debugLog('沒有找到可用題庫，顯示提示信息');
            const noQuizzesMsg = document.createElement('p');
            noQuizzesMsg.textContent = '沒有找到可用的題庫。請確保 questions 目錄中有有效的題庫文件。';
            noQuizzesMsg.style.color = '#e74c3c';
            noQuizzesMsg.style.padding = '10px';
            noQuizzesMsg.style.backgroundColor = '#ffecdb';
            noQuizzesMsg.style.borderRadius = '5px';
            quizList.appendChild(noQuizzesMsg);
            return;
        }
        
        // 創建題庫按鈕容器
        const quizButtonsContainer = document.createElement('div');
        quizButtonsContainer.style.display = 'flex';
        quizButtonsContainer.style.flexWrap = 'wrap';
        quizButtonsContainer.style.gap = '10px';
        quizButtonsContainer.style.justifyContent = 'flex-start';
        quizList.appendChild(quizButtonsContainer);
        
        // 添加題庫按鈕
        availableQuizzes.forEach((quiz, index) => {
            debugLog(`添加題庫按鈕: ${quiz.name} (${quiz.file})`);
            const button = document.createElement('button');
            button.textContent = quiz.name || `題庫 ${index + 1}`;
            button.className = 'quiz-button';
            button.style.backgroundColor = '#f1f1f1';
            button.style.color = '#333';
            button.style.border = '1px solid #ddd';
            button.style.borderRadius = '5px';
            button.style.padding = '8px 15px';
            button.style.margin = '5px';
            button.style.cursor = 'pointer';
            button.style.transition = 'all 0.3s ease';
            
            // 添加懸停效果
            button.addEventListener('mouseover', () => {
                button.style.backgroundColor = '#a29bfe';
                button.style.color = '#fff';
            });
            
            button.addEventListener('mouseout', () => {
                if (selectedQuizIndex !== index) {
                    button.style.backgroundColor = '#f1f1f1';
                    button.style.color = '#333';
                }
            });
            
            // 添加點擊事件
            button.addEventListener('click', () => {
                debugLog(`用戶選擇題庫: ${quiz.name}`);
                selectQuiz(index);
            });
            
            quizButtonsContainer.appendChild(button);
        });
        
        // 如果題庫列表不可見，讓其可見
        quizList.style.display = 'block';
        
        debugLog('題庫列表顯示完成');
    } catch (error) {
        debugLog('顯示題庫列表失敗: ' + error.message);
        console.error('顯示題庫列表失敗:', error);
        alert('顯示題庫列表失敗: ' + error.message);
    }
}

// 選擇題庫
async function selectQuiz(index) {
    try {
        debugLog(`開始選擇題庫，索引: ${index}`);
        
        // 檢查題庫索引是否有效
        if (index < 0 || index >= availableQuizzes.length) {
            debugLog(`無效題庫索引: ${index}`);
            alert('選擇題庫失敗: 無效的題庫索引');
            return;
        }
        
        // 更新選中的題庫索引
        selectedQuizIndex = index;
        const selectedQuiz = availableQuizzes[index];
        debugLog(`選擇的題庫: ${selectedQuiz.name} (${selectedQuiz.file})`);
        
        // 更新按鈕樣式
        const quizButtons = document.querySelectorAll('.quiz-button');
        quizButtons.forEach((button, idx) => {
            if (idx === index) {
                // 選中的按鈕
                button.style.backgroundColor = '#6c5ce7';
                button.style.color = 'white';
                button.style.fontWeight = 'bold';
                button.style.transform = 'scale(1.05)';
                button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
            } else {
                // 未選中的按鈕
                button.style.backgroundColor = '#f1f1f1';
                button.style.color = '#333';
                button.style.fontWeight = 'normal';
                button.style.transform = 'scale(1)';
                button.style.boxShadow = 'none';
            }
        });
        
        // 載入題庫文件
        debugLog(`嘗試載入題庫文件: ${selectedQuiz.file}`);
        const quizUrl = CONFIG.questionsPath + selectedQuiz.file + (CONFIG.noCacheParam || '');
        
        try {
            const response = await fetch(quizUrl, {
                cache: 'no-store' // 禁用緩存
            });
            
            if (!response.ok) {
                debugLog(`載入題庫失敗: 網絡狀態碼 ${response.status}`);
                alert(`載入題庫失敗: 網絡狀態碼 ${response.status}`);
                return;
            }
            
            const quizData = await response.json();
            
            if (!quizData || !quizData.questions || !Array.isArray(quizData.questions)) {
                debugLog('載入題庫失敗: 題庫格式無效');
                alert('載入題庫失敗: 題庫格式無效，必須包含questions陣列');
                return;
            }
            
            // 更新當前題庫數據
            currentQuizData = quizData;
            currentQuestions = quizData.questions;
            
            // 顯示題庫信息
            if (quizInfoDiv) {
                quizInfoDiv.innerHTML = `
                    <div style="border: 1px solid #a29bfe; background-color: #f1f1ff; padding: 15px; border-radius: 5px; margin-top: 15px;">
                        <h3 style="color: #6c5ce7; margin-top: 0;">已選擇題庫: ${selectedQuiz.name}</h3>
                        <p style="margin-bottom: 5px;"><strong>描述:</strong> ${selectedQuiz.description || '無描述'}</p>
                        <p style="margin-bottom: 5px;"><strong>題目數量:</strong> ${currentQuestions.length} 題</p>
                        <p style="margin-bottom: 0;"><strong>狀態:</strong> <span style="color: green;">已準備好</span></p>
                    </div>
                `;
                quizInfoDiv.style.display = 'block';
            }
            
            // 更新開始按鈕狀態
            if (startBtn) {
                // 只有當學生姓名輸入框有值時，才啟用開始按鈕
                const name = studentNameInput ? studentNameInput.value.trim() : '';
                startBtn.disabled = !name;
                startBtn.style.backgroundColor = name ? '#6c5ce7' : '#ccc';
                startBtn.style.cursor = name ? 'pointer' : 'not-allowed';
            }
            
            debugLog(`題庫載入成功: ${selectedQuiz.name} (${currentQuestions.length}題)`);
            
        } catch (error) {
            debugLog(`載入題庫失敗: ${error.message}`);
            console.error('載入題庫文件失敗:', error);
            alert(`載入題庫失敗: ${error.message}`);
        }
        
    } catch (error) {
        debugLog(`選擇題庫過程中出錯: ${error.message}`);
        console.error('選擇題庫失敗:', error);
        alert(`選擇題庫失敗: ${error.message}`);
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
    if (!studentNameInput.value.trim()) {
        alert('請輸入姓名');
        studentNameInput.focus();
        return;
    }
    
    if (!currentQuestions || currentQuestions.length === 0) {
        alert('請先匯入題庫');
        return;
    }
    
    try {
        console.log('開始測驗...');
        console.log('題庫信息:', quizInfo);
        console.log('總題數:', currentQuestions.length);
        
        // 記錄開始時間
        startTime = new Date();
        
        // 打亂題目順序
        shuffleQuestions(currentQuestions);
        
        // 如果題目數量超過設定的最大題數，只取前N題
        if (currentQuestions.length > CONFIG.maxQuestionsPerQuiz) {
            console.log(`題目數量(${currentQuestions.length})超過最大限制(${CONFIG.maxQuestionsPerQuiz})，將只使用前${CONFIG.maxQuestionsPerQuiz}題`);
            currentQuestions = currentQuestions.slice(0, CONFIG.maxQuestionsPerQuiz);
        }
        
        // 重置測驗數據
        currentQuestionIndex = 0;
        score = 0;
        
        // 切換到測驗畫面
        startScreen.classList.remove('active');
        quizScreen.classList.add('active');
        
        // 顯示第一個問題
        showQuestion();
        
        console.log('測驗開始');
    } catch (error) {
        console.error('開始測驗時發生錯誤:', error);
        alert('開始測驗失敗: ' + error.message);
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