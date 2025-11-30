// Admin Dashboard - Main Page
const API_BASE = '/api';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboardStats();
    loadRevenueChart();
    loadRecentActivity();
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
    
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed: ${response.status}`);
    }
    
    return await response.json();
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await apiRequest('/admin/analytics/dashboard');
        
        if (response.status === 'success') {
            const stats = response.data.overview || response.data;
            
            // Update stat cards with null checks
            const totalUsersEl = document.getElementById('total-users');
            if (totalUsersEl) {
                totalUsersEl.textContent = stats.totalUsers?.toLocaleString() || '0';
            }
            
            const activeSubscribersEl = document.getElementById('active-subscribers');
            if (activeSubscribersEl) {
                activeSubscribersEl.textContent = stats.activeSubscribers?.toLocaleString() || '0';
            }
            
            const totalRevenueEl = document.getElementById('total-revenue');
            if (totalRevenueEl) {
                totalRevenueEl.textContent = `GHS ${stats.totalRevenue?.toFixed(2) || '0.00'}`;
            }
            
            const pendingDisputesEl = document.getElementById('pending-disputes');
            if (pendingDisputesEl) {
                pendingDisputesEl.textContent = stats.pendingDisputes?.toLocaleString() || '0';
            }
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load revenue chart
async function loadRevenueChart() {
    try {
        const response = await apiRequest('/admin/analytics/revenue?period=7d');
        
        if (response.status === 'success') {
            const data = response.data.data;
            renderRevenueChart(data);
        }
    } catch (error) {
        console.error('Error loading revenue chart:', error);
    }
}

// Render revenue chart (placeholder - implement with Chart.js)
function renderRevenueChart(data) {
    const chartContainer = document.getElementById('revenue-chart');
    if (!chartContainer) return;
    
    // TODO: Implement actual chart with Chart.js
    chartContainer.innerHTML = '<p>Revenue chart will be displayed here</p>';
}

// Load recent activity
async function loadRecentActivity() {
    try {
        // Load recent transactions
        const txResponse = await apiRequest('/admin/transactions?limit=5&sort=createdAt:desc');
        if (txResponse.status === 'success') {
            renderRecentTransactions(txResponse.data.transactions);
        }
        
        // Load flagged transactions
        const flaggedResponse = await apiRequest('/admin/transactions?flagged=true&limit=5');
        if (flaggedResponse.status === 'success') {
            renderFlaggedTransactions(flaggedResponse.data.transactions);
        }
        
        // Load recent disputes
        const disputesResponse = await apiRequest('/admin/disputes?limit=5&sort=createdAt:desc');
        if (disputesResponse.status === 'success') {
            renderRecentDisputes(disputesResponse.data.disputes);
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// Render recent transactions
function renderRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions');
    if (!container) return;
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="empty-state">No recent transactions</div>';
        return;
    }
    
    container.innerHTML = transactions.map(t => `
        <div class="activity-item">
            <div class="activity-info">
                <strong>${t.user?.username || 'Unknown'}</strong>
                <span>${t.type} - GHS ${t.amount.toFixed(2)}</span>
            </div>
            <div class="activity-meta">
                <span class="badge badge-${t.status}">${t.status}</span>
                <span class="timestamp">${formatDate(t.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

// Render flagged transactions
function renderFlaggedTransactions(transactions) {
    const container = document.getElementById('flagged-transactions');
    if (!container) return;
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="empty-state">No flagged transactions</div>';
        return;
    }
    
    container.innerHTML = transactions.map(t => `
        <div class="activity-item urgent">
            <div class="activity-info">
                <strong>${t.user?.username || 'Unknown'}</strong>
                <span>${t.type} - GHS ${t.amount.toFixed(2)}</span>
            </div>
            <div class="activity-meta">
                <span class="badge badge-danger">Flagged</span>
                <a href="/admin-transactions?id=${t._id}" class="view-link">Review →</a>
            </div>
        </div>
    `).join('');
}

// Render recent disputes
function renderRecentDisputes(disputes) {
    const container = document.getElementById('recent-disputes');
    if (!container) return;
    
    if (!disputes || disputes.length === 0) {
        container.innerHTML = '<div class="empty-state">No recent disputes</div>';
        return;
    }
    
    container.innerHTML = disputes.map(d => `
        <div class="activity-item">
            <div class="activity-info">
                <strong>${d.transaction?.user?.username || 'Unknown'}</strong>
                <span>${d.reason}</span>
            </div>
            <div class="activity-meta">
                <span class="badge badge-${d.status}">${d.status}</span>
                <a href="/admin-disputes?id=${d._id}" class="view-link">View →</a>
            </div>
        </div>
    `).join('');
}

// Utility: Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

// Utility: Show error
function showError(message) {
    console.error(message);
}