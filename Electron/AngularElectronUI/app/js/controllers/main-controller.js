angular.module('MainApp')
  .controller('MainController', ['$scope', '$timeout', '$interval', 'NetInfo', 'ArduinoComm', 'WatcherTracker',
    function($scope, $timeout, $interval, NetInfo, ArduinoComm, WatcherTracker) {
      'use strict'

      const usbDetect = require('usb-detection')
      const path = require('path')
      const utils = require('./js/utils/utils.js')
      const conversion = require('./js/utils/conversion.js')

      const PLATFORM = require('os').platform()

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
      const MOTOR_SPEED = 250
      const POLL_DELAY = 15
      const MAX_TRIES = 100

      const URL = 'ftp://192.168.0.1/TFG/rnd_file_1GB.data'
      const USER = 'tfg'
      const PASS = 'tfg'
      const CURL_CMD = 'curl'
      const CURL_ARGS = ['-s', '-o', '/dev/null', '-u', `${USER}:${PASS}`, '-w', '"%{speed_download}"', URL]

      // max bitrate according to AP
      const MAX_BITRATE_M = 450

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
        motorSpeed: 215,
        pollDelay: POLL_DELAY,
        maxTries: MAX_TRIES
      }

      const MSG_ARGS_TESTING = {
        tolerance: 5,
        baseSpeed: 190,
        maxSpeed: 200,
        pollDelay: 15,
        maxTries: 50
      }

      const MSG_ARGS_MOTOR_X = {
        tolerance: 5,
        baseSpeed: 175,
        maxSpeed: 200,
        pollDelay: 15,
        maxTries: 50
      }

      const MSG_ARGS_MOTOR_Y = {
        tolerance: 5,
        baseSpeed: 250,
        maxSpeed: 250,
        pollDelay: 15,
        maxTries: 50
      }

      let self = this

      let curlProcess

      function setDeviceSelectionMenu() {
        let selectDevice = {
          label: 'Select device',
          submenu: []
        }

        // We'll filter devices starting by 'lo' and 'en'.
        let devices = NetInfo.listIfaces().filter((iface) => {
          return (iface.search(/^lo/) < 0 && iface.search(/^en/) < 0)
        })
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

      /**Runs a command in an Executor object. If an error occours after delay
       * it will try to run the command again up to a maximum of maxTries.
       *
       * @param  {String} cmd      The command to be executed.
       * @param  {array} args     Array of strings with the command args.
       * @param  {number} maxTries Max number of retries. 0 will retry without end.
       * @param  {number} delay    Milliseconsd between retries.
       * @return {object}          Executor object that will stop the command execution.
       */
      function runCmdOnExecutor(cmd, args, maxTries, delay) {
        let tryCount = 0
          // Initiate the curl command data transmission
        let executor = new utils.Executor(cmd, args, (err, stdout, stderr) => {
          if (err) {
            console.log(err)
            if (stderr) {
              console.log('stderror:', stderror)
            }
            tryCount += 1

            if (maxTries && tryCount < maxTries) {
              // Try to determine if the error was cause a kill or quit signal
              // and prevent to retry
              console.log('(mainCtrl) runCmdOnExecutor retry:', tryCount)
              if (delay) {
                $timeout(function() {
                  executor.run()
                }, delay)
              } else {
                executor.run()
              }
            }
          } else {
            if (stdout) {
              console.log('curl stdout:', stdout)
            }
            if (stderr) {
              console.log('curl stderr:', stderr)
            }
          }
        })

        executor.run()

        return executor
      }

      /**
       * Starts a data transfer. If error will retry up to maxTries with a delay between tries.
       * @param  {number} maxTries Max number of tries.
       * @param  {number} delay    Delay in milliseconsds between tries.
       * @return {object}          Executor that can be stoped of killed.
       */
      function startDataTransfer(maxTries, delay) {
        return runCmdOnExecutor(CURL_CMD, CURL_ARGS, maxTries, delay)
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
        let msg = `${MSG_MOVE_XY_CODE}${xPercent}${yPercent}${t}${mS}${pD}${mT}\n`
        console.log('genMXYMsg msg:', msg)
        return msg
      }

      function genMMsg(motor, dest, segments, args) {
        let step = 99 / (segments - 1)
        let percent = utils.leftPad(Math.trunc(dest * step), 2, '0')


        let t = utils.leftPad(args.tolerance ? args.tolerance : TOLERANCE, 2, '0')
        let bS = utils.leftPad(args.baseSpeed ? args.baseSpeed : MOTOR_SPEED, 3, '0')
        let mS = utils.leftPad(args.maxSpeed ? args.maxSpeed : MOTOR_SPEED, 3, '0')
        let pD = utils.leftPad(args.pollDelay ? args.pollDelay : POLL_DELAY, 3, '0')
        let mT = utils.leftPad(args.maxTries ? args.maxTries : MAX_TRIES, 3, '0')
        return `${motor}${percent}${t}${bS}${mS}${pD}${mT}\n`
      }

      function sendMsg(msg, callback) {
        ArduinoComm.writeMsg($scope.port, msg, callback)
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

        if (coords.length == 2) {
          let x = conversion.percentCoordToDec(Number(coords[0]), tolerance, rows)
          let y = conversion.percentCoordToDec(Number(coords[1]), tolerance, columns)
          let position = new utils.Position(x, y)
          return position
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

      // To parse the keyboard introduced manual position.
      function parsePosition(positionStr) {
        let x = 0
        let y = 0
        if (positionStr) {
          let values = positionStr.split(',')
          x = parseInt(values[0])
          y = parseInt(values[1])
        }
        console.log('parsePosition x, y: ', x, y)
        return [x, y]
      }

      function moveAntennaX(pos, steps, timeout) {
        //console.log('moving X')
        let msg = genMMsg(MOTOR_X_CODE, pos, steps, MSG_ARGS_MOTOR_X)
          //console.log('moving x msg:', msg)
        if (timeout) {
          $timeout(function() {
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
          $timeout(function() {
            sendMsg(msg)
          }, timeout)
        } else {
          sendMsg(msg)
        }
      }

      function moveAntennaXY(position, steps, timeout) {
        let msg = genMXYMsg(position, $scope.rows, $scope.columns, MSG_ARGS)
        console.log('moving antenna to', position.toString())

        if (timeout) {
          $timeout(function() {
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
          $timeout(function() {
            sendMsg(msg)
          }, timeout)
        } else {
          sendMsg(msg)
        }
      }

      function connect(addr, dataCallback, afterCallback) {
        if ($scope.port === undefined || !$scope.port.isOpen()) {

          let openCallback = function(error) {
            if (error) {
              console.log('Failed to connect:', error)
              if ($scope.connectionTries < RECONNECT_MAX_TRIES) {
                $scope.connectionTries += 1
                console.log(`Trying to connect: try ${$scope.connectionTries} in ${RECONNECT_TIMEOUT / 1000} seconds.`)

                $timeout(() => {
                  connect(addr, dataCallback, afterCallback)
                }, RECONNECT_TIMEOUT, false)
              } else if (afterCallback) {
                afterCallback(error)
              }
            } else {
              $scope.$apply(() => {
                $scope.connected = true
              })
              if (afterCallback) {
                afterCallback()
              }
            }
          }

          $scope.port = ArduinoComm.createOpenAndSetupPort(addr, BAUD_RATE, openCallback, dataCallback)
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

      /*
      Wifi signal readings:
      For each antenna position we:
        1.- Wait X (3) seconds.
        2.- For Y (5) seconds we do Y readings.
        3.- We calculate the mean and save it with the position.
        4.- We update the graph.
        5.- We proceed to the next position.
      */

      // Callback will be called after all readings done.

      function calcMeanNetStats(netStatsList) {
        let meanLevel = 0
        let meanNoise = 0
        let numStats = netStatsList.length

        netStatsList.forEach((stat, idx, stats) => {
          meanLevel += stat.level
          meanNoise += stat.noise
        })

        // Sorry for this but it's so cute :)
        meanLevel /= numStats
        meanNoise /= numStats
        meanLevel = Math.round(meanLevel * 100) / 100
        meanNoise = Math.round(meanNoise * 100) / 100
        return new NetInfo.NetStats(meanLevel, meanNoise)
      }

      function wifiReadingsV2(timeout, delay, readings, callback) {
        let netStatsList = []
        let count = 0
        console.log('wifiReadings Starting readings')

        let reading = function() {
          count += 1
          NetInfo.getNetStats($scope.selectedDevice, (netStats) => {
            netStatsList.push(netStats)
          })
        }

        let afterSuccess = function() {
          let netStats = calcMeanNetStats(netStatsList)
          NetInfo.checkRxBitrate($scope.selectedDevice,
            (err, bitrate) => {
              let bps = bitrate * 8

              netStats.bitrate.rx = conversion.bps2Mbps(bps)
                // We update netStats and save antenaPosition to file.
                // (antennaPosition save herself on change through watcher)
              $scope.netStats = netStats
              $scope.positionWithStats = new utils.AntennaPosition(
                $scope.antennaPosition.x,
                $scope.antennaPosition.y,
                netStats
              )
              if (callback) {
                $scope.$apply(callback)
              }
            })
        }

        $timeout(() => {
          $interval(reading, delay, readings).then(afterSuccess)
        }, timeout)
      }

      // function wifiReadings(timeout, delay, readings, callback) {
      //   let netStatsList = []
      //
      //
      //   let afterReadings = function() {
      //     let netStats = calcMeanNetStats(netStatsList)
      //       /* Afther this checkBitrate we modify bitrate in the netStats and
      //       then we set the scope netstas value.
      //       */
      //     checkBitrate(() => {
      //       console.log('(mainCtrl) checkBitrate:', $scope.bitrate)
      //       netStats.bitrate.rx = $scope.bitrate
      //       $scope.netStats = netStats
      //     })
      //
      //     callback(netStatsList)
      //   }
      //
      //   $timeout(() => {
      //     /*
      //     Clear the readings counter.
      //     Empty the reading list.
      //     */
      //     //console.log('Inside timeout function')
      //
      //     $interval(() => {
      //       NetInfo.getNetStats($scope.selectedDevice, (netStats) => {
      //         netStatsList.push(netStats)
      //         $scope.positionWithStats = new utils.AntennaPosition($scope.antennaPosition.x, $scope.antennaPosition.y, netStats)
      //       })
      //     }, delay, readings).then(afterReadings, (error) => {
      //       console.log('WiFi readings error:', error)
      //     })
      //   }, timeout)
      // }

      function init() {
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


        $scope.positionWithStats = null
        $scope.currentPosition = new utils.Position(0, 0)
        $scope.antennaPosition = null


        $scope.fileName = genTimestampedFileName('data', 'WiFiReadings', '.txt')

        // Start data transfer
        curlProcess = startDataTransfer(10, 3000)

        // Stop process on application end.
        app.on('quit', () => {
          curlProcess.quit()
        })

        setDeviceSelectionMenu()

        // Watch changes in positionWithStats -> save values to file.ç
        /* This watcher doesn't require deep check nor to be persistent */
        WatcherTracker.registerWatcher('positionWithStats', $scope,
          (scope) => {
            return scope.positionWithStats
          }, (newValue, oldValue) => {
            console.log('positionWithStats: (new)', newValue, '(old)', oldValue)
            if (newValue) {

              newValue.appendFile($scope.fileName)
            }
          },
          false,
          false
        )

        // Actions to perform when data received from Arduino
        let afterDataCallback = function(data) {
          // Function to react to received data.
          console.log('Readed:', data)
          if ($scope.started) {
            // We need to process the answer from Arduino
            $scope.$apply(() => {
              $scope.antennaPosition = parseArduinoMsg(data, $scope.rows, $scope.columns)
                // When we reach a new position we make a bitrate checkpoit
              NetInfo.checkRxBitrate($scope.selectedDevice)
              console.log('Antenna position:', $scope.antennaPosition)
            })
          }
        }

        let afterConnectCallback = function(error) {
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
                connect(addr, afterDataCallback, afterConnectCallback)
              })
            }, 2500)
          }
        })

        usbDetect.on('remove', (device) => {
          console.log('Removed', device)
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
            connect(addr, afterDataCallback, afterConnectCallback)
          }
        })

        $scope.saveWiFiReadingsFilePath = genTimestampedFileName('Data', 'wifi_stats', 'data')
      }

      $scope.test = function() {

        NetInfo.getRxTxStats($scope.selectedDevice, (err, receive, transmit, timestamp) => {
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
      }

      // function checkBitrate(callback) {
      //   NetInfo.getRx($scope.selectedDevice, (err, bytes, timestamp) => {
      //     if (err) {
      //       console.log(err)
      //     } else {
      //       let elapsedTime
      //       let receivedBytes
      //       let bps
      //       $scope.$apply(function() {
      //         if ($scope.rxStats) {
      //           // console.log('(mainCtrl) checkBitrate rxStats:', $scope.rxStats)
      //
      //           receivedBytes = (bytes - $scope.rxStats.bytes)
      //             // console.log('(mainCtrl) receivedBytes:', receivedBytes)
      //
      //           elapsedTime = timestamp - $scope.rxStats.timestamp
      //             // console.log('(mainCtrl) elapsedTime:', Math.trunc(elapsedTime / 1000))
      //
      //           // we read bytes we need to turn in bits * 8 (-> bps)
      //           // we read milliseconsds we need to turn in secons / 1000 (-> bps)
      //           bps = Math.trunc((receivedBytes * 8) / (elapsedTime / 1000))
      //           $scope.bitrate = conversion.bps2Mbps(bps) // Mbit/s
      //             // console.log('(mainCtrl) ($scope.)bitrate(Mbps):', $scope.bitrate)
      //         } else {
      //           // console.log('(mainCtrl) checkBitrate rxStats was undefined')
      //           $scope.bitrate = 0
      //         }
      //
      //         $scope.rxStats = {
      //           bytes: bytes,
      //           timestamp: timestamp
      //         }
      //         if (callback) {
      //           // console.log('(mainCtrl) checkBitrate calling callback.')
      //           callback()
      //         }
      //       })
      //     }
      //   })
      // }

      self.start = function start() {
        $scope.started = true
          // checkBitrate()

        console.log('starting...')
        console.log('connected:', $scope.connected)
        console.log('mode:', $scope.configuration.mode)

        WatcherTracker.registerWatcher('currentPosition', $scope,
          (scope) => {
            return scope.currentPosition
          }, (newValue, oldValue) => {
            console.log('(mainCtrl) currentPosition changed: (old)', oldValue, '(new)', newValue)
            if (newValue) {
              if (newValue.x === 0 && newValue.y === 0) {
                resetAntennaPosition()
              } else if (!angular.equals(newValue, oldValue)) {
                console.log('They are different!')
                console.log('newValue:', newValue.toString())
                console.log('oldValue:', oldValue.toString())
                if (newValue.x === oldValue.x) {
                  console.log('moving Y')
                  moveAntennaY(newValue.y, $scope.rows, 500)
                } else if (newValue.y === oldValue.y) {
                  console.log('moving X')
                  moveAntennaX(newValue.x, $scope.columns, 500)
                } else {
                  console.log('moving XY')
                  moveAntennaXY(newValue, $scope.rows, $scope.columns, 500)
                }
              }
            } else {
              // We reached the end of the cicle
              console.log('The end.')
              self.stop()
              resetAntennaPosition(1000)
            }
          },
          true,
          false
        )

        // Watch changes in antennaPosition -> trigger wifi readings.
        /* Once Arduino tells us there is a new position ( -> change in
        antennaPosition) we do our readings*/
        let afterWifiReadings = function() {
          console.log('(afterReadings)')
          console.log('configuration mode:', $scope.configuration.mode)
          if ($scope.configuration.mode === 'auto') {
            // If auto mode we proceed to the next position.

            $scope.currentPosition = $scope.currentPosition.next($scope.rows, $scope.columns)
            console.log('new current position: ', $scope.currentPosition)
          } else {
            // We end the process here.
            console.log('CALLING STOP')
            self.stop()
            resetAntennaPosition(1000)
          }
        }

        WatcherTracker.registerWatcher('antennaPosition', $scope,
          (scope) => {
            return scope.antennaPosition
          }, (newValue, oldValue) => {
            console.log('Watching antennaPosition (old)', oldValue, '(new)', newValue, '.')
            if (newValue) {
              // As we know that we are in a new position we check the bitrate.
              // checkBitrate()
              NetInfo.checkRxBitrate($scope.selectedDevice)
                // timeout, delay, readings, filePath, callback
              wifiReadingsV2(1500,
                  $scope.configuration.readingDelay,
                  $scope.configuration.numberOfReadings,
                  afterWifiReadings
                )
                // wifiReadings(1500,
                //   $scope.configuration.readingDelay,
                //   $scope.configuration.numberOfReadings,
                //   afterWifiReadings)
            }
          },
          false,
          false
        )

        /* We restart the warcher in case needed. Watcher already registered
        won't be registered again. */
        WatcherTracker.startWatchers()

        switch ($scope.configuration.mode) {
          case 'auto':
            console.log('Starting in auto mode...')
              // Start of the sequence.
              // $scope.currentPosition = new utils.Position(0, 0)
            $scope.currentPosition = new utils.Position(0, 0)
            console.log('just changed currentPosition:', $scope.currentPosition)
            break
          case 'manual':
            console.log('starting in manual...')
            let [x, y] = parsePosition($scope.manualPosition)
            console.log('currentPosition before: ', $scope.currentPosition)
            $scope.currentPosition = new utils.Position(x, y)
            // $scope.currentPosition.set(x, y)
            console.log('currentPosition after: ', $scope.currentPosition)
            break
        }
      }

      self.stop = function stop() {
        // Stop curl executor
        WatcherTracker.cleanWatchers()
        $scope.started = false
        curlProcess.quit()

        // Deregister watchers.
      }

      init()
    }
  ])
