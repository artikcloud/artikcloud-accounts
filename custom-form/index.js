var logger = require('winston')
var Express = require('express')
var nunjucks = require('nunjucks')
var bodyParser = require('body-parser')
var path = require('path')
var fs = require('fs')

var SamiAuth = require('./sami-auth')
var SamiApi = require('./sami-api')

function LoginServer (config) {
  this._config = config

  this._samiAuth = new SamiAuth(config)
  this._samiApi = new SamiApi(config)

  this._app = Express()
  this._app.use(bodyParser.json()) // to support JSON-encoded bodies
  this._app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
  }))
  this._app.use(Express.static('./html'))
  // Configure template engine
  nunjucks.configure('./html', {
    autoescape: true,
    express: this._app,
    watch: true,
    noCache: true
  })
}

LoginServer.prototype.start = function () {
  this._defineRoutes()

  var localThis = this
  var server = this._app.listen(this._config.port, this._config.host, function () {
    logger.info('Server is listening at http://%s:%s', localThis._config.host, localThis._config.port)
  })
}

LoginServer.prototype._defineRoutes = function () {
  var localThis = this

  this._app.get('/', function (req, res) {
    logger.log('debug', 'Token: ' + localThis._samiApi.getToken())
    res.render('login-api.html', {
      accountUrl: localThis._config.authUrl,
      clientId: localThis._config.clientId,
      samiApiUrl: localThis._config.apiUrl,
      token: localThis._samiApi.getToken()
    })
  })

  this._app.get('/redirect', function (req, res) {
    logger.log('debug', 'Token: ' + localThis._samiApi.getToken())
    res.render('login-api.html', {
      redirect: true,
      accountUrl: localThis._config.authUrl,
      clientId: localThis._config.clientId,
      samiApiUrl: localThis._config.apiUrl,
      token: localThis._samiApi.getToken()
    })
  })

  this._app.get('/token', function (req, res) {
    if (req.query.code) {
      localThis._samiAuth.exchangeCodeVersusToken(
        req.query.code,
        function success (token) {
          localThis._samiApi.setToken(token)
          res.redirect('/')
        },
        function error (response) {
          res.redirect(response.statusCode, JSON.stringify(response))
        }
      )
    } else if (req.query.reset) {
      localThis._samiApi.setToken(null)
      res.redirect('/')
    } else if (req.query.status == 'logout') {
      // localThis._samiApi.setToken(null)
      res.redirect('/')
    } else {
      var uri = localThis._samiAuth.getAccessTokenUri('http://' + localThis._config.host + ':' + localThis._config.port + '/token?account_type=SAMI')
      res.redirect(uri)
    }
  })
}

// Check if a config file was passed as a parameter
if (process.argv.length !== 3) {
  console.log('Usage: node <javascript filename> <config filename>')
  process.exit()
}

loadConfig(function (config) {
  initLogger(config, function (config) {
    var loginServer = new LoginServer(config)
    loginServer.start()
  })
})

function loadConfig (callback) {
  // Check if the file exists
  var filepath = process.argv[2]
  if (!path.isAbsolute(filepath)) {
    filepath = './' + filepath
  }
  fs.exists(filepath, function (exists) {
    if (!exists) {
      logger.log('error', "Config file (%s) doesn't exist", filepath)
      process.exit()
    } else {
      // Load config
      var config = require(filepath)
      logger.log('debug', 'Loaded: ', filepath)
      callback(config)
    }
  })
}

/**
 * Initialize Logger.
 */
function initLogger (config, callback) {
  logger.log('debug', 'Init Logger')
  var loggerDateFormater = function () {
    var date = new Date()
    var d = date.getDate()
    var m = date.getMonth() + 1
    var y = date.getFullYear()
    var h = date.getHours()
    var min = date.getMinutes()
    var s = date.getSeconds()
    return '' + y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d) + ' ' + (h <= 9 ? '0' + h : h) + ':' + (min <= 9 ? '0' + min : min) + ':' + (s <= 9 ? '0' + s : s)
  }
  logger.remove(logger.transports.Console)
  logger.add(logger.transports.Console, {
    level: config.log.logLevel,
    colorize: true,
    // timestamp: true,
    timestamp: loggerDateFormater
  })

  callback(config)
}
