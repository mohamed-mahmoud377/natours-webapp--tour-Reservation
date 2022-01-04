const mongoose = require("mongoose");
const slugify = require("slugify");
const validator = require("validator");
const User = require('./userModel');
const catchAsync = require("./../utils/catchAsync");

const tourScheme = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "A tour must have a name "],
        unique: true,
        trim: true,
        maxlength: [40, "A tour name must have less or equal then 40 characters"],
        minlength: [8, "A tour name must have more or equal then 8 characters"],
        // not working because isAlpha return false if it there was a space
        // validate:{
        //     message:"Tour name must only contain charter",
        //     validator: validator.isAlpha  // this really cool cause you know what you just put the func name and it is going to be called
        // }
    },
    slug: {
        type: String
    },
    duration: {
        type: Number,
        required: [true, "A duration is required "]
    },
    maxGroupSize: {
        type: Number,
        required: [true, "A group size is required"]
    },
    difficulty: {
        type: String,
        trim: true,
        required: [true, "A difficulty string is required "],
        enum: { // let set just some certain  words only for string
            values: ["easy", "difficult", "medium"],
            message: "difficulty is either : easy, medium, difficult"
        }

    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, "Rating must be above 1.0"],  // works for dates too
        max: [5, "Rating must be below 5 "],
        // will run every time a value is set for this field
        set: val =>Math.round(val *10) /10 // if we have 4.6666 and then just round it, it will we 5 but if we say 4.666 *10
            // will be 47 then 47/10 will be 4.7 which is really smart :D


    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },


    price: {
        type: Number,
        required: [true, "A tour must have a price"]
    },
    priceDiscount: {
        type: Number,
        // we use regular func because we want to access this is you do not  want you can use arrow func
        validate: {
            message: "Discount price {VALUE} must be below price", // brilliant
            validator: function (val) {  // val is the value of priceDiscount that user entered
                // this will not work when you work with update I mean using this keyword
                return val < this.price;
            }
        }
    },
    summary: {
        type: String,
        trim: true,
        required: [true, "summary must be there"]
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, "a tour must have a cover image"]
    }, images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: {
        //geoJson
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    guides: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"

        }
    ]


}, {
    toJSON: { // to see the virtual fields when fetching as JSON we have to set this to set this to true
        virtuals: true
    },
    toObject: { //same as above
        virtuals: true
    },

});

tourScheme.index({price: 1, ratingsAverage: -1});
tourScheme.index({slug: 1});
tourScheme.index({startLocation: "2dsphere"})



tourScheme.virtual("durationWeeks").get(function () { // virtual is way of creating a field of the doc on the fly so
    //it  is not stored physically in the database but created when it is fetched
    return this.duration / 7;
});


//Virtual populate :to access the reviews that belong to a tour when you actually did not sture the ID of the review in the tour itself because it can grow for ever
tourScheme.virtual('reviews', {
    ref: 'Review', // name of the model you have your ref in bymeans the ID
    foreignField: 'tour',
    localField: '_id'
});

/**/


// docs middlewares or hooks

//function will trigger before any save of any doc happens            // before save() and create() func
tourScheme.pre("save", function (next) {// always use function to be able to use this keyword which is really important
    // console.log(this);

    this.slug = slugify(this.name, {lower: true});
    next();

});

// this code was for embedding the users into tours but we are not going  with this approach
// tourScheme.pre('save', async function (next) {
//
//         // this is a short syntax function so it really is return await User.finById(id)
//         const guidesPromises = this.guides.map(  id => { User.findById(id)}); // this now is an async function which is really
//         // console.log(guidesPromises);
//         // just going to return a promise in each loop so the guidesPromises is just an array of Promises which we will have to await too
//         this.guides = await Promise.all(guidesPromises);
//
// });


// we can call save a hook ( a pre save hook )
// it no longer has this keyword but instead we have the finished doc in the func
tourScheme.post("save", function (doc, next) { // this will execute after all the other middlewares finishes not just the save


    next(); // you do not really have to put it here because, this is the last middleware, but it is  the best practice to do so
});


//query middleware

// this regular expression is quit amazing it makes this fun execute for all the func that have find in it findOne() findAndUpdate() ... which is so cool
tourScheme.pre(/^find/, function (next) {     // note this  here you dd not have access to doc itself no you have access to the query
    this.find({secretTour: {$ne: true}});  // now secret tours will be excluded
    // this can be really helpfull when you do not want the user to find some docs or when you what to show some docs
    // you can really do anything to the query whatever you want

    next();
});

tourScheme.pre(/^find/, function (next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    });
    next();
});


// has all the returned docs from the query
tourScheme.post(/^find/, function (docs, next) {
    next();
});


//AGGREGATION middleware

// I commented this code because the geoNear stage has to be the first one in the aggregation so this will not make it work

// tourScheme.pre("aggregate", function (next) { // in this you get access to the aggregation object
//     this.pipeline().unshift({$match: {secretTour: {$ne: true}}});  // the array we use in aggregation is inside of pipeline func
//     // and the unshift adds an object in as the first of the array
//     next();
// });


const Tour = mongoose.model("Tour", tourScheme);

module.exports = Tour;