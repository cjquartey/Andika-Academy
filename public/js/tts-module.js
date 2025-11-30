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
        
        // Load voices with error handling
        this.loadVoices();
        if (speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
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
        try {
            this.voices = this.synth.getVoices();
            // Prefer English voices
            const englishVoices = this.voices.filter(v => v && v.lang && v.lang.startsWith('en'));
            if (englishVoices.length > 0 && !this.settings.voice) {
                this.settings.voice = englishVoices[0];
            } else if (this.voices.length > 0 && !this.settings.voice) {
                // Fallback to first available voice
                this.settings.voice = this.voices[0];
            }
        } catch (error) {
            console.error('Error loading voices:', error);
            this.voices = [];
        }
    }

    // Extract clean text content from the writing
    extractTextContent(writing) {
        if (!writing) {
            console.error('No writing provided to extractTextContent');
            return '';
        }

        let text = '';
        
        try {
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
                .replace(/null/gi, '') // Remove any "null" text
                .trim();

        } catch (error) {
            console.error('Error extracting text content:', error);
            return writing.title || 'Content unavailable';
        }

        return text;
    }

    //  Start reading the content
    speak(text, onStart, onEnd, onError) {
        try {
            // Cancel any ongoing speech
            this.synth.cancel();
            
            if (!text || !text.trim()) {
                if (onError) onError('No text to read');
                return;
            }

            this.textContent = text;
            this.utterance = new SpeechSynthesisUtterance(text);
            
            // Apply settings with fallbacks
            if (this.settings.voice) {
                this.utterance.voice = this.settings.voice;
            }
            this.utterance.rate = this.settings.rate || 1.0;
            this.utterance.pitch = this.settings.pitch || 1.0;
            
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
                if (onError) onError(event.error || 'Speech synthesis error');
            };
            
            // Start speaking
            this.synth.speak(this.utterance);
        } catch (error) {
            console.error('Error in speak function:', error);
            if (onError) onError(error.message || 'Failed to start speech');
        }
    }

    // Pause the reading
    pause() {
        try {
            if (this.synth.speaking && !this.isPaused) {
                this.synth.pause();
                this.isPaused = true;
                return true;
            }
        } catch (error) {
            console.error('Error pausing speech:', error);
        }
        return false;
    }

    // Resume the reading
    resume() {
        try {
            if (this.isPaused) {
                this.synth.resume();
                this.isPaused = false;
                return true;
            }
        } catch (error) {
            console.error('Error resuming speech:', error);
        }
        return false;
    }

    // Stop the reading
    stop() {
        try {
            this.synth.cancel();
            this.isReading = false;
            this.isPaused = false;
        } catch (error) {
            console.error('Error stopping speech:', error);
        }
    }

    // Toggle play/pause
    togglePlayPause(text, onStart, onEnd, onError) {
        try {
            if (this.isReading) {
                if (this.isPaused) {
                    this.resume();
                } else {
                    this.pause();
                }
            } else {
                this.speak(text, onStart, onEnd, onError);
            }
        } catch (error) {
            console.error('Error in togglePlayPause:', error);
            if (onError) onError(error.message || 'Failed to toggle playback');
        }
    }

    // Update TTS settings
    updateSettings(settings) {
        try {
            if (settings.rate !== undefined) {
                this.settings.rate = Math.max(0.5, Math.min(2, settings.rate));
            }
            if (settings.pitch !== undefined) {
                this.settings.pitch = Math.max(0.5, Math.min(2, settings.pitch));
            }
            if (settings.voice !== undefined) {
                this.settings.voice = settings.voice;
            }
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    }

    // Get available voices
    getVoices() {
        try {
            // Refresh voices in case they weren't loaded before
            if (this.voices.length === 0) {
                this.loadVoices();
            }
            return this.voices || [];
        } catch (error) {
            console.error('Error getting voices:', error);
            return [];
        }
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