const API = {
    // Make a fetch request with default headers
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };

        // Add auth token if available
        const token = Auth.getToken();
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            // Handle authentication errors
            if (response.status === 401) {
                Auth.logout();
                throw new Error('Session expired. Please login again.');
            }

            // Handle other errors
            if (!response.ok && response.status !== 201) {
                throw new Error(data.message || 'Something went wrong');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // GET request
    async get(endpoint) {
        return this.request(endpoint, {
            method: 'GET'
        });
    },

    // POST request
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT request
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // PATCH request
    async patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    },

    // Upload file (FormData)
    async upload(endpoint, formData) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const token = Auth.getToken();

        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Upload failed');
            }

            return data;
        } catch (error) {
            console.error('Upload Error:', error);
            throw error;
        }
    }
};

// API Endpoints organized by resource
const Endpoints = {
    // Authentication
    auth: {
        login: () => '/auth/login',
        register: () => '/auth/register',
        me: () => '/auth/me'
    },

    // Writings
    writings: {
        list: (query = '') => `/writings${query}`,
        single: (id) => `/writings/${id}`,
        create: () => '/writings',
        update: (id) => `/writings/${id}`,
        delete: (id) => `/writings/${id}`,
        publish: (id) => `/writings/${id}/publish`,
        byUser: (userId) => `/writings/user/${userId}`
    },

    // Comments
    comments: {
        byWriting: (writingId) => `/comments/writing/${writingId}`,
        create: (writingId) => `/comments/writing/${writingId}`,
        single: (id) => `/comments/${id}`,
        update: (id) => `/comments/${id}`,
        delete: (id) => `/comments/${id}`,
        moderate: (id) => `/comments/${id}/moderate`
    },

    // Bookmarks
    bookmarks: {
        list: () => '/bookmarks',
        add: (writingId) => `/bookmarks/${writingId}`,
        remove: (writingId) => `/bookmarks/${writingId}`
    },

    // Subscriptions
    subscriptions: {
        plans: () => '/subscriptions/plans',
        initialize: () => '/subscriptions/initialize',
        activateFree: () => '/subscriptions/activate-free',
        history: () => '/subscriptions/history',
        cancel: () => '/subscriptions/cancel'
    }
};