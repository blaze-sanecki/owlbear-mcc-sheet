import OBR from "@owlbear-rodeo/sdk";
import defaultSheet from './data/default-sheet.json'
import repeatableDefinitions from './data/repeatable-definitions.json'
import { rollDice, rollFormula, parseFormula, getChain } from './dice.js'
import { showContextMenu } from "./context_menu.js";

const ID = 'quest.jelonek.owlbear.mcc'
const inputs = ["name", "level", "xp", "speed", "saves_fortitude", "saves_reflex", "saves_will",
	"hp_current", "hp_max", "ac", "attributes_strength_current", "attributes_strength_max",
	"attributes_agility_current", "attributes_agility_max", "attributes_stamina_current",
	"attributes_stamina_max", "attributes_intelligence_current", "attributes_intelligence_max",
	"attributes_personality_current", "attributes_personality_max", "attributes_luck_current",
	"attributes_luck_max", "calculated_initiative", "action-dice", "crit-die", "crit-table",
	"calculated_missile-attack-bonus", "calculated_missile-damage-bonus", "calculated_melee-attack-bonus",
	"calculated_melee-damage-bonus", "artifact-check", "max-tech-level", "lucky-roll", "alignment", "class"];

let localState: Record<string, any> = {}

document.querySelector<HTMLButtonElement>('#button-equipment')!.addEventListener('click', () => {
	document.querySelector<HTMLInputElement>('#active-tab')!.value = 'tab-equipment'
})

document.querySelector<HTMLButtonElement>('#button-inventory')!.addEventListener('click', () => {
	document.querySelector<HTMLInputElement>('#active-tab')!.value = 'tab-inventory'
})

document.querySelector<HTMLButtonElement>('#button-artifacts')!.addEventListener('click', () => {
	document.querySelector<HTMLInputElement>('#active-tab')!.value = 'tab-artifacts'
})

document.querySelector<HTMLButtonElement>('#button-mutations')!.addEventListener('click', () => {
	document.querySelector<HTMLInputElement>('#active-tab')!.value = 'tab-mutations'
})

document.querySelector<HTMLButtonElement>('#button-notes')!.addEventListener('click', () => {
	document.querySelector<HTMLInputElement>('#active-tab')!.value = 'tab-notes'
})

document.addEventListener('contextmenu', (event) => {
	const element = (event.target as HTMLElement).closest<HTMLElement>('.context');
	if (element) {
		if (!element.parentElement) return;
		event.preventDefault();
		const roll = parseFormula(element.parentElement.querySelector<HTMLInputElement>('.data-action-dice')?.value || '1d20');
		const chainUp = getChain(roll.dice[0].sides, 1);
		const chainDown = getChain(roll.dice[0].sides, -1);
		showContextMenu(event.pageX, Math.min(event.pageY, 520), [
			{ label: `Roll using d${chainUp}`, action: () => console.log('Option 1 clicked') },
			{ label: `Roll using d${chainDown}`, action: () => console.log('Option 2 clicked') },
			{
				label: 'Roll custom...', action: () => {
					const action = element.getAttribute('data-action');
					if (action === 'roll-melee' || action === 'roll-ranged') {
						const attackInput = element!.parentElement?.querySelector<HTMLInputElement>('.attack-bonus');
						const damageInput = element!.parentElement?.querySelector<HTMLInputElement>('.damage-dice');
						getCustomRoll("Attack Roll", [roll.dice[0].sides], [parseInt(attackInput?.value || '0')]).then((result) => {
							if (result) {

							}
						});
					}
					else if (action === 'roll-attribute') {
						const attributeName = element.getAttribute('data-attribute') || 'unknown';
						const attributeClass = `.data-attributes_${attributeName}_current`;
						console.log('Attribute Class:', attributeClass);
						const attributeCurrent = getModifier(parseInt(document.querySelector<HTMLInputElement>(attributeClass)!.value || '10'));
						console.log('Default Roll');
						getCustomRoll(`${attributeName.charAt(0).toUpperCase() + attributeName.slice(1)} Roll`, [roll.dice[0].sides], [attributeCurrent]).then((result) => {
							if (result) {

							}
						});
					}
					else if (action === 'roll-artifact-check') {
						const artifactCheck = parseInt(document.querySelector<HTMLInputElement>('.data-artifact-check')!.value || '1');
						console.log('Artifact Check Roll');
						getCustomRoll("Artifact Check", [roll.dice[0].sides], [artifactCheck]).then((result) => {
							if (result) {

							}
						});
					}
				}
			},
			{ label: 'Edit defaults...', action: () => console.log('Option 2 clicked') }
		]);
	}
});

