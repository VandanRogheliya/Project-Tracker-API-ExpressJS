const express = require('express')
const bodyParser = require('body-parser')
var authenticate = require('../authenticate')
const cors = require('./cors')
const Requests = require('../models/requests')

// Setting up router
const requestRouter = express.Router()

requestRouter.use(bodyParser.json())
// Routs
// Endpoint '/'
requestRouter
	.route('/')
	.options(cors.corsWithOptions, (req, res) => {
		res.sendStatus(200)
	})
	.get(cors.cors, (req, res, next) => {
		Requests.find(req.query)
			.populate('user')
			.then(requests => {
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(requests)
			})
			.catch(err => next(err))
	})
	.post(cors.cors, authenticate.verifyUser, (req, res, next) => {
		Requests.count(req.body)
			.then(countOfReq => {
				if (countOfReq === 0) {
					Requests.create(req.body)
						.then(request => {
							res.statusCode = 200
							res.setHeader('Content-Type', 'application/json')
							res.json(request)
						})
						.catch(err => next(err))
				} else {
					var err = new Error('Already requested')
					err.status = 403
					next(err)
				}
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

// Endpoint '/:reqId'
requestRouter
	.route('/:requestId')
	.options(cors.corsWithOptions, (req, res) => {
		res.sendStatus(200)
	})
	.get(cors.cors, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		Requests.findById(req.params.requestId)
			.populate('user')
			.populate('organization')
			.then(request => {
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(request)
			})
			.catch(err => next(err))
	})
	.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
		res.statusCode = 403
		res.end('Post operations are not allowed')
	})
	.put(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		// Include req.body.organization
		var url = 'http://localhost:5000/api'
		if (req.body.accept) {
			Requests.findByIdAndDelete(req.params.requestId)
				.then(request => {
					res.statusCode = 200
					res.setHeader('content-type', 'application/json')
					res.json(request)
				})
				.catch(err => next(err))
		} else {
			var err = new Error('Invalid request, req.body.accept must be true')
			err.status = 500
			next(err)
		}
	})
	.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		// Include req.body.organization
		Requests.findByIdAndDelete(req.params.requestId)
			.then(request => {
				res.statusCode = 200
				res.setHeader('content-type', 'application/json')
				res.json(request)
			})
			.catch(err => next(err))
	})

module.exports = requestRouter
