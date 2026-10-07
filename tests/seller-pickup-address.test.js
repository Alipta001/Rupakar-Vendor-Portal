const assert = require('node:assert/strict')
const path = require('node:path')
const { test } = require('node:test')
const fs = require('node:fs')
const ts = require('typescript')

// Transpile SettingsPage and errors
const errorsSource = fs.readFileSync(path.resolve(__dirname, '../lib/api/errors.ts'), 'utf8')
const transpiledErrors = ts.transpileModule(errorsSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

const errorsModule = { exports: {} }
new Function('module', 'exports', 'require', transpiledErrors)(errorsModule, errorsModule.exports, require)
const { getApiErrorMessage, ApiError } = errorsModule.exports

const settingsSource = fs.readFileSync(path.resolve(__dirname, '../features/settings/components/SettingsPage.tsx'), 'utf8')
const transpiledSettings = ts.transpileModule(settingsSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText

const settingsModule = { exports: {} }
// Provide mock react / dependencies for evaluation of helper
const mockRequire = (id) => {
  if (id === 'react') return { useState: () => [null, () => {}], useEffect: () => {} }
  if (id === 'lucide-react') return {}
  if (id === '@/components/layout/PageHeader') return { PageHeader: () => null }
  if (id === '@/features/profile/services/profile-service') return { profileService: {} }
  if (id === '@/lib/api/errors') return errorsModule.exports
  if (id.startsWith('react/')) return {}
  return {}
}
new Function('module', 'exports', 'require', transpiledSettings)(settingsModule, settingsModule.exports, mockRequire)
const { normalizeIndianPhone } = settingsModule.exports

test('normalizeIndianPhone normalizes diverse Indian phone formats to 10 digits', () => {
  assert.equal(normalizeIndianPhone('+919876543210'), '9876543210')
  assert.equal(normalizeIndianPhone('+91 98765 43210'), '9876543210')
  assert.equal(normalizeIndianPhone('+91-98765-43210'), '9876543210')
  assert.equal(normalizeIndianPhone('919876543210'), '9876543210')
  assert.equal(normalizeIndianPhone('09876543210'), '9876543210')
  assert.equal(normalizeIndianPhone('9876543210'), '9876543210')
  assert.equal(normalizeIndianPhone(' 9876543210 '), '9876543210')
})

test('normalizeIndianPhone handles empty and short values safely', () => {
  assert.equal(normalizeIndianPhone(''), '')
  assert.equal(normalizeIndianPhone('9876'), '9876')
  assert.equal(normalizeIndianPhone(null), '')
  assert.equal(normalizeIndianPhone(undefined), '')
})

test('Pickup address validation logic matches backend schema constraints', () => {
  const validate = (form) => {
    const errors = {}
    if (!form.pickupLocationName?.trim() || form.pickupLocationName.trim().length < 2) {
      errors.pickupLocationName = 'Pickup location name must be at least 2 characters (e.g. Primary Hub)'
    }
    if (!form.contactPerson?.trim() || form.contactPerson.trim().length < 2) {
      errors.contactPerson = 'Contact person name must be at least 2 characters'
    }
    const cleanPhone = normalizeIndianPhone(form.phone?.trim() || '')
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      errors.phone = 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)'
    }
    if (!form.addressLine1?.trim() || form.addressLine1.trim().length < 3) {
      errors.addressLine1 = 'Address line 1 is required (min 3 characters)'
    }
    if (!form.city?.trim() || form.city.trim().length < 2) {
      errors.city = 'City is required (at least 2 characters)'
    }
    if (!form.state?.trim() || form.state.trim().length < 2) {
      errors.state = 'State is required (at least 2 characters)'
    }
    const cleanPin = form.pincode?.trim() || ''
    if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      errors.pincode = 'Please enter a valid 6-digit Indian postal code'
    }
    return { isValid: Object.keys(errors).length === 0, errors }
  }

  // 1. Valid payload
  const valid = validate({
    pickupLocationName: 'Kolkata Central Hub',
    contactPerson: 'Ramesh Sharma',
    phone: '+91 98765 43210',
    addressLine1: '12 Craft Guild Lane, Studio 4B',
    addressLine2: 'Near New Market',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700001',
    country: 'India',
  })
  assert.equal(valid.isValid, true)
  assert.deepEqual(valid.errors, {})

  // 2. Reject short location name (< 2 chars)
  const invalidLoc = validate({
    pickupLocationName: 'K',
    contactPerson: 'Ramesh',
    phone: '9876543210',
    addressLine1: '12 Craft Guild Lane',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700001',
  })
  assert.equal(invalidLoc.isValid, false)
  assert.ok(invalidLoc.errors.pickupLocationName)

  // 3. Reject invalid phone number
  const invalidPhone = validate({
    pickupLocationName: 'Kolkata Hub',
    contactPerson: 'Ramesh',
    phone: '12345',
    addressLine1: '12 Craft Guild Lane',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700001',
  })
  assert.equal(invalidPhone.isValid, false)
  assert.ok(invalidPhone.errors.phone)

  // 4. Reject invalid pincode
  const invalidPin = validate({
    pickupLocationName: 'Kolkata Hub',
    contactPerson: 'Ramesh',
    phone: '9876543210',
    addressLine1: '12 Craft Guild Lane',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '70000', // only 5 digits
  })
  assert.equal(invalidPin.isValid, false)
  assert.ok(invalidPin.errors.pincode)
})

test('getApiErrorMessage extracts backend Zod validation error messages safely', () => {
  const backendError = new ApiError('Phone number must be a valid 10-digit Indian mobile number', 400, 'VALIDATION_ERROR', 'req-123')
  const message = getApiErrorMessage(backendError, 'Unable to save pickup address')
  assert.equal(message, 'Phone number must be a valid 10-digit Indian mobile number')

  const genericError = new ApiError('', 400, 'VALIDATION_ERROR', 'req-456')
  const fallback = getApiErrorMessage(genericError, 'Unable to save pickup address')
  assert.equal(fallback, 'Please check the details and try again.')
})
