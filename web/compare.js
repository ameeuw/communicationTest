Highcharts.setOptions({
  colors: ["#FF0000", "#FF7400", "#FFE900", "#A0FF00", "#2BFF00", "#00FF49", "#00FFBD", "#00CBFF", "#0057FF", "#1D00FF", "#9200FF", "#FF00F7", "#FF0082", "#FF000D"]
})

let chartOptions = {
  chart: {
    type: 'line',
    backgroundColor:'rgba(255, 255, 255, 0.8)',
    style: {
      fontFamily: "Computer Modern Serif",
      fontSize: "24px"
    },
    marginTop: 35
  },
  credits: {
    enabled: false
  },
  exporting: {
    sourceWidth: 1200,
    scale: 1,
    chartOptions: {
      title: {
        text: ' '
      },
      chart:{
        height: this.chartHeight,
        style: {
          "font-family": "CMU Serif Roman"
        }
      }
    },
    fallbackToExportServer: false
  },
  title: {
    text: ''
  },
  xAxis: {
    title: {
      text: 'Requests per second [Hz]',
      style: { fontSize: "22px" }
    },
    labels: {
      style: { "font-size": "20px" }
    }
  },
  yAxis: {
    type: "logarithmic",
    minorTickInterval: 0.1,
    title: {
      text: '',
      style: { fontSize: "22px" }
    },
    labels: {
      style: { "font-size": "20px" }
    }
  },
  legend: {
    enabled: true,
    itemStyle: { "font-size": "20px" }
  },
  plotOptions: {
    series: {
      pointWidth: 1,
      animation: false
    }
  },
  series: []
}

let seriesTemplate = {
  name: '',
  type: 'line',
  data: [],
  yAxis: 0,
  stacking: false,
  index: 0,
  marker: {
    enabled: true
  }
}

const range = (start, stop, step) => Array.from({ length: (stop - start) / step }, (_, i) => Math.round((start + (i * step))*100)/100)

async function loadData(file) {
  let response = await fetch(file)
  let json = await response.json()
  return json
}

async function init(datasetOptions) {
  let datarateSelect = document.getElementById("datarateSelect")
  for (let datarateIndex=datasetOptions.datarates.startIndex; datarateIndex<=datasetOptions.datarates.maxIndex; datarateIndex++) {
    let datarate = datasetOptions.datarates.set[datarateIndex]
    let datarateOption = document.createElement("option")
    datarateOption.text = `${datarate} kbit/s`
    datarateOption.value = datarate
    datarateSelect.add(datarateOption, datarateSelect[0])
  }
  datarateSelect.addEventListener('change', (event)=>{
    let value = event.srcElement.value
    loadByValidatorCharts(value)
  })

  let validatorSelect = document.getElementById("validatorSelect");
  for (let validatorIndex=datasetOptions.validators.startIndex; validatorIndex<=datasetOptions.validators.maxIndex; validatorIndex++) {
    let validators = datasetOptions.validators.set[validatorIndex]
    let validatorOption = document.createElement("option")
    validatorOption.text = `${validators} validator(s)`
    validatorOption.value = validators
    validatorSelect.add(validatorOption, validatorSelect[0])
  }
  validatorSelect.addEventListener('change', (event)=>{
    let value = event.srcElement.value
    loadByDatarateCharts(value)
  })

  let periodSelect = document.getElementById("periodSelect")
  periodSelect.addEventListener('change', (event)=>{
    let value = event.srcElement.value
    loadValueTable(value)
  })
}

async function loadCharts() {
  let rpsChart = JSON.parse(JSON.stringify(chartOptions))
  rpsChart.yAxis.title.text = "Successful RPS [Hz]"
  rpsChart.title.text = "All RPS"
  let latencyChart = JSON.parse(JSON.stringify(chartOptions))
  latencyChart.yAxis.title.text = "Mean latency [s]"
  latencyChart.title.text = "All Latencies"

  for (let datarate in dataset) {
    for (let validators in dataset[datarate]) {

      let results = dataset[datarate][validators]

      rpsChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
      rpsChart.series[rpsChart.series.length-1].name = `${validators} Validators / ${datarate} kbit/s`
      rpsChart.series[rpsChart.series.length-1].data = addDataAverage(results, "rpsTried", "rps")

      latencyChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
      latencyChart.series[latencyChart.series.length-1].name = `${validators} Validators / ${datarate} kbit/s`
      latencyChart.series[latencyChart.series.length-1].data = addDataAverage(results, "rpsTried", "meanLatencyMs")
    }
  }
  Highcharts.chart("container", rpsChart)
  Highcharts.chart("container1", latencyChart)
}

