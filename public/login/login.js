function updateElements() {
    if((document.getElementById("username").value) && (document.getElementById("password").value)) {
        document.getElementById("loginButton").disabled = false;
    } else {
        document.getElementById("loginButton").disabled = true;
    }
}

document.getElementById("login").addEventListener("submit", function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({username: username, password: password})
    })
    .then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        } else {
            return response.json();
        }
    })
    .then(data => {
        if (data.error) {
            document.getElementById(data.type).value = "";
            document.getElementById(data.type).placeholder = data.error;
            document.getElementById(data.type).classList.add("error");
            document.getElementById(data.type).addEventListener("focus", function() {
                document.getElementById(data.type).classList.remove("error");
                document.getElementById(data.type).placeholder = data.type;
            });
        }
    })
    .catch(error => {
        console.error("Error:", error);
    });
});