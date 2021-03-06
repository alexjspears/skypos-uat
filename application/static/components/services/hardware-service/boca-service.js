'use strict';
angular.module('skyZoneApp')
  .service('BocaService', ['$rootScope',
                               '$http', 
                               '$compile', 
                               '$timeout',
                               'HardwareService',
                               function($rootScope, $http, $compile, $timeout, HardwareService) {
   
   var self = this;
   
   self.connectionId = 'boca';
   // self.pId = 0x1042;
   // self.vId = 0x12EE;
   self.pId = 0x201;
   self.vId = 0xA43;
   
   self.connect = function() {
      HardwareService.socket.emit('usb-connection', { connectionId: self.connectionId, productId: self.pId, vendorId: self.vId });
   }
   
   self.disconnect = function() {
       HardwareService.socket.emit('usb-disconnect', { connectionId: self.connectionId });
   } 
    
    self.testPrint = function() {
        HardwareService.appendConsoleOutputArray('[HWCOMM] -- Sending Boca test print command.');
		var command = "<RC490,800><NR><F53><DTM>{SKYPOS TEST PRINT} \
		<RC80,410><NR><F41><PDF4,2>{The quick brown fox jumped over the lazy dog} \
		<RC300,20>BOCA \
		<RL><RC300,20><HW1,1><F12>BOCA \
		<RC300,110><RL><F6><HW1,1><VA7> \
		<RC320,310><RL><HW1,1><F3>PTC <VA67> \
		<RC320,340><RL><HW1,1><F3>RTC <VA68> \
		<RC300,160><RL><F6><HW1,1><VA9> \
		<RC370,770><RU>GHOSTWRITER \
		<RC48,880><RR><F2>FRIENDLY GHOST LANGUAGE \
		<RC52,862>PLACE LETTERS ANYWHERE \
		<RC80,1170><F6><RR>VOID \
		<RC15,1100><F3>TEST TICKET ONLY \
		<RC8,1010><X3><NXL10>*MONKEY* \
		<RR><RC78,915>  CODE 39 \
		<RU><RC320,770><BS17,30>TICKET & LABEL PRINTER \
		<NR><F2><RC303,20>ON TIME= <VA84> \
		<NR><F2><RC318,20>IP ADD= <VA82> \
		<NR><F3><RC0,300>300 DPI PRINT QUALITY \
		<RC340,30>SN# <VA1> \
		<NR><RC30,300> Print PDF 417 bar codes \
		<RC70,300><X2><OL6>^TEST PRINT^ \
		<RC90,250><RR>TEST PRINT \
		<RC200,440><X2><NP6>*MONKEY*<F2><HW1,1> \
		<NR><F1><SP180,750><LO1> \
		<RC375,385><F2><NR>SW1=<VA4> SW2=<VA5> SW3=<VA6> \
		<RC395,500>LEFT = 1  RIGHT = 0 \
		<HW1,1><RC415,385>TOP ADJ= <VA101> TOFF= <VA46> BOFF= <VA47> LPTIX= <VA45> \
		<NR><F3><HW1,1><VA8> \
		<RC445,150><F11>TEST PRINT \
		<RC490,150><F9>High density printing is clear and readable \
		<RC510,150><F2>High density printing is clear and readable \
		<RC530,150><F1>Legal size printing<F2> \
		<RC300,160><F6><RL><HW1,1> \
		<RC560,150><NR><HW2,2><F10>TEST PRINT \
		<RC660,150><HW1,1>Other special fonts are available \
		<RC300,160><F6><RL><HW1,1> \
		<p>";

		// var command = "{F,25,A,R,E,200,200,\"FMT-25\" | \
		// C,140,40,0,1,2,1,W,C,0,0,\"SAMPLE FORMAT\",0 | \
		// B,1,12,F,85,40,1,2,40,5,L,0 | \
		// T,2,18,V,50,50,1,1,1,1,B,L,0,0,1 | } \
		// {B,25,N,1 | \
		// 1,\"02802811111\" | \
		// 2,\"TEXT FIELD\" | }"
	
    	HardwareService.socket.emit('usb-write', { connectionId: self.connectionId, command:command });
    }
	
	self.printTicket = function(parkName,startTime,endTime,productName,date,customerFirstInitial,customerLastName,customerAgeGroup,marketingText) {
		var command = "<RC30,200><NR><HW2,2><F10>" + parkName;
		command += "<RC125,200><NR><HW2,2><F3>" + customerLastName + ', ' + customerFirstInitial;
		command += "<RC225,200><NR><HW1,1><F12>" + startTime + ' - ' + endTime;
		//command += "<RC300,400><NR><HW2,2><F12>" + endTime;
		command += "<RC325,200><NR><HW2,2><F3>" + productName;
		command += "<RC400,200><NR><HW2,2><F3>" + customerAgeGroup;
		command += "<RC475,200><NR><HW2,2><F3>" + date; 	
		command += "<RC575,200><NR><HW2,2><F3>" + marketingText;
		command += "<p>"
		
		HardwareService.socket.emit('usb-write', { connectionId: self.connectionId, command:command });
	}
        

  }]);