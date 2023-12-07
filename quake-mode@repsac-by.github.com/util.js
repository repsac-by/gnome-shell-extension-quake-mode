import Gdk from "gi://Gdk";

class Signal {
  /**
   * @param {import('@girs/gobject-2.0').GObject.Object} target
   * @param {string} name
   * @param {(self: Signal, ...args: any[]) => void} cb
   */
  constructor(target, name, cb) {
    this.name = name;
    this.target = target;
    this.id = target.connect(name, (...args) => cb(this, ...args));
  }
  off() {
    this.target.disconnect(this.id);
  }
}

/**
 * @param {import('@girs/gobject-2.0').GObject.Object} target
 * @param {string} signal_name
 * @param {(self: Signal, ...args: any[]) => void} cb
 */
export function on(target, signal_name, cb) {
  return new Signal(target, signal_name, cb);
}

/**
 * @param {import('@girs/gobject-2.0').GObject.Object} target
 * @param {string} signal_name
 * @param {( ...args: any ) => void} cb
 */
export function once(target, signal_name, cb) {
  let disconnected = false;
  return new Signal(target, signal_name, (signal, ...args) => {
    if (disconnected) return;
    disconnected = true;
    signal.off();
    cb(...args);
  });
}

export function getMonitors() {
  const monitors = [];

  const display = Gdk.Display.get_default();
  if (display && "get_monitors" in display) {
    // GDK4.4+
    const monitorsAvailable = display.get_monitors();
    for (let idx = 0; idx < monitorsAvailable.get_n_items(); idx++) {
      const monitor = /** @type {import('@girs/gdk-4.0').Gdk.Monitor} */ (
        monitorsAvailable.get_item(idx)
      );
      monitors.push(monitor);
    }
  } else {
    log(`Could not get monitor list from Display of type ${display}`);
  }

  return monitors;
}
