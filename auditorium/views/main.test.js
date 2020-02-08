var assert = require('assert')
var choo = require('choo')

var mainView = require('./main')

describe('views/main.js', function () {
  var app
  beforeEach(function () {
    app = choo()
    app.state.query = {}
    app._setCache(app.state)
  })

  describe('mainView', function () {
    it('renders 9 sections for operators', function () {
      app.state.model = {
        pageviews: [
          { date: '12.12.2019', pageviews: 12 }
        ],
        uniqueAccounts: 2,
        uniqueUsers: 4,
        uniqueSessions: 12,
        bounceRate: 0.5412,
        referrers: [{}],
        pages: [
          {
            pathname: '/',
            pageviews: 12,
            origin: 'www.puppies.com'
          }
        ],
        loss: 0.1234,
        account: {
          accountId: 'test'
        },
        retentionMatrix: [[1, 0, 0], [1, 0], [0]]
      }
      app.state.authenticatedUser = {
        accounts: [
          { accountId: 'test', name: 'Testing things' }
        ]
      }
      app.state.params = { accountId: 'test' }

      var result = mainView(app.state, app.emit)

      var headlines = result.querySelectorAll('h4')
      assert(headlines)
      assert.strictEqual(headlines.length, 9)

      var chart = result.querySelector('.chart')
      assert(chart)
    })

    it('renders 5 sections and an additional data management panel for users', function () {
      app.state.model = {
        pageviews: [
          { date: '12.12.2019', pageviews: 12 }
        ],
        uniqueAccounts: 2,
        uniqueUsers: 4,
        uniqueSessions: 12,
        bounceRate: 0.5412,
        referrers: [{}],
        loss: 0,
        pages: [
          {
            pathname: '/',
            pageviews: 12,
            origin: 'www.puppies.com'
          }
        ],
        allowsCookies: true,
        hasOptedIn: true,
        retentionMatrix: [[1, 0, 0], [1, 0], [0]]
      }
      app.state.authenticated = true

      var result = mainView(app.state, app.emit)

      var headlines = result.querySelectorAll('h4')
      assert(headlines)
      assert.strictEqual(headlines.length, 5)

      var chart = result.querySelector('.chart')
      assert(chart)

      var consentButton = result.querySelector('[data-role="consent"]')
      assert(consentButton)
    })
  })
})
