const socket = io(`http://${IP}:3000`, {
    withCredentials: true,
    transports: ["websocket"]
});

function updateElements() {
    if((document.getElementById("username").value) && (document.getElementById("password").value)) {
        document.getElementById("loginButton").disabled = false;
    } else {
        document.getElementById("loginButton").disabled = true;
    }
}
document.getElementById("chargeButton").addEventListener("click", function (event) {
    event.preventDefault();

    const amount = parseFloat(document.getElementById("amount").value);
    socket.emit("updateBalance", (amount));

});

function loadBalance(bal) {
    document.getElementById('balance-display').textContent ='$' + bal.toLocaleString('en-US', { minimumFractionDigits: 2 });
}
        
socket.on("updateBalance", (newBalance) => {
    balance = newBalance;
    loadBalance(balance);
});