async function loadByValidatorCharts(datarate=0) {
  let rpsByValidatorsChart = JSON.parse(JSON.stringify(chartOptions))
  rpsByValidatorsChart.yAxis.title.text = "Successful TPS [Hz]"
  rpsByValidatorsChart.title.text = `TPS by Validators [${datarate} kbit/s]`
  rpsByValidatorsChart.legend.enabled = false
  rpsByValidatorsChart.xAxis.title.text = ""

  let latencyByValidatorsChart = JSON.parse(JSON.stringify(chartOptions))
  latencyByValidatorsChart.yAxis.title.text = "Mean latency [ms]"
  latencyByValidatorsChart.title.text = `Latencies by Validators [${datarate} kbit/s]`

  for (let validators in dataset[datarate]) {
    let results = dataset[datarate][validators]

    rpsByValidatorsChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
    rpsByValidatorsChart.series[rpsByValidatorsChart.series.length-1].name = `${validators} Validators`
    rpsByValidatorsChart.series[rpsByValidatorsChart.series.length-1].data = addDataAverage(results, "rpsTried", "rps")

    latencyByValidatorsChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
    latencyByValidatorsChart.series[latencyByValidatorsChart.series.length-1].name = `${validators} Validators`
    latencyByValidatorsChart.series[latencyByValidatorsChart.series.length-1].data = addDataAverage(results, "rpsTried", "meanLatencyMs")
  }

  Highcharts.chart("container2", rpsByValidatorsChart)
  Highcharts.chart("container3", latencyByValidatorsChart)
}

async function loadByDatarateCharts(validators=2) {
  let rpsByDatarateChart = JSON.parse(JSON.stringify(chartOptions))
  rpsByDatarateChart.yAxis.title.text = "Successful TPS"
  rpsByDatarateChart.title.text = `TPS by data rate [${validators} Validator(s)]`


  let latencyByDatarateChart = JSON.parse(JSON.stringify(chartOptions))
  latencyByDatarateChart.yAxis.title.text = "Mean latency [ms]"
  latencyByDatarateChart.title.text = `Latencies by data rate [${validators} Validator(s)]`

  for (let datarate in dataset) {
    let results = dataset[datarate][validators]
    rpsByDatarateChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
    rpsByDatarateChart.series[rpsByDatarateChart.series.length-1].name = `${datarate} kbit/s`
    rpsByDatarateChart.series[rpsByDatarateChart.series.length-1].data = addDataAverage(results, "rpsTried", "rps")

    latencyByDatarateChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
    latencyByDatarateChart.series[latencyByDatarateChart.series.length-1].name = `${datarate} kbit/s`
    latencyByDatarateChart.series[latencyByDatarateChart.series.length-1].data = addDataAverage(results, "rpsTried", "meanLatencyMs")
  }
  Highcharts.chart("container4", rpsByDatarateChart)
  Highcharts.chart("container5", latencyByDatarateChart)
}

