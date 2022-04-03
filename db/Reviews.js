let mongoose = require('mongoose');
let Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

try {
    mongoose.connect( `${process.env.DB}`, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("Reviews collection connected"));
}catch (error) {
    console.log("Reviews collection could not connect");
}

// review schema
let ReviewSchema = new Schema({
    movieId: { type: String, required: true },
    username: { type: String, required: true },
    rating: { type: Number, required: true },
    name: String,
    quote: String
});

// indexing by title and year
ReviewSchema.index({movie: 1, username: 1},{unique: true})

//return the model to server
module.exports = mongoose.model('Review', ReviewSchema);