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
			height: undefined,
			bufferAddr: undefined, // 4 Byte
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

		this.CMD = {
			SYS_RUN: [0x00, 0x01],
			STANDBY: [0x00, 0x02],
			SLEEP: [0x00, 0x03],
			REG_READ: [0x00, 0x10],
			REG_WRITE: [0x00, 0x11],
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
			MODE0: 0,
			MODE1: 1,
			MODE2: 2,
			MODE3: 3,
			MODE4: 4
		};

		rpio.spiBegin();
		rpio.spiChipSelect(1);
		rpio.spiSetCSPolarity(1, rpio.LOW);
		rpio.spiSetClockDivider(32); //32 = 7.8MHz, 16 = 15.6MHz, 8 = 31.2MHz. Gemäss Doku wäre Max. 24MHz möglich
		rpio.spiSetDataMode(0);

		rpio.open(this.PINS.CS, rpio.OUTPUT, rpio.HIGH);
		rpio.open(this.PINS.READY, rpio.INPUT);
		rpio.open(this.PINS.RESET, rpio.OUTPUT, rpio.HIGH);

		this.reset();
		this.getDisplayInfos();
	}

	/**
	 * SPI Chip Select setzen oder löschen
	 * @param {bool} on 
	 */
	setCS(on = true) {
		rpio.write(this.PINS.CS, on ? rpio.LOW : rpio.HIGH);
	}

	getDisplayInfos() {
		this.writeCmdSPI([0x03, 0x02]);
		let data = this.readSPI(40);

		this.display.width = data[1] | (data[0] << 8);
		this.display.height = data[3] | (data[2] << 8);
		this.display.bufferAddr = data[5] | (data[4] << 8) | (data[7] << 16) | (data[6] << 24);
		this.display.FWVersion = data.toString('utf8', 8, 24);
		this.display.LUTVersion = data.toString('utf8', 25, 40);

		console.log(this.display);
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
	 * Reset
	 */
	reset() {
		rpio.write(this.PINS.RESET, rpio.LOW);
		rpio.msleep(100);
		rpio.write(this.PINS.RESET, rpio.HIGH);
		rpio.msleep(100);
	}

	setPixels(x, y, w, h, image) {
		this.writeRegistr();
	}

	/**
	 * Befehl ausführen
	 * @param {array} cmd 2 Byte 
	 */
	writeCmdSPI(cmd) {
		this.waitForDisplayReady();

		// Preamble
		this.setCS();
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
		rpio.spiWrite(Buffer.from([0x00, 0x00]));

		this.waitForDisplayReady();

		// Wort senden
		rpio.spiWrite(word);

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
		rpio.spiWrite(Buffer.from([0x00, 0x00]));

		this.waitForDisplayReady();

		// Daten
		rpio.spiTransfer(data, data.length);
	}

	/**
	 * Register schreiben
	 * @param {array} reg 2 Byte
	 * @param {array} value 2 Byte
	 */
	writeRegistr(reg, value) {
		this.writeCmdSPI(Buffer.from(this.CMD.REG_WRITE));
		this.writeWordSPI(Buffer.from(reg));
		this.writeWordSPI(Buffer.from(value));
	}

	/**
	 * Register schreiben
	 * @param {array} addr 2 Byte
	 * @return {Buffer}
	 */
	readRegistr(addr) {
		this.writeCmdSPI(Buffer.from(this.CMD.REG_READ));
		this.writeWordSPI(Buffer.from(addr));
		return this.readSPI(2);
	}

	/**
	 * Daten empfangen
	 * @param {int} length x-Byte lesen
	 * @return {Buffer}
	 */
	readSPI(length) {
		// Die ersten beiden empfangenen Bytes sind Dummys, daher löschen
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