const express = require("express");
const router = express.Router();

//Importing Controllers
const { readProfile, update } = require("../controllers/user");
const { userUpdateValidator } = require("../validators/auth");
const { runValidation } = require("../validators/index");

//Midddlewares
const {
	requireSignin,
	authMiddleWare,
	adminMiddleWare,
} = require("../controllers/auth");

//Routes
router.get("/user", requireSignin, authMiddleWare, readProfile);
router.get("/admin", requireSignin, adminMiddleWare, readProfile);
router.put(
	"/user",
	userUpdateValidator,
	runValidation,
	requireSignin,
	authMiddleWare,
	update
);

module.exports = router;