document.addEventListener('click', (event) => {
	const element = event.target as HTMLElement;
	if (element.classList.contains('add-item')) {
		const container = element.closest('.container-with-header');
		const repeatingDiv = container?.querySelector('.repeating');
		if (!repeatingDiv) return;

		let definition: any[] = [];
		let stateKey = '';

		if (repeatingDiv.classList.contains('repeating-weapons-melee')) {
			definition = repeatableDefinitions.definitionWeaponsMelee;
			stateKey = 'weapons-melee';
		} else if (repeatingDiv.classList.contains('repeating-weapons-ranged')) {
			definition = repeatableDefinitions.definitionWeaponsRanged;
			stateKey = 'weapons-ranged';
		} else if (repeatingDiv.classList.contains('repeating-armor')) {
			definition = repeatableDefinitions.definitionArmor;
			stateKey = 'armor';
		} else if (repeatingDiv.classList.contains('repeating-items')) {
			definition = repeatableDefinitions.definitionItems;
			stateKey = 'items';
		} else if (repeatingDiv.classList.contains('repeating-artifacts')) {
			definition = repeatableDefinitions.definitionArtifacts;
			stateKey = 'artifacts';
		} else if (repeatingDiv.classList.contains('repeating-mutations-passive')) {
			definition = repeatableDefinitions.definitionMutationsPassive;
			stateKey = 'mutations_passive';
		} else if (repeatingDiv.classList.contains('repeating-mutations-active')) {
			definition = repeatableDefinitions.definitionMutationsActive;
			stateKey = 'mutations_active';
		} else if (repeatingDiv.classList.contains('repeating-abilities')) {
			definition = repeatableDefinitions.definitionAbilities;
			stateKey = 'abilities';
		} else if (repeatingDiv.classList.contains('repeating-notes')) {
			definition = repeatableDefinitions.definitionNotes;
			stateKey = 'notes';
		}

		if (stateKey && definition) {
			// Create new item
			const newItem: Record<string, any> = {};
			definition.forEach(def => {
				if (def.key) {
					newItem[def.key] = ""; // Default empty string
				}
			});

			// Add to state
			let target: any = localState;
			const parts = stateKey.split('_');
			for (let i = 0; i < parts.length - 1; i++) {
				if (!target[parts[i]]) target[parts[i]] = {};
				target = target[parts[i]];
			}
			const lastKey = parts[parts.length - 1];
			if (!target[lastKey]) target[lastKey] = [];
			target[lastKey].push(newItem);

			// Re-render
			repeatingDiv.innerHTML = '';
			loadFromDefinition(stateKey, repeatingDiv.className.split(' ').find(c => c.startsWith('repeating-'))!, definition);

			// Save
			saveState();
		}
	}
});

