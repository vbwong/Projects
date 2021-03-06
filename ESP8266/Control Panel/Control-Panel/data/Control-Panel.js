/* 
When one of the buttons is clicked, send the new button state to the ESP8266.
*/
let buttonChanged = false;

function sendButtonState(button, state) {
    console.log(button + ": " + state);
    buttonChanged = true;
    let request = new XMLHttpRequest();
    request.open("POST", "/output");
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.send("output=" + encodeURI(button) + "&state=" + state);
}

/*
When the page loads, request a JSON array from the ESP8266 that contains the states of all buttons.
When you get the JSON array, call the displayAllButtons function that adds the buttons to the HTML page,
and sets their states.
Then wait 500ms and update the button states by calling the updateStates function.
*/
let initial_states_request = new XMLHttpRequest();
initial_states_request.onreadystatechange = function () {
    if (this.readyState !== XMLHttpRequest.DONE)
        return;
    if (this.status === 200) {
        displayAllButtons(this);
    } else {
        offline();
    }
};
initial_states_request.open("GET", "/output");
initial_states_request.send();

function displayAllButtons(xhr) {   // Loops over all elements of the JSON array in the XHR response, 
    // and adds one button on the screen for each element.
    // the state of the button will be the state specified in the array.
    JSON.parse(xhr.response).forEach(displayButton);
    setTimeout(updateStates, 500);  // Update the button states over half a second
    buttonChanged = false;
}

function displayButton(state, button) {     // Add one HTML button to the web page, 
    // with the specified state ('0' == off or '1' == on) and button index
    let buttondiv = document.createElement("div");
    buttondiv.innerHTML =
        `<h2>Output ${button + 1}</h2>\
                <label class="switch">
                    <input id="${button}" type="checkbox" onchange="sendButtonState(this.id,this.checked?'1':'0');">
                    <div class="slider round"></div>
                </label>`;
    let checkbox = buttondiv.getElementsByTagName("input")[0];
    checkbox.checked = state;
    document.getElementById("buttonContainer").appendChild(buttondiv);
}

/*
Send a new request to the ESP8266 and request the JSON array from the ESP8266 that contains the states of all buttons.
If it loads correctly, use the JSON array to change the states of all buttons on the HTML page, 
by calling the updateAllButtons function.
If the request fails, call the offline function to enter the "offline" state and to notify the user that 
the information on the screen is no longer up to date, because there's no connection to the ESP8266.
If the web page was in the "offline" state, and now the request loads successfully, 
exit the "offline" state by calling the online function.
*/
function updateStates() {
    buttonChanged = false;

    let states_req = new XMLHttpRequest();
    states_req.onreadystatechange = function () {
        if (this.readyState !== XMLHttpRequest.DONE)
            return;
        if (this.status === 200) {
            updateAllButtons(this);
            if (is_offline) {
                online();
            }
        } else {
            offline();
        }
    };
    states_req.open("GET", "/output");
    states_req.send();
}

/* 
If no button was pressed since the start of the request, use the JSON response data to update all buttons.
Then schedule the next response in half a second.
If a button was pressed since the start of the request, the response may contain the old button states
(the state before the button press was registered by the ESP8266),
so ignore the response data, and send a new request right away.
*/
function updateAllButtons(xhr) {
    if (buttonChanged) {
        updateStates();
    } else {
        JSON.parse(xhr.response).forEach(updateButton);
        setTimeout(updateStates, 500);
    }
}

function updateButton(state, button) {  // change the state of a button with a given index
    let checkbox = document.getElementById(button.toString());
    checkbox.checked = state;
}

/*
When there is no connection, add a div to the bottom of the page to notify the user that 
the information on the screen is no longer up to date, because there's no connection to the ESP8266.
Also blur the control panel, and make it non-clickable.
When the "Retry" button is pressed, send a new request by calling the updateStates function.   
*/
let is_offline = false;

function offline() {
    if (is_offline)
        return;
    is_offline = true;
    let offlineDiv = document.createElement("div");
    offlineDiv.id = "offlineDiv";
    offlineDiv.appendChild(document.createTextNode("Connection lost"));

    let retryButton = document.createElement("button");
    retryButton.appendChild(document.createTextNode("Retry"));
    retryButton.onclick = updateStates;

    offlineDiv.appendChild(retryButton);

    document.body.appendChild(offlineDiv);

    let buttonContainer = document.getElementById("buttonContainer");
    buttonContainer.style.filter = "blur(3px)";
    buttonContainer.style.pointerEvents = "none";
}

/*
When the control panel is back online, remove the div with the "Connection lost" notification,
unblur the control panel, and make it clickable again.
*/
function online() {
    is_offline = false;
    document.body.removeChild(document.getElementById("offlineDiv"));
    let buttonContainer = document.getElementById("buttonContainer");
    buttonContainer.style.filter = "none";
    buttonContainer.style.pointerEvents = "auto";
}