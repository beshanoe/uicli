const uicliSocket = new WebSocket("ws://localhost:3000/__uicli");

// Connection opened
uicliSocket.addEventListener("open", function(event: any) {
//   uicliSocket.send("Hello Server!");
});

// Listen for messages
uicliSocket.addEventListener("message", function(event: any) {
  window.console.log("Message from server ", event.data);
});

module.exports = uicliSocket;
