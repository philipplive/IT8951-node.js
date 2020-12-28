# IT8951 node.js Treiber (Raspberry Pi)
IT8951 Node.js Treiber auf einem Raspberry Pi Zero

Getestet mit einem Waveshare 10.3" E-Ink Display (1872×1404) / Raspberry Pi Zero.

## Hinweis
Leider ist die Performance relativ schlecht. Grund hierfür ist einerseits die hohe Auflösung (ein Komplettes Bild ist rund 2,6MB gross), sowie der max. SPI Takt von 25MHz (welchen ich auf dem Rasberry Pi leider real nicht stabil nutzen konnte). Für eine Refreshrate von 2Hz und höher sollte das USB-Interface genutzt werden.

## Dokumente
* Platinenschema [> Link](https://www.waveshare.com/w/upload/b/be/E-Paper-IT8951-Driver-HAT-B-Schematic.pdf)
* Doku des Herstellers  [> Link](https://www.waveshare.net/w/upload/1/18/IT8951_D_V0.2.4.3_20170728.pdf)
* Beispiel  [> Link](https://www.waveshare.com/w/upload/b/b0/IT8951_I80%2BProgrammingGuide_16bits_20170904_v2.7_common_CXDX.zip)


