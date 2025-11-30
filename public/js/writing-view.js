// Get writing ID from URL
const urlParams = new URLSearchParams(window.location.search);
const writingId = urlParams.get('id');

// State
let currentWriting = null;
let currentUser = null;
let selectedRating = 0;
let isBookmarked = false;

// For TTS
let ttsInstance = null;
let ttsInitialized = false;

// DOM Elements
const loadingEl = document.getElementById('loading');
const errorStateEl = document.getElementById('error-state');
const writingContentEl = document.getElementById('writing-content');
const coverSectionEl = document.getElementById('cover-section');
const coverImageEl = document.getElementById('cover-image');
const breadcrumbCategoryEl = document.getElementById('breadcrumb-category');
const categoryBadgeEl = document.getElementById('category-badge');
const writingTitleEl = document.getElementById('writing-title');
const writingDescriptionEl = document.getElementById('writing-description');
const authorAvatarEl = document.getElementById('author-avatar');
const authorNameEl = document.getElementById('author-name');
const publishDateEl = document.getElementById('publish-date');
const viewCountEl = document.getElementById('view-count');
const ratingDisplayEl = document.getElementById('rating-display');
const readingTimeEl = document.getElementById('reading-time');
const tagsContainerEl = document.getElementById('tags-container');
const premiumGateEl = document.getElementById('premium-gate');
const writingBodyEl = document.getElementById('writing-body');
const authorBioAvatarEl = document.getElementById('author-bio-avatar');
const authorBioNameEl = document.getElementById('author-bio-name');
const authorBioEl = document.getElementById('author-bio');
const ratingSectionEl = document.getElementById('rating-section');
const commentFormContainerEl = document.getElementById('comment-form-container');
const commentLoginPromptEl = document.getElementById('comment-login-prompt');
const commentFormEl = document.getElementById('comment-form');
const commentContentEl = document.getElementById('comment-content');
const charCountEl = document.getElementById('char-count');
const commentCountEl = document.getElementById('comment-count');
const commentsLoadingEl = document.getElementById('comments-loading');
const commentsListEl = document.getElementById('comments-list');
const commentsEmptyEl = document.getElementById('comments-empty');
const bookmarkBtnEl = document.getElementById('bookmark-btn');
const starBtns = document.querySelectorAll('.star-btn');

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// Calculate reading time
function calculateReadingTime(text) {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
}

// Check if user can access writing
function canAccessWriting(writing) {
    if (writing.accessLevel === 'free') return true;
    if (!currentUser) return false;
    return currentUser.subscriptionTier === 'premium';
}

// Load writing
async function loadWriting() {
    if (!writingId) {
        showError('No writing ID provided');
        return;
    }

    try {
        loadingEl.style.display = 'flex';
        errorStateEl.style.display = 'none';
        writingContentEl.style.display = 'none';

        const response = await API.get(`/writings/${writingId}`);
        
        if (!response.success || !response.data) {
            showError('Story not found');
            return;
        }

        currentWriting = response.data;
        displayWriting(currentWriting);
        loadComments();
        checkBookmarkStatus();

    } catch (error) {
        console.error('Failed to load writing:', error);
        showError(error.message || 'Failed to load story');
    } finally {
        loadingEl.style.display = 'none';
    }
}

