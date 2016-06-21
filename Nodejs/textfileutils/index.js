'use strict'

const fs = require('fs')

const minimist = require('minimist')

const argv = minimist(process.argv.slice(2))

function clean (fileIn) {
  fs.readFile(fileIn, 'utf8', (err, data) => {
    if (err) throw err
    let outData = data.replace(/,/g, ' ')
    let lines = outData.split('\n')
    let linesOut = []
    let limit = lines.length
    for (let i = 0; i < limit; i += 1) {
      let values = lines[i].split(/\s+/)
      linesOut.push(values.slice(2).join(' '))
    }
    outData = linesOut.join('\n')
    fs.writeFile(fileIn, outData, (err) => {
      if (err) throw err
    })
  })
}

function init () {
  let file = argv.f

  if (file) {
    clean(file)
  } else {
    throw new Error('you need to supply a file name')
  }
}

init()
