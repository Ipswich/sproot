#include "DNSServer.h"
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <WiFi.h>
#include "wifi/WifiConnectState.h"
#include "utils/DeviceIdentity.h"

const byte DNS_PORT = 53;

void startSoftAPMode(AsyncWebServer& server, DNSServer& dnsServer)
{ 
  uint64_t chipid = ESP.getEfuseMac();
  char networkName[32];
  snprintf(networkName, sizeof(networkName), "Sproot-esp32-%04llX", chipid & 0xFFFF); // Should give something like sensor-1A2B

  Serial.println("Starting Soft AP mode...");

  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(IPAddress(192,168,1,1), IPAddress(192,168,1,1), IPAddress(255,255,255,0));
  WiFi.softAP(networkName, "");

  dnsServer.start(DNS_PORT, "*", IPAddress(192,168,1,1));

  // See the matching comment in Normal.cpp: routes are re-registered every time this mode
  // starts, and AsyncWebServer::on() never frees previously-registered handlers, so this reset
  // is required to avoid leaking handlers on every Normal<->Soft AP mode switch.
  server.reset();

  server.on("/generate_204", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/html", "<meta http-equiv='refresh' content='0; url=/' />");
  });
  server.on("/hotspot-detect.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/html", "<meta http-equiv='refresh' content='0; url=/' />");
  });
  server.on("/library/test/success.html", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/html", "<meta http-equiv='refresh' content='0; url=/' />");
  });

  server.onNotFound([](AsyncWebServerRequest *request){
    request->redirect("/");
  });

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/html",
      R"rawliteral(
    <!doctype html>
    <html>
    <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
    html,body{height:100%;margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;color:#333}
    .wrap{min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{width:100%;max-width:420px;background:#fff;padding:20px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,0.08)}
    h1{margin:0 0 12px;font-size:20px;text-align:center}
    p.desc{margin:0 0 16px;font-size:13px;color:#666;text-align:center}
    label{display:block;font-size:13px;margin-bottom:6px}
    input[type=text], input[type=password]{width:100%;padding:12px 12px;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box}
    .field{margin-bottom:12px}
    .row{display:flex;gap:8px}
    .toggle-btn{background:#eee;border:1px solid #ddd;padding:10px 12px;border-radius:8px;cursor:pointer;font-size:13px}
    .submit{width:100%;padding:12px;border:none;background:#007bff;color:#fff;border-radius:8px;font-size:16px;cursor:pointer}
    .small{font-size:12px;color:#888;margin-top:10px;text-align:center}
    .status{display:none;text-align:center}
    .spinner{width:36px;height:36px;margin:0 auto 16px;border:4px solid #ddd;border-top-color:#007bff;border-radius:50%;animation:spin 0.8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .status-text{font-size:14px;margin-bottom:16px}
    .retry-btn{width:100%;padding:12px;border:none;background:#007bff;color:#fff;border-radius:8px;font-size:16px;cursor:pointer;display:none}
    @media (max-width:360px){.card{padding:16px}}
    </style>
    </head>
    <body>
    <div class="wrap">
    <div class="card">
    <h1>Sproot ESP32 Setup</h1>
    <p class="desc">Connect this device to your Wi-Fi network.</p>

    <!-- Use JS submission to improve compatibility with mobile captive-portal webviews -->
    <form id="wifiForm">
      <div class="field">
      <label for="ssid">SSID</label>
      <input id="ssid" name="ssid" type="text" placeholder="Network name" required>
      </div>
      <div class="field">
      <label for="pass">Password</label>
      <div class="row">
      <input id="pass" name="pass" type="password" placeholder="Network password" autocomplete="new-password">
      <button type="button" id="pwToggle" class="toggle-btn" aria-pressed="false">Show</button>
      </div>
      </div>
      <button class="submit" type="submit">Connect</button>
      <div class="small">After saving, this device will attempt to join the network.</div>
    </form>

    <div id="statusView" class="status">
      <div id="statusSpinner" class="spinner"></div>
      <div id="statusText" class="status-text">Attempting to connect to network...</div>
      <button id="retryBtn" class="retry-btn" type="button">Try Again</button>
    </div>

    </div>
    </div>

    <script>
    (function(){
    var pw = document.getElementById('pass');
    var btn = document.getElementById('pwToggle');
    btn.addEventListener('click', function(){
      var isHidden = pw.type === 'password';
      pw.type = isHidden ? 'text' : 'password';
      btn.textContent = isHidden ? 'Hide' : 'Show';
      btn.setAttribute('aria-pressed', String(isHidden));
    });

    var form = document.getElementById('wifiForm');
    var statusView = document.getElementById('statusView');
    var statusSpinner = document.getElementById('statusSpinner');
    var statusText = document.getElementById('statusText');
    var retryBtn = document.getElementById('retryBtn');
    var pollTimer = null;
    var sawConnectingOrConnected = false;

    function showStatus(spinning, text, showRetry){
      form.style.display = 'none';
      statusView.style.display = 'block';
      statusSpinner.style.display = spinning ? 'block' : 'none';
      statusText.textContent = text;
      retryBtn.style.display = showRetry ? 'block' : 'none';
    }

    function stopPolling(){
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    function pollStatus(){
      fetch('/connection-status?t=' + Date.now()).then(function(resp){ return resp.json(); }).then(function(json){
        if (json.state === 'connecting') {
          sawConnectingOrConnected = true;
          showStatus(true, 'Attempting to connect to network...', false);
        } else if (json.state === 'connected') {
          sawConnectingOrConnected = true;
          stopPolling();
          showStatus(false, 'Connected! This device should now be accessible within the Sproot App. Alternatively, visit http://' + json.hostname + ' or http://' + json.ip + ' from a device on this network.', false);
        } else if (json.state === 'failed') {
          stopPolling();
          showStatus(false, "Couldn't connect. Check the password and try again.", true);
        } else if (json.state === 'idle') {
          // A fresh attempt hasn't started polling into 'connecting' yet; keep spinning.
          showStatus(true, 'Attempting to connect to network...', false);
        } else {
          stopPolling();
          showStatus(false, "Couldn't connect. Check the password and try again.", true);
        }
      }).catch(function(){
        if (sawConnectingOrConnected) {
          stopPolling();
          showStatus(false, 'The device appears to have joined your network and this hotspot has turned off. Visit the address above from a device on your home network.', false);
        }
      });
    }

    retryBtn.addEventListener('click', function(){
      stopPolling();
      statusView.style.display = 'none';
      form.style.display = 'block';
    });

    // Intercept form submit and POST via fetch using application/x-www-form-urlencoded.
    // This works around captive-portal webviews that sometimes block normal form POSTs.
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      var data = new URLSearchParams(new FormData(form));

      fetch('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data.toString()
      }).then(function(resp){
      return resp.json().catch(function(){ return { status: 'error', message: 'No JSON response' }; });
      }).then(function(json){
      submitBtn.disabled = false;
      submitBtn.textContent = 'Connect';
      if (json.status === 'success') {
        sawConnectingOrConnected = false;
        showStatus(true, 'Attempting to connect to network...', false);
        pollTimer = setInterval(pollStatus, 1500);
        pollStatus();
      } else {
        alert(json.message || 'Save failed');
      }
      }).catch(function(err){
      submitBtn.disabled = false;
      submitBtn.textContent = 'Connect';
      alert('Save failed');
      });
    });
    })();
    </script>
    </body>
    </html>
    )rawliteral"
    );
  });

  server.on("/save", HTTP_POST, [](AsyncWebServerRequest *request) {
    String ssid, pass;
    if (request->hasParam("ssid", true)) ssid = request->getParam("ssid", true)->value();
    if (request->hasParam("pass", true)) pass = request->getParam("pass", true)->value();

    if (ssid.length() == 0) {
      request->send(400, "application/json", "{\"status\":\"error\",\"message\":\"SSID is required\"}");
      return;
    }

    Preferences prefs;
    prefs.begin("wifi", false);
    prefs.putString("ssid", ssid);
    prefs.putString("pass", pass);
    prefs.end();

    requestImmediateConnect();

    request->send(200, "application/json", "{\"status\":\"success\",\"message\":\"Credentials saved. Attempting to connect...\"}");
    Serial.println("Credentials saved! Requesting immediate connection attempt.");
  });

  server.on("/connection-status", HTTP_GET, [](AsyncWebServerRequest *request) {
    WifiConnectState state = getWifiConnectState();
    const char *stateStr;
    switch (state) {
      case WifiConnectState::Idle: stateStr = "idle"; break;
      case WifiConnectState::Connecting: stateStr = "connecting"; break;
      case WifiConnectState::ConnectedGrace: stateStr = "connected"; break;
      case WifiConnectState::Failed: stateStr = "failed"; break;
    }

    char json[128];
    if (state == WifiConnectState::ConnectedGrace) {
      snprintf(json, sizeof(json), "{\"state\":\"connected\",\"hostname\":\"%s.local\",\"ip\":\"%s\"}",
               getDeviceHostname().c_str(), WiFi.localIP().toString().c_str());
    } else {
      snprintf(json, sizeof(json), "{\"state\":\"%s\"}", stateStr);
    }

    request->send(200, "application/json", json);
  });

  server.begin();
}

void stopSoftAPMode(AsyncWebServer& server, DNSServer& dnsServer) {
  dnsServer.stop();
  server.end();
}