// Display writing
function displayWriting(writing) {
    // Set page title
    document.getElementById('page-title').textContent = `${writing.title} - Andika Academy`;

    // Cover image
    if (writing.coverImageURL) {
        coverImageEl.src = writing.coverImageURL;
        coverImageEl.alt = writing.title;
        coverSectionEl.style.display = 'block';
    }
    else {
        coverImageEl.src = '/public/uploads/covers/default-cover.jpg';
        coverImageEl.alt = writing.title;
        coverSectionEl.style.display = 'block';
    }

    // Breadcrumb
    breadcrumbCategoryEl.textContent = CONFIG.CATEGORIES[writing.category];

    // Category badge
    categoryBadgeEl.textContent = CONFIG.CATEGORIES[writing.category];

    // Title and description
    writingTitleEl.textContent = writing.title;
    if (writing.description) {
        writingDescriptionEl.textContent = writing.description;
    } else {
        writingDescriptionEl.style.display = 'none';
    }

    // Author info
    const authorAvatar = writing.author?.profilePictureURL || '/public/uploads/profiles/default-avatar.jpg';
    const authorName = writing.author?.username || 'Anonymous';
    authorAvatarEl.src = authorAvatar;
    authorAvatarEl.alt = authorName;
    authorNameEl.textContent = authorName;
    publishDateEl.textContent = formatDate(writing.publishedAt || writing.createdAt);

    // Author links
    if (writing.author) {
        const authorLink = document.getElementById('author-link');
        const authorProfileLink = document.getElementById('author-profile-link');
        authorLink.href = `/views/profile.html?userId=${writing.author._id}`;
        authorProfileLink.href = `/views/profile.html?userId=${writing.author._id}`;
    }

    // Stats
    viewCountEl.textContent = `${writing.viewCount || 0} ${writing.viewCount === 1 ? 'view' : 'views'}`;
    
    if (writing.ratingCount > 0) {
        ratingDisplayEl.textContent = `${writing.averageRating.toFixed(1)} (${writing.ratingCount} ${writing.ratingCount === 1 ? 'rating' : 'ratings'})`;
    } else {
        ratingDisplayEl.textContent = 'No ratings yet';
    }

    // Calculate reading time based on category
    let readingTime;
    if (writing.category === 'prose') {
        readingTime = calculateReadingTime(writing.content || '');
    } else if (writing.category === 'poetry' && writing.stanzas) {
        const totalLines = writing.stanzas.reduce((sum, stanza) => sum + stanza.lines.length, 0);
        readingTime = `${totalLines} lines`;
    } else if (writing.category === 'drama' && writing.dialogues) {
        readingTime = `${writing.dialogues.length} scenes`;
    } else {
        readingTime = 'Unknown';
    }
    readingTimeEl.textContent = readingTime;

    // Tags
    if (writing.tags && writing.tags.length > 0) {
        tagsContainerEl.innerHTML = writing.tags.map(tag => 
            `<span class="tag">${tag}</span>`
        ).join('');
    }

    // Content or premium gate
    const canAccess = canAccessWriting(writing);
    
    if (canAccess) {
        writingBodyEl.innerHTML = formatWritingContent(writing);
        writingBodyEl.style.display = 'block';
        premiumGateEl.style.display = 'none';

        createTTSUI();
    } else {
        writingBodyEl.innerHTML = formatExcerpt(writing);
        writingBodyEl.style.display = 'block';
        premiumGateEl.style.display = 'block';
    }

    // Author bio
    authorBioAvatarEl.src = authorAvatar;
    authorBioAvatarEl.alt = authorName;
    authorBioNameEl.textContent = authorName;
    if (writing.author?.bio) {
        authorBioEl.textContent = writing.author.bio;
    }

    // Rating section (only for authenticated users)
    if (Auth.isAuthenticated()) {
        ratingSectionEl.style.display = 'block';
        setupRatingInput();
    }

    // Comment form
    if (Auth.isAuthenticated()) {
        commentFormContainerEl.style.display = 'block';
        commentLoginPromptEl.style.display = 'none';
    } else {
        commentFormContainerEl.style.display = 'none';
        commentLoginPromptEl.style.display = 'block';
    }

    writingContentEl.style.display = 'block';
}

// Format writing content based on category
function formatWritingContent(writing) {
    const category = writing.category;
    
    if (category === 'prose') {
        return `<div class="prose-content">${writing.content.replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>')}</div>`;
    } 
    else if (category === 'poetry' && writing.stanzas) {
        return '<div class="poetry-content">' + 
            writing.stanzas.map(stanza => 
                `<div class="stanza">${stanza.lines.map(line => 
                    `<div class="line">${line}</div>`
                ).join('')}</div>`
            ).join('') +
            '</div>';
    } 
    else if (category === 'drama' && writing.dialogues) {
        return '<div class="drama-content">' +
            writing.dialogues.map(dialogue => `
                <div class="dialogue-entry">
                    <div class="speaker">${dialogue.speaker}</div>
                    <div class="dialogue-text">${dialogue.text}</div>
                    ${dialogue.stageDirection ? `<div class="stage-direction">[${dialogue.stageDirection}]</div>` : ''}
                </div>
            `).join('') +
            '</div>';
    }
    
    return '<p>Content unavailable</p>';
};

