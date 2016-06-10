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

    function init() {
      const Chart = require('chart.js')

      let levelCtx = getElementById('levelChart')
      let bitrateCtx = getElementById('bitrateChart')

      let levelOptions = {}
      let levelData = {}

      let levelChart = new Chart(levelCtx, {
        type: 'line',
        options: levelOptions,
        data: levelData
      })

    }

    init()
  }])
