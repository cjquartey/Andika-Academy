// Dispute Management Page
const API_BASE = '/api';
let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDisputeStats();
    loadDisputes();
    
    // Setup event listeners
    document.getElementById('filter-form')?.addEventListener('submit', handleFilterSubmit);
    document.getElementById('resolve-form')?.addEventListener('submit', handleResolveSubmit);
    document.getElementById('reject-form')?.addEventListener('submit', handleRejectSubmit);
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
    
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed: ${response.status}`);
    }
    
    return await response.json();
}

// Load dispute stats
async function loadDisputeStats() {
    try {
        const response = await apiRequest('/admin/analytics/overview');
        
        if (response.status === 'success') {
            const stats = response.data;
            
            document.getElementById('total-disputes').textContent = 
                stats.totalDisputes?.toLocaleString() || '0';
            document.getElementById('open-disputes').textContent = 
                stats.openDisputes?.toLocaleString() || '0';
            document.getElementById('resolved-disputes').textContent = 
                stats.resolvedDisputes?.toLocaleString() || '0';
            document.getElementById('disputed-amount').textContent = 
                `GHS ${stats.disputedAmount?.toFixed(2) || '0.00'}`;
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
    loadDisputes();
}

// Clear filters
function clearFilters() {
    document.getElementById('filter-form').reset();
    currentFilters = {};
    currentPage = 1;
    loadDisputes();
}

// Load disputes
async function loadDisputes() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            ...currentFilters
        });

        const response = await apiRequest(`/admin/disputes?${params}`);
        
        if (response.status === 'success') {
            const { disputes, pagination } = response.data;
            totalPages = pagination.pages;
            
            renderDisputesTable(disputes);
            updatePagination(pagination);
        }
    } catch (error) {
        console.error('Error loading disputes:', error);
    }
}

// Render disputes table
function renderDisputesTable(disputes) {
    const tbody = document.getElementById('disputes-table-body');
    
    if (disputes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 3rem;">No disputes found</td></tr>';
        return;
    }

    tbody.innerHTML = disputes.map(dispute => `
        <tr>
            <td><code>${dispute._id.substring(0, 8)}</code></td>
            <td>${dispute.transaction?.user?.username || 'Unknown'}</td>
            <td>${dispute.reason}</td>
            <td><strong>GHS ${dispute.transaction?.amount?.toFixed(2) || '0.00'}</strong></td>
            <td><span class="badge status-${dispute.status}">${dispute.status}</span></td>
            <td>${dispute.assignedTo?.user?.username || 'Unassigned'}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn view" onclick="viewDisputeDetails('${dispute._id}')">View</button>
                    ${!dispute.assignedTo ? 
                        `<button class="action-btn assign" onclick="assignDispute('${dispute._id}')">Assign</button>` : 
                        ''}
                    ${dispute.status === 'open' || dispute.status === 'in_progress' ?
                        `<button class="action-btn resolve" onclick="openResolveModal('${dispute._id}')">Resolve</button>` :
                        ''}
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
    loadDisputes();
}

// View dispute details
async function viewDisputeDetails(disputeId) {
    try {
        const response = await apiRequest(`/admin/disputes/${disputeId}`);
        
        if (response.status === 'success') {
            displayDisputeModal(response.data.dispute);
        }
    } catch (error) {
        console.error('Error loading dispute details:', error);
        alert('Failed to load dispute details');
    }
}

