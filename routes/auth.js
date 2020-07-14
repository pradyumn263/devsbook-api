const express = require("express");
const router = express.Router();

//Validators Import
const {
	userRegisterValidator,
	userEmailValidator,
	userLoginValidator,
	resetPasswordValidator,
} = require("../validators/auth");

const { runValidation } = require("../validators/index");

const {
	postActivate,
	postLogin,
	postRegister,
	requireSignin,
	forgotPassword,
	resetPassword,
} = require("../controllers/auth");

//Register Routes
router.post("/register", userRegisterValidator, runValidation, postRegister);

router.post("/register/activate", postActivate);
//Login Routes
router.post("/login", userLoginValidator, runValidation, postLogin);

//Forgot Password Routes
router.put(
	"/forgot-password",
	userEmailValidator,
	runValidation,
	forgotPassword
);
router.put(
	"/reset-password",
	resetPasswordValidator,
	runValidation,
	resetPassword
);

module.exports = router;
