import OBR from '@owlbear-rodeo/sdk';
import { diceChain } from './dice';

const channel = new BroadcastChannel('owlbear-mcc-modal');

OBR.onReady(async () => {
	const urlParams = new URLSearchParams(window.location.search);
	const type = urlParams.get('type');
	const title = urlParams.get('title');
	const initialValue = urlParams.get('value');

	if (title) {
		document.getElementById('modal-title')!.textContent = title;
	}

	const contentDiv = document.getElementById('content')!;
	let inputs: Record<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = {};

	if (type === 'power') {
		let valueObj = { source: 'battery', batteries: { c: '', f: '', q: '' } };
		try {
			if (initialValue) {
				const parsed = JSON.parse(initialValue);
				// Migrate old format if necessary
				if (parsed.batteryType) {
					valueObj.batteries[parsed.batteryType.toLowerCase() as 'c' | 'f' | 'q'] = String(parsed.charges || '');
				} else {
					valueObj = { ...valueObj, ...parsed };
				}
			}
		} catch (e) {
			console.error("Failed to parse initial value", e);
		}

		// Power Source Selection
		const sourceLabel = document.createElement('label');
		sourceLabel.textContent = "Power Source";
		contentDiv.appendChild(sourceLabel);

		const sourceSelect = document.createElement('select');
		['battery', 'self'].forEach(s => {
			const option = document.createElement('option');
			option.value = s;
			option.textContent = s === 'battery' ? 'Battery' : 'Self Powered';
			if (s === valueObj.source) option.selected = true;
			sourceSelect.appendChild(option);
		});
		contentDiv.appendChild(sourceSelect);
		inputs['source'] = sourceSelect;

		// Battery Details Container
		const batteryContainer = document.createElement('div');
		batteryContainer.style.display = valueObj.source === 'battery' ? 'flex' : 'none';
		batteryContainer.style.flexDirection = 'column';
		batteryContainer.style.gap = '8px';
		batteryContainer.style.marginTop = '10px';
		contentDiv.appendChild(batteryContainer);

		sourceSelect.addEventListener('change', () => {
			batteryContainer.style.display = sourceSelect.value === 'battery' ? 'flex' : 'none';
		});

		// Battery Inputs
		['C', 'F', 'Q'].forEach(t => {
			const row = document.createElement('div');
			row.style.display = 'flex';
			row.style.alignItems = 'center';
			row.style.gap = '10px';

			const label = document.createElement('label');
			label.textContent = `Type ${t}`;
			label.style.width = '60px';
			row.appendChild(label);

			const input = document.createElement('input');
			input.type = 'text';
			input.placeholder = "Charges (e.g. 10, unlimited)";
			input.value = valueObj.batteries[t.toLowerCase() as 'c' | 'f' | 'q'] || '';
			row.appendChild(input);
			inputs[`battery_${t}`] = input;

			batteryContainer.appendChild(row);
		});

	} else if (type === 'notes') {
		const notesInput = document.createElement('textarea');
		notesInput.value = initialValue || '';
		notesInput.placeholder = "Enter notes here...";
		contentDiv.appendChild(notesInput);
		inputs['notes'] = notesInput;
	} else if (type === 'attribute-defaults') {
		let valueObj = { modifier: 0, actionDie: 'd20' };
		try {
			if (initialValue && initialValue !== 'undefined') valueObj = { ...valueObj, ...JSON.parse(initialValue) };
		} catch (e) { console.error(e); }

		if (!valueObj.actionDie || valueObj.actionDie === 'default') {
			valueObj.actionDie = 'd20';
		}

		const modLabel = document.createElement('label');
		modLabel.textContent = "Additional Modifier";
		contentDiv.appendChild(modLabel);

		const modWrapper = document.createElement('div');
		modWrapper.style.display = 'flex';
		modWrapper.style.alignItems = 'center';
		modWrapper.style.gap = '4px';

		const modMinusBtn = document.createElement('button');
		modMinusBtn.textContent = '-';
		modMinusBtn.tabIndex = -1;
		modMinusBtn.style.width = '30px';

		const modInput = document.createElement('input');
		modInput.type = 'text';
		modInput.inputMode = 'numeric';
		modInput.style.textAlign = 'center';
		modInput.style.width = '50px';

		const formatValue = (v: string | number) => {
			const num = typeof v === 'string' ? parseInt(v) : v;
			if (!isNaN(num) && num >= 0) {
				return `+${num}`;
			}
			return num.toString();
		};
		modInput.value = formatValue(valueObj.modifier);

		modInput.addEventListener('change', () => {
			modInput.value = formatValue(modInput.value);
		});

		const modPlusBtn = document.createElement('button');
		modPlusBtn.textContent = '+';
		modPlusBtn.tabIndex = -1;
		modPlusBtn.style.width = '30px';

		modMinusBtn.addEventListener('click', () => {
			const current = parseInt(modInput.value) || 0;
			modInput.value = formatValue(current - 1);
		});

		modPlusBtn.addEventListener('click', () => {
			const current = parseInt(modInput.value) || 0;
			modInput.value = formatValue(current + 1);
		});

		modWrapper.appendChild(modMinusBtn);
		modWrapper.appendChild(modInput);
		modWrapper.appendChild(modPlusBtn);
		contentDiv.appendChild(modWrapper);
		inputs['modifier'] = modInput;

		const dieLabel = document.createElement('label');
		dieLabel.textContent = "Override Action Die";
		contentDiv.appendChild(dieLabel);

		const dieWrapper = document.createElement('div');
		dieWrapper.style.display = 'flex';
		dieWrapper.style.alignItems = 'center';
		dieWrapper.style.gap = '4px';

		const dieMinusBtn = document.createElement('button');
		dieMinusBtn.textContent = '-';
		dieMinusBtn.tabIndex = -1;
		dieMinusBtn.style.width = '30px';

		const dieSelect = document.createElement('select');
		dieSelect.style.textAlign = 'center';
		dieSelect.style.width = '80px';
		const dice = [...diceChain.map(d => `d${d}`)];
		dice.forEach(d => {
			const option = document.createElement('option');
			option.value = d;
			option.textContent = d;
			if (d === valueObj.actionDie) option.selected = true;
			dieSelect.appendChild(option);
		});

		const diePlusBtn = document.createElement('button');
		diePlusBtn.textContent = '+';
		diePlusBtn.tabIndex = -1;
		diePlusBtn.style.width = '30px';

		dieMinusBtn.addEventListener('click', () => {
			const idx = dieSelect.selectedIndex;
			if (idx > 0) {
				dieSelect.selectedIndex = idx - 1;
			}
		});

		diePlusBtn.addEventListener('click', () => {
			const idx = dieSelect.selectedIndex;
			if (idx < dieSelect.options.length - 1) {
				dieSelect.selectedIndex = idx + 1;
			}
		});

		dieWrapper.appendChild(dieMinusBtn);
		dieWrapper.appendChild(dieSelect);
		dieWrapper.appendChild(diePlusBtn);
		contentDiv.appendChild(dieWrapper);
		inputs['actionDie'] = dieSelect;

	} else if (type === 'weapon-defaults') {
		let valueObj = { attribute: 'strength', actionDie: 'default' };
		try {
			if (initialValue && initialValue !== 'undefined') valueObj = { ...valueObj, ...JSON.parse(initialValue) };
		} catch (e) { console.error(e); }

		const attrLabel = document.createElement('label');
		attrLabel.textContent = "Attribute Used";
		contentDiv.appendChild(attrLabel);
		const attrSelect = document.createElement('select');
		const attributes = ['strength', 'agility', 'stamina', 'intelligence', 'personality', 'luck'];

		const noneOption = document.createElement('option');
		noneOption.value = '';
		noneOption.textContent = 'None';
		attrSelect.appendChild(noneOption);

		attributes.forEach(a => {
			const option = document.createElement('option');
			option.value = a;
			option.textContent = a.charAt(0).toUpperCase() + a.slice(1);
			if (a === valueObj.attribute) option.selected = true;
			attrSelect.appendChild(option);
		});
		contentDiv.appendChild(attrSelect);
		inputs['attribute'] = attrSelect;

		const dieLabel = document.createElement('label');
		dieLabel.textContent = "Override Action Die";
		contentDiv.appendChild(dieLabel);

		const dieWrapper = document.createElement('div');
		dieWrapper.style.display = 'flex';
		dieWrapper.style.alignItems = 'center';
		dieWrapper.style.gap = '4px';

		const dieMinusBtn = document.createElement('button');
		dieMinusBtn.textContent = '-';
		dieMinusBtn.tabIndex = -1;
		dieMinusBtn.style.width = '30px';

		const dieSelect = document.createElement('select');
		dieSelect.style.textAlign = 'center';
		dieSelect.style.width = '80px';
		const dice = ['default', ...diceChain.map(d => `d${d}`)];
		dice.forEach(d => {
			const option = document.createElement('option');
			option.value = d;
			option.textContent = d;
			if (d === valueObj.actionDie) option.selected = true;
			dieSelect.appendChild(option);
		});

		const diePlusBtn = document.createElement('button');
		diePlusBtn.textContent = '+';
		diePlusBtn.tabIndex = -1;
		diePlusBtn.style.width = '30px';

		dieMinusBtn.addEventListener('click', () => {
			const idx = dieSelect.selectedIndex;
			if (idx > 0) {
				dieSelect.selectedIndex = idx - 1;
			}
		});

		diePlusBtn.addEventListener('click', () => {
			const idx = dieSelect.selectedIndex;
			if (idx < dieSelect.options.length - 1) {
				dieSelect.selectedIndex = idx + 1;
			}
		});

		dieWrapper.appendChild(dieMinusBtn);
		dieWrapper.appendChild(dieSelect);
		dieWrapper.appendChild(diePlusBtn);
		contentDiv.appendChild(dieWrapper);
		inputs['actionDie'] = dieSelect;
	}

	document.getElementById('confirm')!.addEventListener('click', () => {
		let result: any;
		if (type === 'power') {
			result = {
				source: inputs['source'].value,
				batteries: {
					c: inputs['battery_C'].value,
					f: inputs['battery_F'].value,
					q: inputs['battery_Q'].value
				}
			};
		} else if (type === 'notes') {
			result = inputs['notes'].value;
		} else if (type === 'attribute-defaults') {
			result = {
				modifier: parseInt(inputs['modifier'].value) || 0,
				actionDie: inputs['actionDie'].value || 'default'
			};
		} else if (type === 'weapon-defaults') {
			result = {
				attribute: inputs['attribute'].value,
				actionDie: inputs['actionDie'].value || 'default'
			};
		}
		channel.postMessage({ type: 'submit', value: result });
		OBR.modal.close('mcc-modal');
	});

	document.getElementById('cancel')!.addEventListener('click', () => {
		channel.postMessage({ type: 'cancel' });
		OBR.modal.close('mcc-modal');
	});
});
