'use strict'

function drawVisualization(data, containerId) {
  let wrapper =  new google.visualization.ChartWrapper({
    chartType: 'Line',
    dataTable:data,
    options: {'title': 'Signal strength'},
    containerId: containerId
  })
  wrapper.draw()
}

function createDataTable(yLabel, xLabel, dataPairsArr) {
  let data = new google.visualization.DataTable()

  data.addColumn(...yLabel)
  data.addColumn(...xLabel)
  data.addRows(dataPairsArr)

  return data
}
