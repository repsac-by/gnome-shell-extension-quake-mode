'use strict';

/* exported init, enable, disable */

const Meta    = imports.gi.Meta;
const Shell   = imports.gi.Shell;
const St      = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;

const Main    = imports.ui.main;

const {getCurrentExtension, openPrefs} = imports.misc.extensionUtils
const Me = getCurrentExtension();

const { getSettings, getMonitors } = Me.imports.util;
const  quakemodeapp = Me.imports.quakemodeapp;

let indicator, settings;
let quakeModeApps = new Map();

const IndicatorName = 'Quake-mode'

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
		let currentWorkspace = global.workspace_manager.get_active_workspace();

		if ( !quakeModeApps.has(currentWorkspace) || quakeModeApps.get(currentWorkspace).state === quakemodeapp.state.DEAD)
			quakeModeApps.set(currentWorkspace, new quakemodeapp.QuakeModeApp(app_id()));

		await quakeModeApps.get(currentWorkspace).toggle();

	} catch ( e ) {
		Main.notify('Quake-mode', e.message);
	}
}

class Indicator {
	constructor() {
		settings = getSettings();

		this.panelButton = new PanelMenu.Button(null, IndicatorName)
		const icon = new St.Icon({
			icon_name:   'utilities-terminal-symbolic',
			style_class: 'system-status-icon'
		})
		this.panelButton.add_actor(icon)

		this.panelButton.menu.addMenuItem(this.getSettingsItem())

		this.panelButton.connect('button-press-event', this.onClick.bind(this))
		this.panelButton.connect('touch-event', this.onClick.bind(this))
	}

	destroy() {
		this.panelButton.destroy();
	}

	getSettingsItem() {
		const settingsItem = new PopupMenu.PopupMenuItem("Settings")
		settingsItem.connect('activate', () => {openPrefs();});

		return settingsItem
	}

	onClick(obj, evt) {
		if(evt.get_button() === Clutter.BUTTON_PRIMARY) {
			this.panelButton.menu.close();
			toggle();
			return
		} else {
			this.showMonitorMenu();
			return
		}
	}

	showMonitorMenu() {
		const menu = this.panelButton.menu
		menu.removeAll();

		const monitors = getMonitors()

		for(const [idx, monitor] of monitors.entries()) {
			const menuItem = new PopupMenu.PopupMenuItem(
				`#${idx}: ${monitor.manufacturer} ${monitor.model}`
			);
			if(idx === settings.get_int('quake-mode-monitor')){
				menuItem.setOrnament(PopupMenu.Ornament.CHECK);
			} else {
				menuItem.setOrnament(PopupMenu.Ornament.NONE);
			}
			menuItem.connect("activate", () => {
				settings.set_int('quake-mode-monitor', idx);
			});
			menu.addMenuItem(menuItem);
		}
		if(monitors.length > 0) {
			menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		}
		this.panelButton.menu.addMenuItem(this.getSettingsItem())
	}
}

function setTray(show) {
	if ( !show ) {
		if ( indicator ) {
			indicator.destroy()
			indicator = undefined
		}
		return
	}

	if ( indicator )
		return;

	indicator = new Indicator();
	Main.panel.addToStatusArea(IndicatorName, indicator.panelButton)
}
