/**
 * Test: currencyAvailability
 *
 * Run with:  npx tsx src/tests/currencyAvailability.test.ts
 */

import assert from 'node:assert/strict'
import {
	DEFAULT_CURRENCY_SETTINGS,
	reconcilePersistedCurrency,
	resolveInitialCurrency,
	sanitizeCurrencySettings,
} from '../lib/pricing/currencyAvailability'

let passed = 0
let failed = 0

function test(label: string, fn: () => void) {
	try {
		fn()
		console.log(`  ✓  ${label}`)
		passed++
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err)
		console.error(`  ✗  ${label}`)
		console.error(`     ${message}`)
		failed++
	}
}

test('defaults enable the full master list with AED default', () => {
	assert.deepEqual(DEFAULT_CURRENCY_SETTINGS.enabled, ['AED', 'USD', 'EGP', 'SAR', 'EUR'])
	assert.equal(DEFAULT_CURRENCY_SETTINGS.default, 'AED')
})

test('sanitize drops unknown currencies and preserves master order', () => {
	const result = sanitizeCurrencySettings({
		enabled: ['EUR', 'AED', 'ZZZ' as never],
		default: 'EUR',
	})
	assert.deepEqual(result.enabled, ['AED', 'EUR'])
	assert.equal(result.default, 'EUR')
})

test('sanitize falls back to defaults when enabled becomes empty', () => {
	const result = sanitizeCurrencySettings({ enabled: [], default: 'USD' })
	assert.deepEqual(result, DEFAULT_CURRENCY_SETTINGS)
})

test('sanitize resets default when it is not enabled', () => {
	const result = sanitizeCurrencySettings({ enabled: ['USD', 'EUR'], default: 'AED' })
	assert.equal(result.default, 'USD') // first enabled
})

test('resolveInitialCurrency keeps detected when enabled', () => {
	const settings = { enabled: ['AED', 'EGP'] as const, default: 'AED' as const }
	assert.equal(resolveInitialCurrency('EGP', settings), 'EGP')
})

test('resolveInitialCurrency falls back to default when detected is disabled', () => {
	const settings = { enabled: ['AED', 'EGP'] as const, default: 'AED' as const }
	assert.equal(resolveInitialCurrency('USD', settings), 'AED')
})

test('reconcilePersistedCurrency keeps enabled, resets disabled', () => {
	const settings = { enabled: ['USD', 'EUR'] as const, default: 'USD' as const }
	assert.equal(reconcilePersistedCurrency('EUR', settings), 'EUR')
	assert.equal(reconcilePersistedCurrency('AED', settings), 'USD')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
