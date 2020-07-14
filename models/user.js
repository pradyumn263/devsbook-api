const mongoose = require("mongoose");
const crypto = require("crypto");

const { ObjectId } = mongoose.Schema;

const userSchema = new mongoose.Schema(
	{
		username: {
			type: String,
			trim: true,
			required: true,
			max: 12,
			unique: true,
			index: true,
			lowercase: true,
		},
		name: {
			type: String,
			trim: true,
			required: true,
			max: 32,
		},
		email: {
			type: String,
			trim: true,
			required: true,
			unique: true,
			lowercase: true,
		},
		hashed_password: {
			type: String,
			trim: true,
			required: true,
		},
		salt: String,
		role: {
			type: String,
			default: "subscriber",
		},
		resetPasswordLink: {
			data: String,
			default: "",
		},
		categories: [
			{
				type: ObjectId,
				ref: "Category",
				required: true,
			},
		],
	},
	{ timestamps: true }
);

//Virtual Fields
userSchema
	.virtual("password")
	.set(function (password) {
		//Temp Variable called _password
		this._password = password;

		//Generate Salt
		this.salt = this.makeSalt();

		//excrypt Password
		this.hashed_password = this.encryptPassword(password);
	})
	.get(function () {
		return this._password;
	});

//Methods in Schema 1. Authenticate (Check incoming password and Hashed version)
//                  2. encrypt password
//                  3. Generate Salt Values
userSchema.methods = {
	authenticate: function (plainText) {
		return (
			this.encryptPassword(plainText).toString() ===
			this.hashed_password.toString()
		);
	},

	encryptPassword: function (p) {
		if (!p) return "";
		try {
			return crypto.createHmac("sha1", this.salt).update(p).digest("hex");
		} catch (err) {
			return "";
		}
	},

	makeSalt: function () {
		return Math.round(new Date().valueOf() * Math.random()) + "";
	},
};

module.exports = mongoose.model("User", userSchema);
