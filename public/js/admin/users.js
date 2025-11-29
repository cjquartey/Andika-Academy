/**
 * Admin Users Management JavaScript
 */

let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    loadUsers();
    setupEventListeners();
});

function checkAdminAuth() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || user.role !== 'admin') {
        window.location.href = '/login';
    }
}

function setupEventListeners() {
    // Search
    let searchTimeout;
    document.getElementById('search-users')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = e.target.value;
            currentPage = 1;
            loadUsers();
        }, 500);
    });

    // Filters
    ['filter-role', 'filter-tier', 'filter-status'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            const filterKey = id.replace('filter-', '');
            currentFilters[filterKey] = e.target.value;
            currentPage = 1;
            loadUsers();
        });
    });

    // Reset filters
    document.getElementById('reset-filters')?.addEventListener('click', () => {
        currentFilters = {};
        document.getElementById('search-users').value = '';
        document.getElementById('filter-role').value = '';
        document.getElementById('filter-tier').value = '';
        document.getElementById('filter-status').value = '';
        currentPage = 1;
        loadUsers();
    });

    // Pagination
    document.getElementById('prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadUsers();
        }
    });

    document.getElementById('next-page')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadUsers();
        }
    });
}

async function loadUsers() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            ...currentFilters
        });

        const response = await apiRequest(`/admin/users?${params}`);
        
        if (response.status === 'success') {
            const { users, pagination } = response.data;
            totalPages = pagination.pages;
            
            renderUsersTable(users);
            updatePagination(pagination);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem;">
                    <div class="empty-state">
                        <p>No users found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--deep-blue); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">
                        ${user.firstName?.charAt(0) || user.username?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <div style="font-weight: 600;">${user.username}</div>
                        <div style="font-size: 0.75rem; color: var(--text-light);">${user.firstName} ${user.lastName}</div>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td><span class="badge ${user.role === 'admin' ? 'status-flagged' : 'status-active'}">${user.role}</span></td>
            <td><span class="badge tier-${user.subscriptionTier}">${user.subscriptionTier}</span></td>
            <td><span class="badge status-${user.accountStatus}">${user.accountStatus}</span></td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn view" onclick="viewUserDetails('${user._id}')">
                        View
                    </button>
                    ${user.accountStatus === 'active' && user.role !== 'admin' ? `
                        <button class="action-btn flag" onclick="suspendUser('${user._id}')">
                            Suspend
                        </button>
                    ` : ''}
                    ${user.accountStatus === 'suspended' ? `
                        <button class="action-btn approve" onclick="reinstateUser('${user._id}')">
                            Reinstate
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function updatePagination(pagination) {
    document.getElementById('showing-start').textContent = ((pagination.page - 1) * pagination.limit + 1);
    document.getElementById('showing-end').textContent = Math.min(pagination.page * pagination.limit, pagination.total);
    document.getElementById('total-users').textContent = pagination.total;
    document.getElementById('current-page').textContent = pagination.page;
    document.getElementById('total-pages').textContent = pagination.pages;
    
    document.getElementById('prev-page').disabled = pagination.page === 1;
    document.getElementById('next-page').disabled = pagination.page === pagination.pages;
}

async function viewUserDetails(userId) {
    try {
        const response = await apiRequest(`/admin/users/${userId}`);
        
        if (response.status === 'success') {
            const { user, stats } = response.data;
            showUserModal(user, stats);
        }
    } catch (error) {
        console.error('Error loading user details:', error);
        showError('Failed to load user details');
    }
}

function showUserModal(user, stats) {
    const modal = document.getElementById('user-modal');
    const content = document.getElementById('user-details-content');
    
    content.innerHTML = `
        <div class="detail-section">
            <h3>User Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Username</div>
                    <div class="detail-value">${user.username}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${user.email}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Full Name</div>
                    <div class="detail-value">${user.firstName} ${user.lastName}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Role</div>
                    <div class="detail-value"><span class="badge ${user.role === 'admin' ? 'status-flagged' : 'status-active'}">${user.role}</span></div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Subscription Tier</div>
                    <div class="detail-value"><span class="badge tier-${user.subscriptionTier}">${user.subscriptionTier}</span></div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Account Status</div>
                    <div class="detail-value"><span class="badge status-${user.accountStatus}">${user.accountStatus}</span></div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Joined</div>
                    <div class="detail-value">${new Date(user.createdAt).toLocaleDateString()}</div>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Statistics</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Total Writings</div>
                    <div class="detail-value">${stats.totalWritings}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Total Spent</div>
                    <div class="detail-value">GHS ${stats.totalSpent.toFixed(2)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Monthly Publications</div>
                    <div class="detail-value">${user.monthlyPublications}</div>
                </div>
            </div>
        </div>

        ${stats.recentTransactions.length > 0 ? `
        <div class="detail-section">
            <h3>Recent Transactions</h3>
            ${stats.recentTransactions.map(tx => `
                <div style="padding: 0.75rem; background: #f8f9fa; border-radius: 0.5rem; margin-bottom: 0.5rem;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>${tx.type} - ${tx.status}</span>
                        <strong>GHS ${tx.amount.toFixed(2)}</strong>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-light); margin-top: 0.25rem;">
                        ${new Date(tx.createdAt).toLocaleDateString()}
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="modal-actions">
            ${user.accountStatus === 'active' && user.role !== 'admin' ? `
                <button class="btn btn-danger" onclick="suspendUser('${user._id}'); closeUserModal();">
                    Suspend User
                </button>
            ` : ''}
            ${user.accountStatus === 'suspended' ? `
                <button class="btn btn-success" onclick="reinstateUser('${user._id}'); closeUserModal();">
                    Reinstate User
                </button>
            ` : ''}
            ${user.role !== 'admin' ? `
                <button class="btn btn-outline" onclick="confirmDeleteUser('${user._id}')">
                    Delete User
                </button>
            ` : ''}
            <button class="btn btn-primary" onclick="closeUserModal()">
                Close
            </button>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('show');
}

async function suspendUser(userId) {
    const reason = prompt('Enter reason for suspension:');
    if (!reason) return;
    
    try {
        const response = await apiRequest(`/admin/users/${userId}/suspend`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
        });
        
        if (response.status === 'success') {
            showSuccess('User suspended successfully');
            loadUsers();
        }
    } catch (error) {
        console.error('Error suspending user:', error);
        showError('Failed to suspend user');
    }
}

async function reinstateUser(userId) {
    if (!confirm('Are you sure you want to reinstate this user?')) return;
    
    try {
        const response = await apiRequest(`/admin/users/${userId}/reinstate`, {
            method: 'PATCH'
        });
        
        if (response.status === 'success') {
            showSuccess('User reinstated successfully');
            loadUsers();
        }
    } catch (error) {
        console.error('Error reinstating user:', error);
        showError('Failed to reinstate user');
    }
}

async function confirmDeleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
        const response = await apiRequest(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.status === 'success') {
            showSuccess('User deleted successfully');
            closeUserModal();
            loadUsers();
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Failed to delete user');
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function showSuccess(message) {
    alert(message); // Replace with toast notification
}

function showError(message) {
    alert(message); // Replace with toast notification
}