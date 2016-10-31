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

  this._samiApi.setToken(this.loadToken())

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
  this._app.listen(this._config.port, this._config.host, function () {
    logger.info('Server is listening at http://%s:%s', localThis._config.host, localThis._config.port)
  })
}

LoginServer.prototype.checkToken = function (onSuccess, onError) {
  this._samiAuth.checkToken(this._samiApi.getToken(),
    onSuccess,
    onError)
}

LoginServer.prototype.loadToken = function () {
  try {
    logger.log('debug', 'Load token: ' + path.join(path.resolve(__dirname), 'token.json'))
    var tokenData = require(path.join(path.resolve(__dirname), 'token.json'))
    logger.log('debug', 'Load tokendata : ' + tokenData)
    return tokenData.token
  } catch (e) {
    return null
  }
}

LoginServer.prototype.saveToken = function () {
  fs.writeFile(
    path.join(path.resolve(__dirname), 'token.json'),
    JSON.stringify(
      {
        'token': this._samiApi.getToken()
      }
    ),
    'utf8',
    function (error) {
      if (error) {
        if (error.code === 'EACCES') {
          logger.log('error', 'Cant save token because cant access to file: ' + this._config.tokenFile)
        } else {
          throw error
        }
      }
      logger.log('debug', 'Token saved')
    })
}

