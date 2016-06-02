'use strict'

const DARWIN_AIRPORT_CMD = '/System/Library/PrivateFrameworks/Apple80211.\
framework/Versions/Current/Resources/airport -I'

const DARWIN_NETSTAT_CMD = 'netstat'
const LINUX_CAT_STATS_ARGS = ['/proc/net/wireless']
const LINUX_CAT_CMD = 'cat'
const LINUX_CAT_RXTX_ARGS = ['/proc/net/dev']
const LINUX_PROC_PATH = ''
  // const LINUX_NMCLI_CMD = 'nmcli'
  // const LINUX_NMCLI_DEV_ARGS = ['-f', 'DEVICE','con', 'show', '-a']
const WINDOWS_NETSH_CMD = ''
const WINDOWS_NETSH_ARGS = ''

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
    return new Postion(Utils.rand(xMin, xMax), Utils.rand(yMin, yMax))
  }

  toString() {
    return `(${this.x}, ${this.y})`
  }
}

class NetStats {
  constructor(signal, noise, tx, rx) {
    this.signal = signal
    this.noise = noise
    this.bitrate = {
      tx,
      rx
    }
    this.timeStamp = Date.now()
  }

  updateStats(stats) {
    this.signal = stats.signal
    this.noise = stats.noise
    this.bitrate = stats.bitrate
    this.timeStamp = Date.now()
  }
}

/* Antenna position is a position with stats */
class AntennaPosition extends Position {
  constructor(x, y, stats) {
    super(x, y)
    this.stats = stats
  }

  setStats(stats) {
    this.stats.signal = stats.signal
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
    return new AntennaPosition(this.x, this.y, this.stats.signal, this.stats.noise)
  }

  appendFile(file) {
    let data = `${new Date(this.stats.timeStamp).toLocaleString()}, ${this.x}, ${this.y}, ${this.stats.signal}, ${this.stats.noise}\n`
    fs.appendFile(file, data, (err) => {
      if (err) {
        console.log('Error writing antenna position to file"', file, '"', err)
      }
    })
  }
}

function parseLinux(data) {
  let line = data.split('\n')[2]
  let values = line.split(/\s+/)
  let signal = parseInt(rTrim(values[3], '.'))
  let noise = parseInt(rTrim(values[4], '.'))
  return new NetStats(signal, noise)
}

function parseDarwin(data) {
  let signal = parseInt(data.match(/agrCtlRSSI: (\-\d+)/)[1])
  let noise = parseInt(data.match(/agrCtlNoise: (\-\d+)/)[1])
  return new NetStats(signal, noise)
}

function getNetStats(callback) {
  switch (os.platform()) {
    case 'darwin':
      {
        exec(DARWIN_AIRPORT_CMD, (err, stdout, stderr) => {
          if (err) {
            console.log(err, stderr)
          } else {
            callback(parseDarwin(stdout))
          }
        })
      }
      break
    case 'linux':
      {
        execFile(LINUX_CAT_CMD, LINUX_CAT_STATS_ARGS, (err, stdout, stderr) => {
          if (err) {
            console.log(err, stderr)
          } else {
            callback(parseLinux(stdout))
          }
        })
      }
      break
  }
}

function listIfaces() {
  let ifaces = os.networkInterfaces()
  let ifNames = []
  for (let ifName in ifaces) {
    ifNames.push(ifName)
  }
  return ifNames
}

function rTrim(str, char) {
  let re = new RegExp(`[${char}]+$`)
  return str.replace(re, '')
}

function lTrim(str, char) {
  let re = new RegExp(`^[${char}]+`)
  return str.replace(re, '')
}

function testLs(callback) {
  exec('ls', ['-la', '/'], (err, stdout, stderr) => {
    if (err != null) {
      callback(null)
    } else {
      callback(stdout.toString())
    }
  })
}

function trimParenthesis(str) {
  return str.replace(/[\(\)]/g, '')
}

function decCoordToPercent(x, slices) {
  if (x == 0) {
    return 0
  }
  if (x > slices) {
    return undefined
  }
  let xStep = Math.floor(100 / slices)
  return x * xStep
}

function percentCoordToDec(x, tol, steps) {
  let step = 100 / (steps - 1)
  let position = 0
  for (let i = 0; i < steps; i += 1) {
    position = i * step
    if (Math.abs(position - x) <= tol) {
      return i
    } else if (x < position) {
      throw new RangeError(`${x} isn't valid (tolerance: ${tol} nearest position: ${position}`)
    }
  }
  return undefined
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

function getReceiveTransmitStats(device, callback) {
  execFile(LINUX_CAT_CMD, LINUX_CAT_RXTX_ARGS, (err, stdout, stderr) => {
    let timestap = Date.now()
    if (err) {
      callback(err)
    } else {
      let lines = stdout.split('\n')
      let line = lines.filter((line) => {
        return line.includes(device)
      })[0]
      if (line) {
        let values = line.slice(1).split(' ')

        let receive = {
          bytes: parseInt(values[1]),
          packets: parseInt(values[2]),
          errs: parseInt(values[3]),
          drop: parseInt(values[4])
        }

        let transmit = {
          bytes: parseInt(values[9]),
          packets: parseInt(values[10]),
          errs: parseInt(values[11]),
          drop: parseInt(values[12])
        }
        callback(null, receive, transmit, timestap)
      } else {
        callback(new Error(`Device "${device}" not found.`))
      }
    }
  })
}

/*
Callback will recive err, bytes readed byt the device and the timestap for that
read.
*/
function getRx(device, callback) {
  execFile(LINUX_CAT_CMD, LINUX_CAT_RXTX_ARGS, (err, stdout, stderr) => {
    let timestap = Date.now()
    if (err) {
      callback(err)
    } else {
      let lines = stdout.split('\n')
      let line = lines.filter((line) => {
        return line.includes(device)
      })[0]
      if (line) {
        let values = line.replace(/\s+/g, ' ').slice(1).split(' ')
        let rx = parseInt(values[1])
        callback(null, rx, timestap)
      } else {
        callback(new Error(`Device "${device}" not found.`))
      }
    }
  })
}

class Executor {
  constructor(cmd, args) {
    this.cmd = cmd
    this.args = args
    let obj = this

    let callback = function (err, stdout, stderr) {
      if (err) {
        console.log(err)
      } else {
        if (stdout) {
          console.log(stdout)
          obj.child = execFile(cmd, args, callback)
        }
        if (stderr) {
          console.log(stderr)
        }
      }
    }

    this.child = execFile(cmd, args, callback)
  }

  quit() {
    this.child.kill('SIGQUIT')
  }

  kill() {
    this.child.kill('SIGKILL')
  }
}

/* Comment
getNetInfo('en1', netStat => {
  console.log('Result : %s', netStat.toString())
})
*/
exports.Executor = Executor
exports.Position = Position
exports.AntennaPosition = AntennaPosition
exports.NetStats = NetStats
exports.listIfaces = listIfaces
exports.testLs = testLs
exports.getNetStats = getNetStats
exports.getReceiveTransmitStats = getReceiveTransmitStats
exports.getRx = getRx
exports.trimParenthesis = trimParenthesis
exports.decCoordToPercent = decCoordToPercent
exports.percentCoordToDec = percentCoordToDec
exports.leftPad = leftPad
exports.rightPad = rightPad
exports.rand = rand
