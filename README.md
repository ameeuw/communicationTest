#### 1 Test structure

The tests run in four loop structures

1. Multiple tests
2. Number of validators
3. Multiple datarate limits
4. Ascending requests per second

A test is started:


init()
  Init `rps`
  Init `numValidators`
  Init `datarate`
  Setup `platformOptions`
  Instantiate `multiLauncher`
  Reset `results`

main()
  init()
  Clear datarate limits on the devices
  Set datarate limits on the devices

test()
  Start validators
  Init loadtest options

  Sleep for 2 x `blocktime` seconds

  Run loadtest

  Add `rpsTried` to result
  Add `requestsGenerated` to `result`
  Push `result` from loadtest to `results`

  advance()

advance()
  Stop validators

  If `rps < maxRps`:
    Add `rpsSteps` to `rps`

    Sleep for `sleepSeconds`
    test()

  Else:
    Save `results` to file

    If `numValidators` < `maxNumValidators`:
      Increment `numValidatorsIndex`

      Sleep for five seconds
      main()

    Else:
      If `datarateIndex` < `maxDatarateIndex`:
        Increment `datarateIndex`
        Reset `numValidatorsIndex`

        Sleep for five seconds
        main()

      Else:
        Test finished
