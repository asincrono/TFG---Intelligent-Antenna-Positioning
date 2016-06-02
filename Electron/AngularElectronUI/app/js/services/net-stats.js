angular.module('MainApp')
  .factory('NetStats', function NetStatFactory() {
    return {
      ls: require('./js/utils/utils.js').testLs,
      listIfaces: require('./js/utils/utils.js').testLs,
      NetStats: require('./js/utils/utils.js').NetStats,
      getNetStats: require('./js/utils/utils.js').getNetStats,
      getRxTx: require('./js/utils/utils.js').getRxTx
    }
  })
