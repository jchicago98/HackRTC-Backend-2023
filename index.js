const WebSocket = require("websocket").w3cwebsocket;

const uri = "wss://hackrtc.indigital.dev/text-control-api/v3";
const username = "hackrtc-34";
const password = "smH5Mnv1";
const agencyId = "hackrtc-34";
const agencySecret = "smH5Mnv1";

const basicAuth =
  "Basic " + Buffer.from(username + ":" + password).toString("base64");
const websocket = new WebSocket(uri, null, null, { Authorization: basicAuth });

var registerToken = "";

async function registerAgency() {
  websocket.onopen = () => {
    console.log("WebSocket connection is open");

    // const sub = {
    //   action: "subscribe",
    //   correlationId: "c455bd8e-c04e-4f53-89e6-41352da5fb2d",
    //   registerToken: "b12edf7f-23cc-44c9-87ae-18f8ad5fc3fa",
    // };
    const register = {
      action: "requestAgencyInfo",
      correlationId: "c455bd8e-c04e-4f53-89e6-41352da5fb2d",
      agencyIdentifier: agencyId,
      secret: agencySecret,
    };

    // websocket.send(JSON.stringify(sub));
    websocket.send(JSON.stringify(register));
  };

  // Event handler for receiving messages
  websocket.onmessage = (event) => {
    console.log(event.data);
    console.log(JSON.parse(event.data));
    if (JSON.parse(event.data).agency !== undefined) {
      console.log(JSON.parse(event.data).agency.registerToken);
      registerToken = JSON.parse(event.data).agency.registerToken

    const subCalls = {
        "action": "requestCallInfo",
        "correlationId": "c455bd8e-c04e-4f53-89e6-41352da5fb2d",
        registerToken:registerToken,
        callId:"ude87vmclqg9bqp7rth2"
      };
      console.log(subCalls)
      websocket.send(JSON.stringify(subCalls));
    } else if (JSON.parse(event.data).callInfo !== undefined) {
      console.log("call queue received")
      // for (callq in JSON.parse(event.data).callQueue) {
      //   console.log(callq)
      // }
    }
  };

  // Event handler for WebSocket errors
  websocket.onerror = (error) => {
    console.error(`WebSocket error: ${error}`);
  };

  // Event handler for WebSocket closure
  websocket.onclose = () => {
    console.log("WebSocket connection is closed");
  };
}

registerAgency();
