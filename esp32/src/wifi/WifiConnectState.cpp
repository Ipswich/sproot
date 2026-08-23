#include "WifiConnectState.h"

static WifiConnectState currentState = WifiConnectState::Idle;
static unsigned long stateChangedAt = 0;
static bool immediateConnectRequested = false;

WifiConnectState getWifiConnectState()
{
  return currentState;
}

void setWifiConnectState(WifiConnectState state)
{
  currentState = state;
}

void requestImmediateConnect()
{
  immediateConnectRequested = true;
}

bool consumeImmediateConnectRequest()
{
  bool requested = immediateConnectRequested;
  immediateConnectRequested = false;
  return requested;
}

unsigned long getWifiStateChangedAt()
{
  return stateChangedAt;
}

void setWifiStateChangedAt(unsigned long ms)
{
  stateChangedAt = ms;
}
