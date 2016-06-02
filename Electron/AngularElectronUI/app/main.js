'use strict'

// const electron = require('electron')
const {app, BrowserWindow} = require('electron')
// const app = electron.app
// const BrowserWindow = electron.BrowserWindow


var mainWindow = null

app.setName('Love')

app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit()
  }
})

app.on('ready', function() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Love'
  })

  mainWindow.loadURL('file://' + __dirname + '/index.html')
//  mainWindow.loadURL('file://' + __dirname + '/index-aux.html')

  mainWindow.on('closed', function() {
    mainWindow = null
  })
})
