/**
 * Copyright 2020 - Offen Authors <hioffen@posteo.de>
 * SPDX-License-Identifier: Apache-2.0
 */

exports.serialize = serialize

function serialize (obj) {
  return Object.keys(obj)
    .map(function (key) {
      if (obj[key] === true) {
        return key
      }
      if (obj[key] === false) {
        return null
      }
      return key + '=' + obj[key]
    })
    .filter(Boolean)
    .join('; ')
}

exports.parse = parse

function parse (cookieString) {
  return cookieString.split(';')
    .reduce(function (acc, pair) {
      var chunks = pair.trim().split('=')
      acc[chunks[0]] = chunks[1]
      return acc
    }, {})
}
