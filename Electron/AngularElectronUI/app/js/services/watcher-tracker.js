angular.module('MainApp').factory('WatcherTracker', function WatcherTrackerFactory () {
  'use strict'
  class Watch {
    constructor(watcherFunc, persistent) {
      this.watcherFunc = watcherFunc
      this.watcherDeregFunc = null
      this.persistent = persistent
    }

    register() {
      if (!this.registered) {
        this.watcherDeregFunc = this.watcherFunc()
      }
    }

    deregister() {
      if (this.registered) {
        this.watcherDeregFunc()
      }
    }
  }

  let watchList = []

  function registerWatcher(scope, toWatch, toDo, deepCheck, persistent) {
    let watcherFunc = function() {
      return scope.$watch(toWatch, toDo, deepCheck)
    }
    let watch = new Watch(watcherFunc, persistent)

    watch.register()

    watchList.push(watch)
  }

  function stopWatchers() {
    watchList.forEach((watch) => {
      watch.deregister()
    })
  }

  function startWatchers() {
    watchList.forEach((watch) => {
      watch.register()
    })
  }

  function cleanWatchers() {
    watchList.forEeach((watch) => {
      watch.deregister()
    })

    watchList = watchList.filter((watch) => {
      return watch.persistent
    })
  }

  function count() {
    return watchList.length
  }

  return {
    registerWatcher: registerWatcher,
    cleanWatchers: cleanWatchers,
    startWatchers: startWatchers,
    stopWatchers: stopWatchers,
    count: count
  }
})
