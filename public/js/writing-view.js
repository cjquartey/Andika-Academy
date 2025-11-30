// Get writing ID from URL
const urlParams = new URLSearchParams(window.location.search);
const writingId = urlParams.get('id');

// State
let currentWriting = null;
let currentUser = null;
let selectedRating = 0;
let isBookmarked = false;

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