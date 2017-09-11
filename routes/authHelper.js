"use strict"
var jwt = require('jwt-simple');
var config = require('../config');
module.exports.checkAuth = function(req,res,next){
    if (req.headers['x-auth']){
        try{
            req.auth = jwt.decode(req.headers['x-auth'],config.JWT_SECERET);
            if (req.auth && req.auth.authorized && req.auth.userId && req.auth.sessionIP === req.ip && req.auth.sessionUA === req.headers['user-agent']){
              return next();  
            }
            else{
                return next(new Error('user is not logged in'));
            }
        }catch(err){
            return next(err);
        }
    }else{
        return next(new Error('User is not logged in'));
    }
};