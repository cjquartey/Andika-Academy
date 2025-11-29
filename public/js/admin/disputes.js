/**
 * Admin Disputes Management JavaScript
 */

let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    loadDisputeStats();
    loadDisputes();
    setupEventListeners();
});

function checkAdminAuth() {
    const user = JSON.parse(localStorage.getItem('andika_user_data') || '{}');
    if (!user || user.role !== 'admin') {
        window.location.href = '/views/login.html';
    }
}

function setupEventListeners() {
    // Search and filters
    let searchTimeout;
    document.getElementById('search-disputes')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = e.target.value;
            currentPage = 1;
            loadDisputes();
        }, 500);
    });

    ['filter-status', 'filter-type', 'filter-priority', 'filter-assigned'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            const filterKey = id.replace('filter-', '');
            currentFilters[filterKey] = e.target.value;
            currentPage = 1;
            loadDisputes();
        });
    });

    document.getElementById('reset-filters')?.addEventListener('click', () => {
        currentFilters = {};
        document.querySelectorAll('.filter-select').forEach(el => el.value = '');
        currentPage = 1;
        loadDisputes();
        loadDisputeStats();
    });

    // Pagination
    document.getElementById('prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadDisputes();
        }
    });

    document.getElementById('next-page')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadDisputes();
        }
    });

    // Forms
    document.getElementById('resolve-form')?.addEventListener('submit', handleResolveSubmit);
    document.getElementById('reject-form')?.addEventListener('submit', handleRejectSubmit);
}

async function loadDisputeStats() {
    try {
        const response = await apiRequest('/admin/disputes/stats');
        
        if (response.status === 'success') {
            const { byStatus, byPriority } = response.data;
            
            document.getElementById('stat-open').textContent = byStatus?.find(s => s._id === 'open')?.count || 0;
            document.getElementById('stat-progress').textContent = byStatus?.find(s => s._id === 'in_progress')?.count || 0;
            document.getElementById('stat-resolved').textContent = byStatus?.find(s => s._id === 'resolved')?.count || 0;
            document.getElementById('stat-urgent').textContent = byPriority?.find(p => p._id === 'urgent')?.count || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

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

function renderDisputesTable(disputes) {
    const tbody = document.getElementById('disputes-table-body');
    
    if (disputes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 3rem;">No disputes found</td></tr>';
        return;
    }

    tbody.innerHTML = disputes.map(d => `
        <tr>
            <td><code>${d._id.slice(-6)}</code></td>
            <td>${d.user?.username || 'Unknown'}</td>
            <td>${d.subject}</td>
            <td>${d.type.replace('_', ' ')}</td>
            <td><span class="badge priority-${d.priority}">${d.priority}</span></td>
            <td><span class="badge status-${d.status}">${d.status.replace('_', ' ')}</span></td>
            <td>${d.assignedTo ? 'Assigned' : 'Unassigned'}</td>
            <td>${new Date(d.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn view" onclick="viewDisputeDetails('${d._id}')">View</button>
                    ${d.status === 'open' || d.status === 'in_progress' ? `
                        <button class="action-btn approve" onclick="openResolveModal('${d._id}')">Resolve</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function updatePagination(pagination) {
    document.getElementById('showing-start').textContent = ((pagination.page - 1) * pagination.limit + 1);
    document.getElementById('showing-end').textContent = Math.min(pagination.page * pagination.limit, pagination.total);
    document.getElementById('total-disputes').textContent = pagination.total;
    document.getElementById('current-page').textContent = pagination.page;
    document.getElementById('total-pages').textContent = pagination.pages;
    
    document.getElementById('prev-page').disabled = pagination.page === 1;
    document.getElementById('next-page').disabled = pagination.page === pagination.pages;
}

async function viewDisputeDetails(disputeId) {
    try {
        const response = await apiRequest(`/admin/disputes/${disputeId}`);
        
        if (response.status === 'success') {
            showDisputeModal(response.data.dispute);
        }
    } catch (error) {
        console.error('Error loading dispute:', error);
    }
}

function showDisputeModal(dispute) {
    const modal = document.getElementById('dispute-modal');
    const content = document.getElementById('dispute-details-content');
    
    content.innerHTML = `
        <div class="detail-section">
            <h3>Dispute Information</h3>
            <div class="detail-grid">
                <div class="detail-item"><div class="detail-label">Subject</div><div class="detail-value">${dispute.subject}</div></div>
                <div class="detail-item"><div class="detail-label">Type</div><div class="detail-value">${dispute.type.replace('_', ' ')}</div></div>
                <div class="detail-item"><div class="detail-label">Priority</div><div class="detail-value"><span class="badge priority-${dispute.priority}">${dispute.priority}</span></div></div>
                <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value"><span class="badge status-${dispute.status}">${dispute.status.replace('_', ' ')}</span></div></div>
            </div>
            <div style="margin-top: 1rem;">
                <div class="detail-label">Description</div>
                <div class="detail-value">${dispute.description}</div>
            </div>
        </div>
        ${dispute.resolution ? `
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

function closeDisputeModal() {
    document.getElementById('dispute-modal').classList.remove('show');
}

async function assignDispute(disputeId) {
    try {
        const response = await apiRequest(`/admin/disputes/${disputeId}/assign`, {
            method: 'PATCH'
        });
        
        if (response.status === 'success') {
            alert('Dispute assigned successfully');
            loadDisputes();
        }
    } catch (error) {
        console.error('Error assigning dispute:', error);
        alert('Failed to assign dispute');
    }
}

function openResolveModal(disputeId) {
    document.getElementById('resolve-dispute-id').value = disputeId;
    document.getElementById('resolve-modal').classList.add('show');
}

function closeResolveModal() {
    document.getElementById('resolve-modal').classList.remove('show');
    document.getElementById('resolve-form').reset();
}

function openRejectModal(disputeId) {
    document.getElementById('reject-dispute-id').value = disputeId;
    document.getElementById('reject-modal').classList.add('show');
}

function closeRejectModal() {
    document.getElementById('reject-modal').classList.remove('show');
    document.getElementById('reject-form').reset();
}

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