// Display dispute modal
function displayDisputeModal(dispute) {
    const modal = document.getElementById('dispute-modal');
    const modalBody = document.getElementById('dispute-details');
    
    modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Dispute ID</div>
                <div class="detail-value"><code>${dispute._id}</code></div>
            </div>
            <div class="detail-item">
                <div class="detail-label">User</div>
                <div class="detail-value">${dispute.transaction?.user?.username || 'Unknown'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Transaction Amount</div>
                <div class="detail-value"><strong>GHS ${dispute.transaction?.amount?.toFixed(2) || '0.00'}</strong></div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value"><span class="badge status-${dispute.status}">${dispute.status}</span></div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Assigned To</div>
                <div class="detail-value">${dispute.assignedTo?.user?.username || 'Unassigned'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Created</div>
                <div class="detail-value">${new Date(dispute.createdAt).toLocaleString()}</div>
            </div>
        </div>
        <div class="detail-section">
            <h3>Reason</h3>
            <p>${dispute.reason}</p>
        </div>
        <div class="detail-section">
            <h3>Description</h3>
            <p>${dispute.description || 'No description provided'}</p>
        </div>
        ${dispute.status === 'resolved' || dispute.status === 'rejected' ? `
        <div class="detail-section">
            <h3>Resolution</h3>
            <div class="detail-value">${dispute.resolution}</div>
            ${dispute.refundAmount ? `<p style="margin-top: 1rem;"><strong>Refund Amount:</strong> GHS ${dispute.refundAmount.toFixed(2)}</p>` : ''}
        </div>
        ` : ''}
        <div class="modal-actions">
            ${!dispute.assignedTo ? `
                <button class="btn btn-primary" onclick="assignDispute('${dispute._id}'); closeDisputeModal();">Assign to Me</button>
            ` : ''}
            ${dispute.status === 'open' || dispute.status === 'in_progress' ? `
                <button class="btn btn-success" onclick="closeDisputeModal(); openResolveModal('${dispute._id}');">Resolve</button>
                <button class="btn btn-danger" onclick="closeDisputeModal(); openRejectModal('${dispute._id}');">Reject</button>
            ` : ''}
            <button class="btn btn-outline" onclick="closeDisputeModal()">Close</button>
        </div>
    `;
    
    modal.classList.add('show');
}

// Close dispute modal
function closeDisputeModal() {
    document.getElementById('dispute-modal').classList.remove('show');
}

// Assign dispute
async function assignDispute(disputeId) {
    try {
        const response = await apiRequest(`/admin/disputes/${disputeId}/assign`, {
            method: 'PATCH'
        });
        
        if (response.status === 'success') {
            alert('Dispute assigned successfully');
            loadDisputes();
            loadDisputeStats();
        }
    } catch (error) {
        console.error('Error assigning dispute:', error);
        alert('Failed to assign dispute');
    }
}

// Open resolve modal
function openResolveModal(disputeId) {
    document.getElementById('resolve-dispute-id').value = disputeId;
    document.getElementById('resolve-modal').classList.add('show');
}

// Close resolve modal
function closeResolveModal() {
    document.getElementById('resolve-modal').classList.remove('show');
    document.getElementById('resolve-form').reset();
}

// Open reject modal
function openRejectModal(disputeId) {
    document.getElementById('reject-dispute-id').value = disputeId;
    document.getElementById('reject-modal').classList.add('show');
}

// Close reject modal
function closeRejectModal() {
    document.getElementById('reject-modal').classList.remove('show');
    document.getElementById('reject-form').reset();
}

// Handle resolve submit
async function handleResolveSubmit(e) {
    e.preventDefault();
    
    const disputeId = document.getElementById('resolve-dispute-id').value;
    const resolution = document.getElementById('resolution-text').value;
    const refundAmount = document.getElementById('refund-amount').value;
    
    try {
        const body = { resolution };
        if (refundAmount) body.refundAmount = parseFloat(refundAmount);
        
        const response = await apiRequest(`/admin/disputes/${disputeId}/resolve`, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
        
        if (response.status === 'success') {
            alert('Dispute resolved successfully');
            closeResolveModal();
            loadDisputes();
            loadDisputeStats();
        }
    } catch (error) {
        console.error('Error resolving dispute:', error);
        alert('Failed to resolve dispute');
    }
}

// Handle reject submit
async function handleRejectSubmit(e) {
    e.preventDefault();
    
    const disputeId = document.getElementById('reject-dispute-id').value;
    const resolution = document.getElementById('rejection-reason').value;
    
    try {
        const response = await apiRequest(`/admin/disputes/${disputeId}/reject`, {
            method: 'PATCH',
            body: JSON.stringify({ resolution })
        });
        
        if (response.status === 'success') {
            alert('Dispute rejected');
            closeRejectModal();
            loadDisputes();
            loadDisputeStats();
        }
    } catch (error) {
        console.error('Error rejecting dispute:', error);
        alert('Failed to reject dispute');
    }
}