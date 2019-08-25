let loadtest = require('loadtest')
let fs =  require('fs')
let { join } = require('path')
let generateTx = require('./generateOrderTx')
let MultiLauncher = require('./MultiLauncher')


function requestGenerator (params, options, client, callback) {
  let txBytes = generateTx()
  options.path = `/broadcast_tx_commit?tx=${txBytes}`
  const request = client(options, callback)
  return request
}
const range = (start, stop, step) => Array.from({ length: (stop - start) / step }, (_, i) => Math.round((start + (i * step))*100)/100)

class CommunicationTest {
  constructor(opts={}) {
    this.verbose = opts.verbose || false
    this.lastInstanceIndex = -1
    this.folder = opts.folder || join('data', (new Date(Date.now())).toISOString().replace(/:/g, '_').substring(0,19))
    // this.folder = opts.folder || "data"

    this.multiLauncher = null
    this.stepSleep = 5000

    // Initialize empty options property
    this.options = {}

    this.options.node = opts.node || "127.0.0.1:46657"
    console.log(`Running test against node: ${this.options.node}`)

    // Loadtest options
    this.options.loadtest = opts.loadtest || {
      concurrency: 2,
      maxSeconds: 20,
      generateTx
    }
    this.options.loadtest.url = `http://${this.options.node}`
    generateTx = this.options.loadtest.generateTx
    this.options.loadtest.requestGenerator = requestGenerator

    // Iteration options
    this.options.iterations = opts.iterations || {
      startIndex: 0,
      maxIndex: 2
    }

    // Request global variables
    this.options.requests = opts.requests || {
      startRps: 1,
      maxRps: 20,
      stepSize: 1
    }

    // Validator global variables
    this.options.validators = opts.validators || {
      startIndex: 0,
      maxIndex: 4,
      set: [1,2,4,8,12,16,20,24,28,32,36,40,44,48,52,56,60,64,68,72],
      ips: {
        "0": "192.168.1.100",
        "1": "192.168.1.101",
        "2": "192.168.1.102",
        "3": "192.168.1.103",
        "4": "192.168.1.104",
        "5": "192.168.1.105",
        "6": "192.168.1.106",
        "7": "192.168.1.107",
        "8": "192.168.1.108",
        "9": "192.168.1.109",
        "10": "192.168.1.110",
        "11": "192.168.1.111"
      }
    }

    // Datarate global variables
    this.options.datarates = opts.datarates || {
      startIndex: 0,
      maxIndex: 9,
      set: [0, 40, 80, 160, 400, 800, 2000, 4000, 8000, 16000],
    }

    // Initialize platform options
    this.options.platform = opts.platform || {
      datarate: 5120000,
      blocktime: 30,
      logTendermint: true,
      app: './qs/AppliedEnergyCommunication/data/validators/node_modules/QuartierstromPlatform/dist/src/app.js'
    }

    this.run = {
      settings: {
        validators: null,
        datarate: null,
        requestsPerSecond: null,
        dataratesIndex: null,
        validatorsIndex: null,
        iteration: null
      },
      results: []
    }
  }

  async start () {
    this.resetValidators()
    await this.initValidators()

    this.resetRequests()
    this.initRequests()

    this.resetDatarates()
    await this.initDatarates()

    this.run.settings.iteration = this.options.iterations.startIndex

    // Save test options
    this.saveOptions()

    // Run test set
    let that = this
    setTimeout(()=>{ that.runTest() }, this.stepSleep)
  }

  async stop() {
    this.shutdown = true
  }

  resetResults () {
    // Initialize results
    console.log("Resetting results")
    this.run.results = []
  }

  resetValidators () {
    console.log("Resetting validators")
    this.run.settings.validatorsIndex = this.options.validators.startIndex
    this.run.settings.validators = this.options.validators.set[this.run.settings.validatorsIndex]
  }

  async initValidators () {
    // Initialize number of validators
    this.run.settings.validators = this.options.validators.set[this.run.settings.validatorsIndex]

    // Initialize multi launcher
    this.multiLauncher = new MultiLauncher({
      validatorIps: this.options.validators.ips,
      platformOptions: this.options.platform,
      numValidators: this.run.settings.validators,
      verbose: this.verbose
    })

    console.log("Cleaning validator directories...")
    let cleanResult = await this.multiLauncher.multiclean()
    console.log(`cleanResult: ${JSON.stringify(cleanResult, null, 2)}`)
  }

  resetRequests () {
    console.log("Resetting rps")
    this.run.settings.requestsPerSecond = Math.round(this.options.requests.startRps*100)/100
  }

  initRequests () {
    this.options.loadtest.requestsPerSecond = Math.round(this.run.settings.requestsPerSecond*100)/100
    this.options.loadtest.maxRequests = Math.round(this.options.loadtest.maxSeconds/2) * this.options.loadtest.requestsPerSecond
  }

  resetDatarates () {
    console.log("Resetting datarate")
    this.run.settings.dataratesIndex = this.options.datarates.startIndex
    this.run.settings.datarate = this.options.datarates.set[this.run.settings.dataratesIndex]
  }

  async initDatarates () {
    // Initialize datarate
    this.run.settings.datarate = this.options.datarates.set[this.run.settings.dataratesIndex]

    console.log("Initializing datarate")

    // Clear wondershaper restrictions
    let resetResult = await this.multiLauncher.multirate(0, 'eth0')
    console.log(`resetResult: ${JSON.stringify(resetResult, null, 2)}`)

    // Set new wondershaper restrictions
    console.log(`Setting datarate to ${this.run.settings.datarate} kbit/s`)
    let setResult = await this.multiLauncher.multirate(this.run.settings.datarate, 'eth0')
    console.log(`setResult: ${JSON.stringify(setResult, null, 2)}`)

  }

