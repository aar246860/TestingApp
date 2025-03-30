// 測驗系統設定
const CONFIG = {
    maxQuestionsPerQuiz: 10,  // 每次測驗的最大題目數量
    timePerQuestion: 30,   // 每題時間限制（秒）
};

// 音效設定
const startSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
const endSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
startSound.volume = 0.5;
endSound.volume = 0.5;

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
let currentQuestions = []; // 新增：當前測驗的題目
let currentQuestionIndex = 0;
let score = 0;
let studentName = '';
let startTime = 0;
let timeLeft = 0;

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
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-btn');
const saveResultButton = document.getElementById('save-result');

// 事件監聽器
document.querySelectorAll('.quiz-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // 移除其他按鈕的選中狀態
        document.querySelectorAll('.quiz-btn').forEach(b => b.classList.remove('selected'));
        // 添加當前按鈕的選中狀態
        btn.classList.add('selected');
        currentQuiz = btn.dataset.quiz;
        startBtn.disabled = false;
    });
});

startBtn.addEventListener('click', async () => {
    studentName = studentNameInput.value.trim();
    if (!studentName || !currentQuiz) return;

    try {
        // 使用新的 startQuiz 函數
        await startQuiz(currentQuiz);
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

// 選擇答案
function selectOption(selectedIndex) {
    const question = currentQuestions[currentQuestionIndex];
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    
    // 停用所有按鈕
    buttons.forEach(button => {
        button.disabled = true;
    });

    // 記錄分數
    if (selectedIndex === question.correct) {
        score++;
    }

    nextBtn.disabled = false;
}

// 更新進度條
function updateProgressBar() {
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    document.querySelector('.progress').style.width = `${progress}%`;
}

// 下一題
nextBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
        showQuestion();
    } else {
        showResult();
    }
});

// 顯示結果
function showResult() {
    quizScreen.classList.remove('active');
    resultScreen.classList.add('active');

    const finalScoreValue = Math.round((score / currentQuestions.length) * 100);
    finalScore.textContent = finalScoreValue;
    contributionScore.textContent = finalScoreValue;

    // 播放結束音效
    endSound.play().catch(e => console.log('無法播放結束音效:', e));

    // 標記測驗完成
    markQuizCompleted(currentQuiz);

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
                <p>題庫：${currentQuiz}</p>
                <p>日期：${new Date().toLocaleDateString('zh-TW')}</p>
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
        link.download = `${studentName}_${currentQuiz}_測驗結果.png`;
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

// 姓名輸入和題目上傳的驗證
function validateStartConditions() {
    const nameInput = document.getElementById('student-name');
    const startButton = document.getElementById('start-btn');
    const name = nameInput.value.trim();
    const hasQuestions = currentQuestions.length > 0;
    
    startButton.disabled = !name || !hasQuestions;
}

// 處理檔案上傳
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const questions = await loadQuestionsFromFile(file);
        if (questions && questions.length > 0) {
            currentQuiz.questions = questions;
            uploadButton.innerHTML = '<i class="fas fa-check"></i> 題目已匯入';
            uploadButton.classList.add('success');
            console.log('成功匯入題目：', questions);
            alert('題目已成功匯入！');
        } else {
            throw new Error('沒有有效的題目');
        }
    } catch (error) {
        console.error('檔案處理失敗:', error);
        alert('檔案格式錯誤，請確認檔案格式是否正確。\n錯誤訊息：' + error.message);
        uploadButton.innerHTML = '<i class="fas fa-file-upload"></i> 匯入題目';
        uploadButton.classList.remove('success');
    }
    validateStartConditions();
}

// 監聽姓名輸入
document.getElementById('student-name').addEventListener('input', validateStartConditions);

// 從檔案載入題目的函式
async function loadQuestionsFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                let questions;
                if (file.name.endsWith('.json')) {
                    questions = JSON.parse(event.target.result);
                } else if (file.name.endsWith('.csv')) {
                    questions = parseCSV(event.target.result);
                } else {
                    reject(new Error('不支援的檔案格式，請使用 .json 或 .csv 檔案'));
                    return;
                }

                // 驗證題目格式
                if (!Array.isArray(questions)) {
                    reject(new Error('題目格式不正確：不是有效的陣列'));
                    return;
                }

                const validQuestions = questions.filter(q => {
                    try {
                        return validateQuestion(q);
                    } catch (e) {
                        console.warn('題目驗證失敗:', q, e);
                        return false;
                    }
                });

                if (validQuestions.length === 0) {
                    reject(new Error('沒有有效的題目'));
                    return;
                }

                resolve(validQuestions);
            } catch (error) {
                reject(new Error('檔案解析失敗：' + error.message));
            }
        };

        reader.onerror = () => reject(new Error('檔案讀取失敗'));
        reader.readAsText(file, 'UTF-8');
    });
}

// 解析 CSV 檔案
function parseCSV(csv) {
    const lines = csv.split(/\r\n|\n|\r/).filter(line => line.trim());
    
    if (lines.length < 2) {
        throw new Error('CSV 檔案必須包含標題列和至少一個題目');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    
    // 檢查必要欄位
    const requiredHeaders = ['id', 'question', 'option1', 'option2', 'option3', 'option4', 'correct', 'weight'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
        throw new Error('CSV 檔案缺少必要欄位：' + missingHeaders.join(', '));
    }

    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        if (values.length !== headers.length) {
            throw new Error('CSV 行資料格式不正確：' + line);
        }

        const question = {
            id: parseInt(values[0]),
            question: values[1],
            options: [
                values[2],
                values[3],
                values[4],
                values[5]
            ],
            correct: parseInt(values[6]),
            weight: parseFloat(values[7]) || 1
        };

        if (isNaN(question.id) || isNaN(question.correct)) {
            throw new Error('題號或正確答案必須是數字');
        }

        return question;
    });
}

