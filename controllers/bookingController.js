const Tour = require("./../models/tourModel");
const catchAsync = require("./../utils/catchAsync");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Booking= require("./../models/bookingModel")
const factory = require('./handlerFactory')



exports.getCheckoutSession = catchAsync(async (req,res,next)=>{

    //1 get the currently booked tour
    const  tour= await Tour.findById(req.params.tourId);

    //create checkout session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        success_url: `${req.protocol}://${req.get('host')}/?tour=${tour.id}&user=${req.user.id}&price=${tour.price}`, // in case if the payment success
        cancel_url:`${req.protocol}://${req.get('host')}/tour/${tour.slug}`, // in case the user canceling the image
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        line_items: [{
            name: `${tour.name} Tour`,
            description: tour.summary,
            amount: tour.price * 100, //because it will be in cent
            currency: 'usd',
            quantity: 1


        }]


    })
    //create session as response
    res.status(200).json({
        status: 'success',
        session
    })



})


exports.createBookingCheckout = catchAsync(async (req,res,next)=>{
    //this only temp
    const {tour,user,price} = req.query;
    if(!tour&&!user&&!price) return next();
    await Booking.create({tour,user,price});
    // we do this not just call next because we don't want to pass the query string to the url to make the app more secure
   res.redirect(req.originalUrl.split('?')[0]);

})

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.UpdateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);


