const express = require("express");

const tourController = require("./../controllers/tourController");
const authController = require('./../controllers/authController');
const bookingController = require('./../controllers/bookingController');
const {restrictTo} = require("../controllers/authController");

const router = express();

router.use(authController.protect);

router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

router.use(authController.restrictTo('admin', 'lead-guide'));

router.route('/').get(bookingController.getAllBookings)
    .post(bookingController.createBooking);

router.route('/:id').get(bookingController.getBooking)
    .patch(bookingController.updateBooking)
    .delete(bookingController.deleteBooking);

module.exports = router;