function createTTSUI() {
    // Check if TTS is supported
    if (!WritingTTS.isSupported()) {
        console.warn('Text-to-Speech is not supported in this browser');
        return;
    }

    // Create TTS container
    const ttsContainer = document.createElement('div');
    ttsContainer.className = 'tts-container';
    ttsContainer.id = 'tts-container';
    ttsContainer.innerHTML = `
        <div class="tts-control-bar">
            <div class="tts-main-controls">
                <button class="tts-play-btn" id="tts-play-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    <span id="tts-btn-text">Listen to Story</span>
                </button>
                <button class="tts-stop-btn" id="tts-stop-btn" disabled>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <rect x="6" y="6" width="12" height="12"/>
                    </svg>
                </button>
                <div class="tts-status idle" id="tts-status">
                    <span class="tts-status-indicator"></span>
                    <span id="tts-status-text">Ready</span>
                </div>
            </div>
            <button class="tts-settings-toggle" id="tts-settings-toggle" title="Settings">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"/>
                </svg>
            </button>
        </div>
        <div class="tts-settings-panel" id="tts-settings-panel">
            <div class="tts-setting-group">
                <label class="tts-setting-label">Voice</label>
                <div class="tts-setting-control">
                    <select class="tts-select" id="tts-voice-select">
                        <option value="">Loading voices...</option>
                    </select>
                </div>
            </div>
            <div class="tts-setting-group">
                <label class="tts-setting-label">Speed</label>
                <div class="tts-setting-control">
                    <input type="range" class="tts-slider" id="tts-rate-slider" 
                           min="0.5" max="2" step="0.1" value="1">
                    <span class="tts-value-display" id="tts-rate-value">1.0x</span>
                </div>
            </div>
            <div class="tts-setting-group">
                <label class="tts-setting-label">Pitch</label>
                <div class="tts-setting-control">
                    <input type="range" class="tts-slider" id="tts-pitch-slider" 
                           min="0.5" max="2" step="0.1" value="1">
                    <span class="tts-value-display" id="tts-pitch-value">1.0</span>
                </div>
            </div>
        </div>
    `;

    // Insert TTS UI before the writing body
    const writingBodyEl = document.getElementById('writing-body');
    if (writingBodyEl && writingBodyEl.parentNode) {
        writingBodyEl.parentNode.insertBefore(ttsContainer, writingBodyEl);
    }

    // Initialize TTS after UI is created
    initializeTTS();
};

