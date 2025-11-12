const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const commentMiddleware = require('../middleware/commentMiddleware');
const authorizationMiddleware = require('../middleware/authorizationMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/writing/:writingId',
    authMiddleware.verifyToken,
    commentMiddleware.validateCreateComment,
    commentController.createComment
);
router.get('/writing/:writingId', commentController.getCommentsByWriting);
router.get('/:id', commentController.getComment);
router.put('/:id',
    authMiddleware.verifyToken,
    commentMiddleware.validateUpdateComment,
    authorizationMiddleware.isAuthorComment,
    commentController.updateComment
);
router.delete('/:id',
    authMiddleware.verifyToken,
    authorizationMiddleware.isAuthorComment,
    commentController.deleteComment
);
router.patch('/:id/moderate',
    authMiddleware.verifyToken,
    commentMiddleware.validateModerateComment,
    commentController.moderateComment
);

module.exports = router;