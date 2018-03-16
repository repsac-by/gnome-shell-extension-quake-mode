'use strict';

/* exported on, once, getSettings */

const Gio = imports.gi.Gio;

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
