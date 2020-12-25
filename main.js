//https://npm.io/package/rpio
const rpio = require('rpio');

class it8951 {
	constructor() {
		/**
		 * Beispiel
		 * Panel(W,H) = (1872,1404)
		 * Image Buffer Address = 00119F00
		 * FW Version = SWv_0.1.
		 * LUT Version = M841_TFA5210
		 */
		this.display = {
			width: undefined,
			widthArray: undefined,
			height: undefined,
			heightArray: undefined,
			bufferAddr: undefined, // 4 Byte
			bufferAddrArray: undefined, // 4 Byte Array
			FWVersion: undefined,  // 16 Byte
			LUTVersion: undefined // 16 Byte
		}

		this.PINS = {
			CS: 24,
			RESET: 11,
			READY: 18
		};

		// Rotation
		this.ROTATE = {
			G0: 0,
			G90: 1,
			G180: 2,
			G270: 3
		};

		// Befehle
		this.CMD = {
			SYS_RUN: [0x00, 0x01],
			STANDBY: [0x00, 0x02],
			SLEEP: [0x00, 0x03],
			REG_READ: [0x00, 0x10],
			REG_WRITE: [0x00, 0x11],
			MEM_BURST_READ_TRIGGER: [0x00, 0x12],
			MEM_BURST_READ_START: [0x00, 0x13],
			MEM_BURST_WRITE: [0x00, 0x14],
			MEM_BURST_END: [0x00, 0x15],
			LOAD_FULL_IMAGE: [0x00, 0x20],
			LOAD_IMAGE_AREA: [0x00, 0x21],
			LOAD_IMAGE_END: [0x00, 0x21]
		}

		// Befehle
		this.CMD_I80 = {
			DISPLAY_AREA: [0x00, 0x34],
			GET_DISPLAY_INFO: [0x03, 0x02],
			DISPLAY_BUFFER_AREA: [0x00, 0x37],
			SET_VCOM: [0x00, 0x39],
		}

		// Bit per Pixel
		this.PIXEL_MODE = {
			BPP2: 0,
			BPP3: 1,
			BPP4: 2,
			BPP8: 3
		};

		// Waveform Mode
		this.WAVEFORM = {
			MODE0: 0, // Clear
			MODE1: 1, // None-Flash, aber nur für Wechsel von Grau auf Weiss/Schwarz!
			MODE2: 2, // Bilder
			MODE3: 3,
			MODE4: 4,
			MODE4: 5,
			MODE4: 6,
			MODE4: 7
		};

		this.ENDIANNESS = {
			LITTLE: 0,
			BIG: 1
		};

		this.MCSR_REG = {
			BASE: [0x02, 0x00],
			MSCR: [0x02, 0x00],
			LISAR: [0x02, 0x08]
		};

		rpio.spiBegin();
		rpio.spiChipSelect(1);
		rpio.spiSetCSPolarity(1, rpio.LOW);
		rpio.spiSetClockDivider(32); //32 = 7.8MHz, 16 = 15.6MHz, 8 = 31.2MHz. Gemäss Doku wäre Max. 24MHz möglich // Bei >=16 ist die Ausgabe Fehlerhaft!
		rpio.spiSetDataMode(0);

		rpio.open(this.PINS.CS, rpio.OUTPUT, rpio.HIGH);
		rpio.open(this.PINS.READY, rpio.INPUT);
		rpio.open(this.PINS.RESET, rpio.OUTPUT, rpio.HIGH);

		this.reset();
		this.getDisplayInfos();
		this.displayClear();

		this.loadImage(50, 100, 100, 50, 0x00);
		this.displayArea(50, 100, 100, 50);

		this.loadImage(400, 100, 100, 50, 0x00);
		this.displayArea(400, 100, 100, 50);
	}

	/**
	 * Display komplett Weiss
	 */
	displayClear() {
		this.displayArea(0, 0, this.display.width, this.display.height, this.WAVEFORM.MODE0);
	}

	loadImage(x, y, width, height, image) {
		// IMG Buffer adresse setzen
		this.writeRegistr([this.MCSR_REG.LISAR[0], this.MCSR_REG.LISAR[1] + 2], [this.display.bufferAddrArray[0], this.display.bufferAddrArray[1]]);
		this.writeRegistr([this.MCSR_REG.LISAR[0], this.MCSR_REG.LISAR[1]], [this.display.bufferAddrArray[2], this.display.bufferAddrArray[3]]);

		this.writeCmdSPI(this.CMD.LOAD_IMAGE_AREA);

		// Einstellungen
		let settings = (this.ENDIANNESS.LITTLE << 8) | (this.PIXEL_MODE.BPP8 << 4) | this.ROTATE.G0;

		this.writeDataSPI(
			[0x00, settings]
				.concat(this.intToWord(x))
				.concat(this.intToWord(y))
				.concat(this.intToWord(width))
				.concat(this.intToWord(height))
		);

		// Test
		let img = new Array(height * width);
		img.fill(image); //F0 White

		// Bilddaten schreiben
		this.writeDataSPI(img);
		this.writeCmdSPI(this.CMD.LOAD_IMAGE_END);
	}

