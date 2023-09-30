const WebSocket = require('websocket').w3cwebsocket;

const uri = "wss://hackrtc.indigital.dev/text-control-api/v3";
const username = "hackrtc-15";
const password = "52f5foKH";
const agencyId = "hackrtc-15";
const agencySecret = "52f5foKH";

const basicAuth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
const websocket = new WebSocket(uri, null, null, { Authorization: basicAuth });

async function registerAgency() {

    websocket.onopen = () => {
        console.log('WebSocket connection is open');

        const subscriptionRequest = {
            action: "registerAgency",
            correlationId: "c455bd8e-c04e-4f53-89e6-41352da5fb2d",
            agencyIdentifier: agencyId,
            secret: agencySecret
        };

        websocket.send(JSON.stringify(subscriptionRequest));
    };

    // Event handler for receiving messages
    websocket.onmessage = (event) => {
        console.log(`Received message: ${event.data}`);
    };

    // Event handler for WebSocket errors
    websocket.onerror = (error) => {
        console.error(`WebSocket error: ${error}`);
    };

    // Event handler for WebSocket closure
    websocket.onclose = () => {
        console.log('WebSocket connection is closed');
    };
}

registerAgency();
