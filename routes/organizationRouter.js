const express = require('express')
const bodyParser = require('body-parser')
const Organizations = require('../models/organizations')
const authenticate = require('../authenticate')
const cors = require('./cors')
const Users = require('../models/users')

// Setting up router
const organizationRouter = express.Router()
organizationRouter.use(bodyParser.json())

//Routs
// Endpoint '/'
organizationRouter
	.route('/')
	.options(cors.corsWithOptions, (req, res) => {
		res.sendStatus(200)
	})
	.get(cors.cors, (req, res, next) => {
		Organizations.find(req.query)
			.populate('admins.user')
			.populate('members.user')
			.populate('creator')
			.then(organizations => {
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(organizations)
			})
			.catch(err => next(err))
	})
	.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
		let promisesAddingAdmin = []
		//Storing promises
		if (!req.body.admins) req.body.admins = []
		for (let i = 0; i < req.body.admins.length; i++) {
			promisesAddingAdmin.push(Users.findOne({ username: req.body.admins[i].user }))
		}

		//Resolving promises
		Promise.all(promisesAddingAdmin)
			.then(resultArr => {
				req.body.members = []
				req.body.admins = []
				//Editing in ID of admins and creator instead of username
				for (let i = 0; i < resultArr.length; i++) {
					req.body.admins.push({ user: resultArr[i]._id })
					req.body.members.push({ user: resultArr[i]._id })
				}

				if (req.body.admins.indexOf(req.user._id) === -1) req.body.admins.push({ user: req.user._id })
				if (req.body.members.indexOf(req.user._id) === -1) req.body.members.push({ user: req.user._id })

				req.body.creator = req.user._id

				//Creating an organization document in dataBase
				return Organizations.create(req.body)
			})
			.then(organization => {
				//Updating org in the users
				let promisesSetUsers = []
				for (let i = 0; i < organization.admins.length; i++) {
					promisesSetUsers.push(
						Users.findByIdAndUpdate(
							organization.admins[i].user,
							{
								$addToSet: {
									organizations: {
										organization: organization._id,
										admin: true,
									},
								},
							},
							{ new: true }
						)
					)
				}

				return [Promise.all(promisesSetUsers), organization._id]
			})
			.then(resultArr => {
				//Populating and returning organization created
				return Organizations.findById(resultArr[1])
					.populate('admins.user')
					.populate('creator')
					.populate('members.user')
			})
			.then(organization => {
				//Response sent
				res.statusCode = 200
				res.setHeader('Content-Type', 'application/json')
				res.json(organization)
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

// Endpoint '/:orgId'
organizationRouter
	.route('/:organizationId')
	.options(cors.corsWithOptions, (req, res) => {
		res.sendStatus(200)
	})
	.get(cors.cors, (req, res, next) => {
		if (req.params.organizationId === 'search') {
			Organizations.find({ $text: req.query })
				.populate('admins.user')
				.populate('members.user')
				.populate('creator')
				.then(organizations => {
					res.statusCode = 200
					res.setHeader('Content-Type', 'application/json')
					res.json(organizations)
				})
				.catch(err => next(err))
		} else {
			Organizations.findById(req.params.organizationId)
				.populate('admins.user')
				.populate('members.user')
				.populate('creator')
				.then(organization => {
					res.statusCode = 200
					res.setHeader('Content-Type', 'application/json')
					res.json(organization)
				})
				.catch(err => next(err))
		}
	})
	.post(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		res.statusCode = 403
		res.end('Post operations are not allowed')
	})
	.put(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		//Include req.body.organization = id of org in database
		//Include req.body.title or .details to edit them
		//Include req.body.admins[{user:username}...] to add Admins,
		//Include req.body.members[{user:username}...] to add members,

		if (req.body.title || req.body.details) {
			//Change in title or details
			Organizations.findByIdAndUpdate(req.params.organizationId, { $set: req.body }, { new: true })
				.populate('admins.user')
				.populate('members.user')
				.populate('creator')
				.then(organization => {
					res.statusCode = 200
					res.setHeader('Content-Type', 'application/json')
					res.json(organization)
				})
				.catch(err => next(err))
		} else if (req.body.members) {
			//Adding members
			let promisesAddingMembers = []
			//Storing promises
			Organizations.findById(req.params.organizationId)
				.populate('admins.user')
				.populate('members.user')
				.then(organization => {
					let members = organization.members.map(e => e.user.username)
					for (let i = 0; i < req.body.members.length; i++) {
						if (members.indexOf(req.body.members[i].user) === -1)
							promisesAddingMembers.push(Users.findOne({ username: req.body.members[i].user }))
					}

					Promise.all(promisesAddingMembers)
						.then(resultArr => {
							var promisesSaves = []

							for (let i = 0; i < resultArr.length; i++) {
								if (!resultArr[i]) continue
								if (!resultArr[i].organizations) resultArr[i].organizations = []

								organization.members.push({
									user: resultArr[i]._id,
								})
								resultArr[i].organizations.push({
									organization: organization._id,
									admin: false,
								})
								promisesSaves.push(resultArr[i].save())
							}
							promisesSaves.push(organization.save())

							return Promise.all(promisesSaves)
						})
						.then(resultArr => {
							res.statusCode = 200
							res.setHeader('Content-Type', 'application/json')
							res.json(resultArr[resultArr.length - 1])
						})
						.catch(err => next(err))
				})
				.catch(err => next(err))
		} else if (req.body.admins) {
			//Adding admins
			let promisesAddingAdmins = []
			//Storing promises
			Organizations.findById(req.params.organizationId)
				.populate('admins.user')
				.then(organization => {
					let admins = organization.admins.map(e => e.user.username)
					// let members = organization.members.map(e => e.user.username)
					for (let i = 0; i < req.body.admins.length; i++) {
						if (admins.indexOf(req.body.admins[i].user) === -1)
							promisesAddingAdmins.push(Users.findOne({ username: req.body.admins[i].user }))
					}

					Promise.all(promisesAddingAdmins)
						.then(resultArr => {
							let promisesSaves = []

							for (let i = 0; i < resultArr.length; i++) {
								if (!resultArr[i]) continue
								if (!resultArr[i].organizations) resultArr[i].organizations = []

								organization.admins.push({
									user: resultArr[i]._id,
								})

								let index = organization.members.map(e => e.user._id).indexOf(resultArr[i]._id)

								if (index === -1) {
									organization.members.push({
										user: resultArr[i]._id,
									})
								}

								let orgIndex = resultArr[i].organizations
									.map(e => e.organization)
									.indexOf(req.params.organizationId)

								if (orgIndex === -1) {
									resultArr[i].organizations.push({
										organization: organization._id,
										admin: true,
									})
								} else {
									resultArr[i].organizations[orgIndex].admin = true
								}

								promisesSaves.push(resultArr[i].save())
							}
							promisesSaves.push(organization.save())

							return Promise.all(promisesSaves)
						})
						.then(resultArr => {
							res.statusCode = 200
							res.setHeader('Content-Type', 'application/json')
							res.json(resultArr[resultArr.length - 1])
						})
						.catch(err => next(err))
				})
				.catch(err => next(err))
		} else {
			var err = new Error('Invalide request')
			err.status = 500
			next(err)
		}
	})
	.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
		//Include req.body.organization = id of org in database
		//Include req.body.delete = true | to delete org
		//Include req.body.members = [{"user":usernames}...] | to remove members
		//Include req.body.admins = [{"user":usernames}...] | to remove admins
		if (req.body.delete) {
			Organizations.findById(req.params.organizationId)
				.then(organization => {
					let promisesUsers = []
					for (let i = 0; i < organization.members.length; i++) {
						promisesUsers.push(Users.findById(organization.members[i].user))
					}

					Promise.all(promisesUsers)
						.then(resultArr => {
							let promisesSaves = []
							for (let i = 0; i < resultArr.length; i++) {
								let index = resultArr[i].organizations.map(e => e.organization).indexOf(organization._id)

								resultArr[i].organizations.splice(index, 1)

								promisesSaves.push(resultArr[i].save())
							}

							return Promise.all(promisesSaves)
						})
						.then(() => Organizations.findByIdAndDelete(req.params.organizationId))
						.then(resp => {
							res.statusCode = 200
							res.setHeader('Content-Type', 'application/json')
							res.json(resp)
						})
						.catch(err => next(err))
				})
				.catch(err => next(err))
		} else if (req.body.members) {
			//Removing members
			let promisesRemovingMembers = []
			//Storing promises
			Organizations.findById(req.params.organizationId)
				.populate('admins.user')
				.populate('members.user')
				.then(organization => {
					let admins = organization.admins.map(e => e.user.username)
					let members = organization.members.map(e => e.user.username)
					for (let i = 0; i < req.body.members.length; i++) {
						//Finding members to be removed are present and adding them to array
						if (
							admins.indexOf(req.body.members[i].user) !== -1 ||
							members.indexOf(req.body.members[i].user) !== -1
						)
							promisesRemovingMembers.push(Users.findOne({ username: req.body.members[i].user }))
					}

					Promise.all(promisesRemovingMembers)
						.then(resultArr => {
							let promisesSaves = []
							//Modifying the users and organization

							for (let i = 0; i < resultArr.length; i++) {
								//Finding index of each member in org and index of org in user
								let indexAdmin = organization.admins.map(e => e.user._id).indexOf(resultArr[i]._id)

								let indexMember = organization.members.map(e => e.user._id).indexOf(resultArr[i]._id)

								let indexOrg = resultArr[i].organizations.map(e => e.organization).indexOf(organization._id)

								//Deleting found index
								if (indexAdmin !== -1) organization.admins.splice(indexAdmin, 1)

								if (indexMember !== -1) organization.members.splice(indexMember, 1)

								if (indexOrg !== -1) resultArr[i].organizations.splice(indexOrg, 1)

								//Adding user to promise array
								promisesSaves.push(resultArr[i].save())
							}
							//Adding org to promise array
							promisesSaves.push(organization.save())

							return Promise.all(promisesSaves)
						})
						.then(resultArr => {
							res.statusCode = 200
							res.setHeader('Content-Type', 'application/json')
							res.json(resultArr[resultArr.length - 1])
						})
						.catch(err => next(err))
				})
				.catch(err => next(err))
		} else if (req.body.admins) {
			//Removing admins
			let promisesRemovingAdmins = []
			//Storing promises
			Organizations.findById(req.params.organizationId)
				.populate('admins.user')
				.then(organization => {
					let admins = organization.admins.map(e => e.user.username)
					for (let i = 0; i < req.body.admins.length; i++) {
						//Finding admins to be removed are present and adding them to array

						if (admins.indexOf(req.body.admins[i].user) !== -1)
							promisesRemovingAdmins.push(Users.findOne({ username: req.body.admins[i].user }))
					}

					Promise.all(promisesRemovingAdmins)
						.then(resultArr => {
							let promisesSaves = []
							//Modifying the users and organization

							for (let i = 0; i < resultArr.length; i++) {
								//Finding index of each admin in org and index of org in user
								let indexAdmin = organization.admins.map(e => e.user._id).indexOf(resultArr[i]._id)

								let indexOrg = resultArr[i].organizations.map(e => e.organization).indexOf(organization._id)

								if ((indexAdmin === -1) ^ (indexOrg === -1)) {
									var err = new Error('Error MissMatch admin in org model and user model')
									next(err)
								}

								//Deleting or modifying at found index
								if (indexAdmin !== -1) organization.admins.splice(indexAdmin, 1)

								if (indexOrg !== -1)
									resultArr[i].organizations[indexOrg] = {
										organization: organization._id,
										admin: false,
									}

								//Adding user to promise array
								promisesSaves.push(resultArr[i].save())
							}
							//Adding org to promise array
							promisesSaves.push(organization.save())

							return Promise.all(promisesSaves)
						})
						.then(resultArr => {
							res.statusCode = 200
							res.setHeader('Content-Type', 'application/json')
							res.json(resultArr[resultArr.length - 1])
						})
						.catch(err => next(err))
				})
				.catch(err => next(err))
		} else {
			var err = new Error('Invalide request')
			err.status = 500
			next(err)
		}
	})

module.exports = organizationRouter
