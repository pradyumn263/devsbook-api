const { check } = require("express-validator");

exports.createLinkValidator = [
	check("title").not().isEmpty().withMessage("Title is required"),

	check("url").not().isEmpty().withMessage("URL is required"),

	check("categories").not().isEmpty().withMessage("Pick a Category!"),

	check("type").not().isEmpty().withMessage("Select a type"),

	check("medium").not().isEmpty().withMessage("Pick a medium!"),
];

exports.updateLinkValidator = [
	check("title").not().isEmpty().withMessage("Title is required"),

	check("url").not().isEmpty().withMessage("URL is required"),

	check("categories").not().isEmpty().withMessage("Pick a Category!"),

	check("type").not().isEmpty().withMessage("Select a type"),

	check("medium").not().isEmpty().withMessage("Pick a medium!"),
];
