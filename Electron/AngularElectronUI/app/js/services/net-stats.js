angular.module('MainApp')
  .factory('NetStats', function NetStatFactory() {
    return {
      listIfaces: require('./js/utils/utils.js').listIfaces,
      NetStats: require('./js/utils/utils.js').NetStats,
      getNetStats: require('./js/utils/utils.js').getNetStats,
      getRxTxDrop: require('./js/utils/utils.js').getRxTxDrop
    }
  })