function initializeTTS() {
    if (ttsInitialized) return;

    ttsInstance = new WritingTTS();
    ttsInitialized = true;

    // Get UI elements - with null checks
    const playBtn = document.getElementById('tts-play-btn');
    const stopBtn = document.getElementById('tts-stop-btn');
    const statusEl = document.getElementById('tts-status');
    const statusText = document.getElementById('tts-status-text');
    const settingsToggle = document.getElementById('tts-settings-toggle');
    const settingsPanel = document.getElementById('tts-settings-panel');
    const voiceSelect = document.getElementById('tts-voice-select');
    const rateSlider = document.getElementById('tts-rate-slider');
    const rateValue = document.getElementById('tts-rate-value');
    const pitchSlider = document.getElementById('tts-pitch-slider');
    const pitchValue = document.getElementById('tts-pitch-value');

    // Safety check - if elements don't exist, don't proceed
    if (!playBtn || !stopBtn || !voiceSelect) {
        console.warn('TTS UI elements not found, skipping initialization');
        return;
    }

    // Populate voice select with error handling
    function populateVoices() {
        try {
            const voices = ttsInstance.getVoices();
            
            if (!voices || voices.length === 0) {
                // Retry after a short delay
                setTimeout(populateVoices, 100);
                return;
            }

            // Filter voices safely
            const englishVoices = voices.filter(v => v && v.lang && v.lang.startsWith('en'));
            const otherVoices = voices.filter(v => v && v.lang && !v.lang.startsWith('en'));

            voiceSelect.innerHTML = '';

            if (englishVoices.length > 0) {
                const group = document.createElement('optgroup');
                group.label = 'English';
                englishVoices.forEach((voice, index) => {
                    if (voice && voice.name) {
                        const option = document.createElement('option');
                        option.textContent = `${voice.name} (${voice.lang || 'en'})`;
                        option.value = index;
                        group.appendChild(option);
                    }
                });
                voiceSelect.appendChild(group);
            }

            if (otherVoices.length > 0) {
                const group = document.createElement('optgroup');
                group.label = 'Other Languages';
                otherVoices.forEach((voice, index) => {
                    if (voice && voice.name) {
                        const option = document.createElement('option');
                        option.textContent = `${voice.name} (${voice.lang || 'unknown'})`;
                        option.value = englishVoices.length + index;
                        group.appendChild(option);
                    }
                });
                voiceSelect.appendChild(group);
            }

            // If no voices found, show a message
            if (voiceSelect.options.length === 0) {
                const option = document.createElement('option');
                option.textContent = 'No voices available';
                option.value = '';
                voiceSelect.appendChild(option);
            }
        } catch (error) {
            console.error('Error populating voices:', error);
            // Set a default option on error
            voiceSelect.innerHTML = '<option value="">Default Voice</option>';
        }
    }

    // Initial population
    populateVoices();
    
    // Re-populate when voices change
    if (speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoices;
    }

    // Event: Play/Pause button
    playBtn.addEventListener('click', () => {
        if (!currentWriting) {
            showError('No writing loaded');
            return;
        }

        try {
            const textToRead = ttsInstance.extractTextContent(currentWriting);
            
            if (!textToRead || textToRead.trim().length === 0) {
                showError('No content available to read');
                return;
            }

            ttsInstance.togglePlayPause(
                textToRead,
                // onStart
                () => {
                    playBtn.classList.add('playing');
                    playBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                        <span>Pause</span>
                    `;
                    stopBtn.disabled = false;
                    if (statusEl) statusEl.classList.remove('idle');
                    if (statusEl) statusEl.classList.add('active');
                    if (statusText) statusText.textContent = 'Reading...';
                },
                // onEnd
                () => {
                    playBtn.classList.remove('playing');
                    playBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>Listen to Story</span>
                    `;
                    stopBtn.disabled = true;
                    if (statusEl) statusEl.classList.remove('active');
                    if (statusEl) statusEl.classList.add('idle');
                    if (statusText) statusText.textContent = 'Finished';
                    setTimeout(() => { 
                        if (statusText) statusText.textContent = 'Ready'; 
                    }, 2000);
                },
                // onError
                (error) => {
                    console.error('TTS Error:', error);
                    playBtn.classList.remove('playing');
                    playBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>Listen to Story</span>
                    `;
                    stopBtn.disabled = true;
                    if (statusEl) statusEl.classList.remove('active');
                    if (statusEl) statusEl.classList.add('idle');
                    if (statusText) statusText.textContent = 'Error';
                    showError('Failed to read the story. Please try again.');
                }
            );
        } catch (error) {
            console.error('Error starting TTS:', error);
            showError('Failed to start reading. Please try again.');
        }
    });

    // Event: Stop button
    stopBtn.addEventListener('click', () => {
        ttsInstance.stop();
        playBtn.classList.remove('playing');
        playBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <span>Listen to Story</span>
        `;
        stopBtn.disabled = true;
        if (statusEl) statusEl.classList.add('idle');
        if (statusText) statusText.textContent = 'Stopped';
        setTimeout(() => { 
            if (statusText) statusText.textContent = 'Ready'; 
        }, 2000);
    });

    // Event: Settings toggle
    if (settingsToggle && settingsPanel) {
        settingsToggle.addEventListener('click', () => {
            settingsPanel.classList.toggle('open');
        });
    }

    // Event: Voice change
    if (voiceSelect) {
        voiceSelect.addEventListener('change', (e) => {
            try {
                const voices = ttsInstance.getVoices();
                const selectedVoice = voices[e.target.value];
                if (selectedVoice) {
                    ttsInstance.updateSettings({ voice: selectedVoice });
                }
            } catch (error) {
                console.error('Error changing voice:', error);
            }
        });
    }

    // Event: Rate slider
    if (rateSlider && rateValue) {
        rateSlider.addEventListener('input', (e) => {
            const rate = parseFloat(e.target.value);
            rateValue.textContent = rate.toFixed(1) + 'x';
            ttsInstance.updateSettings({ rate });
        });
    }

    // Event: Pitch slider
    if (pitchSlider && pitchValue) {
        pitchSlider.addEventListener('input', (e) => {
            const pitch = parseFloat(e.target.value);
            pitchValue.textContent = pitch.toFixed(1);
            ttsInstance.updateSettings({ pitch });
        });
    }
}

// Format excerpt for premium gate
function formatExcerpt(writing) {
    if (writing.excerpt) {
        return `<div class="prose-content"><p>${writing.excerpt}</p></div>`;
    }
    
    // Generate excerpt based on category
    if (writing.category === 'prose' && writing.content) {
        return `<div class="prose-content"><p>${writing.content.substring(0, 500)}...</p></div>`;
    } 
    else if (writing.category === 'poetry' && writing.stanzas && writing.stanzas.length > 0) {
        return '<div class="poetry-content"><div class="stanza">' + 
            writing.stanzas[0].lines.map(line => `<div class="line">${line}</div>`).join('') +
            '</div></div>';
    } 
    else if (writing.category === 'drama' && writing.dialogues && writing.dialogues.length > 0) {
        return '<div class="drama-content">' +
            writing.dialogues.slice(0, 2).map(dialogue => `
                <div class="dialogue-entry">
                    <div class="speaker">${dialogue.speaker}</div>
                    <div class="dialogue-text">${dialogue.text}</div>
                </div>
            `).join('') +
            '</div>';
    }
    
    return '<p>Preview unavailable</p>';
}

// Show error
function showError(message) {
    document.getElementById('error-message').textContent = message;
    errorStateEl.style.display = 'flex';
}

// Setup rating input
function setupRatingInput() {
    starBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            selectedRating = index + 1;
            updateStarDisplay(selectedRating);
            submitRating(selectedRating);
        });

        btn.addEventListener('mouseenter', () => {
            updateStarDisplay(index + 1);
        });
    });

    document.querySelector('.rating-input').addEventListener('mouseleave', () => {
        updateStarDisplay(selectedRating);
    });
}

