import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	MarkdownPreviewRenderer,
	HoverParent,
	Setting,
	TFile,
	HoverPopover,

} from 'obsidian';
import { hoverTooltip } from "@codemirror/tooltip";

import axios from 'axios';


document.addEventListener('mousemove', (event) => {
	window.clientX = event.clientX;
	window.clientY = event.clientY;
});

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');





		const wordHover = hoverTooltip(async (view, pos, side) => {
			let { from, to, text } = view.state.doc.lineAt(pos);

			let start = pos;
			let end = pos;


			while (start > from && /[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DB5\u4E00-\u9FCC\uF900-\uFA6D\uFA70-\uFAD9]/.test(text[start - from - 1])) {
				start--;
			}
			while (end < to && /[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DB5\u4E00-\u9FCC\uF900-\uFA6D\uFA70-\uFAD9]/.test(text[end - from])) {
				end++;
			}
			if ((start === pos && side < 0) || (end === pos && side > 0)) {


				return null;
			}

			let dom = document.createElement("div");
			dom.style.padding = "10px";
			dom.style.border = "1px solid lightgray";
			dom.style.borderRadius = "4px";
			dom.style.position = "absolute";
			dom.style.backgroundColor = "white";
			dom.style.zIndex = "1000";
			dom.style.left = window.clientX + "px";
			dom.style.top = window.clientY + "px";
			dom.className = "cm-tooltip-cursor"
			let kanji = view.state.doc.slice(start, end);

			let firstKanji = kanji.text[0][0];


			let apiUrl = "https://kanjiapi.dev/v1/kanji/" + firstKanji;
			let result = await axios.get(apiUrl);

			if (result.status === 200) {
				let results = result.data;
				let kunReadings = results.kun_readings;
				dom.textContent = kunReadings[0];
			}
			else {
				return null;
			}


			if (window.kanji_tooltip) {
				document.body.removeChild(window.kanji_tooltip);
			}

			document.body.appendChild(dom);
			window.kanji_tooltip = dom;



			return null;
		});


		this.registerEditorExtension([wordHover]);



		this.registerMarkdownPostProcessor((element) => {
			//TODO: FOR LATER !!
			console.log("TEST");
			// We only want to add tooltips to:
			//  1. external links
			//  2. links which don't already show the href
			// const targetLinks = Array.from(element.getElementsByTagName("a")).filter(
			//   (link) =>
			// 	link.classList.contains("external-link") &&
			// 	link.href !== link.innerHTML
			// );

			new Notice('This is a notice!');

			// for (const link of targetLinks) {
			//   tippy(link, {
			// 	content: link.href,
			//   });
			// }
		});



		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for my awesome plugin.' });

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
