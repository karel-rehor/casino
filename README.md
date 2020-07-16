# casino

Test data generator for Influxdbv2 tests.

Plays unending game of craps between an array of players and sends data to influxdb. 

To Run: 

1. Define organization token in the environment.

```bash
export INFLUX_TOKEN=TEST_TOKEN
``` 

2. Set values to keys in `casino.conf.json`

3. run

`src/index.js`

Can be stopped automatically with the `ttl` property in config.  Or force stop with `CTRL+C`.
