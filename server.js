const mongoose = require("mongoose")
const dotenv = require("dotenv")

process.on("unhandledRejection", err=>{
    console.log(err.name,err.message);
    console.log("UNHANDLED EXCEPTION SHUTTING DOWN");
        process.exit(1);
})


dotenv.config({
    path:"./config.env"
})
const app = require("./app");
const {log} = require("nodemon/lib/utils");
const DB =process.env.DATABASE.replace('<PASSWORD>',process.env.PASSWORD);
const port = process.env.PORT || 3001


mongoose.connect(DB,{useNewUrlParser: true}).then(con=>{
    console.log("connected to database successfully!");
}).catch(err=>{

    console.log(err);
})

const server = app.listen(port,()=>{
    console.log("Server is running on port "+port);
});


process.on("unhandledRejection", err=>{
    console.log(err.name,err.message);
    console.log("UNHANDLED REJECTION SHUTTING DOWN");
    server.close( ()=>{
        process.exit(1);
    }  )
})

process.on('SIGTERM',()=>{ // this even heroku does every day to shut down the server and restart it again
    // to whatever reason to make the app healthy
    // but we don't want to shut down without handling the reqs we are processing so we shut down the server bye closing the server first
    // not in a bad way
    console.log("SIGTERM RECEIVED. SHUTTING DOWN GRACEFULLY");
    server.close(()=>{
        console.log("process terminated!");
    })
})

