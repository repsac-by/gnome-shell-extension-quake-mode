import Clutter from "gi://Clutter";
import St from "gi://St";
import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { getMonitors } from "./util.js";

export var Indicator = class {
  extension =
    /** @type import('@girs/gnome-shell/extensions/extension').Extension */ (
      Extension.lookupByURL(import.meta.url)
    );
  settings = this.extension.getSettings();

  /**
   * @param {{ IndicatorName: string, toggle(): void }} opts
   */
  constructor({ IndicatorName, toggle }) {
    this.toggle = toggle;

    //@ts-expect-error
    this.panelButton = new PanelMenu.Button(null, IndicatorName);
    const icon = new St.Icon({
      icon_name: "utilities-terminal-symbolic",
      style_class: "system-status-icon",
    });
    this.panelButton.add_child(icon);

    this.panelButton.menu.addMenuItem(this.getSettingsItem());

    this.panelButton.connect("button-press-event", this.onClick.bind(this));
    this.panelButton.connect("touch-event", this.onClick.bind(this));
  }

  destroy() {
    this.panelButton.destroy();
  }

  getSettingsItem() {
    const settingsItem = new PopupMenu.PopupMenuItem(_("Settings"));
    settingsItem.connect("activate", () => {
      this.extension.openPreferences();
    });

    return settingsItem;
  }

  /**
   * @param {any} obj
   * @param {any} evt
   */
  onClick(obj, evt) {
    if (evt.get_button() === Clutter.BUTTON_PRIMARY) {
      //@ts-expect-error
      this.panelButton.menu.close();
      this.toggle();
      return;
    }

    this.showMonitorMenu();
  }

  showMonitorMenu() {
    const menu = this.panelButton.menu;
    menu.removeAll();

    const monitors = getMonitors();

    for (const [idx, monitor] of monitors.entries()) {
      const menuItem = new PopupMenu.PopupMenuItem(
        `#${idx}: ${monitor.manufacturer || ""} ${monitor.model}`,
      );

      if (idx === this.settings.get_int("quake-mode-monitor")) {
        menuItem.setOrnament(PopupMenu.Ornament.CHECK);
      } else {
        menuItem.setOrnament(PopupMenu.Ornament.NONE);
      }
      menuItem.connect("activate", () => {
        this.settings.set_int("quake-mode-monitor", idx);
      });
      menu.addMenuItem(menuItem);
    }
    if (monitors.length > 0) {
      //@ts-expect-error
      menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }
    this.panelButton.menu.addMenuItem(this.getSettingsItem());
  }
};
