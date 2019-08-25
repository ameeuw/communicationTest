#!/usr/bin/env node
const http = require('http')
const express = require('express')
const fs = require('fs')
let httpPort = 8080

// Load argument parser and parse the given arguments
let app = express()

app.use(express.static('./web'))
app.use('/data', express.static('./data'))
app.use('/data', function(req, res) {
  let files = fs.readdirSync('./data')
  res.json({files})
})


// Start http server
const httpServer = http.createServer(app);
httpServer.listen(httpPort, () => {
    console.log(`HTTP Server running on port ${httpPort}`)
})
