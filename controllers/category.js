const Category = require("../models/category");
const Link = require("../models/link");
const slugify = require("slugify");
const formidable = require("formidable");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const { createCategoryValidator } = require("../validators/category");
//S3 Setup

const s3 = new AWS.S3({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: process.env.AWS_REGION,
});

exports.create = (req, res, next) => {
	const { name, image, content } = req.body;
	//Image data
	const base64Data = new Buffer.from(
		image.replace(/^data:image\/\w+;base64,/, ""),
		"base64"
	);

	const type = image.split(";")[0].split("/")[1];

	const slug = slugify(name);
	let category = new Category({ name, content, slug });

	const params = {
		Bucket: "devsbook",
		Key: `category/${uuidv4()}.${type}`,
		Body: base64Data,
		ACL: "public-read",
		ContentEncoding: "base64",
		ContentType: `image/${type}`,
	};

	s3.upload(params, (err, data) => {
		if (err) {
			console.log("S3 upload error", err);
			return res.status(400).json({
				error: "Image could not be uploaded to S3",
			});
		}

		console.log("S3 Data: ", data);
		category.image.url = data.Location;
		category.image.key = data.Key;

		category.postedBy = req.user._id;

		//Save to DB
		category.save((err, success) => {
			if (err) {
				console.log("MongoDB error: ", err);
				return res.status(400).json({
					error: "Couldn't save category to database",
				});
			}

			return res.json(success);
		});
	});
};

exports.list = (req, res, next) => {
	Category.find().exec((err, data) => {
		if (err) {
			return res.status(400).json({
				error: "Categories could not be loaded",
			});
		}
		// console.log(data);
		res.json(data);
	});
};

exports.read = (req, res, next) => {
	const { slug } = req.params;
	let limit = req.body.limit ? parseInt(req.body.limit) : 10;
	let skip = req.body.skip ? parseInt(req.body.skip) : 0;

	Category.findOne({ slug })
		.populate("postedBy", "_id name username")
		.exec((err, category) => {
			if (err) {
				return res.status(400).json({
					error: "Could not load category",
				});
			}
			// res.json(category);
			Link.find({ categories: category })
				.populate("postedBy", "_id name username")
				.populate("categories", "name")
				.sort({ createdAt: -1 })
				.limit(limit)
				.skip(skip)
				.exec((err, links) => {
					if (err) {
						return res.status(400).json({
							error: "Could not load links of a category",
						});
					}
					res.json({ category, links });
				});
		});
};

exports.update = (req, res, next) => {
	const { slug } = req.params;
	const { name, image, content } = req.body;

	const base64Data = new Buffer.from(
		image.replace(/^data:image\/\w+;base64,/, ""),
		"base64"
	);

	const type = image.split(";")[0].split("/")[1];

	Category.findOneAndUpdate({ slug }, { name, content }, { new: true }).exec(
		(err, updated) => {
			if (err) {
				return res.status(400).json({
					error: "Could not find category to update",
				});
			}
			console.log("UPDATED", updated);
			if (image) {
				// remove the existing image from s3 before uploading new/updated one
				const deleteParams = {
					Bucket: "devsbook",
					Key: `${updated.image.key}`,
				};

				s3.deleteObject(deleteParams, function (err, data) {
					if (err) console.log("S3 DELETE ERROR DUING UPDATE", err);
					else console.log("S3 DELETED DURING UPDATE", data); // deleted
				});

				// handle upload image
				const params = {
					Bucket: "devsbook",
					Key: `category/${uuidv4()}.${type}`,
					Body: base64Data,
					ACL: "public-read",
					ContentEncoding: "base64",
					ContentType: `image/${type}`,
				};

				s3.upload(params, (err, data) => {
					if (err) {
						console.log(err);
						res.status(400).json({ error: "Upload to s3 failed" });
					}
					console.log("AWS UPLOAD RES DATA", data);
					updated.image.url = data.Location;
					updated.image.key = data.Key;

					// save to db
					updated.save((err, success) => {
						if (err) {
							console.log(err);
							res.status(400).json({ error: "Duplicate category" });
						}
						res.json(success);
					});
				});
			} else {
				res.json(updated);
			}
		}
	);
};

exports.remove = (req, res, next) => {
	const { slug } = req.params;

	Category.findOneAndRemove({ slug }).exec((err, data) => {
		if (err) {
			return res.status(400).json({
				error: "Could not delete category",
			});
		}

		const deleteParams = {
			Bucket: "devsbook",
			Key: `${data.image.key}`,
		};

		s3.deleteObject(deleteParams, function (err, data) {
			if (err) console.log("S3 DELETE ERROR DUING REMOVE", err);
			else console.log("S3 DELETED DURING REMOVE", data); // deleted
		});

		res.json({
			message: "Category deleted Successfully!",
		});
	});
};
