const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMogoose = require('passport-local-mongoose')

const organizationSchema = new Schema({
	organization: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Organization',
	},
	admin: {
		type: Boolean,
		default: false,
	},
})

const issueSchema = new Schema({
	issue: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Issue',
	},
})

const commentSchema = new Schema({
	comment: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Comment',
	},
})

const User = new Schema({
	googleId: {
		type: String,
	},
	githubId: {
		type: String,
	},
	username: {
		type: String,
		required: true,
		unique: true,
	},
	firstName: {
		type: String,
		default: '',
	},
	lastName: {
		type: String,
		default: '',
	},
	image: {
		type: String,
		default: 'default.png',
	},
	email: String,
	issuesAssigned: [issueSchema], //Use find() function on issues
	issuesFiled: [issueSchema], //Same as above
	commentedOn: [issueSchema], //While finding comments make an array of unique issues
	comments: [commentSchema], //You can easily find all comments by finding that user
	patchesAccepted: [issueSchema], //Find patches that are assigned and accepted
	organizations: [organizationSchema],
})

// For text search
User.index({ '$**': 'text' })

User.plugin(passportLocalMogoose)

module.exports = mongoose.model('User', User)
