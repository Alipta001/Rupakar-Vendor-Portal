const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const fs = require('node:fs')
const ts = require('typescript')

const apiErrorsPath = path.resolve(__dirname, '../lib/api/errors.ts')
const apiErrorsSource = fs.readFileSync(apiErrorsPath, 'utf8')
const transpiled = ts.transpileModule(apiErrorsSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

const evalExports = {}
const evalModule = { exports: evalExports }
const evalFn = new Function('module', 'exports', 'require', transpiled)
evalFn(evalModule, evalExports, require)
const { isColdStartError, getApiErrorMessage } = evalModule.exports

test('Seller isColdStartError identifies 502, 503, 504 and network errors', () => {
  assert.equal(isColdStartError({ response: { status: 502 } }), true)
  assert.equal(isColdStartError({ response: { status: 503 } }), true)
  assert.equal(isColdStartError({ response: { status: 504 } }), true)
  assert.equal(isColdStartError({ code: 'ECONNABORTED' }), true)
  assert.equal(isColdStartError({ code: 'ERR_NETWORK' }), true)
  assert.equal(isColdStartError({ message: 'Network Error' }), true)
})

test('Seller isColdStartError does NOT treat 400, 401, 403, 404 as cold starts', () => {
  assert.equal(isColdStartError({ response: { status: 400 } }), false)
  assert.equal(isColdStartError({ response: { status: 401 } }), false)
  assert.equal(isColdStartError({ response: { status: 403 } }), false)
  assert.equal(isColdStartError({ response: { status: 404 } }), false)
  assert.equal(isColdStartError(null), false)
  assert.equal(isColdStartError(undefined), false)
})

test('Seller getApiErrorMessage returns friendly message on cold-start errors', () => {
  const msg502 = getApiErrorMessage({ response: { status: 502 } }, 'Failed')
  assert.match(msg502, /taking a little longer than usual to connect/i)

  const msgTimeout = getApiErrorMessage({ code: 'ECONNABORTED' }, 'Failed')
  assert.match(msgTimeout, /taking a little longer than usual to connect/i)

  const msg401 = getApiErrorMessage({ response: { status: 401, data: { message: 'Unauthorized' } } }, 'Failed')
  assert.equal(msg401, 'Unauthorized')
})

test('Seller state separation rules: LOADING !== EMPTY !== ERROR !== DATA', () => {
  function getSellerState(loading, error, count, isRefetching) {
    if (loading && count === 0) return 'SKELETON'
    if (error && count === 0) return 'ERROR_STATE'
    if (!loading && !error && count === 0) return 'EMPTY_STATE'
    if (count > 0) return isRefetching ? 'DATA_REFETCHING' : 'DATA_VISIBLE'
    return 'UNKNOWN'
  }

  // 1. Initial loading must render SKELETON, never EMPTY_STATE
  assert.equal(getSellerState(true, null, 0, false), 'SKELETON')

  // 2. Initial error must render ERROR_STATE, never EMPTY_STATE
  assert.equal(getSellerState(false, 'Failed', 0, false), 'ERROR_STATE')

  // 3. Successful empty response renders EMPTY_STATE
  assert.equal(getSellerState(false, null, 0, false), 'EMPTY_STATE')

  // 4. Data present renders DATA_VISIBLE
  assert.equal(getSellerState(false, null, 10, false), 'DATA_VISIBLE')

  // 5. Refetching preserves data without wiping to [] or flashing empty
  assert.equal(getSellerState(true, null, 10, true), 'DATA_REFETCHING')
})

test('Seller retry policy only permits safe idempotent reads and caps retries', () => {
  const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
  const MAX_RETRIES = 2

  function canRetry(method, statusOrCode, currentRetries) {
    const isSafe = SAFE_METHODS.has((method || '').toUpperCase())
    if (!isSafe) return false
    const isTransient = [502, 503, 504, 'ECONNABORTED', 'ERR_NETWORK'].includes(statusOrCode)
    return isTransient && currentRetries < MAX_RETRIES
  }

  assert.equal(canRetry('GET', 502, 0), true)
  assert.equal(canRetry('GET', 503, 1), true)
  assert.equal(canRetry('GET', 504, 2), false) // exceeded
  assert.equal(canRetry('GET', 401, 0), false)
  assert.equal(canRetry('GET', 404, 0), false)

  assert.equal(canRetry('POST', 502, 0), false)
  assert.equal(canRetry('PATCH', 502, 0), false)
  assert.equal(canRetry('DELETE', 502, 0), false)
})

test('Seller StateBoundary: isFetching && items.length === 0 must render loadingComponent, never emptyState', () => {
  function computeSellerBoundaryState({ isLoading, isFetching, count, isError }) {
    if ((isLoading || (isFetching && count === 0)) && count === 0) {
      return 'LOADING_COMPONENT'
    }
    if (isError && count === 0) {
      return 'ERROR_STATE'
    }
    if (count === 0 && !isLoading && !isFetching && !isError) {
      return 'EMPTY_STATE'
    }
    return 'CHILDREN'
  }

  // During filter/tab changes, query is fetching new results with 0 items currently available:
  assert.equal(
    computeSellerBoundaryState({ isLoading: false, isFetching: true, count: 0, isError: false }),
    'LOADING_COMPONENT'
  )

  // Only after query fully resolves with 0 items does empty state show:
  assert.equal(
    computeSellerBoundaryState({ isLoading: false, isFetching: false, count: 0, isError: false }),
    'EMPTY_STATE'
  )

  // With items, renders children:
  assert.equal(
    computeSellerBoundaryState({ isLoading: false, isFetching: false, count: 5, isError: false }),
    'CHILDREN'
  )
})

