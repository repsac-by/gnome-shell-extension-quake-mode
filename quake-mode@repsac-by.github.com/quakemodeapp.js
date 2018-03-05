'use strict';

/* exported QuakeModeApp */

const Shell = imports.gi.Shell;

const Main    = imports.ui.main;
const Tweener = imports.ui.tweener;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const { getSettings, on, once } = Me.imports.util;

var QuakeModeApp = class {
	constructor(app_id) {
		this.win = null;
		this.app = Shell.AppSystem.get_default().lookup_app(app_id);

		if ( !this.app )
			throw new Error(`application '${app_id}' not found`);

		const place = () => this.place();

		const settings = this.settings = getSettings();

		settings.connect('changed::quake-mode-width',   place);
		settings.connect('changed::quake-mode-height',  place);
		settings.connect('changed::quake-mode-monitor', place);
	}

	destroy() {
		this.settings.run_dispose();
		this.settings = null;

		this.win = null;
		this.app = null;
	}

	get actor() { return this.win ? this.win.get_compositor_private() : null; }

	get width()  { return this.settings.get_int('quake-mode-width'); }

	get height() { return this.settings.get_int('quake-mode-height'); }

	get ainmation_time() { return this.settings.get_double('quake-mode-animation-time'); }

	get monitor() {
		const { win, settings } = this;

		const monitor = settings.get_int('quake-mode-monitor');

		if ( !win )
			return monitor;

		if ( monitor < 0 )
			return 0;

		const max = win.get_screen().get_n_monitors() - 1;
		if ( monitor > max )
			return max;

		return monitor;
	}

	toggle() {
		const { win } = this;

		if ( !win )
			return this.launch();

		if ( win.has_focus() )
			return this.hide();

		if ( win.is_hidden() )
			return this.show();

		Main.activateWindow(win);
	}

	launch() {
		const { app } = this;

		once(app, 'windows-changed', () => {

			if (app.get_n_windows() < 1)
				return;

			this.win = app.get_windows()[0];

			once(this.win, 'unmanaged', () => {
				this.win = null;
			});

			Object.defineProperty(this.actor, 'clip_y', {
				get()  { return this.clip_rect.origin.y; },
				set(y) {
					const rect = this.clip_rect;
					this.set_clip(
						rect.origin.x,	 y,
						rect.size.width, rect.size.height
					);
				}
			});

			this.first_place();
		});

		app.open_new_window(-1);
	}

	first_place() {
		const { win, actor } = this;

		win.stick();
		actor.set_clip(0, 0, actor.width, 0);

		on(global.window_manager, 'map', (sig, wm, metaWindowActor) => {
			if ( metaWindowActor !== actor )
				return;

			sig.off();
			wm.emit('kill-window-effects', actor);

			once(win, 'size-changed')
				.then( () => this.show() );

			this.place();
		});
	}

	show() {
		const { win, actor } = this;

		if ( !win )
			return;

		if ( Tweener.isTweening(actor) )
			return;

		Tweener.addTween(actor, {
			translation_y: 0,
			clip_y: 0,
			time: this.ainmation_time,
			onStart() {
				this.get_parent().set_child_above_sibling(actor, null);
				this.set_clip(0, this.height, this.width, this.height);
				actor.translation_y = - actor.height,
				this.show();
			},
			onComplete() {
				this.remove_clip();
				Main.wm.skipNextEffect(this);
				Main.activateWindow(win);
			},
		});
	}

	hide() {
		const { win, actor } = this;

		if ( !win )
			return;

		if ( Tweener.isTweening(actor) )
			return;

		Tweener.addTween(actor, {
			translation_y: - actor.height,
			clip_y: actor.height,
			time: this.ainmation_time,
			onStart() {
				this.set_clip(0, 0, this.width, this.height);
			},
			onComplete() {
				Main.wm.skipNextEffect(this);
				this.meta_window.minimize();
				this.translation_y = 0;
				this.remove_clip();
			},
		});
	}

	place() {
		const { win, width, height, monitor } = this;

		if ( !win )
			return;

		const
			area = win.get_work_area_for_monitor(monitor),
			w = Math.round(width * area.width / 100),
			h = Math.round(height * area.height / 100),
			x = Math.round((area.width - w) / 2) + area.x,
			y = area.y;

		win.move_to_monitor(monitor);
		win.move_resize_frame(false, x, y, w, h);
	}
};
