function updateElements() {
    if ((document.getElementById("username").value) && (document.getElementById("password").value) && (document.getElementById("password").value) == (document.getElementById("passwordConfirm").value)) {
        document.getElementById("registerButton").disabled = false;
    } else {
        document.getElementById("registerButton").disabled = true;
    }
    if (document.getElementById("passwordConfirm").value) {
        if ((document.getElementById("password").value) == (document.getElementById("passwordConfirm").value)) {
            document.getElementById("passwordConfirm").classList.remove("error");
        } else {
            document.getElementById("passwordConfirm").classList.add("error");
        }
    } else {
        document.getElementById("passwordConfirm").classList.remove("error");
    }
}

document.getElementById("register").addEventListener("submit", function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch('/register', {
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
        document.getElementById("error-message").textContent = "Something went wrong. Please try again.";
    });
});