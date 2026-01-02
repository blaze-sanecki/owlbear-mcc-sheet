import OBR from "@owlbear-rodeo/sdk";

const ID = 'quest.jelonek.owlbear.mcc';

OBR.onReady(async () => {
	const PLAYER_ID = await OBR.player.getId();
	const slotsContainer = document.getElementById('slots-container')!;
	const importBtn = document.getElementById('btn-import')!;
	const exportBtn = document.getElementById('btn-export')!;
	const importAllBtn = document.getElementById('btn-import-all')!;
	const exportAllBtn = document.getElementById('btn-export-all')!;
	const fileInput = document.getElementById('file-input') as HTMLInputElement;
	const fileInputAll = document.getElementById('file-input-all') as HTMLInputElement;

	const getCurrentSlot = () => localStorage.getItem(`${ID}/${PLAYER_ID}/last_slot`) || "1";

	const renderSlots = () => {
		slotsContainer.innerHTML = '';
		const currentSlot = getCurrentSlot();

		for (let i = 1; i <= 5; i++) {
			const btn = document.createElement('button');
			const slotData = JSON.parse(localStorage.getItem(`${ID}/${PLAYER_ID}/slot_${i}`) || '{}');
			const name = slotData.name || `Empty Slot ${i}`;

			btn.textContent = `${i}. ${name}`;
			if (String(i) === currentSlot) {
				btn.classList.add('active');
			}

			btn.onclick = async () => {
				localStorage.setItem(`${ID}/${PLAYER_ID}/last_slot`, String(i));
				renderSlots();
				// Notify main window to reload
				const channel = new BroadcastChannel('owlbear-mcc-reload');
				channel.postMessage({ type: 'reload' });
				channel.close();
				// Close modal
				OBR.modal.close('mcc-slots-modal');
			};

			slotsContainer.appendChild(btn);
		}
	};

	renderSlots();

	exportBtn.onclick = () => {
		const currentSlot = getCurrentSlot();
		const data = localStorage.getItem(`${ID}/${PLAYER_ID}/slot_${currentSlot}`) || '{}';
		const parsed = JSON.parse(data);
		const name = parsed.name || `character_slot_${currentSlot}`;

		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${name}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	importBtn.onclick = () => {
		fileInput.click();
	};

	fileInput.onchange = (e) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const content = e.target?.result as string;
				const data = JSON.parse(content);
				const currentSlot = getCurrentSlot();

				localStorage.setItem(`${ID}/${PLAYER_ID}/slot_${currentSlot}`, JSON.stringify(data));
				renderSlots();

				// Notify main window to reload
				const channel = new BroadcastChannel('owlbear-mcc-reload');
				channel.postMessage({ type: 'reload' });
				channel.close();

				alert('Import successful!');
			} catch (err) {
				alert('Error importing file: ' + err);
			}
		};
		reader.readAsText(file);
	};

	exportAllBtn.onclick = () => {
		const allData: Record<string, any> = {};
		for (let i = 1; i <= 5; i++) {
			const data = localStorage.getItem(`${ID}/${PLAYER_ID}/slot_${i}`);
			if (data) {
				allData[`slot_${i}`] = JSON.parse(data);
			}
		}
		allData['last_slot'] = getCurrentSlot();

		const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `mcc_all_slots.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	importAllBtn.onclick = () => {
		fileInputAll.click();
	};

	fileInputAll.onchange = (e) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const content = e.target?.result as string;
				const data = JSON.parse(content);

				if (data.last_slot) {
					localStorage.setItem(`${ID}/${PLAYER_ID}/last_slot`, data.last_slot);
				}

				for (let i = 1; i <= 5; i++) {
					if (data[`slot_${i}`]) {
						localStorage.setItem(`${ID}/${PLAYER_ID}/slot_${i}`, JSON.stringify(data[`slot_${i}`]));
					}
				}

				renderSlots();

				// Notify main window to reload
				const channel = new BroadcastChannel('owlbear-mcc-reload');
				channel.postMessage({ type: 'reload' });
				channel.close();

				alert('Import All successful!');
			} catch (err) {
				alert('Error importing file: ' + err);
			}
		};
		reader.readAsText(file);
	};
});
