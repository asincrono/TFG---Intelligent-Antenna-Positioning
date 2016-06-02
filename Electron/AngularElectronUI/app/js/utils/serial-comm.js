'use strict'

const serialport = require('serialport')

const SER_PORT_ADDR = '/dev/cu.usbmodem1411'
const SER_PORT_OPTS = {
  baudRate: 9600,
  parser: serialport.parsers.readLine('\n')
}

var port // Local variable to the module.

function lsSerialPorts(callback) {
  serialport.list(callback)
}

function openPort(callback) {
  port = serialport.SerialPort(SER_PORT_ADDR, SER_PORT_OPTS, true, callback)
}

function setComm(onReadCallback) {
  port.on('data', onReadCallback)
}

function closeComm(port.close())

function write(msg) {
  port.write(msg)
}


