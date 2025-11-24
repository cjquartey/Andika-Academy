const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const writingController = require('../controllers/writingController');
const writingMiddleware = require('../middleware/writingMiddleware');
const authorizationMiddleware = require('../middleware/authorizationMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', writingController.getAllWritings);
router.post('/',
    authMiddleware.verifyToken,
    writingMiddleware.validateCreate,
    writingController.createWriting
);
router.post('/upload-cover',
    authMiddleware.verifyToken,
    upload.single('coverImage'),
    writingController.uploadCoverImage
);
router.get('/user/:userId', writingController.getWritingsByUser);
router.get('/:id', writingController.getWritingById);
router.put('/:id',
    authMiddleware.verifyToken,
    writingMiddleware.validateUpdate,
    authorizationMiddleware.isAuthorWriting,
    writingController.updateWriting
);
router.delete('/:id',
    authMiddleware.verifyToken,
    authorizationMiddleware.isAuthorWriting,
    writingController.deleteWriting
);
router.patch('/:id/publish',
    authMiddleware.verifyToken,
    authorizationMiddleware.isAuthorWriting,
    writingController.publishWriting
);
module.exports = router;