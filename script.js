// 測驗系統設定
const CONFIG = {
    maxQuestionsPerQuiz: 10,  // 每次測驗的最大題目數量
    timePerQuestion: 30,   // 每題時間限制（秒）
};

// 範例題庫資料
const sampleQuestions = [
    {
        id: 1,
        question: "JavaScript 中，以下哪個不是基本資料型別？",
        options: ["String", "Number", "Object", "Boolean"],
        correct: 2
    },
    {
        id: 2,
        question: "CSS 中，以下哪個屬性用於設定元素透明度？",
        options: ["opacity", "transparency", "alpha", "visibility"],
        correct: 0
    },
    {
        id: 3,
        question: "HTML5 中，哪個標籤用於播放影片？",
        options: ["<video>", "<media>", "<movie>", "<play>"],
        correct: 0
    },
    {
        id: 4,
        question: "以下哪個不是 HTTP 請求方法？",
        options: ["GET", "POST", "SEND", "PUT"],
        correct: 2
    },
    {
        id: 5,
        question: "在 JavaScript 中，哪個方法用於將字串轉換為整數？",
        options: ["parseInt()", "toInteger()", "convertToInt()", "number()"],
        correct: 0
    }
];

// 測驗狀態管理
let currentQuiz = {
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    answers: [],
    wrongQuestions: []
};

// DOM 元素
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const nextButton = document.getElementById('next-btn');
const progressBar = document.querySelector('.progress');
const finalScore = document.getElementById('final-score');
const contributionScore = document.getElementById('contribution-score');
const feedback = document.getElementById('feedback');
const wrongQuestionsContainer = document.getElementById('wrong-questions');
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-btn');
const studentNameInput = document.getElementById('student-name');
const saveResultButton = document.getElementById('save-result');

// 事件監聽器
document.getElementById('start-btn').addEventListener('click', startQuiz);
document.getElementById('next-btn').addEventListener('click', nextQuestion);
uploadButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);

// 姓名輸入和題目上傳的驗證
function validateStartConditions() {
    const nameInput = document.getElementById('student-name');
    const startButton = document.getElementById('start-btn');
    const name = nameInput.value.trim();
    const hasQuestions = currentQuiz.questions.length > 0;
    
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
    
    const requiredHeaders = ['id', 'question', 'option1', 'option2', 'option3', 'option4', 'correct'];
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
            correct: parseInt(values[6])
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

// 開始測驗
async function startQuiz() {
    // 確保有足夠的題目
    if (currentQuiz.questions.length === 0) {
        currentQuiz.questions = sampleQuestions;
    }

    // 設定實際測驗題目數量
    CONFIG.questionsPerQuiz = Math.min(currentQuiz.questions.length, CONFIG.maxQuestionsPerQuiz);
    
    // 如果題目數量超過最大限制，隨機選擇題目
    if (currentQuiz.questions.length > CONFIG.maxQuestionsPerQuiz) {
        currentQuiz.questions = randomlySelectQuestions(currentQuiz.questions, CONFIG.maxQuestionsPerQuiz);
    }

    currentQuiz.currentQuestionIndex = 0;
    currentQuiz.score = 0;
    currentQuiz.answers = [];
    currentQuiz.wrongQuestions = [];

    startScreen.classList.remove('active');
    quizScreen.classList.add('active');
    showQuestion();
}

// 顯示當前題目
function showQuestion() {
    const question = currentQuiz.questions[currentQuiz.currentQuestionIndex];
    questionText.textContent = question.question;
    
    // 更新進度條
    const progress = ((currentQuiz.currentQuestionIndex + 1) / CONFIG.questionsPerQuiz) * 100;
    progressBar.style.width = `${progress}%`;

    // 產生選項
    optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option';
        button.textContent = option;
        button.addEventListener('click', () => selectOption(index));
        optionsContainer.appendChild(button);
    });

    // 重置下一題按鈕狀態
    nextButton.disabled = true;
    
    // 更新下一題按鈕文字
    const remainingQuestions = CONFIG.questionsPerQuiz - currentQuiz.currentQuestionIndex - 1;
    if (remainingQuestions > 0) {
        nextButton.textContent = `下一題 (還剩 ${remainingQuestions} 題)`;
    } else {
        nextButton.textContent = '完成測驗';
    }
}

// 選擇答案
function selectOption(index) {
    const options = document.querySelectorAll('.option');
    options.forEach(option => option.classList.remove('selected'));
    options[index].classList.add('selected');
    nextButton.disabled = false;
}

// 下一題
function nextQuestion() {
    const selectedOption = document.querySelector('.option.selected');
    if (!selectedOption) return;

    const selectedIndex = Array.from(optionsContainer.children).indexOf(selectedOption);
    const question = currentQuiz.questions[currentQuiz.currentQuestionIndex];
    
    // 記錄答案
    currentQuiz.answers.push(selectedIndex);
    
    // 檢查答案
    if (selectedIndex === question.correct) {
        currentQuiz.score++;
    } else {
        currentQuiz.wrongQuestions.push({
            question: question.question,
            selected: question.options[selectedIndex],
            correct: question.options[question.correct]
        });
    }

    // 停用所有選項
    const options = document.querySelectorAll('.option');
    options.forEach(option => option.disabled = true);

    // 移動到下一題或顯示結果
    currentQuiz.currentQuestionIndex++;
    if (currentQuiz.currentQuestionIndex < CONFIG.questionsPerQuiz) {
        setTimeout(showQuestion, 300);
    } else {
        setTimeout(showResults, 300);
    }
}

// 顯示結果並自動儲存
async function showResults() {
    quizScreen.classList.remove('active');
    resultScreen.classList.add('active');

    const studentName = document.getElementById('student-name').value.trim();
    const finalScoreValue = Math.round((currentQuiz.score / CONFIG.questionsPerQuiz) * 100);
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
    if (currentQuiz.wrongQuestions.length > 0) {
        const wrongQuestionsHTML = currentQuiz.wrongQuestions.map((q, index) => `
            <div class="wrong-question-item">
                <h4>第 ${index + 1} 題</h4>
                <p>${q.question}</p>
                <p>你的答案：${q.selected}</p>
                <p>正確答案：${q.correct}</p>
            </div>
        `).join('');
        wrongQuestionsContainer.innerHTML = `
            <h3>需要複習的題目：</h3>
            ${wrongQuestionsHTML}
        `;
    } else {
        wrongQuestionsContainer.innerHTML = '<p>恭喜！你答對了所有題目！</p>';
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
            ${wrongQuestionsContainer.innerHTML}
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