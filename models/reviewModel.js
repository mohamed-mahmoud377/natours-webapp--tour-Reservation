const mongoose = require('mongoose');
const Tour = require('./../models/tourModel');
const catchAsnc = require('./../utils/catchAsync')
const  clone = require('clone');


const reviewSchema = new mongoose.Schema({
        review: {
            type: String,
            required: [true, "Review is required field"],
            maxlength: [2000, "Review is too big"],
            trim: true
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: 5,
        },
        createdAt: {
            type: Date,
            default: Date.now()
        },
        tour: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tour",
            required: [true, 'Review must belong to a tour ']
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Review must belong to a user ']
        }

    },
    {
        toJSON: { // to see the virtual fields when fetching as JSON we have to set this to set this to true
            virtuals: true
        },
        toObject: { //same as above
            virtuals: true
        }
    });
reviewSchema.index({tour:1,user:1}, {unique: true});

reviewSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'name photo'
    });  // in the review we had the ID of the user and the tour but we acutely do not need to populate the tour
    // every time we get the review because you actually when you get the tour you are using virtual populate to get all the
    // reviews belonging to the tour so what will happen is we get the tour and the tour has the review and the review has all the data about the tour again if we actually
    // populated this but we won't because this a lot of over head we will simply have the user data in the review and just the ID of the tour
    // }).populate({  // will not actually need it so much over head
    //     path:'tour',
    //     select: 'name duration price'
    // })
    next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) { // this statics method is helpful in this case because it allows us to
    // access the model itself but in the normal method you access the current document
    // here we get the tourId as param because you can't access like this.tour because we are in a static method and we need this tourId
    // which is from the current review that has been added to so we take as a param
    const stats = await this.aggregate([{
        $match: {tour: tourId} // here we get all the reviews belonging to that tour, by its ID of course
    },
        {
            $group: { // then group all of this reviews by the tour ID which is going to actually be the same for all of them
                _id: '$tour', // so we get all the reviews we get from above match
                nRating: {$sum: 1}, // then counting the reviewing numbers by adding one to every one of them
                avgRating: {$avg: "$rating"} // and here we get the avg for every rating of these reviews

            }
        }
    ]);

    if(stats.length>0){
        await Tour.findByIdAndUpdate(tourId, { // here we actually update the tour to add the new rating number and avg from the
            // result we got from the above aggregate
            ratingsQuantity: stats[0].nRating, // we got an array so and if consist of one element so
            ratingsAverage: stats[0].avgRating
        });
    }else{
        await Tour.findByIdAndUpdate(tourId,{ // when all document got deleted
            ratingsQuantity: 0, // so we return to the default
            ratingsAverage: 4.5
        })
    }


};


// so here whenever a new Review is created and saved we get the tour from and update the rating and rating quantity
reviewSchema.post('save', async function (doc) { // here we call the global method above // this post so you get access to final doc
   await this.constructor.calcAverageRatings(doc.tour); // to call a static function but to call the function you need to call from the model itself
    // and you in the model class actually but you can get around this by calling this.constructor
});

//findByIdAndUpdate
//findByIdAndDelete
//here we want to update the rating avg and quantity whenever a review got deleted and updated but here we will run into a problem
// that the post(save) works only for new created docs so we can change the update and delete route to use save but actually wo'nt
// be able to that because it is in the factoryHandler so we will use pre find update and delete
// but we will face a problem that you only get access to the query not the document but we will work our way thought it
// Note that findByIdAndUpdate and delete internally uses findOndAnd so it is okay to do it like this
reviewSchema.pre(/^findOneAnd/,async function (next) {
    try {

        this.r = await this.findOne().clone(); // so to get the doc we executed the query which should have the ID of the review by now so we simply call findOne
        // note that the query here still not updated yet it will not have updated value so to get around this we saved the review in this r value and put in the doc
        // so that we can access it in the post after the query has been executed
        // note that you can not actually do it in the post at one time because you will not have access to the query at this time
        // note that you use this clone() function is necessary because in mongoose 6 and above you can call the same query twice
        // and mongoose will have to call it internally so that will cause an error
        next();
    }catch (e) {
        console.log(e);
    }
})

reviewSchema.post(/^findOneAnd/,async  function () {
    // this.r = await this.findOne(); does not work here the query already executed

    // here when the query got executed you can updated the rating by calling  the function
    // and you get access to the doc because of the this.r that you left in the pre one when you had the query
    // but now you got the doc but you want to execute it in the model itself and the fucntion is actually static
    // you do that by calling the constructor which will gave you the Review model
    await this.r.constructor.calcAverageRatings(this.r.tour);

})


const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;