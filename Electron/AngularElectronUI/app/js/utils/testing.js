'use strict'

const serialport = require('serialport')

const {
  execFile, spawn
} = require('child_process')

const CurlCMD = 'curl'
const CurlArgs = ['-s', '-u', 'tfg:tfg', '-o', '/dev/null', '-w "%{speed_download}"', 'ftp://192.168.0.1/TFG/rnd_file_10MB.data']

let reject = function (err) {
  console.log('rejecting')
  console.log(err)
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

let myFunc = function () {
  let love = false

  function setLove() {
    love = true
  }
  function getLove() {
    return love
  }
  function showLove() {
    console.log('love:', love)
  }
  return {
    setLove: setLove,
    getLove: getLove,
    showLove: showLove
  }
}

function getXFromPos(position, rows, columns) {
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


function outer() {
  let y = 0
  return setInterval(function () {
    console.log(y)
    y += 1
  }, 1000)
}

let inter = outer()

setTimeout(function () {
  clearInterval(inter)
}, 3500)
