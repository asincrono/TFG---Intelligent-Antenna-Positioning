'use strict'

const serialport = require('serialport')

const {
  execFile, spawn
} = require('child_process')

const CurlCMD = 'curl'
const CurlArgs = ['-s', '-u', 'tfg:tfg', '-o', '/dev/null', '-w "%{speed_download}"', 'ftp://192.168.0.1/TFG/rnd_file_10MB.data']

function spawnTest() {
  curl.on('error', (err) => {
    console.log(err)
  })

  curl.stdout.on('data', (data) => {
    console.log('stdout:\n', data.toString())
  })

  curl.stderr.on('data', (data) => {
    console.log('stderr:\n', data.toString())
  })
}

class BreakPromise extends Promise {
  constructor(f) {
    super(f)
    this.break = false
  }

  setBreak() {
    this.break = true
  }
}

let resolve = function (stdout, stderr) {
  console.log('resolving')
  console.log('stdout:', stdout, 'stderr:', stderr)
  if (stdout) {
    console.log('stdout:\n', stdout)
    if (!curlProm.break) {
      console.log('repeating')
      curlProm.then(resolve, reject)
    }
  }
  if (stderr) {
    console.log('stderr:\n', stderr)
  }
}

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

serialport.list((err, portList) => {
  if (err) {
    console.log('Aquí también falla.')
  } else {
    console.log(portList)
    if (portList) {
      portList.forEach((port, idx, arr) => {
        if (port.manufacturer) {
          console.log(port.manufacturer)
          console.log(process.version)
        }
      })
    }
  }
})