// State management
const state = {
    currentPage: 1,
    totalPages: 1,
    category: 'all',
    access: 'all',
    sort: 'recent',
    search: '',
    loading: false
};

// DOM Elements
const loadingEl = document.getElementById('loading');
const gridEl = document.getElementById('writings-grid');
const emptyEl = document.getElementById('empty-state');
const paginationEl = document.getElementById('pagination');
const resultsTextEl = document.getElementById('results-text');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const sortSelect = document.getElementById('sort-select');
const categoryPills = document.querySelectorAll('#category-pills .pill');
const accessPills = document.querySelectorAll('#access-pills .pill');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentPageEl = document.getElementById('current-page');
const totalPagesEl = document.getElementById('total-pages');
const pageTitleEl = document.getElementById('page-title');
const pageSubtitleEl = document.getElementById('page-subtitle');
const clearAllFiltersBtn = document.getElementById('clear-all-filters');
const resetFiltersBtn = document.getElementById('reset-filters');
const emptyMessageEl = document.getElementById('empty-message');

/**
 * Create writing card HTML
 */
function createWritingCard(writing) {
    const coverImage = writing.coverImageURL || '/public/images/placeholder-cover.jpg';
    const authorAvatar = writing.author?.profilePictureURL || '/public/images/default-avatar.png';
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

/**
 * Build query string from state
 */
function buildQueryString() {
    const params = new URLSearchParams();
    
    params.append('page', state.currentPage);
    params.append('limit', CONFIG.DEFAULT_PAGE_SIZE);

    if (state.category !== 'all') {
        params.append('category', state.category);
    }

    if (state.search) {
        params.append('search', state.search);
    }

    // Sort handling
    if (state.sort === 'popular') {
        params.append('sort', 'views');
    } else if (state.sort === 'rating') {
        params.append('sort', 'rating');
    }
    // 'recent' is default, no need to add param

    return params.toString();
}

/**
 * Load writings based on current state
 */
async function loadWritings() {
    if (state.loading) return;

    state.loading = true;
    loadingEl.style.display = 'flex';
    gridEl.style.display = 'none';
    emptyEl.style.display = 'none';
    paginationEl.style.display = 'none';

    try {
        const queryString = buildQueryString();
        const response = await API.get(`/writings?${queryString}`);

        if (response.success && response.data && response.data.length > 0) {
            // Filter by access level on client side if needed
            let writings = response.data;
            if (state.access === 'free') {
                writings = writings.filter(w => w.accessLevel === 'free');
            } else if (state.access === 'premium') {
                writings = writings.filter(w => w.accessLevel === 'premium');
            }

            if (writings.length > 0) {
                gridEl.innerHTML = writings.map(writing => createWritingCard(writing)).join('');
                gridEl.style.display = 'grid';

                // Update pagination
                state.totalPages = response.pages || 1;
                updatePagination();

                // Update results text
                const total = response.total || writings.length;
                resultsTextEl.textContent = `Showing ${writings.length} of ${total} ${total === 1 ? 'story' : 'stories'}`;
            } else {
                showEmptyState();
            }
        } else {
            showEmptyState();
        }
    } catch (error) {
        console.error('Failed to load writings:', error);
        showEmptyState('Failed to load stories. Please try again.');
    } finally {
        state.loading = false;
        loadingEl.style.display = 'none';
    }
}

/**
 * Show empty state
 */
function showEmptyState(message) {
    emptyEl.style.display = 'block';
    if (message) {
        emptyMessageEl.textContent = message;
    } else if (state.search) {
        emptyMessageEl.textContent = `No stories found for "${state.search}"`;
    } else {
        emptyMessageEl.textContent = 'Try adjusting your filters or search terms';
    }
    resultsTextEl.textContent = 'No stories found';
}

/**
 * Update pagination controls
 */
function updatePagination() {
    if (state.totalPages <= 1) {
        paginationEl.style.display = 'none';
        return;
    }

    paginationEl.style.display = 'flex';
    currentPageEl.textContent = state.currentPage;
    totalPagesEl.textContent = state.totalPages;

    prevPageBtn.disabled = state.currentPage === 1;
    nextPageBtn.disabled = state.currentPage === state.totalPages;
}

/**
 * Update page title and subtitle based on filters
 */
function updatePageTitle() {
    if (state.category !== 'all') {
        const categoryName = CONFIG.CATEGORIES[state.category];
        pageTitleEl.textContent = `${categoryName} Stories`;
        pageSubtitleEl.textContent = `Explore ${categoryName.toLowerCase()} from African writers`;
    } else if (state.search) {
        pageTitleEl.textContent = 'Search Results';
        pageSubtitleEl.textContent = `Results for "${state.search}"`;
    } else {
        pageTitleEl.textContent = 'Explore Stories';
        pageSubtitleEl.textContent = 'Discover authentic narratives from African writers';
    }
}

/**
 * Check if filters are active
 */
function hasActiveFilters() {
    return state.category !== 'all' || state.access !== 'all' || state.search !== '' || state.sort !== 'recent';
}

/**
 * Update clear filters button visibility
 */
function updateClearFiltersButton() {
    if (hasActiveFilters()) {
        clearAllFiltersBtn.classList.remove('hidden');
    } else {
        clearAllFiltersBtn.classList.add('hidden');
    }
}

/**
 * Reset all filters
 */
function resetAllFilters() {
    state.category = 'all';
    state.access = 'all';
    state.sort = 'recent';
    state.search = '';
    state.currentPage = 1;

    searchInput.value = '';
    sortSelect.value = 'recent';
    
    categoryPills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.category === 'all');
    });
    
    accessPills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.access === 'all');
    });

    updatePageTitle();
    updateClearFiltersButton();
    loadWritings();
}

