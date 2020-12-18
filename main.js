//https://npm.io/package/rpio
const rpio = require('rpio');


class it8951{ 
	constructor(){
		this.PINS = {
			CS: 24,
			RESET: 38,
			READY: 40			
		};
				
		rpio.spiBegin();
		rpio.spiChipSelect(1);     
		rpio.spiSetCSPolarity(1, rpio.LOW);  
		rpio.spiSetClockDivider(32);     
		rpio.spiSetDataMode(0);
		
		rpio.open(this.PINS.CS, rpio.OUTPUT, rpio.HIGH);
		rpio.open(this.PINS.READY, rpio.INPUT);
		rpio.open(this.PINS.RESET, rpio.OUTPUT, rpio.HIGH);
		
		this.reset();
		this.getDisplayInfos();
	} 
	
	getDisplayInfos(){
		this.writeCMD([0x03, 0x02 ]);
		console.log(this.readSPI(40));
	}
	
	waitForDisplayReady() {
		for (var i = 0; i < 40; i++) {
			console.log(i);
			rpio.msleep(50);		 
			if(rpio.read(this.PINS.READY))
				return true;
		}
		 
		console.log('waiting zu lange ');
		return false;
	}
	
	reset(){
		rpio.write(this.PINS.RESET, rpio.LOW);
        rpio.msleep(100);
		rpio.write(this.PINS.RESET, rpio.HIGH);
        rpio.msleep(100);
	}
	
	setPixels(x,y,w,h,image){
		this.writeRegistr();
	}

	
	writeCMD(cmd){
		let cmdWord = Buffer.from(cmd);
		var cmdINI = Buffer.from([0x60, 0x00]);
		this.waitForDisplayReady();
		
		rpio.write(this.PINS.CS, rpio.LOW);
		rpio.spiWrite(cmdINI, cmdINI.length);
		
		this.waitForDisplayReady();

		rpio.spiWrite(cmdWord, cmd.length);
		rpio.write(this.PINS.CS, rpio.HIGH);
	}
	
	writeWordSPI(word){
		this.waitForDisplayReady();
		
		rpio.write(this.PINS.CS, rpio.LOW);
		
		rpio.spiWrite(Buffer.from([0x00, 0x00]));
		
		this.waitForDisplayReady();
		
		rpio.spiWrite(word);
		
		rpio.write(this.PINS.CS, rpio.HIGH);
	}
	
	writeRegistr(reg,value){
		this.writeCMD(Buffer.from([0x00, 0x11]));
		this.writeWordSPI(reg);
		this.writeWordSPI(value);
	}
	
	readSPI(length){
		console.log('read');
		let tx = Buffer.alloc(length + 2);
		let rx = Buffer.alloc(length + 2);
		
		this.waitForDisplayReady();
		rpio.write(this.PINS.CS, rpio.LOW);
		
		rpio.spiWrite(Buffer.from([0x10, 0x00]), 2);
		
		this.waitForDisplayReady();
		
		rpio.spiTransfer(tx, rx, length + 2);
		rpio.write(this.PINS.CS, rpio.HIGH);
		return rx.slice(2,length+2);
	}
	
	readRegister(addr){
		var tx = new Buffer([0x60, 0x00,0x00, 0x10 ]);

	}
}

new it8951();