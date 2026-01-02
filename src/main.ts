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
let editModes: Record<string, boolean> = {}

const tabs = ['equipment', 'inventory', 'artifacts', 'mutations', 'notes'];
tabs.forEach(tab => {
	document.querySelector<HTMLButtonElement>(`#button-${tab}`)?.addEventListener('click', () => {
		document.querySelector<HTMLInputElement>('#active-tab')!.value = `tab-${tab}`;
	});
});

document.addEventListener('contextmenu', (event) => {
	const element = (event.target as HTMLElement).closest<HTMLElement>('.context');
	if (element) {
		if (!element.parentElement) return;
		event.preventDefault();
		const roll = parseFormula(document.querySelector<HTMLInputElement>('.data-action-dice')?.value || '1d20');
		const chainUp = getChain(roll.dice[0].sides, 1);
		const chainDown = getChain(roll.dice[0].sides, -1);
		const defaultRoll = getDefaultRollForElement(element);
		const menuOptions = [
			{
				label: `Roll using d${chainUp}`, action: () => {
					const result = rollDice(chainUp, 1, defaultRoll.modifier);
					console.log('ROLL RESULT: ', result);
					if (element.getAttribute('data-action') === 'roll-melee' || element.getAttribute('data-action') === 'roll-ranged') {
						let sibling = element.nextElementSibling;
						while (sibling && !sibling.classList.contains('damage-dice')) {
							sibling = sibling.nextElementSibling;
						}
						const damageInput = sibling as HTMLInputElement;
						const resultDamage = rollFormula(damageInput ? damageInput.value : '1d4');
						console.log('ROLL RESULT: ', resultDamage);
					}
				}
			},
			{
				label: `Roll using d${chainDown}`, action: () => {
					const result = rollDice(chainDown, 1, defaultRoll.modifier);
					console.log('ROLL RESULT: ', result);
					if (element.getAttribute('data-action') === 'roll-melee' || element.getAttribute('data-action') === 'roll-ranged') {
						let sibling = element.nextElementSibling;
						while (sibling && !sibling.classList.contains('damage-dice')) {
							sibling = sibling.nextElementSibling;
						}
						const damageInput = sibling as HTMLInputElement;
						const resultDamage = rollFormula(damageInput ? damageInput.value : '1d4');
						console.log('ROLL RESULT DAMAGE: ', resultDamage);
					}
				}
			},
			{
				label: 'Roll custom...', action: () => {
					getCustomRoll(defaultRoll.name, [defaultRoll.die], [defaultRoll.modifier], ['Action Die:'], ['Modifier:']).then((result) => {
						if (result) {
							const rollResult = rollDice(result.dice[0], 1, result.modifiers[0]);
							console.log('ROLL RESULT: ', rollResult);
							if (element.getAttribute('data-action') === 'roll-melee' || element.getAttribute('data-action') === 'roll-ranged') {
								let sibling = element.nextElementSibling;
								while (sibling && !sibling.classList.contains('damage-dice')) {
									sibling = sibling.nextElementSibling;
								}
								const damageInput = sibling as HTMLInputElement;
								const damageResult = rollFormula(damageInput ? damageInput.value : '1d4');
								console.log('ROLL RESULT DAMAGE: ', damageResult);
							}
						}
					});
				}
			}
		];
		if (element.getAttribute('data-action') !== 'roll-artifact-check') {
			menuOptions.push({
				label: 'Edit defaults...', action: () => {
					const action = element.getAttribute('data-action');
					if (action === 'roll-attribute') {
						const attributeName = element.getAttribute('data-attribute') || 'unknown';
						const currentDefaults = localState.defaults_attributes?.[attributeName];
						getEditModal('attribute-defaults', `Edit ${attributeName} Defaults`, currentDefaults).then((result) => {
							if (result) {
								if (!localState.defaults_attributes) localState.defaults_attributes = {};
								localState.defaults_attributes[attributeName] = result;
								saveState();
								updateAttributeLabels();
								updateModifiers();
							}
						});
					} else if (action === 'roll-melee' || action === 'roll-ranged') {
						const repeatingDiv = element.closest('.repeating');
						if (repeatingDiv) {
							const stateKey = getStateKey(repeatingDiv);
							const definition = getDefinition(stateKey);
							const childIndex = Array.from(repeatingDiv.children).indexOf(element);
							const itemIndex = Math.floor(childIndex / definition.length);
							const list = getListFromState(stateKey);
							if (list && list[itemIndex]) {
								let currentDefaults = list[itemIndex].defaults;
								getEditModal('weapon-defaults', 'Edit Weapon Defaults', currentDefaults).then((result) => {
									if (result) {
										list[itemIndex].defaults = result;
										saveState();
									}
								});
							}
						}
					}
				}
			});
		}
		showContextMenu(event.pageX, Math.min(event.pageY, 520), menuOptions);
	}
});

