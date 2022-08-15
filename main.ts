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

import { findIndex, join } from 'lodash';


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
			dom.style.position = "absolute";
			dom.style.zIndex = "1000";
			dom.style.left = (window.clientX) + "px";
			dom.style.top = (window.clientY + 20) + "px";
			let kanjies = (view.state.doc.slice(start, end)).text[0];

			let firstKanji = kanjies[0];


			let wordsUrl = "https://kanjiapi.dev/v1/words/" + firstKanji;
			let wordsResult = await axios.get(wordsUrl);

			let word = null;
			let kanjiResults = [];

			for (let kanji of kanjies) {
				let kanjiUrl = "https://kanjiapi.dev/v1/kanji/" + kanji;
				let kanjiResult = await axios.get(kanjiUrl);
				if (kanjiResult.status === 200) {
					let results = kanjiResult.data;
					kanjiResults.push(results);
				}
			}


			if (wordsResult.status === 200) {
				let wordIndex = findIndex(wordsResult.data, (o) => {
					return o.variants[0].written == kanjies;
				});

				if (wordIndex !== -1) {
					word = wordsResult.data[wordIndex];
				}
			}

			let wordPart = "";
			let kanjiPart = "";

			if (word) {
				let wordInfo = word.variants[0];
				let wordMeaning = join(word.meanings[0].glosses, ", ");
				wordPart =
					`<div class="relative pb-3 text-base leading-7 text-gray-600">
						<a class="absolute top-4 right-0 text-xs" href="https://jisho.org/search/${wordInfo.written}%20%23sentences">
							<svg class="w-4 h-4 text-gray-300 duration-300 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
						</a>
						<div class="flex items-center gap-7 text-2xl">${wordInfo.written} <small>${wordInfo.pronounced}</small></div>
						<p class="text-sm">${wordMeaning}</p>  
					</div>`;
			}

			for (let kanji of kanjiResults) {
				kanjiPart +=
					`<div class="relative py-3 text-base leading-7 text-gray-600">
						<a class="absolute top-4 right-0 text-xs" href="https://www.kanjidamage.com/kanji/search?q=${kanji.kanji}">
							<svg class="w-4 h-4 text-gray-300 duration-300 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
						</a>
						<div class="flex items-center gap-7 text-2xl">${kanji.kanji}</div>
						<p>${join(kanji.kun_readings, ", ")}</p>  
						<p>${join(kanji.on_readings, ", ")}</p>  
						<p class="text-sm">${join(kanji.meanings, ", ")}</p>  
					</div>`;
			}



			dom.innerHTML = `
				<div class="relative bg-white py-6 shadow-lg ring-1 ring-gray-900/5 sm:max-w-lg sm:rounded-lg px-7">
					<button class="absolute top-3 right-3" onclick="window.obsidian_kanji_jisho.close()">
						<svg class="w-5 h-5 text-gray-300 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
					</button>
					<div class="mx-auto max-w-md">
					<div class="divide-y divide-gray-300/50">
						${wordPart}
						${kanjiPart}
					</div>
					</div>	
				</div>`;

			function hideOnClickOutside(element) {
				const outsideClickListener = event => {
					if (!element.contains(event.target) && isVisible(element)) { // or use: event.target.closest(selector) === null
						element.style.display = 'none';
						removeClickListener();
					}
				}

				const removeClickListener = () => {
					document.removeEventListener('click', outsideClickListener);
				}

				document.addEventListener('click', outsideClickListener);
			}

			const isVisible = elem => !!elem && !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length); // source (2018-03-11): https://github.com/jquery/jquery/blob/master/src/css/hiddenVisibleSelectors.js

			if (window.obsidian_kanji_jisho?.kanji_tooltip) {
				document.body.removeChild(window.obsidian_kanji_jisho.kanji_tooltip);
			}

			document.body.appendChild(dom);
			window.obsidian_kanji_jisho = {};
			window.obsidian_kanji_jisho.kanji_tooltip = dom;
			window.obsidian_kanji_jisho.close = () => {
				document.body.removeChild(window.obsidian_kanji_jisho.kanji_tooltip);
				window.obsidian_kanji_jisho.kanji_tooltip = null;
			};

			hideOnClickOutside(dom);

			return null;
		});


		this.registerEditorExtension([wordHover]);

		// this.registerMarkdownPostProcessor((element) => {
			//TODO: FOR LATER !!
		// });


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
