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
let selectedQuizIndex = -1; // 添加選中的題庫索引變量

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
document.addEventListener('DOMContentLoaded', function() {
    // 隱藏調試信息區域（根據用戶需求移除）
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
        debugInfo.style.display = 'none';
    }
    
    // 初始化應用程序
    initializeApp();
});

// 初始化應用程序
function initializeApp() {
    console.log('初始化測驗系統...');
    
    try {
        // 啟用調試模式
        debugLog('測驗系統初始化中...');
        debugLog(`運行環境: ${window.location.hostname || '本地'}`);
        debugLog(`瀏覽器: ${navigator.userAgent}`);

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
        if (!startScreen) debugLog('錯誤: 找不到開始畫面元素 (start-screen)');
        if (!quizScreen) debugLog('錯誤: 找不到測驗畫面元素 (quiz-screen)');
        if (!resultScreen) debugLog('錯誤: 找不到結果畫面元素 (result-screen)');
        if (!uploadBtn) debugLog('錯誤: 找不到上傳按鈕元素 (uploadBtn)');
        if (!quizList) debugLog('錯誤: 找不到題庫列表容器 (quiz-list)');
        if (!startBtn) debugLog('錯誤: 找不到開始按鈕元素 (start-btn)');

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
                if (startBtn) {
                    startBtn.disabled = !name || !currentQuestions || currentQuestions.length === 0;
                    debugLog(`學生姓名: ${name}, 開始按鈕狀態: ${!startBtn.disabled ? '啟用' : '禁用'}`);
                }
            });
        } else {
            debugLog('錯誤: 找不到姓名輸入框元素 (student-name)');
        }

        if (startBtn) {
            // 移除可能存在的舊事件監聽器
            startBtn.removeEventListener('click', startQuizHandler);
            // 添加新的事件監聽器
            startBtn.addEventListener('click', startQuizHandler);
            debugLog('已為開始測驗按鈕添加事件監聽器');
        } else {
            debugLog('錯誤: 找不到開始按鈕元素');
        }

        // 防止重新整理和重複作答
        window.onbeforeunload = function() {
            return "確定要離開測驗嗎？您的進度將會遺失。";
        };
        
        // 初始化完成
        debugLog('測驗系統初始化完成');
        
        // 嘗試立即加載題庫
        setTimeout(handleUploadBtnClick, 500);
    } catch (error) {
        console.error('初始化測驗系統時發生錯誤:', error);
        alert('初始化測驗系統時發生錯誤: ' + error.message);
    }
}

// 開始測驗處理函數 - 單獨提取出來方便添加或移除事件監聽器
function startQuizHandler() {
    debugLog('開始測驗按鈕被點擊');
    
    try {
        studentName = studentNameInput.value.trim();
        if (!studentName) {
            debugLog('開始測驗失敗: 未輸入姓名');
            alert('請輸入姓名');
            studentNameInput.focus();
            return;
        }
        
        if (!currentQuestions || currentQuestions.length === 0) {
            debugLog('開始測驗失敗: 未選擇題庫或題庫為空');
            alert('請先匯入並選擇題庫');
            return;
        }
        
        startQuiz();
    } catch (error) {
        debugLog('開始測驗失敗: ' + error.message);
        console.error('開始測驗失敗:', error);
        alert('開始測驗失敗: ' + error.message);
    }
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
    try {
        debugLog(`顯示第 ${currentQuestionIndex + 1} 題，共 ${currentQuestions.length} 題`);
        
        if (!currentQuestions || currentQuestionIndex >= currentQuestions.length) {
            debugLog('找不到當前題目，可能已完成測驗');
            showResult();
            return;
        }
        
        const question = currentQuestions[currentQuestionIndex];
        
        // 確保題目文本元素存在
        if (!questionText) {
            debugLog('找不到題目文本元素 question-text');
            questionText = document.getElementById('question-text');
            if (!questionText) {
                throw new Error('找不到題目文本元素');
            }
        }
        
        // 確保選項容器元素存在
        if (!optionsContainer) {
            debugLog('找不到選項容器元素 options-container');
            optionsContainer = document.getElementById('options-container');
            if (!optionsContainer) {
                throw new Error('找不到選項容器元素');
            }
        }
        
        // 設置題目文本
        questionText.textContent = `${currentQuestionIndex + 1}. ${question.question}`;
        
        // 清空選項容器
        optionsContainer.innerHTML = '';
        
        // 添加選項按鈕
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option';
            button.textContent = option;
            button.addEventListener('click', () => selectOption(index));
            optionsContainer.appendChild(button);
        });
        
        // 更新進度條
        updateProgressBar();
        
        debugLog('題目顯示成功');
    } catch (error) {
        debugLog('顯示題目時發生錯誤: ' + error.message);
        console.error('顯示題目失敗:', error);
        alert('顯示題目失敗: ' + error.message);
    }
}

