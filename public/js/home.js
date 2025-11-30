function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

// Create writing card HTML
function createWritingCard(writing) {
    const coverImage = writing.coverImageURL || '/public/uploads/covers/default-cover.jpg';
    const authorAvatar = writing.author?.profilePictureURL || '/public/uploads/profiles/default-avatar.jpg';
    const authorName = writing.author?.username || 'Anonymous';
    const isPremium = writing.accessLevel === 'premium';

    return `
        <a href="/views/writing-view.html?id=${writing._id}" class="writing-card">
            ${isPremium ? `
                <div class="premium-badge">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 0l1.5 4.5h4.5l-3.6 2.7 1.4 4.5L6 9l-3.8 2.7 1.4-4.5L0 4.5h4.5L6 0z"/>
                    </svg>
                    Premium
                </div>
            ` : ''}
            <img src="${coverImage}" alt="${writing.title}" class="writing-cover" onerror="this.src='/public/images/placeholder-cover.jpg'">
            <div class="writing-content">
                <span class="writing-category">${CONFIG.CATEGORIES[writing.category]}</span>
                <h3 class="writing-title">${writing.title}</h3>
                <p class="writing-excerpt">${writing.excerpt || writing.description || 'No description available.'}</p>
                <div class="writing-meta">
                    <div class="writing-author">
                        <img src="${authorAvatar}" alt="${authorName}" class="writing-author-avatar" onerror="this.src='/public/images/default-avatar.png'">
                        <span>${authorName}</span>
                    </div>
                    <div class="writing-stats">
                        <div class="stat-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 2C5.24 2 2.73 3.56 1 6c1.73 2.44 4.24 4 7 4s5.27-1.56 7-4c-1.73-2.44-4.24-4-7-4zm0 6.5C6.62 8.5 5.5 7.38 5.5 6S6.62 3.5 8 3.5 10.5 4.62 10.5 6 9.38 8.5 8 8.5zm0-3.5c-.83 0-1.5.67-1.5 1.5S7.17 7.5 8 7.5s1.5-.67 1.5-1.5S8.83 5 8 5z"/>
                            </svg>
                            ${writing.viewCount || 0}
                        </div>
                        ${writing.averageRating > 0 ? `
                            <div class="stat-item">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--golden-sand)">
                                    <path d="M8 0l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6l2-6z"/>
                                </svg>
                                ${writing.averageRating.toFixed(1)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </a>
    `;
}

// Load featured writings
async function loadFeaturedWritings() {
    const loadingEl = document.getElementById('featured-loading');
    const contentEl = document.getElementById('featured-writings');
    const emptyEl = document.getElementById('featured-empty');

    try {
        loadingEl.style.display = 'flex';
        contentEl.style.display = 'none';
        emptyEl.style.display = 'none';

        // Fetch writings sorted by rating
        const response = await API.get('/writings?limit=6&sort=rating');
        
        if (response.success && response.data && response.data.length > 0) {
            contentEl.innerHTML = response.data.map(writing => createWritingCard(writing)).join('');
            contentEl.style.display = 'grid';
        } else {
            emptyEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load featured writings:', error);
        emptyEl.style.display = 'block';
    } finally {
        loadingEl.style.display = 'none';
    }
}

// Load recent writings
async function loadRecentWritings() {
    const loadingEl = document.getElementById('recent-loading');
    const contentEl = document.getElementById('recent-writings');

    try {
        loadingEl.style.display = 'flex';
        contentEl.style.display = 'none';

        // Fetch recent writings
        const response = await API.get('/writings?limit=6');
        
        if (response.success && response.data && response.data.length > 0) {
            contentEl.innerHTML = response.data.map(writing => createWritingCard(writing)).join('');
            contentEl.style.display = 'grid';
        } else {
            contentEl.innerHTML = '<p class="text-center text-muted">No recent stories available.</p>';
            contentEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load recent writings:', error);
        contentEl.innerHTML = '<p class="text-center text-muted">Failed to load recent stories.</p>';
        contentEl.style.display = 'block';
    } finally {
        loadingEl.style.display = 'none';
    }
}

// Load category counts
async function loadCategoryCounts() {
    const categories = ['prose', 'poetry', 'drama'];
    
    for (const category of categories) {
        const countEl = document.getElementById(`${category}-count`);
        
        try {
            const response = await API.get(`/writings?category=${category}&limit=1`);
            
            if (response.success) {
                const count = response.total || 0;
                countEl.textContent = `${count} ${count === 1 ? 'story' : 'stories'}`;
            } else {
                countEl.textContent = '0 stories';
            }
        } catch (error) {
            console.error(`Failed to load ${category} count:`, error);
            countEl.textContent = '—';
        }
    }
}

// Initialize homepage
function init() {
    // Load all content
    loadFeaturedWritings();
    loadRecentWritings();
    loadCategoryCounts();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}