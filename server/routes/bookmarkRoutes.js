const express = require('express')
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const bookmarkController = require('../controllers/bookmarkController');
const bookmarkMiddleware = require('../middleware/bookmarkMiddleware');

// Add a bookmark
router.post('/:writingId', 
    authMiddleware.verifyToken,
    bookmarkMiddleware.validateWritingId,
    bookmarkController.addBookmark
);

// Remove a bookmark
router.delete('/:writingId',
    authMiddleware.verifyToken,
    bookmarkMiddleware.validateWritingId,
    bookmarkController.removeBookmark
);

// Get all bookmarks
router.get('/',
    authMiddleware.verifyToken,
    bookmarkController.getUserBookmarks
);

module.exports = router;