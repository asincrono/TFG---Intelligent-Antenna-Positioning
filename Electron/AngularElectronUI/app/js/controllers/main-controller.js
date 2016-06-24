/*global angular app MenuItem Menu appMenu */
angular.module('MainApp')
  .controller('MainController', ['$scope', '$timeout', '$interval', 'NetInfo', 'ArduinoComm', 'WatcherTracker',
    function ($scope, $timeout, $interval, NetInfo, ArduinoComm, WatcherTracker) {
      'use strict'

      const usbDetect = require('usb-detection')
      const path = require('path')
      const utils = require('./js/utils/utils.js')
      const conversion = require('./js/utils/conversion.js')

      const MSG_MOVE_XY_CODE = 0

      const MOTOR_X_CODE = 1
      const MOTOR_Y_CODE = 2

      const RECONNECT_MAX_TRIES = 3
      const RECONNECT_TIMEOUT = 5000

      const BAUD_RATE = 9600
      const TOLERANCE = 5
      const MOTOR_SPEED = 250
      const POLL_DELAY = 15
      const MAX_TRIES = 100

      const URL = 'ftp://192.168.0.1/TFG/rnd_file_1GB.data'
      const USER = 'tfg'
      const PASS = 'tfg'
      const CURL_CMD = 'curl'
      const CURL_ARGS = ['-o', '/dev/null', '-u', `${USER}:${PASS}`, '-w', '"%{speed_download}"', URL]

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

      const MOTOR_X_SPEED_MATRIX = new utils.Matrix2D(DEFAULTS.rows, DEFAULTS.columns)
      MOTOR_X_SPEED_MATRIX.setDefault(215)

      const MOTOR_Y_SPEED_MATRIX = new utils.Matrix2D(DEFAULTS.rows, DEFAULTS.columns)
      MOTOR_Y_SPEED_MATRIX.setDefault(215)
      MOTOR_Y_SPEED_MATRIX.set(4, 4, 256)

      const MSG_ARGS = {
        tolerance: TOLERANCE,
        motorSpeed: 215,
        pollDelay: POLL_DELAY,
        maxTries: MAX_TRIES
      }

      const MSG_ARGS_MOTOR_X = {
        tolerance: 5,
        baseSpeed: 175,
        maxSpeed: 230,
        pollDelay: 15,
        maxTries: 50
      }

      const MSG_ARGS_MOTOR_Y = {
        tolerance: 5,
        baseSpeed: 175,
        maxSpeed: 230,
        pollDelay: 15,
        maxTries: 50
      }

      let self = this

      let curlProcess

      function setDeviceSelectionMenu () {
        let selectDevice = {
          label: 'Select device',
          submenu: []
        }

        // We'll filter out devices starting by 'lo' and 'en' (only for linux).
        let devices = NetInfo.listIfaces().filter((iface) => {
          return !(iface.startsWith('lo') || iface.startsWith('en'))
        })
        let selected = false
        let checkThis = false
        devices.forEach((device) => {
          // We select the first avaliable device and we check it.
          if (!selected) {
            $scope.selectedDevice = device
            checkThis = true
            selected = true
          }

          let deviceMenu = {
            label: device,
            type: 'radio',
            checked: false,
            click (item, focusedWindow) {
              console.log('clicked', device)
              $scope.$apply(() => {
                $scope.selectedDevice = device
              })
            }
          }

          // We check the first valid device found.
          if (checkThis) {
            deviceMenu.checked = true
            checkThis = false
          }

          selectDevice.submenu.push(deviceMenu)
        })
        let selectDeviceMenu = new MenuItem(selectDevice)
        appMenu.insert(3, selectDeviceMenu)
        Menu.setApplicationMenu(appMenu)
      }

      /**
       * Returns a valid wireless interface name or undefined if there is no
       * valid interface.
       * @return {String} A valid wireless interface name or undefined if ins't.
       */
      function getDefaultIface () {
        let ifList = NetInfo.listIfaces().filter((iface) => {
          return !(iface.search(/^en/) || iface.search(/^lo/))
        })
        return ifList.pop()
      }

      /** Runs a command in an Executor object. If an error occours after delay
       * it will try to run the command again up to a maximum of maxTries.
       *
       * @param  {String} cmd      The command to be executed.
       * @param  {array} args     Array of strings with the command args.
       * @param  {number} maxTries Max number of retries. 0 will retry without end.
       * @param  {number} delay    Milliseconsd between retries.
       * @return {object}          Executor object that will stop the command execution.
       */
      function runCmdOnExecutor (cmd, args, maxTries, delay) {
          // Initiate the curl command data transmission
        let executor = new utils.Executor(cmd, args, (err, stdout, stderr) => {
          if (err) {
            console.log(err)
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
      function startDataTransfer (retries, delay, timeout) {
        let curl_args = CURL_ARGS.slice()
          // --retry argument
        if (retries) {
          curl_args.push('--retry')
          curl_args.push(retries)
        }
        // --connect-timeot
        if (timeout) {
          curl_args.push('--connect-timeot')
          curl_args.push(timeout)
        }
        // curl argument --retry-delay
        if (delay) {
          curl_args.push('--retry-delay')
          curl_args.push(Math.trunc(delay / 1000))
        }
        return runCmdOnExecutor(CURL_CMD, CURL_ARGS)
      }

      function genMXYMsg (position, rows, cols, args) {
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

      function genMMsg (motor, dest, segments, args) {
        let step = 99 / (segments - 1)
        let percent = utils.leftPad(Math.trunc(dest * step), 2, '0')

        let t = utils.leftPad(args.tolerance ? args.tolerance : TOLERANCE, 2, '0')
        let bS = utils.leftPad(args.baseSpeed ? args.baseSpeed : MOTOR_SPEED, 3, '0')
        let mS = utils.leftPad(args.maxSpeed ? args.maxSpeed : MOTOR_SPEED, 3, '0')
        let pD = utils.leftPad(args.pollDelay ? args.pollDelay : POLL_DELAY, 3, '0')
        let mT = utils.leftPad(args.maxTries ? args.maxTries : MAX_TRIES, 3, '0')
        return `${motor}${percent}${t}${bS}${mS}${pD}${mT}\n`
      }

      function sendMsg (msg, callback) {
        ArduinoComm.writeMsg($scope.port, msg, callback)
      }

      /*
      The rensponse message from Arduino will be in the form: "x,y"
      x (y) will be the slider "X" ("Y") capacitor reating (0~1000) mapped to the range [0, 99].
      */

      function parseArduinoMsg (data, rows, columns, tolerance) {
        let coords = data.split(',')

        rows = rows || DEFAULTS.rows
        columns = columns || DEFAULTS.columns
        tolerance = tolerance || DEFAULTS.systemTolerance

        if (coords.length === 2) {
          let x = conversion.percentCoordToDec(Number(coords[0]), tolerance, rows)
          let y = conversion.percentCoordToDec(Number(coords[1]), tolerance, columns)
          let position = new utils.Position(x, y)
          return position
        }
      }

      /*
      Functions to setup and communicate with Arduino.
      */

      function genTimestampedFileName (dir, baseName, extension) {
        let timestampStr = new Date().toISOString()
        let fileName = `${timestampStr}-${baseName}`
        return path.format({
          dir: dir,
          name: fileName,
          ext: extension
        })
      }

      // To parse the keyboard introduced manual position.
      function parsePosition (positionStr) {
        let x = 0
        let y = 0
        if (positionStr) {
          let values = positionStr.split(',')
          x = parseInt(values[0], 10)
          y = parseInt(values[1], 10)
        }
        console.log('parsePosition x, y: ', x, y)
        return [x, y]
      }

      function moveAntennaX (pos, steps, timeout) {
        // console.log('moving X')
        MSG_ARGS_MOTOR_X.maxSpeed = MOTOR_X_SPEED_MATRIX.get(pos.x, pos.y)
        let msg = genMMsg(MOTOR_X_CODE, pos, steps, MSG_ARGS_MOTOR_X)
        // console.log('moving x msg:', msg)
        if (timeout) {
          $timeout(function () {
            sendMsg(msg)
          }, timeout)
        } else {
          sendMsg(msg)
        }
      }

      function moveAntennaY (pos, steps, timeout) {
        // console.log('moving Y')
        console.log('msg args motor y:', MSG_ARGS_MOTOR_Y)
        console.log('motor y speed matrix:', MOTOR_Y_SPEED_MATRIX.toString())
        MSG_ARGS_MOTOR_Y.maxSpeed = MOTOR_Y_SPEED_MATRIX.get(pos.x, pos.y)
        let msg = genMMsg(MOTOR_Y_CODE, pos, steps, MSG_ARGS_MOTOR_Y)
        // console.log('moving y msg:', msg)
        if (timeout) {
          $timeout(function () {
            sendMsg(msg)
          }, timeout)
        } else {
          sendMsg(msg)
        }
      }

      function moveAntennaXY (position, steps, timeout) {
        let msg = genMXYMsg(position, $scope.rows, $scope.columns, MSG_ARGS)
        console.log('moving antenna to', position.toString())

        if (timeout) {
          $timeout(function () {
            sendMsg(msg)
          }, timeout)
        } else {
          sendMsg(msg)
        }
      }

      function resetAntennaPosition (timeout) {
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

      function connect (addr, dataCallback, afterCallback) {
        if ($scope.port === undefined || !$scope.port.isOpen()) {
          let openCallback = function (error) {
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

      function disconnect () {
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

      function calcMeanNetStats (netStatsList) {
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

      function wifiReadingsV2 (timeout, delay, readings, callback) {
        let netStatsList = []
        let count = 0
        console.log('wifiReadings Starting readings')

        let reading = function () {
          count += 1
          NetInfo.getNetStats($scope.selectedDevice, (netStats) => {
            netStatsList.push(netStats)
          })
        }

        let afterSuccess = function () {
          let netStats = calcMeanNetStats(netStatsList)
          NetInfo.checkRxBitrate($scope.selectedDevice,
            (err, bitrate) => {
              if (err) throw err
              netStats.bitrate.rx = bitrate.getMbps().toFixed(3)
                // We update netStats and save antenaPosition to file.
                // (antennaPosition save herself on change through watcher)
              $scope.netStats = netStats
              $scope.positionWithStats = new utils.AntennaPosition(
                $scope.antennaPosition.x,
                $scope.antennaPosition.y,
                netStats
              )
              $scope.positionList.push($scope.positionWithStats)
              if (callback) {
                $scope.$apply(callback)
              }
            })
        }

        $timeout(() => {
          $interval(reading, delay, readings).then(afterSuccess)
        }, timeout)
      }

      function bestPositionLevel (positionList) {
        let maxPos
        if (positionList && positionList.length > 0) {
          maxPos = positionList[0]

          positionList.forEach((position) => {
            if (position.stats.level > maxPos.stats.level) {
              maxPos = position
            }
          })
        }
        return maxPos
      }

      function bestPositionBitrate (positionList) {
        let maxPos
        if (positionList && positionList.length > 0) {
          maxPos = positionList[0]

          positionList.forEach((position, idx, arr) => {
            if (position.stats.bitrate.rx > maxPos.stats.bitrate.rx) {
              maxPos = position
            }
          })
        }
        return maxPos
      }

      function init () {
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
        $scope.positionList = []
        $scope.currentPosition = new utils.Position(0, 0)
        $scope.antennaPosition = null

        $scope.fileName = genTimestampedFileName('data', 'WiFiReadings', '.txt')

        // Start data transfer
        curlProcess = startDataTransfer(10, 3000, 3000)

        // Stop process on application end.
        app.on('quit', () => {
          curlProcess.quit()
        })

        setDeviceSelectionMenu()

        // Watch changes in positionWithStats -> save values to file.ç
        /* This watcher doesn't require deep check nor to be persistent */
        WatcherTracker.registerWatcher('mainCtrl_positionWithStats', $scope,
          scope => scope.positionWithStats,
          (newValue, oldValue) => {
            console.log('positionWithStats: (new)', newValue, '(old)', oldValue)
            if (newValue) {
              // I must save time, position, level and bitrate
              newValue.appendFile($scope.fileName)
            }
          },
          false,
          false
        )

        // Actions to perform when data received from Arduino
        let afterDataCallback = function (data) {
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

        let afterConnectCallback = function (error) {
          if (!error) {
            $scope.port.on('close', (err) => {
              if (err) throw err
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
                if (err) {
                  throw err
                } else {
                  console.log('Arduino serial addr:', addr)
                  connect(addr, afterDataCallback, afterConnectCallback)
                }
              })
            }, 500)
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
        ArduinoComm.getAddr((err, addr) => {
          if (err) throw err
          if (addr) {
            console.log('Arduino serial addr:', addr)
            connect(addr, afterDataCallback, afterConnectCallback)
          }
        })

        $scope.saveWiFiReadingsFilePath = genTimestampedFileName('Data', 'wifi_stats', 'data')
      }

      $scope.test = function () {
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

      self.start = function start () {
        $scope.started = true

        console.log('starting...')
        console.log('connected:', $scope.connected)
        console.log('mode:', $scope.configuration.mode)

        console.log('setting initial position')
        $scope.currentPosition.set(0, 0)

        // We check for the existence of the watcher.
        let currentPositionWatcher = WatcherTracker.getWatcher('mainCtrl_currentPosition')
        if (currentPositionWatcher) {
          // If the wacther already exist we register it again.
          currentPositionWatcher.register()
        } else {
          // If it doesn't exist, we create and register it.
          WatcherTracker.registerWatcher('mainCtrl_currentPosition', $scope,
            scope => scope.currentPosition,
            (newValue, oldValue) => {
              console.log('(mainCtrl) currentPosition changed: (old)', oldValue.toString(), '(new)', newValue.toString())
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
                  // lets go to the best position.
                  // TODO: Implement goint to the best position.
              }
            },
            true,
            false
          )
        }
        // Watch changes in antennaPosition -> trigger wifi readings.
        /* Once Arduino tells us there is a new position ( -> change in
        antennaPosition) we do our readings*/

        let afterWifiReadings = function () {
          console.log('(afterReadings)')
          console.log('configuration mode:', $scope.configuration.mode)
          if ($scope.configuration.mode === 'auto') {
            // If auto mode we proceed to the next position.

            $scope.currentPosition.next($scope.rows, $scope.columns)
            console.log('new current position: ', $scope.currentPosition)
              // The end will be when currentPosition.next(returns false) and
              // positions don't change anymore.
          } else {
            // We end the process here.
            console.log('The end.(manual mode)')
            self.stop()
            resetAntennaPosition(1000)
          }
        }

        /* In case this isn't the first run, we check for the existence of
        a watcher with this name */
        let antennaPositionWatcher = WatcherTracker.getWatcher('mainCtrl_antennaPosition')
        if (antennaPositionWatcher) {
          // If the watcher alreay exist, we start it again.
          antennaPositionWatcher.register()
        } else {
          // If doesn't exist we crate it.
          WatcherTracker.registerWatcher('mainCtrl_antennaPosition', $scope,
          scope => scope.antennaPosition,
          (newValue, oldValue) => {
            console.log('Watching antennaPosition (old)', oldValue, '(new)', newValue, '.')
            if (newValue) {
              // As we know that we are in a new position we check the bitrate.
              NetInfo.checkRxBitrate($scope.selectedDevice)
              // timeout, delay, readings, filePath, callback
              wifiReadingsV2(1500,
                $scope.configuration.readingDelay,
                $scope.configuration.numberOfReadings,
                afterWifiReadings)
                // wifiReadings(1500,
                //   $scope.configuration.readingDelay,
                //   $scope.configuration.numberOfReadings,
                //   afterWifiReadings)
            }
          },
          false,
          false)
        }

        switch ($scope.configuration.mode) {
          case 'auto':
            console.log('Starting in auto mode...')
              // Start of the sequence.
              // $scope.currentPosition = new utils.Position(0, 0)
              // I need to use this timeout to force the watcher to see this change

            $timeout(() => {
              $scope.currentPosition.set(0, 0)
            }, 1)
            console.log('just changed currentPosition:', $scope.currentPosition)
            break
          case 'manual':
            console.log('starting in manual...')
            let [x, y] = parsePosition($scope.manualPosition)
            $timeout(() => {
              $scope.currentPosition.set(x, y)
            }, 1)
            // $scope.currentPosition.set(x, y)
            break
        }
      }

      self.stop = function stop () {
        $scope.started = false
        // Stop curl executor
        curlProcess.quit()

        // Deregister watchers.
        // We only need to stop the watchers in main controller as the ones
        // in canvas and chart controllers should still keep working.
        WatcherTracker.stopByPrefix('mainCtrl')
      }

      init()
    }
  ])
