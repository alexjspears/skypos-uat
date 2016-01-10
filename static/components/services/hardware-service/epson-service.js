'use strict';
angular.module('skyZoneApp')
  .service('EpsonService', ['$rootScope',
                               '$http', 
                               '$compile', 
                               '$timeout',
                               '$filter',
                               'HardwareService', 
                               'EpsonCommandFactory',
                               function($rootScope, $http, $compile, $timeout, $filter, HardwareService, EpsonCommandFactory) {
   
   var self = this;
   
   self.connectionId = 'epson';
   self.pId = 0x202;
   self.vId = 0x4b8;
   
   self.connect = function() {
      HardwareService.socket.emit('usb-connection', { connectionId: self.connectionId, productId: self.pId, vendorId: self.vId });
   }
   
   self.disconnect = function() {
       HardwareService.socket.emit('usb-disconnect', { connectionId: self.connectionId });
   } 
    
    self.testPrint = function() {
      HardwareService.appendConsoleOutputArray('[HWCOMM] -- Sending Epson test print command.');
      HardwareService.socket.emit('usb-write', { connectionId: self.connectionId, command:EpsonCommandFactory.testPrint() });
    }
    
    self.printReciept = function(order,park,guest,recieptTitle,saleTitle,popDrawer,sigCopy) {
      
      var ecf = EpsonCommandFactory;
      var command = ecf.initPrinter();
      command += ecf.titleSection("Sky Zone "+park.name,park.address.street,park.address.city+", "+park.address.stateCode+" "+park.address.postalCode, park.phone,recieptTitle);
      var today = new Date();
      var dateString = $filter('date')(today,'short');
      console.log('TODAY DATE STRING: ', dateString);
      var orderKeys = ['Order','Date'];
      var orderValues = [order['id'],dateString];
      if( guest ) {
        orderKeys.push('Guest');

        orderValues.push(guest.firstName + " " + guest.lastName);
      }
      command += ecf.orderSection(orderKeys,orderValues);
      
      command += ecf.indicationLine(saleTitle);
      
      for (var i in order['orderItems']) {
          var item = order['orderItems'][i];
          var quantity = item['quantity'];
          var names = [item['product']['name']];
          if ( item.reservation ) {
            var dateTimeString = ""
            if ( item.reservation.startDate ) { dateTimeString += item.reservation.startDate }
            if ( item.reservation.reservationItems[0] ) { dateTimeString += " " + item.reservation.reservationItems[0].startTime + " - " + item.reservation.reservationItems[0].endTime }
            if ( dateTimeString.length > 0 ) { names.push(dateTimeString) }
          }
          var price = $filter('currency')(item['totalAmount']);
          command += ecf.saleLineItem(quantity,names,price)
      }
      
           
      var keys = ["Sub Total","Tax","Order Total","Total Recieved","Change"];
      var tax = order['taxAmount']
      var total = order["totalOrderAmount"];
      var change = order["totalAmountDue"];
      var totalRecieved = total - change;
      var subtotal = total - tax;
      var values = [$filter('currency')(subtotal),$filter('currency')(tax),$filter('currency')(total),$filter('currency')(totalRecieved),$filter('currency')(change)];
      command += ecf.totalSection(keys,values,2);
            
      for (var i in order.payments) {
        var payment = order.payments[i];
        
        if ( payment.transactionType != 'Capture' ) {
        
          if ( payment.recordType.name == "Credit Card" ) {
            var keys = ['Payment Type','creditCardNumber','Card Type','Amount']
            var values = [payment.recordType.name,payment.creditCardNumber,payment.creditCardType,$filter('currency')(payment.amount)];
            command += ecf.orderSection(keys,values);
          } else  {
            var keys = ['Payment Type','Amount']
            var values = [payment.recordType.name,$filter('currency')(payment.amount)];
            command += ecf.orderSection(keys,values);
          }
        }
      }
      
      if ( sigCopy ) {
        command += ecf.paymentSection();
      }
      
      //console.log("order number: ",order.orderNumber, order.orderNumber.replace('SZO-',''));
      var orderInt = order.orderNumber == null ? 0 : parseInt(order.orderNumber.replace('SZO-',''));
      
      command += ecf.barcode("ORDER",order.id);
      
      command += ecf.cut();
      
      if ( popDrawer ) {
          command += ecf.openDrawer();
      }
      
      
      
      console.log('[HWCOM] - command to send to printer: ', command);
      
      
      
      HardwareService.socket.emit('usb-write', { connectionId: self.connectionId, command:command });      
      
    }
    
    self.popDrawer = function() {
        var command = EpsonCommandFactory.openDrawer();
        
        HardwareService.socket.emit('usb-write', { connectionId: self.connectionId, command:command });
    };
    

  }]);