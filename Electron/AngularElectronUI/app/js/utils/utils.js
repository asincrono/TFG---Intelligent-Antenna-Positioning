'use strict'

const fs = require('fs')

const {execFile} = require('child_process')

class Matrix2D {
  constructor (x, y) {
    this.rows = x
    this.columns = y
    this.length = x + y
    this.data = new Array(x)
    for (let i = 0; i < y; i += 1) {
      this.data[i] = new Array(y)
    }
    this.default = null
  }

  get (x, y) {
    return this.data[x][y] || this.default
  }

  set (x, y, value) {
    if (x >= this.rows) {
      let msg = `The x coordinate was ${x}, the maximum valid value is ${this.rows}`
      throw new RangeError(msg)
    }
    if (y >= this.columns) {
      let msg = `The x coordinate was ${y}, the maximum valid value is ${this.columns}`
      throw new RangeError(msg)
    }
    this.data[x][y] = value
  }

  setDefault (value) {
    this.default = value
  }

  getMax () {
    if (this.length > 0) {
      let max = this.data[0][0] || this.default
      let value
      for (let i = 0; i < this.rows; i += 1) {
        for (let j = 1; j < this.columns; j += 1) {
          value = this.data[i][j] || this.default
          max = max >= value ? max : value
        }
      }
      return max
    } else {
      return null
    }
  }

  toString () {
    if (this.length > 0) {
      let mat = ''
      let line
      let value
      for (let i = 0; i < this.rows; i += 1) {
        line = '|'
        for (let j = 0; j < this.columns; j += 1) {
          value = (this.data[i][j] || this.default)
          line += ' ' + value + ' '
        }
        line += '|\n'
        mat += line
      }
      return mat
    } else {
      return `| |`
    }
  }
}

class Position {
  constructor (x, y) {
    this.x = x || 0
    this.y = y || 0
  }

  set (x, y) {
    this.x = x
    this.y = y
  }

  setFromPosition (position) {
    this.x = position.x
    this.y = position.y
  }

  compare (position) {
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
  /**
   * [next description]
   * @param  {[type]}   rows [description]
   * @param  {[type]}   cols [description]
   * @return {Function}      [description]
   */
  next (rows, cols) {
    if (rows === undefined || cols === undefined) {
      throw new Error('"rows" and "cols" must be numbers')
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

    return new Position(row, col)
  }

  setToNext (rows, cols) {
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

  setCoords (x, y) {
    this.x = x
    this.y = y
  }

  random (xMin, xMax, yMin, yMax) {
    xMin = xMin || 0
    xMax = xMax || 100
    yMin = yMin || 0
    yMax = yMax || 100
    return new Position(rand(xMin, xMax), rand(yMin, yMax))
  }

  toString () {
    return `(${this.x}, ${this.y})`
  }
}

/* Antenna position is a position with stats */
class AntennaPosition extends Position {
  constructor (x, y, stats) {
    super(x, y)
    this.stats = stats
  }

  setStats (stats) {
    this.stats.level = stats.level
    this.stats.noise = stats.noise
  }

  toString () {
    return `${super.toString()}: ${this.stats.toString()}`
  }

  toDataRow () {
    return [super.toString(), this.stats.singal, this.stats.noise]
  }

  getPosition () {
    return new Position(this.x, this.y)
  }

  clone () {
    return new AntennaPosition(this.x, this.y, this.stats.level, this.stats.noise)
  }

  appendFile (file) {
    let data = `${this.stats.timeStamp} ${this.x} ${this.y} ${this.stats.level} ${this.stats.bitrate.rx}\n`
    fs.appendFile(file, data, 'utf8', (err) => {
      if (err) {
        console.log('Error writing antenna position to file"', file, '"', err)
      }
    })
  }
}

function rTrim (str, char) {
  let re = new RegExp(`[${char}]+$`)
  return str.replace(re, '')
}

function lTrim (str, char) {
  let re = new RegExp(`^[${char}]+`)
  return str.replace(re, '')
}

function trimParenthesis (str) {
  return str.replace(/[\(\)]/g, '')
}

function leftPad (value, times, padChar) {
  return (padChar.repeat(times) + value).slice(-times)
}

function rightPad (value, times, padChar) {
  return (String(value) + padChar.repeat(times)).slice(0, times)
}

function rand (min, max) {
  min = min || 0
  max = max || 10

  return Math.floor(Math.random() * (max - min + 1) + min)
}

class Executor {
  constructor (cmd, args, cb) {
    this.cmd = cmd
    this.args = args
    this.cb = cb
    this.child = null
  }

  callback (err, stdout, stderr) {
    if (err) {
      if (this.cb) {
        this.cb(err)
      } else {
        throw err
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

  run () {
    this.child = execFile(this.cmd, this.args, this.callback.bind(this))
  }

  quit () {
    this.child.kill('SIGQUIT')
  }

  kill () {
    this.child.kill('SIGKILL')
  }
}

function cleanLine (line) {
  let values = lineToValues(line)
  return values.join(' ')
}

function lineToValues (line) {
  return line.split(/\s+/).filter(value => value.length > 0)
}

function truncDec (number, decimals) {
  let shift = Math.pow(10, decimals)
  return Math.trunc(number * shift) / (shift)
}

exports.Matrix2D = Matrix2D
exports.Executor = Executor
exports.Position = Position
exports.leftPad = leftPad
exports.rightPad = rightPad
exports.lTrim = lTrim
exports.rTrim = rTrim
exports.trimParenthesis = trimParenthesis
exports.AntennaPosition = AntennaPosition
exports.lineToValues = lineToValues
exports.cleanLine = cleanLine
exports.truncDec = truncDec
exports.rand = rand
