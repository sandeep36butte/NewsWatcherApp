"use strict"
var express = require('express');
var joi = require('joi');
var authHelper = require('./authHelper');
var config = require ('../config');
var objectId = require('mongodb').objectId;

var router = express.Router();
 module.exports = router;

 router.post('/',authHelper.checkAuth,function(req,res,next){
     var schema = {
         contentSnippet : joi.string().max(200).required(),
         date : joi.date().required(),
         hours : joi.string().max(20),
         imageUrl :joi.string().max(300).required(),
         keep : joi.boolean().required(),
         source : joi.string().max(50).required(),
         storyID : joi.string().max(100).required(),
         title : joi.string().max(200).required()
     };
     joi.validate(req.body,schema,function(err,value){
         if (err)
            return next(err);
         req.db.collection.count({
             type : 'SHAREDSTORY_TYPE',
         },function(err,count){
             if (err)
                return next(err);
             if (count > config.MAX_SHARED_STORIES)
                return next(new Error('shared story limit reached'));
             req.db.collection.count({
                 type:'SHAREDSTORY_TYPE',
                 _id : req.body.storyID
                },function(err,count){
                    if (err)
                        return next(err);
                    if (count > 0)
                        return next(new Error('The dtory has been already saved'));
                    var xferStory = {
                        _id : req.body.storyID,
                        type : 'SHAREDSTORY_TYPE',
                        story : req.body,
                        comments : [{
                            displayName : 'req.auth.displayName',
                            userId : req.auth.userId,
                            dateTime : Date.now(),
                            comment : req.auth.displayName + "Thought Everyone Might Enjoy This!"
                        }]
                    };
                    req.db.collection.insertOne(xferStory,function createUSer(err,result){
                        if (err)
                            return next(err);
                        res.status(201).json(result.ops[0]);
                    });
                });
         });
     });
 })

 //GET API SHARED NEWS
 router.get('/',authHelper.checkAuth,function(req,res,next){
     req.db.collection.find({
         type : 'SHAREDSTORY_TYPE',
     }).toArray(function(err,docs){
         if (err)
            return next(err);
         res.status(200).json(docs);
     });
 });

 //DELETE SHARED STORIES BY ID
 router.delete('/:sid',authHelper.checkAuth,function(req,res,next){
     req.db.collection.findOneAndDelete({
         type : 'SHAREDSTORY_TYPE',
         _id : req.params.sid
     },function(err,result){
         if (err){
             console.log("+++CONTENTION ERROR?+++err: ",err);
             return next(err);
         }
         else if (result.ok != 1){
             console.log("+++CONTENTION ERROR?+++result ",result);
             return next(new Error("Shared Story Deletion Failuer"));
         }
         res.status(200).json({msg :'Shared Story Deleted'});
     });
 });


 //Add Comments to Story
 router.post('/',authHelper.checkAuth,function(req,res,next){
     var schema = {
         comment : joi.string().max(250).required()
     };
     joi.validate(req.body,schema,function(err,value){
         if (err)
            return next(err);
         var xferComment = {
             displayName : req.auth.displayName,
             userId :req.auth.userId,
             dateTime : Date.now(),
             comment : req.body.comment.substring(0,250)
         };
         req.db.collection.findOneAndUpdate({
             type : 'SHAREDSTORY_TYPE',
             _id : req.params.sid,$where:'this.comments.length<29'
         },{$push:{comments:xferComment}},function(err,result){
             if (result.value == null){
                return next(new Error('comments limit reached'));
             }
             else if (err){
                 console.log("+++CONTENTION ERROR?+++err ",err);
                 return next(err);
             }
             else if (result.ok != 1){
                console.log("+++CONTENTION ERROR?+++result ",result);
                return next(new Error("Comments Save Failure"));
             }
                res.status(200).json({msg:"Comment Added"});
         });
     });
 });