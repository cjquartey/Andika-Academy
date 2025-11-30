// Text-to-Speech Module for Andika Academy

class WritingTTS {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.isPaused = false;
        this.isReading = false;
        this.voices = [];
        this.currentPosition = 0;
        this.textContent = '';
        
        // Load voices
        this.loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }

        // Default settings
        this.settings = {
            rate: 1.0,
            pitch: 1.0,
            voice: null
        };
    }

    loadVoices() {
        this.voices = this.synth.getVoices();
        // Prefer English voices
        const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
        if (englishVoices.length > 0 && !this.settings.voice) {
            this.settings.voice = englishVoices[0];
        }
    }

    // Extract clean text content from the writing
    extractTextContent(writing) {
        let text = '';
        
        // Add title
        if (writing.title) {
            text += writing.title + '. ';
        }
        
        // Add description if available and not empty
        if (writing.description && writing.description.trim()) {
            text += writing.description + '. ';
        }

        // Extract content based on category
        if (writing.category === 'prose') {
            if (writing.content) {
                text += writing.content;
            }
        } else if (writing.category === 'poetry' && writing.stanzas && writing.stanzas.length > 0) {
            // For poetry, read stanza by stanza with pauses
            writing.stanzas.forEach((stanza, index) => {
                if (stanza.title && stanza.title.trim()) {
                    text += stanza.title + '. ';
                }
                if (stanza.lines && stanza.lines.length > 0) {
                    stanza.lines.forEach(line => {
                        if (line && line.trim()) {
                            text += line + '. ';
                        }
                    });
                }
                if (index < writing.stanzas.length - 1) {
                    text += ' ... '; // Pause between stanzas
                }
            });
        } else if (writing.category === 'drama' && writing.dialogues && writing.dialogues.length > 0) {
            // For drama, read speaker names and their text
            writing.dialogues.forEach(dialogue => {
                if (dialogue.speaker && dialogue.speaker.trim()) {
                    text += `${dialogue.speaker} says: `;
                }
                if (dialogue.text && dialogue.text.trim()) {
                    text += dialogue.text + '. ';
                }
                if (dialogue.stageDirection && dialogue.stageDirection.trim()) {
                    text += `Stage direction: ${dialogue.stageDirection}. `;
                }
            });
        }

        // Clean up the text
        text = text
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/undefined/gi, '') // Remove any "undefined" text
            .trim();

        return text;
    }

    //  Start reading the content
    speak(text, onStart, onEnd, onError) {
        // Cancel any ongoing speech
        this.synth.cancel();
        
        if (!text || !text.trim()) {
            if (onError) onError('No text to read');
            return;
        }

        this.textContent = text;
        this.utterance = new SpeechSynthesisUtterance(text);
        
        // Apply settings
        if (this.settings.voice) {
            this.utterance.voice = this.settings.voice;
        }
        this.utterance.rate = this.settings.rate;
        this.utterance.pitch = this.settings.pitch;
        
        // Event handlers
        this.utterance.onstart = () => {
            this.isReading = true;
            this.isPaused = false;
            if (onStart) onStart();
        };
        
        this.utterance.onend = () => {
            this.isReading = false;
            this.isPaused = false;
            if (onEnd) onEnd();
        };
        
        this.utterance.onerror = (event) => {
            console.error('TTS error:', event);
            this.isReading = false;
            this.isPaused = false;
            if (onError) onError(event.error);
        };
        
        // Start speaking
        this.synth.speak(this.utterance);
    }

    // Pause the reading
    pause() {
        if (this.synth.speaking && !this.isPaused) {
            this.synth.pause();
            this.isPaused = true;
            return true;
        }
        return false;
    }

    // Resume the reading
    resume() {
        if (this.isPaused) {
            this.synth.resume();
            this.isPaused = false;
            return true;
        }
        return false;
    }

    // Stop the reading
    stop() {
        this.synth.cancel();
        this.isReading = false;
        this.isPaused = false;
    }

    // Toggle play/pause
    togglePlayPause(text, onStart, onEnd, onError) {
        if (this.isReading) {
            if (this.isPaused) {
                this.resume();
            } else {
                this.pause();
            }
        } else {
            this.speak(text, onStart, onEnd, onError);
        }
    }

    // Update TTS settings
    updateSettings(settings) {
        if (settings.rate !== undefined) {
            this.settings.rate = settings.rate;
        }
        if (settings.pitch !== undefined) {
            this.settings.pitch = settings.pitch;
        }
        if (settings.voice !== undefined) {
            this.settings.voice = settings.voice;
        }
    }

    // Get available voices
    getVoices() {
        return this.voices;
    }

    // Check if TTS is supported
    static isSupported() {
        return 'speechSynthesis' in window;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WritingTTS;
}