'use strict';

/* exported on, once, getSettings, initTranslations, getMonitors */
const Gettext = imports.gettext;
const Config = imports.misc.config;

const Gio = imports.gi.Gio;
const Gdk = imports.gi.Gdk;

const Me = imports.misc.extensionUtils.getCurrentExtension();

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

function getSettings() {
	const dir = Me.dir.get_child('schemas').get_path();
	const schemaSource = Gio.SettingsSchemaSource;
	const source = schemaSource.new_from_directory(dir, schemaSource.get_default(), false);

	if ( !source )
		throw new Error('Error Initializing the thingy.');

	const schema = source.lookup('com.github.repsac-by.quake-mode', false);

	if ( !schema )
		throw new Error('Schema missing.');

	return new Gio.Settings( { settings_schema: schema } );
}

function initTranslations(domain = Me.uuid) {

	const localeDir = Me.dir.get_child('locale');
	if ( localeDir.query_exists(null) )
		Gettext.bindtextdomain(domain, localeDir.get_path());
	else
		Gettext.bindtextdomain(domain, Config.LOCALEDIR);
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
