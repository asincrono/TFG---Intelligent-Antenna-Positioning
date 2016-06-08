angular.module('MainApp').factory('WatcherTracker', function WatcherTrackerFactory() {
  'use strict'
  class Watch {
    constructor(name, watcherFunc, persistent) {
      this.watcherName = name
      this.watcherFunc = watcherFunc
      this.watcherDeregFunc = null
      this.persistent = persistent
      this.registered = false
    }

    register() {
      if (!this.registered) {
        console.log(this.watcherName, 'registered.')
        this.watcherDeregFunc = this.watcherFunc()
        this.registered = true
      }
    }

    deregister() {
      if (this.registered) {
        console.log(this.watcherName, 'deregistered.')
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

  function remove(name) {
    let limit = watchList.length

    for (let i = 0; i < length; i += 1) {
      if (watchList[i].watcherName === name) {
        let watcher = watchList.splice(i, 1)
        wather.deregister()
        return true
      }
    }
    return false
  }

  function removeByPrefix(name) {
    let limit = watchList.length
    let count = 0
    let idxList = []
    let regExp = new RegExp(`^${name}`)

    // We deregister all the watchers which wathcerName starts by name
    // and we store they idx
    watchList.forEach((watch, idx, arr) => {
      if (regExp.test(watch.watherName)) {
        idxList.push(idx)
        watch.deregister()
      }
    })

    // We remove (asign null) the postions selected before.
    idxList.forEach((idx) => {
      watchList[idx] = null
    })

    // We prune the array of watchers from null values.
    let idx = 0
    while (idx < limit) {
      if (watchList[idx]) {
        idx += 1
      } else {
        watchList.splice(idx, 1)
        limit -= 1
      }
    }
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