document.addEventListener('click', (event) => {
	const element = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
	if (!element) return;

	const action = element.getAttribute('data-action');
	if (action === 'roll-melee') {
		rollMeleeAttack(element);
	} else if (action === 'roll-ranged') {
		rollRangedAttack(element);
	} else if (action === 'edit-power' || action === 'edit-notes') {
		const parent = element.parentElement;
		if (!parent) return;

		let definition: any[] = [];
		let stateKey = '';

		if (parent.classList.contains('repeating-weapons-melee')) {
			definition = repeatableDefinitions.definitionWeaponsMelee;
			stateKey = 'weapons-melee';
		} else if (parent.classList.contains('repeating-weapons-ranged')) {
			definition = repeatableDefinitions.definitionWeaponsRanged;
			stateKey = 'weapons-ranged';
		} else if (parent.classList.contains('repeating-armor')) {
			definition = repeatableDefinitions.definitionArmor;
			stateKey = 'armor';
		} else if (parent.classList.contains('repeating-notes')) {
			definition = repeatableDefinitions.definitionNotes;
			stateKey = 'notes';
		}

		if (definition.length > 0) {
			const index = Array.from(parent.children).indexOf(element);
			const itemIndex = Math.floor(index / definition.length);

			// Get current value
			let value: any = '';
			stateKey.split('_').forEach(part => {
				if (value === '') {
					value = localState[part];
				} else {
					value = (value as Record<string, any>)[part];
				}
			});

			const item = value[itemIndex];
			const key = action === 'edit-power' ? 'power' : 'notes';
			const currentValue = item[key];

			getEditModal(key as 'power' | 'notes', `Edit ${key === 'power' ? 'Power' : 'Notes'}`, currentValue).then((newValue) => {
				if (newValue !== null) {
					// Update localState
					item[key] = newValue;

					// Update UI
					if (action === 'edit-power') {
						element.dataset.value = JSON.stringify(newValue);
						if (newValue) {
							if (newValue.source === 'self') {
								element.title = "Self-Powered";
							} else if (newValue.batteries) {
								const parts = [];
								if (newValue.batteries.c) parts.push(`Type C: ${newValue.batteries.c}`);
								if (newValue.batteries.f) parts.push(`Type F: ${newValue.batteries.f}`);
								if (newValue.batteries.q) parts.push(`Type Q: ${newValue.batteries.q}`);
								element.title = parts.join('\n') || "No charges";
							}
						} else {
							element.title = "No power info";
						}
					} else {
						element.dataset.value = newValue;
						element.title = newValue;
					}

					// Save state
					saveState();
				}
			});
		}
	}
});

const getModifier = (score: number): number => {
	if (score <= 3) return -3;
	if (score <= 5) return -2;
	if (score <= 8) return -1;
	if (score <= 12) return 0;
	if (score <= 15) return 1;
	if (score <= 17) return 2;
	if (score <= 19) return 3;
	if (score <= 21) return 4;
	if (score <= 23) return 5;
	return 6;
}

const getMaxTechLevel = (score: number): string => {
	if (score <= 3) return "0";
	if (score <= 7) return "1";
	if (score <= 9) return "2";
	if (score <= 11) return "3";
	if (score <= 14) return "4";
	if (score <= 17) return "5";
	if (score <= 23) return "6";
	return "7";
}

const updateModifiers = () => {
	const attributes = ['strength', 'agility', 'stamina', 'intelligence', 'personality', 'luck'];
	attributes.forEach(attr => {
		const currentInput = document.querySelector<HTMLInputElement>(`.data-attributes_${attr}_current`);
		if (!currentInput) return;

		const score = parseInt(currentInput.value) || 10;
		const modifier = getModifier(score);
		const formattedModifier = modifier >= 0 ? `+${modifier}` : `${modifier}`;

		const circleDiv = currentInput.closest('.circle');
		const modifierSection = circleDiv?.nextElementSibling;
		if (modifierSection && modifierSection.classList.contains('modifier-section')) {
			const modInput = modifierSection.querySelector('.modifier input') as HTMLInputElement;
			if (modInput) {
				modInput.value = formattedModifier;
			}
		}

		if (attr === 'intelligence') {
			const maxTechInput = document.querySelector<HTMLInputElement>('.data-max-tech-level');
			if (maxTechInput) {
				const newMaxTech = getMaxTechLevel(score);
				if (maxTechInput.value !== newMaxTech) {
					maxTechInput.value = newMaxTech;
					localState['max-tech-level'] = newMaxTech;
				}
			}
		}
	});
}