  async runTest () {
    console.log(`\nIteration ${this.run.settings.iteration} / ${this.options.iterations.maxIndex}`)
    console.log(`  ${this.run.settings.validators} / [${this.options.validators.set.slice(this.options.validators.startIndex,this.options.validators.maxIndex+1)}] validator(s)`)
    console.log(`    ${this.run.settings.datarate} / [${this.options.datarates.set.slice(this.options.datarates.startIndex,this.options.datarates.maxIndex+1)}] kbit/s`)
    console.log(`      ${this.run.settings.requestsPerSecond} / [${range(this.options.requests.startRps, this.options.requests.maxRps+this.options.requests.stepSize, this.options.requests.stepSize)}] RPS\n`)

    // Launch validators
    console.log("Starting validators...")
    let startResult = await this.multiLauncher.multistart()
    console.log(`startResult: ${JSON.stringify(startResult, null, 2)}`)


    // Set timeout of 2 x blocktime to make sure we have a running chain
    let timeout = Math.round(this.multiLauncher.platformOptions.blocktime * 2 + Math.round(this.stepSleep/1000))
    console.log(`Launched validators. Setting timeout for ${timeout} seconds...`)

    let that = this
    setTimeout(()=>{
      console.log(`\nRunning Test RPS: ${this.options.loadtest.requestsPerSecond}`)
      // Launch loadtest
      loadtest.loadTest(that.options.loadtest, (error, result)=>{ that.finishTest(error, result) })
    }, timeout * 1000)
  }

  // runTest () {
  //   console.log(`Iteration #${this.run.settings.iteration}`)
  //   console.log(`${this.run.settings.validators} validator(s)`)
  //   console.log(`${this.run.settings.requestsPerSecond} RPS`)
  //   console.log(`${this.run.settings.datarate} kbit/s`)
  //   this.finishTest(undefined, {})
  // }

  finishTest (error, result) {
    if (error) {
      return console.error('Got an error: %s', error)
    }

    result.rpsTried = this.run.settings.requestsPerSecond

    console.log(`Test RPS: ${this.run.settings.requestsPerSecond} successful:`)
    console.log(JSON.stringify(result, null, 2))


    console.log(`instanceIndex: ${result.instanceIndex}`)
    console.log(`lastInstanceIndex: ${this.lastInstanceIndex}`)

    if (result.instanceIndex == (this.lastInstanceIndex+1)) {
      this.lastInstanceIndex = result.instanceIndex
      this.run.results.push(result)

      this.advance()
    } else {
      console.log("THIS SHOULD NOT BE POSSIBLE!")
    }
  }

  async advance () {
    let that = this

    // Stop validators
    console.log("Stopping validators...")
    let stopResult =await this.multiLauncher.multistop()
    console.log(`stopResult: ${JSON.stringify(stopResult, null, 2)}`)


    if (this.shutdown) {
      this.saveResults()
      return
    }

    if (this.run.settings.requestsPerSecond < this.options.requests.maxRps) {
      this.run.settings.requestsPerSecond += this.options.requests.stepSize
      this.initRequests()

      console.log(`Setting timeout for ${this.stepSleep}ms...`)
      setTimeout(()=>{ that.runTest() }, this.stepSleep)

    } else {
      console.log("\nDONE\n")
      this.saveResults()
      this.resetResults()

      if (this.run.settings.dataratesIndex < this.options.datarates.maxIndex) {
        this.resetRequests()
        console.log("Incrementing dataratesIndex")
        this.run.settings.dataratesIndex++

        await this.initRequests()
        await this.initDatarates()

        console.log(`Setting timeout for ${this.stepSleep}ms...`)
        setTimeout(()=>{ that.runTest() }, this.stepSleep)
      } else {
        if (this.run.settings.validatorsIndex < this.options.validators.maxIndex) {
          this.resetRequests()
          this.resetDatarates()

          console.log("Incrementing validatorsIndex")
          this.run.settings.validatorsIndex++

          this.initRequests()
          await this.initValidators()
          await this.initDatarates()

          console.log(`Setting timeout for ${this.stepSleep}ms...`)
          setTimeout(()=>{ that.runTest() }, this.stepSleep)
        } else {
          if (this.run.settings.iteration < this.options.iterations.maxIndex) {
            this.resetRequests()
            this.resetDatarates()
            this.resetValidators()

            console.log("Incrementing iteration")
            this.run.settings.iteration++

            this.initRequests()
            await this.initValidators()
            await this.initDatarates()

            console.log(`Setting timeout for ${this.stepSleep}ms...`)
            setTimeout(()=>{ that.runTest() }, this.stepSleep)
          } else {
            console.log("FINISHED!")
            return
          }
        }
      }
    }
  }

  saveResults() {
    if (!fs.existsSync(this.folder)) {
      fs.mkdirSync(this.folder)
    }
    let filename = join(this.folder,`${this.options.node}_${this.run.settings.validators}validators_${this.run.settings.datarate}kbps_${this.run.settings.iteration}.json`)
    fs.writeFileSync(filename, JSON.stringify(this.run, null, 2))
    console.log(`Written to file "${filename}"`)
  }

  saveOptions() {
    if (!fs.existsSync(this.folder)) {
      fs.mkdirSync(this.folder)
    }
    let filename = join(this.folder,`_testOptions.json`)
    fs.writeFileSync(filename, JSON.stringify(this.options, null, 2))
    console.log(`Written to file "${filename}"`)
  }
}

module.exports =  CommunicationTest

if (!module.parent) {
  test()
}

async function test() {
  let communicationTest = new CommunicationTest()
  communicationTest.start()
}
