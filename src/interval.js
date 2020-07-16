#!/usr/bin/env node
var emoji = require('node-emoji');

function intervalFunction(){
    console.log(emoji.get('potato') + ' Nemuzu prestat!')
}

const intObj = setInterval(intervalFunction, 1000);

setTimeout(() => {
   console.log("Stopping Interval");
   clearInterval(intObj);
}, 60000);

