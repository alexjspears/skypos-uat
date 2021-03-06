/**
 * Created by dharmendrarajpurohit on 13/10/15.
 */
'use strict';

/**
 * @ngdoc function
 * @name skyZoneApp.directive:bigLoader
 * @description
 * # bigLoader
 * Directive of the skyZoneApp
 */

angular.module('skyZoneApp')
    .directive('jumperrow', ['$rootScope', 'VerifoneService', 'OrderService', 'WaiverService', 'UserService', 'WaiverStatus', 'AddOnStatus','ProfileService',
        function($rootScope, VerifoneService, OrderService, WaiverService, UserService, WaiverStatus, AddOnStatus, ProfileService) {

        return {
            restrict: 'EA',
            scope: {
                'jumper':'=',
                'park':'=',
                'order':'='
            },
            templateUrl: 'static/components/common/directives/jumperrow/jumperrow.html',
            replace: false,
            link: function($scope, $element) {


                $scope.$watch(function(scope) {
                    return scope.$parent.$parent.waiverInProgress;
                }, function(newValue,oldValue) {
                    console.log('value changed: ', newValue);
                    $scope.waiverInProgress = newValue;
                });

                function init() {
                    WaiverStatus.setStatus($scope.jumper.id, $scope.getWaiverStatus())
                    console.log('scope: ', $scope);
                }

                function logErrorStopLoading(err) {
                    $rootScope.$broadcast('szeHideLoading');
                    $rootScope.$broadcast('szeError', err);
                }
                $scope.disableClick = function(index, isYes, type) {
                    var jumper = $scope.jumper;
                    switch (type) {
                        case 'socks':
                            {
                                if (isYes == 1) {
                                    jumper.isSocksDisabled = false;
                                } else {
                                    jumper.isSocksDisabled = true;
                                }
                                break;
                            }
                        case 'hands':
                            {
                                if (isYes == 1) {
                                    jumper.isBandsDisabled = false;
                                } else {
                                    jumper.isBandsDisabled = true;
                                }
                            }
                    }

                }

                $scope.waiverInProgress = $scope.$parent.$parent.waiverInProgress;
                $scope.jumperWaiverInProgress = false;

                $scope.removeJumper = function(participantId) {
                    $rootScope.$broadcast('szeShowLoading');
                    var jumperId = angular.copy($scope.jumper.id);

                    OrderService.deleteOrderParticipant($scope.order.id, participantId).then(function(result) {
                        WaiverStatus.setStatus(jumperId, null);
                        console.log('jumperId: ', jumperId)
                        AddOnStatus.removeJumper(jumperId);
                        $rootScope.$broadcast('szeHideLoading');
                        $rootScope.$broadcast('szeOrderUpdated', result);
                        $scope.order = result;
                    }, logErrorStopLoading);

                }

                $scope.getAddOns = function() {
                    return AddOnStatus.getStatus();
                };

                $scope.onActiveWaiver = function() {

                }

                $scope.jumperStatus = function(one) {
                    return one;
                }

                $scope.getAge = function(birthday) {
                    var ageDifMs = Date.now() - new Date(birthday).getTime();
                    var ageDate = new Date(ageDifMs); // miliseconds from epoch
                    return Math.abs(ageDate.getUTCFullYear() - 1970);
                };

                $scope.waiver = null;

                $scope.getWaiverStatus = function() {
                    $scope.waiver = null;

                    // if ( $scope.$parent.$parent.signatureData != null && $scope.$parent.$parent.sigJumperId != null ) {
                    //     if ( $scope.$parent.$parent.sigJumperId == $scope.jumper.id ) {
                    //         return "Form Complete"
                    //     }
                    // }

                    if ( $scope.jumperWaiverInProgress == true ) {
                        return "In Progress";
                    }

                    if ($scope.waiver == null) {
                        // try and find waiver for park
                        for (var i in $scope.jumper.waivers) {
                            var w = $scope.jumper.waivers[i];
                            if (w.park.id == $scope.park.id) {
                                $scope.waiver = w;
                            }
                        }
                    }

                    if ($scope.waiver == null) {
                        return 'No Waiver';
                    } else {
                        var expirationDate = new Date();
                        var expirationDateStringArray = $scope.waiver.expirationDate.split('-');
                        expirationDate.setFullYear(expirationDateStringArray[0]);
                        expirationDate.setMonth(expirationDateStringArray[1]);
                        expirationDate.setDate(expirationDateStringArray[2]);
                        var now = new Date();
                        if (now > expirationDate) {
                            return 'Expired';
                        } else if (!$scope.waiver.approved) {
                            return 'Pending';
                        } else if ($scope.waiver.approved) {
                            return 'Approved';
                        } else {
                            return 'No Waiver';
                        }
                    }
                };


                $scope.showSignature = function() {
                    $scope.$parent.$parent.showWaiverModal();
                }

                //$scope.$parent.$parent.waiverInProgress = false;
                //$scope.showSignatureModal = false;
                $scope.kickOffWaiverProcess = function() {
                        //$scope.$parent.$parent.waiverInProgress = true;
                    console.log('Verifone! I choose you!');

                    var lDoc = $scope.$parent.$parent.waiver;
                    var jumperToSign = $scope.jumper;
                    if ( ProfileService.isMinor($scope.jumper) ) {
                        console.log('****user is minor****');
                        jumperToSign = $scope.$parent.$parent.guest;
                        console.log('jumper to sign: ', jumperToSign);
                    }
                    $scope.$parent.$parent.waiverInProgress = true;
                    $scope.waiverInProgress = true;
                    $scope.jumperWaiverInProgress = true;
                    var waiverError = function(err) {
                        console.log('ERR PUSHING WAIVER: ', err);
                        $scope.$parent.$parent.waiverInProgress = false;
                        $scope.waiverInProgress = false;
                        $scope.jumperWaiverInProgress = false;
                        if(!$scope.$$phase) {
                            $scope.$apply();
                        }
                    }

                    ProfileService.getProfile(jumperToSign.id).then(function(result) {
                        jumperToSign = result.data;
                        console.log('jumper to sign: ', jumperToSign);
                        VerifoneService.startWaiver(jumperToSign, lDoc, function(data) {
                            console.log('Verifone has won the battle!', data.signature);
                            setTimeout(function() {
                                VerifoneService.clearAndShowIdle()
                                if (!data.success) {
                                    $scope.$parent.$parent.waiverInProgress = false;
                                    $scope.waiverInProgress = false;
                                    $scope.jumperWaiverInProgress = false;
                                    if(!$scope.$$phase) {
                                        $scope.$apply();
                                    }
                                }
                            },2000)
                            if ( !data.success ) { return; }
                            var agreement = {
                                'primarySignature': "data:image/bmp;base64," + data.signature
                            };
                            $scope.hasSigImage = true;
                            //$scope.jumper.email = "agilbert+webtest@appirio.com";
                            //$scope.jumper.gender = "Male";
                            WaiverService.createWaiver(lDoc.id, $scope.park.id, [jumperToSign],jumperToSign.minors, agreement).then(function(result) {
                                WaiverStatus.setStatus(jumperToSign.id, $scope.getWaiverStatus())
                                console.log('waiverSigned: ', result);
                                //$scope.$parent.$parent.sigRecieved(data.signature,result.data.waivers[0],$scope.jumper.id);
                                // if ( $scope.jumper.id == result.data.id) {
                                //     $scope.jumper = result.data;
                                // } else {
                                //     angular.forEach(result.data.minor,function(minor) {
                                //         if (minor.id == $scope.jumper.id) {
                                //             $scope.jumper = minor;
                                //         }
                                //     })
                                // }
                                OrderService.getOrder($rootScope.order.id).then(function(order) {
                                    console.log('participants', order.participants);
                                    angular.forEach(order.participants, function(participant, index){
                                        angular.forEach(participant.waivers, function(waiver) {
                                            if ( waiver.park.id == $scope.park.id ) {
                                                WaiverStatus.setStatusFromWaiver(participant.id,waiver);
                                            }
                                        });
                                        if(participant.id === $scope.jumper.id){
                                         $scope.jumper = participant;
                                        // WaiverStatus.setStatus($scope.jumper.id, $scope.getWaiverStatus())
                                        }
                                    })

                                    ProfileService.getCustomerInformation($scope.$parent.$parent.guest.id).then(function(result) {
                                        console.log('get profile after waiver result: ', result);
                                        $scope.$parent.$parent.guest = result.data;
                                        $scope.$parent.$parent.waiverInProgress = false;
                                        $scope.waiverInProgress = false;
                                        $scope.jumperWaiverInProgress = false;
                                        $scope.signatureData = "data:image/bmp;base64," + data.signature;
                                        $scope.getWaiverStatus();
                                        if(!$scope.$$phase) {
                                            $scope.$apply();
                                        }
                                    }, waiverError);
                                }, waiverError);
                            }, waiverError)
                        }, waiverError)

                    });
                };

                $scope.showApprovalModal = false;
                $scope.signatureData = "";
                $scope.hasSigImage = false;
                $scope.activeWaiverCustomer = null;
                $scope.toggleApprovalModal = function() {
                    $scope.showApprovalModal = !$scope.showApprovalModal;
                    if ( ProfileService.isMinor($scope.jumper)) {
                        $scope.activeWaiverCustomer = $scope.$parent.$parent.guest;
                    } else {
                        $scope.activeWaiverCustomer = $scope.jumper;
                    }
                    console.log('approval modal toggled: ', $scope.showApprovalModal);
                }

                $scope.approveWaiver = function() {
                    // UserService.getCurrentUser().then(function(user){
                        console.log('scope.waiver: ',$scope.waiver);
                        var waiverids = [$scope.waiver.id];
                        if ( $scope.waiver.parentWaivier != null ) {
                            waiverids = [$scope.waiver.parentWaivier.id];
                        }
                        console.log('waiverIds: ', waiverids);
                        UserService.getCurrentUser().then(function(result) {
                            WaiverService.approveWaivers(result.id, waiverids).then(function(result) {
                                //$scope.jumper = result.data;
                                WaiverStatus.setStatus($scope.jumper.id, 'Approved')
                                OrderService.getOrderParticipantsProfiles($rootScope.order).then(function(participants) {
                                    angular.forEach(participants, function(participant, index){
                                      angular.forEach(participant.waivers,function(waiver) {
                                        if ( waiver.parkId == $scope.park.id ) {
                                          WaiverStatus.setStatusFromWaiver(participant.id,waiver);
                                        }
                                      });
                                        if(participant.id === $scope.jumper.id){
                                            $scope.jumper = participant;
                                        }
                                    });

                                    $rootScope.$broadcast('participantsUpdated', {
                                        'data': participants
                                    });
                                }, logErrorStopLoading);
                            },logErrorStopLoading)
                        },logErrorStopLoading)
                    // }, logErrorStopLoading)
                };

                $scope.onInActiveWaiver = function() {
                    console.log($scope);
                    console.log('***WAIVER: ', $scope.$parent.$parent.waiver);
                    VerifoneService.startWaiver($scope.$parent.$parent.guest, $scope.$parent.$parent.waiver, function(success) {
                        console.log("SUCCESS: ", success);
                        $scope.jumper.waiverStatus = success;
                        // WaiverStatus.setStatus($scope.jumper.id, $scope.getWaiverStatus())
                        WaiverStatus.setStatus($scope.jumper.id, 'Pending')
                        if (!$rootScope.$$phase) {
                            $rootScope.$digest();
                        }
                    }, logErrorStopLoading);
                    // .then(function(result){
                    //     jumper.waiverStatus = true;
                    // }, function(err){
                    //     jumper.waiverStatus = false;
                    // })
                };

                init();

            }
        };
    }]);
