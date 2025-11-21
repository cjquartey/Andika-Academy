Auth.requireAuth();
const currentUser = Auth.getUser();

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

function showAlert(message, type = 'success') {
    alertContainerEl.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => alertContainerEl.innerHTML = '', 5000);
}

async function loadProfile() {
    try {
        const response = await API.get('/auth/me');
        
        if (response.success && response.user) {
            const user = response.user;
            
            profileNameEl.textContent = `${user.firstName} ${user.lastName}`;
            profileEmailEl.textContent = user.email;
            subscriptionBadgeEl.textContent = user.subscriptionTier || 'Basic';
            
            if (user.profilePictureURL) {
                avatarEl.innerHTML = `<img src="${user.profilePictureURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            } else {
                avatarEl.textContent = user.firstName.charAt(0).toUpperCase();
            }
            
            firstNameEl.value = user.firstName || '';
            lastNameEl.value = user.lastName || '';
            usernameEl.value = user.username || '';
            emailEl.value = user.email || '';
            bioEl.value = user.bio || '';
            profilePictureURLEl.value = user.profilePictureURL || '';
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        showAlert('Failed to load profile', 'error');
    }
}

async function loadStats() {
    try {
        const response = await API.get(`/writings/user/${currentUser.id}`);
        
        if (response.success && response.data) {
            const writings = response.data;
            const published = writings.filter(w => w.status === 'published');
            
            statStoriesEl.textContent = published.length;
            
            const totalViews = published.reduce((sum, w) => sum + (w.viewCount || 0), 0);
            statViewsEl.textContent = totalViews.toLocaleString();
            
            const rated = published.filter(w => w.ratingCount > 0);
            if (rated.length > 0) {
                const avgRating = rated.reduce((sum, w) => sum + w.averageRating, 0) / rated.length;
                statRatingEl.textContent = avgRating.toFixed(1);
            }
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        firstName: firstNameEl.value.trim(),
        lastName: lastNameEl.value.trim(),
        bio: bioEl.value.trim(),
        profilePictureURL: profilePictureURLEl.value.trim()
    };
    
    try {
        const response = await API.put('/auth/profile', data);
        
        if (response.success) {
            showAlert('Profile updated successfully!', 'success');
            
            const updatedUser = { ...currentUser, ...data };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            loadProfile();
        }
    } catch (error) {
        showAlert(error.message || 'Failed to update profile', 'error');
    }
});

passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
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

loadProfile();
loadStats();