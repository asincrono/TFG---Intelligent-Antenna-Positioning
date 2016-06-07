angular.module('MainApp').factory('WatcherTracker', function WatcherTrackerFactory () {
  'use strict'
  class Watch {
    constructor(name, watcherFunc, persistent) {
      this.watchName = name
      this.watcherFunc = watcherFunc
      this.watcherDeregFunc = null
      this.persistent = persistent
      this.registered = false
    }

    register() {
      if (!this.registered) {
        console.log(this.watchName, 'registered.')
        this.watcherDeregFunc = this.watcherFunc()
        this.registered = true
      }
    }

    deregister() {
      if (this.registered) {
        console.log(this.watchName, 'deregistered.')
        this.watcherDeregFunc()
        this.registered = false
      }
    }
  }

  let watchList = []

  function registerWatcher(name, scope, toWatch, toDo, deepCheck, persistent) {
    let watcherFunc = function() {
      return scope.$watch(toWatch, toDo, deepCheck)
    }
    let watch = new Watch(name, watcherFunc, persistent)
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
    watchList.forEach((watch) => {
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
