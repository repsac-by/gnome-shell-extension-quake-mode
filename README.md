# It's a GNOME Shell extension adds support quake-mode for any application

## Installation

```bash
git clone https://github.com/repsac-by/gnome-shell-extension-quake-mode.git

cd gnome-shell-extension-quake-mode

gnome-extensions pack quake-mode@repsac-by.github.com --extra-source={quakemodeapp,indicator,util}.js

gnome-extensions install quake-mode@repsac-by.github.com.shell-extension.zip
```

## Usage

Go to gnome extensions or extension manager and open the settings for quake-mode. Switch over to the accelerators tab and define a shortcut key and an application it should open. Use that key to toggle the application like a quake shell.

## Know issues

Due to the implementation of some tricks of initial placement of the window in the desired location on the screen and suppression of the initial animation with replacement of its own, it may not always work correctly.

## P.S.

Developed for usage [tilix](https://github.com/gnunn1/tilix) on wayland but can manage almost any application.
