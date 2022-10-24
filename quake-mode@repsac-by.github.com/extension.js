'use strict';

/* exported init, enable, disable */

const { Meta, Shell } = imports.gi;
const { main, altTab } = imports.ui;
const { Workspace } = imports.ui.workspace;
const { _isOverviewWindow } = Workspace.prototype;
const { getWindows } = altTab;

const { getSettings, getCurrentExtension } = imports.misc.extensionUtils;
const Me = getCurrentExtension();

const { QuakeModeApp, state } = Me.imports.quakemodeapp;
const { Indicator } = Me.imports.indicator;

/** @type {InstanceType<typeof Indicator> | undefined} */
let indicator;

/** @type {ReturnType<typeof getSettings> | undefined} */
let settings;

const IndicatorName = 'Quake-mode';

const APPS_COUNT = 5;

/** @type Map<number, InstanceType<typeof QuakeModeApp>> */
const apps = new Map();

function init() {
}

function enable() {
	settings = getSettings();

	setTray(settings.get_boolean('quake-mode-tray'));
	settings.connect('changed::quake-mode-tray', (settings, key) => {
		setTray(settings.get_boolean(key));
	});

	setupOverview(settings.get_boolean('quake-mode-hide-from-overview'));
	settings.connect('changed::quake-mode-hide-from-overview', (settings, key) => {
		setupOverview(settings.get_boolean(key));
	});

	if (settings.get_string('quake-mode-app')) {
		settings.get_child('apps').set_string('app-1', settings.get_string('quake-mode-app'));
		settings.reset('quake-mode-app');
	}

	if (settings.get_strv('quake-mode-hotkey')[0]) {
		settings.get_child('accelerators').set_strv('quake-mode-accelerator-1',  settings.get_strv('quake-mode-hotkey'));
		settings.reset('quake-mode-hotkey');
	}

	for (let i = 1; i <= APPS_COUNT; i++) {
		main.wm.addKeybinding(
			`quake-mode-accelerator-${i}`,
			settings.get_child('accelerators'),
			Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
			Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
			() => toggle(i),
		);
	}



}

function disable() {
	for (let i = 1; i <= APPS_COUNT; i++) {
		main.wm.removeKeybinding(`quake-mode-accelerator-${i}`);
	}

	if (indicator) {
		indicator.destroy();
		indicator = undefined;
	}

	if (main.sessionMode.currentMode !== 'unlock-dialog') {
		apps.forEach(app => app && app.destroy());
		apps.clear();
	}

	if (settings) {
		settings.run_dispose();
		settings = undefined;
	}

	setupOverview(false);
}

/**
 * @param {number} i
 */
function app_id (i) {
	if (!settings) throw new Error('The settings base are not defined');
	return settings.get_child('apps').get_string(`app-${i}`);
}

/**
 * @param {number} i
 */
async function toggle(i) {
	try {
		let app = apps.get(i);
		if (!app || app.state === state.DEAD) {
			app = new QuakeModeApp(app_id(i));
			apps.set(i, app);
		}

		await app.toggle();
	} catch (e) {
		main.notify('Quake-mode', e instanceof Error ? e.message : String(e));
	}
}

/**
 * @param {boolean} [show]
 */
function setTray(show) {
	if (indicator) {
		indicator.destroy();
		indicator = undefined;
	}

	if (show) {
		indicator = new Indicator({ IndicatorName, toggle: () => toggle(1) });
		main.panel.addToStatusArea(IndicatorName, indicator.panelButton);
	}
}

/**
 * @param {boolean} [hide]
 */
function setupOverview(hide) {
	if (hide) {
		/** @param {import('@gi-types/meta10').Window} window */
		const has = window => [ ...apps.values() ].some(app => app.win === window);

		/** @param {import('@gi-types/meta10').Window} window */
		Workspace.prototype._isOverviewWindow = window => {
			const show = _isOverviewWindow(window);
			return show && !has(window);
		};

		/** @param {import('@gi-types/meta10').Workspace} workspace */
		altTab.getWindows = workspace => {
			/** @type {import('@gi-types/meta10').Window[]} */
			const windows = getWindows(workspace);
			return windows.filter(window => !has(window));
		};
	} else {
		Workspace.prototype._isOverviewWindow = _isOverviewWindow;
		altTab.getWindows = getWindows;
	}
}
