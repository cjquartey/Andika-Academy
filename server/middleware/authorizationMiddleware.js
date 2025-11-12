const Writing = require('../models/Writing');
const Comment = require('../models/Comment');

const isAuthorWriting = async(req, res, next) => {
    try{
        const writing = await Writing.findById(req.params.id)

        if (!writing){
            return res.status(404).json({
                success: false,
                message: 'Writing not found'
            });
        }
        
        if (writing.author.toString() !==  req.user.id){
            return res.status(403).json({
                success: false,
                message: 'Unauthorized! You are not the author of this work'
            });
        } 

        req.writing = writing;
        next();
    } catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const isAuthorComment = async(req, res, next) => {
    try{
        const comment = await Comment.findById(req.params.id)

        if (!comment){
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }
        
        if (comment.author.toString() !==  req.user.id){
            return res.status(403).json({
                success: false,
                message: 'Unauthorized! You are not the author of this comment'
            });
        } 

        req.comment = comment;
        next();
    } catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const isAdmin = async(req, res, next) => {
    // Will do later
}
module.exports = {
    isAuthorWriting,
    isAuthorComment,
    isAdmin
}