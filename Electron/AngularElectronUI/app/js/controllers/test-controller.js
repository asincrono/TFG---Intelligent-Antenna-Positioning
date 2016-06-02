'use strict'
angular.module('TestApp').controller('TestController', ['$scope', function($scope) {
  const serialport = require('serialport')
  serialport.list((err, ports) => {
    let a
    console.log('err:', err)
    console.log('ports:', ports)
    console.log(ports[0].manufacturer === undefined)
    console.log(a === undefined)
  })

}])
