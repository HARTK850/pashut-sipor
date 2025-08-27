class StoryGenerator {
  constructor() {
    this.apiKey = localStorage.getItem("gemini_api_key") || "";
    this.currentAudioBlob = null;
    this.currentScript = "";
    this.speakers = [];
    this.voices = []; // נעדכן את זה בקולות הזמינים
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadApiKey();
    this.initializeVoices(); // אתחול קולות
    this.setupModelSelectionListener(); // האזנה לשינוי במודל
    this.setupTopicInputListener(); // התאמת גובה textarea
    this.setupScriptManagementButtons(); // כפתורי ניהול תסריט
    this.updateUIForStep(1); // התחלה בשלב 1
  }

  bindEvents() {
    // API Key management
    document.getElementById("saveApiKey").addEventListener("click", () => this.saveApiKey());
    document.getElementById("apiKey").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.saveApiKey();
    });

    // Story generation
    document.getElementById("generateScript").addEventListener("click", () => this.generateScript());
    document.getElementById("generateAudio").addEventListener("click", () => this.generateAudio());

    // Audio controls
    document.getElementById("downloadAudio").addEventListener("click", () => this.downloadAudio());
    document.getElementById("createNew").addEventListener("click", () => this.resetForm());
  }

  loadApiKey() {
    const apiKeyInput = document.getElementById("apiKey");
    if (this.apiKey) {
      apiKeyInput.value = this.apiKey;
      this.showStatus("apiStatus", "מפתח API נשמר בהצלחה", "success");
    }
  }

  saveApiKey() {
    const apiKeyInput = document.getElementById("apiKey");
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      this.showStatus("apiStatus", "אנא הכנס מפתח API תקין", "error");
      return;
    }

    this.apiKey = apiKey;
    localStorage.setItem("gemini_api_key", apiKey);
    this.showStatus("apiStatus", "מפתח API נשמר בהצלחה", "success");
  }

  // פונקציה לאתחול הקולות של Web Speech API (אם נשתמש בו בעתיד, או למידע)
  initializeVoices() {
    if (typeof speechSynthesis !== 'undefined') {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.voices = voices;
        console.log("Web Speech API voices loaded:", this.voices);
      } else {
        // אם הקולות לא זמינים מיד, ננסה להאזין לאירוע
        speechSynthesis.onvoiceschanged = () => {
          this.voices = speechSynthesis.getVoices();
          console.log("Web Speech API voices loaded after event:", this.voices);
        };
      }
    } else {
      console.warn("Web Speech API not supported in this browser.");
    }
  }

  // --- התאמות מהקוד החדש ---
  setupModelSelectionListener() {
    const modelSelection = document.getElementById('modelSelection');
    const customModelGroup = document.getElementById('customModelGroup');
    if (modelSelection && customModelGroup) {
      modelSelection.addEventListener('change', () => {
        customModelGroup.style.display = modelSelection.value === 'custom' ? 'block' : 'none';
      });
    }
  }

  setupTopicInputListener() {
    const topicInput = document.getElementById('topicInput');
    if (topicInput) {
      topicInput.addEventListener('input', () => {
        topicInput.style.height = 'auto';
        topicInput.style.height = (topicInput.scrollHeight) + 'px';
      });
    }
  }

  setupScriptManagementButtons() {
    const copyScriptBtn = document.getElementById('copyScriptBtn');
    const downloadScriptBtn = document.getElementById('downloadScriptBtn');
    const scriptArea = document.getElementById('scriptArea');
    const topicInput = document.getElementById('topicInput'); // לצורך שם קובץ דינמי

    if (copyScriptBtn && scriptArea) {
      copyScriptBtn.addEventListener('click', () => {
        const scriptText = scriptArea.value;
        if (!scriptText) return;

        navigator.clipboard.writeText(scriptText).then(() => {
          const originalText = copyScriptBtn.innerHTML;
          copyScriptBtn.innerHTML = <span class="material-symbols-outlined">done</span> הועתק!;
          setTimeout(() => {
            copyScriptBtn.innerHTML = originalText;
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy text: ', err);
          alert('ההעתקה נכשלה.');
        });
      });
    }

    if (downloadScriptBtn && scriptArea && topicInput) {
      downloadScriptBtn.addEventListener('click', () => {
        const scriptText = scriptArea.value;
        if (!scriptText) return;

        const topic = topicInput.value.trim();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const safeTopic = topic.replace(/[^\w\u0590-\u05FF\- ]+/g, '').replace(/\s+/g, '_').slice(0, 40) || 'podcast';
        const filename = ${safeTopic}_${dateStr}_script.txt;

        const blob = new Blob([scriptText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  }
  // --- סוף התאמות ---


  async generateScript() {
    if (!this.validateApiKey()) return;

    const button = document.getElementById("generateScript");
    const spinner = button.querySelector(".spinner"); // אם יש לך spinner בקוד שלך
    const btnText = button.querySelector(".btn-text"); // אם יש לך טקסט כפתור בקוד שלך

    // נשתמש ב-showLoading מהקוד החדש יותר
    this.showLoading(button, spinner, btnText, true);

    try {
      const topicInput = document.getElementById("topicInput");
      const durationInput = document.getElementById("durationInput");
      const speakersConfigSelect = document.getElementById("speakersConfig");
      const modelSelection = document.getElementById("modelSelection");
      const customModelInput = document.getElementById("customModelInput");

      const topic = topicInput.value.trim();
      const duration = durationInput.value;
      const speakersConfigValue = speakersConfigSelect.value;
      const selectedModel = modelSelection.value;

      let model;
      if (selectedModel === 'custom') {
        model = customModelInput.value.trim();
        if (!model) throw new Error("יש להזין שם מודל מותאם אישית.");
      } else {
        model = selectedModel;
      }

      const systemPrompt = this.buildScriptPrompt(duration, speakersConfigValue);
      const url = https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent;
      const body = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: Topic: ${topic} }] }]
      };

      const response = await fetch(${url}?key=${encodeURIComponent(this.apiKey)}, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(שגיאת API: ${errorData.error?.message || 'Unknown error'});
      }

      const data = await response.json();
      const scriptContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!scriptContent) {
        throw new Error("לא התקבל תוכן תסריט מה-API.");
      }

      document.getElementById("scriptContent").value = scriptContent;
      this.currentScript = scriptContent;

      this.extractSpeakersFromScript(scriptContent);
      this.setupSpeakersList();
      this.updateUIForStep(2); // מעבר לשלב 2
    } catch (error) {
      console.error("Error generating script:", error);
      this.showError(שגיאה ביצירת התסריט: ${error.message});
    } finally {
      this.showLoading(button, spinner, btnText, false);
    }
  }

  // --- פונקציה חדשה ליצירת שמע באמצעות Gemini TTS ---
  async generateAudio() {
    if (!this.validateApiKey()) return;

    const button = document.getElementById("generateAudio");
    const spinner = button.querySelector(".spinner");
    const btnText = button.querySelector(".btn-text");

    this.showLoading(button, spinner, btnText, true);

    try {
      const scriptContent = document.getElementById("scriptContent").value.trim();
      if (!scriptContent) throw new Error("אנא הכנס תסריט לפני יצירת השמע.");

      const speakersConfigSelect = document.getElementById("speakersConfig");
      const topicInput = document.getElementById("topicInput"); // לשימוש בשם קובץ

      const speakersConfigValue = speakersConfigSelect.value;
      let speechConfig;

      // הגדרת קונפיגורציית הקולות בהתאם לבחירה
      switch (speakersConfigValue) {
        case 'two_males':
          speechConfig = { multiSpeakerVoiceConfig: { speakerVoiceConfigs: [ { speaker: "speaker1", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Sadaltager" } } }, { speaker: "speaker2", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Pulcherrima" } } } ] } };
          break;
        case 'two_females':
          speechConfig = { multiSpeakerVoiceConfig: { speakerVoiceConfigs: [ { speaker: "speaker1", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } }, { speaker: "speaker2", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } } ] } };
          break;
        case 'male_female':
        default:
          speechConfig = { multiSpeakerVoiceConfig: { speakerVoiceConfigs: [ { speaker: "man", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Sadaltager" } } }, { speaker: "girl", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } ] } };
          break;
      }

      const model = 'gemini-2.5-flash-preview-tts'; // המודל הספציפי ליצירת שמע
      const url = https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent;

      const body = {
        contents: [{ parts: [{ text: scriptContent }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: speechConfig }
      };

      const response = await fetch(${url}?key=${encodeURIComponent(this.apiKey)}, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        const details = errorData.error?.message || 'לא התקבל פירוט';
        throw new Error(שגיאת API: ${details});
      }

      const data = await response.json();
      const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

      if (!audioPart) {
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבל מידע שמע מה-API.";
        throw new Error(ה-API לא החזיר אודיו. ייתכן שהתסריט אינו תקין. תגובת המודל: ${textResponse});
      }

      const b64 = audioPart.inlineData.data;
      const pcmBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const wavBlob = this.createWavBlob(pcmBytes); // שימוש בפונקציה מהקוד החדש
      const urlObj = URL.createObjectURL(wavBlob);

      // עדכון נגן האודיו ולינק ההורדה
      const audioPlayer = document.getElementById("audioPlayer");
      const downloadLink = document.getElementById("downloadLink");

      audioPlayer.src = urlObj;

      // יצירת שם קובץ דינמי
      const topic = topicInput.value.trim();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const safeTopic = topic.replace(/[^\w\u0590-\u05FF\- ]+/g, '').replace(/\s+/g, '_').slice(0, 40) || 'podcast';
      const filename = ${safeTopic}_${dateStr}.wav;

      downloadLink.href = urlObj;
      downloadLink.setAttribute('download', filename);

      this.updateUIForStep(3); // מעבר לשלב 3
      this.showStatus("status-audio", "השמע מוכן!", "success");

    } catch (error) {
      console.error("Error generating audio:", error);
      this.showError(שגיאה ביצירת השמע: ${error.message});
    } finally {
      this.showLoading(button, spinner, btnText, false);
    }
  }

  // פונקציה להמרת נתוני PCM לקובץ WAV (מועתקת מהקוד החדש)
  createWavBlob(pcmData) {
    const numChannels = 1;
    const sampleRate = 24000; // קצב הדגימה שבו Gemini מייצר את השמע
    const bitsPerSample = 16;
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // Helper to write strings in the WAV header
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF Chunk Descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true); // ChunkSize (Total file size - 8)
    writeString(8, 'WAVE');

    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true);  // SampleRate
    view.setUint32(28, sampleRate  numChannels  (bitsPerSample / 8), true); // ByteRate
    view.setUint16(32, numChannels * (bitsPerSample / 8), true); // BlockAlign
    view.setUint16(34, bitsPerSample, true); // BitsPerSample

    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true); // Subchunk2Size (Data size)

    // Copy PCM data
    new Uint8Array(buffer, 44).set(pcmData);

    return new Blob([buffer], { type: 'audio/wav' });
  }

  downloadAudio() {
    const downloadLink = document.getElementById("downloadLink");
    if (!downloadLink || !downloadLink.href || downloadLink.getAttribute('download') === null) {
      this.showError("אין קובץ שמע זמין להורדה");
      return;
    }

    // הלינק כבר מוגדר עם href ו-download, רק נבצע קליק פרוגרמטי
    // נשתמש ב-downloadLink עצמו
    // const url = downloadLink.href;
    // downloadLink.click(); // לא תמיד עובד כמו שצריך, עדיף ליצור אלמנט A חדש
    
    // נשתמש ב-URL.createObjectURL שכבר נוצר ב-generateAudio
    // אבל צריך לוודא שהוא עדיין קיים או ליצור אותו מחדש אם צריך
    const url = downloadLink.href; // זהו ה-URL שנוצר מ-createObjectURL
    
    // נפתח אותו שוב כדי להבטיח שההורדה תתבצע
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadLink.getAttribute('download');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // חשוב לשחרר את ה-URL לאחר השימוש אם הוא כבר לא נחוץ,
    // אבל מכיוון שהוא משמש גם את נגן האודיו, עדיף לשמור אותו פעיל עד שהדף נסגר
    // או עד שהמשתמש מבצע פעולה אחרת.
    // URL.revokeObjectURL(url); // זה יבטל את הנגן אם נעשה מיד
  }

  // --- מתודה שהייתה חסרה וגרמה לשגיאה ---
  setupSpeakersList() {
    const speakersListDiv = document.getElementById("speakersList");
    if (!speakersListDiv) return;

    speakersListDiv.innerHTML = ""; // נקה את הרשימה הקיימת

    if (this.speakers.length === 0) {
      speakersListDiv.innerHTML = "<p>לא זוהו דוברים בתסריט.</p>";
      return;
    }

    const colors = ["#FF6347", "#4682B4", "#32CD32", "#FFD700", "#DA70D6", "#FFA07A", "#20B2AA"];
    let colorIndex = 0;

    this.speakers.forEach(speaker => {
      const speakerItem = document.createElement("div");
      speakerItem.className = "speaker-item";

      const colorDot = document.createElement("span");
      colorDot.className = "speaker-color";
      colorDot.style.backgroundColor = colors[colorIndex % colors.length];
      colorIndex++;

      const speakerName = document.createElement("span");
      speakerName.textContent = speaker;

      speakerItem.appendChild(colorDot);
      speakerItem.appendChild(speakerName);
      speakersListDiv.appendChild(speakerItem);
    });

    const scriptStatusDiv = document.getElementById("scriptStatus");
    if (scriptStatusDiv) {
      scriptStatusDiv.textContent = זוהו ${this.speakers.length} דוברים.;
      scriptStatusDiv.className = "status-message success";
      scriptStatusDiv.style.display = "block";
    }
  }

  // --- פונקציות עזר לממשק ---

  validateApiKey() {
    if (!this.apiKey) {
      this.showError("אנא הכנס מפתח API תקין לפני המשך");
      return false;
    }
    return true;
  }

  showLoading(button, spinner, btnText, isLoading) {
    if (button) button.disabled = isLoading;
    if (spinner) spinner.style.display = isLoading ? "block" : "none";
    if (btnText) btnText.style.display = isLoading ? "none" : "block";
  }

  updateUIForStep(stepNumber) {
    // הסתר את כל השלבים
    document.getElementById("step1")?.classList.add("hidden");
    document.getElementById("step2")?.classList.add("hidden");
    document.getElementById("step3")?.classList.add("hidden");

    // הצג את השלב הנוכחי
    const currentStep = document.getElementById(step${stepNumber});
    if (currentStep) {
      currentStep.classList.remove("hidden");
      currentStep.style.display = "block"; // ודא שהוא מוצג
    }
  }

  showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = message;
    element.className = status-message ${type};
    element.style.display = "block";

    if (type === "success") {
      setTimeout(() => {
        element.style.display = "none";
      }, 3000);
    }
  }

  showError(message) {
    const errorElement = document.getElementById("errorMessage");
    if (!errorElement) return;

    errorElement.textContent = message;
    errorElement.style.display = "block";

    setTimeout(() => {
      errorElement.style.display = "none";
    }, 5000);
  }

  resetForm() {
    // איפוס שדות הקלט
    document.getElementById("storyIdea").value = "";
    document.getElementById("scriptContent").value = "";
    document.getElementById("storyStyle").value = "drama";
    document.getElementById("addSoundEffects").checked = true;
    document.getElementById("addBackgroundMusic").checked = true;

    // איפוס משתנים פנימיים
    this.speakers = [];
    this.currentScript = "";
    this.currentAudioBlob = null;

    // איפוס ממשק השמע
    const audioPlayer = document.getElementById("audioPlayer");
    const audioPlaceholder = document.getElementById("audioPlaceholder");
    const downloadButton = document.getElementById("downloadAudio");

    if (audioPlayer) {
      audioPlayer.style.display = "none";
      audioPlayer.src = "";
    }
    if (audioPlaceholder) audioPlaceholder.style.display = "block";
    if (downloadButton) downloadButton.style.display = "none";

    // איפוס הודעות שגיאה/סטטוס
    document.getElementById("errorMessage").style.display = "none";
    document.getElementById("apiStatus").style.display = "none";
    document.getElementById("scriptStatus").style.display = "none";

    // חזרה לשלב הראשון
    this.updateUIForStep(1);
  }

  // --- פונקציות נוספות שצריך להוסיף או להתאים ---

  buildScriptPrompt(duration, speakersConfigValue) {
    // בניית הפרומפט כפי שמופיע בקוד המקורי שסיפקת
    let prompt = צור תסריט לסיפור בסגנון ${this.getStyleDescription(speakersConfigValue)}.;

    const storyIdea = document.getElementById("storyIdea").value.trim(); // ודא שאתה משתמש בשדה הנכון
    if (storyIdea) {
      prompt += \n\nהרעיון לסיפור: ${storyIdea};
    } else {
      prompt += \n\nצור רעיון מקורי ומעניין לסיפור.;
    }

    prompt += \n\nהוראות חשובות:
בחר את מספר הדוברים המתאים לסיפור (בהתאם לבחירה: ${speakersConfigValue})
תן לכל דובר שם ברור ומובחן (לדוגמה: man, girl, speaker1, speaker2)
השתמש בפורמט: [שם הדובר]: הטקסט שלו;

    // הוספת אפקטים קוליים ומוזיקה אם נבחרו
    const addSoundEffects = document.getElementById("addSoundEffects").checked;
    const addBackgroundMusic = document.getElementById("addBackgroundMusic").checked;

    if (addSoundEffects) {
      prompt += \n- הוסף הוראות לאפקטים קוליים במקומות מתאימים (כמו: [צליל דלת נטרקת], [רעם], [צחוק]);
    }

    if (addBackgroundMusic) {
      prompt += \n- הוסף הוראות למוזיקת רקע (כמו: [מוזיקה עצובה], [מוזיקה מותחת], [מוזיקה שמחה]);
    }

    prompt += \n\nהתסריט צריך להיות:
באורך של כ-${duration} דקות קריאה
עם דיאלוגים ברורים וחלוקה ברורה בין הדוברים
מעניין ומושך
מתאים לקהל הרחב

דוגמה לפורמט:
[מספר]: פעם, בעיר קטנה...
[גיבור]: אני חייב למצוא את האוצר!
[חבר]: בוא נלך יחד!;

    return prompt;
  }

  getStyleDescription(style) {
    // ניתן להתאים את התיאורים כאן
    const styleDescriptions = {
      drama: "דרמטי ומרגש",
      comedy: "קומי ומשעשע",
      adventure: "הרפתקני ומותח",
      male_female: "דינמי ומעניין בין גבר לאישה",
      two_males: "דינמי ומעניין בין שני גברים",
      two_females: "דינמי ומעניין בין שתי נשים",
    };
    return styleDescriptions[style] || "מעניין ומושך";
  }

  extractSpeakersFromScript(script) {
    const speakerRegex = /\[([^\]]+)\]:/g;
    const speakerSet = new Set();
    let match;

    while ((match = speakerRegex.exec(script)) !== null) {
      const speakerName = match[1].trim();
      if (speakerName && !speakerName.toLowerCase().includes("צליל") && !speakerName.toLowerCase().includes("מוזיקה") && !speakerName.toLowerCase().includes("אפקט")) {
        speakerSet.add(speakerName);
      }
    }
    this.speakers = Array.from(speakerSet);
    console.log("Extracted speakers:", this.speakers);
  }

  // --- פונקציות שצריך להתאים למבנה הקוד החדש ---

  // עדכון ה-UI למעבר בין שלבים
  updateUIForStep(stepNumber) {
    // נסתיר את כל הפאנלים ואז נציג את הנכון
    document.getElementById('setup-panel')?.classList.add('hidden');
    document.getElementById('script-panel')?.classList.add('hidden');
    document.getElementById('audio-panel')?.classList.add('hidden');

    let panelToShow;
    if (stepNumber === 1) panelToShow = 'setup-panel';
    else if (stepNumber === 2) panelToShow = 'script-panel';
    else if (stepNumber === 3) panelToShow = 'audio-panel';

    if (panelToShow) {
      const panelElement = document.getElementById(panelToShow);
      if (panelElement) {
        panelElement.classList.remove('hidden');
        panelElement.style.display = 'block'; // ודא שהוא מוצג
        panelElement.scrollIntoView({ behavior: 'smooth' }); // גלול לפאנל
      }
    }
  }

  // שימוש בפונקציות הסטטוס והשגיאה מהקוד המקורי
  showStatus(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = status-message ${type}; // או להשתמש בקלאסים מה-CSS החדש
    el.style.display = "block";
    if (type === "success") {
      setTimeout(() => { el.style.display = "none"; }, 3000);
    }
  }

  showError(message) {
    const errorElement = document.getElementById("errorMessage"); // ודא שזה שם האלמנט הנכון
    if (!errorElement) return;
    errorElement.textContent = message;
    errorElement.style.display = "block";
    setTimeout(() => { errorElement.style.display = "none"; }, 5000);
  }

  resetForm() {
    // איפוס שדות הקלט
    document.getElementById("topicInput").value = "";
    document.getElementById("durationInput").value = "7";
    document.getElementById("speakersConfig").value = "male_female";
    document.getElementById("modelSelection").value = "gemini-2.5-flash";
    document.getElementById("customModelInput").value = "";
    document.getElementById("customModelGroup").style.display = 'none';

    document.getElementById("scriptContent").value = "";
    this.currentScript = "";
    this.speakers = [];
    this.currentAudioBlob = null;

    // איפוס ממשק השמע
    const audioPlayer = document.getElementById("audioPlayer");
    const downloadLink = document.getElementById("downloadLink");
    if (audioPlayer) {
      audioPlayer.style.display = "none";
      audioPlayer.src = "";
    }
    if (downloadLink) {
      downloadLink.href = '#';
      downloadLink.setAttribute('download', '');
      downloadLink.style.pointerEvents = 'none';
      downloadLink.style.opacity = '0.5';
    }

    // איפוס הודעות סטטוס
    document.getElementById("status-script").textContent = "";
    document.getElementById("status-audio").textContent = "";
    document.getElementById("errorMessage").style.display = "none";

    this.updateUIForStep(1); // חזרה לשלב הראשון
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new StoryGenerator();
});
