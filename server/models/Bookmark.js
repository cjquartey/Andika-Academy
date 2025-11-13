const mongoose = require('mongoose');
const {Schema} = mongoose;

const bookmarkSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId, 
        ref: 'User',
        required: [true, 'User is required']
    },
    writing: {
        type: Schema.Types.ObjectId,
        ref: 'Writing',
        required: [true, 'Writing is required']
    }
}, {
    timestamps: true
});

bookmarkSchema.index({user: 1, writing: 1}, {unique: true});
module.exports = mongoose.model('Bookmark', bookmarkSchema);