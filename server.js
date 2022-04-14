/*
CSC3916 HW2
File: Server.js
Description: Web API scaffolding for Movie API
 */

let express = require('express');
let bodyParser = require('body-parser');
let passport = require('passport');
let authJwtController = require('./auth_jwt');
let jwt = require('jsonwebtoken');
let cors = require('cors');
let User = require('./db/Users');
let Movie = require('./db/Movies');
let Review = require('./db/Reviews')
const mongoose = require("mongoose");
let ObjectId = mongoose.Types.ObjectId;

let app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(passport.initialize());

let router = express.Router();

const getArrayAvg = arr => arr.reduce((a,b) => a + b, 0) / arr.length

function getJSONObjectForMovieRequirement(req) {
    let json = {
        status: 200,
        headers: "No headers",
        env: process.env.UNIQUE_KEY,
        query: "No query",
    };

    if (req.query != null) {
        json.query = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

/***********************************************************************************************************************
 * User routing for registering new users and signing in users to receive a JWT token
 **********************************************************************************************************************/
router.get('/', function (req, res) {            let o = getJSONObjectForMovieRequirement(req);
    o.message = "Connection test";
    o.success = true;
    res.json(o);
});


router.post('/signup', function (req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        let user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        user.save(function (err) {
            if (err) {
                if (err.code === 11000)
                    return res.json({success: false, message: "A user with that username already exists."});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        })
    }
});

router.post('/signin', function (req, res) {
    let userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({username: userNew.username}).select('name username password').exec(function (err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function (isMatch) {
            if (isMatch) {
                let userToken = {id: user.id, username: user.username};
                let token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true, token: 'JWT ' + token});
            } else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        });
    });
});


/***********************************************************************************************************************
 * Movie routing that supports authentication and CRUD operations to a storage interface.
 * *ALL CRUD Operations require JWT Authentication
 **********************************************************************************************************************/
router.route('/movies')
    .post(authJwtController.isAuthenticated, function (req, res) { // Create
        console.log("PST| ", req.body);
        res = res.status(200);

        // create new movie from request body
        let newMovie = new Movie();
        newMovie.title = req.body.title;
        newMovie.year = req.body.year;
        newMovie.genre = req.body.genre;
        newMovie.actors = req.body.actors;

        // Save the movie to mongoDB
        newMovie.save(function (err) {
            if (err) {
                return res.json(err);
            }

            let o = getJSONObjectForMovieRequirement(req);
            o.message = "Movie saved successfully";
            o.success = true;
            res.json(o);
        });
    })
    .get(authJwtController.isAuthenticated, function (req, res) { // Retrieve
        console.log("GET| ", req.query);
        res = res.status(200);

        // Check if user has the reviews field
        if (!req.query.hasOwnProperty("reviews")) {
            console.log("Not getting reviews");
            Movie.find(req.query).select("title year genre actors").exec(function (err, movies) {
                if (err) {
                    res.send(err);
                }
                let o = getJSONObjectForMovieRequirement(req);
                o.message = "GET movies";
                o.data = movies;
                o.success = true;
                res.json(o);
            });
        } else {
            console.log("Getting reviews");
            // reviews is not null, so must check if it's true
            let movie = req.query;
            // movie.reviews = undefined;
            delete movie.reviews;
            if (movie.hasOwnProperty("_id")) {
                movie._id = new ObjectId(movie._id);
            }
            console.log(movie);
            Movie.aggregate([
                {
                    $match: movie
                },
                {
                    $lookup:
                        {
                            from: "reviews",
                            localField: "_id",
                            foreignField: "movieId",
                            as: "reviews"
                        }
                }]).exec(function (err, movies) {
                if (err) {
                    res.send(err);
                }

                for (let i = 0; i < movies.length; i++) {
                    movies[i].avgRating = movies[i].reviews.map(function (review) {
                    // movies[i].avgRating = getArrayAvg(movies[i].reviews.filter(function (review) {
                        return review.rating;
                    // }));
                });
                }
                console.log("Average rating: " + movies.toString());
                let o = getJSONObjectForMovieRequirement(req);
                o.message = "GET movies";
                o.data = movies;
                o.success = true;
                res.json(o);
            });
        }
    })
    .put(authJwtController.isAuthenticated, function (req, res) { // Update
        console.log("PUT|", req.body);
        res = res.status(200);

        // uses body "find" key for query filter and "update" for the update data
        Movie.findOneAndUpdate(req.body.find, {$set: req.body.update}).exec(function (err) {
            if (err) {
                res.send(err);
            }
            let o = getJSONObjectForMovieRequirement(req);
            o.message = "Movie updated";
            o.success = true;
            res.json(o);
        });
    })
    .delete(authJwtController.isAuthenticated, function (req, res) { // Delete
        console.log("DEL| ", req.body);
        res = res.status(200);

        // deletes single movie based off filter
        Movie.findOneAndDelete(req.body).exec(function (err) {
            if (err) {
                res.send(err);
            }
            let o = getJSONObjectForMovieRequirement(req);
            o.message = "Movie deleted";
            o.success = true;
            res.json(o);
        });
    });
/***********************************************************************************************************************
 * Review routing that supports authentication and CRUD operations to a storage interface.
 * *Retrieve Operation requires JWT Authentication
 **********************************************************************************************************************/

router.route('/reviews')
    .post(authJwtController.isAuthenticated, function (req, res) { // Create
        console.log("PST| ", req.body.movie);
        res = res.status(200);

        try {
            Movie.findOne(req.body.movie).select("_id").exec(function (err, movie) {
                if (err) {
                    res.send(err);
                }
                console.log("user| ", jwt.decode(req.Authorization, {complete: true}));
                let newReview = new Review();
                newReview.movieId = movie._id;
                newReview.username = "testuser";
                newReview.rating = req.body.review.rating;
                newReview.name = req.body.review.name;
                newReview.quote = req.body.review.quote;

                // Save the review to mongoDB
                let o = getJSONObjectForMovieRequirement(req);
                o.message = "POST new review for movie";
                if (movie != null) {
                    newReview.save(function (err) {
                        if (err) {
                            return res.json(err);
                        }
                        o.success = true;
                        res.json(o);
                    }); // create new review from request body
                } else {
                    o.status = 404;
                    o.success = false;
                    res.json(o);
                }
            });
        } catch (e) {
            res.send(e);
        }
    })
    .get(function (req, res) { // Retrieve
        console.log("GET| ", req.body);
        res = res.status(200);

        // search in DB using body as filter
        Review.aggregate([
            { $lookup:
                    {
                        from: "movies",
                        localField: "movieId",
                        foreignField: "_id",
                        as: "movie"
                    }
            },
            {$project:
                    {
                        "review.movie.actors": 0,
                        "review.movie.genre": 0
                    }
            }]).exec(function (err, reviews) {
            if (err) {
                res.send(err);
            }
            let o = getJSONObjectForMovieRequirement(req);
            o.message = "GET reviews";
            o.data = reviews;
            o.success = true;
            res.json(o);
        });

    });

/***********************************************************************************************************************
 ***********************************************************************************************************************/


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


