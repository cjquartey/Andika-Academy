/**
 * Admin Dashboard JavaScript
 * Handles dashboard data loading and visualization
 */

let revenueChart = null;
let userGrowthChart = null;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    loadDashboardData();
    setupEventListeners();
});

// Check if user is admin
function checkAdminAuth() {
    const user = JSON.parse(localStorage.getItem('andika_user_data') || '{}');
    
    if (!user || user.role !== 'admin') {
        window.location.href = '/views/login.html';
        return;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Period filter change
    document.getElementById('period-filter')?.addEventListener('change', (e) => {
        loadDashboardData(e.target.value);
    });

    // Revenue chart grouping change
    document.getElementById('revenue-groupby')?.addEventListener('change', (e) => {
        loadRevenueChart(e.target.value);
    });
}

// Load all dashboard data
async function loadDashboardData(period = 30) {
    try {
        await Promise.all([
            loadOverviewStats(period),
            loadRevenueChart('month'),
            loadUserGrowthChart(period),
            loadRecentActivity()
        ]);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

// Load overview statistics
async function loadOverviewStats(period) {
    try {
        const response = await apiRequest(`/admin/analytics/dashboard?period=${period}`);
        
        if (response.status === 'success') {
            const { overview, growth } = response.data;
            
            // Update stat cards
            document.getElementById('total-users').textContent = overview.totalUsers.toLocaleString();
            document.getElementById('active-subscribers').textContent = overview.activeSubscribers.toLocaleString();
            document.getElementById('total-revenue').textContent = `GHS ${overview.totalRevenue.toFixed(2)}`;
            document.getElementById('pending-disputes').textContent = overview.pendingDisputes;
            
            // Calculate and show changes
            const usersChange = calculateGrowth(growth, 'users');
            const subscribersChange = calculateGrowth(growth, 'subscribers');
            const revenueChange = calculateGrowth(growth, 'revenue');
            
            updateStatChange('users-change', usersChange);
            updateStatChange('subscribers-change', subscribersChange);
            updateStatChange('revenue-change', revenueChange);
            
            // Update urgent disputes
            const urgentText = overview.flaggedTransactions > 0 
                ? `${overview.flaggedTransactions} flagged transactions need review`
                : 'No urgent items';
            
            document.getElementById('urgent-disputes').textContent = urgentText;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Calculate growth percentage
function calculateGrowth(growth, metric) {
    if (!growth || !growth[metric]) return 0;
    const { current, previous } = growth[metric];
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
}

// Update stat change indicator
function updateStatChange(elementId, changePercent) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const isPositive = changePercent >= 0;
    const arrow = isPositive ? '↑' : '↓';
    const className = isPositive ? 'stat-increase' : 'stat-decrease';
    
    element.textContent = `${arrow} ${Math.abs(changePercent).toFixed(1)}%`;
    element.className = `stat-change ${className}`;
}

// Load revenue chart
async function loadRevenueChart(groupBy = 'month') {
    try {
        const response = await apiRequest(`/admin/analytics/revenue?groupBy=${groupBy}`);
        
        if (response.status === 'success') {
            const { labels, values } = response.data;
            
            const ctx = document.getElementById('revenue-chart');
            if (!ctx) return;
            
            // Destroy existing chart
            if (revenueChart) {
                revenueChart.destroy();
            }
            
            // Create new chart
            revenueChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Revenue (GHS)',
                        data: values,
                        borderColor: 'rgb(234, 88, 12)',
                        backgroundColor: 'rgba(234, 88, 12, 0.1)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'GHS ' + value.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading revenue chart:', error);
    }
}

// Load user growth chart
async function loadUserGrowthChart(period) {
    try {
        const response = await apiRequest(`/admin/analytics/users?period=${period}`);
        
        if (response.status === 'success') {
            const { labels, values } = response.data;
            
            const ctx = document.getElementById('user-growth-chart');
            if (!ctx) return;
            
            // Destroy existing chart
            if (userGrowthChart) {
                userGrowthChart.destroy();
            }
            
            // Create new chart
            userGrowthChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'New Users',
                        data: values,
                        backgroundColor: 'rgba(30, 58, 138, 0.8)',
                        borderColor: 'rgb(30, 58, 138)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading user growth chart:', error);
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        // Load recent transactions
        const transactionsResponse = await apiRequest('/admin/transactions?limit=5&sort=createdAt:desc');
        if (transactionsResponse.status === 'success') {
            renderRecentTransactions(transactionsResponse.data.transactions);
        }
        
        // Load flagged transactions
        const flaggedResponse = await apiRequest('/admin/transactions?status=flagged&limit=5');
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
                <a href="/views/admin/transactions.html?id=${t._id}" class="view-link">Review →</a>
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
                <a href="/views/admin/disputes.html?id=${d._id}" class="view-link">View →</a>
            </div>
        </div>
    `).join('');
}

// Utility: API request helper
async function apiRequest(endpoint) {
    const token = localStorage.getItem('andika_auth_token');
    const response = await fetch(`/api${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
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
    // You can implement a toast notification here
    console.error(message);
}