{pkgs}: {
  deps = [
    pkgs.dbus
    pkgs.nspr
    pkgs.xorg.xauth
    pkgs.alsa-lib
    pkgs.nss
    pkgs.libnotify
    pkgs.gtk3
    pkgs.glib
    pkgs.jq
    pkgs.glibcLocales
    pkgs.postgresql
  ];
}
