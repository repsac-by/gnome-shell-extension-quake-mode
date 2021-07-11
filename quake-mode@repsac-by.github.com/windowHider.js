'use strict';

/* exported WindowHider */

const Workspace = imports.ui.workspace.Workspace;
const { WindowSwitcherPopup, WindowCyclerPopup } = imports.ui.altTab;


var WindowHider = class {
	constructor(win) {
		this._win = win;

		this._workspace_getWindows = Workspace.prototype._isOverviewWindow;
		Workspace.prototype._isOverviewWindow = win => {
			return this._workspace_getWindows.apply(Workspace, arguments)
				&& !this._isOurWindow(win);
		};

		//TODO this doesn't seem to work right now
		/*
		this._switcher_getWindowList = WindowSwitcherPopup.prototype._getWindowList;
		WindowSwitcherPopup.prototype._getWindowList = () => {
			return this._switcher_getWindowList
				.filter(win => !this._isOurWindow(win))
		};

		this._cycler_getWindows = WindowCyclerPopup.prototype._getWindows;
		WindowCyclerPopup.prototype._getWindows = () => {
			return this._cycler_getWindows
				.filter(win => !this._isOurWindow(win))
		};
		*/
	}

	_isOurWindow(win) {
		// log(`app id ${win.get_gtk_application_id()}, ${this._win.get_gtk_application_id()}, equals ${win === this._win ? 'yes' : 'no'}`);
		log(`app id ${win.get_gtk_application_id}, ${this._win.get_gtk_application_id}, equals ${win === this._win ? 'yes' : 'no'}`);
		// log(`pid ${win.get_pid}, ${this._win.get_pid}`);
		//
		// //return show && !(win.get_meta_window().get_gtk_application_id()+'.desktop'==app_id() && win.get_meta_window().minimized);
		// return false;
		return win === this._win;
	}

	destroy() {
		Workspace.prototype._isOverviewWindow = this._workspace_getWindows;
		//TODO uncomment if fixed
		//WindowSwitcherPopup.prototype._getWindowList = this._switcher_getWindowList;
		//WindowCyclerPopup.prototype._getWindows = this._cycler_getWindows;
	}
};
