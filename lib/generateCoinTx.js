let { Client, utilities } = require('client');
let { ITransactionPayload, OrderTransactionPayload } = require("transactions");
let { to } = require('await-to-js');
let vstruct = require('varstruct')
let { stringify } = require('deterministic-json')
let axios = require('axios')

let TxStruct = vstruct([
  { name: 'data', type: vstruct.VarString(vstruct.UInt32BE) },
  { name: 'nonce', type: vstruct.UInt32BE }
])

function encode(txData, nonce) {
  let data = stringify(txData)
  let bytes = TxStruct.encode({ nonce, data })
  return bytes
}

let client = new Client('localhost', false, undefined, undefined)
let keystores = []

let numAccounts = 5

for (let i=0; i<numAccounts; i++) {
  let keystore = client.generateKeystore(client.generatePrivateKey())
  keystore.nonce = 0
  keystores.push(keystore)
}
let round = 0

// console.log(keystores)

function generateCoinTx() {
  let senderKeystore = keystores[round%numAccounts]
  let receiverKeystore = keystores[(round+1)%numAccounts]

  let privKey = Buffer.from(senderKeystore.priv_key.data, 'hex')
  let pubKey = client.generatePublicKey(privKey)

  let address = receiverKeystore.address

  // console.log(`${client.generateAddress(pubKey).toString('hex').substring(0,9)}... --> ${address.substring(0,9)}...`)

  let transaction = client.generateTransaction(pubKey, 'tx', senderKeystore.nonce, address, 1, {})
  let signedTransaction = utilities.sign(privKey, transaction)
  let serializedTransaction = utilities.serializeTx(signedTransaction)
  let tmNonce = Math.floor(Math.random() * (2 << 12))
  let txBytes = '0x' + encode(serializedTransaction, tmNonce).toString('hex')
  senderKeystore.nonce++

  round++
  return txBytes
}

module.exports = generateCoinTx

if (!module.parent) {
  main()
}

async function main() {
  for (let i=0; i<numAccounts; i++) {
    console.log(`\naccount[${round%numAccounts}] --> account[${(round+1)%numAccounts}]`)
    let txBytes = generateCoinTx()
    console.log(txBytes)
    await axios.get(`http://127.0.0.1:46657/broadcast_tx_commit?tx=${txBytes}`)
  }
}
