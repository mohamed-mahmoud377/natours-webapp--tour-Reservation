const chalk = require("chalk");
const fs = require("fs");
const Tour = require("./../models/tourModel");
const {param} = require("express/lib/router");
const {json} = require("express");
const APIFeatures = require('../utils/APIFeatures');
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const reviewController = require('./reviewController');
const factory = require('./handlerFactory');
const multer = require("multer");
const sharp = require("sharp");






const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) { // making sure that it is an image
        cb(null, true);
    } else {
        cb(new AppError('Not an image! please upload only images.', 400), false); // remember that you AppError extends Error class so that way this is working I guess
    }
};

const upload = multer({
    storage:multerStorage,
    fileFilter:multerFilter
});






// this in case we want to upload more than one img and in more than one field, like more than one field to update or save in the database
exports.uploadTourImages = upload.fields([
    {name:'imageCover', maxCount: 3},
    {name:'images',maxCount: 3}
])

//this in case we want to upload more than one img but from one field
// upload.array('images', 3);

// in case of one image
// upload.single('image')


exports.resizeTourImages = catchAsync(async (req,res,next)=>{

    if (!req.files.imageCover || !req.files.images) next(); // if images did not update so just skip this middleware

    //1 resizing cover image
    const imageCoverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

    await sharp(req.files.imageCover[0].buffer)
        .resize(2000,1333)
        .toFormat('jpeg')
        .jpeg({quality:90})
        .toFile(`public/img/tours/${imageCoverFilename}`);

    req.body.imageCover= imageCoverFilename;

    //2 resizing images
    req.body.images= [];
    await Promise.all(req.files.images.map(async (file,i)=>{
        const filename = `tour-${req.params.id}-${Date.now()}-${i+1}.jpeg`
        await sharp(file.buffer)
            .resize(2000,1333)
            .toFormat('jpeg')
            .jpeg({quality:90})
            .toFile(`public/img/tours/${filename}`);
        req.body.images.push(filename);
    }))

    next();
})




exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = "-ratingsAverage,price";
    req.query.fields = "name,price,ratingsAverage,summary,difficulty";
    next();

};
exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, {path: 'reviews'});
exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.UpdateOne(Tour);

// exports.updateTour = catchAsync(async (req, res,next) => {
//
//         // run validator here is really important I guess
//         // new return the new updated document if it was true if false will return the old one //default is false
//         const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {new: true, runValidators: true});
//         if(!tour){  // when you pass a valid ID to mongoose is will not create error but will just set tour to null that why is important to check
//         return next(new AppError("not tour found with that ID",404))
//         }
//         res.status(200).json({
//             status: "success",
//             data: {
//                 tour
//             }
//         });
//
//
//
//
// });

exports.deleteTour = factory.deleteOne(Tour);

// exports.deleteTour = catchAsync(async (req, res,next) => {
//
//        const tour =  await Tour.findByIdAndDelete(req.params.id);
//
//         if(!tour){  // when you pass a valid ID to mongoose is will not create error but will just set tour to null that why is important to check
//         return next(new AppError("not tour found with that ID",404))
//          }
//         res.status(204).json({
//             status: 'success',
//             data: null
//         });
// });


exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([  // it takes an array and every elem has to be an object
        {
            $match: {   // to select or to filter certain docs just like find I guess
                ratingsAverage: {$gte: 3}
            }
        },   // here we get the filtered data which is tours
        {
            $group: {  // it allows grouping docs together
                _id: {$toUpper: "$difficulty"}, // this is what to group by, null for all docs
                numTours: {
                    $sum: 1
                },
                numRatings: {
                    $sum: "$ratingsQuantity"
                },
                avgRating: {
                    $avg: '$ratingsAverage'  // this $avg op is for the avg of course but what it does is it goes though all the docs
                    // that we got from the match and get the avg for not any avg rating Average and you till what you need
                },

                avgPrice: {
                    $avg: '$price'
                },
                minPrice: {
                    $min: "$price" // this op $min gets all the prices but only save the value of the smallest of course what it compares
                    // is what we got from the match
                },
                maxPrice: {
                    $max: "$price"
                }


            }
        }, // after grouping, we don't have the tour anymore, but we get the result of the grouping
        {
            $sort: {
                avgPrice: 1
            }
        }


    ]);

    res.status(200).json({
        status: "success",
        results: stats.length,
        data: {
            stats: stats
        }
    });


});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {

    const year = req.params.year * 1;

    const plan = await Tour.aggregate(
        [
            {
                $unwind: '$startDates'
            },
            {
                $match: {
                    startDates: {
                        $gte: new Date("2021-01-01"),  // that was really a nightmare but you are the dummy here
                        $lte: new Date("2021-12-31")
                    }
                }
            },
            {
                $group: {   // grouping by date
                    _id: {$month: "$startDates"}, // only gets the month out of the date
                    numTourStarts: {$sum: 1}, //just adds one every time it appears
                    tours: {$push: "$name"}

                }
            },
            {
                $addFields: {
                    month: "$_id"
                }
            },
            {
                $project: {  // as to remove
                    _id: 0
                }

            },
            {
                $sort: {
                    numTourStarts: -1
                }
            },
            {
                $limit: 3
            }
        ]
    );

    res.status(200).json({
        status: "success",
        results: plan.length,
        data: {
            plan
        }
    });

});
///tours-within/:distance/center/:latlng/unit/:unit"
// /tours-withnin/233/center/34.131778,-118.128702/unit/mi // looks much better and this the stander
exports.getToursWithin = catchAsync(async (req, res, next) => {
    const {distance, latlng, unit} = req.params;
    const [lat, lng] = latlng.split(",");
    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // mongoose does not expect the distance from the point instead
    // it expects the radius and to get it you need to divide the distance by the radius of the earth it is crazy I know
    if (!lat || !lng) {
        return next(new AppError("Please provide latitude and longitude in the format lat,lng"), 400);

    }

    const tours = await Tour.find({startLocation: {$geoWithin: {$centerSphere: [[lng, lat], radius]}}});
    res.status(200).json({
        status: "success",
        results: tours.length,
        data: {
            data: tours
        }
    });

});


exports.getDistances = catchAsync(async (req, res, next) => {
    const {latlng, unit} = req.params;
    const [lat, lng] = latlng.split(",");

    if (!lat || !lng) {
        return next(new AppError("Please provide latitude and longitude in the format lat,lng"), 400);

    }
    const multiplier = unit ==='mi' ? 0.000621371 : 0.001; //converting from meter to mile and kilometer note here kilometer is the default in that case
    const distances = await Tour.aggregate([ // this will get us the tours with a field called distance we said below and will get how far
        // the tour from this point we said in the params
        // note that you didn't say from which field we should calc the distance because it goes to our indexes it must have as geo index
        // if you have more than one so you have to say which one but in this case we don't


        { // always needs to be first in the pipeline
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1],
                },
                distanceField: 'distance', // they will come in meters
                distanceMultiplier: multiplier // so here multiply by .001 to get them in kilometers // this is just built in mongoose
            },
        },
        {
            $project: { // get only this field from the tours because way will we need the Tour we only want to see the distance
                distance: 1,
                name: 1,
                price: 1,
            }
        }
    ]);
    res.status(200).json({
        status: "success",
        data: {
            data: distances
        }
    });

});


