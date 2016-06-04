angular.module('MainApp').factory('WatcherTracker', function WatcherTrackerFactory () {
  'use strict'
  let warcherDeregistrationFunctionList = []

  function registerWatcher(scope, toWatch, toDo, deepCheck) {
    let watcherDeregFunc = scope.$watch(toWatch, toDo, deepCheck)
    warcherDeregistrationFunctionList.push(watcherDeregFunc)
  }

  function cleanWatchers() {
    watcherDeregistrationFunctionList.forEach((deregFunc) => {
      deregFunc()
    })
    watcherDeregistrationFunctionList = []
  }

  function count() {
    return watcherDeregistrationFunctionList.length
  }

  return {
    registerWatcher: registerWatcher,
    cleanWatchers: cleanWatchers,
    count: count
  }
})
