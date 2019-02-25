This is a PoC to see the impact of multiple SSE subscriptions on openHAB's runtime performance.

The `docker-compose.yml` describes two containers:
  * `openhab-sse-test`: A vanilla openHAB container, with the standard installation selected and only `./openhab/items/default.items` loaded within the system.
  * `node-sse-test`: A node.js application that will select all `Switch` item types of the openHAB instance and create subscriptions on every one of them. Additionally commands are send to openHAB randomly, in order to create some traffic.