const Writing = require('../models/Writing');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Bookmark = require('../models/Bookmark');

const createWriting = async (req, res) => {
    try{
        const {title, category, content, description, tags, accessLevel, coverImageURL} = req.body;
        const author = req.user.id;

        // Create an exerpt for each writing based on the length of the content
        const excerptLength = Math.min(Math.floor(0.1 * content.length), 500);
        const excerpt = content.substring(0, excerptLength) + '...';

        // Save the new writing to the database
        const newWriting = await Writing.create({
            title,
            author,
            category,
            content,
            description,
            excerpt,
            tags,
            accessLevel,
            coverImageURL,
            'status': 'draft' // All new writings have a 'draft' status
        });

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
    try{
        const writing = await Writing.findById(req.params.id)
            .populate('author', 'username firstName lastName profilePictureURL bio');
        if (!writing) {
            return res.status(404).json({
                success: false,
                message: 'Writing not found'
            });
        }

        const userId = req.user?.id;
        const userSubscriptionTier = req.user?.subscriptionTier;

        let canAccessFull = false;

        if (writing.status === 'draft'){
            if (userId === writing.author.toString()) canAccessFull = true;
        } else if(writing.accessLevel === 'free'){
            canAccessFull = true;
        } else if(writing.accessLevel === 'premium'){
            if (userSubscriptionTier === 'premium') canAccessFull = true;
        }

        if (canAccessFull){
            writing.viewCount += 1;
            await writing.save();

            return res.status(200).json({
                success: true,
                data: writing
            });
        } else{
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
    } catch(error){
        res.status(500).json({
            success:false,
            message: error.message
        });
    }
};
const updateWriting = async (req, res) => {
    try{
        const writing = req.writing;

        const {title, category, content, description, tags, accessLevel, coverImageURL} = req.body;

        if (title) writing.title = title;
        if (category) writing.category = category;
        if (content) {
            writing.content = content;
            const excerptLength = Math.min(Math.floor(0.1 * content.length), 500);
            const excerpt = content.substring(0, excerptLength) + '...';
            writing.excerpt = excerpt;
        }
        if (description) writing.description = description;
        if (tags) writing.tags = tags;
        if (accessLevel) writing.accessLevel = accessLevel;
        if (coverImageURL) writing.coverImageURL = coverImageURL;

        await writing.save();

        return res.status(200).json({
            success: true,
            message: 'Writing updated',
            data: writing
        })
    } catch(error){
        res.status(500).json({
            success:false,
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

module.exports = {
    createWriting,
    getAllWritings,
    getWritingById,
    updateWriting,
    deleteWriting,
    publishWriting,
    getWritingsByUser
}