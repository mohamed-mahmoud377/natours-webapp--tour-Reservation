const express = require("express");

const tourController = require("./../controllers/tourController");
const authController = require('./../controllers/authController')
const reviewController =require('./../controllers/reviewController')
const {restrictTo} = require("../controllers/authController");

const router = express.Router({mergeParams:true});
router.use(authController.protect)
//GET /tour/234sdf/reviews that will actually trigger these function but how? because we first hit the tour router because of /tours in
// the first and in the tour router we say when get a route with /tour/:tourId/reviews .. go to the review router and we use router.use()
// to be for all http methods but we are going to have a problem that here we do not have access to the tourId
// so here comes this advanced express feature which mergeParams so all router will have access to the tourId params
router.get('/',reviewController.getAllReview);

router.post('/',authController.protect,
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview);

router.route('/:id').delete(restrictTo('user','admin'),reviewController.deleteReview)
    .patch(restrictTo('user','admin'),reviewController.updateReview)
    .get(reviewController.getReview)



module.exports = router