	displayArea(x, y, width, height, mode = this.WAVEFORM.MODE2) {
		this.writeCmdSPI(this.CMD_I80.DISPLAY_AREA);
		this.writeWordSPI(this.intToWord(x)); //x
		this.writeWordSPI(this.intToWord(y)); //y
		this.writeWordSPI(this.intToWord(width)); //w
		this.writeWordSPI(this.intToWord(height)); //h
		this.writeWordSPI([0x00, mode]); //mode
	}

	/**
	 * Integer Wert zu 2 Byte Array
	 * @param {int} value 
	 * @return Array
	 */
	intToWord(value) {
		var bytes = [];
		var i = 2;
		do {
			bytes[--i] = value & (255);
			value = value >> 8;
		} while (i)
		return bytes;
	}

	/**
	 * SPI Chip Select setzen oder löschen
	 * @param {bool} on 
	 */
	setCS(on = true) {
		rpio.write(this.PINS.CS, on ? rpio.LOW : rpio.HIGH);
	}

	/**
	 * Displayinformationen auslesen
	 */
	getDisplayInfos() {
		this.writeCmdSPI(this.CMD_I80.GET_DISPLAY_INFO);
		let data = this.readSPI(40);

		this.display.width = data[1] | (data[0] << 8);
		this.display.widthArray = [data[0], data[1]];
		this.display.height = data[3] | (data[2] << 8);
		this.display.heightArray = [data[2], data[3]];
		this.display.bufferAddr = data[5] | (data[4] << 8) | (data[7] << 16) | (data[6] << 24);
		this.display.bufferAddrArray = [data[6], data[7], data[4], data[5]]; // 0x00119F00
		this.display.FWVersion = data.toString('utf8', 8, 24).replace(/\0/g, '');
		this.display.LUTVersion = data.toString('utf8', 25, 40).replace(/\0/g, '');
	}

	/**
	 * Warte bis Display für den nächsten Befehl bereit ist
	 */
	waitForDisplayReady() {
		for (var i = 0; i < 40; i++) {
			console.log("wait:" + i);
			rpio.msleep(80);
			if (rpio.read(this.PINS.READY))
				return true;
		}

		console.log('ERROR');
		return false;
	}

	/**
	 * Standard Modus
	 */
	wakeUp() {
		this.writeCmdSPI(this.CMD.SYS_RUN);
	}

	/**
	 * Standby
	 */
	standBy() {
		this.writeCmdSPI(this.CMD.standBy);
	}

	/**
	 * Schlafmodus
	 */
	sleep() {
		this.writeCmdSPI(this.CMD.SLEEP);
	}

	/**
	 * Reset
	 */
	reset() {
		rpio.write(this.PINS.RESET, rpio.LOW);
		rpio.msleep(100);
		rpio.write(this.PINS.RESET, rpio.HIGH);
		rpio.msleep(100);
	}

	/**
	 * Befehl ausführen
	 * @param {array} cmd 2 Byte 
	 */
	writeCmdSPI(cmd) {
		this.waitForDisplayReady();
		this.setCS();

		// Preamble
		rpio.spiWrite(Buffer.from([0x60, 0x00]), 2);

		this.waitForDisplayReady();

		// CMD
		rpio.spiWrite(Buffer.from(cmd), 2);
		this.setCS(false);
	}

	/**
	 * 2 Byte senden
	 * @param {array} 2 Byte  
	 */
	writeWordSPI(word) {
		this.waitForDisplayReady();
		this.setCS();

		//Preamble
		rpio.spiWrite(Buffer.from([0x00, 0x00]), 2);

		this.waitForDisplayReady();

		// Wort senden
		rpio.spiWrite(Buffer.from(word), 2);

		this.setCS(false);
	}

	/**
	 * Daten senden
	 * @param {array} data 
	 */
	writeDataSPI(data) {
		this.waitForDisplayReady();
		this.setCS();

		//Preamble
		rpio.spiWrite(Buffer.from([0x00, 0x00]), 2);

		this.waitForDisplayReady();

		// Daten
		let sendData = Buffer.from(data);
		rpio.spiWrite(sendData, sendData.length);
	}

	/**
	 * Register schreiben
	 * @param {array} reg 2 Byte
	 * @param {array} value 2 Byte
	 */
	writeRegistr(reg, value) {
		this.writeCmdSPI(this.CMD.REG_WRITE);
		this.writeWordSPI(reg);
		this.writeWordSPI(value);
	}

	/**
	 * Register lesen
	 * @param {array} addr 2 Byte
	 * @return {Buffer}
	 */
	readRegistr(addr) {
		this.writeCmdSPI(this.CMD.REG_READ);
		this.writeWordSPI(addr);
		return this.readSPI(2);
	}

	/**
	 * Daten empfangen
	 * @param {int} length x-Byte lesen
	 * @return {Buffer}
	 */
	readSPI(length) {
		// Die ersten beiden empfangenen Bytes sind von der Preamble, daher löschen
		let tx = Buffer.alloc(length + 2);
		let rx = Buffer.alloc(length + 2);

		this.waitForDisplayReady();
		this.setCS();

		// Preamble
		rpio.spiWrite(Buffer.from([0x10, 0x00]), 2);

		this.waitForDisplayReady();

		// Empfangen
		rpio.spiTransfer(tx, rx, length + 2);
		this.setCS(false);

		return rx.slice(2, length + 2);
	}
}

new it8951();