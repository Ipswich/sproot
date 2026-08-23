#pragma once

enum class WifiConnectState { Idle, Connecting, ConnectedGrace, Failed };

WifiConnectState getWifiConnectState();
void setWifiConnectState(WifiConnectState state);

// Called by the Soft AP /save handler to request an immediate connection
// attempt on the next loop() iteration, bypassing the periodic check
// interval. Only takes effect once the state machine is Idle.
void requestImmediateConnect();

// Called once per loop() iteration while Idle; returns true exactly once
// per requestImmediateConnect() call and clears the flag.
bool consumeImmediateConnectRequest();

unsigned long getWifiStateChangedAt();
void setWifiStateChangedAt(unsigned long ms);
