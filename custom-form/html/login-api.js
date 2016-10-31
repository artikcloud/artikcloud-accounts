/* eslint-env browser, jquery */
/* global URI */
$(function () {
  var DATA = window.DATA || {CLIENT_ID: null, ACCOUNT_URL: null, SAMI_API_URL: null, TOKEN: null}
  var localUri = new URI()
  // remove queryString
  localUri.removeQuery(URI.parseQuery(localUri.search()))

  var queryParams = {
    'account_type': '',
    // 'test_css_blank': true,
    'client_id': DATA.CLIENT_ID,
    'redirect_uri': localUri.clone().filename('token').toString(),
    'state': ''
  }

  var defaultAjax = {
    crossdomain: true,
    cache: false,
    // required to keep Session-Cookie in request to account
    xhrFields: {
      withCredentials: true
    },
    headers: {
      'Authorization': 'Bearer ' + DATA.TOKEN
    }
  }

  function ajax (r) {
    function process (label, jqhxr, textstatus, data) {
      if (jqhxr.status === 303 || jqhxr.status === 301) {
        console.log(label + ': \n' + jqhxr.status + ':' + jqhxr.responseText + '\n' + textstatus + '\ndata: ' + data)
        ajax({
          url: jqhxr.statusText
        })
      } else {
        window.alert(label + ': \n' + jqhxr.status + ':' + jqhxr.responseText + '\n' + textstatus + '\ndata: ' + data)
      }
    }
    // an alternative could be to $.ajaxSetup(...)
    // using extend + defaultAjax doesn't change jQuery's defaults out of this scope.
    var req = $.extend({}, r, defaultAjax)
    $.ajax(req)
      .done(function (data, textstatus, jqhxr) {
        process('success', jqhxr, textstatus, data)
      })
      .fail(function (jqhxr, textstatus, data) {
        process('error', jqhxr, textstatus, data)
      })
  }

  // set form action
  function setActionInForms () {
    $('form').each(function () {
      if ($(this).attr('method') === 'GET') {
        $(this).children('input[type=hidden]').remove()
        for (var k in queryParams) {
          $('<input type="hidden" name="' + k + '" value="' + queryParams[k] + '" >').appendTo($(this))
        }
        $(this).attr('action', DATA.ACCOUNT_URL + '/' + $(this).attr('base-action'))
      } else {
        $(this).attr('action', DATA.ACCOUNT_URL + '/' + $(this).attr('base-action') + '?' + $.param(queryParams))
      }
    })
  }

  // set form action
  function setUserInfoInForms (user) {
    $('input[name=email]').val(user ? user.email : '')
    $('input[name=fullName]').val(user ? user.fullName : '')
    $('input[name=username]').val(user ? user.name : '')
    $('input[name=creationDate]').val(user ? user.createdOn : '')
  }

  function setUserProfileInForms (profile) {
    $('input[name=sex]').val(profile.sex ? profile.sex : '')
    $('input[name=birthDate]').val(profile.birthDate ? profile.birthDate : '')
    $('input[name=height]').val(profile.height ? profile.height : '')
    $('input[name=weight]').val(profile.weight ? profile.weight : '')
  }

  function setErrorUriInForms () {
    $('input[name=error_uri]').each(function () {
      $(this).attr('value', localUri.toString())
    })
  }
  // Change account type
  function setAccountType () {
    queryParams['account_type'] = $('#account').val()
    setActionInForms()
  }

  // Change content type
  function setContentType () {
    var contentType = $('#content-type').val()
    if (contentType === 'form') {
      // can't send a token remove FORM that needs a token
      $('.needToken form[method=POST]').hide()
      $('form').each(function () {
        $(this).unbind('submit')
      })
    } else {
      $('.needToken form[method=POST]').show()

      // Init forms
      $('form').each(function () {
        $(this).unbind('submit')
        $(this).on('submit', function (event) {
          var contentType = $('#content-type').val()
          var requestParams = {
            method: 'POST',
            url: $(this).attr('action')
          }

          if (contentType === 'ajax-form-html') {
            requestParams.dataType = 'text'
            requestParams.data = $(this).serialize()
          } else if (contentType === 'ajax-form-json') {
            requestParams.dataType = 'json'
            requestParams.data = $(this).serialize()
          } else if (contentType === 'ajax-json-json') {
            requestParams.contentType = 'application/json; charset=utf-8'
            requestParams.dataType = 'json'
            requestParams.data = {}
            $.each($(this).serializeArray(), function (_, keyValue) {
              requestParams.data[keyValue.name] = keyValue.value
            })
            requestParams.data = JSON.stringify(requestParams.data)
          }
          ajax(requestParams)
          event.preventDefault()
        })
      })
    }

    // EXCEPTION
    $('div.checkSession form').add($('div.checkToken form')).each(function () {
      $(this).unbind('submit')
      $(this).on('submit', function (event) {
        // var contentType = $('#content-type').val()
        var requestParams = {
          method: 'POST',
          url: $(this).attr('action')
        }

        requestParams.contentType = 'application/json; charset=utf-8'
        requestParams.dataType = 'json'
        requestParams.data = {}
        $.each($(this).serializeArray(), function (_, keyValue) {
          requestParams.data[keyValue.name] = keyValue.value
        })
        requestParams.data = JSON.stringify(requestParams.data)

        ajax(requestParams)
        event.preventDefault()
      })
    })
  }

  $('#content-type').change(function () {
    setContentType()
  })

  $('#account').change(function () {
    setAccountType()
  })

  $('#request_id').change(function () {
    queryParams['request_id'] = $('#request_id').val()
    setActionInForms()
  })

  // Init forms
  $('form').each(function () {
    $(this).attr('base-action', $(this).attr('action'))
  })

  function showErrorsFromUri () {
    var uri = new URI() // location.href
    var params = URI.parseQuery(uri.search())
    if (params.err__) {
      window.alert(JSON.stringify(params))
    }
  }

  function showUserInfo () {
    if (DATA.TOKEN) {
      var apiReq = {
        method: 'GET',
        dataType: 'json',
        cache: false,
        headers: {
          'Authorization': 'Bearer ' + DATA.TOKEN
        }
      }
      $.ajax($.extend({}, apiReq, {
        url: DATA.SAMI_API_URL + '/users/self'
      }))
        .done(function (data, textstatus, jqhxr) {
          var user = data.data
          $('#userInfo').text('Connected user is ' + user.email + ' - ' + user.fullName)
          setUserInfoInForms(user)
          $.ajax($.extend({}, apiReq, {
            url: DATA.SAMI_API_URL + '/users/' + user.id + '/profile'
          }))
            .done(function (data, textstatus, jqhxr) {
              setUserProfileInForms(data.data.profile)
            })
        })
        .fail(function (jqhxr, textstatus, data) {
          $('#userInfo').text('failed to get user info')
        })
    } else {
      $('#userInfo').text('No user authentified')
    }
  }
  setActionInForms()
  setAccountType()
  setContentType()
  setErrorUriInForms()
  showUserInfo()
  showErrorsFromUri()
})

function submitParentForm (item) {
  $(item).closest('form').submit()
}
