require('dotenv').config();
const PORT = process.env.PORT || 5000;
const connectDB = require('./server/config/database');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const app = express();
const authRoutes = require('./server/routes/authRoutes');
const writingRoutes = require('./server/routes/writingRoutes');
const commentRoutes = require('./server/routes/commentRoutes');
const bookmarkRoutes = require('./server/routes/bookmarkRoutes');
const subscriptionRoutes = require('./server/routes/subscriptionRoutes');
const adminRoutes = require('./server/routes/adminRoutes');

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for frontend
}));

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve static files from views directory
app.use('/views', express.static(path.join(__dirname, 'views')));

app.use('/api/auth', authRoutes);
app.use('/api/writings', writingRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

// Root route - serve homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Catch-all route for HTML pages
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const validPages = [
        'login', 'register', 'writings', 'writing-view', 
        'dashboard', 'writing-editor', 'my-writings',
        'bookmarks', 'profile', 'subscription',
        'admin-dashboard', 'admin-users', 
        'admin-transactions', 'admin-disputes'
    ];
    
    if (validPages.includes(page)) {
        res.sendFile(path.join(__dirname, 'views', `${page}.html`));
    } else {
        res.status(404).send('Page not found');
    }
});

app.get('/admin/:page', (req, res) => {
    const page = req.params.page;
    const adminPages = ['dashboard', 'users', 'transactions', 'disputes'];
    
    if (adminPages.includes(page)) {
        res.sendFile(path.join(__dirname, 'views', 'admin', `${page}.html`));
    } else {
        res.status(404).send('Page not found');
    }
});

const startServer = async () => {
    try{
        await connectDB();
        app.listen(PORT, () => {console.log(`Server running on port ${PORT}...`)});
    }catch(error){
        console.log(`Failed to start server, ${error.message}`);
        process.exit(1);
    }
};

startServer();