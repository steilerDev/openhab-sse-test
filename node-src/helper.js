'use strict';

const {URL} = require('url');
const request = require('request');
const EventSource = require('eventsource');
const syncRequest = require('sync-request');

class OpenHAB {

    constructor(hostname, port) {
        this._log = console;
        this._hostname = hostname;
        this._port = port;
    }

    _getURL(pathname, search) {
        let newURL = new URL(this._hostname);
        newURL.port = this._port;
        if(pathname) {
            newURL.pathname = pathname;
        }
        if(search) {
            newURL.search = search;
        }
        return newURL.href;
    }

    isOnline() {
        let myURL = this._getURL(`/rest/items`);
        const response = syncRequest('GET', myURL);
        this._log.debug(`Online request for openHAB (${myURL}) resulted in status code ${response.statusCode}`);
        return response.statusCode === 200;
    }

    sendCommand(habItem, command, callback) {
        let myURL = this._getURL(`/rest/items/${habItem}`);
        request({
                url: myURL,
                method: 'POST',
                body: command
            },
            function(error, response) {
                if(error) {
                    callback(error);
                } else if (response.statusCode === 404) {
                    callback(new Error(`Item does not exist!`));
                } else if (response.statusCode === 400) {
                    callback(new Error(`Item command null`));
                } else {
                    callback(null);
                }
            })
    }

    getItems() {
        this._log.info(`Syncing all items & types from openHAB`);
        let myURL = this._getURL(`/rest/items`, `recursive=false&fields=name%2Ctype`);
        const response = syncRequest('GET', myURL);
        if (response.statusCode !== 200) {
            return new Error(`Unable to get items: HTTP code ${response.statusCode}!`);
        } else {
            const items = JSON.parse(response.body);
            if(items.length > 0) {
                this._log.debug(`Got array with ${items.length} item/s`);

                items.forEach(function(item) {
                    if(item.type.includes(":")) {
                        if(item.type.startsWith("Number")) {
                            this._log.debug(`Item ${item.name} is a number with unit measurements (${item.type}), dropping unit and adding to type cache`);
                            this._typeCache.set(item.name, "Number");
                        } else {
                            this._log.debug(`Item ${item.name} seems to have a unit measurement (${item.type}), but is not a number, adding to type cache!`);
                            this._typeCache.set(item.name, item.type);
                        }
                    } else {
                        this._log.debug(`Got item ${item.name} of type ${item.type}, adding to type cache`);
                        this._typeCache.set(item.name, item.type);
                    }
                }.bind(this));
            } else {
                this._log.error(`Received no items from openHAB, unable to sync types!`);
            }
        }
    }

    syncItemValues() {
        this._log.info(`Syncing all item values from openHAB`);
        let myURL = this._getURL(`/rest/items`, `recursive=false&fields=name%2Cstate`);
        const response = syncRequest('GET', myURL);
        if (response.statusCode !== 200) {
            return new Error(`Unable to get item values: HTTP code ${response.statusCode}!`);
        } else {
            const items = JSON.parse(response.body);
            if(items.length > 0) {
                this._log.debug(`Got array with ${items.length} item/s`);
                items.forEach(function(item) {
                    if(this._subscriptions[item.name] !== undefined) {






                        this._log.debug(`Got item ${item.name} with value ${item.state}, adding to value cache`);
                        this._valueCache.set(item.name, item.state);
                    } else {
                        this._log.debug(`Got item ${item.name} with value ${item.state}, not adding to value cache, since it is not linked to homebridge!`);
                    }
                }.bind(this));
            } else {
                this._log.error(`Received no items from openHAB, unable to sync states!`);
            }
        }
    }


    subscribe(habItem, callback) {
        if(!this._subscriptions[habItem]) {
            this._subscriptions[habItem] = [];
        }
        this._log.debug(`Queueing subscription for ${habItem}`);
        this._subscriptions[habItem].push(callback);
    }

    startSubscription() {
        let myURL = this._getURL('/rest/events',`topics=smarthome/items/`);
        const CLOSED = 2;

        let source = new EventSource(myURL);
        source.onmessage = function (eventPayload) {
            let eventData = JSON.parse(eventPayload.data);
            if (eventData.type === "ItemStateChangedEvent") {
                let item = eventData.topic.replace("smarthome/items/", "").replace("/statechanged", "");
                let value = JSON.parse(eventData.payload).value;

                if(this._subscriptions[item] !== undefined) {
                    this._log.debug(`Received new state for item ${item}: ${value}`);
                    this._valueCache.set(item, value);
                    this._subscriptions[item].forEach(function(callback){
                        callback(value, item);
                    });
                } else {
                    this._log.debug(`Ignoring new state for item ${item} (${value}), because it is not registered with homebridge`);
                }
            }
        }.bind(this);
        source.onerror = function (err) {
            if (err.message) {
                let msg;
                if (err.status) {
                    msg = `${err.status}: ${err.message}`;
                } else {
                    msg = err.message;
                }
                if (source.readyState === CLOSED || err.status === 404) {
                    msg = `Subscription service closed, trying to reconnect in 1sec...`;
                    setTimeout(function () {
                        this._log.warn(`Trying to reconnect subscription service...`);
                        source.close();
                        this.startSubscription();
                    }.bind(this), 1000);
                }
                this._log.error(msg);
            }
        }.bind(this);
    }
}

module.exports = {OpenHAB};
