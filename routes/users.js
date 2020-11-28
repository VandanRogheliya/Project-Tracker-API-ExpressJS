var express = require('express')
var passport = require('passport')
var bodyParser = require('body-parser')
var Users = require('../models/users')
var Issues = require('../models/issues')
var Comments = require('../models/comments')
const cors = require('./cors')

const fs = require('fs')

var authenticate = require('../authenticate')
const multer = require('multer')

//For storing profile pictures
const storage = multer.diskStorage({
	// Destination of storage
	destination: (req, file, cb) => {
		cb(null, 'public/images')
	},

	// Renaming file
	filename: (req, file, cb) => {
		cb(null, Date.now() + file.originalname)
	},
})

// image filter, image must one of the following types
const imageFileFilter = (req, file, cb) => {
	if (!file.originalname.match(/\.(jpg|jpeg|png|PNG)$/)) {
		return cb(new Error('You can upload only image files!'), false)
	}
	cb(null, true)
}

// Specifing where to upload, applying constraints on type and size
const upload = multer({
	storage: storage,
	fileFilter: imageFileFilter,
	limits: {
		fileSize: 1024 * 1024 * 5,
	},
})

// Setting up router
var userRouter = express.Router()

userRouter.use(bodyParser.json())

userRouter.options('*', cors.corsWithOptions, (req, res) => {
	res.sendStatus(200)
})

// Routs
// All users
userRouter.get('/', cors.cors, (req, res, next) => {
	Users.find(req.query)
		.then(users => {
			res.statusCode = 200
			res.setHeader('Content-Type', 'application/json')
			res.json(users)
		})
		.catch(err => next(err))
})

//Sign Up
userRouter.post('/signup', upload.single('imageFile'), cors.corsWithOptions, (req, res, next) => {
	req.body.image = req.file.path
	Users.register(new Users(req.body), req.body.password, (err, user) => {
		if (err) {
			res.statusCode = 500
			res.setHeader('Content-Type', 'application/json')
			res.json({ err: err })
		} else {
			if (req.body.firstName) user.firstName = req.body.firstName
			if (req.body.lastName) user.lastName = req.body.lastName

			user.save((err, user) => {
				if (err) {
					res.statusCode = 500
					res.setHeader('Content-Type', 'application/json')
					res.json({ err: err })
				} else {
					res.statusCode = 200
					res.setHeader('Content-Type', 'application/json')
					res.json({ success: true, status: 'Registration Successful!' })
				}
			})
		}
	})
})

//Login
userRouter.post('/login', cors.corsWithOptions, (req, res, next) => {
	passport.authenticate('local', (err, user, info) => {
		if (err) {
			return next(err)
		}

		if (!user) {
			res.statusCode = 401
			res.setHeader('Content-Type', 'application/json')
			res.json({ success: false, status: 'Login Unsuccessful!', err: info })
		}

		req.logIn(user, err => {
			if (err) {
				res.statusCode = 401
				res.setHeader('Content-Type', 'application/json')
				res.json({ success: false, status: 'Login Unsuccessful!', err: 'Could not log in user!' })
			}

			const token = authenticate.getToken({ _id: req.user._id })
			res.statusCode = 200
			res.setHeader('Content-Type', 'application/json')
			res.json({ success: true, token: token, status: 'Logged in Successful!' })
		})
	})(req, res, next)
})

//Logout
userRouter.get('/logout', (req, res, next) => {
	if (req.user) {
		req.logout()
		res.redirect('/')
	}
	var err = new Error('You are not logged in!')
	err.status = 403
	next(err)
})

//Checks if JWT is still valid
// router.get('/checkJWTtoken', cors.corsWithOptions, (req, res) => {
userRouter.get('/checkJWTtoken', cors.cors, (req, res) => {
	passport.authenticate('jwt', { session: false }, (err, user, info) => {
		if (err) return next(err)

		if (!user) {
			res.statusCode = 401
			res.setHeader('Content-Type', 'application/json')
			return res.json({ status: 'JWT invalid!', success: false, err: info })
		} else {
			res.statusCode = 200
			res.setHeader('Content-Type', 'application/json')
			return res.json({ status: 'JWT valid!', success: true, user: user })
		}
	})(req, res)
})

