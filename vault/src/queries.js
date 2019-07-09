var _ = require('underscore')
var Dexie = require('dexie')
var startOfDay = require('date-fns/start_of_day')
var endOfDay = require('date-fns/end_of_day')
var addDays = require('date-fns/add_days')

var getDatabase = require('./database')

exports.getDefaultStats = getDefaultStatsWith(getDatabase)
exports.getDefaultStatsWith = getDefaultStatsWith
function getDefaultStatsWith (getDatabase) {
  return function (accountId, query) {
    if (!accountId && accountId !== null) {
      return Promise.reject(
        new Error('Expected either an account id or null to be given, got: ' + accountId)
      )
    }

    var db = getDatabase(accountId)
    var table = db.events

    var numDays = (query && query.numDays) || 7
    var now = new Date()
    var beginning = startOfDay(addDays(now, -numDays))
    var lowerBound = beginning.toJSON()
    var upperBound = now.toJSON()

    var pageviews = Promise.all(Array.from({ length: numDays })
      .map(function (num, distance) {
        var date = addDays(now, -distance)
        var lowerBound = startOfDay(date).toJSON()
        var upperBound = endOfDay(date).toJSON()

        var pageviews = table
          .where('payload.timestamp')
          .between(lowerBound, upperBound)
          .count()

        var visitors = table
          .where('[payload.timestamp+userId]')
          .between([lowerBound, Dexie.minKey], [upperBound, Dexie.maxKey])
          .keys(uniqueKeysAt(1))

        var accounts = table
          .where('[payload.timestamp+accountId]')
          .between([lowerBound, Dexie.minKey], [upperBound, Dexie.maxKey])
          .keys(uniqueKeysAt(1))

        return Promise.all([pageviews, visitors, accounts])
          .then(function (values) {
            return {
              date: date.toLocaleDateString(),
              jsonDate: date.toJSON(),
              pageviews: values[0],
              visitors: values[1],
              accounts: values[2]
            }
          })
      }))
      .then(function (days) {
        return _.sortBy(days, 'jsonDate')
      })

    var uniqueUsers = table
      .where('[payload.timestamp+userId]')
      .between([lowerBound, Dexie.minKey], [upperBound, Dexie.maxKey])
      .keys(uniqueKeysAt(1))

    var uniqueAccounts = table
      .where('[payload.timestamp+accountId]')
      .between([lowerBound, Dexie.minKey], [upperBound, Dexie.maxKey])
      .keys(uniqueKeysAt(1))

    var uniqueSessions = table
      .where('[payload.timestamp+payload.sessionId]')
      .between([lowerBound, Dexie.minKey], [upperBound, Dexie.maxKey])
      .keys(uniqueKeysAt(1))

    var bounceRate = table
      .where('[payload.timestamp+payload.sessionId]')
      .between([lowerBound, Dexie.minKey], [upperBound, Dexie.maxKey])
      .keys(function (keys) {
        var sessions = _.countBy(keys, function (pair) {
          return pair[1]
        })
        sessions = Object.values(sessions)
        if (sessions.length === 0) {
          return 0
        }

        var bounces = sessions
          .filter(function (viewsInSession) {
            return viewsInSession === 1
          })
        return bounces.length / sessions.length
      })

    var referrers = table
      .where('payload.timestamp')
      .between(lowerBound, upperBound)
      .toArray(function (events) {
        const perHost = events
          .filter(function (event) {
            if (!event.payload || !event.payload.referrer) {
              return false
            }
            var referrerUrl = new window.URL(event.payload.referrer)
            var hrefUrl = new window.URL(event.payload.href)
            return referrerUrl.host !== hrefUrl.host
          })
          .map(function (event) {
            var url = new window.URL(event.payload.referrer)
            return url.host || url.href
          })
          .filter(function (referrerValue) {
            return referrerValue
          })
          .reduce(function (acc, referrerValue) {
            acc[referrerValue] = acc[referrerValue] || 0
            acc[referrerValue]++
            return acc
          }, {})
        const unique = Object.keys(perHost)
          .map(function (host) {
            return { host: host, pageviews: perHost[host] }
          })
        return _.sortBy(unique, 'pageviews').reverse()
      })

    var pages = table
      .where('[payload.timestamp+accountId+payload.href]')
      .between([lowerBound, Dexie.minKey, Dexie.minKey], [upperBound, Dexie.maxKey, Dexie.maxKey])
      .keys(function (keys) {
        var cleanedKeys = keys.map(function (pair) {
          var url = new window.URL(pair[2])
          var strippedHref = url.origin + url.pathname
          return [pair[1], strippedHref]
        })

        var byAccount = cleanedKeys.reduce(function (acc, next) {
          acc[next[0]] = acc[next[0]] || []
          acc[next[0]].push(next)
          return acc
        }, {})

        return _.chain(Object.values(byAccount))
          .map(function (pageviews) {
            var counts = _.countBy(pageviews, function (pageview) {
              return pageview[1]
            })
            return Object.keys(counts).map(function (url) {
              return { url: url, pageviews: counts[url] }
            })
          })
          .flatten(true)
          .sortBy('pageviews')
          .reverse()
          .value()
      })

    return Promise
      .all([
        uniqueUsers,
        uniqueAccounts,
        uniqueSessions,
        referrers,
        pages,
        pageviews,
        bounceRate
      ])
      .then(function (results) {
        return {
          uniqueUsers: results[0],
          uniqueAccounts: results[1],
          uniqueSessions: results[2],
          referrers: results[3],
          pages: results[4],
          pageviews: results[5],
          bounceRate: results[6]
        }
      })
  }
}

