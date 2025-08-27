class StoryGenerator {
  constructor() {
    this.apiKey = localStorage.getItem("gemini_api_key") || ""
    this.currentAudioBlob = null
    this.currentScript = ""
    this.speakers = []
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
      const storyStyle = document.getElementById("storyStyle").value
      const addSoundEffects = document.getElementById("addSoundEffects").checked
      const addBackgroundMusic = document.getElementById("addBackgroundMusic").checked

      const prompt = this.buildScriptPrompt(storyIdea, storyStyle, addSoundEffects, addBackgroundMusic)

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
      this.currentScript = scriptContent

      this.extractSpeakersFromScript(scriptContent)
      this.setupSpeakersList()
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

      if (!scriptContent) {
        throw new Error("אנא הכנס תסריט לפני יצירת השמע")
      }

      await this.generateAudioWithWebSpeech(scriptContent)
      this.showStep(3)
    } catch (error) {
      console.error("Error generating audio:", error)
      this.showError("שגיאה ביצירת השמע: " + error.message)
    } finally {
      this.setLoading(button, spinner, btnText, false)
    }
  }

  buildScriptPrompt(storyIdea, storyStyle, addSoundEffects, addBackgroundMusic) {
    let prompt = `צור תסריט לסיפור ${this.getStyleDescription(storyStyle)}.`

    if (storyIdea) {
      prompt += `\n\nהרעיון לסיפור: ${storyIdea}`
    } else {
      prompt += `\n\nצור רעיון מקורי ומעניין לסיפור.`
    }

    prompt += `\n\nהוראות חשובות:
- בחר את מספר הדוברים המתאים לסיפור (בין 2-4 דוברים)
- תן לכל דובר שם ברור ומובחן
- השתמש בפורמט: [שם הדובר]: הטקסט שלו`

    if (addSoundEffects) {
      prompt += `\n- הוסף הוראות לאפקטים קוליים במקומות מתאימים (כמו: [צליל דלת נטרalte], [רעם], [צחוק])`
    }

    if (addBackgroundMusic) {
      prompt += `\n- הוסף הוראות למוזיקת רקע (כמו: [מוזיקה עצובה], [מוזיקה מתחה], [מוזיקה שמחה])`
    }

    prompt += `\n\nהתסריט צריך להיות:
- באורך של 2-3 דקות קריאה
- עם דיאלוגים ברורים וחלוקה ברורה בין הדוברים
- מעניין ומושך
- מתאים לקהל הרחב

דוגמה לפורמט:
[מספר]: פעם, בעיר קטנה...
[גיבור]: אני חייב למצוא את האוצר!
[חבר]: בוא נלך יחד!`

    return prompt
  }

  getStyleDescription(style) {
    const styleDescriptions = {
      drama: "דרמטי ומרגש",
      comedy: "קומי ומשעשע",
      adventure: "הרפתקני ומותח",
      fantasy: "פנטזיה קסומה",
      mystery: "מסתורין מותח",
      romance: "רומנטי ומרגש",
      horror: "אימה מותחת",
      scifi: "מדע בדיוני עתידני",
    }

    return styleDescriptions[style] || "מעניין ומושך"
  }

  extractSpeakersFromScript(script) {
    const speakerRegex = /\[([^\]]+)\]:/g
    const speakerSet = new Set()
    let match

    while ((match = speakerRegex.exec(script)) !== null) {
      const speakerName = match[1].trim()
      if (speakerName && !speakerName.includes("צליל") && !speakerName.includes("מוזיקה")) {
        speakerSet.add(speakerName)
      }
    }

    this.speakers = Array.from(speakerSet)
    console.log("[v0] Extracted speakers:", this.speakers)
  }

  setupSpeakersList() {
    // This function sets up the speakers list for the audio generation
    // Since we're using Web Speech API, we just need to ensure speakers are ready
    if (this.speakers.length > 0) {
      console.log("[v0] Speakers setup complete:", this.speakers)
      this.showStatus("scriptStatus", `נמצאו ${this.speakers.length} דוברים: ${this.speakers.join(", ")}`, "success")
    } else {
      console.log("[v0] No speakers found in script")
      this.showStatus("scriptStatus", "לא נמצאו דוברים בתסריט", "error")
    }
  }

  async generateAudioWithWebSpeech(scriptContent) {
    if (!("speechSynthesis" in window)) {
      throw new Error("הדפדפן שלך לא תומך ביצירת שמע")
    }

    return new Promise((resolve, reject) => {
      try {
        const segments = this.parseScriptSegments(scriptContent)

        if (segments.length === 0) {
          throw new Error("לא נמצאו קטעי דיבור בתסריט")
        }

        // Create audio context for recording
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const mediaStreamDestination = audioContext.createMediaStreamDestination()

        // Setup MediaRecorder
        const mediaRecorder = new MediaRecorder(mediaStreamDestination.stream, {
          mimeType: "audio/webm;codecs=opus",
        })

        const audioChunks = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" })
          this.handleAudioResponse(audioBlob)
          resolve()
        }

        // Start recording
        mediaRecorder.start()

        let currentSegment = 0

        const processNextSegment = () => {
          if (currentSegment >= segments.length) {
            // Stop recording after a short delay
            setTimeout(() => {
              mediaRecorder.stop()
              audioContext.close()
            }, 1000)
            return
          }

          const segment = segments[currentSegment]
          const utterance = new SpeechSynthesisUtterance(segment.text)

          // Get available voices
          const voices = speechSynthesis.getVoices()
          const speakerIndex = this.speakers.indexOf(segment.speaker)

          // Assign different voices to different speakers
          if (voices.length > 0) {
            const voiceIndex = speakerIndex % voices.length
            utterance.voice = voices[voiceIndex]
          }

          utterance.rate = 0.9
          utterance.pitch = 1 + speakerIndex * 0.1
          utterance.volume = 1

          utterance.onstart = () => {
            console.log(`[v0] Speaking: ${segment.speaker} - ${segment.text.substring(0, 50)}...`)
          }

          utterance.onend = () => {
            currentSegment++
            // Add pause between speakers
            setTimeout(processNextSegment, 800)
          }

          utterance.onerror = (error) => {
            console.error("[v0] Speech synthesis error:", error)
            mediaRecorder.stop()
            audioContext.close()
            reject(new Error("שגיאה ביצירת השמע: " + error.error))
          }

          speechSynthesis.speak(utterance)
        }

        // Wait for voices to load, then start
        if (speechSynthesis.getVoices().length === 0) {
          speechSynthesis.onvoiceschanged = () => {
            processNextSegment()
          }
        } else {
          processNextSegment()
        }
      } catch (error) {
        console.error("[v0] Error in generateAudioWithWebSpeech:", error)
        reject(error)
      }
    })
  }

  parseScriptSegments(script) {
    const lines = script.split("\n")
    const segments = []

    for (const line of lines) {
      const match = line.match(/\[([^\]]+)\]:\s*(.+)/)
      if (match) {
        const speaker = match[1].trim()
        const text = match[2].trim()

        if (!speaker.includes("צליל") && !speaker.includes("מוזיקה") && text) {
          segments.push({ speaker, text })
        }
      }
    }

    return segments
  }

  combineAudioChunks(chunks) {
    console.log("[v0] Audio chunks combined successfully")
  }

  createDummyWavBlob() {
    console.log("[v0] createDummyWavBlob called but not needed with MediaRecorder")
    return null
  }

  handleAudioResponse(audioBlob) {
    try {
      console.log("[v0] Handling audio response, blob size:", audioBlob.size)
      this.currentAudioBlob = audioBlob

      const audioPlayer = document.getElementById("audioPlayer")
      const audioPlaceholder = document.getElementById("audioPlaceholder")
      const downloadButton = document.getElementById("downloadAudio")

      const audioUrl = URL.createObjectURL(this.currentAudioBlob)
      audioPlayer.src = audioUrl
      audioPlayer.style.display = "block"
      audioPlaceholder.style.display = "none"
      downloadButton.style.display = "inline-flex"

      console.log("[v0] Audio player setup complete")
    } catch (error) {
      console.error("[v0] Error handling audio response:", error)
      this.showError("שגיאה בעיבוד קובץ השמע: " + error.message)
    }
  }

  downloadAudio() {
    if (!this.currentAudioBlob) {
      this.showError("אין קובץ שמע להורדה")
      return
    }

    const url = URL.createObjectURL(this.currentAudioBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `story_${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log("[v0] Audio download initiated")
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
    document.getElementById("storyIdea").value = ""
    document.getElementById("scriptContent").value = ""
    document.getElementById("storyStyle").value = "drama"
    document.getElementById("addSoundEffects").checked = true
    document.getElementById("addBackgroundMusic").checked = true

    this.speakers = []
    this.currentScript = ""

    const audioPlayer = document.getElementById("audioPlayer")
    const audioPlaceholder = document.getElementById("audioPlaceholder")
    const downloadButton = document.getElementById("downloadAudio")

    audioPlayer.style.display = "none"
    audioPlayer.src = ""
    audioPlaceholder.style.display = "block"
    downloadButton.style.display = "none"

    this.currentAudioBlob = null

    this.showStep(1)

    document.getElementById("errorMessage").style.display = "none"
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new StoryGenerator()
})
