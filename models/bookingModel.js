const mongoose  =require('mongoose');

const bookingSchema = new mongoose.Schema({
    tour:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Tour",
        required:[true,'Booking must belong to a Tour !']
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:[true,"Booking must belong to a User !"]
    },
    price:{
        type:Number,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now()
    },
    paid:{
        type:Boolean,
        default:true
    }
})




bookingSchema.pre(/^find/,function (next){
    this.populate('user').populate({
        path: 'tour',
        select: 'name price'
    });

    next();
})

const Booking = mongoose.model("Booking",bookingSchema);

module.exports = Booking;