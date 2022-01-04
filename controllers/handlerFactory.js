const catchAsync = require("./../utils/catchAsync");
const Tour = require("./../models/tourModel");
const AppError = require("./../utils/appError");
const chalk = require("chalk");
const APIFeatures = require("../utils/APIFeatures");

exports.deleteOne = Model => catchAsync(async (req, res,next) => {

        const doc =  await Model.findByIdAndDelete(req.params.id);

        if(!doc){  // when you pass a valid ID to mongoose is will not create error but will just set tour to null that why is important to check
            return next(new AppError("not doc found with that ID",404))
        }
        res.status(204).json({
            status: 'success',
            data: null
        });})

exports.UpdateOne = Model  => catchAsync(async (req, res,next) => {

    // run validator here is really important I guess
    // new return the new updated document if it was true if false will return the old one //default is false
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {new: true, runValidators: true});
    console.log("below must be the updated one ");
    console.log(doc);
    if(!doc){  // when you pass a valid ID to mongoose is will not create error but will just set tour to null that why is important to check
        return next(new AppError("not doc found with that ID",404))
    }
    res.status(200).json({
        status: "success",
        data: {
            document: doc
        }
    });

});

exports.createOne =Model=> catchAsync(async (req, res,next) => {

    const newDoc = await Model.create(req.body);
    console.log(chalk.green.bgWhite("A new doc has been created ,"));
    res.status(201).json(
        {
            status: "success",
            data: {
                doc:  newDoc
            }
        }
    );
});

exports.getOne = (Model,popOptions)=> catchAsync(async (req, res,next) => {

    // const tour = await Tour.findById(req.params.id).populate('guides'); // this way you can get all the user data
    let query = Model.findById(req.params.id)
    if(popOptions) query.populate(popOptions)
    const doc = await  query
    //     .populate({    // we will need to write the same code in the get allTour for example
    //     path:'guides', // it is a bad practice so the perfect place for that is the tour model
    //     select: '-__v -passwordChangedAt'
    // })

    if(!doc){  // when you pass a valid ID to mongoose is will not create error but will just set tour to null that why is important to check
        return next(new AppError("not document found with that ID",404))
    }

    res.status(200).json({
        status: "success",
        data: {
         data: doc
        }
    });

});

exports.getAll = Model=>catchAsync(async (req, res,next) => {

   // to allow for nested GET reviews on tour (hack) if you look closely you will notice that this really will only work for
    // the reviews model
    let filter = {};
    if (req.params.tourId) filter = {tour: req.params.tourId};

    //here was all the code from the APIFeatures class which we removed and replaced with all the functions above

    // here the constructor needs the  query which is a mongoose object  and the query string which is an object we get from express
    // Tour.find() returns a query, so we pass it to the constructor is does not make sense to me yet but will see
    const features = new APIFeatures(Model.find(filter), req.query).filter().sort().limitFields().paginate(); // it is an object of APIFeatrures
    // console.log(features);
    // const doc = await features.query.explain();
    const doc = await features.query
    // note that here we did not check if the tours are null or not and sent 404 error because it does not make sense here
    // we searched, and it was successful, and we got exactly zero results

    // console.log(tours);

    res.status(200).json({
        status: "success",
        results: doc.length,
        data: {
            doc
        }

    });



    // const tours = await Tour.find().where("duration").equals(5)
    //     .where("difficulty").equals("easy") // other way of doing find({})


});

