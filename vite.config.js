import { defineConfig } from "vite";
import { resolve } from "node:path";

// https://vite.dev/config/
export default defineConfig({
	server: {
		cors: {
			origin: "https://www.owlbear.rodeo",
		},
	},
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
				edit_modal: resolve(__dirname, "edit_modal.html"),
				modifier_modal: resolve(__dirname, "modifier_modal.html"),
				slots_modal: resolve(__dirname, "slots_modal.html"),
				notification: resolve(__dirname, "notification.html"),
			},
		},
	},
});