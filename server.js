/*
CSC3916 HW2
File: Server.js
Description: Web API scaffolding for Movie API
 */

let express = require('express');
// let http = require('http');
let bodyParser = require('body-parser');
let passport = require('passport');
// let authController = require('./auth');
let authJwtController = require('./auth_jwt');
let jwt = require('jsonwebtoken');
let cors = require('cors');
let User = require('./db/Users');
let Movie = require('./db/Movies');
let Review = require('/db/Reviews');

let app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(passport.initialize());

let router = express.Router();

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
        console.log("GET| ", req.body);
        res = res.status(200);

        // search in DB using body as filter
        Movie.find(req.body).select("title year genre actors").exec(function (err, movies) {
            if (err) {
                res.send(err);
            }
            let o = getJSONObjectForMovieRequirement(req);
            o.message = "GET movies";
            o.data = movies;
            o.success = true;
            res.json(o);
        });
    })
    .put(authJwtController.isAuthenticated, function (req, res) { // Update
        console.log("PUT|", req.body);
        res = res.status(200);

        // uses body "find" key for query filter and "update" for the update data
        Movie.findOneAndUpdate(req.body.find, {$set: req.body.update}).exec(function (err, movies) {
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
        Movie.findOneAndDelete(req.body).exec(function (err, movies) {
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
 * *ALL CR_D Operations require JWT Authentication
 **********************************************************************************************************************/

router.route('/reviews')
    .post(authJwtController.isAuthenticated, function (req, res) { // Create
        console.log("PST| ", req.body);
        res = res.status(200);

        Movie.findOne(req.body.movie).select("_id").exec(function (err, movie) {
            if (err) {
                res.send(err);
            }

            let newReview = new Review();
            // Save the review to mongoDB
            // newMovie.save(function (err) {
            //     if (err) {
            //         return res.json(err);
            //     }
            //
            //     o.message = "POST new review for movie";
            //     o.success = true;
            //     res.json(o);
            // });        // create new movie from request body


            let o = getJSONObjectForMovieRequirement(req);
            o.message = "Movie saved successfully";
            o.data = movie;
            o.success = true;
            res.json(o);
        });
    })
    .get(authJwtController.isAuthenticated, function (req, res) { // Retrieve
        console.log("GET| ", req.body);
        res = res.status(200);

        // search in DB using body as filter
        Movie.findOne(req.body.movie).select("_id").exec(function (err, movie) {
            if (err) {
                res.send(err);
            }


            let o = getJSONObjectForMovieRequirement(req);
            o.message = "Movie saved successfully";
            o.data = movie;
            o.success = true;
            res.json(o);
        });
    });

/***********************************************************************************************************************
 ***********************************************************************************************************************/


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


