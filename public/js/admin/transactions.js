/**
 * Admin Transactions Monitoring JavaScript
 */

let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    loadTransactionStats();
    loadTransactions();
    setupEventListeners();
});

function checkAdminAuth() {
    const user = JSON.parse(localStorage.getItem('andika_user_data') || '{}');
    if (!user || user.role !== 'admin') {
        window.location.href = '/views/login.html';
    }
}

function setupEventListeners() {
    // Search
    let searchTimeout;
    document.getElementById('search-transactions')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = e.target.value;
            currentPage = 1;
            loadTransactions();
        }, 500);
    });

    // Filters
    ['filter-status', 'filter-type', 'filter-method', 'filter-start-date', 'filter-end-date'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            const filterKey = id.replace('filter-', '').replace(/-([a-z])/g, g => g[1].toUpperCase());
            currentFilters[filterKey] = e.target.value;
            currentPage = 1;
            loadTransactions();
        });
    });

    // Reset
    document.getElementById('reset-filters')?.addEventListener('click', () => {
        currentFilters = {};
        document.querySelectorAll('.filter-select, .filter-input').forEach(el => el.value = '');
        currentPage = 1;
        loadTransactions();
        loadTransactionStats();
    });

    // Pagination
    document.getElementById('prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadTransactions();
        }
    });

    document.getElementById('next-page')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadTransactions();
        }
    });

    // Flag form submission
    document.getElementById('flag-form')?.addEventListener('submit', handleFlagSubmit);
}

async function loadTransactionStats() {
    try {
        const response = await apiRequest('/admin/transactions/stats');
        
        if (response.status === 'success') {
            const { overview } = response.data;
            document.getElementById('stat-total').textContent = overview.totalTransactions.toLocaleString();
            document.getElementById('stat-revenue').textContent = `GHS ${overview.totalRevenue.toFixed(2)}`;
            document.getElementById('stat-avg').textContent = `GHS ${overview.avgTransaction.toFixed(2)}`;
            
            const flaggedCount = response.data.byStatus?.find(s => s._id === 'flagged')?.count || 0;
            document.getElementById('stat-flagged').textContent = flaggedCount;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

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
                    ${tx.status !== 'flagged' ? `
                        <button class="action-btn flag" onclick="openFlagModal('${tx._id}')">Flag</button>
                    ` : `
                        <button class="action-btn approve" onclick="unflagTransaction('${tx._id}')">Unflag</button>
                    `}
                </div>
            </td>
        </tr>
    `).join('');
}

function updatePagination(pagination) {
    document.getElementById('showing-start').textContent = ((pagination.page - 1) * pagination.limit + 1);
    document.getElementById('showing-end').textContent = Math.min(pagination.page * pagination.limit, pagination.total);
    document.getElementById('total-transactions').textContent = pagination.total;
    document.getElementById('current-page').textContent = pagination.page;
    document.getElementById('total-pages').textContent = pagination.pages;
    
    document.getElementById('prev-page').disabled = pagination.page === 1;
    document.getElementById('next-page').disabled = pagination.page === pagination.pages;
}

async function viewTransactionDetails(txId) {
    try {
        const response = await apiRequest(`/admin/transactions/${txId}`);
        
        if (response.status === 'success') {
            showTransactionModal(response.data.transaction);
        }
    } catch (error) {
        console.error('Error loading transaction:', error);
    }
}

function showTransactionModal(tx) {
    const modal = document.getElementById('transaction-modal');
    const content = document.getElementById('transaction-details-content');
    
    content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item"><div class="detail-label">Reference</div><div class="detail-value">${tx.paystackReference || 'N/A'}</div></div>
            <div class="detail-item"><div class="detail-label">User</div><div class="detail-value">${tx.user?.username || 'Unknown'}</div></div>
            <div class="detail-item"><div class="detail-label">Type</div><div class="detail-value">${tx.type}</div></div>
            <div class="detail-item"><div class="detail-label">Amount</div><div class="detail-value">GHS ${tx.amount.toFixed(2)}</div></div>
            <div class="detail-item"><div class="detail-label">Payment Method</div><div class="detail-value">${tx.paymentMethod}</div></div>
            <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value"><span class="badge status-${tx.status}">${tx.status}</span></div></div>
            <div class="detail-item"><div class="detail-label">Date</div><div class="detail-value">${new Date(tx.createdAt).toLocaleString()}</div></div>
            ${tx.flagReason ? `<div class="detail-item"><div class="detail-label">Flag Reason</div><div class="detail-value">${tx.flagReason}</div></div>` : ''}
        </div>
    `;
    
    modal.classList.add('show');
}

function closeTransactionModal() {
    document.getElementById('transaction-modal').classList.remove('show');
}

function openFlagModal(txId) {
    document.getElementById('flag-transaction-id').value = txId;
    document.getElementById('flag-modal').classList.add('show');
}

function closeFlagModal() {
    document.getElementById('flag-modal').classList.remove('show');
    document.getElementById('flag-form').reset();
}

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

function exportTransactions() {
    window.location.href = `${API_BASE}/admin/analytics/export?type=transactions`;
}