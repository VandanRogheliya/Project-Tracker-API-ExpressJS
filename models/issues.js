const mongoose = require('mongoose')
const Schema = mongoose.Schema

const issueSchema = new Schema(
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
		status: {
			type: String,
			default: 'UNAPPROVED',
		},
		issueId: {
			type: String,
			required: true,
			unique: true,
		},
		attachments: [
			{
				fileName: String,
				fileLink: String,
			},
		],
		organization: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Organization',
		},
		project: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Project',
		},
		reporter: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		assignee: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		reviewer: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		tags: {
			type: [String],
			default: [],
		},
		deadline: Date,
		closeDate: Date,
		commentCount: {
			type: Number,
			default: 0,
		},
	},
	{
		timestamps: true,
	}
)

// For text search
issueSchema.index({ '$**': 'text' })

const Issues = mongoose.model('Issue', issueSchema)

module.exports = Issues
