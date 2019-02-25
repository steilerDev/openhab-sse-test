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
        try {
            let myURL = this._getURL(`/rest/items`);
            const response = syncRequest('GET', myURL);
            this._log.debug(`Online request for openHAB (${myURL}) resulted in status code ${response.statusCode}`);
            return response.statusCode === 200;
        } catch (e) {
            this._log.error(`Error during request: ${e.message}`);
            return false;
        }
    }

    sendCommand(habItem, command) {
        let myURL = this._getURL(`/rest/items/${habItem}`);
        request({
                url: myURL,
                method: 'POST',
                body: command
            },
            function(error, response) {
                if(error) {
                    console.error(`Unable to send command to ${habItem}: ${error}`);
                } else if (response.statusCode === 404) {
                    console.error(`Unable to send command to ${habItem}: Item does not exist (404)`);
                } else if (response.statusCode === 400) {
                    console.error(`Unable to send command to ${habItem}: Item command null (400)`);
                } else {
                    console.log(`Send command ${command} to ${habItem}`);
                }
            })
    }

    getItems() {
        this._log.info(`Syncing all items & types from openHAB`);
        let myURL = this._getURL(`/rest/items`, `recursive=false&fields=name%2Ctype`);
        const response = syncRequest('GET', myURL);
        let habItems = [];
        if (response.statusCode !== 200) {
            return new Error(`Unable to get items: HTTP code ${response.statusCode}!`);
        } else {
            const items = JSON.parse(response.body);
            if(items.length > 0) {
                this._log.debug(`Got array with ${items.length} item/s`);
                items.forEach(function(item) {
                    if(item.type === "Switch") {
                        this._log.info(`Adding Switch ${item.name}`);
                        habItems.push(item.name);
                    } else {
                        this._log.warn(`Not adding ${item.type} ${item.name}, because only switches are supported in this PoC`);
                    }
                }.bind(this));
            } else {
                this._log.error(`Received no items from openHAB, unable to sync types!`);
            }
        }
        return habItems;
    }

    startSubscriptionForItem(habItem) {
        const CLOSED = 2;

        let url = this._getURL('/rest/events',`topics=smarthome/items/${key}/statechanged`);

        this._log.debug(`Starting subscription for ${habItem} with ${callbacks.length} subscribed characteristic(s)`);
        let source = new EventSource(url);

        source.onmessage = function (eventPayload) {
            let eventData = JSON.parse(eventPayload.data);
            if (eventData.type === "ItemStateChangedEvent") {
                let item = eventData.topic.replace("smarthome/items/", "").replace("/statechanged", "");
                let value = JSON.parse(eventData.payload).value;
                this._log.info(`Received new state for item ${item}: ${value}`);
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
                    msg = `Subscription closed for ${habItem} (${err.message}), trying to reconnect in 1sec...`;
                    setTimeout(function () {
                        this._log.warn(`Trying to reconnect subscription for ${habItem}...`);
                        source.close();
                        this.startSubscriptionForItem(habItem);
                    }.bind(this), 1000);
                }
                this._log.error(msg);
            }
        }.bind(this);
    }
}

module.exports = {OpenHAB};
