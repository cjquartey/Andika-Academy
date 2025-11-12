const Comment = require('../models/Comment');
const Writing = require('../models/Writing');
const User = require('../models/User');

const createComment = async (req, res) => {
    try{
        const writing = await Writing.findById(req.params.writingId);

        if (!writing){
            return res.status(404).json({
                success: false,
                message: 'Writing not found'
            });
        }

        const author = req.user.id;
        const content = req.body.content;

        const commentData = {
            author,
            writing: writing._id,
            content
        };

        if (req.body.parentComment){
            const parentComment = await Comment.findById(req.body.parentComment);
            if (!parentComment){
                return res.status(404).json({
                    success: false,
                    message: 'Parent comment not found'
                });
            }
            if (parentComment.writing.toString() !== writing._id.toString()){
                return res.status(400).json({
                    success: false,
                    message: 'Parent comment does not belong to this writing'
                });
            }
            commentData.parentComment = req.body.parentComment;
        }

        if (req.body.rating){
            const currentAverageRating = writing.averageRating;
            const currentCount = writing.ratingCount;
            const newRating = req.body.rating;
            const newCount = currentCount + 1;
            const newAverage = ((currentAverageRating * currentCount) + newRating) / newCount;

            commentData.rating = newRating;
            writing.averageRating = newAverage;
            writing.ratingCount = newCount;
            await writing.save();
        }

        const newComment = await Comment.create(commentData);
        return res.status(201).json({
            success: true,
            data: newComment 
        });
    } catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const getCommentsByWriting = async (req, res) => {
    try{
        const comments = await Comment.find({
            writing: req.params.writingId,
            status: 'approved'
        })
        .populate('author', 'username profilePictureURL')
        .sort({createdAt: -1});

        return res.status(200).json({
            success: true,
            count: comments.length,
            data: comments
        })
    } catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const getComment = async(req, res) => {
    try{
        const comment = req.comment;

        return res.status(200).json({
            success: true,
            data: comment
        });
    } catch(error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const updateComment = async (req, res) => {
    try{
        const {content} = req.body;
        const comment = req.comment;
        const writing = await Writing.findById(comment.writing);

        if (!writing){
            return res.status(404).json({
                success: false,
                message: 'Writing not found'
            });
        }

        if(content) comment.content = content;

        // Update rating
        if (req.body.rating){
            const newRating = req.body.rating;
            const currentAverageRating = writing.averageRating;
            const count = writing.ratingCount;

            if (comment.rating){
                const oldRating = comment.rating;
                const newAverage = ((currentAverageRating * count) - oldRating + newRating) / count;
                writing.averageRating = newAverage;
            } else{
                const newAverage = ((currentAverageRating * count) + newRating) / (count + 1);
                writing.averageRating = newAverage;
                writing.ratingCount += 1;
            }

            comment.rating = newRating;
            await writing.save();
        }
        await comment.save();

        return res.status(200).json({
            success: true,
            data: comment
        })
    } catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const deleteComment = async (req, res) => {
    try{
        const comment = req.comment;

        const writing = await Writing.findById(comment.writing);

        // Update rating
        if (comment.rating){
            const currentAverageRating = writing.averageRating;
            const count = writing.ratingCount;
            const oldRating = comment.rating;
            let newAverage = currentAverageRating
            if (oldRating && count > 1){
                newAverage = ((currentAverageRating * count) - oldRating) / (count - 1);
            } else if (oldRating && count === 1){
                newAverage = 0;
            }
            writing.averageRating = newAverage;
            writing.ratingCount -= 1;
        }

        await writing.save();

        await Comment.deleteOne({_id: comment._id});
        await Comment.deleteMany({parentComment: comment._id});

        return res.status(200).json({
            success: true,
            message: 'Comment and its replies successfully deleted'
        })
    } catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const moderateComment = async (req, res) => {
    try{
        if (req.user.role !== 'admin'){
            return res.status(403).json({
                success: false,
                message: 'Only admins can moderate content'
            });
        }

        const comment = await Comment.findById(req.params.id);

        if (!comment){
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        comment.status = req.body.status;
        await comment.save();

        return res.status(200).json({
            success: true,
            message: 'Comment status changed',
            data: comment
        })
    } catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

module.exports = {
    createComment,
    getCommentsByWriting,
    getComment,
    updateComment,
    deleteComment,
    moderateComment
}