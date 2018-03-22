'use strict';

/* exported init, enable, disable */

const Meta    = imports.gi.Meta;
const Shell   = imports.gi.Shell;
const St      = imports.gi.St;

const Main    = imports.ui.main;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const { getSettings } = Me.imports.util;
const  quakemodeapp = Me.imports.quakemodeapp;

let button, settings, quakeModeApp;

function init() {
}

function enable() {
	settings = getSettings();

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

	if ( quakeModeApp ) {
		quakeModeApp.destroy();
		quakeModeApp = null;
	}

	if ( settings ) {
		settings.run_dispose();
		settings = null;
	}
}

function app_id() {
	return settings.get_string('quake-mode-app');
}

async function toggle() {
	try {

		if ( !quakeModeApp || quakeModeApp.state === quakemodeapp.state.DEAD)
			quakeModeApp = new quakemodeapp.QuakeModeApp(app_id());

		await quakeModeApp.toggle();

	} catch ( e ) {
		Main.notify('Quake-mode', e.message);
	}
}

function setTray(show) {
	if ( !show ) {
		if ( button )
			Main.panel._rightBox.remove_child(button);

		return button = null;
	}

	if ( button )
		return;

	button = new St.Bin({
		style_class: 'panel-button',
		reactive: true,
		can_focus: true,
		x_fill: true,
		y_fill: false,
		track_hover: true
	});

	button.set_child( new St.Icon({
		icon_name:   'utilities-terminal-symbolic',
		style_class: 'system-status-icon'
	}) );

	button.connect('button-press-event', toggle);

	Main.panel._rightBox.insert_child_at_index(button, 0);
}
