var serverReporter = require('../server-reporter')
var reporter = require('../reporter')

function reportersOut () {
  return serverReporter.apply({}, arguments).replace(/\r\v/g, '\n')
}

var ServerConnection = require('logux-sync').ServerConnection
var createServer = require('http').createServer
var SyncError = require('logux-sync').SyncError
var path = require('path')

var BaseServer = require('../base-server')
var Client = require('../client')

var app = new BaseServer({
  env: 'development',
  pid: 21384,
  nodeId: 'server:H1f8LAyzl',
  subprotocol: '2.5.0',
  supports: '2.x || 1.x'
})
app.listenOptions = { host: '127.0.0.1', port: 1337 }

var ws = {
  upgradeReq: {
    headers: { },
    connection: {
      remoteAddress: '127.0.0.1'
    }
  },
  on: function () { }
}

var authed = new Client(app, new ServerConnection(ws), 1)
authed.sync.remoteSubprotocol = '1.0.0'
authed.sync.remoteProtocol = [0, 0]
authed.id = '100'
authed.user = { }
authed.nodeId = '100:550e8400-e29b-41d4-a716-446655440000'

var noUserId = new Client(app, new ServerConnection(ws), 1)
noUserId.sync.remoteSubprotocol = '1.0.0'
noUserId.sync.remoteProtocol = [0, 0]
noUserId.user = { }
noUserId.nodeId = '550e8400-e29b-41d4-a716-446655440000'

var unauthed = new Client(app, new ServerConnection(ws), 1)

var ownError = new SyncError(authed.sync, 'timeout', 5000, false)
var clientError = new SyncError(authed.sync, 'timeout', 5000, true)

var originNow = reporter.now
beforeAll(function () {
  reporter.now = function () {
    return new Date((new Date()).getTimezoneOffset() * 60000)
  }
})
afterAll(function () {
  reporter.now = originNow
})

it('reports listen', function () {
  expect(reportersOut('listen', app)).toMatchSnapshot()
})

it('reports production', function () {
  var wss = new BaseServer({
    env: 'production',
    pid: 21384,
    nodeId: 'server:H1f8LAyzl',
    subprotocol: '1.0.0',
    supports: '1.x'
  })
  wss.listenOptions = { cert: 'A', host: '0.0.0.0', port: 1337 }

  expect(reportersOut('listen', wss)).toMatchSnapshot()
})

it('reports http', function () {
  var http = new BaseServer({
    env: 'development',
    pid: 21384,
    nodeId: 'server:H1f8LAyzl',
    subprotocol: '1.0.0',
    supports: '1.x'
  })
  http.listenOptions = { server: createServer() }

  expect(reportersOut('listen', http)).toMatchSnapshot()
})

it('reports connect', function () {
  expect(reportersOut('connect', app, '127.0.0.1')).toMatchSnapshot()
})

it('reports authenticated', function () {
  expect(reportersOut('authenticated', app, authed)).toMatchSnapshot()
})

it('reports authenticated without user ID', function () {
  expect(reportersOut('authenticated', app, noUserId)).toMatchSnapshot()
})

it('reports bad authenticated', function () {
  expect(reportersOut('unauthenticated', app, authed)).toMatchSnapshot()
})

it('reports disconnect', function () {
  expect(reportersOut('disconnect', app, authed)).toMatchSnapshot()
})

it('reports disconnect from unauthenticated user', function () {
  expect(reportersOut('disconnect', app, unauthed)).toMatchSnapshot()
})

it('reports error', function () {
  var file = __filename
  var jest = path.join(__dirname, '..', 'node_modules', 'jest', 'index.js')
  var error = new Error('Some mistake')
  error.stack = error.name + ': ' + error.message + '\n' +
  '    at Object.<anonymous> (' + file + ':28:13)\n' +
  '    at Module._compile (module.js:573:32)\n' +
  '    at at runTest (' + jest + ':50:10)\n' +
  '    at process._tickCallback (internal/process/next_tick.js:103:7)'

  var out = reportersOut('runtimeError', app, undefined, error)
  expect(out).toMatchSnapshot()
})

it('reports client error', function () {
  var out = reportersOut('clientError', app, authed, clientError)
  expect(out).toMatchSnapshot()
})

it('reports synchroniation error', function () {
  var out = reportersOut('syncError', app, authed, ownError)
  expect(out).toMatchSnapshot()
})

it('reports error from unautheficated user', function () {
  var out = reportersOut('syncError', app, unauthed, clientError)
  expect(out).toMatchSnapshot()
})

it('reports destroy', function () {
  expect(reportersOut('destroy', app)).toMatchSnapshot()
})
