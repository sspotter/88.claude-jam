/**
 * Test: pricingEngine
 *
 * Run with:  npx tsx src/tests/pricingEngine.test.ts
 */

import assert from 'node:assert/strict'
import {
	resolveProductPrice,
	estimateConversion,
	roundPrice,
} from '../lib/pricing/pricingEngine'

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

console.log('\npricingEngine()\n')

test('returns AED price directly for AED currency', () => {
	const result = resolveProductPrice({
		aedPrice: 100,
		targetCurrency: 'AED',
	})
	assert.equal(result.price, 100)
	assert.equal(result.source, 'manual')
	assert.equal(result.exchangeRate, null)
})

test('returns manual USD price when set', () => {
	const result = resolveProductPrice({
		aedPrice: 100,
		targetCurrency: 'USD',
		manualPrices: { USD: 50 },
		rates: { USD: 0.2722 },
	})
	assert.equal(result.price, 50)
	assert.equal(result.source, 'manual')
	assert.equal(result.exchangeRate, null)
})

test('converts AED to USD when no manual price', () => {
	const result = resolveProductPrice({
		aedPrice: 100,
		targetCurrency: 'USD',
		rates: { USD: 0.2722 },
	})
	assert.equal(result.price, 27.22)
	assert.equal(result.source, 'converted')
	assert.equal(result.exchangeRate, 0.2722)
})

test('manual price takes priority over conversion', () => {
	const result = resolveProductPrice({
		aedPrice: 100,
		targetCurrency: 'EGP',
		manualPrices: { EGP: 100 },
		rates: { EGP: 13.48 },
	})
	assert.equal(result.price, 100)
	assert.equal(result.source, 'manual')
})

test('falls back to AED when rate unavailable', () => {
	const result = resolveProductPrice({
		aedPrice: 100,
		targetCurrency: 'EUR',
		rates: {},
	})
	assert.equal(result.price, 100)
	assert.equal(result.currency, 'AED')
	assert.equal(result.fallbackToAed, true)
})

test('treats zero as valid manual price', () => {
	const result = resolveProductPrice({
		aedPrice: 100,
		targetCurrency: 'USD',
		manualPrices: { USD: 0 },
		rates: { USD: 0.2722 },
	})
	assert.equal(result.price, 0)
	assert.equal(result.source, 'manual')
})

test('estimateConversion returns null without rate', () => {
	assert.equal(estimateConversion(100, 'USD', undefined), null)
})

test('roundPrice rounds to 2 decimal places', () => {
	assert.equal(roundPrice(27.224), 27.22)
})

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
