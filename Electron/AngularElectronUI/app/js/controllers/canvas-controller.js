angular.module('MainApp').controller('CanvasController', ['$scope', 'WatcherTracker', function ($scope, WatcherTracker) {
  'use strict'

  class Matrix {
    constructor (x, y, rows, columns, width, height, thickness, color) {
      this.x = x
      this.y = y
      this.rows = rows
      this.columns = columns
      this.width = width
      this.height = height
      this.thickness = thickness
      this.color = color || 'rgba(0, 0, 0, 1.0)'
    }

    draw (ctx) {
      ctx.save()
      ctx.strokeStyle = this.color
      ctx.lineWidth = this.thickness
      let xPos
      let yPos
      for (let x = 0; x < this.rows; x += 1) {
        for (let y = 0; y < this.columns; y += 1) {
          xPos = this.x + x * this.width
          yPos = this.y + y * this.height
          ctx.strokeRect(xPos, yPos, this.width, this.height)
        }
      }
      ctx.restore()
    }

    clear (ctx) {
      ctx.clearRect(this.x,
        this.y,
        this.x + this.columns * this.width + this.thickness,
        this.y + this.rows * this.height + this.thickness)
    }
  }

  class Square {
    constructor (x, y, width, height, color, sX, sY) {
      this.x = x || 0
      this.y = y || 0
      this.rectangle = new Path2D()
      this.rectangle.rect(0, 0, width, height)
      this.color = color
      this.sX = sX || 0
      this.sY = sY || 0
    }

    draw (ctx) {
      ctx.save()
      ctx.fillStyle = this.color
      ctx.translate(this.x, this.y)
      ctx.fill(this.rectangle)
      ctx.restore()
    }

    updatePosition (xD, yD) {
      let oldX = this.x
      let oldY = this.y
      if (xD) {
        this.x += (Math.sign(xD - this.x)) * this.sX
          // We need to check if we just surpased the destination coordinate
        if (((oldX < xD) && (xD < this.x)) || ((this.x < xD) && (xD < oldX))) {
          this.x = oldX
        }
      }

      if (yD) {
        this.y += (Math.sign(yD - this.y)) * this.sY
        if (((oldY < yD) && (yD < this.y)) || ((this.y < yD) && (yD < oldY))) {
          this.y = oldY
        }
      }
      // console.log('(' + this.x + ', ' + this.y + ')')
      return (this.x !== oldX) || (this.y !== oldY)
    }
  }

  /* Had to add a timeout cause if two animations overlap would trigger -=> HELVETICA SCENARIO!!!*/
  function moveSquare (square, matrix, row, col, ctx, timeout) {
    let yD = (row) * matrix.width + matrix.thickness
    let xD = (col) * matrix.height + matrix.thickness
    let animFunc = () => {
      matrix.clear(ctx)
      matrix.draw(ctx)
      square.draw(ctx)
      if (square.updatePosition(xD, yD)) {
        // console.log(`row = ${row}, col = ${col}`)
        // console.log(`xD = ${(row - 1) * matrix.width + matrix.thickness}, yD = ${(col - 1) * matrix.height + matrix.thickness}`)
        window.requestAnimationFrame(animFunc)
      }
    }
    if (timeout) {
      setTimeout(() => {
        window.requestAnimationFrame(animFunc)
      }, timeout)
    } else {
      window.requestAnimationFrame(animFunc)
    }
  }

  function init () {
    // x, y, rows, columns, width, height, thickness, color) {
    $scope.matrix = new Matrix(0, 0, 5, 5, 30, 30, 1, 'rgba(0, 0, 0, 0.50)', 1)
    $scope.square = new Square(1, 1, 28, 28, 'rgba(200, 0, 0, 0.25)', 1, 1)

    $scope.matrix.draw(document.getElementById('canvas').getContext('2d'))
    $scope.square.draw(document.getElementById('canvas').getContext('2d'))
      //  moveSquare($scope.square, $scope.matrix, 4, 4, document.getElementById('canvas').getContext('2d'))
      //  moveSquare($scope.square, $scope.matrix, 0, 0, document.getElementById('canvas').getContext('2d'), 3000)

    /* We add a watcher to update the canvas image when the antenna position change.
    antennaPosition $scope property defined in the main controller. */

    // Instead of using 'currentPosition' in watch I can use a function. It's kind of better.
    /* This will be a persisten watcher. Won't be removed at stop. */
    WatcherTracker.registerWatcher(
      'canvasCtrl_antennaPosition',
      $scope,
      scope => scope.antennaPosition,
      (newValue, oldValue) => {
        if (newValue) {
          let canvas = document.getElementById('canvas')
          if (canvas.getContext) {
            let ctx = canvas.getContext('2d')
            moveSquare($scope.square, $scope.matrix, newValue.x, newValue.y, ctx)
          }
        }
      },
      true,
      true)
  }

  init()
}])
