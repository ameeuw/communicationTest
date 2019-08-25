/**
 * @file argparse.js
 * @author Arne Meeuw <arne.meeuw@gmail.com>
 * @version 0.1
 */

let ArgumentParser = require('argparse').ArgumentParser;

exports.parser = new ArgumentParser({
  version: '0.2.1',
  addHelp:true,
  description: 'CLI tool for remote management'
})

this.parser.addArgument(
  ['-o', '--options'] ,
  {
    defaultValue: undefined,
    help: "Path to test options JSON file. (Default: undefined)"
  }
)

this.parser.addArgument(
  ['-u', '--unprotected'] ,
  {
    action: 'storeTrue',
    defaultValue: false,
    help: "Disable SIGINT interrupt. (Default false)"
  }
)