/**
 * Handle category filter change
 */
function handleCategoryChange(category) {
    state.category = category;
    state.currentPage = 1;

    categoryPills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.category === category);
    });

    updatePageTitle();
    updateClearFiltersButton();
    loadWritings();
}

/**
 * Handle access filter change
 */
function handleAccessChange(access) {
    state.access = access;
    state.currentPage = 1;

    accessPills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.access === access);
    });

    updateClearFiltersButton();
    loadWritings();
}

/**
 * Handle sort change
 */
function handleSortChange(sort) {
    state.sort = sort;
    state.currentPage = 1;
    updateClearFiltersButton();
    loadWritings();
}

/**
 * Handle search
 */
let searchTimeout;
function handleSearch(searchTerm) {
    clearTimeout(searchTimeout);
    
    if (searchTerm) {
        clearSearchBtn.classList.remove('hidden');
    } else {
        clearSearchBtn.classList.add('hidden');
    }

    searchTimeout = setTimeout(() => {
        state.search = searchTerm;
        state.currentPage = 1;
        updatePageTitle();
        updateClearFiltersButton();
        loadWritings();
    }, 500); // Debounce search
}

/**
 * Handle pagination
 */
function goToPage(page) {
    if (page < 1 || page > state.totalPages || page === state.currentPage) {
        return;
    }

    state.currentPage = page;
    loadWritings();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Parse URL parameters and set initial state
 */
function parseURLParams() {
    const params = new URLSearchParams(window.location.search);

    // Category from URL
    const urlCategory = params.get('category');
    if (urlCategory && ['prose', 'poetry', 'drama'].includes(urlCategory)) {
        state.category = urlCategory;
        categoryPills.forEach(pill => {
            pill.classList.toggle('active', pill.dataset.category === urlCategory);
        });
    }

    // Search from URL
    const urlSearch = params.get('search');
    if (urlSearch) {
        state.search = urlSearch;
        searchInput.value = urlSearch;
        clearSearchBtn.classList.remove('hidden');
    }

    // Sort from URL
    const urlSort = params.get('sort');
    if (urlSort && ['recent', 'popular', 'rating'].includes(urlSort)) {
        state.sort = urlSort;
        sortSelect.value = urlSort;
    }

    updatePageTitle();
    updateClearFiltersButton();
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Category pills
    categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            handleCategoryChange(pill.dataset.category);
        });
    });

    // Access pills
    accessPills.forEach(pill => {
        pill.addEventListener('click', () => {
            handleAccessChange(pill.dataset.access);
        });
    });

    // Sort select
    sortSelect.addEventListener('change', () => {
        handleSortChange(sortSelect.value);
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        handleSearch(e.target.value.trim());
    });

    // Clear search button
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        handleSearch('');
    });

    // Pagination
    prevPageBtn.addEventListener('click', () => {
        goToPage(state.currentPage - 1);
    });

    nextPageBtn.addEventListener('click', () => {
        goToPage(state.currentPage + 1);
    });

    // Clear all filters
    clearAllFiltersBtn.addEventListener('click', resetAllFilters);
    resetFiltersBtn.addEventListener('click', resetAllFilters);
}

/**
 * Initialize page
 */
function init() {
    parseURLParams();
    initEventListeners();
    loadWritings();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}