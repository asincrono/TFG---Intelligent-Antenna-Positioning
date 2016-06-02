'use strict'

angular.module('MainApp').factory('ArduinoComm', function ArduinoCommFactory() {
  // Load serial module.
  const SerialPort = require('serialport')
    //const SerialPort = serialport.SerialPort

  return {
    list: function (callback)  {
      SerialPort.list((err, ports) => {
        if (err) {
          console.log(err)
        } else {
          callback(ports)
        }
      })
    },
    getAddr: function (callback) {
      SerialPort.list((err, ports) => {
        let arduinoAddr
        let arduinoPorts = ports.filter((port) => {
          return port.manufacturer && port.manufacturer.includes('Arduino')
        })
        if (arduinoPorts.length > 0) {
          arduinoAddr = arduinoPorts[0].comName
        }
        callback(arduinoAddr)
      })
    },
    //    listPorts: function (callback) {
    //      serialport.list((err, portList) => {
    //        if (err) {
    //          console.log(err)
    //        } else {
    //          callback(portList)
    //        }
    //      })
    //    },
    //
    //    getAddr: function (callback) {
    //      serialport.list((err, portList) => {
    //        let addr
    //        if (portList) {
    //          let filteredList = portList.filter((port) => {
    //            if (port.manufacturer) {
    //              return port.manufacturer.includes('Arduino')
    //            }
    //            return false
    //          })
    //          console.log(filteredList)
    //          if (filteredList.length > 0) {
    //            addr = filteredList[0].comName
    //          }
    //        }
    //        console.log('error:', error, 'addr:', addr)
    //        callback(err, addr)
    //      })
    //      serialport.list((err, portList) => {
    //        if (err) {
    //          console.log(err)
    //        } else {
    //          let filterdList = portList.filter((port) => {
    //            if (port.manufacturer) {
    //              return port.manufacturer.includes('Arduino')
    //            }
    //            return false
    //          })
    //          if (filterdList.length > 0) {
    //            callback(filterdList[0].comName)
    //          }
    //        }
    //      })
    //    },
    createPort: function (portAddr, baudRate) {
      let port = new SerialPort(
        portAddr, {
          baudRate: baudRate,
          parser: SerialPort.parsers.readLine('\n')
        },
        false
      )
    },
    openPort: function (port, callback) {
      if (port !== undefined && !port.isOpen()) {
        port.open(callback)
      }
    },
    createAndOpenPort: function (portAddr, baudRate) {
      let port = new SerialPort(
        portAddr, {
          baudRate: baudRate,
          parser: serialport.parsers.readline('\n')
        },
        error => {
          console.log('Failed to open:', error)
        }
      )
      return port
    },
    createOpenAndSetupPort: function (portAddr, baudRate, openCallback, dataCallback) {
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
    createOpenSetupAndWriteMsg: function (portAddr, baudRate, msg, callback) {
      let port = new SerialPort(
        portAddr, {
          baudRate: baudRate,
          parser: serialport.parsers.readline('\n')
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
    closePort: function (port) {
      if (port !== undefined && port.isOpen()) {
        port.close()
      }
    },
    writeMsg: function (port, msg, callback) {
      if (port !== undefined) {
        port.write(msg, callback)
        port.drain()
      } else {
        console.log('Failed to write: port undefined')
      }
    },
    setDataCallback: function (port, callback) {

    }
  }
})
