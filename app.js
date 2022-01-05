const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const helmetcsp = require("helmet-csp");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const cookieParser = require('cookie-parser');
const nocache = require('nocache')
const cors = require('cors')
const compression = require('compression')

const viewRouter = require('./routes/viewRoutes')
AppError = require("./utils/appError");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController')

const globalErrorHandler = require("./controllers/errorContoller");


const app = express();

app.enable('trust proxy'); // to trust heroku proxy

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));


app.use(nocache())
app.use(helmet()); // put some really important headers
app.use(cors());
app.use(helmetcsp({
    useDefaults: true,
    directives: {
        defaultSrc: ["*"],

    },
    reportOnly: false,
}))
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));

}

const limiter = rateLimit({
    max: 100, // max 100 request
    windowMs: 60 * 60 * 1000, // in one hour
    message: "Too many requests"
});

app.use("/api", limiter); // put the limiter to our middlewares

// note this
//why is this route here it is right before express.json and that's because we here need the data in a raw format not in jason format
// so we had to do it before it and use express.raw instead
app.post('/webhook-checkout',express.raw({type:'application/json'}),bookingController.webhookCheckout);

app.use(express.json({
    limit: '20kb' // limiting the size of the body
}));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());



//Data sanitization against NoSQL query injection
app.use(mongoSanitize()); // while using mongo this maddleware  will remove and $ sign for example to do not let and bad query to slip int

//Data sanitization against XSS
// app.use(xss()); //removes any bad code that could be injected to our request

//prevent parameter pollution
app.use(hpp({
    whitelist: [  // allowed duplicated parameters
        'duration', // you can say duration=10&duration=lt5 for example so it can be duplicated
        'ratingsAverage', // but some fields need to be only one like sort and fields for example
        "ratingsQuantity", // because in them, you can define more than one thing like sort=price,duration
        'price', // if you duplicate it then it will an array and it won't work from the code you have written in the APIFeatures class
        'maxGroupSize',
        'difficulty'
    ]
}));


app.use(compression());

app.use((req,res,next)=>{
    res.set({
        'Content-Security-Policy': `default-src 'self' http: https:;block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data: blob:;object-src 'none';script-src 'self' https://api.mapbox.com https://cdn.jsdelivr.net 'unsafe-inline' 'unsafe-eval';script-src-elem https: http: ;script-src-attr 'self' https://api.mapbox.com https://cdn.jsdelivr.net 'unsafe-inline';style-src 'self' https://api.mapbox.com https://fonts.googleapis.com 'unsafe-inline';worker-src 'self' blob:`
    });
    next();
})


app.use('/', viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings',bookingRouter);


app.all("*", ((req, res, next) => {  // all stand for all http methods get put ...

    next(new AppError(`can't find ${req.originalUrl} on this server !`, 404));
}));

app.use(globalErrorHandler);


module.exports = app;