// Searches, populates and sends the data
userRouter.get('/:userId', cors.cors, (req, res, next) => {
	if (req.params.userId === 'search') {
		Users.find({ $text: req.query })
			.then(users => {
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(users)
			})
			.catch(err => next(err))
	} else {
		Users.findById(req.params.userId)
			.then(user => {
				if (user) {
					Issues.find({ assignee: user._id, status: { $in: ['OPEN', 'REOPEN'] } })
						.then(issues => {
							user.issuesAssigned = []
							for (let i = 0; i < issues.length; i++) {
								user.issuesAssigned.push({ issue: issues[i]._id })
							}
							return Issues.find({ reporter: user._id })
						})
						.then(issues => {
							user.issuesFiled = []
							for (let i = 0; i < issues.length; i++) {
								user.issuesFiled.push({ issue: issues[i]._id })
							}
							return Issues.find({ assignee: user._id, status: 'RESOLVED' })
						})
						.then(issues => {
							user.patchesAccepted = []
							for (let i = 0; i < issues.length; i++) {
								user.patchesAccepted.push({ issue: issues[i]._id })
							}
							return Comments.find({ author: user._id })
						})
						.then(comments => {
							user.comments = []
							user.commentedOn = []
							let issuesSet = new Set()
							for (let i = 0; i < comments.length; i++) {
								user.comments.push({ issue: comments[i]._id })
								issuesSet.add(String(comments[i].issue._id))
							}
							issuesSet.forEach(issue => user.commentedOn.push({ issue: issue }))

							return user.save()
						})
						.then(user =>
							Users.findById(user._id)
								.populate('issuesAssigned.issue')
								.populate('issuesFiled.issue')
								.populate('commentedOn.issue')
								.populate('patchesAccepted.issue')
								.populate('comments.comment')
								.populate('organizations.organization')
						)
						.then(user => {
							res.statusCode = 200
							res.setHeader('Content-Type', 'application/json')
							res.json(user)
						})
						.catch(err => next(err))
				} else {
					var err = new Error('User not found')
					err.status = 404
					next(err)
				}
			})
			.catch(err => next(err))
	}
})

// Editing in data
userRouter.put(
	'/:userId',
	cors.corsWithOptions,
	authenticate.verifyUser,
	upload.single('imageFile'),
	(req, res, next) => {
		Users.findById(req.params.userId).then(user => {
			if (user._id.equals(req.params.userId)) {
				if (req.file) {
					req.body.image = req.file.filename

					if (req.body.image !== 'default.png') {
						fs.unlinkSync('public\\images\\' + user.image, err => {
							next(err)
						})
					}
				}
				Users.findByIdAndUpdate(req.params.userId, { $set: req.body }, { new: true, useFindAndModify: true })
					.then(user => {
						res.statusCode = 200
						// res.setHeader('Content-Type', 'application/json')
						res.json(user)
					})
					.catch(err => next(err))
				//do upload deleting of file and changing details
			} else {
				var err = new Error('You are not autherized')
				err.status = 403
				next(err)
			}
		})
	}
)

// calls authenticate.js's google OAuth
userRouter.get(
	'/google/oauth',
	cors.cors,
	passport.authenticate('google', {
		scope: ['profile'],
	})
)

// Redirect handler
userRouter.get('/google/redirect', cors.cors, passport.authenticate('google'), (req, res) => {
	if (req.user) {
		var token = authenticate.getToken({ _id: req.user._id })
		res.statusCode = 200
		res.setHeader('Content-Type', 'application/json')
		res.json({ success: true, accessToken: token, status: 'You are successfully logged in!' })
	}
})

// calls authenticate.js's github OAuth
userRouter.get('/github/oauth', cors.cors, passport.authenticate('github'))

// Redirect Handler
userRouter.get('/github/redirect', cors.cors, passport.authenticate('github'), (req, res) => {
	if (req.user) {
		var token = authenticate.getToken({ _id: req.user._id })
		res.statusCode = 200
		res.setHeader('Content-Type', 'application/json')
		res.json({ success: true, accessToken: token, status: 'You are successfully logged in!' })
	} else {
		var err = new Error('Error occured during OAuth')
		err.status = 500
		next(err)
	}
})

module.exports = userRouter
