Auth.requireAuth();
const currentUser = Auth.getUser();

let allWritings = [];
let currentFilter = 'all';
let writingToDelete = null;

const loadingEl = document.getElementById('loading');
const gridEl = document.getElementById('writings-grid');
const emptyEl = document.getElementById('empty-state');
const emptyMessageEl = document.getElementById('empty-message');
const alertContainerEl = document.getElementById('alert-container');
const countAllEl = document.getElementById('count-all');
const countPublishedEl = document.getElementById('count-published');
const countDraftEl = document.getElementById('count-draft');
const deleteModalEl = document.getElementById('delete-modal');
const deleteOverlayEl = document.getElementById('delete-overlay');
const deleteTitleEl = document.getElementById('delete-title');
const cancelDeleteEl = document.getElementById('cancel-delete');
const confirmDeleteEl = document.getElementById('confirm-delete');

function showAlert(message, type = 'success') {
    alertContainerEl.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => alertContainerEl.innerHTML = '', 5000);
}

function createWritingCard(writing) {
    const link = writing.status === 'published' 
        ? `/views/writing-view.html?id=${writing._id}`
        : `/views/writing-editor.html?id=${writing._id}`;
    
    return `
        <div class="writing-card">
            <img src="${writing.coverImageURL || '/public/uploads/covers/default-cover.jpg'}" alt="${writing.title}" class="writing-cover">
            <div class="writing-content">
                <div class="writing-status-row">
                    <span class="writing-status status-${writing.status}">${writing.status}</span>
                    <div class="writing-actions">
                        <button onclick="window.location.href='/views/writing-editor.html?id=${writing._id}'" title="Edit">✏️</button>
                        <button onclick="confirmDelete('${writing._id}', '${writing.title.replace(/'/g, "\\'")}')'" title="Delete">🗑️</button>
                    </div>
                </div>
                <h3 class="writing-title">${writing.title}</h3>
                <div class="writing-meta">
                    <span>${new Date(writing.createdAt).toLocaleDateString()}</span>
                    ${writing.status === 'published' ? `
                        <span>👁️ ${writing.viewCount || 0}</span>
                        ${writing.averageRating > 0 ? `<span>⭐ ${writing.averageRating.toFixed(1)}</span>` : ''}
                    ` : ''}
                </div>
                <div class="writing-buttons">
                    ${writing.status === 'published' ? `
                        <a href="${link}" class="btn btn-outline">View</a>
                        <a href="/views/writing-editor.html?id=${writing._id}" class="btn btn-primary">Edit</a>
                    ` : `
                        <a href="/views/writing-editor.html?id=${writing._id}" class="btn btn-primary">Continue Editing</a>
                    `}
                </div>
            </div>
        </div>
    `;
}

async function loadWritings() {
    try {
        loadingEl.style.display = 'flex';
        gridEl.style.display = 'none';
        emptyEl.style.display = 'none';
        
        const response = await API.get(`/writings/user/${currentUser.id}`);
        
        if (response.success && response.data) {
            allWritings = response.data;
            
            const publishedCount = allWritings.filter(w => w.status === 'published').length;
            const draftCount = allWritings.filter(w => w.status === 'draft').length;
            
            countAllEl.textContent = allWritings.length;
            countPublishedEl.textContent = publishedCount;
            countDraftEl.textContent = draftCount;
            
            displayWritings();
        } else {
            showEmptyState();
        }
    } catch (error) {
        console.error('Failed to load writings:', error);
        showAlert('Failed to load stories', 'error');
        showEmptyState();
    } finally {
        loadingEl.style.display = 'none';
    }
}

function displayWritings() {
    let filteredWritings = allWritings;
    
    if (currentFilter === 'published') {
        filteredWritings = allWritings.filter(w => w.status === 'published');
        emptyMessageEl.textContent = 'No published stories yet.';
    } else if (currentFilter === 'draft') {
        filteredWritings = allWritings.filter(w => w.status === 'draft');
        emptyMessageEl.textContent = 'No drafts yet.';
    } else {
        emptyMessageEl.textContent = 'Start writing your first story!';
    }
    
    if (filteredWritings.length > 0) {
        filteredWritings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        gridEl.innerHTML = filteredWritings.map(writing => createWritingCard(writing)).join('');
        gridEl.style.display = 'grid';
        emptyEl.style.display = 'none';
    } else {
        showEmptyState();
    }
}

function showEmptyState() {
    gridEl.style.display = 'none';
    emptyEl.style.display = 'block';
}

function handleFilterChange(filter) {
    currentFilter = filter;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    displayWritings();
}

function confirmDelete(writingId, title) {
    writingToDelete = writingId;
    deleteTitleEl.textContent = title;
    deleteModalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cancelDelete() {
    writingToDelete = null;
    deleteModalEl.style.display = 'none';
    document.body.style.overflow = '';
}

async function deleteWriting() {
    if (!writingToDelete) return;
    
    confirmDeleteEl.disabled = true;
    confirmDeleteEl.textContent = 'Deleting...';
    
    try {
        const response = await API.delete(`/writings/${writingToDelete}`);
        
        if (response.success) {
            showAlert('Story deleted successfully', 'success');
            
            allWritings = allWritings.filter(w => w._id !== writingToDelete);
            
            const publishedCount = allWritings.filter(w => w.status === 'published').length;
            const draftCount = allWritings.filter(w => w.status === 'draft').length;
            
            countAllEl.textContent = allWritings.length;
            countPublishedEl.textContent = publishedCount;
            countDraftEl.textContent = draftCount;
            
            displayWritings();
            cancelDelete();
        }
    } catch (error) {
        showAlert(error.message || 'Failed to delete story', 'error');
    } finally {
        confirmDeleteEl.disabled = false;
        confirmDeleteEl.textContent = 'Delete';
    }
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => handleFilterChange(tab.dataset.filter));
});

cancelDeleteEl.addEventListener('click', cancelDelete);
deleteOverlayEl.addEventListener('click', cancelDelete);
confirmDeleteEl.addEventListener('click', deleteWriting);

window.confirmDelete = confirmDelete;

loadWritings();