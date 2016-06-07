angular.module('MainApp')
  .factory('NetInfo', function NetInfoFactory() {
    const {rTrim} = require('./js/utils/utils.js')
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

    const {execFile} = require('child_process')

    class NetStats {
      constructor(level, noise, rx, tx) {
        this.level = level
        this.noise = noise
        this.bitrate = {
          rx,
          tx
        }
        this.timeStamp = Date.now()
      }

      updateStats(stats) {
        this.level = stats.level
        this.noise = stats.noise
        this.bitrate = stats.bitrate
        this.timeStamp = Date.now()
      }
    }

    class RxStamp {
      constructor(bytes, timestamp) {
        this.bytes = bytes
        this.timestamp = timestamp
      }

      getBitrate(rxStamp) {
        let byteDiff = Math.abs(this.bytes - rxStamp.bytes)
        // Time should be in seconds.
        let timeDiff = Math.abs(this.timestamp - rxStamp.timestamp) / 1000
        return Math.trunc(byteDiff / timeDiff)
      }

      update(bytes, timestamp) {
        this.bytes = bytes
        this.timestamp = timestamp
      }
    }

    let rxStamp = null

    // Since the last invocation
    function checkRxBitrate(device, callback) {
      getRx(device, (err, bytes, timestamp) => {
        if (err) {
          callback(err)
        } else {
          let newRxStamp = new RxStamp(bytes, timestamp)

          // First invocation will return always null.
          let bitrate = null
          if (rxStamp) {
            let bitrate = rxStamp.getBitrate(newRxStamp)
            rxStamp.update()
          } else {
            rxStamp.update(bytes, timestamp)
          }
          if (callback) {
            callback(null, bitrate)
          }
        }
      })
    }

    function parseLinux(device, data) {
      let lines = data.split('\n')

      let line = lines.filter((line) => {
        return line.includes(device)
      })[0]

      if (line) {
        let values = line.split(/\s+/)
        if (values[0] === '') {
          values.splice(0, 1)
        }
        let level = parseInt(rTrim(values[3], '.'))
        let noise = parseInt(rTrim(values[4], '.'))
        return new NetStats(level, noise)
      } else {
        throw new Error(`Device "${device}" not found.`)
      }
    }

    function parseDarwin(data) {
      let level = parseInt(data.match(/agrCtlRSSI: (\-\d+)/)[1])
      let noise = parseInt(data.match(/agrCtlNoise: (\-\d+)/)[1])
      return new NetStats(level, noise)
    }

    function getNetStats(device, callback) {
      switch (os.platform()) {
        case 'darwin':
          {
            execFile(DARWIN_AIRPORT_CMD, (err, stdout, stderr) => {
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
                callback(parseLinux(device, stdout))
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

    function getRxTxStats(device, callback) {
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
            let values = line.split(/\s+/)
            if (values[0] === '') {
              values.splice(0, 1)
            }

            console.log('values:', values)
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
    Callback will recive err, bytes readed by the device and the timestap for that
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
            let values = line.split(/\s+/)
            if (values[0] === '') {
              values.splice(0, 1)
            }
            let rx = parseInt(values[1])
            callback(null, rx, timestap)
          } else {
            callback(new Error(`Device "${device}" not found.`))
          }
        }
      })
    }

    function getTx(device, callback) {
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
            let values = line.split(/\s+/)
            if (values[0] === '') {
              values.splice(0, 1)
            }
            let tx = parseInt(values[9])
            callback(null, tx, timestap)
          } else {
            callback(new Error(`Device "${device}" not found.`))
          }
        }
      })
    }

    return {
      listIfaces: listIfaces,
      NetStats: NetStats,
      getNetStats: getNetStats,
      checkRxBitrate: checkRxBirate,
      getRx: getRx,
      getTx: getTx,
      getRxTxStats: getRxTxStats
    }
  })
