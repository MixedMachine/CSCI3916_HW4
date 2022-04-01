let mongoose = require('mongoose');
let Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

try {
    mongoose.connect( `${process.env.DB}Movies`, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("connected"));
}catch (error) {
    console.log("could not connect");
}

// movie schema
let MovieSchema = new Schema({
    title: { type: String, required: true },
    year: Number,
    genre: String,
    actors: [{actorName: String, characterName: String}]
});

// indexing by title and year
MovieSchema.index({title: 1, year: -1},{unique: true})

//return the model to server
module.exports = mongoose.model('Movie', MovieSchema);