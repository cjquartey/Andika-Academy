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
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || user.role !== 'admin') {
        window.location.href = '/login';
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
                ? `${overview.flaggedTransactions} flagged items` 
                : 'No issues';
            document.getElementById('urgent-disputes').textContent = urgentText;
        }
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

// Load revenue chart
async function loadRevenueChart(groupBy = 'month') {
    try {
        const response = await apiRequest(`/admin/analytics/revenue?groupBy=${groupBy}`);
        
        if (response.status === 'success') {
            const { byPeriod } = response.data;
            
            const ctx = document.getElementById('revenue-chart');
            if (!ctx) return;
            
            // Destroy existing chart
            if (revenueChart) {
                revenueChart.destroy();
            }
            
            revenueChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: byPeriod.map(d => d._id),
                    datasets: [{
                        label: 'Revenue (GHS)',
                        data: byPeriod.map(d => d.revenue),
                        borderColor: '#E6B57E',
                        backgroundColor: 'rgba(230, 181, 126, 0.1)',
                        tension: 0.4,
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
                                callback: value => `GHS ${value}`
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
        const response = await apiRequest('/admin/analytics/users');
        
        if (response.status === 'success') {
            const { growth } = response.data;
            
            const ctx = document.getElementById('user-growth-chart');
            if (!ctx) return;
            
            // Destroy existing chart
            if (userGrowthChart) {
                userGrowthChart.destroy();
            }
            
            userGrowthChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: growth.map(d => d._id),
                    datasets: [{
                        label: 'New Users',
                        data: growth.map(d => d.count),
                        backgroundColor: '#0E1F3D',
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
        await Promise.all([
            loadRecentTransactions(),
            loadFlaggedTransactions(),
            loadRecentDisputes()
        ]);
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

// Load recent transactions
async function loadRecentTransactions() {
    try {
        const response = await apiRequest('/admin/transactions?limit=5&sortBy=createdAt&order=desc');
        const container = document.getElementById('recent-transactions');
        
        if (response.status === 'success' && response.data.transactions.length > 0) {
            container.innerHTML = response.data.transactions.map(tx => `
                <div class="activity-item">
                    <div class="activity-info">
                        <div class="activity-title">${tx.user?.username || 'Unknown'}</div>
                        <div class="activity-meta">${tx.type} • ${formatDate(tx.createdAt)}</div>
                    </div>
                    <div class="activity-amount">GHS ${tx.amount.toFixed(2)}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state">No recent transactions</div>';
        }
    } catch (error) {
        console.error('Error loading recent transactions:', error);
    }
}

// Load flagged transactions
async function loadFlaggedTransactions() {
    try {
        const response = await apiRequest('/admin/transactions?status=flagged&limit=5');
        const container = document.getElementById('flagged-transactions');
        
        if (response.status === 'success' && response.data.transactions.length > 0) {
            container.innerHTML = response.data.transactions.map(tx => `
                <div class="activity-item flagged">
                    <div class="activity-info">
                        <div class="activity-title">${tx.user?.username || 'Unknown'}</div>
                        <div class="activity-meta">${tx.flagReason || 'Flagged'}</div>
                    </div>
                    <div class="activity-amount">GHS ${tx.amount.toFixed(2)}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state">No flagged transactions</div>';
        }
    } catch (error) {
        console.error('Error loading flagged transactions:', error);
    }
}

// Load recent disputes
async function loadRecentDisputes() {
    try {
        const response = await apiRequest('/admin/disputes?limit=5&sortBy=createdAt&order=desc');
        const container = document.getElementById('recent-disputes');
        
        if (response.status === 'success' && response.data.disputes.length > 0) {
            container.innerHTML = response.data.disputes.map(dispute => `
                <div class="activity-item ${dispute.priority === 'urgent' ? 'urgent' : ''}">
                    <div class="activity-info">
                        <div class="activity-title">${dispute.subject}</div>
                        <div class="activity-meta">${dispute.user?.username || 'Unknown'} • ${dispute.status}</div>
                    </div>
                    <span class="badge priority-${dispute.priority}">${dispute.priority}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state">No recent disputes</div>';
        }
    } catch (error) {
        console.error('Error loading recent disputes:', error);
    }
}

// Helper: Calculate growth percentage
function calculateGrowth(data, type) {
    // Simple mock calculation - implement actual logic based on your data
    const randomGrowth = (Math.random() * 20 - 5).toFixed(1);
    return randomGrowth;
}

// Helper: Update stat change display
function updateStatChange(elementId, change) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const changeValue = parseFloat(change);
    const isPositive = changeValue > 0;
    
    element.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
    element.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="${isPositive ? 'M8 3l5 5H9v5H7V8H3l5-5z' : 'M8 13l-5-5h4V3h2v5h4l-5 5z'}"/>
        </svg>
        ${Math.abs(changeValue)}% from last period
    `;
}

// Helper: Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
}

// Helper: Show error message
function showError(message) {
    // Implement toast notification or alert
    console.error(message);
    alert(message);
}