// 驗證題目格式
function validateQuestion(q) {
    if (!q.id || typeof q.id !== 'number' || isNaN(q.id)) {
        throw new Error('題號必須是有效的數字');
    }
    if (!q.question || typeof q.question !== 'string' || q.question.trim() === '') {
        throw new Error('題目內容不能為空');
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error('選項必須是包含 4 個項目的陣列');
    }
    if (q.options.some(opt => !opt || typeof opt !== 'string' || opt.trim() === '')) {
        throw new Error('選項不能為空');
    }
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3 || isNaN(q.correct)) {
        throw new Error('正確答案必須是 0-3 之間的數字');
    }
    return true;
}

// 隨機選擇題目
function randomlySelectQuestions(questions, count) {
    if (questions.length <= count) {
        return questions;
    }
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// 顯示結果並自動儲存
async function showResults() {
    quizScreen.classList.remove('active');
    resultScreen.classList.add('active');

    const finalScoreValue = Math.round((score / currentQuestions.length) * 100);
    finalScore.textContent = finalScoreValue;
    
    const contributionValue = finalScoreValue;
    contributionScore.textContent = contributionValue;

    // 顯示回饋
    let feedbackText = '';
    if (contributionValue >= 90) {
        feedbackText = '太棒了！你的表現非常出色！請繼續保持！';
    } else if (contributionValue >= 70) {
        feedbackText = '做得不錯！還有進步空間，請繼續加油！';
    } else if (contributionValue >= 50) {
        feedbackText = '及格了！建議多複習一下，下次會更好！';
    } else {
        feedbackText = '需要多加努力！建議重新學習相關知識點。';
    }
    feedback.textContent = feedbackText;

    // 顯示錯誤題目
    if (score < currentQuestions.length) {
        const wrongQuestionsHTML = currentQuestions.slice(score).map((q, index) => `
            <div class="wrong-question-item">
                <h4>第 ${index + 1} 題</h4>
                <p>${q.question}</p>
            </div>
        `).join('');
        wrongQuestions.innerHTML = `
            <h3>需要複習的題目：</h3>
            ${wrongQuestionsHTML}
        `;
    } else {
        wrongQuestions.innerHTML = '<p>恭喜！你答對了所有題目！</p>';
    }

    // 自動儲存成績單
    await saveResult(studentName);
}

// 儲存成績單
async function saveResult(studentName) {
    // 建立成績單容器
    const resultContainer = document.createElement('div');
    resultContainer.className = 'result-container';
    resultContainer.innerHTML = `
        <div class="result-header">
            <h2>測驗成績單</h2>
            <p>姓名：${studentName}</p>
            <p>日期：${new Date().toLocaleDateString('zh-TW')}</p>
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
        .wrong-question-item:last-child {
            margin-bottom: 0;
        }
        .wrong-question-item h4 {
            color: #ef4444;
            margin-bottom: 0.5rem;
        }
        .wrong-question-item p {
            color: #64748b;
            font-size: 0.9rem;
        }
    `;

    // 將成績單和樣式加入頁面
    document.body.appendChild(style);
    document.body.appendChild(resultContainer);

    try {
        // 使用 html2canvas 將成績單轉換為圖片
        const canvas = await html2canvas(resultContainer, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        // 建立下載連結
        const link = document.createElement('a');
        link.download = `${studentName}_測驗成績單_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // 清理臨時元素
        document.body.removeChild(resultContainer);
        document.body.removeChild(style);

        // 顯示完成訊息
        setTimeout(() => {
            alert('測驗已完成！成績單已自動儲存。\n請關閉此視窗。');
        }, 500);
    } catch (error) {
        console.error('儲存成績單失敗:', error);
        alert('儲存成績單時發生錯誤，請稍後再試。');
    }
}

// 修改 loadQuestions 函數
async function loadQuestions(quizType) {
    try {
        // 根據測驗類型選擇對應的CSV文件
        const csvFile = `./questions/${quizType}_questions.csv`;
        console.log('正在載入題庫文件:', csvFile); // 添加日誌
        
        const response = await fetch(csvFile);
        if (!response.ok) {
            throw new Error(`找不到題庫文件：${csvFile}`);
        }
        
        const csvText = await response.text();
        console.log('成功讀取CSV文件'); // 添加日誌
        
        const questions = parseCSV(csvText);
        console.log('成功解析題目數量:', questions.length); // 添加日誌
        
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
        
        console.log('成功選擇題目數量:', selectedQuestions.length); // 添加日誌
        return selectedQuestions;
    } catch (error) {
        console.error('載入題目失敗:', error);
        alert('載入題目失敗：' + error.message);
        return [];
    }
}

// 修改 startQuiz 函數
async function startQuiz(quizType) {
    try {
        console.log('開始載入測驗:', quizType); // 添加日誌
        
        const questions = await loadQuestions(quizType);
        if (questions.length === 0) {
            return;
        }

        currentQuiz = quizType;
        currentQuestions = questions;
        currentQuestionIndex = 0;
        score = 0;
        startTime = Date.now();
        timeLeft = 30;

        // 播放開始音效
        startSound.play().catch(error => console.log('無法播放音效:', error));

        showScreen('quiz');
        updateQuestion();
        startTimer();
    } catch (error) {
        console.error('開始測驗失敗:', error);
        alert('開始測驗失敗：' + error.message);
    }
} 