const Writing = require('../models/Writing');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Bookmark = require('../models/Bookmark');

const createWriting = async (req, res) => {
    try{
        const {title, category, content, stanzas, dialogues, description, tags, accessLevel, coverImageURL} = req.body;
        const author = req.user.id;

        // Create excerpt based on category
        let excerpt = '';
        if (category === 'prose' && content) {
            const excerptLength = Math.min(Math.floor(0.1 * content.length), 500);
            excerpt = content.substring(0, excerptLength) + '...';
        } else if (category === 'poetry' && stanzas && stanzas.length > 0) {
            // Use first stanza for excerpt
            excerpt = stanzas[0].lines.join('\n');
        } else if (category === 'drama' && dialogues && dialogues.length > 0) {
            // Use first few dialogues for excerpt
            excerpt = dialogues.slice(0, 3).map(d => `${d.speaker}: ${d.text}`).join('\n');
        }

        // Prepare writing data based on category
        const writingData = {
            title,
            author,
            category,
            description,
            excerpt,
            tags,
            accessLevel,
            coverImageURL,
            status: 'draft'
        };

        // Add category-specific content
        if (category === 'prose') {
            writingData.content = content;
        } else if (category === 'poetry') {
            writingData.stanzas = stanzas;
        } else if (category === 'drama') {
            writingData.dialogues = dialogues;
        }

        // Save the new writing to the database
        const newWriting = await Writing.create(writingData);

        return res.status(201).json({
            success: true,
            message: `${title} created successfully!`,
            data: newWriting
        });
    } catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updateWriting = async (req, res) => {
    try {
        const {id} = req.params;
        const userId = req.user.id;
        const {title, category, content, stanzas, dialogues, description, tags, accessLevel, coverImageURL} = req.body;

        // Find the writing
        const writing = await Writing.findById(id);

        if (!writing) {
            return res.status(404).json({
                success: false,
                message: 'Writing not found'
            });
        }

        // Check if user is the author
        if (writing.author.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this writing'
            });
        }

        // Prepare update data
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (tags !== undefined) updateData.tags = tags;
        if (accessLevel !== undefined) updateData.accessLevel = accessLevel;
        if (coverImageURL !== undefined) updateData.coverImageURL = coverImageURL;

        // Handle category-specific content
        if (category !== undefined) {
            updateData.category = category;
            
            if (category === 'prose' && content !== undefined) {
                updateData.content = content;
                // Clear other category fields
                updateData.stanzas = undefined;
                updateData.dialogues = undefined;
                
                // Update excerpt
                const excerptLength = Math.min(Math.floor(0.1 * content.length), 500);
                updateData.excerpt = content.substring(0, excerptLength) + '...';
            } else if (category === 'poetry' && stanzas !== undefined) {
                updateData.stanzas = stanzas;
                // Clear other category fields
                updateData.content = undefined;
                updateData.dialogues = undefined;
                
                // Update excerpt
                if (stanzas.length > 0) {
                    updateData.excerpt = stanzas[0].lines.join('\n');
                }
            } else if (category === 'drama' && dialogues !== undefined) {
                updateData.dialogues = dialogues;
                // Clear other category fields
                updateData.content = undefined;
                updateData.stanzas = undefined;
                
                // Update excerpt
                if (dialogues.length > 0) {
                    updateData.excerpt = dialogues.slice(0, 3).map(d => `${d.speaker}: ${d.text}`).join('\n');
                }
            }
        } else {
            // Category not changing, just update the content for existing category
            if (writing.category === 'prose' && content !== undefined) {
                updateData.content = content;
                const excerptLength = Math.min(Math.floor(0.1 * content.length), 500);
                updateData.excerpt = content.substring(0, excerptLength) + '...';
            } else if (writing.category === 'poetry' && stanzas !== undefined) {
                updateData.stanzas = stanzas;
                if (stanzas.length > 0) {
                    updateData.excerpt = stanzas[0].lines.join('\n');
                }
            } else if (writing.category === 'drama' && dialogues !== undefined) {
                updateData.dialogues = dialogues;
                if (dialogues.length > 0) {
                    updateData.excerpt = dialogues.slice(0, 3).map(d => `${d.speaker}: ${d.text}`).join('\n');
                }
            }
        }

        // Update the writing
        const updatedWriting = await Writing.findByIdAndUpdate(
            id,
            updateData,
            {new: true, runValidators: true}
        );

        return res.status(200).json({
            success: true,
            message: 'Writing updated successfully',
            data: updatedWriting
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getAllWritings = async (req, res) => {
    try{
        const queryObject = {status: 'published'};

        // If URL is /api/writings?category=poetry
        if (req.query.category){
            queryObject.category = req.query.category;
        }

        // If URL is /api/writings?tags=romance
        if (req.query.tags){
            queryObject.tags = {$in: [req.query.tags]};
        }

        // If URL is /api/writings?search=love
        if (req.query.search){
            queryObject.$text = {$search: req.query.search};
        }

        // Handle pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Get writings
        const writings = await Writing.find(queryObject)
            .populate('author', 'username firstName lastName profilePictureURL')
            .skip(skip)
            .limit(limit)
            .sort({publishedAt: -1});
        
        const total = await Writing.countDocuments(queryObject);

        return res.status(200).json({
            success: true,
            count: writings.length,
            total: total,
            pages: Math.ceil(total / limit),
            currentPage: page,
            data: writings
        });
    } catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getWritingById = async (req, res) => {
    try {
        const id = req.params.id;
        const writing = await Writing.findById(id)
            .populate('author', 'username firstName lastName profilePictureURL bio');
        
        if (!writing) {
            return res.status(404).json({
                success: false,
                message: 'Writing not found'
            });
        }

        // Get user authentication from header (works without middleware)
        let userSubscriptionTier = null;
        let userSubscriptionStatus = null;
        let userId = null;
        
        const authHeader = req.headers['authorization'];
        if (authHeader?.startsWith("Bearer ")) {
            try {
                const jwt = require('jsonwebtoken');
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                
                if (decoded.userId) {
                    // Fetch fresh user data from database
                    const currentUser = await User.findById(decoded.userId)
                        .select('subscriptionTier subscriptionStatus accountStatus');
                    
                    if (currentUser && currentUser.accountStatus === 'active') {
                        userId = decoded.userId;
                        userSubscriptionTier = currentUser.subscriptionTier;
                        userSubscriptionStatus = currentUser.subscriptionStatus;
                    }
                }
            } catch (err) {
                // Invalid or expired token - continue as unauthenticated user
                console.log('Auth error (non-fatal):', err.message);
            }
        }
        
        let canAccessFull = false;
        
        // Check access permissions
        if (writing.status === 'draft') {
            // Only author can access drafts
            if (userId && userId === writing.author._id.toString()) {
                canAccessFull = true;
            }
        } else if (writing.accessLevel === 'free') {
            // Everyone can access free content
            canAccessFull = true;
        } else if (writing.accessLevel === 'premium') {
            // Check if user has active premium subscription
            if (userSubscriptionTier === 'premium' && 
                (userSubscriptionStatus === 'active' || !userSubscriptionStatus)) {
                canAccessFull = true;
            }
            
            // Author can always access their own content
            if (userId && userId === writing.author._id.toString()) {
                canAccessFull = true;
            }
        }

        // Increment view count only if user has full access
        if (canAccessFull) {
            writing.viewCount += 1;
            await writing.save();

            return res.status(200).json({
                success: true,
                data: writing
            });
        } else {
            // Return limited preview for premium content
            return res.status(200).json({
                success: true,
                data: {
                    ...writing.toObject(),
                    content: writing.excerpt || writing.content.substring(0, 150) + '...',
                    isPremium: true,
                    requiresSubscription: true
                }
            });
        }
    } catch (error) {
        console.error('Error in getWritingById:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const deleteWriting = async (req, res) => {
    try{
        const writing = req.writing;
        const writingId = writing._id;

        await Writing.findByIdAndDelete(writingId);
        await Comment.deleteMany({writing: writingId});
        await Bookmark.deleteMany({writing: writingId});

        return res.status(200).json({
            success: true,
            message: 'Writing successfully deleted'
        });
    }catch(error){
        res.status(500).json({
            success:false,
            message: error.message
        });
    }
};
const publishWriting = async (req, res) => {
    try{
        const writing = req.writing;

        if(writing.status === 'published'){
            return res.status(400).json({
                success: false,
                message: 'Writing is already published'
            });
        }

        const user = await User.findById(req.user.id);
        if(user.subscriptionTier === 'basic'){
            const currentMonth = new Date().getMonth();
            const lastReset = new Date(user.lastPublicationReset).getMonth();

            if (currentMonth !== lastReset){
                user.monthlyPublications = 0;
                user.lastPublicationReset = new Date();
            }

            if (user.monthlyPublications >= 5){
                return res.status(403).json({
                    message: 'Monthly publication limit reached! Upgrade to premium for unlimited publications' 
                })
            }
        }

        // Publish the writing
        writing.status = 'published';
        writing.publishedAt = new Date();
        await writing.save();

        // Update user's publication count
        user.monthlyPublications += 1;
        await user.save();

        return res.status(200).json({
            success: true,
            message: `${writing.title} is now published!`,
            data: writing
        });
    }catch(error){
        res.status(500).json({
            success:false,
            message: error.message
        });
    }
};
const getWritingsByUser = async (req, res) => {
    try{
        const userId = req.params.userId;
        const requestingUserId = req.user?.id;

        const queryObject = {author: userId};

        // Only show published works if the user isn't viewing their own profile
        if (userId !== requestingUserId) queryObject.status = 'published';

        const writings = await Writing.find(queryObject).sort({createdAt: -1});

        return res.status(200).json({
            success: true,
            data: writings
        });
    }catch(error){
        res.status(500).json({
            success:false,
            message: error.message
        });
    }
};
const uploadCoverImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const imageUrl = `/public/uploads/covers/${req.file.filename}`;

        return res.status(200).json({
            success: true,
            imageUrl: imageUrl,
            message: 'Cover image uploaded successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
module.exports = {
    createWriting,
    getAllWritings,
    getWritingById,
    updateWriting,
    deleteWriting,
    publishWriting,
    getWritingsByUser,
    uploadCoverImage
}