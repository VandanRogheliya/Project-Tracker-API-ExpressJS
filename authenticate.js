const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const Users = require('./models/users')
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const jwt = require('jsonwebtoken')
const GoogleStrategy = require('passport-google-oauth2').Strategy
const GitHubStrategy = require('passport-github').Strategy
const config = require('./config')

passport.use(new LocalStrategy(Users.authenticate()))
passport.serializeUser(Users.serializeUser())
passport.deserializeUser(Users.deserializeUser())

exports.getToken = user => {
	return jwt.sign(user, config.secretKey, { expiresIn: 86400 })
}

var opts = {
	jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
	secretOrKey: config.secretKey,
}

exports.jwtPassport = passport.use(
	new JwtStrategy(opts, (jwt_payload, done) => {
		Users.findOne({ _id: jwt_payload._id }, (err, user) => {
			if (err) {
				return done(err, false)
			} else if (user) {
				return done(null, user)
			} else {
				return done(null, false)
			}
		})
	})
)

exports.verifyUser = passport.authenticate('jwt', { session: false })

//Verify Admin
exports.verifyAdmin = (req, res, next) => {
	let index = req.user.organizations.map(e => e.organization).indexOf(req.body.organization)
	if (index == -1) {
		var err = new Error('Internal Server Error')
		err.status = 500
		return next(err)
	}
	let admin = req.user.organizations[index].admin
	if (admin) next()
	else {
		var err = new Error('You are not autherized')
		err.status = 403
		return next(err)
	}
}

//Verify member of an organization
exports.verifyMember = (req, res, next) => {
	let index = req.user.organizations.map(e => e.organization).indexOf(req.body.organization)
	if (index == -1) {
		var err = new Error('You are not autherized')
		err.status = 403
		return next(err)
	} else {
		next()
	}
}

// OAuth Google
exports.googlePassport = passport.use(
	new GoogleStrategy(
		{
			clientID: config.google.clientId,
			clientSecret: config.google.clientSecret,
			callbackURL: (process.env.clientURL || 'http://localhost:3000') + '/auth/login',
		},
		(accessToken, refreshToken, profile, done) => {
			Users.findOne({ googleId: profile.id })
				.then(user => {
					if (user) {
						return done(null, user)
					} else {
						var user = new Users({ googleId: profile.id })
						user.firstName = profile.name.givenName
						user.lastName = profile.name.familyName
						user.username = profile.id
						user.save((err, user) => {
							if (err) return done(err, false)
							else return done(null, user)
						})
					}
				})
				.catch(err => done(err, null))
		}
	)
)

// OAuth Github
exports.gitHubPassport = passport.use(
	new GitHubStrategy(
		{
			clientID: config.github.clientId,
			clientSecret: config.github.clientSecret,
			callbackURL: (process.env.clientURL || 'http://localhost:3000') + '/auth/login',
		},
		(accessToken, refreshToken, profile, done) => {
			Users.findOne({ username: profile.username })
				.then(user => {
					console.log('In Auth GIT')
					if (user) {
						return done(null, user)
					} else {
						var user = new Users({ githubId: profile.id })
						user.username = profile.id
						user.email = profile.email
						user.save((err, user) => {
							if (err) return done(err, false)
							else return done(null, user)
						})
					}
				})
				.catch(err => done(err, null))
		}
	)
)
