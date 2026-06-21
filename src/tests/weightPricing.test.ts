/**
 * Test: weightPricing
 *
 * Run with:  npx tsx src/tests/weightPricing.test.ts
 */

import assert from 'node:assert/strict'
import {
	calculateAedUnitPrice,
	getCartLineId,
	getWeightMultiplier,
	resolveWeightBasePrice,
	resolveWeightedPrice,
} from '../lib/pricing/weightPricing'

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

console.log('\nweightPricing()\n')

test('500g at 10 AED/kg = 5 AED', () => {
	assert.equal(calculateAedUnitPrice(10, '500g', 'per_kg'), 5)
})

test('1kg at 10 AED/kg = 10 AED', () => {
	assert.equal(calculateAedUnitPrice(10, '1kg', 'per_kg'), 10)
})

test('2kg at 10 AED/kg = 20 AED', () => {
	assert.equal(calculateAedUnitPrice(10, '2kg', 'per_kg'), 20)
})

test('5kg at 10 AED/kg = 50 AED', () => {
	assert.equal(calculateAedUnitPrice(10, '5kg', 'per_kg'), 50)
})

test('fixed pricing ignores weight multiplier', () => {
	assert.equal(calculateAedUnitPrice(10, '500g', 'fixed'), 10)
})

test('cart line id differs by weight for per_kg products', () => {
	const id500 = getCartLineId('dates', '500g')
	const id1kg = getCartLineId('dates', '1kg')
	assert.notEqual(id500, id1kg)
	assert.equal(id500, 'dates::500g')
	assert.equal(id1kg, 'dates::1kg')
})

test('fixed products use product id only when no weight is selected', () => {
	assert.equal(getCartLineId('honey'), 'honey')
})

test('fixed products with weight get separate cart lines', () => {
	assert.equal(getCartLineId('honey', '500g'), 'honey::500g')
	assert.notEqual(getCartLineId('honey', '500g'), getCartLineId('honey', '1kg'))
})

test('getWeightMultiplier returns 0.5 for 500g', () => {
	assert.equal(getWeightMultiplier('500g'), 0.5)
})

test('resolveWeightBasePrice: linear from 2kg anchor (anchor=100)', () => {
	assert.equal(resolveWeightBasePrice(100, '500g', {}), 25)
	assert.equal(resolveWeightBasePrice(100, '1kg', {}), 50)
	assert.equal(resolveWeightBasePrice(100, '2kg', {}), 100)
	assert.equal(resolveWeightBasePrice(100, '5kg', {}), 250)
})

test('resolveWeightBasePrice: override wins over linear', () => {
	assert.equal(resolveWeightBasePrice(100, '5kg', { '5kg': 199 }), 199)
})

test('resolveWeightBasePrice: rounds linear result to 2dp', () => {
	assert.equal(resolveWeightBasePrice(33, '500g', {}), 8.25)
})

test('resolveWeightedPrice: base currency returns base weight price', () => {
	const r = resolveWeightedPrice({
		anchorBasePrice: 100, weight: '5kg', weightOverrides: {},
		baseCurrency: 'AED', targetCurrency: 'AED', manualPrices: {}, rates: {},
	})
	assert.equal(r.price, 250)
	assert.equal(r.currency, 'AED')
})

test('resolveWeightedPrice: converts base weight price via rate', () => {
	const r = resolveWeightedPrice({
		anchorBasePrice: 100, weight: '1kg', weightOverrides: {},
		baseCurrency: 'AED', targetCurrency: 'USD', manualPrices: {}, rates: { USD: 0.27 },
	})
	assert.equal(r.price, 13.5) // 50 × 0.27
	assert.equal(r.source, 'converted')
})

test('resolveWeightedPrice: §3.3 per-currency override is the 2kg anchor, scaled linearly', () => {
	const r = resolveWeightedPrice({
		anchorBasePrice: 100, weight: '5kg', weightOverrides: {},
		baseCurrency: 'AED', targetCurrency: 'USD', manualPrices: { USD: 30 }, rates: { USD: 0.27 },
	})
	assert.equal(r.price, 75) // 30 × 5 / 2, NOT a rate conversion
	assert.equal(r.source, 'manual')
})

test('resolveWeightedPrice: base per-weight override converts when currency has no override', () => {
	const r = resolveWeightedPrice({
		anchorBasePrice: 100, weight: '5kg', weightOverrides: { '5kg': 200 },
		baseCurrency: 'AED', targetCurrency: 'USD', manualPrices: {}, rates: { USD: 0.5 },
	})
	assert.equal(r.price, 100) // 200 × 0.5
})

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
