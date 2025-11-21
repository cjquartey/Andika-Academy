// Redirect if already authenticated
Auth.requireGuest();

// DOM Elements
const registerForm = document.getElementById('register-form');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const termsCheckbox = document.getElementById('terms');
const submitBtn = document.getElementById('submit-btn');
const togglePasswordBtn = document.getElementById('toggle-password');
const toggleConfirmPasswordBtn = document.getElementById('toggle-confirm-password');
const alertContainer = document.getElementById('alert-container');
const passwordStrengthContainer = document.getElementById('password-strength');
const strengthFill = document.getElementById('strength-fill');
const strengthText = document.getElementById('strength-text');

/**
 * Show alert message
 */
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

    // Scroll to top to show alert
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Auto-hide after 5 seconds for errors
    if (type === 'error') {
        setTimeout(() => {
            alertContainer.innerHTML = '';
        }, 5000);
    }
}

/**
 * Show field error
 */
function showFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);
    
    if (input && errorElement) {
        input.classList.add('input-error');
        errorElement.textContent = message;
    }
}

/**
 * Clear field error
 */
function clearFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);
    
    if (input && errorElement) {
        input.classList.remove('input-error');
        errorElement.textContent = '';
    }
}

/**
 * Clear all field errors
 */
function clearAllErrors() {
    ['firstName', 'lastName', 'username', 'email', 'password', 'confirmPassword', 'terms'].forEach(clearFieldError);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Check password strength
 */
function checkPasswordStrength(password) {
    let strength = 0;
    const checks = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*]/.test(password)
    };

    // Count passed checks
    Object.values(checks).forEach(check => {
        if (check) strength++;
    });

    return {
        score: strength,
        checks: checks
    };
}

/**
 * Update password strength indicator
 */
function updatePasswordStrength(password) {
    if (!password) {
        passwordStrengthContainer.style.display = 'none';
        return;
    }

    passwordStrengthContainer.style.display = 'block';
    const result = checkPasswordStrength(password);
    
    // Remove existing classes
    strengthFill.classList.remove('weak', 'medium', 'strong');
    
    // Update based on score
    if (result.score <= 2) {
        strengthFill.classList.add('weak');
        strengthText.textContent = 'Weak password';
        strengthText.style.color = '#DC2626';
    } else if (result.score <= 4) {
        strengthFill.classList.add('medium');
        strengthText.textContent = 'Medium strength';
        strengthText.style.color = '#F59E0B';
    } else {
        strengthFill.classList.add('strong');
        strengthText.textContent = 'Strong password';
        strengthText.style.color = 'var(--forest-green)';
    }
}

/**
 * Validate form
 */
function validateForm() {
    clearAllErrors();
    let isValid = true;

    // Validate first name
    const firstName = firstNameInput.value.trim();
    if (!firstName) {
        showFieldError('firstName', 'First name is required');
        isValid = false;
    }

    // Validate last name
    const lastName = lastNameInput.value.trim();
    if (!lastName) {
        showFieldError('lastName', 'Last name is required');
        isValid = false;
    }

    // Validate username
    const username = usernameInput.value.trim();
    if (!username) {
        showFieldError('username', 'Username is required');
        isValid = false;
    } else if (username.length < 3) {
        showFieldError('username', 'Username must be at least 3 characters');
        isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showFieldError('username', 'Username can only contain letters, numbers, and underscores');
        isValid = false;
    }

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
    } else {
        const strength = checkPasswordStrength(password);
        
        if (!strength.checks.length) {
            showFieldError('password', 'Password must be at least 8 characters long');
            isValid = false;
        } else if (!strength.checks.lowercase) {
            showFieldError('password', 'Password must contain at least one lowercase letter');
            isValid = false;
        } else if (!strength.checks.uppercase) {
            showFieldError('password', 'Password must contain at least one uppercase letter');
            isValid = false;
        } else if (!strength.checks.number) {
            showFieldError('password', 'Password must contain at least one number');
            isValid = false;
        } else if (!strength.checks.special) {
            showFieldError('password', 'Password must contain at least one special character (!@#$%^&*)');
            isValid = false;
        }
    }

    // Validate confirm password
    const confirmPassword = confirmPasswordInput.value;
    if (!confirmPassword) {
        showFieldError('confirmPassword', 'Please confirm your password');
        isValid = false;
    } else if (password !== confirmPassword) {
        showFieldError('confirmPassword', 'Passwords do not match');
        isValid = false;
    }

    // Validate terms
    if (!termsCheckbox.checked) {
        showFieldError('terms', 'You must agree to the terms and conditions');
        isValid = false;
    }

    return isValid;
}

