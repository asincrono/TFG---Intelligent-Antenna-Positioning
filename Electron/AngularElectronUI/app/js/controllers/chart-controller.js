angular.module('MainApp').controller('ChartController', ['$scope', '$interval', function($scope, $interval) {

      $scope.data = {
        dataset0: [
          {x: 0, val_1: 0, val_2: 0, val_3: 0},
          {x: 1, val_1: 3.894, val_2: 8.47, val_3: 14.347},
          {x: 2, val_1: 7.174, val_2: 13.981, val_3: 19.991},
          {x: 3, val_1: 9.32, val_2: 14.608, val_3: 13.509},
          {x: 4, val_1: 9.996, val_2: 10.132, val_3: -1.167},
          {x: 5, val_1: 9.093, val_2: 2.117, val_3: -15.136},
          {x: 6, val_1: 6.755, val_2: -6.638, val_3: -19.923},
          {x: 7, val_1: 3.35, val_2: -13.074, val_3: -12.625}
        ]
      }

    $scope.options = {
      series: [
        {
          axis: "y",
          dataset: "dataset0",
          key: {
            val_1

                    }
          label: "An area series",
          color: "#1f77b4",
          type: ['line', 'dot', 'area'],
          id: 'mySeries0'
        }
      ],
      axes: {x: {key: "x"}}
    }
  // $scope.options = {
  //   margin: {
  //     top: 5
  //   },
  //   pan: {
  //     x: true
  //   },
  //   series: [{
  //     label: 'Level',
  //     color: 'red',
  //     type: ['line', 'dot'],
  //     axis: 'y',
  //     dataset: 'd',
  //     key: 'lv',
  //     id: 'level'
  //   }, {
  //     label: 'Bitrate',
  //     color: 'blue',
  //     type: ['line', 'dot'],
  //     axis: 'y2',
  //     dataset: 'd',
  //     key: 'br',
  //     id: 'bitrate'
  //   }],
  //   axes: {
  //     x: {
  //       key: 'x',
  //       min: 0,
  //       max: 5
  //     },
  //     y: {
  //       min: 0,
  //       max: 20
  //     },
  //     y2: {
  //       min: 0,
  //       max: -100
  //     }
  //   }
  // }
  //
  // $scope.data = {
  //   d: [{
  //     x: 0,
  //     lv: 0,
  //     br: -100
  //   }]
  // }
  //
  // let x = 0
  // let l = 0
  // let b = -100
  //
  // $interval(() => {
  //   $scope.data.d.push({
  //     x: x += 1,
  //     lv: l += 0.1,
  //     br: b += 10
  //   })
  //
  //   if (x > 5) {
  //     $scope.options.axes.x.min += 1
  //     $scope.options.axes.x.max += 1
  //   }
  // }, 1000, 9)

  // $scope.options = {
  //   margin: {
  //     top: 5
  //   },
  //   series: [{
  //     axis: "y",
  //     dataset: "tolerance",
  //     key: "average",
  //     label: "Main series",
  //     color: "hsla(88, 48%, 48%, 1)",
  //     type: [
  //       "dot",
  //       "line"
  //     ],
  //     id: "tolerance"
  //   }, {
  //     axis: "y2",
  //     dataset: "tolerance",
  //     key: "extrema_min",
  //       // y1: "extrema_max"
  //     label: "Extrema",
  //     color: "hsla(88, 48%, 48%, 1)",
  //     type: [
  //       "line", "dot"
  //     ],
  //     id: "extrema"
  //   }],
  //   axes: {
  //     x: {
  //       key: "x"
  //     },
  //     y: {
  //       min: 0,
  //       max: 40
  //     },
  //     y2: {
  //       min: 0,
  //       max: 100
  //     }
  //   }
  // }
  //
  // $scope.data = {
  //   tolerance: [{
  //     x: 0,
  //     average: 23,
  //     extrema_min: 19,
  //     extrema_max: 26
  //   }, {
  //     x: 1,
  //     average: 23,
  //     extrema_min: 20,
  //     extrema_max: 28
  //   }, {
  //     x: 2,
  //     average: 20,
  //     extrema_min: 15,
  //     extrema_max: 23
  //   }, {
  //     x: 3,
  //     average: 22,
  //     extrema_min: 18,
  //     extrema_max: 24
  //   }, {
  //     x: 4,
  //     average: 23,
  //     extrema_min: 18,
  //     extrema_max: 25
  //   }, {
  //     x: 5,
  //     average: 20,
  //     extrema_min: 18,
  //     extrema_max: 25
  //   }, {
  //     x: 6,
  //     average: 21,
  //     extrema_min: 19,
  //     extrema_max: 25
  //   }, {
  //     x: 7,
  //     average: 25,
  //     extrema_min: 21,
  //     extrema_max: 30
  //   }, {
  //     x: 8,
  //     average: 22,
  //     extrema_min: 18,
  //     extrema_max: 26
  //   }, {
  //     x: 9,
  //     average: 21,
  //     extrema_min: 17,
  //     extrema_max: 24
  //   }]
  // }
}])
