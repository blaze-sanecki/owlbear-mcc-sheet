import OBR from '@owlbear-rodeo/sdk';

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
		}
		channel.postMessage({ type: 'submit', value: result });
		OBR.modal.close('mcc-modal');
	});

	document.getElementById('cancel')!.addEventListener('click', () => {
		channel.postMessage({ type: 'cancel' });
		OBR.modal.close('mcc-modal');
	});
});
