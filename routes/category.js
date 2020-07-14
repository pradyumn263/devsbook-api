const express = require("express");
const router = express.Router();

const {
	createCategoryValidator,
	updateCategoryValidator,
} = require("../validators/category");

const { runValidation } = require("../validators/index");

const {
	adminMiddleWare,
	authMiddleWare,
	requireSignin,
} = require("../controllers/auth");

const {
	create,
	list,
	read,
	update,
	remove,
} = require("../controllers/category");

//createCategoryValidator, runValidation,
router.post(
	"/category",
	createCategoryValidator,
	runValidation,
	requireSignin,
	adminMiddleWare,
	create
);
router.get("/categories", list);
router.post("/category/:slug", read);
router.put(
	"/category/:slug",
	updateCategoryValidator,
	runValidation,
	requireSignin,
	adminMiddleWare,
	update
);
router.delete("/category/:slug", requireSignin, adminMiddleWare, remove);

module.exports = router;
