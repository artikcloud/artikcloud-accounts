var logger = require('winston')
var https = null // will be set in SamiAuth()
var url = require('url')
var querystring = require('querystring')

module.exports = SamiAuth

// config:
// {
//  authUrl (ex: "https://accounts.samsungsami.io")
//  clientId
//  clientSecret
// }
function SamiAuth (config) {
  this._token = null
  this._config = config

  var urlObj = url.parse(this._config.authUrl)
  this._internalAuth = urlObj.hostname
  this._authProtocol = (urlObj.protocol === 'http:') ? 'http' : 'https'
  this._authHost = urlObj.hostname
  this._authPort = (urlObj.port) ? urlObj.port : (this._authProtocol === 'http') ? 80 : 443
  this._authPathPrefix = '' // urlObj.pathname
  https = (this._authProtocol === 'http') ? require('http') : require('https')
}

SamiAuth.prototype.getToken = function () {
  return this._token
}

SamiAuth.prototype.resetToken = function () {
  this._token = null
}

SamiAuth.prototype.getAccessTokenUri = function (redirectUri) {
  logger.info('Get Access token url')
  var scope = 'read,write'
  var responseType = 'code'

  var queryParams = {
    'client_id': this._config.clientId,
    'response_type': responseType,
    'redirect_uri': redirectUri,
    'scope': scope
  }
  var url = this._config.authUrl + '/authorize' + '?' + querystring.stringify(queryParams)
  logger.info('Redirecting to = %s', url)
  return url
}

SamiAuth.prototype.exchangeCodeVersusToken = function (code, onSuccess, onError) {
  logger.info('Exchanging code %s against token', code)
  var formData = {
    'client_id': this._config.clientId,
    'client_secret': this._config.clientSecret,
    'grant_type': 'authorization_code',
    'code': code
  }

  var localThis = this
  this._request(
    'POST',
    '/token',
    querystring.stringify(formData),
    // JSON.stringify(formData),
    function (response) {
      if (response.statusCode !== 200) {
        onError(response)
      } else {
        logger.debug('Exchange successfull!' + JSON.stringify(response))
        localThis._token = response.data.access_token
        logger.debug('token=' + localThis._token)
        onSuccess(response.data.access_token)
      }
    },
    onError
  )
}

SamiAuth.prototype.getErrorMessageFromResponse = function (response) {
  if ('data' in response && 'code' in response.data && 'message' in response.data) {
    return '[' + response.data.code + '] ' + response.data.message
  } else {
    return '[' + response.statusCode + '] ' + response.statusMessage
  }
}

SamiAuth.prototype._request = function (method, path, body, onSuccess, onError) {
  logger.log('debug', '===============')
  logger.log('debug', 'SAMI AUTH REQUEST')
  logger.log('debug', '  - Method: ' + method)
  logger.log('debug', '  - Endpoint: ' + this._authProtocol + '://' + this._authHost + ':' + this._authPort + this._authPathPrefix + path)
  if (body) {
    logger.log('debug', '  - Body: ' + body)
  }
  var req = https.request(
    {
      hostname: this._authHost,
      port: this._authPort,
      path: this._authPathPrefix + path,
      method: method,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: body
    },
    function (res) {
      var response = {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.headers
      }

      var buffer = ''
      res.on('data', function (chunk) {
        buffer += chunk
      })
      res.on('end', function () {
        response.data = JSON.parse(buffer)
        logger.log('debug', 'response: ' + JSON.stringify(response.data))
        if (response.statusCode === 200) {
          if (onSuccess) {
            onSuccess(response)
          }
        } else {
          if (onError) {
            onError(response)
          }
        }
      })
    }
  ).on('error', function (e) {
    if (onError) {
      var response = {
        statusCode: 500,
        statusMessage: 'InternalError: ' + e
      }
      onError(response)
    }
  })

  if (body) {
    req.write(body)
  }

  req.end()
}
