const mongoose = require('mongoose')
const Schema = mongoose.Schema

const commentSchema = new Schema(
	{
		comment: {
			type: String,
			required: true,
		},
		author: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		issue: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Issue',
		},
		attachments: [
			{
				fileName: String,
				fileLink: String,
			},
		],
		number: Number,
	},
	{
		timestamps: true,
	}
)

const Comments = mongoose.model('Comment', commentSchema)

module.exports = Comments
