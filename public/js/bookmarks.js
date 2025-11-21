Auth.requireAuth();

const loadingEl = document.getElementById('loading');
const gridEl = document.getElementById('bookmarks-grid');
const emptyEl = document.getElementById('empty-state');
const alertContainerEl = document.getElementById('alert-container');

function showAlert(message, type = 'success') {
    alertContainerEl.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => alertContainerEl.innerHTML = '', 5000);
}

function createBookmarkCard(bookmark) {
    const writing = bookmark.writing;
    return `
        <div class="bookmark-card">
            <img src="${writing.coverImageURL || '/public/images/placeholder.jpg'}" alt="${writing.title}" class="bookmark-cover">
            <div class="bookmark-content">
                <h3 class="bookmark-title">${writing.title}</h3>
                <p class="bookmark-author">By ${writing.author.username}</p>
                <div class="bookmark-meta">
                    <span>👁️ ${writing.viewCount || 0}</span>
                    ${writing.averageRating > 0 ? `<span>⭐ ${writing.averageRating.toFixed(1)}</span>` : ''}
                    <span>${writing.category}</span>
                </div>
                <div class="bookmark-actions">
                    <a href="/views/writing-view.html?id=${writing._id}" class="btn btn-primary">Read</a>
                    <button onclick="removeBookmark('${writing._id}')" class="btn btn-outline">Remove</button>
                </div>
            </div>
        </div>
    `;
}

async function loadBookmarks() {
    try {
        loadingEl.style.display = 'flex';
        gridEl.style.display = 'none';
        emptyEl.style.display = 'none';
        
        const response = await API.get('/bookmarks');
        
        if (response.success && response.data && response.data.length > 0) {
            gridEl.innerHTML = response.data.map(bookmark => createBookmarkCard(bookmark)).join('');
            gridEl.style.display = 'grid';
        } else {
            emptyEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load bookmarks:', error);
        showAlert('Failed to load bookmarks', 'error');
        emptyEl.style.display = 'block';
    } finally {
        loadingEl.style.display = 'none';
    }
}

async function removeBookmark(writingId) {
    if (!confirm('Remove this bookmark?')) return;
    
    try {
        const response = await API.delete(`/bookmarks/${writingId}`);
        
        if (response.success) {
            showAlert('Bookmark removed', 'success');
            loadBookmarks();
        }
    } catch (error) {
        showAlert(error.message || 'Failed to remove bookmark', 'error');
    }
}

window.removeBookmark = removeBookmark;

loadBookmarks();