const getCustomRoll = (title: string = 'Custom Roll', dice: number[] = [20], modifiers: number[] = [0], diceNames: string[] = ["Action Die:"], modifiersNames: string[] = ["Modifier:"]): Promise<{ dice: number[], modifiers: number[] } | null> => {
	return new Promise((resolve) => {
		const channel = new BroadcastChannel('owlbear-mcc-modal');
		const modalId = 'mcc-modal';
		let resolved = false;

		const cleanup = () => {
			if (resolved) return;
			resolved = true;
			channel.close();
		};

		channel.onmessage = (event) => {
			if (event.data.type === 'submit') {
				resolve({ modifiers: event.data.modifiers, dice: event.data.dice });
			} else {
				resolve(null);
			}
			cleanup();
		};

		let urlParams = `?title=${encodeURIComponent(title)}`;
		dice.forEach((die) => {
			urlParams += `&die=${die}`;
		});
		modifiers.forEach((mod) => {
			urlParams += `&modifier=${mod}`;
		});
		diceNames.forEach((name) => {
			urlParams += `&dieName=${encodeURIComponent(name)}`;
		});
		modifiersNames.forEach((name) => {
			urlParams += `&modifierName=${encodeURIComponent(name)}`;
		});
		console.log("Opening modal with params:", urlParams);
		OBR.modal.open({
			id: modalId,
			url: `/modifier.html${urlParams}`,
			height: 150,
			width: 280 * (Math.ceil((dice.length + modifiers.length) / 2))
		});
	});
};

function rollMeleeAttack(element: HTMLElement) {
	const parent = element.parentElement;
	if (!parent) return;

	const attackBonusInput = parent.querySelector<HTMLInputElement>('.attack-bonus');
	const damageDiceInput = parent.querySelector<HTMLInputElement>('.damage-dice');

	const attackBonus = attackBonusInput ? parseInt(attackBonusInput.value) || 0 : 0;
	const damageDice = damageDiceInput ? damageDiceInput.value : '1d6';

	console.log(`1d20 + ${attackBonus}`, ` dmg:${damageDice} Melee Attack Roll`);
}

function rollRangedAttack(element: HTMLElement) {
	const parent = element.parentElement;
	if (!parent) return;

	const attackBonusInput = parent.querySelector<HTMLInputElement>('.attack-bonus');
	const damageDiceInput = parent.querySelector<HTMLInputElement>('.damage-dice');
	const attackBonus = attackBonusInput ? parseInt(attackBonusInput.value) || 0 : 0;
	const damageRoll = rollFormula(damageDiceInput ? damageDiceInput.value : '1d6');
	const diceRoll = rollDice(20, 1, attackBonus);
	console.log(`${diceRoll.rolls[0]}+${diceRoll.modifier}`, `Ranged Attack Roll`);
	console.log(`${damageRoll.total - damageRoll.modifier} + ${damageRoll.modifier}`, `Ranged Damage Roll`);
}

