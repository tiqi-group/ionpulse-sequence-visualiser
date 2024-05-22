let setValidatedProxy = {};
function setConnectionState(state) {
  if (setValidatedProxy.func !== undefined) {
    setValidatedProxy.func(state);
  }
}

export { setConnectionState, setValidatedProxy };
