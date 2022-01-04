class AppError extends Error {

    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? "fail" : 'error';       // so fucking clever // all client error codes start with 4
                                                                                    //so this will work perfect
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);  // don't know what is this exactly
    }
}

module.exports = AppError;