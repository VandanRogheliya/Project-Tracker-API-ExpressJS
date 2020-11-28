module.exports = {
	secretKey: process.env.secretKey,
	mongoUrl: process.env.mongoURL,
	google: {
		clientId: process.env.googleClientId,
		clientSecret: process.env.googleClientSecret,
	},

	github: {
		clientId: process.env.githubClientId,
		clientSecret: process.env.githubClientSecret,
	},
}
