const mongoose = require('mongoose')
const Schema = mongoose.Schema

const projectSchema = new Schema(
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
		projectId: {
			type: String,
			required: true,
			unique: true,
		},
		organization: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Organization',
		},
		techStack: [String],
	},
	{
		timestamps: true,
	}
)

// For text search
projectSchema.index({ '$**': 'text' })

const Projects = mongoose.model('Project', projectSchema)

module.exports = Projects
