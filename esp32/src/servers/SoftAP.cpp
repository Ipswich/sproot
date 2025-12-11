#include "DNSServer.h"
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <WiFi.h>

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
      <div class="small">After saving, this device will reboot and attempt to join the network.</div>
    </form>

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

    // Intercept form submit and POST via fetch using application/x-www-form-urlencoded.
    // This works around captive-portal webviews that sometimes block normal form POSTs.
    var form = document.getElementById('wifiForm');
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
      alert(json.message || 'Saved');
      }).catch(function(err){
      alert('Save failed');
      }).finally(function(){
      // keep UI responsive; reboot is triggered server-side
      submitBtn.disabled = false;
      submitBtn.textContent = 'Connect';
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

    Preferences prefs;
    prefs.begin("wifi", false);
    prefs.putString("ssid", ssid);
    prefs.putString("pass", pass);
    prefs.end();

    request->send(200, "application/json", "{\"status\":\"success\", \"message\":\"Credentials saved. Rebooting...\"}");
    Serial.println("Credentials saved! Swapping to normal server!");
  });

  server.begin();
}

void stopSoftAPMode(AsyncWebServer& server, DNSServer& dnsServer) {
  dnsServer.stop();
  server.end();
}