// Transaction Monitoring Page
const API_BASE = '/api';
let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadTransactionStats();
    loadTransactions();
    
    // Setup event listeners
    document.getElementById('filter-form')?.addEventListener('submit', handleFilterSubmit);
    document.getElementById('flag-form')?.addEventListener('submit', handleFlagSubmit);
    document.getElementById('clear-filters')?.addEventListener('click', clearFilters);
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('andika_auth_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('andika_auth_token');
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Merge headers properly
    if (options.headers) {
        config.headers = { ...defaultOptions.headers, ...options.headers };
    }
    
    const response = await fetch(`/api${endpoint}`, config);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed: ${response.status}`);
    }
    
    return await response.json();
}

// Load transaction stats
async function loadTransactionStats() {
    try {
        const response = await apiRequest('/admin/analytics/overview');
        
        if (response.status === 'success') {
            const stats = response.data;
            
            document.getElementById('total-transactions').textContent = 
                stats.totalTransactions?.toLocaleString() || '0';
            document.getElementById('total-revenue').textContent = 
                `GHS ${stats.totalRevenue?.toFixed(2) || '0.00'}`;
            document.getElementById('avg-transaction').textContent = 
                `GHS ${stats.averageTransaction?.toFixed(2) || '0.00'}`;
            document.getElementById('flagged-count').textContent = 
                stats.flaggedTransactions?.toLocaleString() || '0';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Handle filter form submission
function handleFilterSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    currentFilters = {};
    
    for (let [key, value] of formData.entries()) {
        if (value) {
            currentFilters[key] = value;
        }
    }
    
    currentPage = 1;
    loadTransactions();
}

// Clear filters
function clearFilters() {
    document.getElementById('filter-form').reset();
    currentFilters = {};
    currentPage = 1;
    loadTransactions();
}

// Load transactions
async function loadTransactions() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            ...currentFilters
        });

        const response = await apiRequest(`/admin/transactions?${params}`);
        
        if (response.status === 'success') {
            const { transactions, pagination } = response.data;
            totalPages = pagination.pages;
            
            renderTransactionsTable(transactions);
            updatePagination(pagination);
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Render transactions table
function renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactions-table-body');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 3rem;">No transactions found</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(tx => `
        <tr>
            <td><code>${tx.paystackReference || 'N/A'}</code></td>
            <td>${tx.user?.username || 'Unknown'}</td>
            <td><span class="badge">${tx.type}</span></td>
            <td><strong>GHS ${tx.amount.toFixed(2)}</strong></td>
            <td>${tx.paymentMethod}</td>
            <td><span class="badge status-${tx.status}">${tx.status}</span></td>
            <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn view" onclick="viewTransactionDetails('${tx._id}')">View</button>
                    ${tx.status !== 'flagged' ?
                        `<button class="action-btn flag" onclick="openFlagModal('${tx._id}')">Flag</button>` :
                        `<button class="action-btn unflag" onclick="unflagTransaction('${tx._id}')">Unflag</button>`
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

// Update pagination
function updatePagination(pagination) {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    const { page, pages, total } = pagination;
    
    let paginationHTML = `
        <button onclick="changePage(${page - 1})" ${page === 1 ? 'disabled' : ''}>Previous</button>
        <span>Page ${page} of ${pages} (${total} total)</span>
        <button onclick="changePage(${page + 1})" ${page === pages ? 'disabled' : ''}>Next</button>
    `;
    
    container.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadTransactions();
}

// View transaction details
async function viewTransactionDetails(txId) {
    try {
        const response = await apiRequest(`/admin/transactions/${txId}`);
        
        if (response.status === 'success') {
            displayTransactionModal(response.data.transaction);
        }
    } catch (error) {
        console.error('Error loading transaction details:', error);
        alert('Failed to load transaction details');
    }
}

// Display transaction modal
function displayTransactionModal(tx) {
    const modal = document.getElementById('transaction-modal');
    const modalBody = document.getElementById('transaction-details');
    
    modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Transaction ID</div>
                <div class="detail-value"><code>${tx._id}</code></div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Paystack Reference</div>
                <div class="detail-value"><code>${tx.paystackReference || 'N/A'}</code></div>
            </div>
            <div class="detail-item">
                <div class="detail-label">User</div>
                <div class="detail-value">${tx.user?.username || 'Unknown'} (${tx.user?.email || 'N/A'})</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Type</div>
                <div class="detail-value"><span class="badge">${tx.type}</span></div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Amount</div>
                <div class="detail-value"><strong>GHS ${tx.amount.toFixed(2)}</strong></div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Payment Method</div>
                <div class="detail-value">${tx.paymentMethod}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value"><span class="badge status-${tx.status}">${tx.status}</span></div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Created</div>
                <div class="detail-value">${new Date(tx.createdAt).toLocaleString()}</div>
            </div>
            ${tx.relatedSubscription ? `
            <div class="detail-item">
                <div class="detail-label">Subscription</div>
                <div class="detail-value">${tx.relatedSubscription.tier} - ${tx.relatedSubscription.duration}</div>
            </div>
            ` : ''}
            ${tx.relatedWriting ? `
            <div class="detail-item">
                <div class="detail-label">Related Writing</div>
                <div class="detail-value">${tx.relatedWriting.title}</div>
            </div>
            ` : ''}
            ${tx.status === 'flagged' ? `
            <div class="detail-item">
                <div class="detail-label">Flag Reason</div>
                <div class="detail-value">${tx.flagReason}</div>
            </div>
            ` : ''}
        </div>
    `;
    
    modal.classList.add('show');
}

// Close transaction modal
function closeTransactionModal() {
    document.getElementById('transaction-modal').classList.remove('show');
}

// Open flag modal
function openFlagModal(txId) {
    document.getElementById('flag-transaction-id').value = txId;
    document.getElementById('flag-modal').classList.add('show');
}

// Close flag modal
function closeFlagModal() {
    document.getElementById('flag-modal').classList.remove('show');
    document.getElementById('flag-form').reset();
}

// Handle flag submit
async function handleFlagSubmit(e) {
    e.preventDefault();
    
    const txId = document.getElementById('flag-transaction-id').value;
    const reason = document.getElementById('flag-reason').value;
    
    try {
        const response = await apiRequest(`/admin/transactions/${txId}/flag`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
        });
        
        if (response.status === 'success') {
            alert('Transaction flagged successfully');
            closeFlagModal();
            loadTransactions();
            loadTransactionStats();
        }
    } catch (error) {
        console.error('Error flagging transaction:', error);
        alert('Failed to flag transaction');
    }
}

// Unflag transaction
async function unflagTransaction(txId) {
    if (!confirm('Unflag this transaction?')) return;
    
    try {
        const response = await apiRequest(`/admin/transactions/${txId}/unflag`, {
            method: 'PATCH'
        });
        
        if (response.status === 'success') {
            alert('Transaction unflagged successfully');
            loadTransactions();
            loadTransactionStats();
        }
    } catch (error) {
        console.error('Error unflagging transaction:', error);
        alert('Failed to unflag transaction');
    }
}

// Export transactions
function exportTransactions() {
    window.location.href = `${API_BASE}/admin/analytics/export?type=transactions`;
}