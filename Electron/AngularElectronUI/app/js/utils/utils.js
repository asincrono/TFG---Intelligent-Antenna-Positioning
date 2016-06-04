'use strict'

const fs = require('fs')

const {execFile} = require('child_process')

class Position {
  constructor(x, y) {
    this.x = x ? x : 0
    this.y = y ? y : 0
  }

  set(x, y) {
    this.x = x
    this.y = y
  }

  setFromPosition(position) {
    this.x = position.x
    this.y = position.y
  }

  compare(position) {
    return (this.x === position.x && this.y === position.y)
  }

  /*
      rows = 3, cols = 4
      0,0 -> 0,1 (row 0)
      ...
      0,3 -> 1,0 ***
      1,0 -> 1,1 (row 1)
      ...
      1,3 -> 2,0 ***
      2,0 -> 2,1
      ...
      2,3 -> 3,0
      3,0 -> 3,1
      ...
      3,3 -> undefined
      */
  next(rows, cols) {
    if (rows === undefined || cols === undefined) {
      return false
    }

    let row = this.x
    let col = this.y

    if (row % 2 === 0) { // moving right
      col += 1
      if (col === cols) {
        col -= 1
        row += 1
        if (row === rows) {
          return undefined
        }
      }
    } else {
      col -= 1
      if (col < 0) {
        col += 1
        row += 1
        if (row === rows) {
          return undefined
        }
      }
    }
    this.x = row
    this.y = col
    return new Position(row, col)
  }

  setToNext(rows, cols) {
    if (rows === undefined || cols === undefined) {
      return false
    }
    let row = this.x
    let col = this.y

    if (row % 2 === 0) { // moving right
      col += 1
      if (col === cols) {
        col -= 1
        row += 1
        if (row === rows) {
          return false
        }
      }
    } else {
      col -= 1
      if (col < 0) {
        col += 1
        row += 1
        if (row === rows) {
          return false
        }
      }
    }
    this.x = row
    this.y = col
    return true
  }

  setCoords(x, y) {
    this.x = x
    this.y = y
  }

  random(xMin, xMax, yMin, yMax) {
    xMin = xMin ? xMin : 0
    xMax = xMax ? xMax : 100
    yMin = yMin ? yMin : 0
    yMax = yMax ? yMax : 100
    return new Position(rand(xMin, xMax), rand(yMin, yMax))
  }

  toString() {
    return `(${this.x}, ${this.y})`
  }
}

/* Antenna position is a position with stats */
class AntennaPosition extends Position {
  constructor(x, y, stats) {
    super(x, y)
    this.stats = stats
  }

  setStats(stats) {
    this.stats.level = stats.level
    this.stats.noise = stats.noise
  }

  toString() {
    return `${super.toString()}: ${this.stats.toString()}`
  }

  toDataRow() {
    return [super.toString(), this.stats.singal, this.stats.noise]
  }

  getPosition() {
    return new Position(this.x, this.y)
  }

  clone() {
    return new AntennaPosition(this.x, this.y, this.stats.level, this.stats.noise)
  }

  appendFile(file) {
    let data = `${new Date(this.stats.timeStamp).toLocaleString()}, ${this.x}, ${this.y}, ${this.stats.level}, ${this.stats.noise}\n`
    fs.appendFile(file, data, (err) => {
      if (err) {
        console.log('Error writing antenna position to file"', file, '"', err)
      }
    })
  }
}

function rTrim(str, char) {
  let re = new RegExp(`[${char}]+$`)
  return str.replace(re, '')
}

function lTrim(str, char) {
  let re = new RegExp(`^[${char}]+`)
  return str.replace(re, '')
}

function trimParenthesis(str) {
  return str.replace(/[\(\)]/g, '')
}

function leftPad(value, times, padChar) {
  return (padChar.repeat(times) + value).slice(-times)
}

function rightPad(value, times, padChar) {
  return (String(value) + padChar.repeat(times)).slice(0, times)
}

function rand(min, max) {
  min = min ? min : 0
  max = max ? max : 10

  return Math.floor(Math.random() * (max - min + 1) + min)
}

class Executor {
  constructor(cmd, args, cb) {
    this.cmd = cmd
    this.args = args
    this.cb = cb
    this.child = null
  }

  callback(err, stdout, stderr) {
    if (err) {
      console.log(err)
      if (this.cb) {
        this.cb(err)
      }
    } else if (stdout) {
        console.log(stdout)
        if (this.cb) {
          this.cb(null, stdout, stderr)
        }
        this.run()
      } else if (stderr) {
        this.cb(null, null, stderr)
      }
  }

  run() {
    this.child = execFile(this.cmd, this.args, this.callback.bind(this))
  }

  quit() {
    this.child.kill('SIGQUIT')
  }

  kill() {
    this.child.kill('SIGKILL')
  }
}

exports.leftPad = leftPad
exports.rightPad = rightPad
exports.lTrim = lTrim
exports.rTrim = rTrim
exports.trimParenthesis = trimParenthesis
exports.Executor = Executor
exports.Position = Position
exports.AntennaPosition = AntennaPosition
exports.rand = rand
