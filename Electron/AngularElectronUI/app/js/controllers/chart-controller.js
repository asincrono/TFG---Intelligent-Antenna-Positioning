angular.module('MainApp')
  .controller('ChartController', ['$scope', 'WatcherTracker', function($scope, WatcherTracker) {
    'use strict'

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

    function genHTicks(rows, columns) {
      let hTicks = []
      let pairValFormat = positionTextGen(rows, columns)

      let pair = pairValFormat.next().value

      while (pair) {
        hTicks.push(pair)
        pair = pairValFormat.next().value
      }
      return hTicks
    }

    const CHART_OPTIONS = {
      title: 'Signal stats and bitrate for different antenna positions',

      //        width: 1150,
      //        height: 600,

      series: {
        1: {targetAxisIndex: 1},
        2: {targetAxisIndex: 2}
      },

      hAxis: {
        title: 'Positions',
        ticks: genHTicks($scope.rows, $scope.columns),
        viewWindow: {
          min: 0,
          max: 15
        }
      },

      vAxes: {
        0: {
          title: 'Level',
          minValue: -100,
          maxValue: -30
        },
        1: {
          title: 'Bitrate (Mbps)',
          minValue: 0,
          maxValue: 100,
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

    function drawChart(chart, data, options) {
      chart.draw(data, options)
    }

    function initChart() {

      data = new google.visualization.DataTable()

      data.addColumn({
        type: 'number',
        label: 'Position'
      })

      data.addColumn({
        type: 'number',
        label: 'Level'
      })

      data.addColumn({
        type: 'number',
        label: 'Bitrate'
      })

      chart = new google.visualization.LineChart(document.getElementById('linechart'))
      chart.draw(data, CHART_OPTIONS)
    }

    function updateChart(dataRow) {
      /* Update dataTable */
      data.addRow(dataRow)
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
          if (newValue) {
            if (chart) {
              console.log('(chartCtrl) $scope.netStats.bitrate.rx', $scope.netStats.bitrate.rx)
              updateChart([positionToNumber($scope.antennaPosition,
                $scope.rows, $scope.columns),
                newValue.level, newValue.bitrate.rx])
            }
          }
        },
        true,
        true
      )
    }
    init()
  }])
