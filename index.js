import { GoogleGenAI } from "https://esm.sh/@google/genai@^1.14.0";

// --- DOM Elements ---
const apiKeySetup = document.getElementById('api-key-setup');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const apiKeyDisplay = document.getElementById('api-key-display');
const updateApiKeyBtn = document.getElementById('update-api-key-btn');

const mainContent = document.getElementById('main-content');
const storyPrompt = document.getElementById('story-prompt');
const generateStoryBtn = document.getElementById('generate-story-btn');
const examplePromptsContainer = document.querySelector('.example-prompts');
const errorMessage = document.getElementById('error-message');
const loader = document.getElementById('loader');
const generateBtnText = document.getElementById('generate-btn-text');

const currentStoryContainer = document.getElementById('current-story-container');
const currentStoryPrompt = document.getElementById('current-story-prompt');
const currentStoryText = document.getElementById('current-story-text');

const storyHistoryList = document.getElementById('story-history-list');
const noStoriesMessage = document.getElementById('no-stories-message');

const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const stopBtn = document.getElementById('stop-btn');
const downloadBtn = document.getElementById('download-btn');

// --- App State ---
let apiKey = null;
let stories = [];
let currentStory = null;
let isLoading = false;
let isPlaying = false;
let isPaused = false;

// --- API Service ---
async function generateStoryText(key, prompt) {
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
            model: 'gem-2.5-flash',
            contents: `צור סיפור קצר ומרתק בעברית על בסיס הנושא הבא: "${prompt}". הסיפור צריך להיות מתאים לכל הגילאים.`,
            config: {
                systemInstruction: "אתה מספר סיפורים יצירתי שכותב בעברית. המטרה שלך היא ליצור סיפורים מרתקים, מותחים ומלאי דמיון.",
                temperature: 0.8,
                topP: 0.95,
                topK: 40
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error('ה-API לא החזיר טקסט. ייתכן שישנה בעיה עם הבקשה או שהתוכן נחסם.');
        }
        return text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error.message.includes('API key not valid')) {
            throw new Error('מפתח ה-API אינו תקין. אנא בדוק את המפתח ונסה שנית.');
        }
        throw new Error('שגיאה בתקשורת עם Gemini API. אנא בדוק את חיבור האינטרנט שלך ונסה שוב.');
    }
}

// --- UI Rendering & State Management ---
function render() {
    // API Key UI
    if (apiKey) {
        apiKeySetup.style.display = 'none';
        apiKeyDisplay.style.display = 'flex';
        mainContent.style.display = 'grid';
    } else {
        apiKeySetup.style.display = 'block';
        apiKeyDisplay.style.display = 'none';
        mainContent.style.display = 'none';
    }

    // Loading State
    generateStoryBtn.disabled = isLoading || !storyPrompt.value.trim();
    storyPrompt.disabled = isLoading;
    document.querySelectorAll('.button-tag').forEach(b => b.disabled = isLoading);
    if (isLoading) {
        generateBtnText.style.display = 'none';
        loader.style.display = 'block';
    } else {
        generateBtnText.style.display = 'flex';
        loader.style.display = 'none';
    }

    // Error Message
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
    
    // Story History
    storyHistoryList.innerHTML = '';
    if (stories.length === 0) {
        storyHistoryList.appendChild(noStoriesMessage);
    } else {
        stories.forEach(story => {
            const li = document.createElement('li');
            const isActive = currentStory && story.id === currentStory.id;
            li.innerHTML = `
                <div class="history-item ${isActive ? 'active' : ''}">
                    <button class="history-item-button" data-story-id="${story.id}">
                        <p class="history-item-prompt">${story.prompt}</p>
                        <p class="history-item-date">${new Date(story.createdAt).toLocaleString('he-IL')}</p>
                    </button>
                    <button class="delete-story-btn" title="מחק סיפור" data-story-id="${story.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                           <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            `;
            storyHistoryList.appendChild(li);
        });
    }

    // Current Story Display
    if (currentStory) {
        currentStoryContainer.style.display = 'block';
        currentStoryPrompt.textContent = currentStory.prompt;
        currentStoryText.textContent = currentStory.text;
    } else {
        currentStoryContainer.style.display = 'none';
    }

    // Player State
    updatePlayerUI();
}

