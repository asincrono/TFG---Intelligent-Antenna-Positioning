angular.module('MainApp').factory('ArduinoComm', function ArduinoCommFactory() {
  'use strict'
  // Load serial module.
  const SerialPort = require('serialport')

  let dataCallback

  return {
    list: function(callback)  {
      SerialPort.list((err, ports) => {
        if (err) {
          console.log(err)
        } else {
          callback(ports)
        }
      })
    },
    getAddr: function(callback) {
      SerialPort.list((err, ports) => {
        if (err) {
          callback(err)
        } else {
          let arduinoAddr = null
          let limit = ports.length

          for (let i = 0; i < limit; i += 1) {
            if (/Arduino/.test(ports[i].manufacturer)) {
              arduinoAddr = ports[i].comName
              break
            }
          }
          callback(null, arduinoAddr)
        }
      })
    },
    createPort: function(portAddr, baudRate) {
      let port = new SerialPort(
        portAddr, {
          baudRate: baudRate,
          parser: SerialPort.parsers.readLine('\n')
        },
        false
      )
    },
    openPort: function(port, callback) {
      if (port !== undefined && !port.isOpen()) {
        port.open(callback)
      }
    },
    createAndOpenPort: function(portAddr, baudRate) {
      let port = new SerialPort(
        portAddr, {
          baudRate: baudRate,
          parser: SerialPort.parsers.readline('\n')
        },
        error => {
          console.log('Failed to open:', error)
        }
      )
      return port
    },
    createOpenAndSetupPort: function(portAddr, baudRate, openCallback, dataCallback) {
      let port = new SerialPort(
        portAddr, {
          baudRate: baudRate,
          parser: SerialPort.parsers.readline('\n')
        },
        err => {
          if (err) {
            openCallback(err)
          } else {
            openCallback()
            port.on('data', dataCallback)
          }
        })

      return port
    },
    createOpenSetupAndWriteMsg: function(portAddr, baudRate, msg, callback) {
      let port = new SerialPort(
        portAddr, {
          baudRate: baudRate,
          parser: SerialPort.parsers.readline('\n')
        },
        err => {
          if (err) {
            console.log('failed to open:', err)
          } else {
            console.log('open')
            port.on('data', callback)
            port.write(msg)
          }
        })

      return port
    },
    closePort: function(port) {
      if (port !== undefined && port.isOpen()) {
        port.close()
      }
    },
    writeMsg: function(port, msg, callback) {
      if (port !== undefined) {
        port.write(msg, callback)
        port.drain()
      } else {
        console.log('Failed to write: port undefined')
      }
    },
    setDataCallback: function(port, callback) {
      port.on('data', callback)
    }
  }
})
