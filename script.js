import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

document.addEventListener('DOMContentLoaded', () => {
    // הגדרת אלמנטים מה-DOM
    const apiKeySection = document.getElementById('api-key-section');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const updateApiKeyBtn = document.getElementById('update-api-key-btn');
    const apiStatus = document.getElementById('api-status');
    
    const mainContent = document.getElementById('main-content');
    const storyForm = document.getElementById('story-form');
    const promptTextarea = document.getElementById('story-prompt');
    const createBtn = document.getElementById('create-btn');
    const btnText = createBtn.querySelector('.btn-text');
    const loader = createBtn.querySelector('.loader');
    
    const exampleBtns = document.querySelectorAll('.example-btn');
    
    const playerSection = document.getElementById('player-section');
    const storyPlayer = document.getElementById('story-player');
    const downloadBtn = document.getElementById('download-btn');
    
    const historyList = document.getElementById('history-list');

    let genAI;

    // פונקציית אתחול ראשית
    function initializeApp() {
        const apiKey = localStorage.getItem('geminiApiKey');
        if (apiKey) {
            try {
                genAI = new GoogleGenerativeAI(apiKey);
                showMainContent();
                apiStatus.textContent = "מפתח API נטען בהצלחה. מוכן לפעולה.";
                apiStatus.className = 'api-status success';
            } catch (error) {
                showApiKeyForm("מפתח ה-API השמור אינו תקין.");
            }
        } else {
            showApiKeyForm();
        }
        loadHistory();
    }

    function showApiKeyForm(errorMessage = "") {
        apiKeySection.style.display = 'block';
        saveApiKeyBtn.style.display = 'block';
        updateApiKeyBtn.style.display = 'none';
        mainContent.style.display = 'none';
        if (errorMessage) {
            apiStatus.textContent = errorMessage;
            apiStatus.className = 'api-status error';
        }
    }

    function showMainContent() {
        apiKeySection.style.display = 'block';
        saveApiKeyBtn.style.display = 'none';
        apiKeyInput.style.display = 'none';
        updateApiKeyBtn.style.display = 'inline-block';
        mainContent.style.display = 'block';
    }

    // שמירת מפתח API
    saveApiKeyBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            apiStatus.textContent = "אנא הזן מפתח API.";
            apiStatus.className = 'api-status error';
            return;
        }
        try {
            // בדיקה בסיסית של תקינות המפתח
            new GoogleGenerativeAI(apiKey);
            localStorage.setItem('geminiApiKey', apiKey);
            genAI = new GoogleGenerativeAI(apiKey);
            initializeApp();
        } catch (error) {
            apiStatus.textContent = "מפתח API לא תקין. אנא בדוק ונסה שוב.";
            apiStatus.className = 'api-status error';
        }
    });

    updateApiKeyBtn.addEventListener('click', () => {
        apiKeyInput.style.display = 'block';
        saveApiKeyBtn.style.display = 'block';
        updateApiKeyBtn.style.display = 'none';
        apiStatus.textContent = "הזן מפתח API חדש ולחץ על שמור.";
        apiStatus.className = 'api-status';
    });

    // טיפול בטופס יצירת הסיפור
    storyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userPrompt = promptTextarea.value.trim();
        if (!userPrompt) {
            alert('אנא הזן נושא לסיפור.');
            return;
        }
        await generateStory(userPrompt);
    });

    // פונקציה ליצירת סיפור
    async function generateStory(userPrompt) {
        toggleLoading(true, "יוצר את התסריט...");
        try {
            // שלב 1: יצירת תסריט עם Gemini Pro
            const scriptGenerationModel = genAI.getGenerativeModel({ model: "gemini-pro" });
            const generationPrompt = 
                בהינתן הנושא: "${userPrompt}", כתוב תסריט דיאלוג קצר בעברית בלבד. 
                ה-AI צריך להחליט בעצמו על מספר הדמויות, המין שלהן והטון.
                הצג את הפלט בפורמט הבא בלבד: כל שורה מתחילה ב"דובר 1:", "דוברת 2:" וכו'.
                אל תוסיף שום טקסט, כותרות או הסברים לפני או אחרי הדיאלוג.
            ;
            const scriptResult = await scriptGenerationModel.generateContent(generationPrompt);
            const scriptText = await scriptResult.response.text();

            // שלב 2: יצירת אודיו עם Gemini TTS
            toggleLoading(true, "מפיק קובץ שמע...");
            const ttsModel = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash-preview-0514",
                generationConfig: { responseMimeType: "audio/mpeg" }
            });

            const ttsPrompt = צור קובץ שמע מהטקסט הבא, עם קולות שונים לכל דובר (multi-speaker). ה-AI צריך לבחור את סוגי הקולות, המגדר והטון: ${scriptText};
            const ttsResult = await ttsModel.generateContent(ttsPrompt);
            
            const audioBase64 = ttsResult.response.parts[0].inlineData.data;
            const audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');
            const audioUrl = URL.createObjectURL(audioBlob);

            displayStory(audioUrl, userPrompt);
            saveStoryToHistory(userPrompt, audioBlob);

        } catch (error) {
            console.error('Error generating story:', error);
            alert(אופס, משהו השתבש: ${error.message});
        } finally {
            toggleLoading(false);
        }
    }

    // פונקציות עזר וניהול היסטוריה
    function displayStory(audioUrl, prompt) {
        playerSection.style.display = 'block';
        storyPlayer.src = audioUrl;
        storyPlayer.play();
        downloadBtn.href = audioUrl;
        downloadBtn.download = פשוט_סיפור_${prompt.slice(0, 15).replace(/ /g, '_')}.mp3;
        playerSection.scrollIntoView({ behavior: 'smooth' });
    }

    function saveStoryToHistory(prompt, audioBlob) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const story = {
                id: Date.now(),
                prompt: prompt,
                date: new Date().toLocaleString('he-IL'),
                audioDataUrl: event.target.result
            };
            let history = getHistory();
            history.unshift(story);
            localStorage.setItem('storyHistory', JSON.stringify(history.slice(0, 50)));
            renderHistory();
        };
        reader.readAsDataURL(audioBlob);
    }

    function getHistory() { return JSON.parse(localStorage.getItem('storyHistory')) || []; }

    function loadHistory() { renderHistory(); }

    function renderHistory() {
        const history = getHistory();
        historyList.innerHTML = '';
        if (history.length === 0) {
            historyList.innerHTML = '<li>אין סיפורים שמורים עדיין.</li>';
        } else {
            history.forEach(story => {
                const li = document.createElement('li');
                li.innerHTML = 
                    <div class="story-details">
                        <div class="prompt">${story.prompt}</div>
                        <div class="date">נוצר ב: ${story.date}</div>
                    </div>
                    <button class="delete-btn" data-id="${story.id}">✖</button>
                ;
                li.querySelector('.story-details').addEventListener('click', () => playStoryFromHistory(story.id));
                li.querySelector('.delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteStoryFromHistory(story.id);
                });
                historyList.appendChild(li);
            });
        }
    }

    function playStoryFromHistory(id) {
        const story = getHistory().find(s => s.id == id);
        if (story) {
            displayStory(story.audioDataUrl, story.prompt);
        }
    }

    function deleteStoryFromHistory(id) {
        let history = getHistory().filter(s => s.id != id);
        localStorage.setItem('storyHistory', JSON.stringify(history));
        renderHistory();
    }

    // פונקציות עזר נוספות
    function toggleLoading(isLoading, message = "") {
        if (isLoading) {
            createBtn.disabled = true;
            btnText.textContent = message;
            loader.style.display = 'block';
        } else {
            createBtn.disabled = false;
            btnText.textContent = 'צור סיפור';
            loader.style.display = 'none';
        }
    }

    function base64ToBlob(base64, contentType = '', sliceSize = 512) {
        const byteCharacters = atob(base64);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    }
    
    exampleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            promptTextarea.value = btn.textContent;
        });
    });

    // הפעלת האפליקציה
    initializeApp();
});
