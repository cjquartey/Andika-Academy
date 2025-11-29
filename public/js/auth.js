const Auth = {
    // Store authentication token
    setToken(token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
    },

    // Get authentication token
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    },

    // Remove authentication token
    removeToken() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
    },

    // Store user data
    setUser(userData) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    },

    // Get stored user data
    getUser() {
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        return userData ? JSON.parse(userData) : null;
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    },

    // Check if user has premium subscription
    isPremium() {
        const user = this.getUser();
        return user && user.subscriptionTier === 'premium';
    },

    // Check if user is admin
    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    // Fetch and update current user data
    async refreshUser() {
        if (!this.isAuthenticated()) {
            return null;
        }

        try {
            const response = await API.get('/auth/me');
            if (response.success) {
                this.setUser(response.user);
                return response.user;
            }
            return null;
        } catch (error) {
            console.error('Failed to refresh user data:', error);
            return null;
        }
    },

    // Logout user
    logout() {
        this.removeToken();
        window.location.href = '/views/login.html';
    },

    // Redirect to login if not authenticated
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/views/login.html';
            return false;
        }
        return true;
    },

    // Redirect to dashboard if already authenticated
    requireGuest() {
        if (this.isAuthenticated()) {
            const user = this.getUser();
            if (user && user.role === 'admin') {
                window.location.href = '/views/admin/dashboard.html';
            } else {
                window.location.href = '/views/dashboard.html';
            }
            return false;
        }
        return true;
    },

    // Get authorization header
    getAuthHeader() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};