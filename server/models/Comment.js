const mongoose = require('mongoose');
const {Schema} = mongoose;

const commentSchema = new Schema({
    author: {type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Author is required']},
    writing: {type: Schema.Types.ObjectId, ref: 'Writing', required: [true, 'Writing is required']},
    content: {
        type: String, 
        required: function() {
            return !this.rating;
        },
        trim: true, 
        maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    parentComment: {type: Schema.Types.ObjectId, ref: 'Comment'},
    rating: {type: Number, min: 1, max: 5},
    status: {type: String, enum: ['approved', 'flagged', 'deleted'], default: 'approved'}
}, {
    timestamps: true
});

commentSchema.index({author: 1});
commentSchema.index({writing: 1, createdAt: -1});
commentSchema.index({writing: 1, parentComment: 1});

module.exports = mongoose.model('Comment', commentSchema);