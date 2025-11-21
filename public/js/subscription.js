Auth.requireAuth();
const currentUser = Auth.getUser();

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
        
        if (response.success && response.data && response.data.length > 0) {
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
                        ${response.data.map(sub => `
                            <tr style="border-bottom: 1px solid #e5e5e5;">
                                <td style="padding: 0.75rem;">${new Date(sub.createdAt).toLocaleDateString()}</td>
                                <td style="padding: 0.75rem;">Premium</td>
                                <td style="padding: 0.75rem;">${sub.amount} ${sub.currency}</td>
                                <td style="padding: 0.75rem;">
                                    <span style="color: ${sub.status === 'active' ? '#2D5016' : '#666'};">
                                        ${sub.status}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            subscriptionHistoryEl.innerHTML = '<p style="color: #666;">No subscription history yet.</p>';
        }
    } catch (error) {
        console.error('Failed to load history:', error);
        subscriptionHistoryEl.innerHTML = '<p style="color: #666;">Failed to load history.</p>';
    }
}

loadCurrentPlan();
loadSubscriptionHistory();

document.querySelector('.payment-option[data-method="mobile_money"]').classList.add('selected');