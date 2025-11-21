// Redirect if already authenticated
Auth.requireGuest();

// DOM Elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const togglePasswordBtn = document.getElementById('toggle-password');
const alertContainer = document.getElementById('alert-container');

function showAlert(message, type = 'error') {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    const icon = type === 'success' 
        ? '<svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z"/></svg>'
        : '<svg class="alert-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z"/></svg>';
    
    alertContainer.innerHTML = `
        <div class="alert ${alertClass}">
            ${icon}
            <span class="alert-message">${message}</span>
        </div>
    `;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 5000);
}

function showFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);
    
    input.classList.add('input-error');
    errorElement.textContent = message;
}

function clearFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);
    
    input.classList.remove('input-error');
    errorElement.textContent = '';
}

function clearAllErrors() {
    clearFieldError('email');
    clearFieldError('password');
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateForm() {
    clearAllErrors();
    let isValid = true;

    // Validate email
    const email = emailInput.value.trim();
    if (!email) {
        showFieldError('email', 'Email is required');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showFieldError('email', 'Please enter a valid email address');
        isValid = false;
    }

    // Validate password
    const password = passwordInput.value;
    if (!password) {
        showFieldError('password', 'Password is required');
        isValid = false;
    }

    return isValid;
}

function setLoading(loading) {
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        document.querySelector('.btn-text').style.visibility = 'hidden';
        document.querySelector('.btn-loader').classList.remove('hidden');
    } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        document.querySelector('.btn-text').style.visibility = 'visible';
        document.querySelector('.btn-loader').classList.add('hidden');
    }
}

async function handleLogin(e) {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
        return;
    }

    // Get form data
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    // Set loading state
    setLoading(true);
    alertContainer.innerHTML = '';

    try {
        // Make login request
        const response = await API.post('/auth/login', {
            email,
            password
        });

        // Store token
        Auth.setToken(response.accessToken);

        // Fetch user data
        const userResponse = await API.get('/auth/me');
        if (userResponse.success) {
            Auth.setUser(userResponse.user);
        }

        // Show success message
        showAlert('Login successful! Redirecting...', 'success');

        // Redirect to dashboard after a short delay
        setTimeout(() => {
            window.location.href = '/views/dashboard.html';
        }, 1000);

    } catch (error) {
        setLoading(false);
        
        // Handle specific error messages
        let errorMessage = 'Login failed. Please check your credentials and try again.';
        
        if (error.message) {
            if (error.message.includes('Invalid credentials')) {
                errorMessage = 'Invalid email or password. Please try again.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Connection error. Please check your internet and try again.';
            } else {
                errorMessage = error.message;
            }
        }

        showAlert(errorMessage, 'error');
    }
}

function togglePasswordVisibility() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Update icon
    const eyeIcon = togglePasswordBtn.querySelector('.eye-icon');
    if (type === 'text') {
        eyeIcon.innerHTML = '<path d="M10 4C5 4 1.73 7.11 1 10c.73 2.89 4 6 9 6s8.27-3.11 9-6c-.73-2.89-4-6-9-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/><path d="M1 1l18 18" stroke="currentColor" stroke-width="2"/>';
    } else {
        eyeIcon.innerHTML = '<path d="M10 4C5 4 1.73 7.11 1 10c.73 2.89 4 6 9 6s8.27-3.11 9-6c-.73-2.89-4-6-9-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>';
    }
}

function setupInputListeners() {
    emailInput.addEventListener('input', () => {
        if (emailInput.classList.contains('input-error')) {
            clearFieldError('email');
        }
    });

    passwordInput.addEventListener('input', () => {
        if (passwordInput.classList.contains('input-error')) {
            clearFieldError('password');
        }
    });
}

function setupKeyboardShortcuts() {
    loginForm.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !submitBtn.disabled) {
            handleLogin(e);
        }
    });
}

function checkRedirectReason() {
    const urlParams = new URLSearchParams(window.location.search);
    const reason = urlParams.get('reason');

    if (reason === 'session_expired') {
        showAlert('Your session has expired. Please login again.', 'error');
    } else if (reason === 'unauthorized') {
        showAlert('Please login to access that page.', 'error');
    }
}

function init() {
    // Set up event listeners
    loginForm.addEventListener('submit', handleLogin);
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    setupInputListeners();
    setupKeyboardShortcuts();

    // Check for redirect reason
    checkRedirectReason();

    // Focus on email input
    emailInput.focus();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}