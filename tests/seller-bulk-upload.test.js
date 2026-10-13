const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const fs = require('node:fs')
const ts = require('typescript')

const productServiceSource = fs.readFileSync(
  path.resolve(__dirname, '../features/products/services/product-service.ts'),
  'utf8',
)
const transpiledProductService = ts.transpileModule(productServiceSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

const serviceModule = { exports: {} }
const mockApi = {
  get: async (url) => {
    if (url.includes('/bulk/batches/bulk_123')) {
      return {
        batchId: 'bulk_123',
        status: 'VALIDATED',
        totalRows: 5,
        validRowsCount: 4,
        invalidRowsCount: 1,
        rows: [],
      }
    }
    return { items: [], total: 0 }
  },
  post: async (url, data) => {
    if (url === '/vendor/products/bulk/validate') {
      return {
        batchId: 'bulk_123',
        totalRows: 10,
        validRowsCount: 9,
        invalidRowsCount: 1,
        extractionErrors: [],
        unmatchedImages: [],
        rows: [
          { rowNumber: 2, sku: 'RUP-TERR-01', isValid: true, errors: [] },
          { rowNumber: 3, sku: 'RUP-TERR-02', isValid: false, errors: [{ field: 'price', message: 'Price invalid' }] },
        ],
      }
    }
    if (url === '/vendor/products/bulk/submit') {
      return {
        batchId: data.batchId,
        status: 'PARTIALLY_COMPLETED',
        totalRows: 10,
        submittedCount: 9,
        failedCount: 0,
        newlySubmitted: 9,
        newlyFailed: 0,
        rows: [],
      }
    }
    return {}
  },
}

const mockRequire = (id) => {
  if (id === '@/api') return { api: mockApi, endpoints: { inventory: '/vendor/inventory' } }
  return {}
}

new Function('module', 'exports', 'require', transpiledProductService)(
  serviceModule,
  serviceModule.exports,
  mockRequire,
)
const { productService } = serviceModule.exports

test('productService.bulk exposes validate, submit, getBatch, listBatches, and downloadTemplate', () => {
  assert.equal(typeof productService.bulk.validate, 'function')
  assert.equal(typeof productService.bulk.submit, 'function')
  assert.equal(typeof productService.bulk.getBatch, 'function')
  assert.equal(typeof productService.bulk.listBatches, 'function')
  assert.equal(typeof productService.bulk.downloadTemplate, 'function')
  assert.equal(typeof productService.bulk.downloadErrorReport, 'function')
})

test('productService.bulk.validate returns structured validation metrics and row results', async () => {
  const result = await productService.bulk.validate(new FormData())
  assert.equal(result.batchId, 'bulk_123')
  assert.equal(result.totalRows, 10)
  assert.equal(result.validRowsCount, 9)
  assert.equal(result.invalidRowsCount, 1)
  assert.equal(result.rows.length, 2)
  assert.equal(result.rows[0].isValid, true)
  assert.equal(result.rows[1].isValid, false)
  assert.equal(result.rows[1].errors[0].field, 'price')
})

test('productService.bulk.submit sends batchId and receives partial completion results', async () => {
  const result = await productService.bulk.submit('bulk_123')
  assert.equal(result.batchId, 'bulk_123')
  assert.equal(result.status, 'PARTIALLY_COMPLETED')
  assert.equal(result.newlySubmitted, 9)
  assert.equal(result.submittedCount, 9)
})
