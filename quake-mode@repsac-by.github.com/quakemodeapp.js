import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Shell from "gi://Shell";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { on, once } from "./util.js";

export var state = {
  INITIAL: Symbol("INITIAL"),
  READY: Symbol("READY"),
  STARTING: Symbol("STARTING"),
  RUNNING: Symbol("RUNNING"),
  DEAD: Symbol("DEAD"),
};

export var QuakeModeApp = class {
  /**
   * @param {string} app_id
   */
  constructor(app_id) {
    this.isTransition = false;
    this.state = state.INITIAL;

    /** @type {import('@girs/meta-13').Meta.Window?} */
    this.win = null;

    /** @type {import('@girs/shell-13').Shell.App?} */
    this.app = Shell.AppSystem.get_default().lookup_app(app_id);

    if (!this.app) {
      this.state = state.DEAD;
      throw new Error(`application '${app_id}' not found`);
    }

    const place = () => this.place();
    const setupAlwaysOnTop = () => this.setupAlwaysOnTop(this.alwaysOnTop);

    const extensionObject =
      /** @type import('@girs/gnome-shell/extensions/extension').Extension */ (
        Extension.lookupByURL(import.meta.url)
      );
    const settings = (this.settings = extensionObject.getSettings());

    settings.connect("changed::quake-mode-width", place);
    settings.connect("changed::quake-mode-height", place);
    settings.connect("changed::quake-mode-gap", place);
    settings.connect("changed::quake-mode-halign", place);
    settings.connect("changed::quake-mode-valign", place);
    settings.connect("changed::quake-mode-monitor", place);
    settings.connect("changed::quake-mode-always-on-top", setupAlwaysOnTop);

    this.state = state.READY;
  }

  destroy() {
    this.state = state.DEAD;

    if (this.settings) {
      this.settings.run_dispose();
    }

    this.win = null;
    this.app = null;
  }

  get child() {
    if (!this.win) return null;

    /** @type {import('@girs/meta-13').Meta.WindowChild} */
    //@ts-expect-error Incorrect return type? TODO: investigate
    const child = this.win.get_compositor_private();

    if (!child) return null;

    return "clip_y" in child
      ? child
      : Object.defineProperty(child, "clip_y", {
          get() {
            return this.clip_rect.origin.y;
          },
          set(y) {
            const rect = this.clip_rect;
            this.set_clip(rect.origin.x, y, rect.size.width, rect.size.height);
          },
        });
  }

  get width() {
    return this.settings.get_int("quake-mode-width");
  }

  get height() {
    return this.settings.get_int("quake-mode-height");
  }

  get gap() {
    return this.settings.get_int("quake-mode-gap");
  }

  get focusout() {
    return this.settings.get_boolean("quake-mode-focusout");
  }

  get ainmation_time() {
    return this.settings.get_double("quake-mode-animation-time") * 1000;
  }

  get alwaysOnTop() {
    return this.settings.get_boolean("quake-mode-always-on-top");
  }

  get halign() {
    return /** @type {"left" | "center" | "right"} */ (
      this.settings.get_string("quake-mode-halign")
    );
  }

  get valign() {
    return this.settings.get_string("quake-mode-valign");
  }

  get monitor() {
    const { win, settings } = this;

    const monitor = settings.get_int("quake-mode-monitor");

    if (!win) return monitor;

    if (monitor < 0) return 0;

    const max = global.display.get_n_monitors() - 1;
    if (monitor > max) return max;

    return monitor;
  }

  toggle() {
    const { win } = this;

    if (this.state === state.READY)
      return this.launch()
        .then(() => this.first_place())
        .catch((e) => {
          this.destroy();
          throw e;
        });

    if (this.state !== state.RUNNING || !win) return;

    if (win.has_focus()) return this.hide();

    if (win.is_hidden()) return this.show();

    Main.activateWindow(win);
  }

  launch() {
    const { app } = this;
    this.state = state.STARTING;

    if (!app) return Promise.reject(new Error("no app"));

    app.open_new_window(-1);

    return new Promise((resolve, reject) => {
      const timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
        sig.off();
        reject(new Error(`launch '${app.id}' timeout`));
        return true;
      });

      const sig = once(app, "windows-changed", () => {
        GLib.source_remove(timer);

        if (app.get_n_windows() < 1)
          return reject(`app '${app.id}' is launched but no windows`);

        this.win = app.get_windows()[0];

        this.setupAlwaysOnTop(this.alwaysOnTop);

        once(this.win, "unmanaged", () => this.destroy());

        resolve(true);
      });
    });
  }

  first_place() {
    const { win, child } = this;

    if (!win || !child) return;

    child.set_clip(0, 0, child.width, 0);
    win.stick();

    on(global.window_manager, "map", (sig, wm, metaWindowChild) => {
      if (metaWindowChild !== child) return;

      sig.off();
      wm.emit("kill-window-effects", child);

      once(win, "size-changed", () => {
        this.state = state.RUNNING;
        child.remove_clip();
        this.show();
      });

      this.place();
    });
  }

  show() {
    const { child, focusout, valign } = this;

    if (this.state !== state.RUNNING) return;

    if (this.isTransition) return;

    if (!child) return;

    const parent = child.get_parent();
    if (!parent) return;

    this.isTransition = true;

    parent.set_child_above_sibling(child, null);
    (child.translation_y = child.height * (valign === "top" ? -1 : 2)),
      //@ts-expect-error Missing type. TODO: contribute to @girs
      Main.wm.skipNextEffect(child);
    Main.activateWindow(child.meta_window);

    //@ts-expect-error Missing type? TODO: investigate
    child.ease({
      translation_y: 0,
      duration: this.ainmation_time,
      mode: Clutter.AnimationMode.EASE_OUT_QUART,
      onComplete: () => {
        this.isTransition = false;
        if (focusout)
          once(global.display, "notify::focus-window", () => this.hide());
      },
    });

    this.place();
  }

  hide() {
    const { child, valign } = this;

    if (!child) return;

    if (this.state !== state.RUNNING) return;

    if (this.isTransition) return;

    this.isTransition = true;

    //@ts-expect-error
    child.ease({
      translation_y: child.height * (valign === "top" ? -1 : 2),
      duration: this.ainmation_time,
      mode: Clutter.AnimationMode.EASE_IN_QUART,
      onComplete: () => {
        //@ts-expect-error
        Main.wm.skipNextEffect(child);
        child.meta_window.minimize();
        child.translation_y = 0;
        this.isTransition = false;
      },
    });
  }

  place() {
    const { win, width, height, gap, halign, valign, monitor } = this;

    if (!win) return;

    const area = win.get_work_area_for_monitor(monitor),
      w = Math.round((width * area.width) / 100),
      h = Math.round((height * area.height) / 100),
      x =
        area.x +
        Math.round(
          (area.width - w) * { left: 0, center: 0.5, right: 1 }[halign] +
            { left: gap, center: 0, right: -gap }[halign],
        ),
      y = area.y + (valign === "top" ? gap : area.height - h - gap);

    win.move_to_monitor(monitor);
    win.move_resize_frame(false, x, y, w, h);
  }

  /**
   * @param {boolean} [above]
   */
  setupAlwaysOnTop(above) {
    const { win } = this;

    if (!win) return;

    if (above) win.make_above();
    else win.unmake_above();
  }
};
