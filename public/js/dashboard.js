Auth.requireAuth();
const currentUser = Auth.getUser();

const userNameEl = document.getElementById('user-name');
const totalWritingsEl = document.getElementById('total-writings');
const totalViewsEl = document.getElementById('total-views');
const avgRatingEl = document.getElementById('avg-rating');
const bookmarksCountEl = document.getElementById('bookmarks-count');
const subscriptionTierEl = document.getElementById('subscription-tier');
const publicationsUsedEl = document.getElementById('publications-used');
const publicationsLimitEl = document.getElementById('publications-limit');
const progressFillEl = document.getElementById('progress-fill');
const upgradeBtnEl = document.getElementById('upgrade-btn');
const recentLoadingEl = document.getElementById('recent-loading');
const recentWritingsEl = document.getElementById('recent-writings');
const recentEmptyEl = document.getElementById('recent-empty');

async function loadStats() {
    try {
        const writingsResponse = await API.get(`/writings/user/${currentUser.id}`);
        if (writingsResponse.success && writingsResponse.data) {
            const writings = writingsResponse.data;
            const publishedWritings = writings.filter(w => w.status === 'published');
            
            totalWritingsEl.textContent = publishedWritings.length;
            
            const totalViews = publishedWritings.reduce((sum, w) => sum + (w.viewCount || 0), 0);
            totalViewsEl.textContent = totalViews.toLocaleString();
            
            const ratingsData = publishedWritings.filter(w => w.ratingCount > 0);
            if (ratingsData.length > 0) {
                const avgRating = ratingsData.reduce((sum, w) => sum + w.averageRating, 0) / ratingsData.length;
                avgRatingEl.textContent = avgRating.toFixed(1);
            }
        }
        
        const bookmarksResponse = await API.get('/bookmarks');
        if (bookmarksResponse.success && bookmarksResponse.data) {
            bookmarksCountEl.textContent = bookmarksResponse.count || bookmarksResponse.data.length;
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

function loadSubscriptionInfo() {
    const tier = currentUser.subscriptionTier || 'basic';
    const monthlyPublications = currentUser.monthlyPublications || 0;
    
    if (tier === 'premium') {
        subscriptionTierEl.textContent = 'Premium Plan';
        document.getElementById('subscription-details').innerHTML = '<span style="color: green;">✓ Unlimited Publications</span>';
        progressFillEl.style.width = '100%';
        upgradeBtnEl.style.display = 'none';
    } else {
        subscriptionTierEl.textContent = 'Basic Plan';
        publicationsUsedEl.textContent = monthlyPublications;
        publicationsLimitEl.textContent = '5';
        
        const percentage = (monthlyPublications / 5) * 100;
        progressFillEl.style.width = `${Math.min(percentage, 100)}%`;
        
        if (monthlyPublications >= 5) {
            progressFillEl.style.background = '#DC2626';
        }
    }
}

async function loadRecentWritings() {
    try {
        recentLoadingEl.style.display = 'flex';
        recentWritingsEl.style.display = 'none';
        recentEmptyEl.style.display = 'none';
        
        const response = await API.get(`/writings/user/${currentUser.id}`);
        
        if (response.success && response.data && response.data.length > 0) {
            const recentWritings = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
            
            recentWritingsEl.innerHTML = recentWritings.map(writing => {
                const link = writing.status === 'published' 
                    ? `/views/writing-view.html?id=${writing._id}`
                    : `/views/writing-editor.html?id=${writing._id}`;
                
                return `
                    <a href="${link}" class="writing-card">
                        <img src="${writing.coverImageURL || '/public/images/placeholder.jpg'}" alt="${writing.title}" class="writing-cover">
                        <div class="writing-content">
                            <span class="writing-status ${writing.status === 'published' ? 'status-published' : 'status-draft'}">${writing.status}</span>
                            <h3 class="writing-title">${writing.title}</h3>
                            <div class="writing-meta">
                                <span>${writing.viewCount || 0} views</span>
                                ${writing.averageRating > 0 ? `<span>⭐ ${writing.averageRating.toFixed(1)}</span>` : ''}
                            </div>
                        </div>
                    </a>
                `;
            }).join('');
            recentWritingsEl.style.display = 'grid';
        } else {
            recentEmptyEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load recent writings:', error);
        recentEmptyEl.style.display = 'block';
    } finally {
        recentLoadingEl.style.display = 'none';
    }
}

function init() {
    userNameEl.textContent = currentUser.firstName || currentUser.username;
    loadStats();
    loadSubscriptionInfo();
    loadRecentWritings();
}

init();