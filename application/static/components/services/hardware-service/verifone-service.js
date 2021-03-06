'use strict';
angular.module('skyZoneApp')
  .service('VerifoneService', ['$rootScope',
                               '$http', 
                               '$compile', 
                               '$timeout',
                               'HardwareService',
                               'VerifoneCommandFactory', 
                               'VerifoneWaiverForm',
                               'VerifonePaymentForm',
                               'VerifoneIdleForm',
                               'VerifonePaymentCompleteForm',
                               function($rootScope, $http, $compile, $timeout, HardwareService,
                               VerifoneCommandFactory, VerifoneWaiverForm, VerifonePaymentForm,
                               VerifoneIdleForm, VerifonePaymentCompleteForm) {
    var self = this;
    
    self.port = 4 // COM5
    self.baudrate = 115200
    
    self.loopCount = 0
    
    self.connectionId = 'verifone';
    self.isConnected = false;
    self.currentResponder = null
    
    self.currentForm = null;
    self.currentFormEvent = null;
    //self.currentFormEventIndex = null;
    
    HardwareService.socket.on('serial-response', function(data) {     
      console.log('[HWCOMM] - response from verifone: ', data);
      HardwareService.appendConsoleOutputArray('response recieved from mx925');
      
      self.currentFormEvent.responder(data.response,self.currentFormEvent.acceptedResponse).then(function(command) {
        if ( command != null ) {
          console.log('[HWCOMM] - response accetped: ', command);
          HardwareService.appendConsoleOutputArray('response accepted from mx925');
          var shouldRespond = false;
          if ( self.currentFormEvent.shouldRespond != undefined ) {
            shouldRespond = self.currentFormEvent.shouldRespond;
          }
          HardwareService.appendConsoleOutputArray('[HWCOMM] -- sending to mx925: ' + VerifoneCommandFactory.readableString(command));
          HardwareService.socket.emit('serial-write', { connectionId: self.connectionId, command: command, shouldRespond:shouldRespond });
        }
        self.formContinue();
      }, function(message) { 
        console.log('[HWCOMM] - response not accepted: ',  message);
        HardwareService.appendConsoleOutputArray('[HWCOMM] -- ERROR: response rejected from mx925, suggest reset');
      });
    })
    
    self.connect = function() {
      HardwareService.socket.emit('serial-connection', { connectionId: self.connectionId, port: self.port, baudrate: self.baudrate });
    }
    
    self.isOnline = function() {
      
    }
    
    self.rebootTerminal = function() {
      HardwareService.appendConsoleOutputArray('[HWCOMM] -- sending to mx925: ' + VerifoneCommandFactory.readableString(VerifoneCommandFactory.reboot.request()));
      HardwareService.socket.emit('serial-write', { connectionId:self.connectionId, command: VerifoneCommandFactory.reboot.request(),shouldRespond:false });
    }
    
    self.restartApp = function() {
      HardwareService.appendConsoleOutputArray('[HWCOMM] -- sending to mx925: ' + VerifoneCommandFactory.readableString(VerifoneCommandFactory.restartApp.request()));
      HardwareService.socket.emit('serial-write', { connectionId:self.connectionId, command: VerifoneCommandFactory.restartApp.request(),shouldRespond:false });  
    }
    
    self.clearAndShowIdle = function() {
      console.log('[HWCOMM] - idle screen init');
      
      self.currentForm = VerifoneIdleForm;
      self.currentFormEvent = VerifoneIdleForm.init;
      
      self.onComplete = function(data) { return null; }
      
      console.log('[HWCOMM] - to send: ', VerifoneCommandFactory.readableString(self.currentFormEvent.command));
      HardwareService.appendConsoleOutputArray('[HWCOMM] -- sending to mx925: ' + VerifoneCommandFactory.readableString(self.currentFormEvent.command()))
      HardwareService.socket.emit('serial-write', { connectionId:self.connectionId, command: self.currentFormEvent.command(),shouldRespond:self.currentFormEvent.shouldRespond == undefined ? true : self.currentFormEvent.shouldRespond });
      if ( self.currentFormEvent.shouldRespond == false ) {
          self.formContinue();
        }
    }
    
    self.startWaiver = function(customer,waiver,callback) {
      // TODO: should populate with data (user, minors, legaldocument, etc.)
      
      console.log('[HWCOMM] - starting waiver process: ', customer, waiver);
      
      self.currentForm = VerifoneWaiverForm;
      
      self.currentForm.waiver = waiver;
      self.currentForm.customer = customer;
      self.onComplete = callback;
      self.currentForm.reset();
      
      self.currentFormEvent = VerifoneWaiverForm.init;
      
      console.log('[HWCOMM] - to send: ', VerifoneCommandFactory.readableString(self.currentFormEvent.command));
      HardwareService.appendConsoleOutputArray('[HWCOMM] -- sending to mx925: ' + VerifoneCommandFactory.readableString(self.currentFormEvent.command()));
      HardwareService.socket.emit('serial-write', { connectionId:self.connectionId, command: self.currentFormEvent.command(),shouldRespond:self.currentFormEvent.shouldRespond == undefined ? true : self.currentFormEvent.shouldRespond });
      if ( self.currentFormEvent.shouldRespond == false ) {
          self.formContinue();
        }
      
    }
    
    self.startPayment = function(amount,callback) {
      console.log('[HWCOMM] -- starting payment process');
      
      VerifonePaymentForm.orderTotal = amount;
      self.currentForm = VerifonePaymentForm
      
      self.currentFormEvent = VerifonePaymentForm.init;
      self.onComplete = callback;
      self.currentForm.reset();
      
      console.log('[HWCOMM] - to send: ', VerifoneCommandFactory.readableString(self.currentFormEvent.command));
      HardwareService.appendConsoleOutputArray('[HWCOMM] -- sending to mx925: ' + VerifoneCommandFactory.readableString(self.currentFormEvent.command()));
      HardwareService.socket.emit('serial-write', { connectionId: self.connectionId, command: self.currentFormEvent.command(),shouldRespond:self.currentFormEvent.shouldRespond == undefined ? true : self.currentFormEvent.shouldRespond });
      if ( self.currentFormEvent.shouldRespond == false ) {
          self.formContinue();
        }
    }
    
    self.completePayment = function(text,callback) {
      console.log('[HWCOMM] -- starting complete payment flow');
      
      VerifonePaymentCompleteForm.text = text;
      self.currentForm = VerifonePaymentCompleteForm;
      self.currentFormEvent = VerifonePaymentCompleteForm.init;
      self.onComplete = callback;
      
      console.log('[HWCOMM] - to send: ', VerifoneCommandFactory.readableString(self.currentFormEvent.command));
      HardwareService.appendConsoleOutputArray('[HWCOMM] -- sending to mx925: ' + VerifoneCommandFactory.readableString(self.currentFormEvent.command()));
      HardwareService.socket.emit('serial-write', { connectionId: self.connectionId, command: self.currentFormEvent.command(),shouldRespond:self.currentFormEvent.shouldRespond == undefined ? true : self.currentFormEvent.shouldRespond });
      if ( self.currentFormEvent.shouldRespond == false ) {
          self.formContinue();
        }
    }
    
    self.onComplete = null
    
    self.formContinue = function() {
      
      var next = self.currentFormEvent.next();
      
      if (next == null) {
        self.onComplete(self.currentForm.returnData);
        console.log('[HWCOMM] - FORM COMPLETE');
        self.currentForm = null;
        self.currentFormEvent = null;
        self.onComplete = null;
        return;
      }
      
      self.currentFormEvent = next;
      
      var command = self.currentFormEvent.command();
      
      if (command == null) {
        console.log('no command', self.currentFormEvent);
        if ( self.currentFormEvent.listen ) {
          console.log('[HWCOMM] - Hey! Listen!');
          HardwareService.appendConsoleOutputArray('[HWCOMM] -- listening for user response on mx925')
          HardwareService.socket.emit('serial-listen', { connectionId: self.connectionId });
        }
        return
      }
      
      console.log('[HWCOMM] - to send: ', VerifoneCommandFactory.readableString(command)); 
      HardwareService.appendConsoleOutputArray('[HWCOMM] -- sending to mx925: ' + VerifoneCommandFactory.readableString(command));
      if ( self.currentFormEvent.delay ) {
        console.log('*****DELAY*****');
        $timeout(function() {
          HardwareService.socket.emit('serial-write', { connectionId: self.connectionId, command: command, shouldRespond:self.currentFormEvent.shouldRespond == undefined ? true : self.currentFormEvent.shouldRespond });
          if ( self.currentFormEvent.shouldRespond == false ) {
          self.formContinue();
        }
        },self.currentFormEvent.delay)
      }else {     
        HardwareService.socket.emit('serial-write', { connectionId: self.connectionId, command: command, shouldRespond:self.currentFormEvent.shouldRespond == undefined ? true : self.currentFormEvent.shouldRespond });
        if ( self.currentFormEvent.shouldRespond == false ) {
          self.formContinue();
        }
      }
    };
    

  }]);