'use strict';

/* exported init, buildPrefsWidget */
/* global Intl */

const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const Gettext = imports.gettext.domain(Me.uuid);
const _ = Gettext.gettext;

const { getSettings, initTranslations, getMonitors } = Me.imports.util;

let settings;

function init() {
	settings = getSettings();
	initTranslations();
}

const QuakeModePrefsWidget
= GObject.registerClass(class QuakeModePrefsWidget extends Gtk.Grid {
	_init(params) {
		super._init(params);
		this.set_margin_top(30);
		this.set_margin_bottom(30);
		this.set_margin_start(30);
		this.set_margin_end(30);
		this.set_row_spacing(20);
		this.set_column_spacing(30);
		this.set_orientation(Gtk.Orientation.VERTICAL);

		let r = -1;
		const label = label => new Gtk.Label({ label: label, halign: Gtk.Align.END});

		// Tray Icon
		const switchTray = new Gtk.Switch({ halign: Gtk.Align.START });

		settings.bind('quake-mode-tray', switchTray, 'state', Gio.SettingsBindFlags.DEFAULT);

		this.attach(label(_('Icon')), 0, ++r, 1, 1);
		this.attach(switchTray, 1, r, 1, 1);

		// Minimize on Focus Out
		const switchFocusOut = new Gtk.Switch({ halign: Gtk.Align.START });

		settings.bind('quake-mode-focusout', switchFocusOut, 'state', Gio.SettingsBindFlags.DEFAULT);

		this.attach(label(_('Minimize on focus out')), 0, ++r, 1, 1);
		this.attach(switchFocusOut, 1, r, 1, 1);

		// Width
		const spinWidth = new Gtk.SpinButton();
		spinWidth.set_range(0, 100);
		spinWidth.set_increments(1, 2);

		settings.bind('quake-mode-width', spinWidth, 'value', Gio.SettingsBindFlags.DEFAULT);

		this.attach(label(_('Width - %')), 0, ++r, 1, 1);
		this.attach(spinWidth, 1, r, 1, 1);

		// Height
		const spinHeight = new Gtk.SpinButton();
		spinHeight.set_range(0, 100);
		spinHeight.set_increments(1, 2);

		settings.bind('quake-mode-height', spinHeight, 'value', Gio.SettingsBindFlags.DEFAULT);

		this.attach(label(_('Height - %')), 0, ++r, 1, 1);
		this.attach(spinHeight, 1, r, 1, 1);

		// Monitor Number
		const Columns = {LABEL: 0, VALUE: 1}
		const monitorModel = new Gtk.ListStore();
		monitorModel.set_column_types([GObject.TYPE_STRING, GObject.TYPE_INT])
		const selectMonitor = new Gtk.ComboBox({model: monitorModel});
		const selectMonitorRenderer = new Gtk.CellRendererText();
		selectMonitor.pack_start(selectMonitorRenderer, true);
		selectMonitor.add_attribute(selectMonitorRenderer, 'text', 0);

		const monitors = getMonitors()
		let monitorCurrentlySelected;

		for(const [idx, monitor] of monitors.entries()) {
			const iter = monitorModel.append();

			monitorModel.set(
				iter,
				[Columns.LABEL, Columns.VALUE],
				[`#${idx}: ${monitor.manufacturer} ${monitor.model}`, idx]
			)

			if(idx === settings.get_int('quake-mode-monitor')) {
				monitorCurrentlySelected = iter;
			}
		}

		if (monitorCurrentlySelected !== undefined) {
			selectMonitor.set_active_iter(monitorCurrentlySelected)
		}

		selectMonitor.connect('changed', () => {
			const [success, iter] = selectMonitor.get_active_iter();

			if(!success) {
				return;
			}

			const value = monitorModel.get_value(iter, Columns.VALUE)
			settings.set_int('quake-mode-monitor', value)
		});

		this.attach(label(_('Monitor')), 0, ++r, 1, 1);
		this.attach(selectMonitor, 1, r, 1, 1);

		// Time
		const spinTime = new Gtk.SpinButton({ digits: 2 });
		spinTime.set_range(0, 2);
		spinTime.set_increments(0.01, 0.02);

		settings.bind('quake-mode-animation-time', spinTime, 'value', Gio.SettingsBindFlags.DEFAULT);

		this.attach(label(_('Animation time - s')), 0, ++r, 1, 1);
		this.attach(spinTime, 1, r, 1, 1);
	}
});

const ApplicationWidget
= GObject.registerClass(class ApplicationWidget extends Gtk.Grid {
	_init(params) {
		super._init(params);
		this.set_margin_top(30);
		this.set_margin_bottom(30);
		this.set_margin_start(30);
		this.set_margin_end(30);
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

		Gio.app_info_get_all()
			.filter(a => a.should_show())
			.forEach(a => listBox.append(buildRow(a)));

		const scrolledWindow = new Gtk.ScrolledWindow({ vexpand: true });
		scrolledWindow.set_child(listBox);

		this.attach(scrolledWindow, 0, 2, 2, 1);

		function buildRow(app) {
			const name = app.get_display_name();
			const icon = app.get_icon();
			const image = icon
				? Gtk.Image.new_from_gicon(icon)
				: Gtk.Image.new_from_icon_name('application-x-executable');

			const label = new Gtk.Label({ label: name });
			const grid  = new Gtk.Grid({ hexpand: true, column_spacing: 5 });

			grid.attach(image, 0, 0, 1, 1);
			grid.attach(label, 1, 0, 1, 1);

			const row = new Gtk.ListBoxRow();
			row.set_child(grid);

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
			this.model.set(iter, [0, 1], [ _('Toggle'), a ]);
		};

		// Hotkey
		const iter = this.model.append();

		const actions      = new Gtk.TreeViewColumn({ title: _('Action'), expand: true });
		const nameRender = new Gtk.CellRendererText();

		const accels      = new Gtk.TreeViewColumn({ title: _('Shortcut Key'), min_width: 150 });
		const accelRender = new Gtk.CellRendererAccel({ editable: true });

		actions.pack_start(nameRender, true);
		accels.pack_start(accelRender, true);

		actions.set_cell_data_func(nameRender, (column, cell, model, iter) => {
			cell.text = model.get_value(iter, 0);
		});

		accels.set_cell_data_func(accelRender, (column, cell, model, iter) => {
			let ok = false;
			[ ok, cell.accel_key, cell.accel_mods ] = Gtk.accelerator_parse(model.get_value(iter, 1));
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
		this.append_page(new QuakeModePrefsWidget, new Gtk.Label({ label: _('Main') }));
		this.append_page(new ApplicationWidget,    new Gtk.Label({ label: _('Application') }));
		this.append_page(new AcceleratorsWidget,   new Gtk.Label({ label: _('Accelerators') }));
	}
});

function buildPrefsWidget() {
	const widget = new Notebook();
	widget.show();

	return widget;
}
