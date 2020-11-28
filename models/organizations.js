const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
	},
})

const organizationSchema = new Schema(
	{
		title: {
			type: String,
			required: true,
			unique: true,
		},
		details: {
			type: String,
			required: true,
		},

		organizationId: {
			type: String,
			required: true,
			unique: true,
		},
		admins: [userSchema], //Usernames will be given, backend will convert them to UID
		members: [userSchema], // It will also contain admins
		creator: {
			//same as above
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
	},
	{
		timestamps: true,
	}
)

// For text search
organizationSchema.index({ '$**': 'text' })

const Organizations = mongoose.model('Organization', organizationSchema)

module.exports = Organizations
