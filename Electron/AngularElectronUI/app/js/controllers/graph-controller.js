'use strict'

angular.module('MainApp')
  .controller('GraphController', ['$scope', function ($scope) {

    function positionToNumber(position, rows, columns) {
      let left = position.x % 2
      if (left) {
        return position.x * rows + (columns - position.y - 1)
      } else {
        return position.x * rows + position.y
      }
    }

    /* Generator to generate objects with the pair value, format for the
    hAxis ticks values.*/
    function* positionTextGen(rows, columns) {
      let limit = rows * columns
      let position = 0
      let x = 0
      let y = 0
      while (position < limit) {
        yield {
          v: position,
          f: `${x}, ${y}`
        }

        if (x % 2 === 0) {
          y += 1
          if (y === columns) {
            y -= 1
            x += 1
          }
        } else {
          y -= 1
          if (y === -1) {
            y += 1
            x += 1
          }
        }
        position += 1
      }
    }

    function drawGraph() {
      $scope.chart.draw($scope.data, $scope.options)
    }

    function initChart() {

      //      let options = {
      //        legend: {
      //          position: 'bottom'
      //        },
      //
      //        explorer: {
      //          actions: 'dragToPan'
      //          , axis: 'horizontal'
      //        },
      //
      //        title: 'Signal stats for different antenna positions'
      //        , subtitle: 'Hey',
      //
      //        //        width: 1150,
      //        //        height: 600,
      //        hAxis: {
      //          viewWindow: {
      //            min: 0
      //            , max: 15
      //          }
      //        }
      //        , vAxis: {
      //          minValue: -100
      //          , maxValue: 0
      //        }
      //        , animation: {
      //          startup: true
      //          , duration: 750
      //          , easing: 'out'
      //        }
      //        , theme: 'material'
      //      }

      let pairValFormat = positionTextGen($scope.rows, $scope.columns)
      let hTicks = []
      let pair = pairValFormat.next().value

      while(pair) {
        hTicks.push(pair)
        pair = pairValFormat.next().value
      }

      let options = {
        legend: {
          position: 'bottom'
        },

        explorer: {
          axis: 'horizontal',
          actions: [
            'dragToPan'
          ]
        },

        title: 'Signal stats for different antenna positions',

        //        width: 1150,
        //        height: 600,
        hAxis: {
          ticks: hTicks,
          title: 'Positions',
          viewWindow: {
            min: 0,
            max: 15
          }
        },
        vAxis: {
          minValue: -100,
          maxValue: 0
        },
        animation: {
          startup: true,
          duration: 750,
          easing: 'out'
        },
        theme: 'material'
      }

      $scope.options = options

      let data = new google.visualization.DataTable()
      $scope.data = data

      //data.addColumn('string', 'Position')
      data.addColumn('number', 'Position')
      data.addColumn('number', 'Signal', 'signal')
      data.addColumn('number', 'Noise', 'noise')

      let chart = new google.visualization.LineChart(document.getElementById('linechart'))
        //      let chart = new google.charts.Line(document.getElementById('linechart'))
      $scope.chart = chart

      //      chart.draw(data, google.charts.Line.convertOptions(options))
      chart.draw(data, options)
    }

    function updateGraph(dataRow) {
      /* Update dataTable */
      //$scope.currentPosition = getNextPosition($scope.currentPosition)
      //$scope.netStat = new NetStat($scope.currentPosition, rand(0, 100), rand(0, 100), rand(0, 100))
      //$scope.data.addRow($scope.netStat.toDataRow())

      $scope.data.addRow(dataRow)

//      if ($scope.position >= 14) {
//        $scope.options.hAxis.viewWindow.min += 1
//        $scope.options.hAxis.viewWindow.max += 1
//      } else {
//        $scope.position += 1
//      }
      drawGraph()
    }

    function reset() {
      $scope.rowPos = 0
      $scope.position = 0

      $scope.data = new google.visualization.DataTable()
      $scope.data.addColumn('number', 'Position')
      $scope.data.addColumn('number', 'Signal', 'signal')
      $scope.data.addColumn('number', 'Noise', 'noise')

      new google.visualization.LineChart(document.getElementById('linechart'))
    }

    function init() {
      $scope.rowPos = 0

      $scope.position = 0

      google.charts.load('current', {
        'packages': ['corechart']
      })

      google.charts.setOnLoadCallback(initChart)

      let registrateWatcher = function () {
        return $scope.$watch((scope) => {
          return scope.netStats
        }, (newValue, oldValue) => {
          console.log('I know that stats changed.')
          console.log('Stats:', newValue)
          if (newValue) {
            if ($scope.chart) {
              console.log('AntennaPosition(graphCtrl)', $scope.antennaPosition)
              //updateGraph([$scope.antennaPosition.toString(), newValue.signal, newValue.noise])
              console.log('pos:', $scope.antennaPosition, 'number:', positionToNumber($scope.antennaPosition, $scope.rows))
              updateGraph([positionToNumber($scope.antennaPosition, $scope.rows, $scope.columns), newValue.signal, newValue.noise])
            }
          }
        }, true)
      }

      let deregistrateWatcher = registrateWatcher()
      $scope.deregistrationList.push(deregistrateWatcher)
      $scope.registrationList.push(registrateWatcher)
    }
    init()
}])
