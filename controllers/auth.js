const shortId = require("shortid");
const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const _ = require("lodash");

const {
	registerEmailParams,
	forgotPasswordParams,
} = require("../helpers/email");

const User = require("../models/user");
const { update } = require("lodash");
const Link = require("../models/link");

AWS.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: process.env.AWS_REGION,
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

//Registration Controllers Start
exports.postRegister = (req, res, next) => {
	// console.log("REGISTER CONTROLLER: ", req.body);
	const { name, email, password, categories } = req.body;

	//Check if user already exists in DB
	User.findOne({ email }).exec((err, user) => {
		if (user) {
			return res.status(400).json({
				error: "Email is taken!",
			});
		}

		//Generate token user name, email and password;
		const token = jwt.sign(
			{ name, email, password, categories },
			process.env.JWT_ACCOUNT_ACTIVATION,
			{
				expiresIn: "20m",
			}
		);

		//Generate Email Content
		const params = registerEmailParams(email, token);

		//Send the Email
		const sendEmailOnRegister = ses.sendEmail(params).promise();

		sendEmailOnRegister
			.then((data) => {
				console.log("Email submitted to SES", data);
				return res.json({
					message: `Email has been sent to ${email}, Follow the Instructions to complete your registration`,
				});
			})
			.catch((err) => {
				console.log("SES Email on register, error", err);
				return res.status(401).json({
					error: `We could not verify your email, please try again`,
				});
			});
	});
};

exports.postActivate = (req, res, next) => {
	const { token } = req.body;

	jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, function (
		err,
		decodedInfo
	) {
		if (err) {
			return res.status(401).json({
				error: "Expired Link, Try again!",
			});
		}

		const { name, email, password, categories } = jwt.decode(token);
		const username = shortId.generate();

		//A user with this email should not exist

		User.findOne({ email }).exec((err, user) => {
			if (user) {
				return res.status(401).json({
					error: "Email is Taken",
				});
			}

			//Create New User
			const newuser = new User({
				username,
				name,
				email,
				password,
				categories,
			});
			newuser.save((err, result) => {
				if (err) {
					return res.status(401).json({
						error: "Some error was encountered, please try later",
					});
				}

				return res.json({
					message: "Registration Success, Please login",
				});
			});
		});
	});
};

//Registration Controllers End

//Login Controllers Begin
exports.postLogin = (req, res, next) => {
	const { email, password } = req.body;

	//Find the user based on this email
	User.findOne({ email }).exec((err, user) => {
		if (err || !user) {
			return res.status(400).json({
				error: "User with that email does not exist, Please register.",
			});
		}

		//Match password
		if (!user.authenticate(password)) {
			return res.status(400).json({
				error: "Wrong Email or Password",
			});
		}

		//Generate Token and Send to Client
		const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
			expiresIn: "7d",
		});

		const { _id, name, email, role } = user;
		return res.json({
			token,
			user: { _id, name, email, role },
		});
	});
};

//This makes the request.user available, which in turn contains ID and Role
exports.requireSignin = expressJwt({
	secret: process.env.JWT_SECRET,
	algorithms: ["HS256"],
});

exports.authMiddleWare = (req, res, next) => {
	const authUserId = req.user._id;
	User.findOne({ _id: authUserId }).exec((err, user) => {
		if (err || !user) {
			return res.status(400).json({
				error: "User not Found",
			});
		}

		req.profile = user;
		next();
	});
};

exports.adminMiddleWare = (req, res, next) => {
	const adminUserId = req.user._id;
	User.findOne({ _id: adminUserId }).exec((err, user) => {
		if (err || !user) {
			return res.status(400).json({
				error: "User not Found",
			});
		}

		if (user.role !== "admin") {
			return res.status(400).json({
				error: "No Permission to Access this page",
			});
		}

		req.profile = user;
		next();
	});
};

exports.forgotPassword = (req, res, next) => {
	const { email } = req.body;

	User.findOne({ email }).exec((err, user) => {
		if (err || !user) {
			return res.status(400).json({
				error: "User with that Email does not exist",
			});
		}

		const token = jwt.sign(
			{ name: user.name },
			process.env.JWT_RESET_PASSWORD,
			{ expiresIn: "10m" }
		);

		const params = forgotPasswordParams(email, token);

		//db > user > resetPasswordLink
		return user.updateOne({ resetPasswordLink: token }, (err, success) => {
			if (err) {
				return res.status(400).json({
					error: "Password Reset Failed, Please Try Again Later",
				});
			}

			const sendEmail = ses.sendEmail(params).promise();

			sendEmail
				.then((data) => {
					console.log("ses Reset password success");
					return res.json({
						message: `Email has been sent to ${email}, please follow the instructions in the email to Reset your password`,
					});
				})
				.catch((error) => {
					console.log("ses Reset password FAIL");
					return res.status(400).json({
						error:
							"Password reset could not be processed right now, please check if your email was entered correctly or try again later",
					});
				});
		});
	});
};

exports.resetPassword = (req, res, next) => {
	const { resetPasswordLink, newPassword } = req.body;

	if (resetPasswordLink) {
		jwt.verify(
			resetPasswordLink,
			process.env.JWT_RESET_PASSWORD,
			(err, success) => {
				if (err) {
					return res.status(400).json({
						error: "Password Reset link has expired, please try again.",
					});
				}

				User.findOne({ resetPasswordLink }).exec((err, user) => {
					if (err || !user) {
						return res.status(400).json({
							error: "Invalid token, Please try again",
						});
					}
					const updatedFields = {
						password: newPassword,
						resetPasswordLink: "",
					};

					user = _.extend(user, updatedFields);

					user.save((err, result) => {
						if (err) {
							return res.status(400).json({
								error: "Password Reset failed, please try again",
							});
						}

						res.json({
							message: "Congrats! Your password has been changed Successfully!",
						});
					});
				});
			}
		);
	}
};

exports.canUpdateDeleteLink = (req, res, next) => {
	const { id } = req.params;
	Link.findOne({ _id: id }).exec((err, data) => {
		if (err) {
			return res.status(400).json({
				error: "Could not find link",
			});
		}
		let authorizedUser =
			data.postedBy._id.toString() === req.user._id.toString();
		if (!authorizedUser) {
			return res.status(400).json({
				error: "You are not authorized",
			});
		}
		next();
	});
};
