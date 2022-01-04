const Review = require('./../models/reviewModel');
const catchAsync = require('./../utils/catchAsync');
const APIFeatures = require('./../utils/APIFeatures');
const factory = require('./handlerFactory')


exports.setTourUserIds = (req,res,next)=>{
    //Allow nested routes as in POST /tours/23423/review/ so the ID of the tour will not be in the body it will be in the params
    if (!req.body.tour) req.body.tour = req.params.tourId;  // if we didn't put the tour Id in the body so it has to be in the ;lkajsdflll;adklll
    if (!req.body.user) req.body.user = req.user.id;
    next();
}


exports.getAllReview = factory.getAll(Review)

exports.getReview = factory.getOne(Review)
exports.createReview = factory.createOne(Review);

exports.deleteReview = factory.deleteOne(Review);

exports.updateReview = factory.UpdateOne(Review);