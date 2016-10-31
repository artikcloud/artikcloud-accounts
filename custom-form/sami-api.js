var logger = require('winston')
var https = null // will be set in SamiApi()
var url = require('url')

// config:
// {
//  apiUrl (ex: "https://api.samsungsami.io/V1.1")
// }

module.exports = SamiApi

function SamiApi (config) {
  this._token = null
  this._config = config

  var urlObj = url.parse(this._config.apiUrl)
  this._apiProtocol = (urlObj.protocol === 'http:') ? 'http' : 'https'
  this._apiHost = urlObj.hostname
  this._apiPort = (urlObj.port) ? urlObj.port : (this._apiProtocol === 'http') ? 80 : 443
  this._apiPathPrefix = urlObj.pathname
  this._maxResultsPerPage = 100
  https = (this._apiProtocol === 'http') ? require('http') : require('https')
}

SamiApi.prototype.setToken = function (token) {
  this._token = token
}

SamiApi.prototype.getToken = function (token) {
  return this._token
}

SamiApi.prototype.getUser = function (onSuccess, onError) {
  this._request(
    'GET',
    '/users/self',
    null,
    onSuccess,
    onError
  )
}

SamiApi.prototype.getUserDevices = function (filter, onSuccess, onError) {
  logger.log('debug', 'getUserDevices')
  var local_this = this
  var devices = []

  // Get missing uid
  if (this._uid) {
    getUserDevicesWithUid(filter, 0, onSuccess, onError)
  } else {
    logger.log('debug', 'getUser')
    this.getUser(
      function (response) {
        local_this._uid = response.data.data.id
        logger.log('info', 'uid: ' + local_this._uid)
        getUserDevicesWithUid(filter, 0, onSuccess, onError)
      },
      function (response) {
        logger.log('error', local_this.getErrorMessageFromResponse(response))
        onError(response)
      }
    )
  }

  function getUserDevicesWithUid (filter, offset, onSuccess, onError) {
    logger.log('debug', 'getUserDevices ' + offset)
    local_this._request(
      'GET',
      '/users/' + local_this._uid + '/devices?offset=' + offset + '&count=' + local_this._maxResultsPerPage + '&includeProperties=false',
      null,
      function (response) {
        for (var i in response.data.data.devices) {
          if (!filter || filter(response.data.data.devices[i])) {
            devices.push(response.data.data.devices[i])
          }
        }

        if (response.data.count < local_this._maxResultsPerPage) {
          response.data.data.devices = devices
          response.data.total = devices.length
          response.data.offset = 0
          response.data.count
          onSuccess(response)
        } else {
          getUserDevicesWithUid(filter, offset + local_this._maxResultsPerPage, onSuccess, onError)
        }
      },
      onError
    )
  }
}

SamiApi.prototype.createDevice = function (dtid, name, onSuccess, onError) {
  this._request(
    'POST',
    '/devices',
    JSON.stringify({
      uid: this._uid,
      dtid: dtid,
      name: name
    }),
    onSuccess,
    onError
  )
}

SamiApi.prototype.getDevice = function (did, onSuccess, onError) {
  this._request(
    'GET',
    '/devices/' + did,
    null,
    onSuccess,
    onError
  )
}

SamiApi.prototype.getDeviceToken = function (did, onSuccess, onError) {
  var localThis = this
  this._request(
    'GET',
    '/devices/' + did + '/tokens',
    null,
    function (response) {
      if (response.data && response.data.data && !response.data.data.accessToken) {
        logger.log('error', 'Device token not found... generate token')
        localThis.createDeviceToken(did, onSuccess, onError)
      } else {
        onSuccess(response)
      }
    },
    function (response) {
      logger.log('error', 'getDeviceToken' + JSON.stringify(response))
      if (response.statusCode === 404 && response.data.error.code === 404) {
        logger.log('error', 'Device token not found... generate token')
        localThis.createDeviceToken(did, onSuccess, onError)
      } else {
        onError(response)
      }
    }
  )
}

SamiApi.prototype.createDeviceToken = function (did, onSuccess, onError) {
  this._request(
    'PUT',
    '/devices/' + did + '/tokens',
    null,
    onSuccess,
    onError
  )
}

SamiApi.prototype.getErrorMessageFromResponse = function (response) {
  if ('data' in response && 'code' in response.data && 'message' in response.data) {
    return '[' + response.data.code + '] ' + response.data.message
  } else {
    return '[' + response.statusCode + '] ' + response.statusMessage
  }
}

SamiApi.prototype._request = function (method, path, body, onSuccess, onError) {
  logger.log('debug', '===============')
  logger.log('debug', 'SAMI REQUEST')
  logger.log('debug', '  - Method: ' + method)
  logger.log('debug', '  - Endpoint: ' + this._apiProtocol + '://' + this._apiHost + ':' + this._apiPort + this._apiPathPrefix + path)
  if (body) {
    logger.log('debug', '  - Body: ' + body)
  }

  if (!body) {
    body = JSON.stringify({})
  }

  var req = https.request(
    {
      hostname: this._apiHost,
      port: this._apiPort,
      path: this._apiPathPrefix + path,
      method: method,
      headers: {
        'authorization': 'Bearer ' + this._token,
        'content-type': 'application/json'
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
        logger.log('debug', 'call: ' + path + ', response: ' + JSON.stringify(response.data))
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

  req.write(body)

  req.end()
}
