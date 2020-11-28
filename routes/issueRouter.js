const express = require('express')
const bodyParser = require('body-parser')
const Issues = require('../models/issues')
const authenticate = require('../authenticate')
const cors = require('./cors')
const Users = require('../models/users')

// Setting up router
const issueRouter = express.Router()
issueRouter.use(bodyParser.json())

// Routs
// End Point '/'
issueRouter
	.route('/')
	.options(cors.corsWithOptions, (req, res) => {
		res.sendStatus(200)
	})
	.get(cors.cors, (req, res, next) => {
		Issues.find(req.query)
			.populate('organization')
			.populate('project')
			.populate('reporter')
			.populate('assignee')
			.populate('reviewer')
			.then(issues => {
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(issues)
			})
			.catch(err => next(err))
	})
	.post(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyMember, (req, res, next) => {
		// Include req.body.organization
		Issues.create(req.body)
			.then(issue => {
				issue.reporter = req.user._id
				return issue.save()
			})
			.then(issue => {
				return Issues.findById(issue._id)
					.populate('organization')
					.populate('project')
					.populate('reporter')
					.populate('assignee')
					.populate('reviewer')
			})
			.then(issue => {
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(issue)
			})
			.catch(err => next(err))
	})
	.put(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		// Include req.body.organization
		res.statusCode = 403
		res.end('Put operations are not allowed')
	})
	.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		// Include req.body.organization
		res.statusCode = 403
		res.end('Delete operations are not allowed')
	})

