const express = require('express')
const bodyParser = require('body-parser')
var authenticate = require('../authenticate')
const cors = require('./cors')

// Other models
const Comments = require('../models/comments')
const Issues = require('../models/issues')

// Setting up router
const commentRouter = express.Router()

commentRouter.use(bodyParser.json())

// Routs
// End point '/'
commentRouter
	.route('/')
	.options(cors.corsWithOptions, (req, res) => {
		res.sendStatus(200)
	})
	.get(cors.cors, authenticate.verifyUser, (req, res, next) => {
		Comments.find(req.query)
			.populate('author')
			.populate('issue')
			.then(comments => {
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(comments)
			})
			.catch(err => next(err))
	})
	.post(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyMember, (req, res, next) => {
		//Include req.body.organization
		Issues.findByIdAndUpdate(req.body.issue, { $inc: { commentCount: 1 } }, { new: true })
			.then(issue => {
				if (!issue) {
					var err = new Error('Issue not found')
					err.status = 404
					next(err)
				}
				req.body.number = issue.commentCount
				req.body.author = req.user._id
				req.body.issue = req.body.issue
				return Comments.create(req.body)
			})
			.then(comment => {
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(comment)
			})
			.catch(err => next(err))
	})
	.put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
		res.statusCode = 403
		res.end('Put operations are not allowed')
	})
	.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
		res.statusCode = 403
		res.end('Delete operations are not allowed')
	})

// '/:commentId'
commentRouter
	.route('/:commentId')
	.options(cors.corsWithOptions, (req, res) => {
		res.sendStatus(200)
	})
	.get(cors.cors, authenticate.verifyUser, (req, res, next) => {
		Comments.findById(req.params.commentId)
			.populate('author')
			.then(comment => {
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(comment)
			})
			.catch(err => next(err))
	})
	.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
		res.statusCode = 403
		res.end('Post operations are not allowed')
	})
	.put(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyMember, (req, res, next) => {
		// Include req.body.organization
		// Include req.body.comment = true to change
		// Include req.body.attachments = [{fileName:"name", fileLink:"link"}, ...] to add those attachments
		Comments.findById(req.params.commentId)
			.then(comment => {
				if (comment) {
					if (comment.author.equals(req.user._id)) {
						//Checking for comment and changing it
						if (req.body.comment) comment.comment = req.body.comment
						//Checking for attachments and changing it
						if (req.body.attachments) {
							if (req.body.attachment.edit) {
								let index = comment.attachments.map(e => e._id).indexOf(req.body.attachment.attachmentId)
								comment.attachments[index] = req.body.attachments[0]
							} else {
								for (let i = 0; i < req.body.attachments.length; i++) {
									//Checking if it already exists
									if (comment.attachments) {
										let index = comment.attachments
											.map(e => e.fileName)
											.indexOf(req.body.attachments[i].fileName)
										if (index !== -1) continue
									}
									//else push
									comment.attachments.push(req.body.attachments[i])
								}
							}
						}
						//Saving the comment
						comment
							.save()
							.then(comment => {
								return Comments.findById(comment._id).populate('author')
							})
							.then(comment => {
								res.statusCode = 200
								res.setHeader('Content-Type', 'application/json')
								res.json(comment)
							})
							.catch(err => next(err))
					} else {
						var err = new Error('You are not authorized to update this comment!')
						err.status = 403
						return next(err)
					}
				} else {
					err = new Error('Comment ' + req.params.commentId + ' not found')
					err.status = 404
					return next(err)
				}
			})
			.catch(err => next(err))
	})
	.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyMember, (req, res, next) => {
		// Include req.body.organization
		// Include req.body.delete = true to delete the whole comment
		// Include req.body.attachments = [{fileName:"name", fileLink:"link"}, ...] to delete those attachments
		Comments.findById(req.params.commentId)
			.then(comment => {
				if (comment) {
					if (comment.author.equals(req.user._id)) {
						if (req.body.delete) {
							comment.comment = '[Deleted]'
							comment.attachments = []
						} else if (req.body.attachments) {
							let fileName
							// let attachments = comment.attachments.map(e => e.fileName)
							for (let i = 0; i < req.body.attachments.length; i++) {
								fileName = req.body.attachments[i].fileName
								let index = comment.attachments.map(e => e.fileName).indexOf(fileName)
								comment.attachments.splice(index, 1)
							}
						} else {
							var err = new Error('Invalid request')
							err.status = 500
							next(err)
						}
						comment
							.save()
							.then(comment => {
								return Comments.findById(comment._id).populate('author')
							})
							.then(comment => {
								res.statusCode = 200
								res.setHeader('Content-Type', 'application/json')
								res.json(comment)
							})
							.catch(err => next(err))
					} else {
						var err = new Error('You are not authorized to delete this comment!')
						err.status = 403
						return next(err)
					}
				} else {
					err = new Error('Comment ' + req.params.commentId + ' not found')
					err.status = 404
					return next(err)
				}
			})
			.catch(err => next(err))
	})

module.exports = commentRouter
