var logger = require('winston')
var Express = require('express')
var nunjucks = require('nunjucks')
var bodyParser = require('body-parser')
var path = require('path')
var fs = require('fs')

var ArtikCloudAuth = require('./artikcloud-auth')
var ArtikCloudApi = require('./artikcloud-api')

/**
 * Initialize Server.
 */
function LoginServer (config) {
  this._config = config

  this._artikcloudAuth = new ArtikCloudAuth(config)
  this._artikcloudApi = new ArtikCloudApi(config)

  this._artikcloudApi.setToken(this.loadToken())

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

/**
 * Start Login Server.
 */
LoginServer.prototype.start = function () {
  this._defineRoutes()
  var localThis = this
  this._app.listen(this._config.port, this._config.host, function () {
    logger.info('Server is listening at http://%s:%s', localThis._config.host, localThis._config.port)
  })
}

/**
 * Defines server routes
 */
LoginServer.prototype._defineRoutes = function () {
  var localThis = this

  /**
   * '/' -> check if we have a valid user token if yes, go to 'loggedin page' if not go to 'home'
   */
  this._app.get('/', function (req, res) {
    if (!localThis._artikcloudApi.getToken()) { // No token yet (user not connected
      res.redirect('/home')
    } else {
      localThis.checkToken(
        // Token is ok
        function () {
          localThis._artikcloudApi.getUser(
            // User info found
            function (user) {
              logger.info(user.data.data)
              res.render('loggedin.html', {
                userName: user.data.name,
                userFullname: user.data.fullName,
                userEmail: user.data.email,
                userId: user.data.id,
                authUrl: localThis._config.authUrl,
                testCSS: localThis._config.testCSS,
                clientId: localThis._config.clientId
              })
            },
            // User info not found
            function (error) {
              logger.error('Can not get user info: ' + error)
              res.redirect('/home')
            }
          )
        },
        // Invalid token
        function () {
          logger.warn('Invalid token')
          res.redirect('/home')
        }
      )
    }
  })

  /**
   * '/home' -> Displays login options (sign in, connect with Samsung and sign up)
   */
  this._app.get('/home', function (req, res) {
    res.render('home.html', {
      authUrl: localThis._config.authUrl,
      testCSS: localThis._config.testCSS,
      clientId: localThis._config.clientId
    })
  })

  /**
   * '/signin' -> Displays signin page with iframe
   */
  this._app.get('/signin', function (req, res) {
    res.render('signin.html', {
      authUrl: localThis._config.authUrl,
      testCSS: localThis._config.testCSS,
      clientId: localThis._config.clientId
    })
  })

  /**
   * '/signout' -> Call signout and erase token
   */
  this._app.get('/signout', function (req, res) {
    logger.info('set null in token')
    localThis._artikcloudApi.setToken('')
    localThis.saveToken()
    localThis._artikcloudAuth.signout(localThis._config.clientId,
      'http://' + localThis._config.host + ':' + localThis._config.port + '/redirect',
      function (response) {
        logger.info('signout response: ' + JSON.stringify(response))
        res.redirect('/')
      },
      function (error) {
        logger.error('cant signout: ' + JSON.stringify(error))
        res.redirect('/')
      }
    )
  })

  /**
   * '/userinfo' -> Get user info (if token is valid)
   */
  this._app.get('/userinfo', function (req, res) {
    localThis._artikcloudApi.getUser(
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

  /**
   * '/signupdone' -> redirect page when signup is done
   */
  this._app.get('/signupdone', function (req, res) {
    res.render('signupdone.html', {
      authUrl: localThis._config.authUrl,
      testCSS: localThis._config.testCSS,
      clientId: localThis._config.clientId
    })
  })

  /**
   * '/forgotpassworddone' -> redirect page when forget password email sent
   */
  this._app.get('/forgotpassworddone', function (req, res) {
    res.send('You should have received an email to reset your password. Check your email.')
  })

  /**
   * '/forgotpassworddone' -> redirect page when user is logged in
   */
  this._app.get('/loggedin', function (req, res) {
    res.redirect('/')
  })

  /**
   * '/loggedout' -> redirect page when user is logged out
   */
  this._app.get('/loggedout', function (req, res) {
    res.send('logged out')
  })

  /**
   * '/redirect' -> default redirect page
   */
  this._app.get('/redirect', function (req, res) {
    // OAuth 2 exchange code for token
    if (req.query.code) {
      localThis._artikcloudAuth.exchangeCodeVersusToken(
        req.query.code,
        function success (token) {
          localThis._artikcloudApi.setToken(token)
          localThis.saveToken()
          res.redirect('/')
        },
        function error (response) {
          res.render('error.html', {
            clientId: localThis._config.clientId,
            'errorMessage': 'Signin failed during OAuth 2 code exchange code for a token: error ' + response.statusCode + ', ' + response.data.error + '.'
          })
        }
      )
    } else if (req.query.reset) { // signout done
      localThis._artikcloudApi.setToken(null)
      res.redirect('/loggedout')
    } else if (req.query.status === 'logout') {
      res.redirect('/loggedout')
    } else if ('err_code' in req.query) { // an error has occured
      logger.info('Error: ' + req.query.err_code)
      var errors = {
        'fieldErrorMessages': [],
        clientId: localThis._config.clientId
      }
      for (var param in req.query) {
        if (req.query.hasOwnProperty(param) && param.startsWith('err_msg_')) {
          if (param === 'err_msg_') { // global error
            errors.errorMessage = req.query[param]
          } else { // field errors (filter out error code)
            errors.fieldErrorMessages.append({
              'field': param.substring('err_msg_'.length),
              'msg': req.query[param]
            })
          }
        }
      }

      res.render('error.html', errors)
    } else if (req.query.origin) { // default redirect at the end of a successful operation
      if (req.query.origin === 'resendactivation') {
        res.redirect('/signupdone')
      } else if (req.query.origin === 'forgotpassword') {
        res.render('home.html', {
          authUrl: localThis._config.authUrl,
          testCSS: localThis._config.testCSS,
          clientId: localThis._config.clientId,
          message: 'An email has been sent to reset your password. Check your Inbox.'
        })
      } else if (req.query.origin === 'resetpassword') {
        res.render('home.html', {
          authUrl: localThis._config.authUrl,
          testCSS: localThis._config.testCSS,
          clientId: localThis._config.clientId,
          message: 'Your password has been reset.'
        })
      } else {
        // default
        res.redirect('/')
      }
    } else if ('status' in req.query) { // an error has occured
      console.log('Error: ' + JSON.stringify(req.query))
      res.redirect('/')
    } else {
      var uri = localThis._artikcloudAuth.getAccessTokenUri('http://' + localThis._config.host + ':' + localThis._config.port + '/redirect?account_type=ARTIKCLOUD')
      res.redirect(uri)
    }
  })
}

/**
 * Check if token is valid.
 */
LoginServer.prototype.checkToken = function (onSuccess, onError) {
  this._artikcloudAuth.checkToken(this._artikcloudApi.getToken(),
    onSuccess,
    onError)
}

/**
 * Load token from JSON file.
 */
LoginServer.prototype.loadToken = function () {
  try {
    logger.log('debug', 'Load token: ' + path.join(path.resolve(__dirname), 'token.json'))
    var tokenData = require(path.join(path.resolve(__dirname), 'token.json'))
    return tokenData.token
  } catch (e) {
    return null
  }
}

/**
 * Save token from JSON file.
 */
LoginServer.prototype.saveToken = function () {
  fs.writeFile(
    path.join(path.resolve(__dirname), 'token.json'),
    JSON.stringify(
      {
        'token': this._artikcloudApi.getToken()
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

/**
 * ************************
 * Main
 * ************************
 */

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
