const {OpenHAB} = require('./helper');
const sleep = require('sleep');

const minTimeBetweenCommands = 30 * 1000; // 30sec
const maxTimeBetweenCommands = 3 * 60 * 1000; // 3 Mins

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

let items = openhab.getItems();

for (var i in items) {
    console.log(`Starting subscription for ${i}`);
    openhab.startSubscriptionForItem(i);
    console.log(`Starting command loop for ${i}`);

    (function loop() {
        let rand = Math.round(Math.random() * (maxTimeBetweenCommands - minTimeBetweenCommands)) + minTimeBetweenCommands;
        console.log(`Starting timeout for ${i} with ${rand} ms`);
        setTimeout(function() {
            openhab.sendCommand(i, "ON");
            setTimeout(function () {
                openhab.sendCommand(i, "OFF");
                loop();
            }, rand);
        }, rand);
    }());
}