LoginServer.prototype._defineRoutes = function () {
  var localThis = this

  this._app.get('/', function (req, res) {
    console.log('query parameters: ' + JSON.stringify(req.query))
    var iframe = ('iframe' in req.query) ? (req.query.iframe === 'true') : true
    console.log('iframe: ' + iframe)
    localThis.checkToken(
      // Token is ok
      function () {
        localThis._samiApi.getUser(
          // User info found
          function (user) {
            logger.info(user.data.data)
            res.render('loggedin.html', {
              userName: user.data.data.name,
              userFullname: user.data.data.fullName,
              userEmail: user.data.data.email,
              userId: user.data.data.id
            })
          },
          // User info not found
          function (error) {
            logger.error('Can not get user info: ' + error)
            res.redirect('/signin?iframe=' + iframe)
          }
        )
      },
      // Invalid token
      function () {
        logger.error('Invalid token')
        res.redirect('/signin?iframe=' + iframe)
      }
    )
  })

  this._app.get('/signin', function (req, res) {
    console.log('query parameters: ' + JSON.stringify(req.query))
    var iframe = ('iframe' in req.query) ? (req.query.iframe === 'true') : true
    console.log('iframe: ' + iframe)
    var url = localThis._config.authUrl +
      '/authorize?response_type=code&account_type=SAMI&client_id=' +
      localThis._config.clientId +
      '&redirect_uri=' + 'http://' + localThis._config.host + ':' + localThis._config.port + '/token' +
      ((localThis._config.testMode) ? '&test_css_blank=true' : '') +
      '&state=' + iframe

    var samsungUrl = localThis._config.authUrl +
      '/authorize?response_type=code&account_type=SAMSUNG&client_id=' +
      localThis._config.clientId +
      '&redirect_uri=' + 'http://' + localThis._config.host + ':' + localThis._config.port + '/token' +
      ((localThis._config.testMode) ? '&test_css_blank=true' : '') +
      '&state=' + iframe

    console.log('iframe: ' + iframe)
    if (!iframe) {
      console.log('iframe: ' + iframe)
      res.redirect(url)
    } else {
      res.render('home.html', {
        accountUrl: url,
        doneUrl: 'http://' + localThis._config.host + ':' + localThis._config.port + '/loggedin',
        samsungUrl: samsungUrl,
        iframe: iframe
      })
    }
  })

  this._app.get('/signup', function (req, res) {
    console.log('query parameters: ' + JSON.stringify(req.query))
    var iframe = ('iframe' in req.query) ? (req.query.iframe === 'true') : true
    console.log('iframe: ' + iframe)
    var url = localThis._config.authUrl +
      '/signup?response_type=code&account_type=SAMI&client_id=' +
      localThis._config.clientId +
      '&redirect_uri=' + 'http://' + localThis._config.host + ':' + localThis._config.port + '/signupdone' +
      ((localThis._config.testMode) ? '&test_css_blank=true' : '') +
      '&state=' + iframe
    if (!iframe) {
      res.redirect(url)
    } else {
      res.render('signup.html', {
        accountUrl: url,
        doneUrl: 'http://' + localThis._config.host + ':' + localThis._config.port + '/signupdone'
      })
    }
  })

  this._app.get('/forgotPassword', function (req, res) {
    var url = localThis._config.authUrl +
      '/forgotPassword?response_type=code&account_type=SAMI&client_id=' +
      localThis._config.clientId +
      '&redirect_uri=' + 'http://' + localThis._config.host + ':' + localThis._config.port + '/signupdone' +
      '&state='
    if (!req.query.iframe) {
      res.redirect(url)
    } else {
      res.render('forgot-password.html', {
        accountUrl: url,
        doneUrl: 'http://' + localThis._config.host + ':' + localThis._config.port + '/signupdone'
      })
    }
  })

  this._app.get('/signout', function (req, res) {
    /* CAN NOT SIGNOUT */
    /*localThis._samiAuth.signout(localThis._config.clientId,
      'http://' + localThis._config.host + ':' + localThis._config.port + '/token',
      function (response) {
        res.redirect('/')
      },
      function (error) {
        logger.error('cant signout: ' + error)
        res.redirect('/')
      }
    )*/

    localThis._samiApi.setToken(null)
    localThis.saveToken()
    res.redirect('/')

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

  this._app.get('/userinfo', function (req, res) {
    localThis._samiApi.getUser(
      // onSuccess
      function (response) {
        res.json(response)
      },
      // onError
      function (response) {
        res.json(response)
      }
    )
  })

  this._app.get('/signupdone', function (req, res) {
    var url = localThis._config.authUrl +
      '/resendActivation?response_type=code&account_type=SAMI&client_id=' +
      localThis._config.clientId +
      '&redirect_uri=' + 'http://' + localThis._config.host + ':' + localThis._config.port + '/signupdone' +
      '&state='
    res.render('signupdone.html', {
      accountUrl: url,
      doneUrl: 'http://' + localThis._config.host + ':' + localThis._config.port + '/signupdone'
    })
  })

  this._app.get('/forgotpassworddone', function (req, res) {
    res.send('You should have received an email to reset your password. Check your email.')
  })

  this._app.get('/loggedin', function (req, res) {
    console.log('query parameters: ' + JSON.stringify(req.query))
    var iframe = ('iframe' in req.query) ? (req.query.iframe === 'true') : true
    console.log('iframe: ' + iframe)
    if (!iframe) {
      res.redirect('/')
    } else {
      res.send('logged in')
    }
  })

  this._app.get('/loggedout', function (req, res) {
    res.send('logged out')
  })

  this._app.get('/token', function (req, res) {
    console.log('query parameters: ' + JSON.stringify(req.query))
    var iframe = ('state' in req.query) ? (req.query.state === 'true') : true
    console.log('iframe: ' + iframe)
    if (req.query.code) {
      localThis._samiAuth.exchangeCodeVersusToken(
        req.query.code,
        function success (token) {
          localThis._samiApi.setToken(token)
          localThis.saveToken()
          res.redirect('/loggedin?iframe=' + iframe)
        },
        function error (response) {
          res.redirect(response.statusCode, JSON.stringify(response))
        }
      )
    } else if (req.query.reset) {
      localThis._samiApi.setToken(null)
      res.redirect('/loggedout')
    } else if (req.query.status === 'logout') {
      // localThis._samiApi.setToken(null)
      res.redirect('/loggedout')
    } else if ('status' in req.query) { // an error has occured
      console.log('Error: ' + JSON.stringify(req.query))
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
