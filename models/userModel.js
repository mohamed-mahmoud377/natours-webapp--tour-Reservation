const mongoose = require('mongoose');

const validatorPack = require('validator');
const bcrypt = require("bcryptjs");
const assert = require("assert");
const crypto = require("crypto");
const userScheme = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name field is required "],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email field is required"],
        trim: true,
        unique: [true, " User Email must be unique"],
        validate: {
            message: "This is not a Email",
            validator: validatorPack.isEmail,
        }
    },
    role: {
        type: String,
        enum: ["user", "guide", "lead-guide", "admin"],
        default: "user"
    },
    password: {
        type: String,
        required: [true, "password field is required"],
        trim: true,
        minlength: 8,
        select: false

    },
    passwordConfirm: {
        type: String,
        trim: true,
        required: [true, "passwordConfirm field is required "],
        // this only works on Save & create  !!! really important not for example findOneAndUpdate
        validate: {
            message: "confirmation password is the not the same ",
            validator: function (val) {
                return val === this.password;
            }
        }
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    passwordChangedAt: Date,
    passwordRestToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false,
    }


});


userScheme.pre("save", async function (next) {
    if (!this.isModified('password')) return next(); // this pre function will be called every time a new user have been created or even
    //updated so this really important to check if  the password was not modified just return and go the  next middleware
    this.password = await bcrypt.hash(this.password, 12);// return a promise
    this.passwordConfirm = undefined;
    next();

});

userScheme.pre("save", async function (next) {
    if (!this.isModified('password') || this.isNew) return next(); // this.isNew is soo soo good man
    this.passwordChangedAt = Date.now() - 1000; // this will sure that the token is  created after
    next();

});


userScheme.pre(/^find/, function (next) {
    //this point to the current query
    this.find({active: {$ne: false}});
    next()
});


userScheme.methods.correctPassword = async function (candidatePassword, userPassword) { //this how to can make a function on you scheme
    // (this.password) this won't work because the password field is selected to be false so we pass it as a param
    const bool = await bcrypt.compare(candidatePassword, userPassword);
    return bool;

};

userScheme.methods.changedPasswordAfter = function (JWTTimestamps) {

    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10); // this comes in milisec to we convert it
        // to seconds as JWT does and this convert it an int which has a base of 10 normal number here
        return JWTTimestamps < changedTimestamp;
    }
    return false;
};

userScheme.methods.createPasswordResetToken = function () {
    const restToken = crypto.randomBytes(32).toString("hex");
    this.passwordRestToken = crypto.createHash('sha256').update(restToken).digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return restToken; // sending the not hashed or encrypted one but the saving the encrypted to the database
};

const User = mongoose.model("User", userScheme);

module.exports = User;