async function loadMaxCharts(datasetOptions) {
  let { maxByDatarate, maxByValidators } = getMaxValues()

  let maxByDatarateChart = JSON.parse(JSON.stringify(chartOptions))
  maxByDatarateChart.xAxis.title.text = "Data rate [kbit/s]"
  maxByDatarateChart.xAxis.categories = datasetOptions.datarates.set.slice(datasetOptions.datarates.startIndex,datasetOptions.datarates.maxIndex+1)
  maxByDatarateChart.yAxis.title.text = "Maximum average TPS [Hz]"
  maxByDatarateChart.title.text = "Maximum TPS by data rate"

  for (let validators in maxByDatarate) {
    // console.log(byDatarate[validators])
    maxByDatarateChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
    maxByDatarateChart.series[maxByDatarateChart.series.length-1].name = `${validators} Validator(s)`
    maxByDatarate[validators].sort((a, b) => ((a.category < b.category || !b.category==0) ? 1 : -1))
    maxByDatarateChart.series[maxByDatarateChart.series.length-1].data = maxByDatarate[validators]
  }

  Highcharts.chart("container6", maxByDatarateChart)

  let meanLatencyByDatarateChart = JSON.parse(JSON.stringify(chartOptions))
  meanLatencyByDatarateChart.xAxis.title.text = "Data rate [kbit/s]"
  meanLatencyByDatarateChart.xAxis.categories = datasetOptions.datarates.set.slice(datasetOptions.datarates.startIndex,datasetOptions.datarates.maxIndex+1)
  meanLatencyByDatarateChart.yAxis.title.text = "Mean latency [s]"
  meanLatencyByDatarateChart.yAxis.labels.formatter = function() { return this.value/1000 }
  meanLatencyByDatarateChart.title.text = "Mean latency at max TPS by data rate"

  for (let validators in maxByDatarate) {
    // console.log(byDatarate[validators])
    meanLatencyByDatarateChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
    meanLatencyByDatarateChart.series[meanLatencyByDatarateChart.series.length-1].name = `${validators} Validators`
    maxByDatarate[validators].sort((a, b) => ((a.category < b.category || !b.category==0) ? 1 : -1))

    meanLatencyByDatarateChart.series[meanLatencyByDatarateChart.series.length-1].data = maxByDatarate[validators].map((element) => { return {category:element.category,y:element.meanLatencyMs}})
  }
  Highcharts.chart("container8", meanLatencyByDatarateChart)


  let maxByValidatorsChart = JSON.parse(JSON.stringify(chartOptions))
  maxByValidatorsChart.xAxis.title.text = "Validators"
  maxByValidatorsChart.xAxis.categories = datasetOptions.validators.set.slice(datasetOptions.validators.startIndex,datasetOptions.validators.maxIndex+1)
  maxByValidatorsChart.yAxis.title.text = "Maximum average TPS [Hz]"
  maxByValidatorsChart.title.text = "Maximum TPS by validators"

  for (let datarate in maxByValidators) {
    // console.log(byValidators[datarate])
    maxByValidatorsChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
    maxByValidatorsChart.series[maxByValidatorsChart.series.length-1].name = `${datarate} kbit/s`
    maxByValidatorsChart.series[maxByValidatorsChart.series.length-1].data = maxByValidators[datarate]
  }
  Highcharts.chart("container7", maxByValidatorsChart)



  let meanLatencyByValidatorsChart = JSON.parse(JSON.stringify(chartOptions))
  meanLatencyByValidatorsChart.xAxis.title.text = "Validators"
  meanLatencyByValidatorsChart.xAxis.categories = datasetOptions.validators.set.slice(datasetOptions.validators.startIndex,datasetOptions.validators.maxIndex+1)
  meanLatencyByValidatorsChart.yAxis.title.text = "Mean latency [s]"
  meanLatencyByValidatorsChart.yAxis.labels.formatter = function() { return this.value/1000 }
  meanLatencyByValidatorsChart.title.text = "Mean latency at maximum TPS by validators"

  for (let datarate in maxByValidators) {
    // console.log(byValidators[datarate])
    meanLatencyByValidatorsChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
    meanLatencyByValidatorsChart.series[meanLatencyByValidatorsChart.series.length-1].name = `${datarate} kbit/s`
    meanLatencyByValidatorsChart.series[meanLatencyByValidatorsChart.series.length-1].data = maxByValidators[datarate].map((element) => { return {category:element.category,y:element.meanLatencyMs}})
  }
  Highcharts.chart("container9", meanLatencyByValidatorsChart)
}