/**
 * Set loading state
 */
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

/**
 * Handle form submission
 */
async function handleRegister(e) {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
        showAlert('Please fix the errors in the form', 'error');
        return;
    }

    // Get form data
    const formData = {
        firstName: firstNameInput.value.trim(),
        lastName: lastNameInput.value.trim(),
        username: usernameInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
        password: passwordInput.value
    };

    // Set loading state
    setLoading(true);
    alertContainer.innerHTML = '';

    try {
        // Make registration request
        const response = await API.post('/auth/register', formData);

        // Show success message
        showAlert('Account created successfully! Redirecting to login...', 'success');

        // Redirect to login after a short delay
        setTimeout(() => {
            window.location.href = '/views/login.html?registered=true';
        }, 2000);

    } catch (error) {
        setLoading(false);
        
        // Handle specific error messages
        let errorMessage = 'Registration failed. Please try again.';
        
        if (error.message) {
            if (error.message.includes('Email already exists')) {
                errorMessage = 'This email is already registered. Please use a different email or login.';
                showFieldError('email', 'Email already exists');
            } else if (error.message.includes('Username already taken')) {
                errorMessage = 'This username is already taken. Please choose a different username.';
                showFieldError('username', 'Username already taken');
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Connection error. Please check your internet and try again.';
            } else if (Array.isArray(error.message)) {
                // Handle validation errors from backend
                errorMessage = error.message.join(', ');
            } else {
                errorMessage = error.message;
            }
        }

        showAlert(errorMessage, 'error');
    }
}

/**
 * Toggle password visibility
 */
function togglePasswordVisibility(inputId, buttonElement) {
    const input = document.getElementById(inputId);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    
    // Update icon
    const eyeIcon = buttonElement.querySelector('.eye-icon');
    if (type === 'text') {
        eyeIcon.innerHTML = '<path d="M10 4C5 4 1.73 7.11 1 10c.73 2.89 4 6 9 6s8.27-3.11 9-6c-.73-2.89-4-6-9-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/><path d="M1 1l18 18" stroke="currentColor" stroke-width="2"/>';
    } else {
        eyeIcon.innerHTML = '<path d="M10 4C5 4 1.73 7.11 1 10c.73 2.89 4 6 9 6s8.27-3.11 9-6c-.73-2.89-4-6-9-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>';
    }
}

/**
 * Setup input listeners
 */
function setupInputListeners() {
    // Clear errors on input
    [firstNameInput, lastNameInput, usernameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                if (input.classList.contains('input-error')) {
                    clearFieldError(input.id);
                }
            });
        }
    });

    // Password strength on input
    passwordInput.addEventListener('input', () => {
        updatePasswordStrength(passwordInput.value);
    });

    // Clear terms error when checked
    termsCheckbox.addEventListener('change', () => {
        if (termsCheckbox.checked) {
            clearFieldError('terms');
        }
    });
}

/**
 * Initialize page
 */
function init() {
    // Set up event listeners
    registerForm.addEventListener('submit', handleRegister);
    
    togglePasswordBtn.addEventListener('click', () => {
        togglePasswordVisibility('password', togglePasswordBtn);
    });
    
    toggleConfirmPasswordBtn.addEventListener('click', () => {
        togglePasswordVisibility('confirmPassword', toggleConfirmPasswordBtn);
    });

    setupInputListeners();

    // Focus on first name input
    firstNameInput.focus();

    // Check if coming from login page
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('redirect') === 'login') {
        showAlert('Please create an account to continue', 'error');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}