document.addEventListener('change', (event) => {
	const element = event.target as HTMLInputElement;

	// Handle main inputs
	const dataClass = Array.from(element.classList).find(c => c.startsWith('data-'));
	if (dataClass) {
		const keyPath = dataClass.replace('data-', '');
		const parts = keyPath.split('_');
		let target: any = localState;
		for (let i = 0; i < parts.length - 1; i++) {
			if (!target[parts[i]]) target[parts[i]] = {};
			target = target[parts[i]];
		}
		target[parts[parts.length - 1]] = element.value;
		if (dataClass.includes('attributes') && dataClass.includes('current')) {
			updateModifiers();
		}
		saveState();
		return;
	}

	// Handle repeatable inputs
	const repeatingDiv = element.closest('.repeating');
	if (repeatingDiv && element.dataset.key) {
		let definition: any[] = [];
		let stateKey = '';

		if (repeatingDiv.classList.contains('repeating-weapons-melee')) {
			definition = repeatableDefinitions.definitionWeaponsMelee;
			stateKey = 'weapons-melee';
		} else if (repeatingDiv.classList.contains('repeating-weapons-ranged')) {
			definition = repeatableDefinitions.definitionWeaponsRanged;
			stateKey = 'weapons-ranged';
		} else if (repeatingDiv.classList.contains('repeating-armor')) {
			definition = repeatableDefinitions.definitionArmor;
			stateKey = 'armor';
		} else if (repeatingDiv.classList.contains('repeating-items')) {
			definition = repeatableDefinitions.definitionItems;
			stateKey = 'items';
		} else if (repeatingDiv.classList.contains('repeating-artifacts')) {
			definition = repeatableDefinitions.definitionArtifacts;
			stateKey = 'artifacts';
		} else if (repeatingDiv.classList.contains('repeating-mutations-passive')) {
			definition = repeatableDefinitions.definitionMutationsPassive;
			stateKey = 'mutations_passive';
		} else if (repeatingDiv.classList.contains('repeating-mutations-active')) {
			definition = repeatableDefinitions.definitionMutationsActive;
			stateKey = 'mutations_active';
		} else if (repeatingDiv.classList.contains('repeating-abilities')) {
			definition = repeatableDefinitions.definitionAbilities;
			stateKey = 'abilities';
		} else if (repeatingDiv.classList.contains('repeating-notes')) {
			definition = repeatableDefinitions.definitionNotes;
			stateKey = 'notes';
		}

		if (stateKey && definition.length > 0) {
			const childIndex = Array.from(repeatingDiv.children).indexOf(element);
			if (childIndex !== -1) {
				const itemIndex = Math.floor(childIndex / definition.length);

				// Get the array from localState
				let target: any = localState;
				const parts = stateKey.split('_');
				for (let i = 0; i < parts.length; i++) {
					target = target[parts[i]];
				}

				if (target && target[itemIndex]) {
					target[itemIndex][element.dataset.key] = element.value;
					saveState();
				}
			}
		}
	}
});

const saveState = async () => {
	const PLAYER_ID = await OBR.player.getId();
	const last_slot = localStorage.getItem(`${ID}/${PLAYER_ID}/last_slot`) || "1";
	localStorage.setItem(`${ID}/${PLAYER_ID}/slot_${last_slot}`, JSON.stringify(localState));
}

const getEditModal = (type: 'power' | 'notes', title: string, initialValue: any): Promise<any> => {
	return new Promise((resolve) => {
		const channel = new BroadcastChannel('owlbear-mcc-modal');
		const modalId = 'mcc-modal';
		let resolved = false;

		const cleanup = () => {
			if (resolved) return;
			resolved = true;
			channel.close();
		};

		channel.onmessage = (event) => {
			if (event.data.type === 'submit') {
				resolve(event.data.value);
			} else {
				resolve(null);
			}
			cleanup();
		};

		let valueStr = '';
		if (typeof initialValue === 'object') {
			valueStr = JSON.stringify(initialValue);
		} else {
			valueStr = String(initialValue || '');
		}

		const urlParams = `?type=${type}&title=${encodeURIComponent(title)}&value=${encodeURIComponent(valueStr)}`;

		const width = type === 'notes' ? 500 : 400;
		const height = type === 'notes' ? 600 : 325;

		OBR.modal.open({
			id: modalId,
			url: `/edit_modal.html${urlParams}`,
			height: height,
			width: width
		});
	});
};

