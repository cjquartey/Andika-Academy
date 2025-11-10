const mongoose = require('mongoose');
const {Schema} = mongoose;

const writingSchema = new Schema({
    category: {type: String, enum: ['prose', 'poetry', 'drama'], required: [true, 'Category is required']},
    title: {type: String, required: [true, 'Title is required']},
    author: {type: Schema.Types.ObjectId, ref : 'User', required: [true, 'Author is required']},
    content: {type: String},
    description: {type: String, maxlength: [500, 'Description cannot exceed 500 characters']},
    excerpt: {type: String},
    accessLevel: {type: String, enum: ['free', 'premium'], default: 'free'},
    status: {type: String, enum: ['draft', 'published'], default: 'draft'},
    tags: {type: [String]},
    coverImageURL: {type: String},
    averageRating: {type: Number, default: 0},
    ratingCount: {type: Number, default: 0},
    viewCount: {type: Number, default: 0},
    publishedAt: {type: Date, default: null},
}, {
    timestamps: true
});
writingSchema.index({tags: 1});
writingSchema.index({author: 1, status: 1});
writingSchema.index({status: 1, category: 1});
writingSchema.index({status: 1, viewCount: 1});
writingSchema.index({status: 1, publishedAt: -1});
writingSchema.index({status: 1, averageRating: -1});
writingSchema.index({title: 'text', description: 'text', tags: 'text'});

module.exports = mongoose.model('Writing', writingSchema);