function loadCoinTestComparisonChart(datasetOptions) {
  let { maxByDatarate, maxByValidators } = getMaxValues()

  let maxByDatarateChart = JSON.parse(JSON.stringify(chartOptions))
  maxByDatarateChart.xAxis.title.text = "Data rate [kbit/s]"
  maxByDatarateChart.xAxis.categories = datasetOptions.datarates.set.slice(datasetOptions.datarates.startIndex,datasetOptions.datarates.maxIndex+1)
  maxByDatarateChart.yAxis.title.text = "Maximum average TPS [Hz]"
  maxByDatarateChart.title.text = "Maximum TPS by data rate cointest market"

  let coinCalcSeries = []
  let averageCoinRequestSize = 859
  for (let datarate in maxByValidators) {
    coinCalcSeries.push({
      category: datarate,
      y: datarate*1000/8/averageCoinRequestSize
    })
  }
  maxByDatarateChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].name = `Theoretical max cointest`
  coinCalcSeries.sort((a, b) => ((a.category < b.category || b.category!=0) ? 1 : -1))
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].data = coinCalcSeries//.splice(0,11)
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].color = "#FF0000"
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].dashStyle = "Dash"

  maxByDatarateChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].name = `Test result cointest`
  maxByDatarate[1].sort((a, b) => ((a.category < b.category || !b.category==0) ? 1 : -1))
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].data = maxByDatarate[1]
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].color = "#FF0000"

  let orderCalcSeries = []
  let averageOrderRequestSize = 1061
  for (let datarate in maxByValidators) {
    orderCalcSeries.push({
      category: datarate,
      y: datarate*1000/8/averageOrderRequestSize
    })
  }
  maxByDatarateChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].name = `Theoretical max market`
  orderCalcSeries.sort((a, b) => ((a.category < b.category || b.category!=0) ? 1 : -1))
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].data = orderCalcSeries//.splice(0,11)
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].color = "#2BFF00"
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].dashStyle = "Dash"

  let marketTestSeries = []
  let marketValues = [10.23, 4.38, 8.33, 10.2, 10.42, 10.69, 10.31, 10.58, 10.34, 10.92, 9.48, 10.48, 10.47, 9.42, 11.03, 10.86, 10.79]
  marketValues.forEach((value, index)=>{
    marketTestSeries.push({
      category: Object.keys(maxByValidators)[index],
      y: value
    })
  })
  maxByDatarateChart.series.push(JSON.parse(JSON.stringify(seriesTemplate)))
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].name = `Test result market`
  marketTestSeries.sort((a, b) => ((a.category < b.category || b.category!=0) ? 1 : -1))
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].data = marketTestSeries
  maxByDatarateChart.series[maxByDatarateChart.series.length-1].color = "#2BFF00"

  maxByDatarateChart.yAxis.max = 90

  Highcharts.chart("container6", maxByDatarateChart)

}


function getMaxValues() {
  let x = 'rpsTried'
  let y = 'rps'
  let maxByDatarate = {}
  let maxByValidators = {}

  for (let datarate in dataset) {
    for (let validators in dataset[datarate]) {

      let sets = dataset[datarate][validators]

      console.log({datarate})
      console.log({validators})
      let _data = addDataAverage(sets, x, y)
      let _meanLatencyData = addDataAverage(sets, x, 'meanLatencyMs')

      let max = _data.reduce((maximum, value, index) =>{
        // console.log("maximum: ", maximum)
        // console.log("value: ", value)

        // return Math.max(maximum,value.y)
        if (value.y > maximum.maxValue) {
          let meanLatencyMs = _meanLatencyData[index].y
          return {maxValue:value.y,maxIndex:index,meanLatencyMs:meanLatencyMs}
        } else {
          return maximum
        }

      }, {maxValue:0,maxIndex:0,meanLatencyMs:0})

      // console.log({datarate})
      // console.log({validators})
      // console.log({max})

      if (!maxByDatarate[validators]) maxByDatarate[validators]=[]
      maxByDatarate[validators].push({
        // x: parseInt(datarate),
        category: parseInt(datarate),
        y: max.maxValue,
        meanLatencyMs: max.meanLatencyMs
      })

      if (!maxByValidators[datarate]) maxByValidators[datarate]=[]
      maxByValidators[datarate].push({
        category: validators,
        y: max.maxValue,
        meanLatencyMs: max.meanLatencyMs
      })
    }

  }

  return {
    maxByDatarate,
    maxByValidators
  }
}


function addDataAverage(sets, x, y) {

  let initialValue = sets[0].results.map((element, index)=>{
    return {
      x: element[x],
      y: 0
    }
  })


  let data = sets.reduce((average, set, _, { length }) => {
    // console.log(`average.results: ${JSON.stringify(average, null, 2)}`)
    // console.log(`set.results: ${JSON.stringify(set.results, null, 2)}`)

    let result = set.results.map((element, index) => {
      // console.log(index)
      // console.log(`element at index ${index}: ${JSON.stringify(element)}`)
      // console.log(`average at index ${index}: ${JSON.stringify(average[index])}`)

      if (!average[index]) {
        console.log("Please look for double measurements in the following results file:")
        console.log(`${JSON.stringify(set.settings, null, 2)}`)
      }

      if (y=='rps') {
        element.rps = (element['totalRequests']-element['totalErrors']) / element['totalTimeSeconds']
      }

      return {
        x: element[x],
        y: Math.round(1000*(average[index].y + (element[y] / length))) / 1000
      }
    })

    // console.log(`result: ${JSON.stringify(result, null, 2)}`)
    return result
  }, initialValue)

  // data = data.sort((a, b) => (a.x > b.x ? 1 : -1))
  return data

}