// Update star display
function updateStarDisplay(rating) {
    starBtns.forEach((btn, index) => {
        if (index < rating) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (rating > 0) {
        document.getElementById('rating-label').textContent = 
            ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating - 1];
    } else {
        document.getElementById('rating-label').textContent = 'Select a rating';
    }
}

// Submit rating
let isSubmittingRating = false; // Prevent duplicate submissions

async function submitRating(rating) {
    if (isSubmittingRating) {
        console.log('Rating submission already in progress');
        return;
    }
    
    isSubmittingRating = true;
    
    try {
        const response = await API.post(`/comments/writing/${writingId}`, {
            rating: rating
        });

        console.log('Full response:', response);
        
        if (response && response.success) {
            await loadWriting();
            alert('Rating submitted successfully!');
        } else {
            console.error('Rating failed:', response);
            alert('Failed to submit rating. Please try again.');
        }
    } catch (error) {
        console.error('Failed to submit rating:', error);
        alert('Failed to submit rating. Please try again.');
    } finally {
        isSubmittingRating = false;
    }
}

// Check bookmark status
async function checkBookmarkStatus() {
    if (!Auth.isAuthenticated()) return;

    try {
        const response = await API.get('/bookmarks');
        if (response.success && response.data) {
            isBookmarked = response.data.some(b => b.writing._id === writingId);
            updateBookmarkButton();
        }
    } catch (error) {
        console.error('Failed to check bookmark status:', error);
    }
}

// Update bookmark button
function updateBookmarkButton() {
    if (isBookmarked) {
        bookmarkBtnEl.classList.add('bookmarked');
        bookmarkBtnEl.querySelector('.action-text').textContent = 'Saved';
    } else {
        bookmarkBtnEl.classList.remove('bookmarked');
        bookmarkBtnEl.querySelector('.action-text').textContent = 'Save';
    }
}

// Toggle bookmark
async function toggleBookmark() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '/views/login.html?redirect=writing&id=' + writingId;
        return;
    }

    try {
        if (isBookmarked) {
            await API.delete(`/bookmarks/${writingId}`);
            isBookmarked = false;
        } else {
            await API.post(`/bookmarks/${writingId}`);
            isBookmarked = true;
        }
        updateBookmarkButton();
    } catch (error) {
        console.error('Failed to toggle bookmark:', error);
        alert('Failed to update bookmark. Please try again.');
    }
}

