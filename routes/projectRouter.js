const express = require('express')
const bodyParser = require('body-parser')
const Projects = require('../models/projects')
const authenticate = require('../authenticate')
const cors = require('./cors')

// Setting up router
const projectRouter = express.Router()
projectRouter.use(bodyParser.json())

// Routs
// Endpoint '/'
projectRouter
	.route('/')
	.options(cors.corsWithOptions, authenticate.verifyUser, (req, res) => {
		res.sendStatus(200)
	})
	.get(cors.cors, (req, res, next) => {
		Projects.find(req.query)
			.populate('organization')
			.then(projects => {
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(projects)
			})
			.catch(err => next(err))
	})
	.post(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		//Include req.body.organization = organizationID
		Projects.create(req.body)
			.then(project => {
				Projects.findById(project._id)
					.populate('organization')
					.then(project => {
						res.statusCode = 200
						res.setHeader('Content-Type', 'application/json')
						res.json(project)
					})
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

// Endpoint '/:projectId'
projectRouter
	.route('/:projectId')
	.options(cors.corsWithOptions, (req, res) => {
		res.sendStatus(200)
	})
	.get(cors.cors, (req, res, next) => {
		if (req.params.projectId === 'search') {
			Projects.find({ $text: req.query })
				.populate('organization')
				.then(projects => {
					res.statusCode = 200
					res.setHeader('Content-Type', 'application/json')
					res.json(projects)
				})
				.catch(err => next(err))
		} else {
			Projects.findById(req.params.projectId)
				.populate('organization')
				.then(project => {
					res.statusCode = 200
					res.setHeader('Content-Type', 'application/json')
					res.json(project)
				})
				.catch(err => next(err))
		}
	})
	.post(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		// Include req.body.organization
		res.statusCode = 403
		res.end('Post operations are not allowed')
	})
	.put(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		//Include req.body.organization = organizationId
		Projects.findByIdAndUpdate(req.params.projectId, { $set: req.body }, { new: true })
			.populate('organization')
			.then(project => {
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(project)
			})
			.catch(err => next(err))
	})
	.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		//Include req.body.organization = organizationId
		Projects.findByIdAndDelete(req.params.projectId)
			.then(project => {
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(project)
			})
			.catch(err => next(err))
	})

module.exports = projectRouter
