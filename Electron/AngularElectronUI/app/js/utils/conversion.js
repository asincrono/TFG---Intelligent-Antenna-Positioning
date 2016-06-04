'use strict'

function bps2Bps(bps) {
  return Math.trunc(bps / 8)
}

function bps2Kbps(bps) {
  return Math.trunc(bps / 1000)
}

function bps2KBps(bps) {
  return Math.trunc(bps / 8000)
}

function bps2Mbps(bps) {
  return Math.trunc(bps / 1000000)
}

function bps2MBps(bps) {
  return Math.trunc(bps / 8000000)
}

function decCoordToPercent(x, slices) {
  if (x === 0) {
    return 0
  }
  if (x > slices) {
    return undefined
  }
  let xStep = Math.floor(100 / slices)
  return x * xStep
}

function percentCoordToDec(x, tol, steps) {
  let step = 100 / (steps - 1)
  let position = 0
  for (let i = 0; i < steps; i += 1) {
    position = i * step
    if (Math.abs(position - x) <= tol) {
      return i
    } else if (x < position) {
      throw new RangeError(`${x} isn't valid (tolerance: ${tol} nearest position: ${position}`)
    }
  }
  return undefined
}

exports.bps2Bps = bps2Bps
exports.bps2Kbps = bps2Kbps
exports.bps2KBps = bps2KBps
exports.bps2Mbps = bps2Mbps
exports.bps2MBps = bps2MBps
exports.decCoordToPercent = decCoordToPercent
exports.percentCoordToDec = percentCoordToDec
