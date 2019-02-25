const {OpenHAB} = require('./helper');
const sleep = require('sleep');

const minTimeBetweenCommands = 30 * 1000; // 30sec
const maxTimeBetweenCommands = 3 * 60 * 1000; // 3 Mins

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

let arrayLength = items.length;
for (var i = 0; i < arrayLength; i++) {
    let thisItem = items[i];
    console.log(`Starting subscription for ${thisItem}`);
    openhab.startSubscriptionForItem(thisItem);
    console.log(`Starting command loop for ${thisItem}`);

    (function loop() {
        let rand = Math.round(Math.random() * (maxTimeBetweenCommands - minTimeBetweenCommands)) + minTimeBetweenCommands;
        console.debug(`Starting timeout for ${thisItem} with ${rand} ms`);
        setTimeout(function() {
            openhab.sendCommand(thisItem, "ON");
            setTimeout(function () {
                openhab.sendCommand(thisItem, "OFF");
                loop();
            }, rand);
        }, rand);
    }());
}









