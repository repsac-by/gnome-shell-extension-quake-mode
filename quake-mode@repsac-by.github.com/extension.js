'use strict';

/* exported init, enable, disable */

const Meta  = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Main  = imports.ui.main;

const { getSettings, getCurrentExtension } = imports.misc.extensionUtils;
const Me = getCurrentExtension();

const { QuakeModeApp, state } = Me.imports.quakemodeapp;
const { Indicator } = Me.imports.indicator;

let indicator, settings, app;

const IndicatorName = 'Quake-mode';

function init() {
}

function enable() {
	settings = getSettings('com.github.repsac-by.quake-mode');

	setTray(settings.get_boolean('quake-mode-tray'));
	settings.connect('changed::quake-mode-tray', () => {
		setTray(settings.get_boolean('quake-mode-tray'));
	});

	Main.wm.addKeybinding(
		'quake-mode-hotkey',
		settings,
		Meta.KeyBindingFlags.NONE,
		Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP,
		toggle
	);
}

function disable() {
	setTray(false);

	Main.wm.removeKeybinding('quake-mode-hotkey');

	if ( settings ) {
		settings.run_dispose();
		settings = null;
	}

	if (app && Main.sessionMode.currentMode !== 'unlock-dialog') {
		app.destroy();
		app = undefined;
	}
}

function app_id() {
	return settings.get_string('quake-mode-app');
}

async function toggle() {
	try {
		if ( !app || app.state === state.DEAD)
			app = new QuakeModeApp(app_id());

		await app.toggle();
	} catch ( e ) {
		Main.notify('Quake-mode', e.message);
	}
}

function setTray(show) {
	if ( !show ) {
		if ( indicator ) {
			indicator.destroy();
			indicator = undefined;
		}
		return;
	}

	if ( indicator )
		return;

	indicator = new Indicator({ IndicatorName, toggle });
	Main.panel.addToStatusArea(IndicatorName, indicator.panelButton);
}
