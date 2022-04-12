'use strict';

/* exported on, once, getMonitors */

const Gdk = imports.gi.Gdk;

class Signal {
	constructor(target, name, cb) {
		this.name = name;
		this.target = target;

		this.id = target.connect(name, (...args) => cb(this, ...args));
	}
	off() {
		this.target.disconnect(this.id);
	}
}

function on(target, signal_name, cb) {
	return new Signal(target, signal_name, cb);
}

function once(target, signal_name, cb) {
	if ( typeof cb !== 'function' )
		return new Promise( resolve => {
			const signalId = target.connect(signal_name, (...args) => {
				target.disconnect(signalId);
				resolve(...args);
			});
		});

	let disconnected = false;
	return new Signal(target, signal_name, (signal, ...args) => {
		if ( disconnected )
			return;
		disconnected = true;
		signal.off();
		cb(...args);
	});
}

function getMonitors() {
	const monitors = [];

	const display = Gdk.Display.get_default();
	if (display && display.get_monitors) { // GDK4.4+
		const monitorsAvailable = display.get_monitors();
		for (let idx = 0; idx < monitorsAvailable.get_n_items(); idx++) {
			const monitor = monitorsAvailable.get_item(idx);

			monitors.push(monitor);
		}
	} else if (display && display.get_n_monitors) { // GDK3.24
		for (let idx = 0; idx < display.get_n_monitors(); idx++) {
			const monitor = display.get_monitor(idx);
			monitors.push(monitor);
		}
	} else {
		log(`Could not get monitor list from Display of type ${display}`);
	}

	return monitors;
}
