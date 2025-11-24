Auth.requireAuth();
const currentUser = Auth.getUser();

// Check if viewing another user's profile
const urlParams = new URLSearchParams(window.location.search);
const viewingUserId = urlParams.get('userId');
const isOwnProfile = !viewingUserId || (currentUser && viewingUserId === currentUser.id);

const profileNameEl = document.getElementById('profile-name');
const profileEmailEl = document.getElementById('profile-email');
const avatarEl = document.getElementById('avatar');
const subscriptionBadgeEl = document.getElementById('subscription-badge');
const statStoriesEl = document.getElementById('stat-stories');
const statViewsEl = document.getElementById('stat-views');
const statRatingEl = document.getElementById('stat-rating');
const statJoinedEl = document.getElementById('stat-joined');
const alertContainerEl = document.getElementById('alert-container');

const firstNameEl = document.getElementById('firstName');
const lastNameEl = document.getElementById('lastName');
const usernameEl = document.getElementById('username');
const emailEl = document.getElementById('email');
const bioEl = document.getElementById('bio');
const profilePictureURLEl = document.getElementById('profilePictureURL');

const profileForm = document.getElementById('profile-form');
const passwordForm = document.getElementById('password-form');

console.log('Profile form element:', profileForm);
console.log('Is own profile:', isOwnProfile);

function showAlert(message, type = 'success') {
    if (alertContainerEl) {
        alertContainerEl.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        setTimeout(() => alertContainerEl.innerHTML = '', 5000);
    }
}

async function loadProfile() {
    try {
        let response;
        let user;
        
        if (isOwnProfile) {
            response = await API.get('/auth/me');
            if (response.success && response.user) {
                user = response.user;
                
                if (firstNameEl) firstNameEl.value = user.firstName || '';
                if (lastNameEl) lastNameEl.value = user.lastName || '';
                if (usernameEl) usernameEl.value = user.username || '';
                if (emailEl) emailEl.value = user.email || '';
                if (bioEl) bioEl.value = user.bio || '';
                if (profilePictureURLEl) profilePictureURLEl.value = user.profilePictureURL || '';
            }
        } else {
            response = await API.get(`/auth/user/${viewingUserId}`);
            if (response.success && response.user) {
                user = response.user;
                
                if (profileForm) profileForm.style.display = 'none';
                const passwordSection = document.querySelector('.profile-section:last-of-type');
                if (passwordSection) passwordSection.style.display = 'none';
            }
        }
        
        if (user) {
            const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User';
            if (profileNameEl) profileNameEl.textContent = displayName;
            if (profileEmailEl) profileEmailEl.textContent = isOwnProfile ? user.email : `@${user.username}`;
            if (subscriptionBadgeEl) subscriptionBadgeEl.textContent = user.subscriptionTier || 'Basic';
            
            if (avatarEl) {
                if (user.profilePictureURL) {
                    avatarEl.innerHTML = `<img src="${user.profilePictureURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                } else {
                    const initial = (user.firstName || user.username || 'U').charAt(0).toUpperCase();
                    avatarEl.textContent = initial;
                }
            }
            
            if (user.createdAt && statJoinedEl) {
                const joinDate = new Date(user.createdAt);
                statJoinedEl.textContent = joinDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        showAlert('Failed to load profile', 'error');
    }
}

async function loadStats() {
    try {
        const userId = viewingUserId || currentUser.id;
        const response = await API.get(`/writings/user/${userId}`);
        
        if (response.success && response.data) {
            const writings = response.data;
            const published = writings.filter(w => w.status === 'published');
            
            if (statStoriesEl) statStoriesEl.textContent = published.length;
            
            const totalViews = published.reduce((sum, w) => sum + (w.viewCount || 0), 0);
            if (statViewsEl) statViewsEl.textContent = totalViews.toLocaleString();
            
            const rated = published.filter(w => w.ratingCount > 0);
            if (statRatingEl) {
                if (rated.length > 0) {
                    const avgRating = rated.reduce((sum, w) => sum + w.averageRating, 0) / rated.length;
                    statRatingEl.textContent = avgRating.toFixed(1);
                } else {
                    statRatingEl.textContent = '0.0';
                }
            }
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Profile form submission
if (profileForm) {
    console.log('Setting up profile form listener');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Profile form submitted!');
        
        const data = {
            firstName: firstNameEl?.value.trim(),
            lastName: lastNameEl?.value.trim(),
            bio: bioEl?.value.trim(),
            profilePictureURL: profilePictureURLEl?.value.trim()
        };
        
        console.log('Sending data:', data);
        
        try {
            const response = await API.put('/auth/profile', data);
            console.log('Response:', response);
            
            if (response.success) {
                showAlert('Profile updated successfully!', 'success');
                
                const updatedUser = { ...currentUser, ...data };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                
                await loadProfile();
            }
        } catch (error) {
            console.error('Profile update error:', error);
            showAlert(error.message || 'Failed to update profile', 'error');
        }
    });
} else {
    console.log('Profile form not found in DOM');
}

// Password form submission
if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword')?.value;
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        
        if (newPassword !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            showAlert('Password must be at least 8 characters', 'error');
            return;
        }
        
        try {
            const response = await API.put('/auth/password', {
                currentPassword,
                newPassword
            });
            
            if (response.success) {
                showAlert('Password updated successfully!', 'success');
                passwordForm.reset();
            }
        } catch (error) {
            showAlert(error.message || 'Failed to update password', 'error');
        }
    });
}

loadProfile();
loadStats();