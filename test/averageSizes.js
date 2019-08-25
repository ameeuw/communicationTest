let generateCoinTx = require('../lib/generateCoinTx')
let generateOrderTx = require('../lib/generateOrderTx')
let axios = require('axios')
let http = require('http')
let express = require('express')

let port = 46659

let endpoint = express()
endpoint.use('/broadcast_tx_commit', (req, res) =>{
  let requestSize = req.socket.bytesRead
  // console.log(`RequestSize: ${requestSize} bytes`)

  if (req.query.tx) {
    // console.log(`Received: ${req.query.tx}`)
    let txSize = Buffer.from(req.query.tx.substring(2), 'hex').length
    // console.log(`TxSize: ${txSize} bytes`)
    res.json({
      txSize,
      requestSize
    })
  } else {
    res.json({
      error: "No Tx data",
      requestSize
    })
  }
})

let server = http.createServer(endpoint)
server.listen(port, () => {
  console.log(`Endpoint running on port ${port}`)
  runTest()
})


let numTxs = 1000

async function runTest() {
  let averageCoinTxSize = 0
  let averageCoinRequestSize = 0
  let averageOrderTxSize = 0
  let averageOrderRequestSize = 0

  const array = Array.from(Array(numTxs).keys())
  for (const item of array) {
    let orderTx = generateOrderTx()
    let orderResponse = await axios.get(`http://127.0.0.1:${port}/broadcast_tx_commit?tx=${orderTx}`)
    if (!orderResponse.data.error) {
      averageOrderTxSize +=  orderResponse.data.txSize / numTxs
    }
    averageOrderRequestSize +=  orderResponse.data.requestSize / numTxs

    let coinTx = generateCoinTx()
    let coinResponse = await axios.get(`http://127.0.0.1:${port}/broadcast_tx_commit?tx=${coinTx}`)
    if (!coinResponse.data.error) {
      averageCoinTxSize +=  coinResponse.data.txSize / numTxs
    }
    averageCoinRequestSize +=  coinResponse.data.requestSize / numTxs
  }

  console.log(`\nAverage orderTx size: ${Math.round(averageOrderTxSize)} bytes`)
  console.log(`Average coinTx size: ${Math.round(averageOrderRequestSize)} bytes`)

  console.log(`\nAverage coinTx size: ${Math.round(averageCoinTxSize)} bytes`)
  console.log(`Average orderTx size: ${Math.round(averageCoinRequestSize)} bytes`)

  server.close()
}
