cd /tmp
apt-get install unzip
wget https://noto-website.storage.googleapis.com/pkgs/NotoColorEmoji-unhinted.zip
mkdir -p /usr/local/share/fonts/truetype
unzip NotoColorEmoji-unhinted.zip -d /usr/local/share/fonts/truetype/noto
rm /usr/local/share/fonts/truetype/noto/LICENSE_OFL.txt
chmod 644 /usr/local/share/fonts/truetype/noto/NotoColorEmoji.ttf
cat << 'EOF' > /etc/fonts/local.conf
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
<alias>
<family>sans-serif</family>
<prefer>
<family>NotoSans</family>
<family>NotoColorEmoji</family>
<family>NotoEmoji</family>
</prefer>
</alias>
<alias>
<family>serif</family>
<prefer>
<family>NotoSerif</family>
<family>NotoColorEmoji</family>
<family>NotoEmoji</family>
</prefer>
</alias>
</fontconfig>
EOF
fc-cache -f -v
