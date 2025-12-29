import OBR from '@owlbear-rodeo/sdk';
import { diceChain } from './dice';

const channel = new BroadcastChannel('owlbear-mcc-modal');

OBR.onReady(async () => {
	// Set title from query param
	const urlParams = new URLSearchParams(window.location.search);
	const title = urlParams.get('title');
	if (title) {
		const header = document.querySelector('h3');
		if (header) header.textContent = title;
	}

	const container = document.getElementById('inputs-container') as HTMLDivElement;
	const confirmBtn = document.getElementById('confirm') as HTMLButtonElement;
	const cancelBtn = document.getElementById('cancel') as HTMLButtonElement;

	const dice = urlParams.getAll('die');
	const dieNames = urlParams.getAll('dieName');
	const modifiers = urlParams.getAll('modifier');
	const modifierNames = urlParams.getAll('modifierName');

	container.style.gridTemplateColumns = `repeat(${dice.length + modifiers.length}, min-content)`;

	// Default to at least one if none provided, though usually they will be.
	if (dice.length === 0 && modifiers.length === 0) {
		dice.push('0');
		modifiers.push('0');
	}
	for (let i = 0; i < dice.length; i++) {
		const p = document.createElement('p');
		const name = dieNames[i] || `Action Die${dice.length > 1 ? ' ' + (i + 1) : ''}`;
		p.textContent = `${name}`;
		container.appendChild(p);
	}
	for (let i = 0; i < modifiers.length; i++) {
		const p = document.createElement('p');
		const name = modifierNames[i] || `Modifier${modifiers.length > 1 ? ' ' + (i + 1) : ''}`;
		p.textContent = `${name}`;
		container.appendChild(p);
	}
	dice.forEach((val) => {
		const wrapper = document.createElement('div');
		wrapper.className = 'input-wrapper';
		wrapper.style.display = 'flex';
		wrapper.style.alignItems = 'center';
		wrapper.style.gap = '4px';

		const minusBtn = document.createElement('button');
		minusBtn.textContent = '-';
		minusBtn.tabIndex = -1;

		const select = document.createElement('select');
		select.className = 'die-input';

		// Ensure the current value is in the list if it's not standard
		const currentVal = parseInt(val);
		const chain = [...diceChain];
		if (!isNaN(currentVal) && !chain.includes(currentVal)) {
			chain.push(currentVal);
			chain.sort((a, b) => a - b);
		}

		chain.forEach(d => {
			const option = document.createElement('option');
			option.value = d.toString();
			option.textContent = `d${d}`;
			if (d.toString() === val) {
				option.selected = true;
			}
			select.appendChild(option);
		});

		const plusBtn = document.createElement('button');
		plusBtn.textContent = '+';
		plusBtn.tabIndex = -1;

		minusBtn.addEventListener('click', () => {
			const idx = select.selectedIndex;
			if (idx > 0) {
				select.selectedIndex = idx - 1;
			}
		});

		plusBtn.addEventListener('click', () => {
			const idx = select.selectedIndex;
			if (idx < select.options.length - 1) {
				select.selectedIndex = idx + 1;
			}
		});

		wrapper.appendChild(minusBtn);
		wrapper.appendChild(select);
		wrapper.appendChild(plusBtn);
		container.appendChild(wrapper);
	});

	modifiers.forEach((val) => {
		const wrapper = document.createElement('div');
		wrapper.className = 'input-wrapper';
		wrapper.style.display = 'flex';
		wrapper.style.alignItems = 'center';
		wrapper.style.gap = '4px';

		const minusBtn = document.createElement('button');
		minusBtn.textContent = '-';
		minusBtn.tabIndex = -1;

		const input = document.createElement('input');
		input.type = 'text';
		input.inputMode = 'numeric';
		input.className = 'modifier-input';

		const formatValue = (v: string | number) => {
			const num = typeof v === 'string' ? parseInt(v) : v;
			if (!isNaN(num) && num >= 0) {
				return `+${num}`;
			}
			return num.toString();
		};

		input.value = formatValue(val);

		input.addEventListener('change', () => {
			input.value = formatValue(input.value);
		});

		const plusBtn = document.createElement('button');
		plusBtn.textContent = '+';
		plusBtn.tabIndex = -1;

		minusBtn.addEventListener('click', () => {
			const current = parseInt(input.value) || 0;
			input.value = formatValue(current - 1);
		});

		plusBtn.addEventListener('click', () => {
			const current = parseInt(input.value) || 0;
			input.value = formatValue(current + 1);
		});

		wrapper.appendChild(minusBtn);
		wrapper.appendChild(input);
		wrapper.appendChild(plusBtn);
		container.appendChild(wrapper);
	});

	const allInputs = container.querySelectorAll('input, select');

	// Focus first input on load
	setTimeout(() => {
		if (allInputs.length > 0) {
			(allInputs[0] as HTMLElement).focus();
			if (allInputs[0] instanceof HTMLInputElement) {
				allInputs[0].select();
			}
		}
	}, 100);

	// Handle Enter key in inputs
	allInputs.forEach(input => {
		input.addEventListener('keydown', (e) => {
			const key = (e as KeyboardEvent).key;
			if (key === 'Enter') {
				submitModifier();
			} else if (key === 'Escape') {
				cancelModifier();
			}
		});
	});

	confirmBtn.addEventListener('click', () => {
		submitModifier();
	});

	cancelBtn.addEventListener('click', () => {
		cancelModifier();
	});

	function submitModifier() {
		const dieInputs = container.querySelectorAll('.die-input');
		const modifierInputs = container.querySelectorAll('.modifier-input');

		const dieValues = Array.from(dieInputs).map(input => parseInt((input as HTMLInputElement | HTMLSelectElement).value, 10) || 0);
		const modifierValues = Array.from(modifierInputs).map(input => parseInt((input as HTMLInputElement).value, 10) || 0);

		channel.postMessage({
			type: 'submit',
			dice: dieValues,
			modifiers: modifierValues
		});
		OBR.modal.close('mcc-modal');
	}

	function cancelModifier() {
		channel.postMessage({ type: 'cancel' });
		OBR.modal.close('mcc-modal');
	}

	window.addEventListener('beforeunload', () => {
		channel.postMessage({ type: 'cancel' });
	});
});
