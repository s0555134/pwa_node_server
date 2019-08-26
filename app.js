var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var webpush = require('web-push');
var history = require('connect-history-api-fallback');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var recipesRouter = require('./routes/recipes');

var cors = require('cors');

//fireBase
var firebase = require('firebase-admin');
require("firebase/auth");
var serviceAccount = require("C:/Users/abdul/Downloads/koch-pwa-db-firebase-adminsdk-endg9-19de5d3dc8.json");

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

//Handle 404 request to Home
app.use(history());

//Admin-SDK firebase access
var db = firebase.database();

var updateDataToDB = function (req, res) {
    console.log("------DB:Update Data from updateDataToDB");
    console.log("------DB:Request-Body-Data: ", req.body);
    db.ref('embedded/recipes').child(req.params.id).update(req.body)
        .then(() => {
            res.status(201).json({data: req.body, id: req.params.id, status: "created"});
        })
        .catch((error) => {
            sendErrorToClient(res, error);
        })
};
var setDataToDb = function (req,res) {
    console.log("------DB:Write Data from setDataToDB");
    console.log("------DB:Request-Body-Data: ", req);
    let key;
    db.ref('embedded/recipes').push({
        title: req.title,
        description: req.description,
        ingredients: req.ingredients,
        preparation: req.preparation,
        category: req.category,
        creatorId: req.creatorId
    })
        .then((data) => {
            key = data.key;
            return sendWebNotificationToSubs(res)
        })
        .then(() => {
            res.status(201).json({ data: req, key: key, status: "created" });
        })
        .catch((error) => {
            sendErrorToClient(res, error);
        })
};

var getDataFromDb = function (res) {
    db.ref('embedded/recipes').once('value')
        .then((data) => {
            console.log("------------------DB:Got Data: ");
            return loadRecipes(data);
        })
        .then( (recipes) => {
            res.status(200).json({recipes});
        })
        .catch((error) => {
            sendErrorToClient(res, error);
        })
};

var removeDataFromDB = function (req, res, next) {
    console.log("------DB:Write Data from removeDataFromDB");
    console.log("------DB:Request-Body-Data: ", req.body);
    console.log("------DB:ID: ", req.params.id);
    db.ref('embedded/recipes/' + req.params.id).remove()
        .then((key) => {
            console.log(key)
            res.status(200).json({message: "Content deleted", key: req.params.id });
        })
        .catch((error) => {
            sendErrorToClient(res, error);
        })
};

var setUserToDB = function (req, res, next) {
    let user;
    console.log("------setUserToDB");
    console.log("------RequestBody:", req);
    firebase.auth().createUser({
        displayName: req.displayName,
        email: req.email,
        password: req.password
    })
        .then(user => {
            const newUser = {
                displayName: req.displayName,
                id: user.uid,
                email: req.email,
                password:req.password,
                registeredRecipes: []
            };
            res.status(201).json({newUser});
        })
        .catch((error) => {
            sendErrorToClient(res, error);
        })
};





var setSubscriptionToDB = function (req, res) {
    console.log("------DB:Write Data from setSubscriptionToDB");
    console.log("------DB:Request-Body-Data: ", req);
    db.ref('embedded/subscriptions').push(req)
        .then((data) => {
            res.status(201).json({data, status: "created"})
        })
        .catch((error) => {
            sendErrorToClient(res, error);
        })
};

var sendWebNotificationToSubs = function(res) {
    return db.ref("embedded/subscriptions").once("value")
        .then(subscriptions => {
            subscriptions.forEach(sub => {
                const pushSubscription = sub.val();
                const payload = {
                    title: "New recipe",
                    content: "Check out the new recipe!"
                };
                const options = {
                    gcmAPIKey: 'AAAAJWmuXTc:APA91bGztAb-zyy1C6bwdP6yRFw6ANzcpiKJ-KPmW1fsixgiFEScfB9o8xppsboEpcFeX12RpohKcTu4i2V7sX1uYwQq_0pqne0ZZF-hpKSybZroXQleQTNwPxwQgI3zxYe38I4TXPKj',
                    TTL: 60,
                };
                webpush.sendNotification(
                    pushSubscription,
                    JSON.stringify({
                        title: payload.title,
                        content: payload.content
                    }),
                    options
                )
                    .catch(error => {
                        sendErrorToClient(res, error)
                    })
            });
        })
};

var loadRecipes = function(data) {
    const recipes = [];
    const dbValue = data.val();
    for(let index in dbValue){
        recipes.push({
            id: index,
            title: dbValue[index].title,
            imageURL: dbValue[index].imageURL,
            description: dbValue[index].description,
            ingredients: dbValue[index].ingredients,
            preparation: dbValue[index].preparation,
            category: dbValue[index].category,
            creatorId: dbValue[index].creatorId
        });
    };
    return recipes;
};

function sendErrorToClient(res, error){
    console.log("SendErrorToClient: ",error);
    res.status(500).json({error: error});
}

indexRouter.get('/api/recipes', function(req, res, next) {
    console.log('------Server: Recipes-GET-Endpoint received Request');
    getDataFromDb(res);
});

indexRouter.post('/api/createrecipe', function(req, res, next) {
    console.log('-------Server: Recipes-POST-Endpoint received Request');
    setDataToDb(req.body,res);
});

indexRouter.post('/api/signup', function(req, res, next) {
    console.log('-------Server: Signup-POST-Endpoint received Request');
    setUserToDB(req.body,res);
});

indexRouter.post('/api/create-subscription', function(req, res, next) {
    console.log('-------Server: Create-Subscription-POST-Endpoint received Request');
    setSubscriptionToDB(req.body, res);
});

indexRouter.put('/api/recipes/:id', function(req, res, next) {
    console.log('-------Server: Recipes-PUT-Endpoint received Requestee');
    updateDataToDB(req, res);
});

indexRouter.delete('/api/recipes/:id', function (req, res, next) {
    console.log('-------Server: Recipes-Remove-Endpoint received Requestee');
    removeDataFromDB(req, res);
});

app.getDataFromDb = getDataFromDb;

module.exports = app;


