const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const { test } = require('node:test')
const ts = require('typescript')

const sourcePath = path.resolve(__dirname, '../api/axios/axios.ts')

function loadClient(refresh) {
  const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: sourcePath,
  }).outputText
  const clients = []
  const axios = { __esModule: true, default: { create: () => {
    const client = (request) => { client.retries.push(request); return Promise.resolve({ data: { ok: true } }) }
    client.retries = []
    client.interceptors = { request: { use: () => undefined }, response: { use: (_ok, reject) => { client.reject = reject } } }
    clients.push(client)
    return client
  } } }
  const originalLoad = Module._load
  const events = []
  Module._load = function (request, parent, isMain) {
    if (request === 'axios') return axios
    if (request === '@/config/environment') return { environment: { apiBaseUrl: 'https://api.example.test/api/v1' } }
    if (request === '@/lib/auth/auth-session') return { AUTH_EXPIRED_EVENT: 'seller:auth-expired' }
    if (request === '@/lib/auth/auth-storage') return { authStorage: { getAccessToken: () => '', setAccessToken: () => undefined } }
    if (request === '@/lib/api/errors') return { ApiError: class ApiError extends Error { constructor(message, status) { super(message); this.status = status } } }
    return originalLoad.call(this, request, parent, isMain)
  }
  const oldWindow = global.window
  global.window = { dispatchEvent: (event) => events.push(event.type) }
  try {
    const instance = new Module(sourcePath, module)
    instance.filename = sourcePath
    instance.paths = Module._nodeModulePaths(path.dirname(sourcePath))
    instance._compile(compiled, sourcePath)
    clients[1].post = refresh
    return { client: clients[0], events, restore: () => { Module._load = originalLoad; global.window = oldWindow } }
  } finally { Module._load = originalLoad }
}

test('refreshes once and retries each concurrent seller request', async () => {
  let calls = 0
  let resolveRefresh
  const { client, restore } = loadClient(() => {
    calls += 1
    return new Promise((resolve) => { resolveRefresh = () => resolve({ data: { data: { accessToken: 'fresh-token' } } }) })
  })
  try {
    const first = client.reject({ config: { url: '/vendor/orders', headers: {} }, response: { status: 401 } })
    const second = client.reject({ config: { url: '/vendor/products', headers: {} }, response: { status: 401 } })
    resolveRefresh()
    await Promise.all([first, second])
    assert.equal(calls, 1)
    assert.deepEqual(client.retries.map((request) => request.headers.Authorization), ['Bearer fresh-token', 'Bearer fresh-token'])
  } finally { restore() }
})

test('only emits terminal expiry when seller refresh fails', async () => {
  const { client, events, restore } = loadClient(async () => { throw new Error('expired') })
  try {
    await assert.rejects(client.reject({ config: { url: '/vendor/orders', headers: {} }, response: { status: 401 } }))
    assert.deepEqual(events, ['seller:auth-expired'])
  } finally { restore() }
})
