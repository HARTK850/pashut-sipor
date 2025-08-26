class StoryGenerator {
  constructor() {
    this.apiKey = localStorage.getItem("gemini_api_key") || ""
    this.currentAudioBlob = null
    this.init()
  }

  init() {
    this.bindEvents()
    this.loadApiKey()
  }

  bindEvents() {
    // API Key management
    document.getElementById("saveApiKey").addEventListener("click", () => this.saveApiKey())
    document.getElementById("apiKey").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.saveApiKey()
    })

    // Story generation
    document.getElementById("generateScript").addEventListener("click", () => this.generateScript())
    document.getElementById("generateAudio").addEventListener("click", () => this.generateAudio())

    // Audio controls
    document.getElementById("downloadAudio").addEventListener("click", () => this.downloadAudio())
    document.getElementById("createNew").addEventListener("click", () => this.resetForm())
  }

  loadApiKey() {
    if (this.apiKey) {
      document.getElementById("apiKey").value = this.apiKey
      this.showStatus("apiStatus", "מפתח API נשמר בהצלחה", "success")
    }
  }

  saveApiKey() {
    const apiKeyInput = document.getElementById("apiKey")
    const apiKey = apiKeyInput.value.trim()

    if (!apiKey) {
      this.showStatus("apiStatus", "אנא הכנס מפתח API תקין", "error")
      return
    }

    this.apiKey = apiKey
    localStorage.setItem("gemini_api_key", apiKey)
    this.showStatus("apiStatus", "מפתח API נשמר בהצלחה", "success")
  }

  async generateScript() {
    if (!this.validateApiKey()) return

    const button = document.getElementById("generateScript")
    const spinner = button.querySelector(".spinner")
    const btnText = button.querySelector(".btn-text")

    this.setLoading(button, spinner, btnText, true)

    try {
      const storyIdea = document.getElementById("storyIdea").value.trim()
      const speakerCount = Number.parseInt(document.getElementById("speakerCount").value)
      const storyStyle = document.getElementById("storyStyle").value
      const addSoundEffects = document.getElementById("addSoundEffects").checked
      const addBackgroundMusic = document.getElementById("addBackgroundMusic").checked

      const prompt = this.buildScriptPrompt(storyIdea, speakerCount, storyStyle, addSoundEffects, addBackgroundMusic)

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const scriptContent = data.candidates[0].content.parts[0].text

      document.getElementById("scriptContent").value = scriptContent
      this.setupSpeakersList(speakerCount)
      this.showStep(2)
    } catch (error) {
      console.error("Error generating script:", error)
      this.showError("שגיאה ביצירת התסריט: " + error.message)
    } finally {
      this.setLoading(button, spinner, btnText, false)
    }
  }

  async generateAudio() {
    if (!this.validateApiKey()) return

    const button = document.getElementById("generateAudio")
    const spinner = button.querySelector(".spinner")
    const btnText = button.querySelector(".btn-text")

    this.setLoading(button, spinner, btnText, true)

    try {
      const scriptContent = document.getElementById("scriptContent").value.trim()
      const speakerCount = Number.parseInt(document.getElementById("speakerCount").value)

      if (!scriptContent) {
        throw new Error("אנא הכנס תסריט לפני יצירת השמע")
      }

      const speechConfig = this.buildSpeechConfig(speakerCount)

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: scriptContent,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "audio/wav",
              speechConfig: speechConfig,
            },
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts[0].inlineData
      ) {
        const audioData = data.candidates[0].content.parts[0].inlineData.data
        this.handleAudioResponse(audioData)
        this.showStep(3)
      } else {
        throw new Error("לא התקבלו נתוני שמע מהשרת")
      }
    } catch (error) {
      console.error("Error generating audio:", error)
      this.showError("שגיאה ביצירת השמע: " + error.message)
    } finally {
      this.setLoading(button, spinner, btnText, false)
    }
  }

  buildScriptPrompt(storyIdea, speakerCount, storyStyle, addSoundEffects, addBackgroundMusic) {
    let prompt = `צור תסריט לסיפור ${this.getStyleDescription(storyStyle)} עם ${speakerCount} דוברים.`

    if (storyIdea) {
      prompt += `\n\nהרעיון לסיפור: ${storyIdea}`
    } else {
      prompt += `\n\nצור רעיון מקורי ומעניין לסיפור.`
    }

    prompt += `\n\nהדוברים:`
    const speakers = this.getSpeakerNames(speakerCount)
    speakers.forEach((speaker, index) => {
      prompt += `\n- ${speaker}`
    })

    if (addSoundEffects) {
      prompt += `\n\nהוסף הוראות לאפקטים קוליים במקומות מתאימים (כמו: [צליל דלת נטרקת], [רעם], [צחוק]).`
    }

    if (addBackgroundMusic) {
      prompt += `\n\nהוסף הוראות למוזיקת רקע (כמו: [מוזיקה עצובה], [מוזיקה מתחה], [מוזיקה שמחה]).`
    }

    prompt += `\n\nהתסריט צריך להיות:
- באורך של 2-3 דקות קריאה
- עם דיאלוגים ברורים וחלוקה ברורה בין הדוברים
- מעניין ומושך
- מתאים לקהל הרחב

פורמט התסריט:
[שם הדובר]: הטקסט שלו
[שם דובר אחר]: הטקסט שלו
וכן הלאה...`

    return prompt
  }

  buildSpeechConfig(speakerCount) {
    const voiceNames = ["Sadaltager", "Kore", "Pulcherrima", "Fenrir"]
    const speakers = this.getSpeakerNames(speakerCount)

    const speakerVoiceConfigs = speakers.map((speaker, index) => ({
      speaker: speaker,
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: voiceNames[index % voiceNames.length],
        },
      },
    }))

    return {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: speakerVoiceConfigs,
      },
    }
  }

  getSpeakerNames(count) {
    const allSpeakers = ["מספר", "גיבור", "נבל", "חבר"]
    return allSpeakers.slice(0, count)
  }

  getStyleDescription(style) {
    const styles = {
      drama: "דרמטי ורגשי",
      comedy: "קומי ומשעשע",
      children: "לילדים, חינוכי ומתאים לגילאים צעירים",
      thriller: "מתח ומסתורין",
      adventure: "הרפתקאות ופעולה",
    }
    return styles[style] || "כללי"
  }

  setupSpeakersList(speakerCount) {
    const speakersList = document.getElementById("speakersList")
    const speakers = this.getSpeakerNames(speakerCount)
    const colors = ["#4facfe", "#00f2fe", "#a8edea", "#fed6e3"]

    speakersList.innerHTML = "<h3>דוברים בסיפור:</h3>"
    speakers.forEach((speaker, index) => {
      const speakerItem = document.createElement("div")
      speakerItem.className = "speaker-item"
      speakerItem.innerHTML = `
                <div class="speaker-color" style="background-color: ${colors[index]}"></div>
                <span>${speaker}</span>
            `
      speakersList.appendChild(speakerItem)
    })
  }

  handleAudioResponse(base64AudioData) {
    try {
      // Convert base64 to binary
      const binaryString = atob(base64AudioData)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Create WAV blob
      this.currentAudioBlob = this.createWavBlob(bytes)

      // Setup audio player
      const audioPlayer = document.getElementById("audioPlayer")
      const audioPlaceholder = document.getElementById("audioPlaceholder")
      const downloadButton = document.getElementById("downloadAudio")

      audioPlayer.src = URL.createObjectURL(this.currentAudioBlob)
      audioPlayer.style.display = "block"
      audioPlaceholder.style.display = "none"
      downloadButton.style.display = "inline-flex"
    } catch (error) {
      console.error("Error handling audio response:", error)
      this.showError("שגיאה בעיבוד קובץ השמע: " + error.message)
    }
  }

  createWavBlob(pcmData) {
    const sampleRate = 24000
    const numChannels = 1
    const bitsPerSample = 16

    const dataLength = pcmData.length
    const buffer = new ArrayBuffer(44 + dataLength)
    const view = new DataView(buffer)

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, 36 + dataLength, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, (sampleRate * numChannels * bitsPerSample) / 8, true)
    view.setUint16(32, (numChannels * bitsPerSample) / 8, true)
    view.setUint16(34, bitsPerSample, true)
    writeString(36, "data")
    view.setUint32(40, dataLength, true)

    // Copy PCM data
    const uint8Array = new Uint8Array(buffer, 44)
    uint8Array.set(pcmData)

    return new Blob([buffer], { type: "audio/wav" })
  }

  downloadAudio() {
    if (!this.currentAudioBlob) {
      this.showError("אין קובץ שמע להורדה")
      return
    }

    const url = URL.createObjectURL(this.currentAudioBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `story_${Date.now()}.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  validateApiKey() {
    if (!this.apiKey) {
      this.showError("אנא הכנס מפתח API תקין לפני המשך")
      return false
    }
    return true
  }

  setLoading(button, spinner, btnText, isLoading) {
    button.disabled = isLoading
    spinner.style.display = isLoading ? "block" : "none"
    btnText.style.display = isLoading ? "none" : "block"
  }

  showStep(stepNumber) {
    // Hide all steps
    for (let i = 1; i <= 3; i++) {
      const step = document.getElementById(`step${i}`)
      if (step) {
        step.style.display = i <= stepNumber ? "block" : "none"
      }
    }
  }

  showStatus(elementId, message, type) {
    const element = document.getElementById(elementId)
    element.textContent = message
    element.className = `status-message ${type}`
    element.style.display = "block"

    if (type === "success") {
      setTimeout(() => {
        element.style.display = "none"
      }, 3000)
    }
  }

  showError(message) {
    const errorElement = document.getElementById("errorMessage")
    errorElement.textContent = message
    errorElement.style.display = "block"

    setTimeout(() => {
      errorElement.style.display = "none"
    }, 5000)
  }

  resetForm() {
    // Reset form fields
    document.getElementById("storyIdea").value = ""
    document.getElementById("scriptContent").value = ""
    document.getElementById("speakerCount").value = "3"
    document.getElementById("storyStyle").value = "drama"
    document.getElementById("addSoundEffects").checked = true
    document.getElementById("addBackgroundMusic").checked = true

    // Reset audio player
    const audioPlayer = document.getElementById("audioPlayer")
    const audioPlaceholder = document.getElementById("audioPlaceholder")
    const downloadButton = document.getElementById("downloadAudio")

    audioPlayer.style.display = "none"
    audioPlayer.src = ""
    audioPlaceholder.style.display = "block"
    downloadButton.style.display = "none"

    // Reset current audio blob
    this.currentAudioBlob = null

    // Show only first step
    this.showStep(1)

    // Clear error messages
    document.getElementById("errorMessage").style.display = "none"
  }
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  new StoryGenerator()
})
