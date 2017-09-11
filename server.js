var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyparser = require('body-parser');
var cp = require('child_process');
var responseTime = require('response-time');
var helmet = require('helmet');
var RateLimit = require('express-rate-limit')
var config = require('./config');
var session = require('./routes/session');
var sharedNews = require('./routes/sharedNews');
var assert = require('assert');
var bcrypt = require('bcryptjs');
var jwt = require('jwt-simple');
var joi = require('joi');
var authHelper = require('./routes/authHelper');
var users = require('./routes/users');

var app = express();
app.enable('trust proxy');
var limiter = new RateLimit({
    windowMs : 15*60*1000,
    max : 1000,
    delayMs : 0
});
app.use(limiter);
app.use(helmet());
app.use(helmet.csp({
    directives : {
        defaultSrc : ["'self'"],
        scriptSrc : ["'self'","'unsafe-inline'",'ajax.googleapis.com','maxcdn.bootstrapcdn.com'],
        styleSrc : ["'self'","'unsafe-inline'",'maxcdn.bootstrapcdn.com'],
        fontSrc : ["'self'",'maxcdn.bootstrapcdn.com'],
        imgSrc : ['*']
    }
}));
app.use(responseTime());
app.use(logger('dev'));
app.use(bodyparser.json({limit:'100kb'}));
app.use(bodyparser.urlencoded({extended:false}));
app.use(express.static(path.join(__dirname,'static')));
app.use('/node_modules',  express.static(__dirname + '/node_modules'));

//ForkProcess
var node2 = cp.fork('worker/app_FORK.js');
//var node2 = cp.fork('worker/app_FORK.js',[],{execArgv:['--debug=5859']})

node2.on('exit',function(code){
    node2 = undefined;
    node2 = cp.fork('./worker/app_Fork.js',[],{execArgv:['--debug=5859']});
});

//MongoDb interface
var db = {};
var MongoClient = require('mongodb').MongoClient;
MongoClient.connect(config.MONGODB_CONNECT_URL,function(err,dbConn){
    assert.equal(null,err);
    db.dbConnection = dbConn;
    db.collection = dbConn.collection('newsWatcher');
    console.log("Connected to MOngoDb Server");
});

app.use(function(req,res,next){
    req.db = db;
    req.node2 = node2;
    next();
});

app.get('/',function(req,res){
    res.render('index.html');
    //res.render("Welcome you");
});

app.use('/api/users',users);
app.use('/api/sessions',session);
app.use('/api/sharednews',sharedNews); 

app.use(function(req,res,next){
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

if (app.get('env') === 'development'){
    app.use(function(err,req,res,next){
        res.status(err.status || 500).json({message:err.toString(),error:{}});
        console.log(err);
    });
}
 
app.use(function(err,req,res,next){
    res.status(err.status || 500).json({message:err.toString(),error:{}});
    console.log(err);
});

app.set('port',process.env.PORT || 3000);
var server = app.listen(app.get('port'),function(){
    console.log('Express server listening on port '+server.address().port);
});






