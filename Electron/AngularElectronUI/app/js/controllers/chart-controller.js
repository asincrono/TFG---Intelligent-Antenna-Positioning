angular.module('MainApp')
  .controller('ChartController', ['$scope', 'WatcherTracker', function($scope, WatcherTracker) {
    'use strict'

    function genHticks(rows, columns) {
      let hticks = []
      let pairValFormat = positionTextGen(rows, columns)
      let hTicks = []
      let pair = pairValFormat.next().value

      while (pair) {
        hTicks.push(pair)
        pair = pairValFormat.next().value
      }
      return hticks
    }

    const CHART_OPTIONS = {
      title: 'Signal stats for different antenna positions',

      //        width: 1150,
      //        height: 600,

      series: {
        0: {targetAxisIndex: 0},
        1: {targetAxisIndex: 1}
      },
      hAxis: {
        ticks: genHticks($scope.rows, $scope.columns),
        title: 'Positions',
        viewWindow: {
          min: 0,
          max: 15
        }
      },

      vAxes: {
        0: {
          title: 'Level',
          minValue: -100,
          maxValue: 0
        },
        1: {
          title: 'Bitrate (Mbps)',
          minValue: 0,
          maxValue: 450,
        }
      },

      animation: {
        startup: true,
        duration: 750,
        easing: 'out'
      },

      legend: {
        position: 'bottom'
      },

      explorer: {
        axis: 'horizontal',
        actions: [
          'dragToPan'
        ]
      },
      theme: 'material'
    }

    let chart
    let data
    let position
    let rowPos

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
        yield({
          v: position,
          f: `${x}, ${y}`
        })

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

    function drawChart(chart, data, options) {
      console.log('data:', data)
      chart.draw(data, options)
    }

    function initChart() {

      data = new google.visualization.DataTable()

      //data.addColumn('string', 'Position')
      data.addColumn('number', 'Position')
      data.addColumn('number', 'Level', 'level')
      data.addColumn('number', 'Bitrate', 'bitrate')

      chart = new google.visualization.LineChart(document.getElementById('linechart'))
        //      let chart = new google.charts.Line(document.getElementById('linechart'))

      //      chart.draw(data, google.charts.Line.convertOptions(options))
      console.log('data:', data)
      chart.draw(chart, data, CHART_OPTIONS)
    }

    function updateChart(dataRow) {
      /* Update dataTable */
      //$scope.currentPosition = getNextPosition($scope.currentPosition)
      //$scope.netStat = new NetStat($scope.currentPosition, rand(0, 100), rand(0, 100), rand(0, 100))
      //$scope.data.addRow($scope.netStat.toDataRow())

      data.addRow(dataRow)

      //      if ($scope.position >= 14) {
      //        $scope.options.hAxis.viewWindow.min += 1
      //        $scope.options.hAxis.viewWindow.max += 1
      //      } else {
      //        $scope.position += 1
      //      }
      drawChart(chart, data, CHART_OPTIONS)
    }

    function reset() {
      rowPos = 0
      position = 0

      data = new google.visualization.DataTable()
      data.addColumn('number', 'Position')
      data.addColumn('number', 'Level', 'level')
      data.addColumn('number', 'Bitrate', 'bitrate')

      new google.visualization.LineChart(document.getElementById('linechart'))
    }

    function init() {
      rowPos = 0
      position = 0

      google.charts.load('current', {
        'packages': ['corechart']
      })

      google.charts.setOnLoadCallback(initChart)

      // Setting up a persisten watcher.
      /* A persisten watcher is one that won't be removed if you start the app
      again (start isn't the same as reload or restart)
      Watchers in init usually are persistent */
      WatcherTracker.registerWatcher($scope,
        (scope) => {
          return scope.netStats
        },
        (newValue, oldValue) => {
          console.log('I know that stats changed.')
          console.log('Stats:', newValue)
          if (newValue) {
            if (chart) {
              console.log('AntennaPosition(graphCtrl)', $scope.antennaPosition)
              console.log('pos:', $scope.antennaPosition, 'number:', positionToNumber($scope.antennaPosition, $scope.rows))
              updateChart([positionToNumber($scope.antennaPosition, $scope.rows, $scope.columns), newValue.level, newValue.bitrate.rx])
            }
          }
        },
        true,
        true
      )
    }
    init()
  }])
