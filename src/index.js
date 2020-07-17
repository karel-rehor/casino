#!/usr/bin/env node
const process = require('process');
const fs = require('fs');
const path = require('path');
const InfluxDBClient = require('./client/influxDBClient.js');
var emoji = require('node-emoji');
const { Players } = require('./players/players.js');
const craps = require('./craps/craps.js');

let conf = require("../casino.conf.json");
console.log("USING conf " + JSON.stringify(conf));

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
if(!fs.existsSync(conf.logdir)){
    console.info(`Createing ${conf.logdir}`);
   fs.mkdirSync(conf.logdir);
}
let lpLogFilename = setLogName(conf.logdir, 'lineproto');

const client = new InfluxDBClient(conf.influxClient.url,
    conf.influxClient.orgId,
    conf.influxClient.bucket,
    conf.influxClient.token === 'ENV' ?  process.env['INFLUX_TOKEN'] : conf.influxClient.token);

console.log('CASINO: ' + players + " " + interval + " " + ttl + " started " + new Date().toISOString());

if(conf.verbose) {
    console.log(JSON.stringify(client));
}


function setLogName(dir, base){
    let D = new Date();
    let y = D.getFullYear();
    let m = (D.getMonth() + 1) <= 9 ? `0${D.getMonth() + 1}` : D.getMonth() + 1;
    let d = D.getDate() <= 9 ? `0${D.getDate()}` : D.getDate();
    return `${dir}/${base}-${y}${m}${d}.log`;
}

//start rolling
const genIvl = setInterval(()=> {
    craps.roll();
    //console.log(players.getCurrent() + ": " + JSON.stringify(craps));
    let current = (new Date()).getTime();
    if (conf.verbose) {
        console.log(emoji.get('game_die') + emoji.get('game_die'));
    }
    recordBuffer.push(`craps,shooter=${players.getCurrent().replace(/ /g, '\\ ')},state=${craps.state},spot=${craps.spot} roll=${craps.rolled} ${current * mil2Nano}`);
    if(craps.passDice){
        players.next();
    }

    if(recordBuffer.length === writeRate){
        console.log(recordBuffer);
        lpLogFilename = setLogName(conf.logdir, 'lineproto');
        recordBuffer.forEach(rec => {
            fs.appendFile(lpLogFilename, `${rec}\n`, async err => {
                if(err){
                    console.error(`Failed to write to log ${lpLogFilename}:\n${err}`);
                }
            });
        });
        client.writeData(recordBuffer).then(async () => {
            console.log(`${recordBuffer.length} records written successfully.` );
            recordBuffer.length = 0; //empty buffer
        }).catch(async err => {
            console.error("CAUGHT ERR " + err);
            fs.appendFile(setLogName(conf.logdir, `ERROR`), `[${new Date().toISOString()}] ${err}`,
                async err => {
                   if(err){
                       console.error(`Failed to write error log to ${conf.logdir}`);
                   }
                });
        });
    }

}, interval);

// three days millis 259200000
const logCleanIvl = setInterval(async () => {
    console.log("CLEANING OLD LOGS IN " + conf.logdir);
    fs.readdir(conf.logdir, function(err, files) {
        files.forEach(function(file, index) {
            fs.stat(path.join(conf.logdir, file), function(err, stat) {
                let endTime, now;
                if (err) {
                    return console.error(err);
                }
                now = new Date().getTime();
                endTime = new Date(stat.ctime).getTime() + 3600000;
                if (now > endTime) {
                    fs.unlink(path.join(conf.logdir, file), async(err) => {
                        if(err){
                            console.error(`failed to unlink ${path.join(conf.logdir, file)}`)
                        }else{
                            console.info(`unlink ${path.join(conf.logdir, file)} success!`)
                        }
                    });

                }
            });
        });
    });

}, conf.logclean);

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
        clearInterval(logCleanIvl);
        console.log(recordBuffer);
    }, ttl);
}


