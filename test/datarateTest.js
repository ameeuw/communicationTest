let MultiLauncher = require('../lib/MultiLauncher')

let multiLauncher = new MultiLauncher()

async function main() {
  console.log(await multiLauncher.multirate(20))
  setTimeout(async function () {
    console.log(await multiLauncher.multirate())
  }, 10000);
}

main()
