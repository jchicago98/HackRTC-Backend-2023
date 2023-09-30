const WebSocket = require('websocket').w3cwebsocket;

async function subscribeToAgencyEvents() {
    // WebSocket URI
    const uri = "wss://hackrtc.indigital.dev/text-control-api/v3";

    // Authentication credentials
    const username = "hackrtc-15";
    const password = "52f5foKH";

    // Agency information
    const agencyId = "hackrtc-15";
    const agencySecret = "52f5foKH";

    // Create an HTTP Basic Authentication header
    const basicAuth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

    // Create a WebSocket connection
    const websocket = new WebSocket(uri, null, null, { Authorization: basicAuth });

    // Event handler for when the WebSocket connection is established
    websocket.onopen = () => {
        console.log('WebSocket connection is open');

        // Subscription request
        const subscriptionRequest = {
            action: "subscribe",
            correlationId: "c455bd8e-c04e-4f53-89e6-41352da5fb2d", // Replace with your unique ID
            agencyIdentifier: agencyId,
            secret: agencySecret
        };

        // Send the subscription request as a JSON string
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

subscribeToAgencyEvents();
