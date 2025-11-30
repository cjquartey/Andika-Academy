Auth.requireAuth();

// Check if redirected from successful payment
const urlParams = new URLSearchParams(window.location.search);
const shouldRefresh = urlParams.get('refresh') === 'true';

let currentUser = Auth.getUser();

const currentTierEl = document.getElementById('current-tier');
const currentStatusEl = document.getElementById('current-status');
const alertContainerEl = document.getElementById('alert-container');
const basicBtnEl = document.getElementById('basic-btn');
const premiumBtnEl = document.getElementById('premium-btn');
const paymentSectionEl = document.getElementById('payment-section');
const proceedPaymentEl = document.getElementById('proceed-payment');
const subscriptionHistoryEl = document.getElementById('subscription-history');

let selectedPaymentMethod = 'mobile_money';
let selectedPlan = null;

function showAlert(message, type = 'success') {
    alertContainerEl.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => alertContainerEl.innerHTML = '', 5000);
}

function loadCurrentPlan() {
    const tier = currentUser.subscriptionTier || 'basic';
    const status = currentUser.subscriptionStatus || 'active';
    
    currentTierEl.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
    
    if (tier === 'basic') {
        currentStatusEl.textContent = `${currentUser.monthlyPublications || 0}/5 publications used this month`;
        basicBtnEl.textContent = 'Current Plan';
        basicBtnEl.disabled = true;
        premiumBtnEl.textContent = 'Upgrade Now';
        premiumBtnEl.disabled = false;
    } else {
        currentStatusEl.textContent = 'Unlimited publications • Active';
        basicBtnEl.textContent = 'Downgrade';
        basicBtnEl.disabled = false;
        premiumBtnEl.textContent = 'Current Plan';
        premiumBtnEl.disabled = true;
    }
}

basicBtnEl.addEventListener('click', async () => {
    if (currentUser.subscriptionTier === 'basic') return;
    
    if (!confirm('Downgrade to Basic plan? You will lose premium features.')) return;
    
    try {
        const response = await API.post('/subscriptions/activate-free');
        if (response.success) {
            showAlert('Switched to Basic plan', 'success');
            // Refresh user data and reload
            await Auth.refreshUser();
            setTimeout(() => window.location.reload(), 2000);
        }
    } catch (error) {
        showAlert(error.message || 'Failed to switch plan', 'error');
    }
});

premiumBtnEl.addEventListener('click', () => {
    if (currentUser.subscriptionTier === 'premium') return;
    
    selectedPlan = 'premium';
    paymentSectionEl.style.display = 'block';
    paymentSectionEl.scrollIntoView({ behavior: 'smooth' });
});

document.querySelectorAll('.payment-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        selectedPaymentMethod = option.dataset.method;
    });
});

proceedPaymentEl.addEventListener('click', async () => {
    if (!selectedPlan) {
        showAlert('Please select a plan', 'error');
        return;
    }
    
    proceedPaymentEl.disabled = true;
    proceedPaymentEl.textContent = 'Initializing payment...';
    
    try {
        const response = await API.post('/subscriptions/initialize', {
            planType: selectedPlan,
            paymentMethod: selectedPaymentMethod
        });
        
        if (response.success && response.data && response.data.authorization_url) {
            showAlert('Redirecting to payment gateway...', 'success');
            setTimeout(() => {
                window.location.href = response.data.authorization_url;
            }, 1500);
        } else {
            showAlert('Failed to initialize payment', 'error');
            proceedPaymentEl.disabled = false;
            proceedPaymentEl.textContent = 'Proceed to Payment';
        }
    } catch (error) {
        showAlert(error.message || 'Failed to initialize payment', 'error');
        proceedPaymentEl.disabled = false;
        proceedPaymentEl.textContent = 'Proceed to Payment';
    }
});

async function loadSubscriptionHistory() {
    try {
        const response = await API.get('/subscriptions/history');
        
        // Check if response exists and has the expected structure
        if (response && response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
            subscriptionHistoryEl.innerHTML = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e5e5e5;">
                            <th style="padding: 0.75rem; text-align: left;">Date</th>
                            <th style="padding: 0.75rem; text-align: left;">Plan</th>
                            <th style="padding: 0.75rem; text-align: left;">Amount</th>
                            <th style="padding: 0.75rem; text-align: left;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response.data.map(sub => {
                            // Safely access properties with defaults
                            const date = sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'N/A';
                            const planType = sub.planType || 'Premium';
                            const amount = sub.amount || 0;
                            const currency = sub.currency || 'GHS';
                            const status = sub.status || 'unknown';
                            const statusColor = status === 'active' ? '#2D5016' : '#666';
                            
                            return `
                                <tr style="border-bottom: 1px solid #e5e5e5;">
                                    <td style="padding: 0.75rem;">${date}</td>
                                    <td style="padding: 0.75rem;">${planType.charAt(0).toUpperCase() + planType.slice(1)}</td>
                                    <td style="padding: 0.75rem;">${currency} ${amount.toFixed(2)}</td>
                                    <td style="padding: 0.75rem;">
                                        <span style="color: ${statusColor};">
                                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        } else {
            subscriptionHistoryEl.innerHTML = '<p style="color: #666;">No subscription history yet.</p>';
        }
    } catch (error) {
        console.error('Failed to load subscription history:', error);
        subscriptionHistoryEl.innerHTML = '<p style="color: #666;">Failed to load subscription history.</p>';
    }
}

// Initialize page with fresh data
async function initializePage() {
    try {
        // Show loading state if needed
        if (shouldRefresh || !currentUser || !currentUser.subscriptionTier) {
            // Force refresh from server to get latest subscription status
            const freshUser = await Auth.refreshUser();
            if (freshUser) {
                currentUser = freshUser;
            } else {
                currentUser = Auth.getUser();
            }
            
            // Clean URL
            if (shouldRefresh) {
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
        
        // Load page content
        loadCurrentPlan();
        loadSubscriptionHistory();
    } catch (error) {
        console.error('Error initializing page:', error);
        showAlert('Failed to load subscription data', 'error');
        // Still try to load with cached data
        loadCurrentPlan();
        loadSubscriptionHistory();
    }
}

// Call on page load
initializePage();

// Set default payment method
document.addEventListener('DOMContentLoaded', () => {
    const defaultPaymentOption = document.querySelector('.payment-option[data-method="mobile_money"]');
    if (defaultPaymentOption) {
        defaultPaymentOption.classList.add('selected');
    }
});