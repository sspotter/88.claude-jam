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

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