const loadFromDefinition = function (stateKey: string, elementClass: string, definition: Array<any>) {
	let child
	let parent = document.querySelector<HTMLInputElement>(`.${elementClass}`);

	let value: any = '';
	stateKey.split('_').forEach(part => {
		if (value === '') {
			value = localState[part];
		} else {
			value = (value as Record<string, any>)[part];
		}
	});

	for (let j = 0; j < (value?.length || 0); j++) {
		for (let i = 0; i < definition.length; i++) {
			child = document.createElement(definition[i].type);
			if (definition[i].attributes) {
				for (const key in definition[i].attributes) {
					child.setAttribute(key, (definition[i].attributes as any)[key]);
				}
			}
			if (definition[i].key) {
				child.dataset.key = definition[i].key;
				const val = value?.[j]?.[definition[i].key as any] || '';
				if (definition[i].type === 'input') {
					(child as any).value = val;
				} else if (definition[i].type === 'div') {
					child.dataset.value = typeof val === 'object' ? JSON.stringify(val) : val;
					if (definition[i].key === 'notes') {
						child.title = val || 'No notes';
					} else if (definition[i].key === 'power') {
						if (val) {
							if (val.source === 'self') {
								child.title = "Power: Self";
							} else if (val.batteries) {
								const parts = [];
								if (val.batteries.c) parts.push(`Type C: ${val.batteries.c}`);
								if (val.batteries.f) parts.push(`Type F: ${val.batteries.f}`);
								if (val.batteries.q) parts.push(`Type Q: ${val.batteries.q}`);
								child.title = parts.join('\n') || "No charges";
							} else if (val.batteryType) {
								// Legacy support
								child.title = `Type ${val.batteryType}: ${val.charges} charges`;
							} else {
								child.title = "No power info";
							}
						} else {
							child.title = "No power info";
						}
					}
				}
			}
			parent?.appendChild(child);
		}
	}
}

const loadData = async () => {
	const PLAYER_ID = await OBR.player.getId()
	const last_slot = localStorage.getItem(`${ID}/${PLAYER_ID}/last_slot`) || "1"
	localState = JSON.parse(localStorage.getItem(`${ID}/${PLAYER_ID}/slot_${last_slot}`) || '{}')
	if (Object.keys(localState).length === 0) {
		localState = defaultSheet;
	} else {
		// Merge defaultSheet into localState to ensure new fields are present
		for (const key in defaultSheet) {
			if (!localState.hasOwnProperty(key)) {
				localState[key] = (defaultSheet as any)[key];
			}
		}
	}
	// Populate fields
	inputs.forEach(input => {
		const element = document.querySelector<HTMLInputElement>(`.data-${input}`);
		if (element) {
			let value: any = '';
			input.split('_').forEach(part => {
				if (value === '') {
					value = localState[part];
				} else {
					value = (value as Record<string, any>)[part];
				}
			});
			localState[input];
			if (value !== undefined) {
				element.value = String(value);
			}
		}
	});

	loadFromDefinition("weapons-melee", "repeating-weapons-melee", repeatableDefinitions["definitionWeaponsMelee"]);
	loadFromDefinition("weapons-ranged", "repeating-weapons-ranged", repeatableDefinitions["definitionWeaponsRanged"]);
	loadFromDefinition("armor", "repeating-armor", repeatableDefinitions["definitionArmor"]);
	loadFromDefinition("items", "repeating-items", repeatableDefinitions["definitionItems"]);
	loadFromDefinition("artifacts", "repeating-artifacts", repeatableDefinitions["definitionArtifacts"]);
	loadFromDefinition("mutations_passive", "repeating-mutations-passive", repeatableDefinitions["definitionMutationsPassive"]);
	loadFromDefinition("mutations_active", "repeating-mutations-active", repeatableDefinitions["definitionMutationsActive"]);
	loadFromDefinition("abilities", "repeating-abilities", repeatableDefinitions["definitionAbilities"]);
	loadFromDefinition("notes", "repeating-notes", repeatableDefinitions["definitionNotes"]);

	updateModifiers();
	console.log('Loaded data:', localState);
}

OBR.onReady(() => {
	console.log('Owlbear Rodeo SDK is ready!')
	loadData()
})