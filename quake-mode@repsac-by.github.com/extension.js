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

let indicator, settings;
let quakeModeApps = new Map();

const IndicatorName = 'Quake-mode';

const APPS_COUNT = 5;

function init() {
}

function enable() {
	settings = getSettings();

	setTray(settings.get_boolean('quake-mode-tray'));
	settings.connect('changed::quake-mode-tray', () => {
		setTray(settings.get_boolean('quake-mode-tray'));
	});

	setupOverview(settings.get_boolean('quake-mode-hide-from-overview'));
	settings.connect('changed::quake-mode-hide-from-overview', () => {
		setupOverview(settings.get_boolean('quake-mode-hide-from-overview'));
	});

	if ( settings.get_string( 'quake-mode-app' )) {
		settings.get_child('apps').set_string('app-1', settings.get_string('quake-mode-app'));
		settings.reset('quake-mode-app');
	}

	if ( settings.get_strv( 'quake-mode-hotkey' )[0] ) {
		settings.get_child('accelerators').set_strv('quake-mode-accelerator-1',  settings.get_strv( 'quake-mode-hotkey' ));
		settings.reset( 'quake-mode-hotkey' );
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

	if ( indicator ) {
		indicator.destroy();
		indicator = undefined;
	}

	if (main.sessionMode.currentMode !== 'unlock-dialog' ) {
		quakeModeApps.forEach(workspace => {
			workspace.forEach(app  => app && app.destroy());
			workspace.clear();
		});
	}

	if (settings) {
		settings.run_dispose();
		settings = undefined;
	}

	setupOverview(false);
}

function app_id (i) {
	return settings.get_child('apps').get_string(`app-${i}`);
}
async function toggle(i) {
	try {
		let currentWorkspace = global.workspace_manager.get_active_workspace();

		if ( !quakeModeApps.has(currentWorkspace) || !quakeModeApps.get(currentWorkspace).get(i) || quakeModeApps.get(currentWorkspace).get(i).state === Me.imports.quakemodeapp.state.DEAD) {
			let app = new QuakeModeApp(app_id(i));
			if(!quakeModeApps.has(currentWorkspace))
				quakeModeApps.set(currentWorkspace, new Map());
			quakeModeApps.get(currentWorkspace).set(i, app);
		}

		await quakeModeApps.get(currentWorkspace).get(i).toggle();

	} catch ( e ) {
		main.notify('Quake-mode', e.message);
	}
}

function setTray(show) {
	if (indicator) {
		indicator.destroy();
		indicator = undefined;
	}

	if ( show ) {
		indicator = new Indicator({ IndicatorName, toggle: () => toggle(1) });
		main.panel.addToStatusArea(IndicatorName, indicator.panelButton);
	}
}

function setupOverview(hide) {
	if (hide) {
		const has = window => [...apps.values()].some(app => app.win === window);
		Workspace.prototype._isOverviewWindow = window => {
			const show = _isOverviewWindow(window);
			return show && !has(window);
		};

		altTab.getWindows = workspace => {
			const windows = getWindows(workspace);
			return windows.filter(window => !has(window));
		};
	} else {
		Workspace.prototype._isOverviewWindow = _isOverviewWindow;
		altTab.getWindows = getWindows;
	}
}
