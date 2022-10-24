'use strict';

/* exported on, once, getMonitors */
/**
 *  @typedef {{
 *     on: typeof on;
 *     once: typeof once;
 *     getMonitors: typeof getMonitors;
 * }} types
 */

const Gdk = imports.gi.Gdk;

class Signal {
	/**
	 * @param {import('@gi-types/gobject2').Object} target
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
 * @param {import('@gi-types/gobject2').Object} target
 * @param {string} signal_name
 * @param {(self: Signal, ...args: any[]) => void} cb
 */
function on(target, signal_name, cb) {
	return new Signal(target, signal_name, cb);
}

/**
 * @param {import('@gi-types/gobject2').Object} target
 * @param {string} signal_name
 * @param {( ...args: any ) => void} cb
*/
function once(target, signal_name, cb) {
	let disconnected = false;
	return new Signal(target, signal_name, (signal, ...args) => {
		if (disconnected)	return;
		disconnected = true;
		signal.off();
		cb(...args);
	});
}

function getMonitors() {
	const monitors = [];

	const display = Gdk.Display.get_default();
	if (display && 'get_monitors' in display) { // GDK4.4+
		const monitorsAvailable = display.get_monitors();
		for (let idx = 0; idx < monitorsAvailable.get_n_items(); idx++) {
			const monitor = /** @type {import('@gi-types/gdk4').Monitor} */ (monitorsAvailable.get_item(idx));
			monitors.push(monitor);
		}
	} else if (display && 'get_n_monitors' in display) { // GDK3.24
		for (let idx = 0; idx < display.get_n_monitors(); idx++) {
			const monitor = /** @type {import('@gi-types/gdk3').Monitor} */ (display.get_monitor(idx));
			monitors.push(monitor);
		}
	} else {
		log(`Could not get monitor list from Display of type ${display}`);
	}

	return monitors;
}