function addData(set, x, y) {
  let data = set.map((element, index) => {
    return {
      x: element[x] || 0,
      y: element[y] || 0
    }
  })
  // data = data.sort((a, b) => (a.x > b.x ? 1 : -1))
  return data
}

async function loadDataset(datasetOptions) {
  let dataset = {}
  for (let datarateIndex=datasetOptions.datarates.startIndex; datarateIndex<=datasetOptions.datarates.maxIndex; datarateIndex++) {
    let datarate = datasetOptions.datarates.set[datarateIndex].toString()
    if (!dataset[datarate]) dataset[datarate] = {}

    // console.log(`${datarate}kbit/s`)
    // console.log(typeof(datarate))
    // console.log(dataset)

    for (let validatorIndex=datasetOptions.validators.startIndex; validatorIndex<=datasetOptions.validators.maxIndex; validatorIndex++) {
      let validators = datasetOptions.validators.set[validatorIndex]
      if (!dataset[datarate][validators]) dataset[datarate][validators] = []

      for (let iteration=datasetOptions.iterations.startIndex; iteration<=datasetOptions.iterations.maxIndex; iteration++) {
        let result = await loadData(`${datasetOptions.folder}/${datasetOptions.node}_${validators}validators_${datarate}kbps_${iteration}.json`)
        dataset[datarate][validators].push(result)
      }
    }
  }
  return dataset
}

async function loadFiles() {
  let {files} = await loadData('/data')
  let datasetSelect = document.getElementById("datasetSelect")
  files.filter(file=>file!=".DS_Store").forEach((file)=>{
    let datasetOption = document.createElement("option")
    datasetOption.text = `${file}`
    datasetOption.value = `/data/${file}`
    datasetSelect.add(datasetOption, datasetSelect[datasetSelect.length-1])
  })


  datasetSelect.addEventListener('change', async(event)=>{
    let folder = event.srcElement.value
    console.log(folder)
    await main(folder)
  })
}

async function main(folder) {
  let datasetOptions = await loadData(`${folder}/_testOptions.json`)
  datasetOptions.folder = folder
  dataset = await loadDataset(datasetOptions)
  init(datasetOptions)
  loadValueTable()
  loadMaxCharts(datasetOptions)
  if (folder.indexOf("Cointest") != -1) {
    loadCoinTestComparisonChart(datasetOptions)
  }
  loadByValidatorCharts(datasetOptions.datarates.set[datasetOptions.datarates.startIndex])
  loadByDatarateCharts(datasetOptions.validators.set[datasetOptions.validators.startIndex])
}

// Initialize global dataset variable
let dataset

$(document).ready(async function() {
  await loadFiles()

  $('#datetimepicker').datetimepicker({
    format: "LL"
  }).on('dp.change', (event) => {
    console.log(event.date.unix())
  })
});


function loadValueTable(settlementPeriod=1, element='table_values') {
  let { maxByDatarate } = getMaxValues()

  let head = $('<thead>').addClass('thead')
  head.append( $('<th>').html(`Validators /<br>Data rate`) )
  for (let datarate of Object.values(maxByDatarate)[0]) {
    head.append( $('<th>').html(`${datarate.category}`) )
  }
  $(`#${element} thead`).remove()
  $(`#table_values`).append(head)

  let body = $('<tbody>').addClass('tbody')
  let valueRows = []
  for (let validators in maxByDatarate) {
    // console.log(maxByDatarate[validators])
    var row = $(`<tr>`)
    row.append( $('<th>').html(`${validators}`))
    for (let datarate of maxByDatarate[validators]) {
      row.append( $('<td>').html(`${Math.round((0.9 * datarate.y * settlementPeriod)*10)/10}`) )
    }
    valueRows.push(row)
  }

  // console.log(valueRows)
  body.append(valueRows)
  $(`#${element} tbody`).remove()
  $(`#${element}`).append(body)
}