document.addEventListener('click', (event) => {
	const element = event.target as HTMLElement;
	if (element.classList.contains('add-item')) {
		const container = element.closest('.container-with-header');
		const repeatingDiv = container?.querySelector('.repeating');
		if (!repeatingDiv) return;

		const stateKey = getStateKey(repeatingDiv);
		const definition = getDefinition(stateKey);

		if (stateKey && definition) {
			// Create new item
			const newItem: Record<string, any> = {};
			definition.forEach(def => {
				if (def.key) {
					newItem[def.key] = ""; // Default empty string
				}
			});

			if (stateKey === 'weapons-ranged') {
				newItem.defaults = { attribute: 'agility', actionDie: 'default' };
			} else if (stateKey === 'weapons-melee') {
				newItem.defaults = { attribute: 'strength', actionDie: 'default' };
			}

			// Add to state
			addItemToState(stateKey, newItem);

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
	if (action === 'roll-melee' || action === 'roll-ranged') {
		rollDefaultAttack(element);
	} else if (action === 'edit-power' || action === 'edit-notes') {
		const parent = element.parentElement;
		if (!parent) return;

		const stateKey = getStateKey(parent);
		const definition = getDefinition(stateKey);

		if (definition.length > 0) {
			const index = Array.from(parent.children).indexOf(element);
			const itemIndex = Math.floor(index / definition.length);

			// Get current value
			const list = getListFromState(stateKey);
			if (!list) return;

			const item = list[itemIndex];
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

const getDefaultRollForElement = (element: HTMLElement): { name: string, die: number, modifier: number } => {
	const action = element.getAttribute('data-action');
	const roll = parseFormula(document.querySelector<HTMLInputElement>('.data-action-dice')?.value || '1d20');
	if (action === 'roll-melee' || action === 'roll-ranged') {
		let diceSides = roll.dice[0].sides;
		const repeatingDiv = element.closest('.repeating')!;
		const stateKey = getStateKey(repeatingDiv);
		const definition = getDefinition(stateKey);
		const childIndex = Array.from(repeatingDiv.children).indexOf(element);
		const itemIndex = Math.floor(childIndex / definition.length);
		const startIndex = itemIndex * definition.length;
		const endIndex = startIndex + definition.length;
		const itemChildren = Array.from(repeatingDiv.children).slice(startIndex, endIndex);
		const attackInput = itemChildren.find(c => c.classList.contains('attack-bonus'))! as HTMLInputElement;
		let attackBonus = parseInt(attackInput.value || '0');
		let attributeMod = 0;
		const list = getListFromState(stateKey)!;
		const defaults = list[itemIndex].defaults;
		if (defaults) {
			if (defaults.attribute) {
				const attributeClass = `.data-attributes_${defaults.attribute}_current`;
				attributeMod = getModifier(parseInt(document.querySelector<HTMLInputElement>(attributeClass)!.value || '10'));
				const attrDefaults = localState.defaults_attributes?.[defaults.attribute];
				if (attrDefaults && attrDefaults.modifier) {
					attributeMod += parseInt(String(attrDefaults.modifier));
				}
				attackBonus += attributeMod;
			}
			if (defaults.actionDie && defaults.actionDie !== 'default') {
				const parsed = parseFormula(defaults.actionDie);
				if (parsed.dice.length > 0) diceSides = parsed.dice[0].sides;
			}
		}
		return { name: 'Attack Check', die: diceSides, modifier: attackBonus };
	}
	else if (action === 'roll-attribute') {
		const attributeName = element.getAttribute('data-attribute') || 'unknown';
		const attributeClass = `.data-attributes_${attributeName}_current`;
		let attributeCurrent = getModifier(parseInt(document.querySelector<HTMLInputElement>(attributeClass)!.value || '10'));
		const defaults = localState.defaults_attributes?.[attributeName];
		let diceSides = roll.dice[0].sides;
		if (defaults) {
			if (defaults.modifier) attributeCurrent += parseInt(String(defaults.modifier));
			if (defaults.actionDie && defaults.actionDie !== 'default') {
				const parsed = parseFormula(defaults.actionDie);
				if (parsed.dice.length > 0) diceSides = parsed.dice[0].sides;
			}
		}
		return { name: `${attributeName.charAt(0).toUpperCase() + attributeName.slice(1)} Check`, die: diceSides, modifier: attributeCurrent };
	}
	else if (action === 'roll-artifact-check') {
		const artifactCheck = parseInt(document.querySelector<HTMLInputElement>('.data-artifact-check')!.value || '1');
		return { name: 'Artifact Check', die: roll.dice[0].sides, modifier: artifactCheck };
	}
	else return { name: 'Default Check', die: roll.dice[0].sides, modifier: 0 };
}

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
		let modifier = getModifier(score);

		const defaults = localState.defaults_attributes?.[attr];
		if (defaults && defaults.modifier) {
			modifier += parseInt(String(defaults.modifier));
		}

		const formattedModifier = modifier >= 0 ? `+${modifier}` : `${modifier}`;

		const circleDiv = currentInput.closest('.circle');
		const modifierSection = circleDiv?.nextElementSibling;
		if (modifierSection && modifierSection.classList.contains('modifier-section')) {
			const modInput = modifierSection.querySelector('.modifier input') as HTMLInputElement;
			if (modInput) {
				modInput.value = formattedModifier;
				modInput.disabled = true;
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
			url: `/modifier_modal.html${urlParams}`,
			height: 150,
			width: 280 * (Math.ceil((dice.length + modifiers.length) / 2))
		});
	});
};

function rollDefaultAttack(element: HTMLElement) {
	const parent = element.parentElement;
	if (!parent) return;
	const defaultRoll = getDefaultRollForElement(element);
	let sibling = element.nextElementSibling;
	while (sibling && !sibling.classList.contains('damage-dice')) {
		sibling = sibling.nextElementSibling;
	}
	const damageDiceInput = sibling as HTMLInputElement;
	const damageDice = damageDiceInput.value == '' ? '1d4' : damageDiceInput.value;
	const result = rollDice(defaultRoll.die, 1, defaultRoll.modifier);
	const resultDamage = rollFormula(damageDice);
	console.log('ROLL RESULT: ', result);
	console.log('ROLL RESULT DAMAGE: ', resultDamage);
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
		if (keyPath === 'artifact-check') {
			const num = parseInt(element.value) || 0;
			element.value = num >= 0 ? `+${num}` : `${num}`;
			target[parts[parts.length - 1]] = num;
		} else {
			target[parts[parts.length - 1]] = element.value;
		}
		if (dataClass.includes('attributes') && dataClass.includes('current')) {
			updateModifiers();
		}
		saveState();
		return;
	}

	// Handle repeatable inputs
	const repeatingDiv = element.closest('.repeating');
	if (repeatingDiv && element.dataset.key) {
		const stateKey = getStateKey(repeatingDiv);
		const definition = getDefinition(stateKey);

		if (stateKey && definition.length > 0) {
			const childIndex = Array.from(repeatingDiv.children).indexOf(element);
			if (childIndex !== -1) {
				const itemIndex = Math.floor(childIndex / definition.length);

				// Get the array from localState
				const list = getListFromState(stateKey);

				if (list && list[itemIndex]) {
					list[itemIndex][element.dataset.key] = element.type === 'checkbox' ? element.checked : element.value;
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

const getEditModal = (type: 'power' | 'notes' | 'attribute-defaults' | 'weapon-defaults', title: string, initialValue: any): Promise<any> => {
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
		let height = 325;
		if (type === 'notes') height = 600;
		if (type === 'attribute-defaults' || type === 'weapon-defaults') height = 400;

		OBR.modal.open({
			id: modalId,
			url: `/edit_modal.html${urlParams}`,
			height: height,
			width: width
		});
	});
};

const getDefinition = (stateKey: string) => {
	switch (stateKey) {
		case 'weapons-melee': return repeatableDefinitions.definitionWeaponsMelee;
		case 'weapons-ranged': return repeatableDefinitions.definitionWeaponsRanged;
		case 'armor': return repeatableDefinitions.definitionArmor;
		case 'items': return repeatableDefinitions.definitionItems;
		case 'artifacts': return repeatableDefinitions.definitionArtifacts;
		case 'mutations_passive': return repeatableDefinitions.definitionMutationsPassive;
		case 'mutations_active': return repeatableDefinitions.definitionMutationsActive;
		case 'abilities': return repeatableDefinitions.definitionAbilities;
		case 'notes': return repeatableDefinitions.definitionNotes;
		default: return [];
	}
}

const getElementClass = (stateKey: string) => {
	switch (stateKey) {
		case 'weapons-melee': return 'repeating-weapons-melee';
		case 'weapons-ranged': return 'repeating-weapons-ranged';
		case 'armor': return 'repeating-armor';
		case 'items': return 'repeating-items';
		case 'artifacts': return 'repeating-artifacts';
		case 'mutations_passive': return 'repeating-mutations-passive';
		case 'mutations_active': return 'repeating-mutations-active';
		case 'abilities': return 'repeating-abilities';
		case 'notes': return 'repeating-notes';
		default: return '';
	}
}

const getStateKey = (element: Element): string => {
	if (element.classList.contains('repeating-weapons-melee')) return 'weapons-melee';
	if (element.classList.contains('repeating-weapons-ranged')) return 'weapons-ranged';
	if (element.classList.contains('repeating-armor')) return 'armor';
	if (element.classList.contains('repeating-items')) return 'items';
	if (element.classList.contains('repeating-artifacts')) return 'artifacts';
	if (element.classList.contains('repeating-mutations-passive')) return 'mutations_passive';
	if (element.classList.contains('repeating-mutations-active')) return 'mutations_active';
	if (element.classList.contains('repeating-abilities')) return 'abilities';
	if (element.classList.contains('repeating-notes')) return 'notes';
	return '';
}

const getListFromState = (stateKey: string): any[] | null => {
	let target: any = localState;
	const parts = stateKey.split('_');
	for (let i = 0; i < parts.length - 1; i++) {
		if (!target[parts[i]]) return null;
		target = target[parts[i]];
	}
	const lastKey = parts[parts.length - 1];
	return target[lastKey] || null;
}

const addItemToState = (stateKey: string, item: any) => {
	let target: any = localState;
	const parts = stateKey.split('_');
	for (let i = 0; i < parts.length - 1; i++) {
		if (!target[parts[i]]) target[parts[i]] = {};
		target = target[parts[i]];
	}
	const lastKey = parts[parts.length - 1];
	if (!target[lastKey]) target[lastKey] = [];
	target[lastKey].push(item);
}

const moveItem = (stateKey: string, index: number, direction: number) => {
	const list = getListFromState(stateKey);
	if (!list) return;

	const newIndex = index + direction;
	if (newIndex < 0 || newIndex >= list.length) return;

	const item = list[index];
	list.splice(index, 1);
	list.splice(newIndex, 0, item);

	saveState();
	const elementClass = getElementClass(stateKey);
	const definition = getDefinition(stateKey);
	if (elementClass && definition) {
		loadFromDefinition(stateKey, elementClass, definition);
	}
}

const deleteItem = (stateKey: string, index: number) => {
	const list = getListFromState(stateKey);
	if (!list) return;

	list.splice(index, 1);

	saveState();
	const elementClass = getElementClass(stateKey);
	const definition = getDefinition(stateKey);
	if (elementClass && definition) {
		loadFromDefinition(stateKey, elementClass, definition);
	}
}

document.addEventListener('click', (event) => {
	const element = event.target as HTMLElement;
	if (element.classList.contains('edit-list')) {
		const container = element.closest('.container-with-header');
		const repeatingDiv = container?.querySelector('.repeating');
		if (!repeatingDiv) return;

		const stateKey = getStateKey(repeatingDiv);

		if (stateKey) {
			editModes[stateKey] = !editModes[stateKey];
			element.classList.toggle('active', editModes[stateKey]);
			element.innerText = editModes[stateKey] ? '✔' : '✎';
			const addButton = container?.querySelector<HTMLButtonElement>('.add-item');
			if (addButton) {
				addButton.disabled = editModes[stateKey];
			}

			const definition = getDefinition(stateKey);
			if (definition) {
				loadFromDefinition(stateKey, repeatingDiv.className.split(' ').find(c => c.startsWith('repeating-'))!, definition);
			}
		}
	}
});

const loadFromDefinition = function (stateKey: string, elementClass: string, definition: Array<any>) {
	let child
	let parent = document.querySelector<HTMLInputElement>(`.${elementClass}`);
	if (!parent) return;
	parent.innerHTML = '';

	if (editModes[stateKey]) {
		parent.classList.add('editing');
	} else {
		parent.classList.remove('editing');
	}

	const value = getListFromState(stateKey);

	if (editModes[stateKey]) {
		for (let j = 0; j < (value?.length || 0); j++) {
			const row = document.createElement('div');
			row.className = 'edit-row';

			const label = document.createElement('span');
			const item = value![j];
			let labelText = item.name || item.description || item.note || `Item ${j + 1}`;
			if (typeof labelText !== 'string') labelText = JSON.stringify(labelText);
			label.textContent = labelText;
			row.appendChild(label);

			const upBtn = document.createElement('button');
			upBtn.textContent = '⏶';
			upBtn.onclick = () => moveItem(stateKey, j, -1);
			row.appendChild(upBtn);

			const downBtn = document.createElement('button');
			downBtn.textContent = '⏷';
			downBtn.onclick = () => moveItem(stateKey, j, 1);
			row.appendChild(downBtn);

			const delBtn = document.createElement('button');
			delBtn.textContent = '🞬';
			delBtn.onclick = () => deleteItem(stateKey, j);
			row.appendChild(delBtn);

			parent.appendChild(row);
		}
	} else {
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
						if (definition[i].attributes?.type === 'checkbox') {
							(child as any).checked = val === 'true' || val === true;
						} else {
							(child as any).value = val;
						}
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
				if (input === 'artifact-check') {
					const num = parseInt(String(value)) || 0;
					element.value = num >= 0 ? `+${num}` : `${num}`;
				} else {
					element.value = String(value);
				}
			}
		}
	});

	const repeatableKeys = [
		"weapons-melee", "weapons-ranged", "armor", "items", "artifacts",
		"mutations_passive", "mutations_active", "abilities", "notes"
	];

	repeatableKeys.forEach(key => {
		loadFromDefinition(key, getElementClass(key), getDefinition(key));
	});

	updateModifiers();
	updateAttributeLabels();
	console.log('Loaded data:', localState);
}

const updateAttributeLabels = () => {
	const attributes = ['strength', 'agility', 'stamina', 'intelligence', 'personality', 'luck'];
	attributes.forEach(attr => {
		const label = document.querySelector(`.context[data-attribute="${attr}"]`);
		if (label) {
			const defaults = localState.defaults_attributes?.[attr];
			const hasDefaults = defaults && (defaults.modifier !== 0 || (defaults.actionDie && defaults.actionDie !== 'default' && defaults.actionDie !== 'd20'));
			label.textContent = attr.charAt(0).toUpperCase() + attr.slice(1) + (hasDefaults ? '*' : '');
		}
	});
	// Special case for luck-under
	const luckUnderLabel = document.querySelector(`.context[data-attribute="luck-under"]`);
	if (luckUnderLabel) {
		const defaults = localState.defaults_attributes?.['luck-under'];
		const hasDefaults = defaults && (defaults.modifier !== 0 || (defaults.actionDie && defaults.actionDie !== 'default' && defaults.actionDie !== 'd20'));
		luckUnderLabel.textContent = 'Luck' + (hasDefaults ? '*' : '');
	}
}

OBR.onReady(() => {
	console.log('Owlbear Rodeo SDK is ready!')
	loadData()

	const reloadChannel = new BroadcastChannel('owlbear-mcc-reload');
	reloadChannel.onmessage = (event) => {
		if (event.data.type === 'reload') {
			loadData();
		}
	};

	document.querySelector('.reload')?.addEventListener('click', () => {
		OBR.modal.open({
			id: 'mcc-slots-modal',
			url: '/slots_modal.html',
			height: 500,
			width: 350
		});
	});
})