// Load comments
async function loadComments() {
    try {
        commentsLoadingEl.style.display = 'flex';
        commentsListEl.style.display = 'none';
        commentsEmptyEl.style.display = 'none';

        const response = await API.get(`/comments/writing/${writingId}`);
        
        if (response.success && response.data && response.data.length > 0) {
            displayComments(response.data);
            // Count only comments with content
            const commentsWithContent = response.data.filter(c => c.content && c.content.trim());
            commentCountEl.textContent = commentsWithContent.length;
        } else {
            commentsEmptyEl.style.display = 'block';
            commentCountEl.textContent = '0';
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
        commentsEmptyEl.style.display = 'block';
        commentCountEl.textContent = '0';
    } finally {
        commentsLoadingEl.style.display = 'none';
    }
}

// Display comments
function displayComments(comments) {
    // Filter out comments without content (rating-only)
    const commentsWithContent = comments.filter(comment => comment.content && comment.content.trim());
    
    if (commentsWithContent.length === 0) {
        commentsEmptyEl.style.display = 'block';
        commentsListEl.style.display = 'none';
        return;
    }
    
    commentsListEl.innerHTML = commentsWithContent.map(comment => {
        const avatar = comment.author?.profilePictureURL || '/public/uploads/profiles/default-avatar.jpg';
        const name = comment.author?.username || 'Anonymous';
        const date = new Date(comment.createdAt).toLocaleDateString();

        return `
            <div class="comment">
                <div class="comment-header">
                    <div class="comment-author">
                        <img src="${avatar}" alt="${name}" class="comment-avatar">
                        <span>${name}</span>
                    </div>
                    <span class="comment-date">${date}</span>
                </div>
                <div class="comment-content">${comment.content}</div>
            </div>
        `;
    }).join('');
    commentsListEl.style.display = 'block';
}

// Submit comment
async function submitComment(e) {
    e.preventDefault();

    const content = commentContentEl.value.trim();
    if (!content) return;

    try {
        const response = await API.post(`/comments/writing/${writingId}`, {
            content: content
        });

        if (response.success) {
            commentContentEl.value = '';
            charCountEl.textContent = '0';
            loadComments();
        }
    } catch (error) {
        console.error('Failed to submit comment:', error);
        alert('Failed to post comment. Please try again.');
    }
}

// Share story
function shareStory() {
    const url = window.location.href;
    const title = currentWriting ? currentWriting.title : 'Check out this story';

    if (navigator.share) {
        navigator.share({
            title: title,
            url: url
        }).catch(err => console.log('Share cancelled'));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

// Initialize
async function init() {
    // Get current user
    if (Auth.isAuthenticated()) {
        currentUser = Auth.getUser();
    }

    // Load writing
    await loadWriting();

    // Event listeners
    if (bookmarkBtnEl) {
        bookmarkBtnEl.addEventListener('click', toggleBookmark);
    }

    if (commentFormEl) {
        commentFormEl.addEventListener('submit', submitComment);
    }

    if (commentContentEl) {
        commentContentEl.addEventListener('input', () => {
            charCountEl.textContent = commentContentEl.value.length;
        });
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.addEventListener('beforeunload', () => {
    if (ttsInstance) {
        ttsInstance.stop();
    }
});