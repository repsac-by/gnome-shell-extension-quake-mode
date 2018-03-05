'use strict';

/* exported on, once, getSettings */

const Gio = imports.gi.Gio;

const Me = imports.misc.extensionUtils.getCurrentExtension();

function on(obj, signal, cb) {
	const sig = {
		id: 0,
		name: signal,
		off() {
			obj.disconnect(this.id);
		}
	};

	sig.id = obj.connect(signal, (...args) => cb(sig, ...args));

	return sig;
}

function once(obj, signal, cb) {
	if ( typeof cb !== 'function')
		return new Promise( resolve => {
			const signalId = obj.connect(signal, (...args) => {
				obj.disconnect(signalId);
				resolve(...args);
			});
		});


	const sig = {
		id: 0,
		name: signal,
		off() {
			obj.disconnect(this.id);
		}
	};

	sig.id = obj.connect(signal, (...args) => {
		obj.disconnect(sig.id);
		cb(...args);
	});

	return sig;
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
