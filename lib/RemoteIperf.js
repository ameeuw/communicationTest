let Client = require('ssh2').Client

class RemoteIperf {
  constructor (opts={}) {
    this.verbose = opts.verbose || false
    this.connectionDetails = opts.connectionDetails || {
      host: '192.168.1.100',
      port: 22,
      username: 'pi',
      password: 'quartierstrom',
      readyTimeout: 60000
    }

    this.iperfOptions = opts.iperfOptions || {
      port: 46659,
      duration: 10
    }
  }

  connect () {
    let that = this
    let trycounter = 0
    return new Promise(function(resolve, reject) {
      var conn = new Client()
      conn.on('ready', function() {
        // console.log(`${that.connectionDetails.host}: Connection ready.`)
        if (that.verbose) console.log('Client :: ready')
        resolve(conn)
      })

      conn.on('error', (error)=>{
        console.log(`${that.connectionDetails.host}: Connection error!`)
        // console.log(error)

        if (trycounter < 3) {
          trycounter++
          console.log(`${that.connectionDetails.host}: Connection retry ${trycounter}/3`)
          setTimeout(function () {
            console.log(`${that.connectionDetails.host}: Reconnecting`)
            conn.connect(that.connectionDetails)
          }, 200)
        } else {
          reject(error)
        }
      })

      conn.connect(that.connectionDetails)
    })
  }

  setDatarate (conn, datarate=0, iface='eth0') {
    let that = this
    return new Promise((resolve, reject)=>{
      let execString = ""
      if (datarate!=0) {
        execString = `sudo wondershaper ${iface} ${datarate} ${datarate}`
      } else {
        execString = `sudo wondershaper clear ${iface}`
      }
      conn.exec(execString, (err, stream)=>{
        if (err) {
          reject(err)
        }

        stream
        .on('data', (data)=>{
          resolve(data.toString())
        })
        .on('close', (code, signal)=>{
          resolve(code)
        })
        .stderr.on('data', (data)=>{
          if (that.verbose) console.log('STDERR: ' + data)
        })
      })
    })
  }

  kill (conn) {
    return new Promise((resolve, reject)=>{
      // conn.exec(`screen -ls | grep Detached | cut -d. -f1 | awk '{print $1}' | xargs kill`, (err, stream)=>{
      conn.exec(`killall screen`, (err, stream)=>{
        if (err) {
          reject(err)
        }

        stream
        .on('data', (data)=>{
          resolve(data.toString())
        })
        .on('close', (code, signal)=>{
          resolve(code)
        })
        .stderr.on('data', (data)=>{
          console.log('STDERR: ' + data)
        })
      })
    })
  }

  client (conn, host) {
    let that = this
    return new Promise((resolve, reject)=>{

      let execString = `iperf -c ${host} -p ${that.iperfOptions.port} -t ${that.iperfOptions.duration} -y C | tee .iperf/iperf_client_${host}.log`

      if (that.verbose) console.log(execString)
      conn.exec(execString, (err, stream)=>{
        if (err) {
          reject(err)
        }

        stream
        .on('data', (data)=>{
          resolve(data.toString())
          // console.log(data.toString())
        })
        .on('close', (code, signal)=>{
          resolve(code)
        })
        .stderr.on('data', (data)=>{
          if (that.verbose) console.log('STDERR: ' + data)
        })
      })
    })
  }

  server (conn) {
    let that = this
    return new Promise((resolve, reject)=>{

      let execString = `screen -dmS -iperf sh -c "iperf -s -p ${that.iperfOptions.port} -y C | tee .iperf/iperf_server.log"`

      if (that.verbose) console.log(execString)
      conn.exec(execString, (err, stream)=>{
        if (err) {
          reject(err)
        }

        stream
        .on('data', (data)=>{
          // resolve(data.toString())
          console.log(data.toString())
        })
        .on('close', (code, signal)=>{
          resolve(code)
        })
        .stderr.on('data', (data)=>{
          if (that.verbose) console.log('STDERR: ' + data)
        })
      })
    })
  }

  async autoclient(host='127.0.0.1') {
    let connection = await this.connect()
    let result = await this.client(connection, host)
    connection.end()
    return result
  }

  async autoserver() {
    let connection = await this.connect()
    let result = await this.server(connection)
    connection.end()
    return result
  }

  async autokill() {
    let connection = await this.connect()
    let result = await this.kill(connection)
    connection.end()
    return result
  }

  async autorate(datarate=0, iface="eth0") {
    let connection = await this.connect()
    let result = await this.setDatarate(connection, datarate, iface)
    connection.end()
    return result
  }
}

module.exports = RemoteIperf

if (!module.parent) {
  test()
}

async function test() {
  let connDetails = {
    host: '192.168.1.100',
    port: 22,
    username: 'pi',
    password: 'quartierstrom'
  }

  let remotePlatform = new RemotePlatform({verbose: true, connectionDetails: connDetails})
  await remotePlatform.autostart()

  setTimeout(async () => {
    await remotePlatform.autostop()
  }, 10000);
}
