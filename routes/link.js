const express = require("express");
const router = express.Router();

const {
	createLinkValidator,
	updateLinkValidator,
} = require("../validators/link");

const { runValidation } = require("../validators/index");

const {
	authMiddleWare,
	requireSignin,
	adminMiddleWare,
	canUpdateDeleteLink,
} = require("../controllers/auth");

const {
	clickCount,
	create,
	list,
	read,
	update,
	remove,
	popular,
	popularInCategory,
} = require("../controllers/link");

//createCategoryValidator, runValidation,
router.post(
	"/link",
	createLinkValidator,
	runValidation,
	requireSignin,
	authMiddleWare,
	create
);
router.post("/links", requireSignin, adminMiddleWare, list);
router.put("/click-count", clickCount);
router.get("/link/popular", popular);
router.get("/link/popular/:slug", popularInCategory);
router.put(
	"/link/:id",
	updateLinkValidator,
	runValidation,
	requireSignin,
	authMiddleWare,
	canUpdateDeleteLink,
	update
);
router.put(
	"/link/admin/:id",
	updateLinkValidator,
	runValidation,
	requireSignin,
	adminMiddleWare,
	update
);
router.get("/link/:id", read);
router.delete(
	"/link/:id",
	requireSignin,
	authMiddleWare,
	canUpdateDeleteLink,
	remove
);
router.delete("/link/admin/:id", requireSignin, adminMiddleWare, remove);

module.exports = router;
