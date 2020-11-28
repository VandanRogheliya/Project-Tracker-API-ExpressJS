const mongoose = require('mongoose')
const Schema = mongoose.Schema

const requestSchema = new Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		organization: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Organization',
			required: true,
		},
		accept: {
			type: Boolean,
			default: false,
		},
		adminAccess: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	}
)

// For text search
const Requests = mongoose.model('Request', requestSchema)

module.exports = Requests
