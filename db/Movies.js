let mongoose = require('mongoose');
let Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

try {
    mongoose.connect( `${process.env.DB}`, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("Movie collection connected"));
}catch (error) {
    console.log("Movie collection could not connect");
}

// movie schema
let MovieSchema = new Schema({
    title: { type: String, required: true },
    year: Number,
    genre: String,
    actors: [{actorName: String, characterName: String}],
    imageURL: String,
    avgRating: Number,
});

// indexing by title and year
MovieSchema.index({title: 1, year: -1},{unique: true})

//return the model to server
module.exports = mongoose.model('Movie', MovieSchema);