exports.getUserSecret = getUserSecretWith(getDatabase)
exports.getUserSecretWith = getUserSecretWith
function getUserSecretWith (getDatabase) {
  return function (accountId) {
    var db = getDatabase(accountId)
    return db.secrets
      .get(accountId)
      .then(function (result) {
        if (result) {
          return result.userSecret
        }
        return null
      })
  }
}

exports.putUserSecret = putUserSecretWith(getDatabase)
exports.putUserSecretWith = putUserSecretWith
function putUserSecretWith (getDatabase) {
  return function (accountId, userSecret) {
    var db = getDatabase(accountId)
    return db.secrets
      .put({
        accountId: accountId,
        userSecret: userSecret
      })
  }
}

exports.deleteUserSecret = deleteUserSecretWith(getDatabase)
exports.deleteUserSecretWith = deleteUserSecretWith
function deleteUserSecretWith (getDatabase) {
  return function (accountId) {
    var db = getDatabase(accountId)
    return db.secrets
      .delete(accountId)
  }
}

exports.getLatestEvent = getLatestEventWith(getDatabase)
exports.getLatestEventWith = getLatestEventWith
function getLatestEventWith (getDatabase) {
  return function (accountId) {
    var db = getDatabase(accountId)
    return db.events
      .orderBy('eventId')
      .last()
      .then(function (latestLocalEvent) {
        return latestLocalEvent || null
      })
  }
}

exports.getAllEventIds = getAllEventIdsWith(getDatabase)
exports.getAllEventIdsWith = getAllEventIdsWith
function getAllEventIdsWith (getDatabase) {
  return function (accountId) {
    var db = getDatabase(accountId)
    return db.events.toCollection().keys()
  }
}

exports.putEvents = putEventsWith(getDatabase)
exports.putEventsWith = putEventsWith
function putEventsWith (getDatabase) {
  return function (/* accountId, ...events */) {
    var args = [].slice.call(arguments)
    var accountId = args.shift()
    var db = getDatabase(accountId)
    return db.events.bulkAdd(args)
  }
}

exports.deleteEvents = deleteEventsWith(getDatabase)
exports.deleteEventsWith = deleteEventsWith
function deleteEventsWith (getDatabase) {
  return function (/* accountId, ...eventIds */) {
    var args = [].slice.call(arguments)
    var accountId = args.shift()
    var db = getDatabase(accountId)
    return db.events.bulkDelete(args)
  }
}

exports.purge = purgeWith(getDatabase)
exports.purgeWith = purgeWith
function purgeWith (getDatabase) {
  return function () {
    var db = getDatabase(null)
    return db.events.clear()
  }
}

function uniqueKeysAt (index) {
  return function (keys) {
    return _.unique(keys.map(function (pair) {
      return pair[index]
    })).length
  }
}
