let readline = require('readline')
let CommunicationTest = require('./lib/CommunicationTest')
let fs = require('fs')
let argparser = require('./lib/argparse').parser
let args = argparser.parseArgs()

let testOptions = {
  node: "192.168.1.100:46659",

  // Loadtest options
  loadtest: {
    concurrency: 2,
    maxSeconds: 20,
    generateTx: "generateOrderTx"
  },

  // Iteration options
  iterations: {
    startIndex: 0,
    maxIndex: 4
  },

  // Request global variables
  requests: {
    startRps: 1,
    maxRps: 15,
    stepSize: 2
  },

  // Validator global variables
  validators: {
    startIndex: 0,
    maxIndex: 0,
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
  },

  // Datarate global variables
  datarates: {
    startIndex: 0,
    maxIndex: 14,
    set: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 1000, 2000, 4000, 16000, 0]
  },

  // Initialize platform options
  platform: {
    datarate: 5120000,
    blocktime: 1,
    logTendermint: false,
    app: './qs/AppliedEnergyCommunication/data/validators/node_modules/QuartierstromPlatform/dist/src/app.js'
  }
}

function ask(question, callback) {
  var r = readline.createInterface({
    input: process.stdin,
    output: process.stdout})
  r.question(question, function(answer) {
    r.close()
    callback(null, answer)
  })
}

if (args.options) {
  console.log(`Loading testOptions from ${args.options}`)
  testOptions = JSON.parse(fs.readFileSync(args.options, { encoding: 'utf8' }))
}
testOptions.loadtest.generateTx = require(`./lib/${testOptions.loadtest.generateTx}`)

console.log(`Running app: ${testOptions.platform.app}`)
let communicationTest = new CommunicationTest(testOptions)
communicationTest.start()


if (!args.unprotected) {
  process.on('SIGINT', () => {
    console.info('SIGINT signal received.')

    ask('Really quit? (yes/no)  ', async(error, answer)=>{
      if (answer.toLowerCase() == "yes") {
        console.log("Shutting down...")
        await communicationTest.stop()
      } else {
        console.log("Continuing CommunicationTest")
      }
    })
  })
} else {
  console.log("Running unprotected.")
}
