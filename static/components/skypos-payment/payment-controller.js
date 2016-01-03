'use strict';

angular.module('skyZoneApp')
    .controller('SPPaymentController',['$scope', '$rootScope', '$q', '$location','$filter','Park', 'Guest', 'Order', 'OrderService','EpsonService','BocaService','VerifoneService', 'NavService','UserService','WaiverStatus','RFIDReaderService',
    	function($scope, $rootScope, $q, $location, $filter, Park, Guest, Order, OrderService, EpsonService,BocaService,VerifoneService, NavService,UserService, WaiverStatus,RFIDReaderService){

    	console.log("PARK:", Park);
    	console.log("ORDER: ", Order);
    	console.log("GUEST: ", Guest);


        function logErrorStopLoading(err) {
            $rootScope.$broadcast('szeHideLoading');
            $rootScope.$broadcast('szeError', 'Failed to process order: '+JSON.stringify(err));
            $scope.showModal = false;
        }


    	$scope.order = Order;
    	$scope.guest = Guest;
    	$scope.park = Park;

		$scope.showModal = false;

        $scope.isEditable = false;
            $scope.modelTitle='';

        // order update
        $rootScope.$on('szeOrderUpdated', function(event,order) {
            console.log('order updated: ', order);
            $scope.order = order;
            $rootScope.$broadcast('szeHideLoading');
        });

		$scope.toggleModal = function(type){
            $scope.modelType = type;
            $scope.modelTitle='';
			$scope.showModal = !$scope.showModal;
		};

        ////////// ORDER STATUS //////////
        $scope.orderInProgress = function(e) {
            return $scope.order.status == 'In Progress' || $scope.order.status == 'Reserved';
        };

        $scope.orderCancelled = function(e) {
            return $scope.order.status == "Cancelled";
        }

        $scope.orderPurchased = function(e) {
            return $scope.order.status == 'Purchased';
        }

        ////////// END ORDER STATUS //////////
        
        ////////// HARDWARE INTEGRATION ///////////
        $scope.popDrawer = false;
        $scope.printReciept = function(order) {
            // $scope.order = order;
            if ( $scope.orderPurchased() ) {
                EpsonService.printReciept(order,$scope.park,$scope.guest,"Sky Zone Copy","SALE",false,true);
                EpsonService.printReciept(order,$scope.park,$scope.guest,"Customer Copy","SALE",$scope.popDrawer,false);
                $scope.popDrawer = false;
            }   
            return $q.when(order);

        };
        
        $scope.printTicket = function(order) {
            // $scope.order = order;

            var def = $q.defer();
            
            var reservation = null;
            var products = [];
            for ( var i in order.orderItems ) {
                var item = order.orderItems[i];
                if ( item.product.parentCategoryName == 'Jump' ) {
                    products.push(item.product);
                    reservation = item.reservation;
                }
            }
            
            var productIds = products.map(function(product) {
                return product.sfId;
            });
            
            if ( reservation == null ||  reservation.reservationItems == null || reservation.reservationItems.length == 0 ) {
                def.resolve(order);
            } else {
                for ( var i in reservation.reservationItems ) {
                    var item = reservation.reservationItems[i];
                    for ( var g = 0;g<item.numberOfGuests;g++ ) {
                        var parkName = "Sky Zone " + order.parkName;
                        var startTime = $scope.toTimeString(item.startTime);
                        var endTime = $scope.toTimeString(item.endTime);
                        var productName = products[productIds.indexOf(item.resourceSfId)].name;
                        var date = $filter('date')( order.startDate,'EEE MMM dd, yyyy');
                        
                        BocaService.printTicket(parkName,startTime,endTime,productName,date);
                    }
                }
                def.resolve(order);
            }

            return def.promise;
            
        };
        
        $scope.toTimeString= function(str) {
            var a = str.split(':')
            var d = new Date();
            d.setHours(a[0]);
            d.setMinutes(a[1]);
            return $filter('date')(d,'shortTime');
        }
        
        $scope.tagData = '';
        $scope.getRFIDTag = function() {
            RFIDReaderService.readTag(function(tag) {
                $scope.tagData = tag;
                $scope.$apply();
            },function(errMessage) {
                $scope.tagData = errMessage; 
                $scope.$apply();
            });
        }

        ////////// END HARDWARE INTEGRATION ///////////
        
        $scope.noSale = function() {
            $scope.modelType = 'noSale';
            $scope.modelTitle='No Sale Reasons';
			$scope.showModal = !$scope.showModal;
            
           EpsonService.popDrawer();  
        };
        
        
        $scope.managerDiscountApproval = function() {
            $scope.modelType = 'manager-auth-discount';
            $scope.modelTitle='manager-auth-discount';
			$scope.showModal = true;
        };
        $scope.managerDiscount = function(){
        	
        	console.log('hello'+ $scope.auth)
        }

        $scope.managerApprovel = function() {
            $scope.modelType = 'manager-auth';


            $scope.showModal = true;

        };

        ////////// CASH //////////

        $scope.getNumberString = function(value) {
            return $filter('currency')(value / 100);
        };

        $scope.getChangedOwed = function(cash) {
            if (cash == "" || cash == null || cash == undefined) {
                cash = 0;
            }

            var change = (parseInt(cash) / 100) - $scope.order.totalAmountDue;
            return $filter('currency')(change);
        }

        $scope.submitCashPayment = function(amount) {
            console.log('submitting cash payment: ', amount / 100);

            var changeDue = (amount/100) - $scope.order.totalAmountDue;

            var payload = OrderService.createCashPayment(amount / 100);

            $rootScope.$broadcast('szeDismissError')
            $rootScope.$broadcast('szeShowLoading');
            OrderService.addCashPayment($scope.order.id, payload)   //.then(OrderService.updateOrderStatus,logErrorStopLoading)
                .then(function(order) {
                    console.log('order updated cash', order)
                    $rootScope.$broadcast('szeHideLoading');
                    $scope.popDrawer = true;
                    // setTimeout($scope.printReciept,3000);
                }, logErrorStopLoading);
        };


        ////////// END CASH //////////

        ////////// GIFTCARD MODAL //////////

        $scope.giftCard = {
            'giftCardNumber': '',
            'amount': $scope.order.totalAmountDue * 100
        }
        $scope.selectedGiftCardField = 'giftCardNumber';

        $scope.submitGiftCardPayment = function(cardNumber) {
            console.log('submitting giftcard payment: ', cardNumber);

            var payload = OrderService.createGiftCardPayment(cardNumber,$scope.giftCard.amount / 100);

            $rootScope.$broadcast('szeShowLoading');

            $rootScope.$broadcast('szeDismissError')
            OrderService.addGiftCardPayment($scope.order.id, payload)   //.then(OrderService.updateOrderStatus,logErrorStopLoading)
                .then(function(order) {
                    console.log('order updated gift card', order)
                    $rootScope.$broadcast('szeHideLoading');
                    // setTimeout($scope.printReciept,3000);
                }, logErrorStopLoading);
            
            $scope.giftCard = {
                'giftCardNumber': '',
                'amount': $scope.order.totalAmountDue * 100
            }
            $scope.selectedGiftCardField = 'giftCardNumber';
        };


        $scope.giftCardFieldFocused = function(field) {
            console.log('focused: ', field);
            $scope.selectedGiftCardField = field;
        }

        ////////// END GIFT CARD //////////

        ////////// CREDIT CARD MODAL //////////
        $scope.card = {
            'ccn':null,
            'expM':null,
            'expY':null,
            'cvv':null,
            'trackData':null,
            'ksn':null,
            'pinBlock':null,
            'amount':$scope.order.totalAmountDue
        }

        $scope.selectedCreditField = 'ccn'
        $scope.capturingPayment = false;

        $scope.creditFieldFocused = function(field) {
            console.log('focused')
            $scope.selectedCreditField = field;
        }

        $scope.submitCreditCardPayment = function() {
            console.log('card: ', $scope.card);
        
            var payload = OrderService.createCreditCardPayment($scope.card,$scope.card.amount);
            
            console.log('payload: ', payload);

            $rootScope.$broadcast('szeShowLoading');

            $rootScope.$broadcast('szeDismissError')
            OrderService.addCreditCardPayment($scope.order.id,payload)  //.then(OrderService.updateOrderStatus,logErrorStopLoading)
                .then(function(order) {
                    $rootScope.$broadcast('szeHideLoading');
                    // setTimeout($scope.printReciept,3000);
                }, logErrorStopLoading);

            $scope.card = {
                'cnn':'',
                'expM':'',
                'expY':'',
                'cvv':'',
                'amount':$scope.order.totalAmountDue * 100
            }
            $scope.selectedCreditField = 'ccn'
        };
        
        
        ////////// CREDIT CARD MODAL //////////

        ////////// CARD CAPTURE /////////

        $scope.kickOffPaymentProcess = function() {
            $rootScope.$broadcast('szeDismissError')
          console.log('capturing payment information from verifone');
          $scope.capturingPayment = true;
          var amountString = $filter('currency')($scope.card.amount);
          VerifoneService.startPayment(amountString,function(data) {
             
             console.log('payment capture compelte: ', data); 
             $scope.capturingPayment = false;
             $scope.processCardPresentPayment(data);
          }); 
        };
        
        $scope.processCardPresentPayment = function(data) {
            switch ( data.paymentType ) {
            case ( 'Credit Card' ):
                console.log('data in payment-controller: ', data);
                
                var paymentInfo = {};
                paymentInfo.trackData = '%' + data.track1Data + '?;' +data.track2Data + '?';
                var payload = OrderService.createCreditCardPayment(paymentInfo,$scope.card.amount);
                
                console.log('creditcard payload: ', payload);
                
                OrderService.addCreditCardPayment($scope.order.id,payload)
                    .then(function(order) {
                        VerifoneService.completePayment('Payment Accepted!', function() { return null; });
                    },function(err) {
                        logErrorStopLoading(err);
                        VerifoneService.completePayment('Failed To Process', function() { return null; });
                    });          
                break;
            case ( 'Gift Card' ):
                var track = data.track2Data;
                console.log('gift card track data: ', track);
                var number = track.split('=')[0].replace('603359','');
                console.log('giftcard numnber: ', number);
                
                var payload = OrderService.createGiftCardPayment(number,$scope.card.amount);

                //$rootScope.$broadcast('szeShowLoading');

                OrderService.addGiftCardPayment($scope.order.id, payload)   //.then(OrderService.updateOrderStatus, logErrorStopLoading)
                    .then(function(order) {
                        VerifoneService.completePayment('Payment Accepted!',function() { return null; });
                        //setTimeout($scope.printReciept,3000);     
                    }, function(err) {
                        logErrorStopLoading(err);
                        VerifoneService.completePayment('Failed To Process',function() { return null; });
                    }); 
                
                break;
            case ( 'Debit Card' ):
                console.log('data in payment-controller DEBIT: ', data);
                
                var paymentInfo = {}
                paymentInfo.trackData = '%' + data.track1Data + '?;' +data.track2Data + '?';
                var rawPinData = data.pinData.substring(5);
                paymentInfo.pinBlock = rawPinData.substring(rawPinData.length - 16);
                paymentInfo.ksn = rawPinData.substring(0,rawPinData.length - 16);
                
                var payload = OrderService.createCreditCardPayment(paymentInfo,$scope.card.amount);
                
                console.log('debit card payload: ', payload);
                
                OrderService.addCreditCardPayment($scope.order.id,payload)
                    .then(function(order) {
                        VerifoneService.completePayment('Payment Accepted!', function() { return null; });
                    },function(err) {
                        logErrorStopLoading(err);
                        VerifoneService.completePayment('Failed To Process', function() { return null; });
                    });          
                break;
            default: 
                setTimeout(function() {
                    VerifoneService.completePayment('Failed To Process',function() { return null; });
                },2000);
            }  
        };

        ////////// CARD CAPTURE /////////

        ////////// CHECK MODAL /////////
        $scope.check = {
            'checkNumber':'',
            'amount':$scope.order.totalAmountDue * 100
        };
        $scope.selectedCheckField = 'checkNumber';
        
        $scope.checkFieldFocused = function(field) {
            $scope.selectedCheckField = field
        };

        $scope.submitCheckPayment = function() {

            $scope.selectedCheckField = 'checkNumber';

            $rootScope.$broadcast('szeDismissError')
            $rootScope.$broadcast('szeShowLoading');
            var payload = OrderService.createCheckPayment($scope.check.amount / 100,$scope.check.checkNumber,$filter('date')(new Date(),'yyyy-MM-dd'));
            
            console.log('check payment: ', payload);
            
            OrderService.addCheckPayment($scope.order.id,payload)   //.then(OrderService.processOrder,logErrorStopLoading)
                .then(function(order) {
                    console.log('order updated check', order)
                    $rootScope.$broadcast('szeHideLoading');
                    // setTimeout($scope.printReciept,3000);
                }, logErrorStopLoading);
            
            $scope.check = {
                'checkNumber':'',
                'amount':$scope.order.totalAmountDue * 100
            }
            
        };

        ////////// END CHECK MODAL /////////

        ////////// Manager-auth modal //////////
            $scope.auth = {
                'managerId':'',
                'managerPin':''
            };

            $scope.selectedAuthField = 'managerId';
            $scope.checkFieldFocused = function(field) {
                $scope.selectedAuthField = field
            };

            $scope.authManager = function() {
                $scope.auth = {
                    'managerId':'',
                    'managerPin':''
                };
                $scope.selectedAuthField = 'managerId';


            };


            $scope.verifyManagerPin =function(){
                $rootScope.$broadcast('szeShowLoading');

                    var credentials = {
                    'username': $scope.auth.managerId,
                    'password': $scope.auth.managerPin
                };


                UserService.managerAuth($scope.auth.managerId,$scope.auth.managerPin)
                    .success(function (data) {
                        $rootScope.$broadcast('szeHideLoading');


                                if(data.role==='pos_mgr')
                                {
                                    //TODO:open the till


                                }else{
                                    $rootScope.$broadcast('szeError','Authentication fail,You are not authorized to approve no-sale.');
                                }

                    })
                    .error(function (error){
                        $rootScope.$broadcast('szeHideLoading');
                        $rootScope.$broadcast('szeError',error.message);
                    });


            };

        ////////// Manager-auth modal //////////


        ////////// COUPON MODAL //////////

        $scope.submitCouponCode = function(code) {
            console.log('code: ', code );

            $rootScope.$broadcast('szeShowLoading');
            OrderService.addOrderPromoCode($scope.order.id,code).then(function(result) {
               $rootScope.$broadcast('szeHideLoading'); 
            }, function(err) {
                $rootScope.$broadcast('szeHideLoading'); 
                $rootScope.$broadcast('szeError', 'Failed to Apply Coupon Code: ', err);
            });
        };

        ////////// END COUPON MODAL //////////


        ////////// NAV //////////

            $scope.attemptCompleteOrder = function(){
                //handle errors if not ready to complete
                $rootScope.$broadcast('szeDismissError')
                if(!WaiverStatus.allSigned()){
                    $rootScope.$broadcast('szeConfirm', {
                        title: 'Waivers Not Complete',
                        message: 'All waivers must be signed and approved before compeleting the order. Go to Jumpers screen now?',
                        confirm: {
                            label: 'Go to Jumpers',
                            action: function($clickEvent) {
                                NavService.goToRoute('jumpers', {
                                    'parkUrlSegment':Park.parkUrlSegment,
                                    'orderId':$scope.order.id,
                                    'guestId':$scope.guest.id
                                });
                            }
                        },
                        cancel: {
                            label: 'Stay Here',
                            action: function($clickEvent) {
                                return;

                            }
                        }
                    })
                }
                else if($scope.order.totalAmountDue > 0){
                    $rootScope.$broadcast('szeError', 'Payment required!')
                }
                else{
                    //handle order processing
                    if($scope.order.status === 'In Progress' || $scope.order.status === 'Reserved'){
                        OrderService.updateOrderStatus($scope.order)
                            .then($scope.printReciept, logErrorStopLoading)
                            .then($scope.printTicket, logErrorStopLoading)
                            .then($scope.goToStartScreen, logErrorStopLoading)
                    }
                    else{
                        $scope.goToStartScreen($scope.order);
                    }
                }
            };
            $scope.goToStartScreen = function(order){
                    if(order.paymentStatus === 'Fully Paid'){
                        //go to start
                        $location.path('/skypos/start/'+Park.parkUrlSegment);
                    }
                };

            $scope.goToOffersScreen = function(){
                NavService.goToRoute('offers', {
                    'parkUrlSegment':Park.parkUrlSegment,
                    'orderId':$scope.order.id,
                    'guestId':$scope.guest.id
                });
            };

        ////////// END NAV //////////

        ////////// NO SALE //////////

            $scope.showOtherReasonInput = false
            $scope.NOSalesReasons = [{id: 1, label: 'Storing Receipts/Coupons'}, {id: 2, label: 'Making Change'},{id: 3, label: 'Cashing Out'},{id:4,label:'Other - Needs Explanation'}];

            $scope.onOptionChange = function(reason) {
                if (reason.id == 4) {
                    $scope.showOtherReasonInput = true
                }
                else {
                    $scope.showOtherReasonInput = false
                }
            };

            $scope.noSale = function() {
                $scope.modelType = 'noSale';
                $scope.modelTitle='No Sale Reasons';
                $scope.showModal = !$scope.showModal;
                
               EpsonService.popDrawer();  
            };

            $scope.noSaleAvailable = function() {
                return ( $scope.order.orderItems.length < 0 ) || ( $scope.order.payments.length < 0 ) || $scope.status == 'Purchased' || $scope.status == 'Cancelled';
            };


            $scope.noSaleSubmit=function()
            {

            };

        ////////// END NO SALE //////////
	}]);
