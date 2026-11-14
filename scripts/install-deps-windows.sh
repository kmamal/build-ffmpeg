
pacman -S --noconfirm --needed \
	make \
	diffutils \
	pkgconf \
	nasm \
	perl

rm -f /usr/bin/link.exe

mkdir -p /usr/local/bin
curl -sL https://raw.githubusercontent.com/FFmpeg/gas-preprocessor/master/gas-preprocessor.pl -o /usr/local/bin/gas-preprocessor.pl
chmod +x /usr/local/bin/gas-preprocessor.pl