function updatePlayerUI() {
    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
    stopBtn.disabled = !isPlaying && !isPaused;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function saveState() {
    localStorage.setItem('gemini-api-key', apiKey || '');
    localStorage.setItem('ai-stories', JSON.stringify(stories));
}

function loadState() {
    const storedApiKey = localStorage.getItem('gemini-api-key');
    if (storedApiKey) {
        apiKey = storedApiKey;
    }
    const storedStories = localStorage.getItem('ai-stories');
    if (storedStories) {
        stories = JSON.parse(storedStories);
    }
}

// --- Speech Synthesis ---
function stopPlayback() {
    window.speechSynthesis.cancel();
    isPlaying = false;
    isPaused = false;
    updatePlayerUI();
}

function handlePlayPause() {
    if (!currentStory) return;

    if (isPlaying) { // Pause
        window.speechSynthesis.pause();
        isPlaying = false;
        isPaused = true;
    } else { // Play
        if (isPaused) {
            window.speechSynthesis.resume();
        } else {
            stopPlayback(); // Stop any previous speech
            const utterance = new SpeechSynthesisUtterance(currentStory.text);
            utterance.lang = 'he-IL';
            utterance.onend = () => {
                isPlaying = false;
                isPaused = false;
                updatePlayerUI();
            };
            utterance.onerror = (event) => {
                console.error('SpeechSynthesisUtterance.onerror', event);
                showError('אירעה שגיאה בהפעלת האודיו.');
                stopPlayback();
            };
            window.speechSynthesis.speak(utterance);
        }
        isPlaying = true;
        isPaused = false;
    }
    updatePlayerUI();
}


// --- Event Handlers ---
function handleSaveApiKey() {
    const key = apiKeyInput.value.trim();
    if (key) {
        apiKey = key;
        saveState();
        render();
    }
}

function handleUpdateApiKey() {
    apiKeyInput.value = apiKey || '';
    apiKey = null;
    localStorage.removeItem('gemini-api-key');
    render();
}

async function handleGenerateStory() {
    const prompt = storyPrompt.value.trim();
    if (!prompt || isLoading || !apiKey) return;

    isLoading = true;
    currentStory = null;
    stopPlayback();
    render();

    try {
        const storyText = await generateStoryText(apiKey, prompt);
        const newStory = {
            id: new Date().toISOString(),
            prompt,
            text: storyText,
            createdAt: new Date().toISOString(),
        };
        stories.unshift(newStory);
        currentStory = newStory;
        saveState();
    } catch (err) {
        showError(err.message);
    } finally {
        isLoading = false;
        render();
        if (currentStory) {
            currentStoryContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

function handleHistoryClick(e) {
    const storyButton = e.target.closest('.history-item-button');
    const deleteButton = e.target.closest('.delete-story-btn');

    if (deleteButton) {
        const storyId = deleteButton.dataset.storyId;
        stories = stories.filter(s => s.id !== storyId);
        if (currentStory && currentStory.id === storyId) {
            currentStory = null;
            stopPlayback();
        }
        saveState();
        render();
        return;
    }

    if (storyButton) {
        const storyId = storyButton.dataset.storyId;
        const selectedStory = stories.find(s => s.id === storyId);
        if (selectedStory) {
            currentStory = selectedStory;
            stopPlayback();
            render();
            currentStoryContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

function handleDownloadText() {
    if (!currentStory) return;
    const blob = new Blob([`נושא: ${currentStory.prompt}\n\n${currentStory.text}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `סיפורAI - ${currentStory.prompt}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Initialization ---
function init() {
    // Load state from localStorage
    loadState();

    // Set up event listeners
    apiKeyInput.addEventListener('input', () => {
        saveApiKeyBtn.disabled = !apiKeyInput.value.trim();
    });
    saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
    updateApiKeyBtn.addEventListener('click', handleUpdateApiKey);

    storyPrompt.addEventListener('input', () => {
        generateStoryBtn.disabled = isLoading || !storyPrompt.value.trim();
    });
    generateStoryBtn.addEventListener('click', handleGenerateStory);
    
    examplePromptsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('button-tag')) {
            storyPrompt.value = e.target.textContent;
            generateStoryBtn.disabled = isLoading || !storyPrompt.value.trim();
        }
    });

    storyHistoryList.addEventListener('click', handleHistoryClick);
    
    playPauseBtn.addEventListener('click', handlePlayPause);
    stopBtn.addEventListener('click', stopPlayback);
    downloadBtn.addEventListener('click', handleDownloadText);

    // Stop speech synthesis on page unload
    window.addEventListener('beforeunload', stopPlayback);

    // Initial render
    render();
}

// Run the app
init();
