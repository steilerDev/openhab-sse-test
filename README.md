This is a PoC to see the impact of multiple SSE subscriptions on openHAB's runtime performance.

The `docker-compose.yml` describes two containers:
  * `openhab-sse-test`: A vanilla openHAB container, with the standard installation selected and only `./openhab/items/default.items` loaded within the system.
  * `node-sse-test`: A node.js application that will select all `Switch` item types of the openHAB instance and create subscriptions on every one of them. Additionally commands are send to openHAB randomly, in order to create some traffic.

To start the test use
```
sudo docker-compose up
```
`sudo` is only required if your docker installation requires it
  
During startup there will be some `ECONNREFUSED` or `503`, just wait a bit until the host is online.

OpenHAB does not log into stdout of docker-compose, therefore you have to manually examine the output through `./openhab/userdata/logs/openhab.log`

The openHAB console can be accessed through the following command with the default password `habopen`
```
sudo docker exec -it openhab-sse-test ssh -p 8101 openhab@localhost
```
`sudo` is only required if your docker installation requires it

When saving dumps using `dev:dump-create` those can be found in `./openhab/userdata/`

The resource usage can be monitored through
```
sudo docker stats
```
`sudo` is only required if your docker installation requires it

To change the size of the test, edit `openhab/config/items/default.items` and add/or remove `Switch` items. During startup the nodeJS application loads all available `Switch` item types and queues them.
