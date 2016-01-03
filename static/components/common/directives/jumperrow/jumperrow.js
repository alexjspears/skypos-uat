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
    .directive('jumperrow', ['$rootScope', 'VerifoneService', 'OrderService', 'WaiverService', 'UserService', 'WaiverStatus', 'AddOnStatus', 
        function($rootScope, VerifoneService, OrderService, WaiverService, UserService, WaiverStatus, AddOnStatus) {

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

                $scope.removeJumper = function(participantId) {
                    $rootScope.$broadcast('szeShowLoading');
                    var jumperId = angular.copy($scope.jumper.id);

                    OrderService.deleteOrderParticipant($scope.order.id, participantId).then(function(result) {
                        WaiverStatus.setStatus(jumperId, null);
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

                    if ($scope.waiverInProgress) {
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
                    $scope.waiverInProgress = false
                        //$scope.$parent.$parent.waiverInProgress = true;
                    console.log('Verifone! I choose you!');

                    var lDoc = $scope.$parent.$parent.waiver;
                    $scope.waiverInProgress = false;
                    VerifoneService.startWaiver($scope.jumper, lDoc, function(data) {
                        console.log('Verifone has won the battle!', data.signature);
                        setTimeout(VerifoneService.clearAndShowIdle, 3000);
                        if (!data.success) {
                            $scope.waiverInProgress = false;
                            return;
                        };
                        var agreement = {
                            'primarySignature': "AG the boss"
                        };
                        $scope.hasSigImage = true;
                        //$scope.jumper.email = "agilbert+webtest@appirio.com";
                        $scope.jumper.gender = "Male";
                        WaiverService.createWaiver(lDoc.id, $scope.park.id, [$scope.jumper], $scope.jumper.minors, agreement).then(function(result) {
                            WaiverStatus.setStatus($scope.jumper.id, $scope.getWaiverStatus())
                            console.log('waiverSigned: ', result);
                            //$scope.$parent.$parent.sigRecieved(data.signature,result.data.waivers[0],$scope.jumper.id);
                            $scope.jumper = result.data;
                            $scope.waiverInProgress = false;
                            $scope.signatureData = "data:image/bmp;base64," + data.signature;
                        }, function(err) {
                            console.log('ERR PUSHING WAIVER: ', err);
                        })
                    });
                };

                $scope.showApprovalModal = false;
                $scope.signatureData = "";
                $scope.hasSigImage = false;
                $scope.toggleApprovalModal = function() {
                    $scope.showApprovalModal = !$scope.showApprovalModal;
                    console.log('approval modal toggled: ', $scope.showApprovalModal);
                }

                $scope.approveWaiver = function() {
                    // UserService.getCurrentUser().then(function(user){
                        WaiverService.approveWaivers(50, [$scope.waiver.id]).then(function(result) {
                            console.log('approval response: ', result);
                            //$scope.jumper = result.data;
                            WaiverStatus.setStatus($scope.jumper.id, 'Approved')
                            OrderService.getOrderParticipantsProfiles($rootScope.order).then(function(participants) {
                                console.log('participants', participants);
                                angular.forEach(participants.data, function(participant, index){
                                    if(participant.id === $scope.jumper.id){
                                        $scope.jumper = participant;
                                        // WaiverStatus.setStatus($scope.jumper.id, $scope.getWaiverStatus())
                                    }
                                });

                                $rootScope.$broadcast('participantsUpdated', {
                                    'data': participants
                                });
                            }, logErrorStopLoading);
                        }, function(err) {
                            console.log('approval err: ', err);

                        })
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
