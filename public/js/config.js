const CONFIG = {
    API_BASE_URL: 'http://localhost:5000/api',
    
    // App Information
    APP_NAME: 'Andika Academy',
    APP_TAGLINE: 'Where African Stories Come Alive',
    
    // Storage Keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'andika_auth_token',
        USER_DATA: 'andika_user_data',
        THEME: 'andika_theme'
    },
    
    // Pagination
    DEFAULT_PAGE_SIZE: 20,
    
    // File Upload
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    
    // Writing Limits
    BASIC_MONTHLY_LIMIT: 5,
    
    // Categories
    CATEGORIES: {
        prose: 'Prose',
        poetry: 'Poetry',
        drama: 'Drama'
    },
    
    // Subscription Plans
    PLANS: {
        basic: {
            name: 'Basic',
            price: 0,
            currency: 'GHS'
        },
        premium: {
            name: 'Premium',
            price: 30,
            currency: 'GHS'
        }
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);