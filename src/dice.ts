function rollDie(sides: number): number {
	if (sides <= 0) {
		throw new Error("Number of sides must be greater than 0");
	}

	// To avoid modulo bias, we discard random numbers that fall in the range
	// just above the largest multiple of 'sides' that fits in a 32-bit integer.
	const maxUint32 = 0xFFFFFFFF;
	const limit = maxUint32 - (maxUint32 % sides);
	const buffer = new Uint32Array(1);

	let randomValue: number;
	do {
		window.crypto.getRandomValues(buffer);
		randomValue = buffer[0];
	} while (randomValue >= limit);

	return (randomValue % sides) + 1;
}

export interface RollResult {
	rolls: number[];
	modifier: number;
	sum: number;
	total: number;
	advantageRoll: number;
	disadvantageRoll: number;
	advantageTotal: number;
	disadvantageTotal: number;
}

export function rollDice(sides: number, count: number, mod: number = 0): RollResult {
	let results: RollResult = {
		rolls: [],
		modifier: mod,
		sum: mod,
		total: 0,
		advantageRoll: 0,
		disadvantageRoll: sides + 1,
		advantageTotal: 0,
		disadvantageTotal: 0
	}
	for (let i = 0; i < count; i++) {
		const r = rollDie(sides);
		results.rolls.push(r);
		results.sum += r;
		if (results.total === 0) {
			results.total = r + mod;
		}
		if (r > results.advantageRoll) {
			results.advantageRoll = r;
			results.advantageTotal = r + mod;
		}
		if (r < results.disadvantageRoll) {
			results.disadvantageRoll = r;
			results.disadvantageTotal = r + mod;
		}
	}
	return results;
}

export function rollFormula(formula: string): RollResult {
	const parts = formula.replace(/-/g, '+-').split('+');
	let totalResult: RollResult = {
		rolls: [],
		modifier: 0,
		sum: 0,
		total: 0,
		advantageRoll: 0,
		disadvantageRoll: 0,
		advantageTotal: 0,
		disadvantageTotal: 0
	};
	for (let part of parts) {
		part = part.trim();
		if (!part) continue;

		const diceParts = part.split('d');
		if (diceParts.length === 2) {
			let countStr = diceParts[0].trim();
			let count: number;

			if (countStr === '') {
				count = 1;
			} else if (countStr === '-') {
				count = -1;
			} else {
				count = parseInt(countStr);
				if (isNaN(count)) count = 1;
			}

			const sides = parseInt(diceParts[1]) || 6;
			const result = rollDice(sides, Math.abs(count));

			if (count < 0) {
				totalResult.rolls.push(...result.rolls.map(r => -r));
				totalResult.modifier -= result.modifier;
				totalResult.sum -= result.sum;
				totalResult.total -= result.total;
			} else {
				totalResult.rolls.push(...result.rolls);
				totalResult.modifier += result.modifier;
				totalResult.sum += result.sum;
				totalResult.total += result.total;
			}
		} else {
			const mod = parseInt(part) || 0;
			totalResult.modifier += mod;
			totalResult.sum += mod;
			totalResult.total += mod;
		}
	}
	return totalResult;
}

export interface RollDefinition {
	dice: any[];
	modifiers: number[];
	modifierSum: number;
}

export function parseFormula(formula: string): RollDefinition {
	const parts = formula.replace(/-/g, '+-').split('+');
	let rollDefinition: RollDefinition = {
		dice: [],
		modifiers: [],
		modifierSum: 0
	};
	for (let part of parts) {
		part = part.trim();
		if (!part) continue;

		const diceParts = part.split('d');
		if (diceParts.length === 2) {
			let countStr = diceParts[0].trim();
			let count: number;

			if (countStr === '') {
				count = 1;
			} else if (countStr === '-') {
				count = -1;
			} else {
				count = parseInt(countStr);
				if (isNaN(count)) count = 1;
			}

			const sides = parseInt(diceParts[1]) || 6;
			rollDefinition.dice.push({ sides, count });
		} else {
			const mod = parseInt(part) || 0;
			rollDefinition.modifiers.push(mod);
			rollDefinition.modifierSum += mod;
		}
	}
	return rollDefinition;
}

export const diceChain = [2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 30]
export function getChain(sides: number, steps: number): number {
	const index = diceChain.indexOf(sides);
	if (index === -1) return sides;
	return diceChain[Math.min(Math.max(index + steps, 0), diceChain.length - 1)];
}