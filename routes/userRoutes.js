const express = require("express")



const router = express.Router();
const userController = require("./../controllers/userController")
const authController = require("./../controllers/authController")



router.post('/signup',authController.signup)
router.post('/login',authController.login)
router.get('/logout',authController.logout)
router.post('/forgotPassword',authController.forgotPassword)
router.patch('/resetPassword/:token',authController.restPassword)


router.use(authController.protect) // this will run for all the above routes because it runs in sequence and all the above routs needs to be protected so this like avoiding duplicate code
router.get('/me',userController.getMe,userController.getUser) // here we get the current user from
// the protect middleware but the getUser route is getting the userId from the params so here in getMe we set the param as this
// req.param.id = req.user.id also this really does not make so much sense to me because we can simply return the user from req.user
// in the getMe route without fetching the data again
router.delete("/deleteMe",userController.deleteMy)
router.patch("/updateMyPassword",authController.updatePassword)
router.patch("/updateMe",userController.uploadUserphoto,userController.resizeUserPhoto,userController.updateMe) // single for only one single file and photo is the name of the field that is going to hold the photo
router.get('/my-tours',userController.getMyTours);


router.use(authController.restrictTo('admin'))// same as above
router.get("/",userController.getAllUsers);
router.post("/",userController.createUser);
router.patch("/:id",userController.updateUser);
router.delete("/:id",userController.deleteUser);
router.get("/:id",userController.getUser);


module.exports = router;