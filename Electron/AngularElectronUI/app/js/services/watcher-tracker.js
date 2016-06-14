angular.module('MainApp').factory('WatcherTracker', function WatcherTrackerFactory() {
  'use strict'
  class Watch {
    constructor (name, watcherFunc, persistent) {
      this.watcherName = name
      this.watcherFunc = watcherFunc
      this.watcherDeregFunc = null
      this.persistent = persistent
      this.registered = false
    }

    register () {
      if (!this.registered) {
        console.log(this.watcherName, 'registered.')
        this.watcherDeregFunc = this.watcherFunc()
        this.registered = true
      }
    }

    deregister () {
      if (this.registered) {
        console.log(this.watcherName, 'deregistered.')
        this.watcherDeregFunc()
        this.registered = false
      }
    }
  }

  let watchList = []

  function registerWatcher (name, scope, toWatch, toDo, deepCheck, persistent) {
    let watcherFunc = function () {
      return scope.$watch(toWatch, toDo, deepCheck)
    }
    let watch = new Watch(name, watcherFunc, persistent)
    watch.register()

    watchList.push(watch)
  }

  function stopWatchers () {
    watchList.forEach((watch) => {
      watch.deregister()
    })
  }

  function startWatchers () {
    watchList.forEach((watch) => {
      watch.register()
    })
  }

  function stopByPrefix (prefix) {
    watchList.forEach((watch, idx, arr) => {
      if (watch.watcherName.startsWith(prefix)) {
        watch.deregister()
      }
    })
  }

  function startByPrefix (prefix) {
    watchList.forEach((watch, idx, arr) => {
      if (watch.watcherName.startsWith(prefix)) {
        watch.register()
      }
    })
  }

  function cleanWatchers () {
    watchList.forEach((watch) => {
      watch.deregister()
    })
    watchList = watchList.filter((watch) => {
      return watch.persistent
    })
  }

  function remove (name) {
    let limit = watchList.length

    for (let i = 0; i < limit; i += 1) {
      if (watchList[i].watcherName === name) {
        let watcher = watchList.splice(i, 1)
        watcher.deregister()
        return true
      }
    }
    return false
  }

  function removeByPrefix (name) {
    let limit = watchList.length
    let idxList = []
    let regExp = new RegExp(`^${name}`)

    // We deregister all the watchers which wathcerName starts by name
    // and we store they idx
    watchList.forEach((watch, idx, arr) => {
      if (regExp.test(watch.watcherName)) {
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

  function hasWatcher (name) {
    let limit = watchList.length
    for (let i = 0; i < limit; i += 1) {
      if (watchList[i].name === name) {
        return true
      }
    }
    return false
  }

  function getWatcher (name) {
    let watcher = null
    let limit = watchList.length
    for (let i = 0; i < limit; i += 1) {
      if (watchList[i].name === name) {
        watcher = watchList[i]
      }
    }
    return watcher
  }

  function count () {
    return watchList.length
  }

  return {
    registerWatcher: registerWatcher,
    cleanWatchers: cleanWatchers,
    startWatchers: startWatchers,
    stopWatchers: stopWatchers,
    stopByPrefix: stopByPrefix,
    startByPrefix: startByPrefix,
    removeByName: remove,
    removeByPrefix: removeByPrefix,
    hasWatcher: hasWatcher,
    getWatcher: getWatcher,
    count: count
  }
})
