var createError = require('http-errors')
var express = require('express')
var path = require('path')
var logger = require('morgan')
const mongoose = require('mongoose')
const passport = require('passport')
const config = require('./config')

// Routes
var indexRouter = require('./routes/index')
var usersRouter = require('./routes/users')
var commentRouter = require('./routes/commentRouter')
var issueRouter = require('./routes/issueRouter')
var organizationRouter = require('./routes/organizationRouter')
var projectRouter = require('./routes/projectRouter')
var requestRouter = require('./routes/requestRouter')

var app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use(passport.initialize())
app.use(passport.session())

app.use('/', indexRouter)
app.use('/api/users', usersRouter)

// Serving static files
app.use(express.static(path.join(__dirname, 'public')))

// Setup for mongoDB connection
const url = config.mongoUrl
const connectDB = mongoose.connect(url, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
})

//Routs
app.use('/api/comments', commentRouter)
app.use('/api/issues', issueRouter)
app.use('/api/organizations', organizationRouter)
app.use('/api/projects', projectRouter)
app.use('/api/requests', requestRouter)

// Connecting to MongoDB
connectDB.then(
	db => console.log('Connected to MongoDB!'),
	err => console.log(err)
)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message
	res.locals.error = req.app.get('env') === 'development' ? err : {}

	// render the error page
	res.status(err.status || 500)
	res.render('error')
})

module.exports = app
