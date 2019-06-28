var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var webpush = require('web-push');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var recipesRouter = require('./routes/recipes');

var cors = require('cors');

//fireBase
var firebase = require('firebase-admin');
require("firebase/auth");
var serviceAccount = require("C:/Users/abdul/Downloads/koch-pwa-db-firebase-adminsdk-endg9-7134d2a134.json");

//initialize Firebase
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: "https://koch-pwa-db.firebaseio.com"
});
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({credentials: true, origin: true}));
app.options('*', cors());


app.use('/', indexRouter);
app.use('/users', usersRouter);
// app.use('/recipes', recipesRouter);
// app.use('/poste-dein-rezept', indexRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    console.log("catch404");
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


//Admin access
var db = firebase.database();
// var ref = db.ref("embedded/recipes");
// ref.once("value", function (snapshot) {
//     console.log("Database: ",snapshot.val());
// });

var setDataToDb = function (req,res) {
    console.log("------DB:Write Data from setDataToDB");
    console.log("------DB:Request-Body-Data: ", req);
    db.ref('embedded/recipes').push(req)
        .then(() => {
            return db.ref("embedded/subscriptions").once("value")
                .then(subscriptions => {
                    console.log(">>>>>>>>>>>>1");
                    subscriptions.forEach(sub => {
                        console.log(">>>>>>>>>>>>2");
                        const pushSubscription = sub.val();
                        const payload = 'Here is a payload!';

                        const options = {
                            gcmAPIKey: 'AAAAJWmuXTc:APA91bGztAb-zyy1C6bwdP6yRFw6ANzcpiKJ-KPmW1fsixgiFEScfB9o8xppsboEpcFeX12RpohKcTu4i2V7sX1uYwQq_0pqne0ZZF-hpKSybZroXQleQTNwPxwQgI3zxYe38I4TXPKj',
                            TTL: 60,
                            // TODO 4.3b - add VAPID details
                        }
                        webpush.sendNotification(
                            pushSubscription,
                            payload,
                            options
                        )
                            .catch(err => {
                                console.log(err);
                                res.status(500).send(err);
                            })
                    });
                    console.log(">>>>>>>>>>>>3")
                    res.status(201).json({message: "Data stored", status: "created"});
                })
                .catch((error) => {
                    console.log(error);
                    res.status(500).send(error);
                })
        });
}


var getDataFromDb = function (res) {
    db.ref('embedded/recipes').once('value')
        .then((data)=> {
            console.log("------DB:Got Data: ", data.val());
            const recipes = [];
            const obj = data.val();
            for(let key in obj){
                recipes.push({
                    id: key,
                    name: obj[key].name,
                    title: obj[key].title,
                    imageURL: obj[key].imageURL,
                    description: obj[key].description,
                    ingredients: obj[key].ingredients,
                    creatorId: obj[key].creatorId
                });
            };
            console.log(recipes);
            res.status(200).json({recipes});
        })
        .catch((error) => {
            res.status(500).send(error);
        })
};
var setUserToDB = function (req, res, next) {
    let user;
    console.log("------setUserToDB");
    console.log("------RequestBody:", req.email, req.password);
    firebase.auth().createUser({
        email: req.email,
        password: req.password
    })
        .then(
            user => {
                const newUser = {
                    id: user.uid,
                    email: req.email,
                    password:req.password,
                    registeredRecipes: []
                };
                res.status(201).json({newUser});
            })
        .catch((error) => {
            res.status(500).send(error);
            console.log(error);
        });
};

var setSubscriptionToDB = function (req, res) {
    console.log("------DB:Write Data from setSubscriptionToDB");
    console.log("------DB:Request-Body-Data: ", req);
    db.ref('embedded/subscriptions').push(req)
        .then((data) => {
            res.status(201).json({data, status: "created"})
        })
        .catch((error) => {
            res.status(500).send(error);
        })
};


// ----------Post-Endpoint-------------------------------------------------------
// indexRouter.post('/post-own-recipe', function(req, res, next) {
//     // console.log('response', res);
//     console.log('request', req.body);
//     setDataToDb(req.body,res);
// });
//
// indexRouter.get('/post-own-recipe', function(req, res, next) {
//     // console.log('response', res);
//     console.log('request', req.body);
//     getDataFromDb();
// });
//
// //-------------Zutaten-Endpoint-------------------------------------------------
// indexRouter.get('/ingredients', function(req, res, next) {
//     // console.log('response', res);
//     console.log('request', req.body);
//     getDataFromDb();
// });
// indexRouter.post('/ingredients', function(req, res, next) {
//     // console.log('response', res);
//     console.log('request', req.body);
//     setDataToDb();
// });
// //-------------Kategorien-Endpoint-------------------------------------------------
// indexRouter.get('/categories', function(req, res, next) {
//     // console.log('response', res);
//     console.log('request', req.body);
//     getDataFromDb();
// });
// indexRouter.get('/categories/:id', function(req, res, next) {
//     // console.log('response', res);
//     console.log('request', req.body);
//     getDataFromDb();
// });

indexRouter.get('/api/recipes', function(req, res, next) {
    console.log('------Server: Recipes-GET-Endpoint received Request');
    getDataFromDb(res);
});

indexRouter.post('/api/createrecipe', function(req, res, next) {
    console.log('-------Server: Recipes-POST-Endpoint received Request');
    console.log('-------request', req.body);
    setDataToDb(req.body,res);
});

indexRouter.post('/api/signup', function(req, res, next) {
    console.log('-------Server: Signup-POST-Endpoint received Request');
    console.log('-------request', req.body);
    setUserToDB(req.body,res);
});

indexRouter.post('/api/create-subscription', function(req, res, next) {
    console.log('-------Server: Recipes-POST-Endpoint received Request');
    console.log('-------request', req.body);
    setSubscriptionToDB(req.body, res);
});

app.getDataFromDb = getDataFromDb;

module.exports = app;


