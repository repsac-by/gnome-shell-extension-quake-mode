'use strict';

/* exported init, buildPrefsWidget */
/* global Intl */

const GObject = imports.gi.GObject;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const { getSettings } = Me.imports.util;

let settings;

function init() {
	settings = getSettings();
}

const QuakeModePrefsWidget
= GObject.registerClass(class QuakeModePrefsWidget extends Gtk.Grid {
	_init(params) {
		super._init(params);
		this.margin = 30;
		this.set_row_spacing(20);
		this.set_column_spacing(30);
		this.set_orientation(Gtk.Orientation.VERTICAL);

		let r = -1;
		const label = label => new Gtk.Label({ label: _(label), halign: Gtk.Align.END});

		// Tray Icon
		const switchTray = new Gtk.Switch({ halign: Gtk.Align.START });

		settings.bind('quake-mode-tray', switchTray, 'state', Gio.SettingsBindFlags.DEFAULT);

		this.attach(label('Icon'), 0, ++r, 1, 1);
		this.attach(switchTray, 1, r, 1, 1);

		// Width
		const spinWidth = new Gtk.SpinButton();
		spinWidth.set_range(0, 100);
		spinWidth.set_increments(1, 2);

		settings.bind('quake-mode-width', spinWidth, 'value', Gio.SettingsBindFlags.DEFAULT);

		this.attach(label('Width - %'), 0, ++r, 1, 1);
		this.attach(spinWidth, 1, r, 1, 1);

		// Height
		const spinHeight = new Gtk.SpinButton();
		spinHeight.set_range(0, 100);
		spinHeight.set_increments(1, 2);

		settings.bind('quake-mode-height', spinHeight, 'value', Gio.SettingsBindFlags.DEFAULT);

		this.attach(label('Height - %'), 0, ++r, 1, 1);
		this.attach(spinHeight, 1, r, 1, 1);

		// Height
		const spinMonitor = new Gtk.SpinButton();
		spinMonitor.set_range(0, Gdk.Screen.get_default().get_n_monitors() - 1);
		spinMonitor.set_increments(1, 2);

		settings.bind('quake-mode-monitor', spinMonitor, 'value', Gio.SettingsBindFlags.DEFAULT);

		this.attach(label('Monitor'), 0, ++r, 1, 1);
		this.attach(spinMonitor, 1, r, 1, 1);

		// Time
		const spinTime = new Gtk.SpinButton({ digits: 2 });
		spinTime.set_range(0, 2);
		spinTime.set_increments(0.01, 0.02);

		settings.bind('quake-mode-animation-time', spinTime, 'value', Gio.SettingsBindFlags.DEFAULT);

		this.attach(label('Animation time - s'), 0, ++r, 1, 1);
		this.attach(spinTime, 1, r, 1, 1);
	}
});

const ApplicationWidget
= GObject.registerClass(class ApplicationWidget extends Gtk.Grid {
	_init(params) {
		super._init(params);
		this.margin = 30;
		this.set_row_spacing(20);
		this.set_column_spacing(30);
		this.set_orientation(Gtk.Orientation.VERTICAL);

		const entryApp = new Gtk.Entry({ hexpand: true });
		entryApp.editable = false;

		settings.bind('quake-mode-app', entryApp, 'text', Gio.SettingsBindFlags.DEFAULT);

		this.attach(new Gtk.Label({	label: _('Application'), halign: Gtk.Align.END }), 0, 0, 1, 1);
		this.attach(entryApp, 1, 0, 1, 1);

		const listBox = new Gtk.ListBox({ activate_on_single_click: false });

		const searchEntry = new Gtk.SearchEntry();
		this.attach(searchEntry, 0, 1, 2, 1);

		searchEntry.connect('search-changed', () => {
			const filter = searchEntry.text.trim().toLowerCase();
			listBox.set_filter_func( !filter ? null : row => ~row.__app.name.indexOf(filter) );
		});

		const collator = new Intl.Collator();
		listBox.set_sort_func((a, b) => collator.compare(a.__app.name, b.__app.name));

		listBox.connect('row-activated', (listBox, row) => {
			entryApp.set_text(row.__app.id);
		});

		const image_size = Gtk.IconSize.lookup(Gtk.IconSize.DIALOG)[2];

		Gio.app_info_get_all()
			.filter(a => a.should_show())
			.forEach(a => listBox.add(buildRow(a, image_size)));

		const scrolledWindow = new Gtk.ScrolledWindow({ expand: true });
		scrolledWindow.add(listBox);

		this.attach(scrolledWindow, 0, 2, 2, 1);

		function buildRow(app, image_size) {
			const name = app.get_display_name();
			const image = Gtk.Image.new_from_gicon(app.get_icon(), Gtk.IconSize.DIALOG);

			image.set_pixel_size(image_size);

			const label = new Gtk.Label({ label: name });
			const grid  = new Gtk.Grid({ hexpand: true, column_spacing: 5 });

			grid.attach(image, 0, 0, 1, 1);
			grid.attach(label, 1, 0, 1, 1);

			const row = new Gtk.ListBoxRow();
			row.add(grid);

			row.__app = {
				id: app.get_id(),
				name: name.toLowerCase(),
			};

			return row;
		}
	}
});

const AcceleratorsWidget
= GObject.registerClass(class AcceleratorsWidget extends Gtk.TreeView {
	_init(params) {
		super._init(params);
		this.model = Gtk.ListStore.new([ GObject.TYPE_STRING, GObject.TYPE_STRING ]);

		const updateRow = iter => {
			const a = settings.get_strv('quake-mode-hotkey')[0] || '';
			this.model.set(iter, [0, 1], [ 'Toggle', a ]);
		};

		// Hotkey
		const iter = this.model.append();

		const actions      = new Gtk.TreeViewColumn({ title: _("_Action"), expand: true });
		const nameRender = new Gtk.CellRendererText();

		const accels      = new Gtk.TreeViewColumn({ title: _("Shortcut _Key"), min_width: 150 });
		const accelRender = new Gtk.CellRendererAccel({ editable: true });

		actions.pack_start(nameRender, true);
		accels.pack_start(accelRender, true);

		actions.set_cell_data_func(nameRender, (column, cell, model, iter) => {
			cell.text = model.get_value(iter, 0);
		});

		accels.set_cell_data_func(accelRender, (column, cell, model, iter) => {
			[ cell.accel_key, cell.accel_mods ] = Gtk.accelerator_parse(model.get_value(iter, 1));
		});

		accelRender.connect('accel-edited', (self, path, accel_key, accel_mod) => {
			settings.set_strv('quake-mode-hotkey', [ Gtk.accelerator_name(accel_key, accel_mod) ]);
		});

		accelRender.connect('accel-cleared', () => settings.set_strv('quake-mode-hotkey', []) );

		updateRow(iter);
		settings.connect('changed::quake-mode-hotkey', () => updateRow(iter));

		this.append_column(actions);
		this.append_column(accels);
	}
});

const Notebook
= GObject.registerClass(class Notebook extends Gtk.Notebook {
	_init(params) {
		super._init(params);
		this.append_page(new QuakeModePrefsWidget, new Gtk.Label({  label: _('Main') }));
		this.append_page(new ApplicationWidget,    new Gtk.Label({  label: _('Application') }));
		this.append_page(new AcceleratorsWidget,   new Gtk.Label({ label: _('Accelerators') }));
	}
});

function buildPrefsWidget() {
	const widget = new Notebook();
	widget.show_all();

	return widget;
}
