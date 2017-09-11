"use strict"
var express = require('express');
var bcrypt = require('bcryptjs');
var async = require('async');
var joi = require('joi');
var authHelper = require('./authHelper');
var config = require('../config');
var ObjectId = require('mongodb').ObjectID;

var router = express.Router();
module.exports = router;

//Post User
router.post('/',function postUser(req,res,next){
    var schema = {
        displayName : joi.string().min(3).max(50).required(),
        email : joi.string().email().min(7).max(50).required(),
        password : joi.string().regex(/^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{7,15}$/).required()
    };
    joi.validate(req.body,schema,function(err,value){
        if (err){
            console.log(err);
            return next(new Error('Invalid field: display name 3 to 50 alphanumeric,valid email,password 7 to 15(one number,one special character)'),err);
            
        }
            
        //return next(err);    
        req.db.collection.findOne({type:'USER_TYPE',
                                        email:req.body.email
        },function(err,doc){
            if (err)
                return next(err);
            if (doc)
                return next(new Error('Email Account Alerady Registered'));
            var xferUser = {
                type : 'USER_TYPE',
                displayName : req.body.displayName,
                email : req.body.email,
                passwordHash : null,
                date : Date.now(),
                completed : false,
                settings : {
                    requireWIFI : true,
                    enableAlerts : false
                },
                newsFilters : [{
                    name : 'Technology Companies',
                    keywords : ['Apple','Microsoft','IBM','Amazon','Google','Intel'],
                    enableAlert : false,
                    alertFrequency : 0,
                    enableAutoDelete : false,
                    deleteTime : 0,
                    timeofLastScan :0,
                    newsStories : []
                }],
                savedStories : []
            };
            bcrypt.hash(req.body.password,10,function getHash(err,hash){
                if (err)
                    return next(err);
                xferUser.passwordHash = hash;
                req.db.collection.insertOne(xferUser,function createUser(err,result){
                    if (err){
                        console.log(err);
                        return next(err);
                }
                    req.node2.send({msg:'Refresh Stories',doc:result.ops[0]});
                    res.status(201).json(result.ops[0]);
                });
            });
        });     
        
    });
});

//Delete /api/users/:id

router.delete ('./id',authHelper.checkAuth,function(req,res,next){
    if (req.params.id != req.auth.userId)
        return next(new Error('Invalid request for account deletion'));
    req.db.collection.findOneAndDelete({type : 'USER_TYPE',
    _id : objectId(req.auth.userId)
},
function (err,result){
    if (err){
        console.log("+++Contention Error?+++ err:",err);
        return next(err);
    }
    else if (result.ok != 1){
        console.log("+++Contention Error?+++result:",result);
        return next(new Error('Account Deletion Failure'));
    }
    res.status(200).json({msg:"User Deleted"});
}
);
});


//Get /api/user/:id

router.get('/:id',authHelper.checkAuth,function(req,res,next){
    if (req.params.id != req.auth.userId){
        return next(new Error('Invalid request for account fetch'));
    }
    req.db.collection.findOne({type:'USER_TYPE',
    _id : ObjectId(req.auth.userId)
},
function(err,doc){
    if (err){
        return next(err);
    }
    var xferProfile = {
        email : doc.email,
        displayName : doc.displayName,
        date : doc.date,
        settings : doc.settings,
        newsFilters : doc.newsFilters,
        savedStories : doc.savedStories
    };
res.header("Cache-Control","no-cache","no-store","must-revalidate");
res.header("pragma","no-cache");
res.header("Expires",0);
res.status(200).json(xferProfile);
});
});

