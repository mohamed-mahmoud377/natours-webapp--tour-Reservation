module.exports= fn =>{  // this func is doing a perfect job which is catching all the error but how?
    // you rap any controller func with it so (fn) param is the controller function which lets say create Tour
    //  so here when we call and when ann error happens we sent this error to next function which will call express error handler
    // which we have actually written  ourselves and send the error res from there

    //only works with async functions of course

    return (req,res,next)=>{ // we have to return function so that the var the holds the create-tour for example can actually have a value
        fn(req,res,next).catch(err=>next(err));
    }
}