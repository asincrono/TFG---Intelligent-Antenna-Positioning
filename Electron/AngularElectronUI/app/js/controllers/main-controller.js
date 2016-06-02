'use strict'

angular.module('MainApp')
  .controller('MainController', ['$scope', '$timeout', '$interval', 'NetStats', 'ArduinoComm', function ($scope, $timeout, $interval, NetStats, ArduinoComm) {
    const PLATFORM = os.platform()

    const MSG_MOVE_XY_CODE = 0

    const MOTOR_X_CODE = 1
    const MOTOR_Y_CODE = 2

    const RECONNECT = true
    const RECONNECT_MAX_TRIES = 3
    const RECONNECT_TIMEOUT = 5000

    //      const PORT_ADDR = '/dev/cu.usbmodem1411'
    const PORT_ADDR = '/dev/cu.usbmodem1431'
    const BAUD_RATE = 9600
    const TOLERANCE = 5
    const MOTOR_SPEED = 185
    const POLL_DELAY = 15
    const MAX_TRIES = 100

    const URL = 'ftp://192.168.0.1/TFG/rnd_file_5GB.data'
    const USER = 'tfg'
    const PASS = 'tfg'
    const CURL_CMD = 'curl'
    const CURL_ARGS = ['-s', '-o', '/dev/null', '-u', `${USER}:${PASS}`, '-w', '"%{speed_download}"', URL]

    const DEFAULTS = {
      connectionReconnect: true,
      connectionMaxTries: 3,
      connectionReconnectTimeout: 5000,
      baudRate: 9600,
      rows: 5,
      columns: 5,
      systemTolerance: 10,
      motorTolerance: 5,
      motorSpeed: 175,
      motorBaseSpeed: 175,
      motorMaxSpeed: 200,
      motorPollDelay: 15,
      motorMaxTries: 100
    }

    const MSG_ARGS = {
      tolerance: TOLERANCE,
      motorSpeed: MOTOR_SPEED,
      pollDelay: POLL_DELAY,
      maxTries: MAX_TRIES
    }

    const MSG_ARGS_TESTING = {
      tolerance: 5,
      baseSpeed: 185,
      maxSpeed: 200,
      pollDelay: 15,
      maxTries: 50
    }

    const MSG_ARGS_MOTOR_Y = {
      tolerance: 5,
      baseSpeed: 200,
      maxSpeed: 250,
      pollDelay: 15,
      maxTries: 50
    }

    function setDeviceSelectionMenu() {
      let selectDevice = {
        label: 'Select device',
        submenu: []
      }

      let devices = utils.listIfaces()
      let selected = false
      devices.forEach((device) => {
        // We select the first avaliable device
        let check = false
        if (!selected) {
          check = true
          $scope.selectedDevice = device
          selected = true
        }
        
        let deviceMenu = {
          label: device,
          type: 'radio',
          checked: false,
          click(item, focusedWindow) {
            console.log('clicked', device)
            $scope.$apply(() => {
              $scope.selectedDevice = device
            })
          }
        }
        selectDevice.submenu.push(deviceMenu)
      })
      let selectDeviceMenu = new MenuItem(selectDevice)
      appMenu.insert(3, selectDeviceMenu)
      Menu.setApplicationMenu(appMenu)
    }

    function genMXYMsg(position, rows, cols, args) {
      let xStep = 99 / (rows - 1)
      let yStep = 99 / (cols - 1)
      let xPercent = utils.leftPad(Math.trunc(position.x * xStep), 2, '0')
      let yPercent = utils.leftPad(Math.trunc(position.y * yStep), 2, '0')

      let t = utils.leftPad(args.tolerance ? args.tolerance : TOLERANCE, 2, '0')
      let mS = utils.leftPad(args.motorSpeed ? args.motorSpeed : MOTOR_SPEED, 3, '0')
      let pD = utils.leftPad(args.pollDelay ? args.pollDelay : POLL_DELAY, 3, '0')
      let mT = utils.leftPad(args.maxTries ? args.maxTries : MAX_TRIES, 3, '0')

      return `${MSG_MOVE_XY_CODE}${xPercent}${yPercent}${t}${mS}${pD}${mT}\n`
    }

    function genMMsg(motor, dest, segments, args) {
      let step = 99 / (segments - 1)
      let percent = utils.leftPad(Math.trunc(dest * step), 2, '0')


      let t = utils.leftPad(args.tolerance ? args.tolerance : TOLERANCE, 2, '0')
      let bS = utils.leftPad(args.baseSpeed ? args.baseSpeed : BASE_SPEED, 3, '0')
      let mS = utils.leftPad(args.maxSpeed ? args.maxSpeed : BASE_SPEED, 3, '0')
      let pD = utils.leftPad(args.pollDelay ? args.pollDelay : POLL_DELAY, 3, '0')
      let mT = utils.leftPad(args.maxTries ? args.maxTries : MAX_TRIES, 3, '0')
      return `${motor}${percent}${t}${bS}${mS}${pD}${mT}\n`
    }

    /*
    The rensponse message from Arduino will be in the form: "x,y"
    x (y) will be the slider "X" ("Y") capacitor reating (0~1000) mapped to the range [0, 99].
    */

    function parseArduinoMsg(data, rows, columns, tolerance) {
      let coords = data.split(',')

      rows = rows ? rows : DEFAULTS.rows
      columns = columns ? columns : DEFAULTS.columns
      tolerance = tolerance ? tolerance : DEFAULTS.systemTolerance

      console.log(rows, columns, tolerance)

      if (coords.length == 2) {
        let x = utils.percentCoordToDec(Number(coords[0]), tolerance, rows)
        let y = utils.percentCoordToDec(Number(coords[1]), tolerance, columns)
        return new utils.Position(x, y)
      }
    }

    /*
    Functions to setup and communicate with Arduino.
    */

    function genTimestampedFileName(dir, baseName, extension) {
      let timestampStr = new Date().toISOString()
      let fileName = `${timestampStr}-${baseName}`
      return path.format({
        dir: dir,
        name: fileName,
        ext: extension
      })
    }

    function registrateWatcher(toWatch, toDo, deep) {
      let registrateWatcher = function () {
        return $scope.$watch(toWatch, toDo, deep)
      }
      $scope.registrationList.push(registrateWatcher)

      let deregstrateWatcher = registrateWatcher()
    }

    function parsePosition(positionStr) {
      let x = 0
      let y = 0
      if (positionStr) {
        //        [x, y] = positionStr.split(',').map((value, idx, arr) => {return parseInt(value)})
        let values = positionStr.split(',')
        x = parseInt(values[0])
        y = parseInt(values[1])
      }
      return [x, y]
    }

    function connectV2(addr, callback) {
      if ($scope.port === undefined || !$scope.port.isOpen()) {

        let dataCallback = function (data) {
          // Function to react to received data.
          console.log('Readed:', data)
          if ($scope.started) {
            // We need to process the answer from Arduino
            $scope.$apply(() => {
              $scope.antennaPosition = parseArduinoMsg(data, $scope.rows, $scope.columns)
              console.log('Antenna position:', $scope.antennaPosition)
            })
          }
        }

        let openCallback = function (error) {
          if (error) {
            console.log('Failed to connect:', error)
            if ($scope.connectionTries < RECONNECT_MAX_TRIES) {
              $scope.connectionTries += 1
              console.log(`Trying to connect: try ${$scope.connectionTries} in ${RECONNECT_TIMEOUT/1000} seconds.`)

              $timeout(() => {
                connectV2(addr, callback)
              }, RECONNECT_TIMEOUT, false)
            } else if (callback) {
              callback(error)
            }
          } else {
            $scope.$apply(() => {
              $scope.connected = true
            })
            if (callback) {
              callback()
            }
          }
        }

        $scope.port = ArduinoComm.createOpenAndSetupPort(addr, BAUD_RATE, openCallback, dataCallback)
      } else {
        console.log('Already connected.')
      }
    }


    function connect(callback) {
      if ($scope.port === undefined || !$scope.port.isOpen()) {
        console.log('Trying to connect.')
        ArduinoComm.getAddr((err, addr) => {
          if (addr) {
            console.log('Arduino addr:', addr)

            let dataCallback = function (data) {
              // Function to react to received data.
              console.log('Readed:', data)
              if ($scope.started) {
                // We need to process the answer from Arduino
                $scope.$apply(() => {
                  let newPosition = parseArduinoMsg(data, $scope.rows, $scope.columns, TOLERANCE)
                  console.log('newPosition:', newPosition)
                    //$scope.antennaPosition.setFromPosition(newPosition)
                  $scope.antennaPosition = newPosition
                })
                NetStats.getNetStats((stats) => {
                  console.log('netStats:', stats)
                  $scope.netStats = stats
                })
              }
            }

            let openCallback = function (error) {
              if (error) {
                console.log('Failed to connect:', error)
                if ($scope.connectionTries < RECONNECT_MAX_TRIES) {
                  $scope.connectionTries += 1
                  console.log(`Trying to connect: try ${$scope.connectionTries} in ${RECONNECT_TIMEOUT/1000} seconds.`)

                  $timeout(connect, RECONNECT_TIMEOUT, false)
                } else if (callback) {
                  callback(error)
                }
              } else {
                $scope.$apply(() => {
                  $scope.connected = true
                })
                if (callback) {
                  callback()
                }
              }
            }

            $scope.port = ArduinoComm.createOpenAndSetupPort(addr, BAUD_RATE, openCallback, dataCallback)
          }
        })
      } else {
        console.log('Already connected.')
      }
    }


    function disconnect() {
      if ($scope.port && $scope.port.isOpen()) {
        console.log('Port still open')
        ArduinoComm.closePort($scope.port, error => {
          if (error) {
            console.log('Disconnect error:', error)
          } else {
            console.log('Disconnectiog')
            $scope.$apply(() => {
              $scope.started = false
              $scope.connected = false
            })
          }
        })
      } else {
        console.log('Port alrady closed')
        $scope.started = false
        $scope.connected = false
      }
    }

    function sendMsg(msg, callback) {
      ArduinoComm.writeMsg($scope.port, msg, callback)
    }

    /*
    Wifi signal readings:
    For each antenna position we:
      1.- Wait X (3) seconds.
      2.- For Y (5) seconds we do Y readings.
      3.- We calculate the mean and save it with the position.
      4.- We update the graph.
      5.- We proceed to the next position.
    */

    function getMeanValue(values) {
      let numValues = values.length
      let total = 0
      for (let i = 0; i < numValues; i += 1) {
        total += values[i]
      }
      return total / numValues
    }

    // Callback will be called after all readings done.

    function genMeanNetStats(netStatsList) {
      let meanSignal = 0
      let meanNoise = 0
      let numStats = netStatsList.length

      netStatsList.forEach((stat, idx, stats) => {
        meanSignal += stat.signal
        meanNoise += stat.noise
      })

      // Sorry for this but it's so cute :)
      meanSignal /= numStats
      meanNoise /= numStats
      return new utils.NetStats(meanSignal, meanNoise)
    }

    function wifiReadings(timeout, delay, readings, callback) {
      let netStatsList = []

      let afterReadings = function () {
        //console.log('afterReadings')
        //console.log('callback =', callback)
        $scope.netStats = genMeanNetStats(netStatsList)
        callback(netStatsList)
      }

      $timeout(() => {
        /*
        Clear the readings counter.
        Empty the reading list.
        */
        //console.log('Inside timeout function')

        $interval(() => {
          //console.log('Inside timmer function')
          NetStats.getNetStats((netStats) => {
            netStatsList.push(netStats)
            $scope.positionWithStats = new utils.AntennaPosition($scope.antennaPosition.x, $scope.antennaPosition.y, netStats)
          })
        }, delay, readings).then(afterReadings, (error) => {
          console.log('WiFi readings error:', error)
        })
      }, timeout)
    }


    function moveAntennaX(pos, steps, timeout) {
      //console.log('moving X')
      let msg = genMMsg(MOTOR_X_CODE, pos, steps, MSG_ARGS_TESTING)
        //console.log('moving x msg:', msg)
      if (timeout) {
        $timeout(function () {
          sendMsg(msg)
        }, timeout)
      } else {
        sendMsg(msg)
      }
    }

    function moveAntennaY(pos, steps, timeout) {
      //console.log('moving Y')
      let msg = genMMsg(MOTOR_Y_CODE, pos, steps, MSG_ARGS_MOTOR_Y)
        //console.log('moving y msg:', msg)
      if (timeout) {
        $timeout(function () {
          sendMsg(msg)
        }, timeout)
      } else {
        sendMsg(msg)
      }
    }

    function resetAntennaPosition(timeout) {
      let origin = new utils.Position(0, 0)
      let msg = genMXYMsg(origin, $scope.rows, $scope.columns, MSG_ARGS)
      console.log('reset antenna position msg:', msg)

      if (timeout) {
        $timeout(function () {
          sendMsg(msg)
        }, timeout)
      } else {
        sendMsg(msg)
      }
    }


    function init() {
      // List of deregistration functions to be able to stop watchers.
      // Every time we stablish a watcher we add it's returned deregistration
      // function to the list.
      // Specially in the nested controllers.
      $scope.deregistrationList = []
      $scope.registrationList = []

      // Configuration
      $scope.configuration = {
        mode: 'auto',
        numberOfReadings: 5,
        readingDelay: 1000
      }

      $scope.connected = false
      $scope.started = false

      $scope.connectionTries = 0

      $scope.rows = 5
      $scope.columns = 5

      $scope.maxPositions = $scope.rows * $scope.columns

      //      $scope.currentPosition
      //      $scope.antennaPosition
      //      $scope.netStats

      $scope.positionWithStats
      $scope.tempStats

      $scope.fileName = genTimestampedFileName('data', 'WiFiReadings', '.txt')

      setDeviceSelectionMenu()

      // Watch changes in positionWithStats -> save values to file.
      registrateWatcher(
        (scope) => {
          return scope.positionWithStats
        }, (newValue, oldValue) => {
          console.log('Position + stats: (new)', newValue, '(old)', oldValue)
          if (newValue) {
            newValue.appendFile($scope.fileName)
          }
        }
      )

      let afterConnectCallback = function (error) {
        if (!error) {
          $scope.port.on('close', (err) => {
            console.log('CLOSED FOR BUSINESS!')
            $scope.$apply(() => {
              $scope.connected = false
              $scope.started = false
            })
          })
        }
      }

      usbDetect.on('add', (device) => {
        console.log('Connected:', device)
        if (device.manufacturer && device.manufacturer.includes('Arduino')) {
          console.log('connecting')
          $timeout(() => {
            console.log('Some time after?')
            ArduinoComm.getAddr((err, addr) => {
              console.log('Arduino serial addr:', addr)
              connectV2(addr, afterConnectCallback)
            })
          }, 2500)
        }
      })

      usbDetect.on('remove', (device) => {
        console.log('Removed', device);
        if (device.manufacturer.includes('Arduino')) {
          console.log('Disconnecting')
          $scope.$apply(() => {
            disconnect()
          })
        }
      })



      //       Try to connect
      //       Try to get Arduino addr
      ArduinoComm.getAddr((addr) => {
        if (addr) {
          console.log('Arduino serial addr:', addr)
          connectV2(addr, afterConnectCallback)
        }
      })

      $scope.saveWiFiReadingsFilePath = genTimestampedFileName('Data', 'wifi_stats', 'data')
    }

    $scope.test = function () {

      utils.getReceiveTransmitStats($scope.selectedDevice, (err, receive, transmit, timestamp) => {
          if (err) {
            console.log(err)
          } else {
            console.log(receive)
            console.log(transmit)
            console.log(new Date(timestamp))
            $scope.pbsCheck = {
              bytes: receive.bytes,
              timestamp: timestamp
            }
          }
        })
        //      let serialport = require('serialport')
        //      serialport.list((err, ports) => {
        //        console.log('err:', err)
        //        console.log('ports:', ports)
        //      })




      // TESTING parseArduinoMsg
      //      let positions = []
      //      for (let i = 0; i < 100; i += 10) {
      //        for (let j = 0; j < 100; j += 10) {
      //          positions.push({x: i, y: j})
      //        }
      //      }
      //      let newPos
      //      positions.forEach((position, idx, arr) => {
      //        newPos = parseArduinoMsg(`${position.x}, ${position.y}`)
      //        console.log(`${position.x}, ${position.y} = ${newPos.toString()}`)
      //      })
      //      let position
      //      for (let i = 0; i < 100; i += 10) {
      //        try {
      //          position = utils.percentCoordToDec(i, DEFAULTS.rows, DEFAULTS.motorTolerance)
      //          console.log(`${i} % -> ${position}`)
      //        }
      //        catch (ex) {
      //          console.log ('Exception:', ex)
      //        }
      //      }


    }

    $scope.start = function () {
      console.log('starting...')
      $scope.started = true
      console.log('connected:', $scope.connected)
      console.log('mode:', $scope.configuration.mode)



      let afterWifiReadings
      if ($scope.configuration.mode === 'auto') {
        afterWifiReadings = function () {
          //console.log('(mainCtrl) after wifi?')
          $scope.currentPosition.next($scope.rows, $scope.columns)
        }
      } else {
        afterWifiReadings = function () {
          resetAntennaPosition(500)
        }
      }

      if ($scope.connected) {
        // Watch changes in antennaPosition -> trigger wifi readings.
        /* Once Arduino tells us there is a new position ( -> change in
        antennaPosition) we do our readings*/
        registrateWatcher(
          (scope) => {
            return scope.antennaPosition
          }, (newValue, oldValue) => {
            if (newValue) {
              // timeout, delay, readings, filePath, callback)
              wifiReadings(1500, $scope.configuration.readingDelay, $scope.configuration.numberOfReadings, afterWifiReadings)
            }
          }
        )

        switch ($scope.configuration.mode) {
          case 'auto':
            console.log('Starting in auto mode...')

            //          let afterWifiReadigs = function () {
            //            $scope.currentPosition.next($scope.rows, $scope.columns)
            //          }

            registrateWatcher((scope) => {
              return scope.currentPosition
            }, (newValue, oldValue) => {
              console.log('(mainCtrl) currentPosition changed: (old)', oldValue, '(new)', newValue)
              if (newValue) {
                if (newValue.x === 0 && newValue.y === 0) {
                  resetAntennaPosition(500)
                } else if (oldValue) {
                  if (newValue.x != oldValue.x) {
                    //console.log('Moving X to: ', newValue.x)
                    moveAntennaX(newValue.x, $scope.rows)
                  } else if (newValue.y != oldValue.y) {
                    //console.log('Moving Y to', newValue.y)
                    moveAntennaY(newValue.y, $scope.columns)
                  }
                } else {
                  resetAntennaPosition(500)
                }
              }
            }, true)
            break
          case 'manual':
            console.log('starting in manual...')
            let [x, y] = parsePosition($scope.manualPosition)
            $scope.currentPosition.setCoords(x, y)
            break
        }

      }
      $scope.currentPosition = new utils.Position(0, 0)
    }

    $scope.stop = function () {
      // Deregistrate watchers.
      $scope.deregistrationList.forEach((value, idx, arr) => {
        value()
      })
      $scope.deregistrationList = []

      disconnect()

      $scope.started = false
    }

    $scope.registrateWatchers = function () {
      $scope.registrationList.forEach((value, idx, arr) => {
        let deregistrateWarcher = value()
        $scope.deregistrationList.push(deregistrateWarcher)
      })
    }

    init()

  }])
