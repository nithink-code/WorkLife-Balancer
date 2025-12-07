const express = require("express");
const router = express.Router();
const {body, validationResult} = require("express-validator");
const User = require("../models/userModel");

// Ensure user is authenticated middleware
function ensureAuthenticated(req,res,next){
    if(req.isAuthenticated() && req.user){
        return next();
    }
    return res.status(401).json({message: "User not authenticated"});
}


// Validation for update
const updateValidation = [
    body('name').optional().isString().withMessage('Name must be a string'),
    body('email').optional().isString().withMessage('Email must be  a string')
];


// Update user profile
router.put("/",ensureAuthenticated,updateValidation,(req,res,next)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty())return res.status(400).json({errors: errors.array()});
    next();
},async(req,res)=>{
     try{
        const updates = req.body;
        const userId = req.user._id;
        const updatedUser = await User.findByIdAndUpdate(updates,userId,{new:true});
        if(!updatedUser)return res.status(404).json({message: "User not found"});
        res.json(updatedUser);
     }catch(err){
        res.status(500).json({message: "Server error"});
     }
});

// Delete User Account
router.delete("/",ensureAuthenticated,async(req,res)=>{
    try{
        const userId = req.user._id;
        const deletedUser = await User.findByIdAndDelete(userId);
        if(!deletedUser)return res.status(404).json({message: "User not found"});
        res.json({message: "User account deleted successfully"});
    }catch(err){
        res.status(500).json({message: "Server error"});
    }
});

module.exports = router;