// 修改 selectOption 函數
function selectOption(selectedIndex) {
    try {
        // 不顯示調試信息
        //debugLog(`選擇選項: ${selectedIndex}`);
        
        if (!currentQuestions || currentQuestionIndex >= currentQuestions.length) {
            //debugLog('選擇選項時發現題目不存在');
            return;
        }
        
        const question = currentQuestions[currentQuestionIndex];
        
        // 記錄選擇的答案
        question.selectedAnswer = selectedIndex;
        
        // 記錄分數（但不顯示對錯）
        if (selectedIndex === question.correct) {
            score++;
        }
        
        // 直接進入下一題，不顯示對錯，不延遲
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            showQuestion();
        } else {
            showResult();
        }
    } catch (error) {
        console.error('選擇選項失敗:', error);
    }
}

// 更新進度條
function updateProgressBar() {
    try {
        const progressBar = document.querySelector('.progress');
        if (!progressBar) {
            debugLog('找不到進度條元素');
            return;
        }
        
        const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
        progressBar.style.width = `${progress}%`;
        debugLog(`更新進度條: ${progress.toFixed(0)}%`);
    } catch (error) {
        debugLog('更新進度條時發生錯誤: ' + error.message);
    }
}

// 顯示結果
function showResult() {
    try {
        //debugLog('顯示測驗結果');
        
        // 記錄結束時間
        endTime = new Date();
        const duration = Math.floor((endTime - startTime) / 1000); // 秒
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        
        //debugLog(`測驗完成時間: ${minutes}分${seconds}秒，得分: ${score}/${currentQuestions.length}`);
        
        // 切換到結果畫面
        startScreen.style.display = 'none';
        quizScreen.style.display = 'none';
        resultScreen.style.display = 'block';
        
        // 查找結果顯示元素
        if (!finalScore) finalScore = document.getElementById('final-score');
        if (!contributionScore) contributionScore = document.getElementById('contribution-score');
        if (!feedback) feedback = document.getElementById('feedback');
        if (!wrongQuestions) wrongQuestions = document.getElementById('wrong-questions');
        
        // 顯示學生姓名
        const nameDisplay = document.getElementById('student-name-display');
        if (nameDisplay) {
            nameDisplay.textContent = studentName;
        }
        
        // 計算並顯示分數
        const finalScoreValue = Math.round((score / currentQuestions.length) * 100);
        if (finalScore) finalScore.textContent = finalScoreValue;
        if (contributionScore) contributionScore.textContent = finalScoreValue;
        
        // 顯示回饋信息
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
        
        if (feedback) feedback.textContent = feedbackText;
        
        // 顯示錯誤題目
        if (wrongQuestions) {
            const wrongQuestionsArray = currentQuestions.filter(q => q.selectedAnswer !== q.correct);
            
            if (wrongQuestionsArray.length === 0) {
                wrongQuestions.innerHTML = '<h3>恭喜！您全部回答正確！</h3>';
            } else {
                wrongQuestions.innerHTML = `<h3>需要改進的題目（${wrongQuestionsArray.length}題）：</h3>`;
                
                wrongQuestionsArray.forEach(q => {
                    const wrongItem = document.createElement('div');
                    wrongItem.className = 'wrong-question-item';
                    
                    wrongItem.innerHTML = `
                        <p class="wrong-question-text">${q.question}</p>
                        <div class="wrong-question-options">
                            <p class="wrong-option user-selected">您的答案：${q.options[q.selectedAnswer]}</p>
                            <p class="wrong-option correct-answer">正確答案：${q.options[q.correct]}</p>
                        </div>
                    `;
                    
                    wrongQuestions.appendChild(wrongItem);
                });
            }
        }
        
        // 自動截圖
        setTimeout(() => {
            saveResultToImage();
        }, 1000);
        
        //debugLog('結果顯示完成');
    } catch (error) {
        console.error('顯示結果失敗:', error);
        alert('顯示結果失敗: ' + error.message);
    }
}

