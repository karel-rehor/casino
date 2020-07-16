#!/usr/bin/env node
const process = require('process');
const InfluxDBClient = require('./client/influxDBClient.js');
var emoji = require('node-emoji');
const { Players } = require('./players/players.js');
const craps = require('./craps/craps.js');

let conf = require("../casino.conf.json");
console.log("DEBUG conf " + JSON.stringify(conf));

let players = (typeof conf.players !== 'undefined')? new Players(conf.players) : new Players(['Fred', 'Gina', 'Harry', 'Ilona']);
let interval = (typeof conf.interval !== 'undefined')? conf.interval : 1000;
let writeIvl;
let ttl = (typeof conf.ttl !== 'undefined')? conf.ttl : 60000;
//write to influxdb after x records are generated
let writeRate = (typeof conf.influxClient.writeRate !== 'undefined')? conf.influxClient.writeRate : 5 * 60 * 60 * 1000; //default to 5 min
let writeOffset = (typeof conf.influxClient.writeOffset !== 'undefined')? conf.influxClient.writeOffset : 1000;

/* experim
if(writeRate < interval){
    throw `Record writing rate (writeRate: ${writeRate}) cannot be shorter than record generation rate (interval: ${interval})`;
}*/

let recordBuffer = [];
const mil2Nano = 1000000;

const client = new InfluxDBClient(conf.influxClient.url,
    conf.influxClient.orgId,
    conf.influxClient.bucket,
    conf.influxClient.token === 'ENV' ?  process.env['INFLUX_TOKEN'] : conf.influxClient.token);

console.log('CASINO: ' + players + " " + interval + " " + ttl + " started " + new Date().toISOString());

if(conf.verbose) {
    console.log(JSON.stringify(client));
}

/*
const queryPromise = new Promise(async (resolve,reject) => {
   let qresult = await client.queryData();
    console.log("DEBUG qresult: \n" + JSON.stringify(qresult));
});
*/

//start rolling
const genIvl = setInterval(()=>{
    craps.roll();
    //console.log(players.getCurrent() + ": " + JSON.stringify(craps));
    let current = (new Date()).getTime();
    if(conf.verbose) {
        console.log(emoji.get('game_die') + emoji.get('game_die'));
    }
    recordBuffer.push(`craps,shooter=${players.getCurrent().replace(/ /g, '\\ ')},state=${craps.state},spot=${craps.spot} roll=${craps.rolled} ${current * mil2Nano}`);
    if(craps.passDice){
        players.next();
    }

    if(recordBuffer.length === writeRate){
        console.log(recordBuffer);
        client.writeData(recordBuffer).then(async () => {
            console.log(`${recordBuffer.length} records written successfully.` );
            recordBuffer.length = 0; //empty buffer
        }).catch(async err => {
            console.error(err);
        });
    }

}, interval);

//start write interval with offset
/* experim - N.B. loses sync and can drop records
setTimeout(() => {
    writeIvl = setInterval(async () => {
        //write records to influx
        console.log(recordBuffer);
        client.writeData(recordBuffer).then(async () => {
            console.log(`${recordBuffer.length} records written successfully.` );
            recordBuffer.length = 0;
        }).catch(async err => {
            console.error(err);
        });
        //clear buffer on successful write
    }, writeRate);
}, writeOffset);
*/

//if ttl < 1 run infinitely.
if(ttl > 0) {
    setTimeout(() => {
        console.log("Stopping craps");
        clearInterval(genIvl);
        clearInterval(writeIvl);
        console.log(recordBuffer);
    }, ttl);
}



/*
const writePromise = new Promise(async (resolve, reject) => {
    await client.writeData().then(() => {
        resolve('Data written successfully!')
    }).catch(async err => {
        reject(err);
    });
});

writePromise.then(async (msg) => {

    console.log(msg);

    console.log("NOW QUERYING");

    await new Promise(async (resolve, reject) => {
        let qresult = await client.queryData().catch(async err => {
            console.err("Error on Query: " + err);
        });
        console.log("DEBUG qresult: \n" + JSON.stringify(qresult));
    });
});
*/


