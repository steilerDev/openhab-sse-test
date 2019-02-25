const {OpenHAB} = require('./helper');
const sleep = require('sleep');

setTimeout(function () {
    console.log("Hello world")
}, 1000);

let openhab = new OpenHAB("http://openhab-sse-test", 8080);

let online = false;
while(!online) {
    sleep.sleep(2);
    console.log(`Checking if openHAB host is online...`);
    online = openhab.isOnline();
}
sleep.sleep(10);
console.log(`openHAB is online`);







