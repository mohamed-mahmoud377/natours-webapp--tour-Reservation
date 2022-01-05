const APIFeatures = require('../utils/APIFeatures');
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const User = require("./../models/userModel");
const factory = require('./handlerFactory');
const multer = require("multer");
const sharp = require('sharp');
const Booking = require("../models/bookingModel");
const Tour = require("../models/tourModel");
// here when we wanted to save the img directly to disk but now we need to process it so we will leave in memory for now
// const multerStorage = multer.diskStorage({ // to have more control over your storage we do it this way
//     destination: (req, file, cb) => {   // function to set the location cb is callback function of course
//         cb(null, 'public/img/users'); // first null is for an error
//     },
//     filename: (req, file, cb) => { // in mimetype multer give us the type of the file and its ext as this image/jgp
//        // so we are getting the ext
//         const ext = file.mimetype.split('/')[1];
//         cb(null, `user-${req.user.id}-${Date.now()}.${ext}`); // user-id-theCurrentTime to make a unique name for every photo
//     }
// });

// now it will be saved in memory which we need to be able to process it // it will be in buffer
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

exports.uploadUserphoto =  upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req,res,next)=>{

    // this is where the name was saved when we used multer to save it when we used the localStorge not memory
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg` // here we save the name in the req  because we need to pass it the next middleware

    if (!req.file) return next();
    await sharp(req.file.buffer)
        .resize(500,500)
        .toFormat('jpeg')
        .jpeg({quality:80})
        .toFile(`public/img/users/${req.file.filename}`);

    next();

})

function filterObj(obj, ...allowedFields) {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) {
            newObj[el] = obj[el];
        }
    });
    return newObj;
}

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};

exports.updateMe = catchAsync(async (req, res, next) => {

    //create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
        return new (next(new AppError("You Can't update password", 400)));
    }
    const filteredBody = filterObj(req.body, 'name', 'email'); // filter fields that not allowed to be updated
    if (req.file) filteredBody.photo = req.file.filename; // req.file only exist if there was a photo in the req.body because
    // upload.single('photo') takes the name of the whatever so if req.file exist but in the filteredBody the photo field that
    // has the name of the file what you can actually get from the file
    const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {new: true, runValidators: true});
    // console.log(req.user);

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });

});

exports.deleteMy = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, {active: false});
    res.status(204).json({
        status: "success",
        data: null
    });
});

exports.createUser = (req, res) => {
    res.status(200).json({
        status: "error",
        message: "This route is not defined! Please use /signup instead"

    });
};

exports.getMyTours= catchAsync(async (req,res,next)=>{
    // 1 find all bookings
    const bookings = await Booking.find({user: req.user.id})
    //2 find tours the returned IDs
    const tourIds = bookings.map(el=>el.tour);
    const tours = await Tour.find ({_id : {$in : tourIds}}); // here we find the _id which is in this array using $in
    res.status(200).json({
        status:'success',
        results:tours.length,
        tours,
    });
})

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.UpdateOne(User); // this update is only for an admin this to update anything but password
exports.deleteUser = factory.deleteOne(User);



