angular.module('MainApp').controller('ChartController', ['$scope', 'WatcherTracker', function ($scope, WatcherTracker) {
  let self = this

  self.clickFunction = function (row, index, series, options) {
    console.log('row:', row)
    console.log('index:', index)
    console.log('series:', series)
    console.log('options:', options)
  }

  function getXFromPos (position, rows, columns) {
    if (rows < 0 || columns < 0) {
      // throw new RangeError('Invalid parameter: rows and columns must bet positive')
      throw new RangeError(`Invalid parameter: ${ rows < 0 ? 'rows' : 'columns'}${ rows < 0 && columns < 0 ? ' and colmuns ' : ' '}must bet positive`)
    }

    let maxVal = rows * columns
    if (position >= maxVal) {
      throw new RangeError(`Invalid position: position should be < ${maxVal}`)
    }

    let x

    x = Math.trunc(position / columns)

    return x
  }

  function getYFromPos (position, rows, columns) {
    if (rows < 0 || columns < 0) {
      throw new RangeError(`Invalid parameter: ${rows < 0 ? 'rows' : 'columns'}${rows < 0 && columns < 0 ? ' and colmuns ' : ' '}must bet positive`)
    }

    let maxVal = rows * columns

    if (position >= maxVal) {
      throw new RangeError(`Invalid position: position should be < ${maxVal}`)
    }

    let y
    let row = Math.trunc(position / columns)
    let rem = position % columns
    let isEvenRow = row % 2 === 0
      // In even rows y moves from left to right, in odd rows from right to left.
    if (isEvenRow) {
      y = rem
    } else {
      y = columns - rem - 1
    }
    return y
  }

  function getTicks (rows, columns) {
    let ticks = []

    let limit = rows * columns
    for (let i = 0; i < limit; i += 1) {
      ticks.push(i)
    }

    return ticks
  }

  function tickFormatFunc (value, index) {
    return `(${getXFromPos(value, $scope.rows, $scope.columns)}, ${getYFromPos(value, $scope.rows, $scope.columns)})`
  }

  function appendData (position, level, bitrate) {
    $scope.data.signalStats.push({
      x: position,
      level: level,
      bitrate: bitrate
    })
  }

  function init () {
    $scope.options = {
      margin: {
        top: 5,
        bottom: 20
      },
      series: [{
        axis: 'y',
        dataset: 'signalStats',
        key: 'level',
        label: 'Signal level',
        color: '#FF5722',
        type: [
          'line', 'dot'
        ]
      }, {
        axis: 'y2',
        dataset: 'signalStats',
        key: 'bitrate',
        label: 'Bitrate (Mbps)',
        type: ['line', 'dot'],
        color: '#8BC34A'
      }],
      axes: {
        x: {
          key: 'x',
          ticks: getTicks($scope.rows, $scope.columns),
          tickFormat: tickFormatFunc,
          min: 0,
          max: 5,
          includeZero: true
        },
        y: {
          min: 0,
          max: 100
        },
        y2: {
          min: 0,
          max: -100
        }
      },
      pan: {
        x: true
      }
    }

    $scope.data = {
      signalStats: []
    }

    let position = 0

    WatcherTracker.registerWatcher(
      'chartWatcher',
      $scope,
      scope => scope.netStats,
      (newValue, oldValue) => {
        if (newValue) {
          appendData(position, newValue.level, newValue.bitrate.rx)
          position += 1
        }
      }
    )
  }

  init()
}])