// 保存結果截圖功能
function saveResultToImage() {
    try {
        // 使用html2canvas截圖
        if (typeof html2canvas === 'function') {
            // 創建一個包含更多信息的結果容器
            const resultContainer = document.createElement('div');
            resultContainer.className = 'result-container';
            resultContainer.style.backgroundColor = 'white';
            resultContainer.style.padding = '20px';
            resultContainer.style.borderRadius = '10px';
            resultContainer.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
            resultContainer.style.maxWidth = '800px';
            resultContainer.style.margin = '0 auto';
            resultContainer.style.fontFamily = 'Arial, sans-serif';
            
            // 添加測驗信息
            const quizInfo = document.createElement('div');
            quizInfo.style.textAlign = 'center';
            quizInfo.style.marginBottom = '20px';
            quizInfo.style.borderBottom = '2px solid #e9ecef';
            quizInfo.style.paddingBottom = '15px';
            
            const title = document.createElement('h2');
            title.textContent = '測驗成績單';
            title.style.color = '#6c5ce7';
            title.style.marginBottom = '15px';
            quizInfo.appendChild(title);
            
            const quizName = selectedQuizIndex >= 0 ? availableQuizzes[selectedQuizIndex].name : '未命名題庫';
            
            const infoText = document.createElement('div');
            infoText.innerHTML = `
                <p><strong>姓名：</strong>${studentName}</p>
                <p><strong>題庫：</strong>${quizName}</p>
                <p><strong>日期：</strong>${endTime.toLocaleDateString('zh-TW')}</p>
                <p><strong>完成時間：</strong>${endTime.toLocaleTimeString('zh-TW')}</p>
                <p><strong>測驗時長：</strong>${Math.floor((endTime - startTime) / 60000)}分${Math.floor(((endTime - startTime) % 60000) / 1000)}秒</p>
                <p><strong>答對題數：</strong>${score} / ${currentQuestions.length}</p>
            `;
            infoText.style.color = '#333';
            infoText.style.fontSize = '14px';
            quizInfo.appendChild(infoText);
            
            resultContainer.appendChild(quizInfo);
            
            // 添加分數信息
            const scoreSection = document.createElement('div');
            scoreSection.style.display = 'flex';
            scoreSection.style.justifyContent = 'center';
            scoreSection.style.gap = '40px';
            scoreSection.style.marginBottom = '20px';
            
            // 得分框
            const scoreBox = document.createElement('div');
            scoreBox.style.textAlign = 'center';
            scoreBox.style.backgroundColor = '#f8f9fa';
            scoreBox.style.padding = '20px';
            scoreBox.style.borderRadius = '10px';
            scoreBox.style.minWidth = '120px';
            
            const scoreTitle = document.createElement('h3');
            scoreTitle.textContent = '得分';
            scoreTitle.style.color = '#6c5ce7';
            scoreTitle.style.margin = '0 0 10px 0';
            scoreBox.appendChild(scoreTitle);
            
            const scoreValue = document.createElement('div');
            scoreValue.textContent = Math.round((score / currentQuestions.length) * 100);
            scoreValue.style.fontSize = '48px';
            scoreValue.style.fontWeight = 'bold';
            scoreValue.style.color = '#6c5ce7';
            scoreBox.appendChild(scoreValue);
            
            const scoreLabel = document.createElement('div');
            scoreLabel.textContent = '/ 100';
            scoreLabel.style.color = '#6c757d';
            scoreBox.appendChild(scoreLabel);
            
            scoreSection.appendChild(scoreBox);
            
            resultContainer.appendChild(scoreSection);
            
            // 添加回饋
            const feedbackSection = document.createElement('div');
            feedbackSection.style.marginBottom = '20px';
            feedbackSection.style.backgroundColor = '#f8f9fa';
            feedbackSection.style.padding = '15px';
            feedbackSection.style.borderRadius = '10px';
            feedbackSection.style.textAlign = 'center';
            
            const feedbackContent = document.createElement('p');
            feedbackContent.textContent = feedback.textContent;
            feedbackContent.style.margin = '0';
            feedbackContent.style.fontSize = '16px';
            feedbackContent.style.color = '#333';
            feedbackSection.appendChild(feedbackContent);
            
            resultContainer.appendChild(feedbackSection);
            
            // 添加錯誤題目
            if (wrongQuestions.children.length > 0) {
                const wrongSection = document.createElement('div');
                wrongSection.style.backgroundColor = '#f8f9fa';
                wrongSection.style.padding = '15px';
                wrongSection.style.borderRadius = '10px';
                
                // 克隆錯誤題目內容
                const wrongContent = wrongQuestions.cloneNode(true);
                wrongSection.appendChild(wrongContent);
                
                resultContainer.appendChild(wrongSection);
            }
            
            // 添加到DOM但隱藏
            resultContainer.style.position = 'absolute';
            resultContainer.style.left = '-9999px';
            document.body.appendChild(resultContainer);
            
            // 截圖
            html2canvas(resultContainer, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: 'white'
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `${studentName}_${quizName}_測驗結果.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                // 移除臨時容器
                document.body.removeChild(resultContainer);
                
                // 顯示成功訊息
                alert('成績單已自動下載！');
            }).catch(error => {
                console.error('截圖失敗:', error);
                alert('截圖失敗，請手動截圖保存');
                document.body.removeChild(resultContainer);
            });
        } else {
            alert('保存功能需要html2canvas庫支持，請手動截圖保存');
        }
    } catch (error) {
        console.error('保存結果失敗:', error);
        alert('保存結果失敗，請手動截圖');
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
        debugLog('開始測驗...');
        debugLog(`題庫信息: ${JSON.stringify(quizInfo || {})}`);
        debugLog(`總題數: ${currentQuestions.length}`);
        
        // 記錄學生姓名和開始時間
        studentName = studentNameInput.value.trim();
        startTime = new Date();
        
        // 保存題庫信息（如果沒有，則創建一個默認的）
        if (!quizInfo) {
            debugLog('未找到題庫信息，創建默認題庫信息');
            quizInfo = {
                name: selectedQuizIndex >= 0 ? availableQuizzes[selectedQuizIndex].name : '未命名題庫',
                description: selectedQuizIndex >= 0 ? availableQuizzes[selectedQuizIndex].description : '自動導入的題庫'
            };
        }
        
        // 打亂題目順序
        shuffleQuestions(currentQuestions);
        
        // 如果題目數量超過設定的最大題數，只取前N題
        if (currentQuestions.length > CONFIG.maxQuestionsPerQuiz) {
            debugLog(`題目數量(${currentQuestions.length})超過最大限制(${CONFIG.maxQuestionsPerQuiz})，將只使用前${CONFIG.maxQuestionsPerQuiz}題`);
            currentQuestions = currentQuestions.slice(0, CONFIG.maxQuestionsPerQuiz);
        }
        
        // 重置測驗數據
        currentQuestionIndex = 0;
        score = 0;
        
        // 切換到測驗畫面 - 使用display樣式
        debugLog('切換到測驗畫面');
        if (startScreen) startScreen.style.display = 'none';
        if (quizScreen) quizScreen.style.display = 'block';
        if (resultScreen) resultScreen.style.display = 'none';
        
        // 顯示第一個問題
        showQuestion();
        
        debugLog('測驗開始成功');
    } catch (error) {
        debugLog('開始測驗時發生錯誤: ' + error.message);
        console.error('開始測驗時發生錯誤:', error);
        alert('開始測驗失敗: ' + error.message);
    }
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

// 修改原來的調試日誌函數，以便與新調試容器配合
window.debugLog = function(message) {
    console.log(message);
    
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
        const logContainer = debugInfo.querySelector('.log-container') || debugInfo;
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.style.borderBottom = '1px dotted #333';
        logEntry.style.padding = '4px 0';
        
        const timestamp = document.createElement('span');
        timestamp.className = 'log-time';
        timestamp.textContent = `[${new Date().toLocaleTimeString()}] `;
        timestamp.style.color = '#888';
        timestamp.style.marginRight = '8px';
        
        const msgContent = document.createElement('span');
        msgContent.className = 'log-msg';
        msgContent.textContent = message;
        
        logEntry.appendChild(timestamp);
        logEntry.appendChild(msgContent);
        logContainer.appendChild(logEntry);
        
        // 限制日誌數量
        const maxEntries = 100;
        const entries = logContainer.querySelectorAll('.log-entry');
        if (entries.length > maxEntries) {
            for (let i = 0; i < entries.length - maxEntries; i++) {
                logContainer.removeChild(entries[i]);
            }
        }
        
        // 自動滾動到底部
        debugInfo.scrollTop = debugInfo.scrollHeight;
    }
}; 