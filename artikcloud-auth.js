var logger = require('winston')
var querystring = require('querystring')
var request = require('request')

module.exports = ArtikCloudAuth

var STRICT_SSL = true

// config:
// {
//  authUrl (ex: 'https://accounts.artik.cloud')
//  clientId
//  clientSecret
// }
function ArtikCloudAuth (config) {
  this._token = null
  this._config = config
}

ArtikCloudAuth.prototype.getToken = function () {
  return this._token
}

ArtikCloudAuth.prototype.resetToken = function () {
  this._token = null
}

ArtikCloudAuth.prototype.getAccessTokenUri = function (redirectUri) {
  logger.info('Get Access token url')
  var scope = 'read,write'
  var responseType = 'code'

  var queryParams = {
    'client_id': this._config.clientId,
    'response_type': responseType,
    'redirect_uri': 'http://localhost:4444/redirect',
    'scope': scope
  }
  var url = this._config.authUrl + '/authorize' + '?' + querystring.stringify(queryParams)
  logger.info('Redirecting to = %s', url)
  return url
}

ArtikCloudAuth.prototype.exchangeCodeVersusToken = function (code, onSuccess, onError) {
  logger.info('Exchanging code %s against token', code)
  var self = this
  var req = request({
    method: 'POST',
    url: this._config.authUrl + '/token',
    strictSSL: STRICT_SSL,
    form: {
      'client_id': this._config.clientId,
      'client_secret': this._config.clientSecret,
      'grant_type': 'authorization_code',
      'code': code
    }
  },
  function (error, response, body) {
    logger.info('Exchanging code %s against token: %s,%s, %s', code, error, response, body)
    if (error) {
      onError({ 'statusCode': 500, 'data': { 'error': error } })
    } else if (response.statusCode !== 200) {
      console.log('response:' + response.body)
      onError(response)
    } else {
      var json = JSON.parse(body)
      logger.debug('Exchange successfull!' + JSON.stringify(response))
      self._token = json.access_token
      logger.debug('token=' + self._token)
      onSuccess(self._token)
    }
  })

  console.log('REQUEST: ' + JSON.stringify(req))
}

ArtikCloudAuth.prototype.checkToken = function (token, onSuccess, onError) {
  request({
    method: 'POST',
    url: this._config.authUrl + '/checkToken',
    strictSSL: STRICT_SSL,
    json: {
      'token': token
    }
  },
  function (error, response, body) {
    if (error) {
      onError({ 'statusCode': 500, 'data': { 'error': error } })
    } else if (response.statusCode !== 200) {
      onError(response)
    } else {
      onSuccess(response)
    }
  })
}

ArtikCloudAuth.prototype.signout = function (clientId, redirectUri, onSuccess, onError) {
  request({
    method: 'POST',
    url: this._config.authUrl + '/signout',
    strictSSL: STRICT_SSL,
    form: {
      'client_id': clientId,
      'redirect_uri': redirectUri,
      'account_type': 'ARTIKCLOUD'
    }
  },
  function (error, response, body) {
    if (error) {
      onError({ 'statusCode': 500, 'data': { 'error': error } })
    } else if (response.statusCode !== 200) {
      onError(response)
    } else {
      onSuccess(response)
    }
  })
}

ArtikCloudAuth.prototype.checkSession = function (token, onSuccess, onError) {
  request({
    method: 'POST',
    url: this._config.authUrl + '/checkSession',
    strictSSL: STRICT_SSL,
    json: {
      'token': token
    }
  },
  function (error, response, body) {
    if (error) {
      onError({ 'statusCode': 500, 'data': { 'error': error } })
    } else if (response.statusCode !== 200) {
      onError(response)
    } else {
      onSuccess(response)
    }
  })
}

ArtikCloudAuth.prototype.getErrorMessageFromResponse = function (response) {
  if ('data' in response && 'code' in response.data && 'message' in response.data) {
    return '[' + response.data.code + '] ' + response.data.message
  } else {
    return '[' + response.statusCode + '] ' + response.statusMessage
  }
}
