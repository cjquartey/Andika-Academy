Auth.requireAuth();
const currentUser = Auth.getUser();

const urlParams = new URLSearchParams(window.location.search);
const writingId = urlParams.get('id');
const isEditing = !!writingId;

let tags = [];
let saveTimeout = null;
let coverImageUrl = '';

// Poetry and drama state
let stanzas = [{ lines: [''] }];
let dialogues = [{ speaker: '', text: '', stageDirection: '' }];

const editorTitleEl = document.getElementById('editor-title');
const titleInputEl = document.getElementById('title-input');
const categorySelectEl = document.getElementById('category-select');
const accessSelectEl = document.getElementById('access-select');
const descriptionInputEl = document.getElementById('description-input');
const coverImageInputEl = document.getElementById('cover-image-input');
const coverPreviewEl = document.getElementById('cover-preview');
const tagsInputEl = document.getElementById('tags-input');
const tagsDisplayEl = document.getElementById('tags-display');

// Dynamic content containers
const proseEditorEl = document.getElementById('prose-editor-container');
const poetryEditorEl = document.getElementById('poetry-editor-container');
const dramaEditorEl = document.getElementById('drama-editor-container');

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

// Handle category change to show appropriate editor
function handleCategoryChange() {
    const category = categorySelectEl.value;
    
    // Hide all editors
    proseEditorEl.style.display = 'none';
    poetryEditorEl.style.display = 'none';
    dramaEditorEl.style.display = 'none';
    
    // Show appropriate editor
    if (category === 'prose') {
        proseEditorEl.style.display = 'block';
    } else if (category === 'poetry') {
        poetryEditorEl.style.display = 'block';
        renderPoetryEditor();
    } else if (category === 'drama') {
        dramaEditorEl.style.display = 'block';
        renderDramaEditor();
    }
}

// Poetry Editor Functions
function renderPoetryEditor() {
    const container = document.getElementById('poetry-stanzas');
    container.innerHTML = stanzas.map((stanza, stanzaIdx) => `
        <div class="stanza-container" data-stanza="${stanzaIdx}">
            <div class="stanza-header">
                <h4>Stanza ${stanzaIdx + 1}</h4>
                ${stanzas.length > 1 ? `<button type="button" class="btn-icon" onclick="removeStanza(${stanzaIdx})">×</button>` : ''}
            </div>
            <div class="lines-container">
                ${stanza.lines.map((line, lineIdx) => `
                    <div class="line-input-group">
                        <input 
                            type="text" 
                            class="line-input" 
                            placeholder="Line ${lineIdx + 1}" 
                            value="${line}"
                            onchange="updatePoetryLine(${stanzaIdx}, ${lineIdx}, this.value)"
                        />
                        ${stanza.lines.length > 1 ? `<button type="button" class="btn-icon-sm" onclick="removeLine(${stanzaIdx}, ${lineIdx})">×</button>` : ''}
                    </div>
                `).join('')}
            </div>
            <button type="button" class="btn btn-ghost btn-sm" onclick="addLine(${stanzaIdx})">+ Add Line</button>
        </div>
    `).join('');
}

function addStanza() {
    stanzas.push({ lines: [''] });
    renderPoetryEditor();
}

function removeStanza(idx) {
    if (stanzas.length > 1) {
        stanzas.splice(idx, 1);
        renderPoetryEditor();
    }
}

function addLine(stanzaIdx) {
    stanzas[stanzaIdx].lines.push('');
    renderPoetryEditor();
}

function removeLine(stanzaIdx, lineIdx) {
    if (stanzas[stanzaIdx].lines.length > 1) {
        stanzas[stanzaIdx].lines.splice(lineIdx, 1);
        renderPoetryEditor();
    }
}

function updatePoetryLine(stanzaIdx, lineIdx, value) {
    stanzas[stanzaIdx].lines[lineIdx] = value;
}

// Drama Editor Functions
function renderDramaEditor() {
    const container = document.getElementById('drama-dialogues');
    container.innerHTML = dialogues.map((dialogue, idx) => `
        <div class="dialogue-container" data-dialogue="${idx}">
            <div class="dialogue-header">
                <h4>Entry ${idx + 1}</h4>
                ${dialogues.length > 1 ? `<button type="button" class="btn-icon" onclick="removeDialogue(${idx})">×</button>` : ''}
            </div>
            <div class="dialogue-inputs">
                <input 
                    type="text" 
                    class="speaker-input" 
                    placeholder="Character Name" 
                    value="${dialogue.speaker}"
                    onchange="updateDialogueSpeaker(${idx}, this.value)"
                />
                <textarea 
                    class="dialogue-text" 
                    placeholder="Dialogue text" 
                    rows="3"
                    onchange="updateDialogueText(${idx}, this.value)"
                >${dialogue.text}</textarea>
                <input 
                    type="text" 
                    class="stage-direction-input" 
                    placeholder="Stage direction (optional)" 
                    value="${dialogue.stageDirection || ''}"
                    onchange="updateDialogueStageDirection(${idx}, this.value)"
                />
            </div>
        </div>
    `).join('');
}

function addDialogue() {
    dialogues.push({ speaker: '', text: '', stageDirection: '' });
    renderDramaEditor();
}

