{pkgs}: {
  deps = [
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libX11
    pkgs.cairo
    pkgs.pango
    pkgs.libdrm
    pkgs.cups
    pkgs.atk
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
