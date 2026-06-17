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
	buildRateMap,
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

test('returns base price directly for base currency', () => {
	const result = resolveProductPrice({
		basePrice: 100,
		baseCurrency: 'AED',
		targetCurrency: 'AED',
	})
	assert.equal(result.price, 100)
	assert.equal(result.source, 'manual')
	assert.equal(result.exchangeRate, null)
})

test('returns manual USD price when set', () => {
	const result = resolveProductPrice({
		basePrice: 100,
		baseCurrency: 'AED',
		targetCurrency: 'USD',
		manualPrices: { USD: 50 },
		rates: { USD: 0.2722 },
	})
	assert.equal(result.price, 50)
	assert.equal(result.source, 'manual')
	assert.equal(result.exchangeRate, null)
})

test('converts base to USD when no manual price', () => {
	const result = resolveProductPrice({
		basePrice: 100,
		baseCurrency: 'AED',
		targetCurrency: 'USD',
		rates: { USD: 0.2722 },
	})
	assert.equal(result.price, 27.22)
	assert.equal(result.source, 'converted')
	assert.equal(result.exchangeRate, 0.2722)
})

test('manual price takes priority over conversion', () => {
	const result = resolveProductPrice({
		basePrice: 100,
		baseCurrency: 'AED',
		targetCurrency: 'EGP',
		manualPrices: { EGP: 100 },
		rates: { EGP: 13.48 },
	})
	assert.equal(result.price, 100)
	assert.equal(result.source, 'manual')
})

test('falls back to base when rate unavailable', () => {
	const result = resolveProductPrice({
		basePrice: 100,
		baseCurrency: 'AED',
		targetCurrency: 'EUR',
		rates: {},
	})
	assert.equal(result.price, 100)
	assert.equal(result.currency, 'AED')
	assert.equal(result.fallbackToBase, true)
})

test('treats zero as valid manual price', () => {
	const result = resolveProductPrice({
		basePrice: 100,
		baseCurrency: 'AED',
		targetCurrency: 'USD',
		manualPrices: { USD: 0 },
		rates: { USD: 0.2722 },
	})
	assert.equal(result.price, 0)
	assert.equal(result.source, 'manual')
})

test('estimateConversion returns null without rate', () => {
	assert.equal(estimateConversion(100, 'AED', 'USD', undefined), null)
})

test('roundPrice rounds to 2 decimal places', () => {
	assert.equal(roundPrice(27.224), 27.22)
})

test('EGP base: base currency returns face value', () => {
	const r = resolveProductPrice({ basePrice: 50, baseCurrency: 'EGP', targetCurrency: 'EGP' })
	assert.equal(r.price, 50)
	assert.equal(r.currency, 'EGP')
	assert.equal(r.source, 'manual')
})

test('EGP base: converts to AED via base-anchored rate', () => {
	const r = resolveProductPrice({ basePrice: 50, baseCurrency: 'EGP', targetCurrency: 'AED', rates: { AED: 0.12 } })
	assert.equal(r.price, 6)
	assert.equal(r.source, 'converted')
	assert.equal(r.exchangeRate, 0.12)
})

test('decision 2a: base price wins over a manual override in the base currency', () => {
	const r = resolveProductPrice({ basePrice: 50, baseCurrency: 'EGP', targetCurrency: 'EGP', manualPrices: { EGP: 999 } })
	assert.equal(r.price, 50)
})

test('buildRateMap filters by the given base currency', () => {
	const map = buildRateMap(
		[
			{ baseCurrency: 'EGP', targetCurrency: 'AED', rate: 0.12 } as any,
			{ baseCurrency: 'AED', targetCurrency: 'USD', rate: 0.27 } as any,
		],
		'EGP',
	)
	assert.deepEqual(map, { AED: 0.12 })
})

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
