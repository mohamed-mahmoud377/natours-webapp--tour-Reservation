const AppError = require("./../utils/appError")


const handleCastErrorDB = err =>{
const message = `Invalid ${err.path}: ${err.value}`
    return new AppError(message,400)
}
const sendErrorDev = (err, req, res) => {
    // A) API
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }

    // B) RENDERED WEBSITE
    console.error('ERROR 💥', err);
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message
    });
};

const sendErrorProd = (err,req,res)=>{
    if (req.originalUrl.startsWith('/api')) {
        // A) Operational, trusted error: send message to client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        }
        // B) Programming or other unknown error: don't leak error details
        // 1) Log error
        console.error('ERROR 💥', err);
        // 2) Send generic message
        return res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        });
    }

    // B) RENDERED WEBSITE
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
        console.log(err);
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            msg: err.message
        });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later.'
    });

}


function handleDuplicateFieldsDB(err) {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    const message = `Duplicate field value: ${value} please use anther value!`
    return new AppError(message,400)
}

function handleValidationErrorDB(err) {
    const errors = Object.values(err.errors).map(value =>value.message )  //map just loop in the array which we got out of errors
    const message = `Invalid input data. ${errors.join('. ')}`

    return new AppError(message,400)
}

function handleJWTError() {
  return  new AppError("Invalid JWT",401)
}

module.exports = ((err, req, res, next) => { //error handling use express  // express knows that is an error handler because of this err param
    // error handling MW
    console.log(err);
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req,res);
    } else if (process.env.NODE_ENV === 'production') {
        if(err.name==='CastError'){
           const handledError =  handleCastErrorDB(err)
            return sendErrorProd(handledError,req,res)
        }
        if(err.code===11000) {
              err = handleDuplicateFieldsDB(err)
               return sendErrorProd(err,req,res)
        }
        if(err.name==="ValidationError"){
            err = handleValidationErrorDB(err)
            return sendErrorProd(err,req,res)
        }
        if (err.name==="JsonWebTokenError"||err.name==="SyntaxError"||err.name==="TokenExpiredError" ){
            err= handleJWTError()
            return sendErrorProd(err,req,res)
        }
        sendErrorProd(err,req,res)
    }



});