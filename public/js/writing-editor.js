Auth.requireAuth();
const currentUser = Auth.getUser();

const urlParams = new URLSearchParams(window.location.search);
const writingId = urlParams.get('id');
const isEditing = !!writingId;

let tags = [];
let saveTimeout = null;
let coverImageUrl = '';

const editorTitleEl = document.getElementById('editor-title');
const titleInputEl = document.getElementById('title-input');
const categorySelectEl = document.getElementById('category-select');
const accessSelectEl = document.getElementById('access-select');
const descriptionInputEl = document.getElementById('description-input');
const coverImageInputEl = document.getElementById('cover-image-input');
const coverPreviewEl = document.getElementById('cover-preview');
const tagsInputEl = document.getElementById('tags-input');
const tagsDisplayEl = document.getElementById('tags-display');
const contentEditorEl = document.getElementById('content-editor');
const wordCountEl = document.getElementById('word-count');
const charCountEl = document.getElementById('char-count');
const saveDraftBtnEl = document.getElementById('save-draft-btn');
const publishBtnEl = document.getElementById('publish-btn');
const previewBtnEl = document.getElementById('preview-btn');
const previewModalEl = document.getElementById('preview-modal');
const modalOverlayEl = document.getElementById('modal-overlay');
const modalCloseEl = document.getElementById('modal-close');
const previewContentEl = document.getElementById('preview-content');
const alertContainerEl = document.getElementById('alert-container');

function showAlert(message, type = 'success') {
    alertContainerEl.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => alertContainerEl.innerHTML = '', 5000);
}

function calculateStats() {
    const content = contentEditorEl.value;
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = content.length;
    wordCountEl.textContent = words.toLocaleString();
    charCountEl.textContent = chars.toLocaleString();
}

function addTag(tagText) {
    const tag = tagText.trim().toLowerCase();
    if (!tag || tags.length >= 10 || tags.includes(tag)) return;
    tags.push(tag);
    renderTags();
}

function removeTag(tag) {
    tags = tags.filter(t => t !== tag);
    renderTags();
}

async function handleCoverImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('coverImage', file);

    try {
        const response = await API.upload('/writings/upload-cover', formData);
        if (response.success) {
            coverImageUrl = response.imageUrl;
            coverPreviewEl.innerHTML = `<img src="${coverImageUrl}" style="max-width: 300px; border-radius: 8px;" />`;
            showAlert('Cover image uploaded!', 'success');
        }
    } catch (error) {
        showAlert('Failed to upload image', 'error');
    }
}

function renderTags() {
    tagsDisplayEl.innerHTML = tags.map(tag => `
        <span class="tag">
            ${tag}
            <button type="button" onclick="removeTag('${tag}')">×</button>
        </span>
    `).join('');
}

function getFormData() {
    return {
        title: titleInputEl.value.trim(),
        category: categorySelectEl.value,
        accessLevel: accessSelectEl.value,
        description: descriptionInputEl.value.trim(),
        coverImageURL: coverImageUrl,
        tags: tags,
        content: contentEditorEl.value.trim()
    };
}

async function saveDraft() {
    const data = getFormData();
    if (!data.title || !data.category || !data.content) {
        showAlert('Title, category, and content are required', 'error');
        return;
    }
    
    try {
        let response;
        if (isEditing) {
            response = await API.put(`/writings/${writingId}`, data);
        } else {
            response = await API.post('/writings', data);
        }
        
        if (response.success) {
            showAlert('Draft saved successfully!', 'success');
            if (!isEditing && response.data) {
                window.location.href = `/views/writing-editor.html?id=${response.data._id}`;
            }
        }
    } catch (error) {
        showAlert(error.message || 'Failed to save draft', 'error');
    }
}

async function publish() {
    const data = getFormData();
    if (!data.title || !data.category || !data.content) {
        showAlert('Title, category, and content are required', 'error');
        return;
    }
    
    if (!confirm('Publish this story?')) return;
    
    publishBtnEl.disabled = true;
    publishBtnEl.textContent = 'Publishing...';
    
    try {
        let writingIdToPublish = writingId;
        
        if (!isEditing) {
            const createResponse = await API.post('/writings', data);
            if (!createResponse.success) throw new Error('Failed to create writing');
            writingIdToPublish = createResponse.data._id;
        } else {
            await API.put(`/writings/${writingId}`, data);
        }
        
        const publishResponse = await API.patch(`/writings/${writingIdToPublish}/publish`);
        
        if (publishResponse.success) {
            showAlert('Story published successfully!', 'success');
            setTimeout(() => {
                window.location.href = `/views/writing-view.html?id=${writingIdToPublish}`;
            }, 1500);
        }
    } catch (error) {
        showAlert(error.message || 'Failed to publish story', 'error');
        publishBtnEl.disabled = false;
        publishBtnEl.textContent = 'Publish';
    }
}

function showPreview() {
    const data = getFormData();
    if (!data.title || !data.content) {
        showAlert('Add title and content to preview', 'error');
        return;
    }
    
    previewContentEl.innerHTML = `
        <h1>${data.title}</h1>
        ${data.description ? `<p style="color: #666;">${data.description}</p>` : ''}
        ${tags.length > 0 ? `<div style="margin: 1rem 0;">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
        <div style="white-space: pre-wrap; line-height: 1.8;">${data.content}</div>
    `;
    
    previewModalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePreview() {
    previewModalEl.style.display = 'none';
    document.body.style.overflow = '';
}

async function loadWriting() {
    try {
        const response = await API.get(`/writings/${writingId}`);
        if (!response.success || !response.data) {
            showAlert('Story not found', 'error');
            setTimeout(() => window.location.href = '/views/my-writings.html', 2000);
            return;
        }
        
        const writing = response.data;
        if (writing.author._id !== currentUser.id) {
            showAlert('Not authorized', 'error');
            setTimeout(() => window.location.href = '/views/my-writings.html', 2000);
            return;
        }
        
        editorTitleEl.textContent = 'Edit Story';
        titleInputEl.value = writing.title;
        categorySelectEl.value = writing.category;
        accessSelectEl.value = writing.accessLevel;
        descriptionInputEl.value = writing.description || '';
        coverImageUrl = writing.coverImageURL || '';
        if (coverImageUrl) {
            coverPreviewEl.innerHTML = `<img src="${coverImageUrl}" style="max-width: 300px; border-radius: 8px;" />`;
        }
        contentEditorEl.value = writing.content;
        
        if (writing.tags && writing.tags.length > 0) {
            tags = [...writing.tags];
            renderTags();
        }
        
        calculateStats();
        
        if (writing.status === 'published') {
            publishBtnEl.textContent = 'Update';
        }
    } catch (error) {
        showAlert('Failed to load story', 'error');
    }
}
coverImageInputEl.addEventListener('change', handleCoverImageUpload);

contentEditorEl.addEventListener('input', calculateStats);

tagsInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addTag(tagsInputEl.value);
        tagsInputEl.value = '';
    }
});

saveDraftBtnEl.addEventListener('click', saveDraft);
publishBtnEl.addEventListener('click', publish);
previewBtnEl.addEventListener('click', showPreview);
modalCloseEl.addEventListener('click', closePreview);
modalOverlayEl.addEventListener('click', closePreview);

window.removeTag = removeTag;

if (isEditing) {
    loadWriting();
}