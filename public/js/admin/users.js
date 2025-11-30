let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    loadUsers();
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
            let filterKey = id.replace('filter-', '');
            // Map frontend filter names to backend parameter names
            if (filterKey === 'tier') filterKey = 'subscriptionTier';
            if (filterKey === 'status') filterKey = 'accountStatus';
            
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
            displayUsers(response.data.users);
            updatePagination(response.data.pagination);
            totalPages = response.data.pagination.pages;
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showError(error.message || 'Failed to load users');
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('users-table-body');
    
    if (!tbody) {
        console.error('Users table body not found');
        return;
    }

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>
                <span class="badge badge-${user.role === 'admin' ? 'warning' : 'info'}">
                    ${user.role}
                </span>
            </td>
            <td>
                <span class="badge badge-${user.subscriptionTier === 'premium' ? 'success' : 'secondary'}">
                    ${user.subscriptionTier}
                </span>
            </td>
            <td>
                <span class="badge badge-${user.accountStatus === 'active' ? 'success' : 'danger'}">
                    ${user.accountStatus}
                </span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>${formatDate(user.lastLoginAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline" onclick="viewUser('${user._id}')">
                        View
                    </button>
                    ${user.accountStatus === 'active' ?
                        `<button class="btn btn-sm btn-danger-outline" onclick="suspendUser('${user._id}')">
                            Suspend
                        </button>` :
                        `<button class="btn btn-sm btn-success-outline" onclick="reinstateUser('${user._id}')">
                            Reinstate
                        </button>`
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

function updatePagination(pagination) {
    document.getElementById('current-page').textContent = pagination.page;
    document.getElementById('total-pages').textContent = pagination.pages;
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    prevBtn.disabled = pagination.page === 1;
    nextBtn.disabled = pagination.page === pagination.pages;
}

async function viewUser(userId) {
    try {
        const response = await apiRequest(`/admin/users/${userId}`);
        
        if (response.status === 'success') {
            showUserModal(response.data.user, response.data.stats);
        }
    } catch (error) {
        console.error('Error loading user details:', error);
        showError(error.message || 'Failed to load user details');
    }
}

function showUserModal(user, stats) {
    const modal = document.getElementById('user-modal');
    const content = document.getElementById('user-details-content');
    
    content.innerHTML = `
        <div class="user-details-grid">
            <div class="detail-section">
                <h3>Personal Information</h3>
                <dl>
                    <dt>Full Name:</dt>
                    <dd>${user.firstName} ${user.lastName}</dd>
                    <dt>Username:</dt>
                    <dd>${user.username}</dd>
                    <dt>Email:</dt>
                    <dd>${user.email}</dd>
                    <dt>Bio:</dt>
                    <dd>${user.bio || 'Not provided'}</dd>
                </dl>
            </div>
            
            <div class="detail-section">
                <h3>Account Details</h3>
                <dl>
                    <dt>Role:</dt>
                    <dd><span class="badge badge-${user.role === 'admin' ? 'warning' : 'info'}">${user.role}</span></dd>
                    <dt>Subscription:</dt>
                    <dd><span class="badge badge-${user.subscriptionTier === 'premium' ? 'success' : 'secondary'}">${user.subscriptionTier}</span></dd>
                    <dt>Status:</dt>
                    <dd><span class="badge badge-${user.accountStatus === 'active' ? 'success' : 'danger'}">${user.accountStatus}</span></dd>
                    <dt>Joined:</dt>
                    <dd>${new Date(user.createdAt).toLocaleDateString()}</dd>
                    <dt>Last Login:</dt>
                    <dd>${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</dd>
                </dl>
            </div>
            
            <div class="detail-section">
                <h3>Activity Statistics</h3>
                <dl>
                    <dt>Total Writings:</dt>
                    <dd>${stats?.totalWritings || 0}</dd>
                    <dt>Total Views:</dt>
                    <dd>${stats?.totalViews || 0}</dd>
                    <dt>Total Comments:</dt>
                    <dd>${stats?.totalComments || 0}</dd>
                    <dt>Monthly Publications Used:</dt>
                    <dd>${user.monthlyPublications || 0} / ${user.subscriptionTier === 'premium' ? 'Unlimited' : '5'}</dd>
                </dl>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

async function suspendUser(userId) {
    if (!confirm('Are you sure you want to suspend this user? They will not be able to access their account.')) {
        return;
    }
    
    console.log('Attempting to suspend user:', userId);
    
    try {
        const response = await apiRequest(`/admin/users/${userId}/suspend`, 'PATCH');
        
        console.log('Suspend response:', response);
        
        if (response.status === 'success') {
            showSuccess('User suspended successfully');
            loadUsers();
        }
    } catch (error) {
        console.error('Error suspending user:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        // Show the actual error message from the backend
        showError(error.message || 'Failed to suspend user');
    }
}

async function reinstateUser(userId) {
    if (!confirm('Are you sure you want to reinstate this user? They will regain access to their account.')) {
        return;
    }
    
    console.log('Attempting to reinstate user:', userId);
    
    try {
        const response = await apiRequest(`/admin/users/${userId}/reinstate`, 'PATCH');
        
        console.log('Reinstate response:', response);
        
        if (response.status === 'success') {
            showSuccess('User reinstated successfully');
            loadUsers();
        }
    } catch (error) {
        console.error('Error reinstating user:', error);
        // Show the actual error message from the backend
        showError(error.message || 'Failed to reinstate user');
    }
}

// Updated apiRequest function with proper error handling
async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('andika_auth_token');
    
    console.log('Making API request:', {
        endpoint,
        method,
        hasToken: !!token,
        body
    });
    
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`/api${endpoint}`, options);
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        // Parse JSON first before checking if response is ok
        const data = await response.json();
        
        console.log('Response data:', data);
        
        if (!response.ok) {
            // Throw error with the actual message from the backend
            throw new Error(data.message || `API request failed: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        // Re-throw the error so the calling function can handle it
        throw error;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function showError(message) {
    // Implement toast notification
    alert(message);
}

function showSuccess(message) {
    // Implement toast notification
    alert(message);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('user-modal');
    if (event.target === modal) {
        closeUserModal();
    }
}