const express = require("express");

const tourController = require("./../controllers/tourController");
const router = express.Router();
const authController = require('./../controllers/authController')
const reviewRouter = require('./../routes/reviewRoutes')
const {restrictTo} = require("../controllers/authController");


// here it goes to two middle wares alias then getAll which is brilliant

router.use("/:tourId/reviews",reviewRouter) // now when we are in the tour router we can actually call  the review router
// so now we can access the review router from more than one place we have
// /reviews and /tours/tourId/reviews  and when we get the review router we start from / which I mean whatever is
// after /reviews or "/:tourId/reviews" they are the same now so if I say GET url/api/v1/reviews or GET url/api/v1/tours/:tourId/reviews
// will get the reviews any ways as they were the same route but it in the first you pass the tourID in the body but
// in the second one you pass it in the url itself and we manage to access this param because of the merge param prop in express.router

router.route("/top-5-cheap").get(tourController.aliasTopTours, tourController.getAllTours); //this route method is an anther way to get to your url
router.route("/tours-within/:distance/center/:latlng/unit/:unit").get(tourController.getToursWithin); // this a new way not using query string which we usually do when we have alot of params
// / tours-distance?distance=233&center=-48,49&units=34

// /tours-distance/323/center/-32,32/unit/mi // looks much better and this the stander



router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);
router.route("/tour-stats").get(authController.protect,restrictTo('admin'),tourController.getTourStats);

router.route("/monthly-plan/:year")
    .get(authController.protect,
        authController.restrictTo("admin", "lead-guide",'guide'),
        tourController.getMonthlyPlan);

router.get("/", tourController.getAllTours);

router.get("/:id", tourController.getTour);

router.post("/", authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.createTour);

router.patch("/:id",authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour);

router.delete("/:id", authController.protect,
    authController.restrictTo("admin","lead-guide"),
    tourController.deleteTour);

// router.route('/:tourId/reviews')
//     .post(authController.protect,authController
//         .restrictTo("user"),reviewController.createReview);

module.exports = router;