function removeDialogue(idx) {
    if (dialogues.length > 1) {
        dialogues.splice(idx, 1);
        renderDramaEditor();
    }
}

function updateDialogueSpeaker(idx, value) {
    dialogues[idx].speaker = value;
}

function updateDialogueText(idx, value) {
    dialogues[idx].text = value;
}

function updateDialogueStageDirection(idx, value) {
    dialogues[idx].stageDirection = value;
}

// Tags functions (unchanged)
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

function renderTags() {
    tagsDisplayEl.innerHTML = tags.map(tag => `
        <span class="tag">
            ${tag}
            <button type="button" onclick="removeTag('${tag}')">×</button>
        </span>
    `).join('');
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

function getFormData() {
    const category = categorySelectEl.value;
    const data = {
        title: titleInputEl.value.trim(),
        category: category,
        accessLevel: accessSelectEl.value,
        description: descriptionInputEl.value.trim(),
        coverImageURL: coverImageUrl,
        tags: tags
    };

    // Add category-specific content
    if (category === 'prose') {
        data.content = document.getElementById('prose-content').value.trim();
    } else if (category === 'poetry') {
        data.stanzas = stanzas.filter(s => s.lines.some(l => l.trim()));
    } else if (category === 'drama') {
        data.dialogues = dialogues.filter(d => d.speaker.trim() && d.text.trim());
    }

    return data;
}

async function saveDraft() {
    const data = getFormData();
    if (!data.title || !data.category) {
        showAlert('Title and category are required', 'error');
        return;
    }
    
    // Validate category-specific requirements
    if (data.category === 'prose' && !data.content) {
        showAlert('Content is required for prose', 'error');
        return;
    }
    if (data.category === 'poetry' && (!data.stanzas || data.stanzas.length === 0)) {
        showAlert('At least one stanza is required for poetry', 'error');
        return;
    }
    if (data.category === 'drama' && (!data.dialogues || data.dialogues.length === 0)) {
        showAlert('At least one dialogue is required for drama', 'error');
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
    if (!data.title || !data.category) {
        showAlert('Title and category are required', 'error');
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
            setTimeout(() => window.location.href = `/views/writing-view.html?id=${writingIdToPublish}`, 1500);
        }
    } catch (error) {
        showAlert(error.message || 'Failed to publish', 'error');
    } finally {
        publishBtnEl.disabled = false;
        publishBtnEl.textContent = 'Publish';
    }
}

function showPreview() {
    const data = getFormData();
    const category = data.category;
    
    let contentHTML = '';
    
    if (category === 'prose') {
        contentHTML = `<div class="prose-content">${data.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>`;
    } else if (category === 'poetry') {
        contentHTML = '<div class="poetry-content">' + 
            data.stanzas.map(stanza => 
                `<div class="stanza">${stanza.lines.map(line => `<div class="line">${line}</div>`).join('')}</div>`
            ).join('') +
            '</div>';
    } else if (category === 'drama') {
        contentHTML = '<div class="drama-content">' +
            data.dialogues.map(d => `
                <div class="dialogue-entry">
                    <div class="speaker">${d.speaker}</div>
                    <div class="dialogue-text">${d.text}</div>
                    ${d.stageDirection ? `<div class="stage-direction">[${d.stageDirection}]</div>` : ''}
                </div>
            `).join('') +
            '</div>';
    }
    
    previewContentEl.innerHTML = `
        <div class="preview-category">${CONFIG.CATEGORIES[category]}</div>
        <h1>${data.title}</h1>
        ${data.description ? `<p class="preview-description">${data.description}</p>` : ''}
        ${data.tags.length > 0 ? `<div class="preview-tags">${data.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
        ${contentHTML}
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
        
        // Load category-specific content
        if (writing.category === 'prose') {
            document.getElementById('prose-content').value = writing.content;
        } else if (writing.category === 'poetry' && writing.stanzas) {
            stanzas = writing.stanzas;
        } else if (writing.category === 'drama' && writing.dialogues) {
            dialogues = writing.dialogues;
        }
        
        if (writing.tags && writing.tags.length > 0) {
            tags = [...writing.tags];
            renderTags();
        }
        
        handleCategoryChange();
        
        if (writing.status === 'published') {
            publishBtnEl.textContent = 'Update';
        }
    } catch (error) {
        showAlert('Failed to load story', 'error');
    }
}

// Event Listeners
categorySelectEl.addEventListener('change', handleCategoryChange);
coverImageInputEl.addEventListener('change', handleCoverImageUpload);

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

// Make functions globally accessible
window.removeTag = removeTag;
window.addStanza = addStanza;
window.removeStanza = removeStanza;
window.addLine = addLine;
window.removeLine = removeLine;
window.updatePoetryLine = updatePoetryLine;
window.addDialogue = addDialogue;
window.removeDialogue = removeDialogue;
window.updateDialogueSpeaker = updateDialogueSpeaker;
window.updateDialogueText = updateDialogueText;
window.updateDialogueStageDirection = updateDialogueStageDirection;

// Initialize
if (isEditing) {
    loadWriting();
} else {
    handleCategoryChange();
}