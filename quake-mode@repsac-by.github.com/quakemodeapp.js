'use strict';

/* exported QuakeModeApp, state */

const { Clutter, GLib, Shell } = imports.gi;

const Main = imports.ui.main;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const { getSettings, on, once } = Me.imports.util;

var state = {
	INITIAL:  Symbol('INITIAL'),
	READY:    Symbol('READY'),
	STARTING: Symbol('STARTING'),
	RUNNING:  Symbol('RUNNING'),
	DEAD:     Symbol('DEAD'),
};

var QuakeModeApp = class {
	constructor(app_id) {
		this.isTransition = false;
		this.state = state.INITIAL;
		this.win   = null;
		this.app   = Shell.AppSystem.get_default().lookup_app(app_id);

		if ( !this.app ) {
			this.state = state.DEAD;
			throw new Error(`application '${app_id}' not found`);
		}

		const place = () => this.place();

		const settings = this.settings = getSettings();

		settings.connect('changed::quake-mode-width',   place);
		settings.connect('changed::quake-mode-height',  place);
		settings.connect('changed::quake-mode-monitor', place);

		this.state = state.READY;
	}

	destroy() {
		this.state = state.DEAD;

		if ( this.settings ) {
			this.settings.run_dispose();
			this.settings = null;
		}

		this.win = null;
		this.app = null;
	}

	get actor() {
		if ( ! this.win )
			return null;

		const actor = this.win.get_compositor_private();

		if ( ! actor )
			return null;

		return 'clip_y' in actor
			? actor
			: Object.defineProperty(actor, 'clip_y', {
				get()  { return this.clip_rect.origin.y; },
				set(y) {
					const rect = this.clip_rect;
					this.set_clip(
						rect.origin.x,	 y,
						rect.size.width, rect.size.height
					);
				}
			});
	}

	get width()  { return this.settings.get_int('quake-mode-width'); }

	get height() { return this.settings.get_int('quake-mode-height'); }

	get focusout() { return this.settings.get_boolean('quake-mode-focusout'); }

	get ainmation_time() { return this.settings.get_double('quake-mode-animation-time') * 1000; }

	get monitor() {
		const { win, settings } = this;

		const monitor = settings.get_int('quake-mode-monitor');

		if ( !win )
			return monitor;

		if ( monitor < 0 )
			return 0;

		const max = global.display.get_n_monitors() - 1;
		if ( monitor > max )
			return max;

		return monitor;
	}

	toggle() {
		const { win } = this;

		if ( this.state === state.READY )
			return this.launch()
				.then(() => this.first_place())
				.catch( e => {
					this.destroy();
					throw e;
				});

		if ( this.state !== state.RUNNING )
			return;

		if ( win.has_focus() )
			return this.hide();

		if ( win.is_hidden() )
			return this.show();

		Main.activateWindow(win);
	}

	launch() {
		const { app } = this;
		this.state = state.STARTING;

		app.open_new_window(-1);

		return new Promise( (resolve, reject) => {
			const timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
				sig.off();
				reject(new Error(`launch '${this.app.id}' timeout`));
			});

			const sig = once(app, 'windows-changed', () => {
				GLib.source_remove(timer);

				if (app.get_n_windows() < 1)
					return reject(`app '${this.app.id}' is launched but no windows`);

				this.win = app.get_windows()[0];

				once(this.win, 'unmanaged', () => this.destroy());

				resolve();
			});
		});
	}

	first_place() {
		const { win, actor } = this;

		actor.set_clip(0, 0, actor.width, 0);

		on(global.window_manager, 'map', (sig, wm, metaWindowActor) => {
			if ( metaWindowActor !== actor )
				return;

			sig.off();
			wm.emit('kill-window-effects', actor);

			once(win, 'size-changed')
				.then( () => {
					this.state = state.RUNNING;
					actor.remove_clip();
					this.show();
				} );

			this.place();
		});
	}

	show() {
		const { actor, focusout } = this;

		if ( this.state !== state.RUNNING )
			return;

		if ( this.isTransition )
			return;

		this.isTransition = true;

		actor.get_parent().set_child_above_sibling(actor, null);
		actor.translation_y = - actor.height,
		Main.wm.skipNextEffect(actor);
		Main.activateWindow(actor.meta_window);

		actor.ease({
			translation_y: 0,
			duration: this.ainmation_time,
			mode: Clutter.AnimationMode.EASE_OUT_QUART,
			onComplete: () => {
				this.isTransition = false;
				if ( focusout )
					once(global.display, 'notify::focus-window')
						.then(() => this.hide());
			},
		});
		
		this.place();
	}

	hide() {
		const { actor } = this;

		if ( this.state !== state.RUNNING )
			return;

		if ( this.isTransition )
			return;

		this.isTransition = true;

		actor.ease({
			translation_y: - actor.height,
			duration: this.ainmation_time,
			mode: Clutter.AnimationMode.EASE_IN_QUART,
			onComplete: () => {
				Main.wm.skipNextEffect(actor);
				actor.meta_window.minimize();
				actor.translation_y = 0;
				this.isTransition = false;
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