// Endpoint '/:issueId'
issueRouter
	.route('/:issueId')
	.options(cors.corsWithOptions, (req, res) => {
		res.sendStatus(200)
	})
	.get(cors.cors, (req, res, next) => {
		if (req.params.issueId === 'search') {
			Issues.find({ $text: req.query })
				.populate('organization')
				.populate('project')
				.populate('reporter')
				.populate('assignee')
				.populate('reviewer')
				.then(issues => {
					res.statusCode = 200
					res.setHeader('Content-Type', 'application/json')
					res.json(issues)
				})
				.catch(err => next(err))
		} else {
			Issues.findById(req.params.issueId)
				.populate('organization')
				.populate('project')
				.populate('reporter')
				.populate('assignee')
				.populate('reviewer')
				.then(issue => {
					res.statusCode = 200
					res.setHeader('Content-Type', 'application/json')
					res.json(issue)
				})
				.catch(err => next(err))
		}
	})
	.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
		res.statusCode = 403
		res.end('Post operations are not allowed')
	})
	.put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
		//Include req.body.attachments = [{fileName:"name", fileLink:"link"}, ...] to add those attachments
		// Include req.body.attachment.edit = true and req.body.attachment = attachmentId to edit it.
		//Include req.body.title, details, status, deadline OR/AND tags to edit them
		//Include req.body.assignee OR reviewer = username to add them

		Issues.findById(req.params.issueId).then(issue => {
			if (issue) {
				let index = req.user.organizations.map(e => e.organization).indexOf(issue.organization)
				if (issue.reporter.equals(req.user._id) || (index >= 0 && req.user.organizations[index].admin)) {
					if (req.body.title || req.body.details || req.body.status || req.body.deadline || req.body.tags) {
						Issues.findByIdAndUpdate(req.params.issueId, { $set: req.body }, { new: true })
							.populate('organization')
							.populate('project')
							.populate('reporter')
							.populate('assignee')
							.populate('reviewer')
							.then(issue => {
								res.statusCode = 200
								res.setHeader('Content-Type', 'application/json')
								res.json(issue)
							})
							.catch(err => next(err))
					} else if (req.body.assignee || req.body.reviewer) {
						//Include either only assignee or only reviewer
						//Include organization
						let assigneeFlag = req.body.assignee ? true : false
						let username = assigneeFlag ? req.body.assignee : req.body.reviewer

						Users.findOne({ username })
							.then(user => {
								if (!user) {
									var err = new Error('User not found')
									err.status = 404
									return next(err)
								}

								let indexOrg = user.organizations.map(e => e.organization).indexOf(req.body.organization)

								if (indexOrg === -1) {
									var err = new Error('User not Authorized to become Assignee/Reviewer')
									err.status = 403
									return next(err)
								}

								if (!assigneeFlag && !user.organizations[indexOrg].admin) {
									var err = new Error('User not Authorized to become Reviewer')
									err.status = 403
									return next(err)
								}

								return Issues.findByIdAndUpdate(
									req.params.issueId,
									{ $set: assigneeFlag ? { assignee: user._id } : { reviewer: user._id } },
									{ new: true }
								)
									.populate('organization')
									.populate('project')
									.populate('reporter')
									.populate('assignee')
									.populate('reviewer')
							})
							.then(issue => {
								if (!issue) {
									var err = new Error('Issue not found')
									err.status = 404
									return next(err)
								} else {
									res.statusCode = 200
									res.setHeader('Content-Type', 'application/json')
									res.json(issue)
								}
							})
							.catch(err => next(err))
					} else if (req.body.attachments) {
						if (req.body.attachment.edit) {
							let index = issue.attachments.map(e => e._id).indexOf(req.body.attachment.attachmentId)

							issue.attachments[index].fileName = req.body.attachments[0].fileName
							issue.attachments[index].fileLink = req.body.attachments[0].fileLink

							issue.save().then(issue => {
								res.statusCode = 200
								res.setHeader('Content-Type', 'application/json')
								res.json(issue)
							})
						} else {
							for (let i = 0; i < req.body.attachments.length; i++) {
								//Checking if it already exists
								if (issue.attachments) {
									let index = issue.attachments.map(e => e.fileName).indexOf(req.body.attachments[i].fileName)
									if (index !== -1) continue
								}
								//else push
								issue.attachments.push(req.body.attachments[i])
							}
							issue.save().then(issue => {
								res.statusCode = 200
								res.setHeader('Content-Type', 'application/json')
								res.json(issue)
							})
						}
					} else {
						var err = new Error('Invalid Request')
						err.status = 500
						return next(err)
					}
				} else {
					var err = new Error('You are not authorized to update this issue!')
					err.status = 403
					return next(err)
				}
			} else {
				var err = new Error('Issue not found')
				err.status = 404
				return next(err)
			}
		})
	})
	.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		// Include req.body.organization
		//Include req.body.delete = true for deleting the issue
		//Include req.body.assignee = true for deleting assignee field
		//Include req.body.reviewer = true for deleting reviewer field
		// Include req.body.attachments = [{fileName:fileName},...] for deleting that attachments
		Issues.findById(req.params.issueId).then(issue => {
			if (issue) {
				let index = req.user.organizations.map(e => e.organizationId).indexOf(issue.organization)
				if (issue.reporter.equals(req.user._id) || (index >= 0 && req.user.organization[index].admin)) {
					if (req.body.delete) {
						Issues.findByIdAndRemove(req.params.issueId)
							.then(resp => {
								res.statusCode = 200
								res.setHeader('Content-Type', 'application/json')
								res.json(resp)
							})
							.catch(err => next(err))
					} else if (req.body.assignee || req.body.reviewer) {
						//Include either only assignee or only reviewer
						//Include organization
						let assigneeFlag = req.body.assignee ? true : false
						Issues.findByIdAndUpdate(
							req.params.issueId,
							{ $unset: assigneeFlag ? { assignee: '' } : { reviewer: '' } },
							{ new: true }
						)
							.populate('organization')
							.populate('project')
							.populate('reporter')
							.populate('assignee')
							.populate('reviewer')
							.then(issue => {
								if (!issue) {
									var err = new Error('Issue not found')
									err.status = 404
									return next(err)
								} else {
									res.statusCode = 200
									res.setHeader('Content-Type', 'application/json')
									res.json(issue)
								}
							})
							.catch(err => next(err))
					} else if (req.body.attachments) {
						let fileName
						for (let i = 0; i < req.body.attachments.length; i++) {
							fileName = req.body.attachments[i].fileName
							let index = issue.attachments.map(e => e.fileName).indexOf(fileName)
							issue.attachments.splice(index, 1)
						}
						issue.save().then(issue => {
							res.statusCode = 200
							res.setHeader('Content-Type', 'application/json')
							res.json(issue)
						})
					} else {
						var err = new Error('Invalid Request')
						err.status = 500
						return next(err)
					}
				} else {
					var err = new Error('You are not authorized to update this issue!')
					err.status = 403
					return next(err)
				}
			} else {
				var err = new Error('Issue not found')
				err.status = 404
				return next(err)
			}
		})
	})

module.exports = issueRouter
