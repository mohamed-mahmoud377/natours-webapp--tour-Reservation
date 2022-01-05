const {promisify} = require("util");
const crypto = require("crypto");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const jwt = require("jsonwebtoken");
const AppError = require("./../utils/appError");
const Email = require("./../utils/email");


const signToken = id => {
    return jwt.sign({id}, process.env.JWT_SECRET,  // then creating their JWT with just their ID and
        //expiresIN date
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );
};

const createSendToken = (user, statusCode, req,res) => {
    let cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE_IN * 24 * 60 * 60 * 1000), //converting the 90 to 90 days in milie sec
        httpOnly: true,

    };

    // note that we don't just check for req.secure but actually the proxy of heroku will remove this from the header and
    // so we also check these headers which was set by heroku
    if (req.secure || req.headers['x-forwarded-proto']==='https') cookieOptions.secure = true; // because it will work only on https
    const token = signToken(user._id);
    res.cookie('jwt', token, cookieOptions);
    user.password = undefined;
    res.status(statusCode).json({
        status: "success",
        token,
        data:{
            user
        }
    });
};

exports.signup = catchAsync(async (req, res, next) => {

    // const newUser = await User.create(req.body);  // created a new user
    const url = `${req.protocol}://${req.get('host')}/me`;
    console.log(url);
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm
    });
     await  new Email(newUser,url).sendWelcome();

    createSendToken(newUser, 201,req, res);
});


exports.login = catchAsync(async (req, res, next) => {
    const {email, password} = req.body;
    if (!email || !password) {   //  we are doing this here like this because we don't let the database or mongoose do anything here so we have to do it ourselves
        return next(new AppError("email and password are required"), 400);
    }
    const user = await User.findOne({email: email}).select('+password');  // this really important to get afield that was excluded by select : false

    if (!user || !(await user.correctPassword(password, user.password))) {  // note that !User is going to run first and if it false await won't even run
        return next(new AppError("incorrect email or password"), 401);
    }
    user.password = undefined;
    user.passwordChangedAt = undefined;

    createSendToken(user, 200,req, res);
});

exports.protect = catchAsync(async (req, res, next) => {
    let token;

    //get the token and check if it was there or not
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(' ')[1];
    }else if (req.cookies.jwt){
        token = req.cookies.jwt; // to be able to authenticate via cookie too
    }
    if (!token) {  // if there was no token in the header  or it wasn't starting with Bearer
        return next(new AppError("You are not authenticated.",401));
    }
    //verification token

    // we handle verification error an the express error handler through the catchAsync
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // to avoid using the callback function we this function
    // to get the value of the param of the callback in decoded as you see here
    // console.log(decoded);
    //Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError("User is no longer exists",401));
    }


    //check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError("Invalid token, Password has changed recently", 401));
    }


    req.user = currentUser;
    res.locals.user =currentUser;
    next();
});

exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ status: 'success' });
};

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            // 1) verify token
            const decoded = await promisify(jwt.verify)(
                req.cookies.jwt,
                process.env.JWT_SECRET
            );

            // 2) Check if user still exists
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return next();
            }

            // 3) Check if user changed password after the token was issued
            // if (currentUser.changedPasswordAfter(decoded.iat)) {
            //     return next();
            // }

            // THERE IS A LOGGED IN USER
            res.locals.user = currentUser;
            // req.user1 = currentUser;
            return next();
        } catch (err) {
            return next();
        }
    }
    next();
};



exports.restrictTo = (...roles) => {
// roles is an array
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError("You are not authorized",403));
        }

        next();
    };
};


exports.forgotPassword = catchAsync(async (req, res, next) => {
    //1 Get user based on posted email
    const user = await User.findOne({email: req.body.email});
    if (!user) { // if the user was not found note that if mongoose itself generated on error it will be caught in catchAsync
        return next(new AppError("there is now user with this email address"), 404);
    }

    //2 Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({validateBeforeSave: false}); // really cool feature here because we only save the restToken here which we attached in the function above but not yet saved

    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    try {
       await new Email (user ,resetURL).sendPasswordRest();
        res.status(200).json({
            status: "success",
            message: 'Token sent to email'
        });
    } catch (e) {
        console.log(e);
        user.passwordRestToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({validateBeforeSave: false});
        return next(new AppError("There was an error sending the email. Try again later!"), 500);
    }


});

exports.restPassword = catchAsync(async (req, res, next) => {
    // get user bases the token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
        passwordRestToken: hashedToken,
        passwordResetExpires: {$gt: Date.now()}
    }); // the only thing we know about the user at this moment


    //if token has not expired, and there is user, set the new password
    if (!user) {
        next(new AppError("Invalid or expired token"), 400);
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordRestToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();


    //Update changedPasswordAt prop for the user
    //log the user in , send jwt

    createSendToken(user, 200, req,res);
});


exports.updatePassword = catchAsync(async (req, res, next) => {
    //1 Get user from collection
    const user = await User.findById(req.user._id).select("+password"); // because by default it wont be there

    // check if posted current password is correct
    if (!await user.correctPassword(req.body.passwordCurrent, user.password)) {
        return next(new AppError("Invalid password", 401));
    }
    //3 if so update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    //4 log user in , send JWT
    createSendToken(user, 200,req,res);


});
