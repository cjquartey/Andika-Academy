const Bookmark = require('../models/Bookmark');
const Writing = require('../models/Writing');

const addBookmark = async (req, res) => {
    try{
        const userId = req.user.id;
        const writingId = req.params.writingId;

        const writing = await Writing.findById(writingId);
        
        if (!writing){
            return res.status(404).json({
                success: false,
                message: 'Writing not found'
            });
        }

        // Attempt to create a bookmark - duplicate entries are handled by the database
        const newBookmark = await Bookmark.create({user: userId, writing:writingId});

        res.status(201).json({
            success: true,
            message: 'New bookmark created!',
            data: newBookmark
        });
    } catch(error){
        if (error.code === 11000){
            return res.status(409).json({
                success: false,
                message: 'Writing already bookmarked'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const removeBookmark = async (req, res) => {
    try{
        const userId = req.user.id;
        const writingId = req.params.writingId;

        const writing = await Writing.findById(writingId);
        
        if (!writing){
            return res.status(404).json({
                success: false,
                message: 'Writing not found'
            });
        }

        const result = await Bookmark.deleteOne({user: userId, writing: writingId});

        if (result.deletedCount === 0){
            return res.status(404).json({
                success: false,
                message: 'Bookmark not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Bookmark removed'
        })
    } catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getUserBookmarks = async (req, res) => {
    try{
        const userId = req.user.id;

        const bookmarks = await Bookmark.find({user: userId}).populate({
            path: 'writing',
            select: 'title excerpt coverImageURL category averageRating author',
            populate: {
                path: 'author',
                select: 'username profilePictureURL'
            }
        }).sort({createdAt: -1});

        res.status(200).json({
            success: true,
            count: bookmarks.length,
            data: bookmarks
        });
    } catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    addBookmark,
    removeBookmark,
    getUserBookmarks
}