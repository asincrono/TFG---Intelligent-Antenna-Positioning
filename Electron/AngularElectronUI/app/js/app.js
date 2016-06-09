'use strict'

const utils = require('./js/utils/utils.js')

// const {exec, execFile, spawn} = require('child_process')

// const path = require('path')

const os = require('os')

// const usbDetect = require('usb-detection')

const {app, Menu, MenuItem} = require('electron').remote

const menuTemplate = [
 {
   label: 'View',
   submenu: [
     {
       label: 'Reload',
       accelerator: 'CmdOrCtrl+R',
       click(item, focusedWindow) {
         if (focusedWindow) focusedWindow.reload()
       }
     },
     {
       label: 'Toggle Full Screen',
       accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
       click(item, focusedWindow) {
         if (focusedWindow)
           focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
       }
     },
     {
       label: 'Toggle Kiosk Mode',
       accelerator: process.platform === 'darwin' ? 'Ctrl+Command+K' : 'F12',
       click(item, focusedWindow) {
         if (focusedWindow)
           focusedWindow.setKiosk(true)
       }
     },
     {
       label: 'Toggle Developer Tools',
       accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
       click(item, focusedWindow) {
         if (focusedWindow)
           focusedWindow.webContents.toggleDevTools()
       }
     },
   ]
 },
 {
   label: 'Window',
   role: 'window',
   submenu: [
     {
       label: 'Minimize',
       accelerator: 'CmdOrCtrl+M',
       role: 'minimize'
     },
     {
       label: 'Close',
       accelerator: 'CmdOrCtrl+W',
       role: 'close'
     },
   ]
 },
 {
   label: 'Help',
   role: 'help',
   submenu: [
     {
       label: 'Learn More',
       click() { require('electron').shell.openExternal('http://electron.atom.io') }
     },
   ]
 },
]

if (process.platform === 'darwin') {
 const name = app.getName()
 menuTemplate.unshift({
   label: name,
   submenu: [
     {
       label: 'About ' + name,
       role: 'about'
     },
     {
       type: 'separator'
     },
     {
       label: 'Services',
       role: 'services',
       submenu: []
     },
     {
       type: 'separator'
     },
     {
       label: 'Hide ' + name,
       accelerator: 'Command+H',
       role: 'hide'
     },
     {
       label: 'Hide Others',
       accelerator: 'Command+Alt+H',
       role: 'hideothers'
     },
     {
       label: 'Show All',
       role: 'unhide'
     },
     {
       type: 'separator'
     },
     {
       label: 'Quit',
       accelerator: 'Command+Q',
       click() { app.quit(); }
     },
   ]
 })
 // Window menu.
 menuTemplate[2].submenu.push(
   {
     type: 'separator'
   },
   {
     label: 'Bring All to Front',
     role: 'front'
   }
 )
}

// make d3 accessible
const d3 = require('d3')

const appMenu = Menu.buildFromTemplate(menuTemplate)
Menu.setApplicationMenu(appMenu)
// MAYBE ADD CONTEXT MENU?
// window.addEventListener('contextmenu', (e) => {
//   e.preventDefault()
//   menu.popup(remote.getCurrentWindow())
// }, false)

angular.module('MainApp', ['ngMaterial', 'n3-line-chart'])
