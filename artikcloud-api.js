var logger = require('winston')
var request = require('request')

var STRICT_SSL = true

// config:
// {
//  apiUrl (ex: 'https://api.artik.cloud/V1.1')
// }

module.exports = ArtikCloudApi

function ArtikCloudApi (config) {
  this._token = null
  this._config = config
}

ArtikCloudApi.prototype.setToken = function (token) {
  this._token = token
}

ArtikCloudApi.prototype.getToken = function (token) {
  return this._token
}

ArtikCloudApi.prototype.getUser = function (onSuccess, onError) {
  request({
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + this._token },
    url: this._config.apiUrl + '/users/self',
    strictSSL: STRICT_SSL
  }, function (error, response, body) {
    if (error) {
      onError(error)
    } else if (response.statusCode !== 200) {
      onError(body)
    } else {
      console.log(body)
      onSuccess(JSON.parse(response.body))
    }
  })
}

ArtikCloudApi.prototype.getHistogram = function (opts, onSuccess, onError) {
  request({
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + this._token },
    url: this._config.apiUrl + '/messages/analytics/histogram',
    strictSSL: STRICT_SSL,
    qs: opts
  }, function (error, response, body) {
    if (error) {
      onError(error)
    } else if (response.statusCode !== 200) {
      onError(body)
    } else {
      console.log(body)
      onSuccess(JSON.parse(response.body))
    }
  })
}

ArtikCloudApi.prototype.getUserDevices = function (filter, onSuccess, onError) {
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
    request({
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + this._token },
      url: this._config.apiUrl + '/users/' + local_this._uid + '/devices',
      strictSSL: STRICT_SSL,
      qs: {'offset': offset, 'count': local_this._maxResultsPerPage, 'includeProperties': false}
    }, function (error, response, body) {
      if (error) {
        onError(error)
      } else if (response.statusCode !== 200) {
        onError(body)
      } else {
        console.log(body)
        var json = JSON.parse(response.body)
        for (var i in json.data.devices) {
          if (!filter || filter(json.data.devices[i])) {
            devices.push(json.data.devices[i])
          }
        }

        if (json.count < local_this._maxResultsPerPage) {
          json.data.devices = devices
          json.total = devices.length
          json.offset = 0
          json.count
          onSuccess(devices)
        } else {
          getUserDevicesWithUid(filter, offset + local_this._maxResultsPerPage, onSuccess, onError)
        }
      }
    })
  }
}

ArtikCloudApi.prototype.createDevice = function (dtid, name, onSuccess, onError) {
  request({
    method: 'POST',
    url: this._config.apiUrl + '/devices',
    strictSSL: STRICT_SSL,
    headers: { 'Authorization': 'Bearer ' + this._token },
    json: {
      uid: this._uid,
      dtid: dtid,
      name: name
    }
  }, function (error, response, body) {
    if (error) {
      onError(error)
    } else if (response.statusCode !== 200) {
      onError(body)
    } else {
      console.log(body)
      onSuccess(JSON.parse(response.body))
    }
  })
}

ArtikCloudApi.prototype.getDevice = function (did, onSuccess, onError) {
  request({
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + this._token },
    url: this._config.apiUrl + '/devices' + did,
    strictSSL: STRICT_SSL
  }, function (error, response, body) {
    if (error) {
      onError(error)
    } else if (response.statusCode !== 200) {
      onError(body)
    } else {
      console.log(body)
      onSuccess(JSON.parse(response.body))
    }
  })
}

ArtikCloudApi.prototype.getDeviceToken = function (did, onSuccess, onError) {
  var self = this
  request({
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + this._token },
    url: this._config.apiUrl + '/devices/' + did + '/tokens',
    strictSSL: STRICT_SSL
  }).on('response', function (response) {
    if (response.data && response.data.data && !response.data.data.accessToken) {
      logger.log('error', 'Device token not found... generate token')
      self.createDeviceToken(did, onSuccess, onError)
    } else {
      onSuccess(response)
    }
  }, function (error, response, body) {
    if (error) {
      onError(error)
    } else if (response.statusCode === 404 && JSON.parse(response.body).error.code === 404) {
      logger.log('error', 'Device token not found... generate token')
      self.createDeviceToken(did, onSuccess, onError)
    } else if (response.statusCode !== 200) {
      onError(body)
    } else {
      console.log(body)
      onSuccess(JSON.parse(response.body))
    }
  })
}

ArtikCloudApi.prototype.createDeviceToken = function (did, onSuccess, onError) {
  request({
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + this._token },
    url: this._config.apiUrl + '/devices/' + did + '/tokens',
    strictSSL: STRICT_SSL
  }, function (error, response, body) {
    if (error) {
      onError(error)
    } else if (response.statusCode !== 200) {
      onError(body)
    } else {
      console.log(body)
      onSuccess(JSON.parse(response.body))
    }
  })
}

ArtikCloudApi.prototype.getErrorMessageFromResponse = function (response) {
  if ('data' in response && 'code' in response.data && 'message' in response.data) {
    return '[' + response.data.code + '] ' + response.data.message
  } else {
    return '[' + response.statusCode + '] ' + response.statusMessage
  }
}

