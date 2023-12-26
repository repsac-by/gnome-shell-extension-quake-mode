import Meta from "gi://Meta";
import Shell from "gi://Shell";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as altTab from "resource:///org/gnome/shell/ui/altTab.js";
import { Workspace } from "resource:///org/gnome/shell/ui/workspace.js";
import {
  Extension,
  InjectionManager,
} from "resource:///org/gnome/shell/extensions/extension.js";
import { QuakeModeApp, state } from "./quakemodeapp.js";
import { Indicator } from "./indicator.js";

/** @type {InstanceType<typeof Indicator> | undefined} */
let indicator;

const IndicatorName = "Quake-mode";

const APPS_COUNT = 5;

/** @type Map<number, InstanceType<typeof QuakeModeApp>> */
const apps = new Map();

const injectionManager = new InjectionManager();

export default class QuakeModeExtension extends Extension {
  enable() {
    this._settings = this.getSettings();

    this._setTray(this._settings.get_boolean("quake-mode-tray"));
    this._settings.connect("changed::quake-mode-tray", (settings, key) => {
      this._setTray(settings.get_boolean(key));
    });

    this._setupOverview(
      this._settings.get_boolean("quake-mode-hide-from-overview"),
    );
    this._settings.connect(
      "changed::quake-mode-hide-from-overview",
      (settings, key) => {
        this._setupOverview(settings.get_boolean(key));
      },
    );

    if (this._settings.get_string("quake-mode-app")) {
      this._settings
        .get_child("apps")
        .set_string("app-1", this._settings.get_string("quake-mode-app"));
      this._settings.reset("quake-mode-app");
    }

    if (this._settings.get_strv("quake-mode-hotkey")[0]) {
      this._settings
        .get_child("accelerators")
        .set_strv(
          "quake-mode-accelerator-1",
          this._settings.get_strv("quake-mode-hotkey"),
        );
      this._settings.reset("quake-mode-hotkey");
    }

    for (let i = 1; i <= APPS_COUNT; i++) {
      Main.wm.addKeybinding(
        `quake-mode-accelerator-${i}`,
        this._settings.get_child("accelerators"),
        Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
        Shell.ActionMode.NORMAL |
          Shell.ActionMode.OVERVIEW |
          Shell.ActionMode.POPUP,
        () => this._toggle(i),
      );
    }
  }

  disable() {
    for (let i = 1; i <= APPS_COUNT; i++) {
      Main.wm.removeKeybinding(`quake-mode-accelerator-${i}`);
    }

    if (indicator) {
      indicator.destroy();
      indicator = undefined;
    }

    if (Main.sessionMode.currentMode !== "unlock-dialog") {
      apps.forEach((app) => app && app.destroy());
      apps.clear();
    }

    if (this._settings) {
      this._settings.run_dispose();
      this._settings = undefined;
    }

    this._setupOverview(false);
  }

  /**
   * @param {number} i
   * @returns {string}
   */
  _app_id(i) {
    if (!this._settings) throw new Error("The settings base are not defined");
    //@ts-expect-error
    return this._settings.get_child("apps").get_string(`app-${i}`);
  }

  /**
   * @param {number} i
   */
  async _toggle(i) {
    try {
      let app = apps.get(i);
      if (!app || app.state === state.DEAD) {
        app = new QuakeModeApp(this._app_id(i));
        apps.set(i, app);
      }

      await app.toggle();
    } catch (e) {
      Main.notify("Quake-mode", e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * @param {boolean} [show]
   */
  _setTray(show) {
    if (indicator) {
      indicator.destroy();
      indicator = undefined;
    }

    if (show) {
      indicator = new Indicator({
        IndicatorName,
        toggle: () => this._toggle(1),
      });
      Main.panel.addToStatusArea(IndicatorName, indicator.panelButton);
    }
  }

  /**
   * @param {boolean} [hide]
   */
  _setupOverview(hide) {
    if (hide) {
      /** @param {import('@girs/meta-13').Meta.Window} window */
      const has = (window) =>
        [...apps.values()].some((app) => app.win === window);

      injectionManager.overrideMethod(
        Workspace.prototype,
        "_isOverviewWindow",
        (_isOverviewWindow) =>
          function (window, ...rest) {
            const show = _isOverviewWindow.call(this, window, ...rest);
            return show && !has(window);
          },
      );

      injectionManager.overrideMethod(
        altTab.WindowSwitcherPopup.prototype,
        "_getWindowList",
        (_getWindowList) =>
          function (...args) {
            const windows = _getWindowList.call(this, ...args);
            return windows.filter((window) => !has(window));
          },
      );

      injectionManager.overrideMethod(
        altTab.WindowCyclerPopup.prototype,
        "_getWindows",
        (_getWindows) =>
          function (...args) {
            const windows = _getWindows.call(this, ...args);
            return windows.filter((window) => !has(window));
          },
      );
    } else {
      injectionManager.clear();
    }
  }
}
