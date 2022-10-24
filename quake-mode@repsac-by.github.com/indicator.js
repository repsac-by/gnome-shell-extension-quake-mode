'use strict';

/* exported Indicator */
/**
 *  @typedef {{
 *     Indicator: typeof Indicator
 * }} types
 */

const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;

const { getCurrentExtension, getSettings, initTranslations, openPrefs, gettext: _ } = imports.misc.extensionUtils;

const Me = getCurrentExtension();
const { getMonitors } = Me.imports.util;

var Indicator = class {
	/**
	 * @param {{ IndicatorName: string, toggle(): void }} opts
	 */
	constructor ({ IndicatorName, toggle }) {
		initTranslations();
		this.settings = getSettings();

		this.toggle = toggle;

		this.panelButton = new PanelMenu.Button(null, IndicatorName);
		const icon = new St.Icon({
			icon_name: 'utilities-terminal-symbolic',
			style_class: 'system-status-icon'
		});
		this.panelButton.add_actor(icon);

		this.panelButton.menu.addMenuItem(this.getSettingsItem());

		this.panelButton.connect('button-press-event', this.onClick.bind(this));
		this.panelButton.connect('touch-event', this.onClick.bind(this));
	}

	destroy () {
		this.panelButton.destroy();
	}

	getSettingsItem () {
		const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
		settingsItem.connect('activate', () => { openPrefs(); });

		return settingsItem;
	}

	/**
	 * @param {any} obj
	 * @param {any} evt
	 */
	onClick (obj, evt) {
		if (evt.get_button() === Clutter.BUTTON_PRIMARY) {
			this.panelButton.menu.close();
			this.toggle();
			return;
		}

		this.showMonitorMenu();
	}

	showMonitorMenu () {
		const menu = this.panelButton.menu;
		menu.removeAll();

		const monitors = getMonitors();

		for (const [ idx, monitor ] of monitors.entries()) {
			const menuItem = new PopupMenu.PopupMenuItem(
				`#${idx}: ${monitor.manufacturer || ''} ${monitor.model}`
			);

			if (idx === this.settings.get_int('quake-mode-monitor')) {
				menuItem.setOrnament(PopupMenu.Ornament.CHECK);
			} else {
				menuItem.setOrnament(PopupMenu.Ornament.NONE);
			}
			menuItem.connect("activate", () => {
				this.settings.set_int('quake-mode-monitor', idx);
			});
			menu.addMenuItem(menuItem);
		}
		if (monitors.length > 0) {
			menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		}
		this.panelButton.menu.addMenuItem(this.getSettingsItem());
	}
};