//PUT/api/uesrs/:id
router.put('/:id',authHelper.checkAuth,function(req,res,next){
    if (req.params.id != req.auth.userId)
        return next(new Error('Invalid request for account deletion'));
    if (req.body.newsFilters.length > config.MAX_FILTERS )
        return next(new Error("Too many News Filters"));
    for (var i=0;i<req.body.newsFilters.length;i++){
        if ("keyWords" in req.body.newsFilters[i] && req.body.newsFilters[i].keywords[0] != ""){
        for (var j=0;j<req.body.newsFilters[i].keywords.length;j++){
           req.body.newsFilters[i].keywords[j] = req.body.newsFilters[i].trim(); 
        }

        }
    }
    var schema = {
        name : joi.string().min(1).max(30).regex(/^[-_a-zA-Z0-9]+$/).required(),
        keywords : joi.array.max(10).items(joi.string().max(20)).required(),
        alertFrequency : joi.number.min(0),
        enableAutoDelete : joi.boolean(),
        deleteTime : joi.date(),
        timeofLastScan : joi.date(),
        newsStories : joi.array(),
        keywordsStr : joi.string().min(1).max(100)
    };
    async.eachSeries(req.body.newsFilters,function (filter,innercallback){
        joi.validate(filter,schema,function(err,value){
            innercallback(err)
        });
    },function(err){
            if (err){
                return next(err);
            }
            else {
                req.db.collection.findOneAndUpdate({
                    type : 'USER_TYPE',
                    _id : objectId(req.auth.userId)
                },
                {$set : {settings : {
                    requireWIFI : req.body.requireWIFI,
                    enableAlerts : req.body.enableAlerts
                },
                newsFilters : req.body.newsFilters
            }},
            {returnOriginal : false},
            function(err,result){
                if (err){
                    console.log("+++CONTENTION ERROR?+++err:",err);
                    return next(err);
                }
                else if (result.ok != 1){
                    console.log("+++CONTENTION ERROR?+++result: "+result);
                    return next(new Error("User Put Failed"));
                }
                req.node2.send({msg : 'REFRESH_STORIES',doc:result.value});
                res.status(200).json(result.value);
            }
            );
            }
        });
   
});

//POST /api/users/:id/SavedStories
router.post('/:id/savedstories',authHelper.checkAuth,function(req,res,next){
    if (req.params.id != req.auth.userId)
        return next(new Error("Invalid Request for Saving Story"));
    var schema = {
        contentSnippet : joi.string().max(200).required(),
        date : joi.date().required(),
        hours : joi.string.max(20),
        imageUrl : joi.string.max(300).required(),
        keep : joi.boolean().required(),
        link : joi.string().max(300).required(),
        source : joi.string().max(50).required(),
        storyID : joi.string().max(100).required(),
        title : joi.string().max(200).required()
    };
    joi.validate(req.body,schema,function(err,value){
        if (err){
            return next(err);
        }
        req.db.collection.findOneAndUpdate({type : 'USER_TYPE',_id:objectId(req.auth.userId),$where:'this.savedStories.length<29'},
        {$addToSet: {savedStories : req.body}},
        {returnOriginal : true},
        function (err,result){
            if (result.value == null){
                return next(new Error('Over The Save Limit,or story already saved'));
            }
            else if (err){
                console.log("+++CONTENION ERROR?+++err: ",err);
                return next(err);
            }
            else if (result.ok != 1){
                console.log("+++CONTENTION ERROR?+++result: ",result);
                return next(new Error("Story Saving failed"));
            }
            res.status(200).json(result.value);
        }
    );
    });
});

//Delete stories
router.delete('/:id/savedstories/:sid',authHelper.checkAuth,function(req,res,next){
    if (req.params.id != req.auth.userId)
        return next(new Error("Invalid request for Deletion of saved story"));
    req.db.collection.findOneAndUpdate({type:'USER_TYPE',_id:objectId(req.auth.userId)},
    {$pull:{savedStories:{storyID:req.params.sid}}},
    {returnOriginal : true},
    function (err,result){
        if (err){
            console.log("+++CONTENTION ERROR?+++err",err);
            return next(err);
        }
        else if(result.ok!=1){
            console.log("+++CONTENTION ERROR?+++result",result);
            return next(new Error('story delete failure'));
        }
        res.status(200).json(result.value);
    }
);
});