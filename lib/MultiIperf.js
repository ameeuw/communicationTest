let RemoteIperf = require('./RemoteIperf')
let fs = require('fs')
let { join } = require('path')

class MultiIperf {
  constructor(opts={}) {
    this.verbose = opts.verbose || false
    this.numNodes = opts.numNodes || 4
    this.hostIps = opts.hostIps || [
      // "192.168.1.100",
      // "192.168.1.101",
      // "192.168.1.102",
      // "192.168.1.103",
      // "192.168.1.104",
      // "192.168.1.105",
      // "192.168.1.106",
      // "192.168.1.107",
      "192.168.1.108",
      "192.168.1.109",
      "192.168.1.110",
      "192.168.1.111"
    ]

    this.iperfOptions = opts.iperfOptions || {
      port: 46659,
      duration: 10
    }

    this.connectionDetails = opts.connectionDetails || {
      port: 22,
      username: 'pi',
      password: 'quartierstrom',
      readyTimeout: 60000
    }

    this.remoteIperfs = []

    this.folder = opts.folder || join('iperf', (new Date(Date.now())).toISOString().replace(/:/g, '_').substring(0,19))


    this.result = "timestamp,source_address,source_port,destination_address,destination_port,process_number,interval,transferred_bytes,bits_per_second\n"

    this.init()
  }

  init () {
    for (let i=0; i<this.numNodes; i++) {
      let _options = JSON.parse(JSON.stringify(this.iperfOptions))
      let _details = JSON.parse(JSON.stringify(this.connectionDetails))
      _details.host = this.hostIps[i]
      this.remoteIperfs.push(new RemoteIperf({
        iperfOptions: _options,
        connectionDetails: _details,
        verbose: this.verbose
      }))
    }
  }

  async multiperf() {
    let datarates = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 1000, 2000, 4000, 16000, 0]

    for (let datarate of datarates) {
      let clearDatarateResult = await this.multirate(0)
      console.log(clearDatarateResult)
      let setDatarateResult = await this.multirate(datarate)
      console.log(setDatarateResult)

      let array = Array.from(Array(this.numNodes).keys())

      for (let serverIndex of array) {
        console.log(`\nLaunching server on "${this.hostIps[serverIndex]}"`)
        let serverResult = await this.remoteIperfs[serverIndex].autoserver()
        // console.log(serverResult)
        let _array = JSON.parse(JSON.stringify(array))
        _array.splice(serverIndex,1)
        for (let clientIndex of _array) {
          console.log(`\tRunning test from "${this.hostIps[clientIndex]}" to "${this.hostIps[serverIndex]}"`)
          let clientResult = await this.remoteIperfs[clientIndex].autoclient(this.hostIps[serverIndex])
          // console.log(clientResult)
          this.result += clientResult
        }


        let stopResult = await this.remoteIperfs[serverIndex].autokill()

        console.log(this.result)
        this.saveResults(this.hostIps[serverIndex], datarate)
        this.result = "timestamp,source_address,source_port,destination_address,destination_port,process_number,interval,transferred_bytes,bits_per_second\n"

        // console.log(stopResult)
      }

    }
  }

  async multirate (datarate=0, iface="eth0") {
    let results = []
    for (let iperf of this.remoteIperfs) {
      results.push(iperf.autorate(datarate, iface))
    }
    results = await Promise.all(results)
    return results
  }

  saveResults(host="", datarate=0) {
    if (!fs.existsSync(this.folder)) {
      fs.mkdirSync(this.folder)
    }
    let filename = join(this.folder,`iperf_results_${host}_${datarate}.csv`)
    fs.writeFileSync(filename, this.result)
    console.log(`Written to file "${filename}"`)
  }
}

module.exports = MultiIperf

if (!module.parent) {
  test()
}

async function test() {
  let multiIperf= new MultiIperf()
  await multiIperf.multiperf()
}
