angular.module('MainApp')
  .factory('NetInfo', function NetInfoFactory() {
    const os = require('os')
    const fs = require('fs')
    const {rTrim, lineToValues} = require('./js/utils/utils.js')
    const DARWIN_AIRPORT_CMD = '/System/Library/PrivateFrameworks/Apple80211.\
    framework/Versions/Current/Resources/airport -I'

    const DARWIN_NETSTAT_CMD = 'netstat'
    const PROC_NET_DEV = '/proc/net/'
    const PROC_NET_WIRELESS = '/proc/net/wireless'
    // const LINUX_NMCLI_CMD = 'nmcli'
    // const LINUX_NMCLI_DEV_ARGS = ['-f', 'DEVICE','con', 'show', '-a']
    // const WINDOWS_NETSH_CMD = ''
    // const WINDOWS_NETSH_ARGS = ''

    const {execFile} = require('child_process')

    class NetStats {
      constructor (level, noise, rx, tx) {
        this.level = level
        this.noise = noise
        this.bitrate = {
          rx,
          tx
        }
        this.timeStamp = Date.now()
      }

      updateStats (stats) {
        this.level = stats.level
        this.noise = stats.noise
        this.bitrate = stats.bitrate
        this.timeStamp = Date.now()
      }
    }

    class RxStamp {
      constructor (bytes, timestamp) {
        this.bytes = bytes
        this.timestamp = timestamp
      }

      getBitrate (rxStamp) {
        let byteDiff = Math.abs(this.bytes - rxStamp.bytes)
        // Time should be in seconds.
        let timeDiff = Math.abs(this.timestamp - rxStamp.timestamp) / 1000
        return Math.trunc(byteDiff / timeDiff)
      }

      update (bytes, timestamp) {
        this.bytes = bytes
        this.timestamp = timestamp
      }
    }

    let rxStamp = null

    // Since the last invocation
    function checkRxBitrate (device, callback) {
      getRx(device, (err, bytes, timestamp) => {
        if (err) {
          console.log(err)
          if (callback) {
            callback(err)
          }
        } else {
          let newRxStamp = new RxStamp(bytes, timestamp)

          // First invocation will return always null.
          let bitrate = null
          if (rxStamp) {
            bitrate = rxStamp.getBitrate(newRxStamp)
            rxStamp.update(bytes, timestamp)
          } else {
            rxStamp = new RxStamp(bytes, timestamp)
          }
          if (callback) {
            callback(null, bitrate)
          }
        }
      })
    }

    function parseLinux (device, data) {
      let lines = data.split('\n')

      let line = lines.filter((line) => {
        return line.includes(device)
      })[0]

      if (line) {
        let values = lineToValues(line)
        let level = parseInt(rTrim(values[3], '.'), 10)
        let noise = parseInt(rTrim(values[4], '.'), 10)
        return new NetStats(level, noise)
      } else {
        throw new Error(`Device "${device}" not found.`)
      }
    }

    function parseDarwin (data) {
      let level = parseInt(data.match(/agrCtlRSSI: (\-\d+)/)[1], 10)
      let noise = parseInt(data.match(/agrCtlNoise: (\-\d+)/)[1], 10)
      return new NetStats(level, noise)
    }

    function getNetStats (device, callback) {
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
            fs.readFile(PROC_NET_WIRELESS, 'utf8', (err, data) => {
              if (err) {
                console.error(err)
              } else {
                callback(parseLinux(device, data))
              }
            })
          }
          break
      }
    }

    function listIfaces () {
      let ifaces = os.networkInterfaces()
      let ifNames = []
      for (let ifName in ifaces) {
        ifNames.push(ifName)
      }
      return ifNames
    }

    function getRxTxStats (device, callback) {
      fs.readFile(PROC_NET_DEV, 'utf8', (err, data) => {
        let timestamp = Date.now()
        if (err) {
          callback(err)
        } else {
          let lines = data.split('\n')
          let line = lines.filter((line) => {
            return line.includes(device)
          })[0]

          if (!line) {
            callback(new Error(`Device "${device}" not found.`))
          } else {
            let values = lineToValues(line)

            let receive = {
              bytes: parseInt(values[1], 10),
              packets: parseInt(values[2], 10),
              errs: parseInt(values[3], 10),
              drop: parseInt(values[4], 10)
            }

            let transmit = {
              bytes: parseInt(values[9], 10),
              packets: parseInt(values[10], 10),
              errs: parseInt(values[11], 10),
              drop: parseInt(values[12], 10)
            }

            callback(null, receive, transmit, timestamp)
          }
        }
      })
    }

    /*
    Callback will recive err, bytes readed by the device and the timestap for that
    read.
    */
    function getRx (device, callback) {
      fs.readFile(PROC_NET_DEV, 'utf8', (err, data) => {
        let timestamp = Date.now()
        if (err) {
          callback(err)
        } else {
          let lines = data.split('\n')
          let line = lines.filter(line => line.includes(device))[0]
          if (line) {
            let values = lineToValues(line)

            let rx = parseInt(values[1], 10)
            callback(null, rx, timestamp)
          } else {
            callback(new Error('Device "${device}" not found.'))
          }
        }
      })
    }

    function getTx (device, callback) {
      fs.readFile(PROC_NET_DEV, 'utf8', (err, data) => {
        let timestamp = Date.now()
        if (err) {
          callback(err)
        } else {
          let lines = data.split('\n')
          let line = lines.filter(line => line.includes(device))[0]
          if (line) {
            let values = lineToValues(line)

            let rx = parseInt(values[9], 10)
            callback(null, rx, timestamp)
          } else {
            callback(new Error('Device "${device}" not found.'))
          }
        }
      })
    }

    return {
      listIfaces: listIfaces,
      NetStats: NetStats,
      getNetStats: getNetStats,
      checkRxBitrate: checkRxBitrate,
      getRx: getRx,
      getTx: getTx,
      getRxTxStats: getRxTxStats
    }
  })
