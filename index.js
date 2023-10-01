require("dotenv").config();
const express = require("express");
const app = express();
const axios = require("axios");
const WebSocket = require("websocket").w3cwebsocket;
let hackrtcController = express.Router();
var bodyParser = require("body-parser");
hackrtcController.use(bodyParser.urlencoded({ extended: false }));
hackrtcController.use(bodyParser.json());
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
app.use("/", hackrtcController);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const uri = "wss://hackrtc.indigital.dev/text-control-api/v3";
const username = process.env._USERNAME_;
const password = process.env._PASSWORD_;
const agencyId = process.env.AGENCY_ID;
const agencySecret = process.env.AGENCY_SECRET;
const openAIApiKey = process.env.API_KEY_OPEN_AI;
const corrId = "c455bd8e-c04e-4f53-89e6-41352da5fb2d";

const callQueueClients = new Set();

const openai = axios.create({
  baseURL: "https://api.openai.com/v1",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${openAIApiKey}`,
  },
});

const basicAuth =
  "Basic " + Buffer.from(username + ":" + password).toString("base64");
const websocket = new WebSocket(uri, null, null, { Authorization: basicAuth });

const { WebSocketServer } = require("ws");
const sockserver = new WebSocketServer({ port: 443 });
sockserver.on("connection", (ws) => {
  console.log("New client connected!");
  ws.send("connection established");
  callQueueClients.add(ws);
  ws.on("close", () => {
    console.log("Client has disconnected!");
    callQueueClients.delete(ws);
  });
  ws.on("message", (data) => {});
  ws.onerror = function () {
    console.log("websocket error");
  };
});

var registerToken = "";

// Function to send a request and wait for a response
async function sendRequestAndWait(request) {
  return new Promise((resolve, reject) => {
    // Listen for messages from the server
    websocket.addEventListener("message", (event) => {
      const response = JSON.parse(event.data);
      resolve(response); // Resolve the promise when a response is received
    });

    // Send the request
    websocket.send(JSON.stringify(request));

    // Handle errors
    websocket.addEventListener("error", (event) => {
      console.log(event);
      reject(event.error);
    });
  });
}

async function unregisterAgency() {
  const unregisterAgencyRequest = {
    action: "unregisterAgency",
    correlationId: corrId,
    registerToken: registerToken,
  };
  return await sendRequestAndWait(unregisterAgencyRequest);
}

async function registerAgency() {
  const registerAgencyRequest = {
    action: "registerAgency",
    correlationId: corrId,
    agencyIdentifier: agencyId,
    secret: agencySecret,
  };
  return await sendRequestAndWait(registerAgencyRequest);
}

async function getAgencyInfo() {
  const request = {
    action: "requestAgencyInfo",
    correlationId: corrId,
    agencyIdentifier: agencyId,
    secret: agencySecret,
  };
  const response = await sendRequestAndWait(request);
  if (response.agency !== undefined) {
    registerToken = response.agency.registerToken;
  }
  return response;
}

async function getCallQueue() {
  const request = {
    action: "requestCallQueue",
    correlationId: corrId,
    registerToken: registerToken,
  };
  return await sendRequestAndWait(request);
}

async function acceptCall(callId) {
  const request = {
    action: "acceptCall",
    correlationId: corrId,
    registerToken,
    callId,
    agentId: agencyId,
  };
  return await sendRequestAndWait(request);
}

async function endCall(callId) {
  const request = {
    action: "endCall",
    correlationId: corrId,
    registerToken,
    callId,
  };
  return await sendRequestAndWait(request);
}

async function sendMessage(callId, chatGPTMessage) {
  const sendMessageRequest = {
    action: "sendMessage",
    correlationId: corrId,
    registerToken: registerToken,
    callId: callId,
    body: chatGPTMessage,
  };
  return await sendRequestAndWait(sendMessageRequest);
}

async function subCall() {
  const request = {
    action: "subscribe",
    correlationId: corrId,
    registerToken: registerToken,
  };

  // Send the request
  websocket.send(JSON.stringify(request));

  // Listen for messages from the server
  websocket.addEventListener("message", async (event) => {
    const response = JSON.parse(event.data);
    if (response.event == "callPresented") {
      const callId = response.call.callId;
      acceptCall(callId);
    }
    if (response.event == "messageReceived") {
      //console.log(response);
      const userResponse = response.message.body;
      console.log("User Response: ", userResponse);
      const [isEnding, aiResponse] = await replyToUserChatGPT(userResponse);
      console.log("AI Response: ", aiResponse);
      console.log("Is ending: ", isEnding);

      sendMessage(response.callId, aiResponse);

      if (isEnding === "Yes" || isEnding === "Yes." || isEnding === "yes") {
        await endCall(response.callId);
      }

      sendCallQueueToClients();
    }
    // console.log(response);
  });

  // Handle errors
  websocket.addEventListener("error", (event) => {
    console.log(event);
    reject(event.error);
  });
}

// Send call queue to all WebSocket clients
async function sendCallQueueToClients() {
  const callQueueResponse = await getCallQueue();
  callQueueClients.forEach((ws) => {
    ws.send(JSON.stringify(callQueueResponse));
  });
}


websocket.onopen = async () => {
  console.log("WebSocket connection is open");

  const agencyInfoResponse = await getAgencyInfo();
  //console.log("Agency Info Response: ", agencyInfoResponse);

  subCall();
  const callQueueResponse = await getCallQueue();
  //console.log("Call Queue Response: ", callQueueResponse);
};

websocket.onclose = () => {
  console.log("WebSocket connection is closed");
};

async function sendChatGPT(content) {
  const messages = [{ role: "user", content: content }];
  return new Promise(async (resolve, reject) => {
    try {
      const chatGPTResponse = await openai.post("/chat/completions", {
        model: "gpt-3.5-turbo",
        messages,
      });
      const replyMessage = chatGPTResponse.data.choices[0].message.content;
      resolve(replyMessage);
    } catch (error) {
      console.error("Error sending message to OpenAI:", error.message);
      reject(error);
    }
  });
}

async function replyToUserChatGPT(simulatedUserMessage) {
  const isEnding = await sendChatGPT(
    simulatedUserMessage + ":" + "Is this conversation has ending context. Answer with yes or no"
  );
  const aiResponse = await sendChatGPT(
    simulatedUserMessage + ":" + "Please reply as if you were a dispatcher"
  );
  return [isEnding, aiResponse]
}

hackrtcController.post("/accept-call", async (req, res) => {
  await acceptCall(req.body.callId);
  res.send("success");
  return;
});

hackrtcController.post("/register-agency", async (req, res) => {
  await registerAgency();
  await getAgencyInfo();
  await subCall();
  res.send("Agency registered");
  return;
});

hackrtcController.put("/unregister-agency", async (req, res) => {
  await unregisterAgency();
  res.send("Agency unregistered");
  return;
});
