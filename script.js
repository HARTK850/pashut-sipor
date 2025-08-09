class StoryAI {
    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key') || '';
        this.stories = JSON.parse(localStorage.getItem('stories')) || [];
        this.currentAudioUrl = null;
        
        this.initializeApp();
        this.bindEvents();
    }

    initializeApp() {
        if (this.apiKey) {
            this.showApiKeyStatus(true);
            this.showStorySection();
        }
        this.loadHistory();
    }

    bindEvents() {
        // API Key events
        document.getElementById('saveApiKey').addEventListener('click', () => this.saveApiKey());
        document.getElementById('updateApiKey').addEventListener('click', () => this.updateApiKey());
        
        // Story creation events
        document.getElementById('createStory').addEventListener('click', () => this.createStory());
        
        // Example buttons
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('storyTopic').value = e.target.dataset.example;
            });
        });
        
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSection(e.target.dataset.section));
        });
        
        // History actions
        document.getElementById('clearHistory').addEventListener('click', () => this.clearHistory());
        
        // Download audio
        document.getElementById('downloadAudio').addEventListener('click', () => this.downloadAudio());
        
        // Enter key support
        document.getElementById('apiKey').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveApiKey();
        });
        
        document.getElementById('storyTopic').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) this.createStory();
        });
    }

    saveApiKey() {
        const apiKeyInput = document.getElementById('apiKey');
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showApiKeyStatus(false, 'אנא הזן מפתח API תקין');
            return;
        }
        
        this.apiKey = apiKey;
        localStorage.setItem('gemini_api_key', apiKey);
        
        this.showApiKeyStatus(true);
        this.showStorySection();
        
        // Clear the input for security
        apiKeyInput.value = '';
    }

    updateApiKey() {
        document.getElementById('apiKey').style.display = 'block';
        document.getElementById('saveApiKey').style.display = 'inline-block';
        document.getElementById('updateApiKey').style.display = 'none';
        document.getElementById('apiStatus').innerHTML = '';
    }

    showApiKeyStatus(success, message = '') {
        const statusDiv = document.getElementById('apiStatus');
        const saveBtn = document.getElementById('saveApiKey');
        const updateBtn = document.getElementById('updateApiKey');
        const apiKeyInput = document.getElementById('apiKey');
        
        if (success) {
            statusDiv.innerHTML = '✅ מפתח API נשמר בהצלחה - האתר מוכן לפעולה';
            statusDiv.className = 'api-status success';
            
            apiKeyInput.style.display = 'none';
            saveBtn.style.display = 'none';
            updateBtn.style.display = 'inline-block';
        } else {
            statusDiv.innerHTML = `❌ ${message}`;
            statusDiv.className = 'api-status error';
        }
    }

    showStorySection() {
        document.getElementById('storySection').style.display = 'block';
        document.getElementById('historySection').style.display = 'block';
    }

    async createStory() {
        const topic = document.getElementById('storyTopic').value.trim();
        
        if (!topic) {
            alert('אנא הזן נושא לסיפור');
            return;
        }
        
        if (!this.apiKey) {
            alert('אנא הזן מפתח API תחילה');
            return;
        }
        
        this.showLoading(true);
        
        try {
            // Generate story text
            const storyText = await this.generateStoryText(topic);
            
            if (!storyText) {
                throw new Error('לא הצלחתי ליצור את הסיפור');
            }
            
            // Update loading message
            document.querySelector('#loading p').textContent = 'יוצר קובץ אודיו...';
            
            // Generate audio
            const audioUrl = await this.generateAudio(storyText);
            
            // Display the story
            this.displayStory(topic, storyText, audioUrl);
            
            // Save to history
            this.saveToHistory(topic, storyText, audioUrl);
            
        } catch (error) {
            console.error('Error creating story:', error);
            alert(`שגיאה ביצירת הסיפור: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async generateStoryText(topic) {
        const prompt = `צור סיפור קצר ומעניין בעברית על הנושא: "${topic}". 
        הסיפור צריך להיות באורך של כ-200-300 מילים, מתאים לכל הגילאים, 
        עם דיאלוגים ותיאורים חיים. הסיפור צריך להיות מלא ושלם עם התחלה, אמצע וסוף.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'שגיאה ביצירת הטקסט');
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    async generateAudio(text) {
        try {
            // Note: This is a placeholder for TTS functionality
            // Google's Gemini TTS API might not be publicly available yet
            // You would need to replace this with the actual TTS API call
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: text
                        }]
                    }],
                    generationConfig: {
                        audioConfig: {
                            audioEncoding: "MP3",
                            speakingRate: 1.0,
                            pitch: 0.0,
                            volumeGainDb: 0.0,
                            sampleRateHertz: 24000,
                            effectsProfileId: ["telephony-class-application"]
                        }
                    }
                })
            });

            if (!response.ok) {
                console.warn('TTS API not available, creating placeholder audio');
                return this.createPlaceholderAudio();
            }

            const data = await response.json();
            
            if (data.audioContent) {
                const audioBlob = new Blob([Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))], {
                    type: 'audio/mpeg'
                });
                return URL.createObjectURL(audioBlob);
            }
            
            return this.createPlaceholderAudio();
            
        } catch (error) {
            console.warn('TTS generation failed, using placeholder:', error);
            return this.createPlaceholderAudio();
        }
    }

    createPlaceholderAudio() {
        // Create a simple beep sound as placeholder
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1);
        
        return null; // Return null to indicate no audio file available
    }

    displayStory(topic, storyText, audioUrl) {
        const storyContent = document.getElementById('storyContent');
        const currentStory = document.getElementById('currentStory');
        const audioPlayer = document.getElementById('audioPlayer');
        const audioElement = document.getElementById('audioElement');
        const audioSource = document.getElementById('audioSource');
        
        storyContent.textContent = storyText;
        currentStory.style.display = 'block';
        
        if (audioUrl) {
            audioSource.src = audioUrl;
            audioElement.load();
            audioPlayer.style.display = 'block';
            this.currentAudioUrl = audioUrl;
        } else {
            audioPlayer.style.display = 'none';
            audioPlayer.innerHTML = '<p style="text-align: center; color: #718096;">קובץ האודיו לא זמין כרגע</p>';
        }
        
        // Scroll to story
        currentStory.scrollIntoView({ behavior: 'smooth' });
    }

    saveToHistory(topic, storyText, audioUrl) {
        const story = {
            id: Date.now(),
            topic: topic,
            text: storyText,
            audioUrl: audioUrl,
            createdAt: new Date().toLocaleDateString('he-IL')
        };
        
        this.stories.unshift(story);
        
        // Keep only last 20 stories
        if (this.stories.length > 20) {
            this.stories = this.stories.slice(0, 20);
        }
        
        localStorage.setItem('stories', JSON.stringify(this.stories));
        this.loadHistory();
    }

    loadHistory() {
        const historyList = document.getElementById('historyList');
        
        if (this.stories.length === 0) {
            historyList.innerHTML = '<p class="no-stories">עדיין לא יצרת סיפורים</p>';
            return;
        }
        
        historyList.innerHTML = this.stories.map(story => `
            <div class="history-item">
                <h4>${story.topic}</h4>
                <p>נוצר בתאריך: ${story.createdAt}</p>
                <div class="history-actions">
                    <button class="btn btn-primary" onclick="app.viewStory(${story.id})">צפה בסיפור</button>
                    ${story.audioUrl ? `<button class="btn btn-secondary" onclick="app.playAudio('${story.audioUrl}')">השמע</button>` : ''}
                    <button class="btn btn-danger" onclick="app.deleteStory(${story.id})">מחק</button>
                </div>
            </div>
        `).join('');
    }

    viewStory(storyId) {
        const story = this.stories.find(s => s.id === storyId);
        if (story) {
            this.displayStory(story.topic, story.text, story.audioUrl);
            this.switchSection('story');
        }
    }

    playAudio(audioUrl) {
        const audioElement = document.getElementById('audioElement');
        const audioSource = document.getElementById('audioSource');
        
        audioSource.src = audioUrl;
        audioElement.load();
        audioElement.play();
        
        // Show current story section
        document.getElementById('currentStory').style.display = 'block';
        document.getElementById('audioPlayer').style.display = 'block';
    }

    deleteStory(storyId) {
        if (confirm('האם אתה בטוח שברצונך למחוק את הסיפור?')) {
            this.stories = this.stories.filter(s => s.id !== storyId);
            localStorage.setItem('stories', JSON.stringify(this.stories));
            this.loadHistory();
        }
    }

    clearHistory() {
        if (confirm('האם אתה בטוח שברצונך למחוק את כל ההיסטוריה?')) {
            this.stories = [];
            localStorage.removeItem('stories');
            this.loadHistory();
        }
    }

    downloadAudio() {
        if (this.currentAudioUrl) {
            const a = document.createElement('a');
            a.href = this.currentAudioUrl;
            a.download = `story_${Date.now()}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    switchSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        
        // Show/hide sections
        if (section === 'story') {
            document.getElementById('storySection').style.display = 'block';
            document.getElementById('historySection').style.display = 'none';
        } else if (section === 'history') {
            document.getElementById('storySection').style.display = 'none';
            document.getElementById('historySection').style.display = 'block';
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const createBtn = document.getElementById('createStory');
        
        if (show) {
            loading.style.display = 'block';
            createBtn.disabled = true;
            createBtn.textContent = 'יוצר...';
            document.querySelector('#loading p').textContent = 'יוצר את הסיפור...';
        } else {
            loading.style.display = 'none';
            createBtn.disabled = false;
            createBtn.textContent = 'צור סיפור';
        }
    }
}

// Initialize the app
const app = new StoryAI();

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}