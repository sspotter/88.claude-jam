/** Run with: npx tsx src/tests/formatPrice.test.ts */
import assert from 'node:assert/strict'
import { formatPrice } from '../lib/pricing/formatPrice'

let failed = 0
function test(label: string, fn: () => void) {
	try { fn(); console.log(`  ✓  ${label}`) }
	catch (e) { failed++; console.error(`  ✗  ${label}\n     ${(e as Error).message}`) }
}

test('English EGP uses the EGP label', () => {
	assert.equal(formatPrice(50, 'EGP', 'en'), '50.00 EGP')
})
test('Arabic EGP uses the ج م label', () => {
	const out = formatPrice(50, 'EGP', 'ar')
	assert.ok(out.includes('ج م'), `expected ج م in "${out}"`)
})
test('defaults to English when no language passed', () => {
	assert.equal(formatPrice(10, 'USD'), '10.00 USD')
})

if (failed > 0) { console.error(`\n${failed} failed`); process.exit(1) }
console.log('\nformatPrice OK')
