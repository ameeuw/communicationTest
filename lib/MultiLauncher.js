let RemotePlatform = require('./RemotePlatform')

class MultiLauncher {
  constructor(opts={}) {
    this.verbose = opts.verbose || false
    this.numValidators = opts.numValidators || 12
    this.validatorIps = opts.validatorIps || {
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
      "11": "192.168.1.111",
    }

    this.platformOptions = opts.platformOptions || {
      datarate: 5120000,
      blocktime: 30,
      genesis: `./qs/AppliedEnergyCommunication/data/validators/geneses/genesis_${this.numValidators}.json`,
      app: './qs/AppliedEnergyCommunication/data/validators/node_modules/QuartierstromPlatform/dist/src/app.js',
      logTendermint: true
    }

    this.connectionDetails = opts.connectionDetails || {
      port: 22,
      username: 'pi',
      password: 'quartierstrom',
      readyTimeout: 60000
    }

    this.remotePlatforms = []

    this.init()
  }

  init () {
    let peers = []
    for (let i=0; i<this.numValidators; i++) {
      peers.push(this.validatorIps[i])
    }
    for (let i=0; i<this.numValidators; i++) {
      let _options = JSON.parse(JSON.stringify(this.platformOptions))
      _options.keys = `./qs/AppliedEnergyCommunication/data/validators/keys/validator${i}.json`
      _options.genesis = `./qs/AppliedEnergyCommunication/data/validators/geneses/genesis_${this.numValidators}.json`
      _options.peers = `--peer '${peers.join(":46660' --peer '")}:46660'`
      if (this.verbose) console.log(JSON.stringify(_options, null, 2))

      let _details = JSON.parse(JSON.stringify(this.connectionDetails))
      _details.host = this.validatorIps[i]
      // console.log(JSON.stringify(_details, null, 2))

      this.remotePlatforms.push(new RemotePlatform({
        platformOptions: _options,
        connectionDetails: _details,
        verbose: this.verbose
      }))
    }
  }

  async multistart () {
    let results = []
    for (let remotePlatform of this.remotePlatforms) {
      if (this.verbose) console.log(`Launching ${remotePlatform.connectionDetails.host}`)
      results.push(remotePlatform.autostart())
    }
    return await Promise.all(results)
  }

  async multistop () {
    let results = []
    for (let remotePlatform of this.remotePlatforms) {
      results.push(remotePlatform.autostop())
    }
    return await Promise.all(results)
  }

  async multiclean() {
    let results = []
    for (let remotePlatform of this.remotePlatforms) {
      results.push(remotePlatform.autoclean())
    }
    return await Promise.all(results)
  }

  async multirate (datarate=0, iface="eth0") {
    let results = []

    if (iface=="platform") {
      // Convert datarate from kbit/s to byte/s
      datarate = Math.round(datarate*1000/8)
      // Leave datarate open
      if (datarate==0) datarate=5120000
      console.log("Setting datarate in platform options...")
      for (let remotePlatform of this.remotePlatforms) {
        remotePlatform.platformOptions.datarate = datarate
        results.push(remotePlatform.platformOptions.datarate)
      }
    } else {
      for (let remotePlatform of this.remotePlatforms) {
        results.push(remotePlatform.autorate(datarate, iface))
      }
      results = await Promise.all(results)
    }
    return results
  }
}

module.exports = MultiLauncher

if (!module.parent) {
  test()
}

async function test() {
  let multiLauncher = new MultiLauncher()
  await multiLauncher.multistart()

  setTimeout(async function () {
    await multiLauncher.multistop()
  }, 60000);
}
