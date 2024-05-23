let setValidatedProxy = {};
function setConnectionState(state) {
  if (setValidatedProxy.func !== undefined) {
    setValidatedProxy.func(state);
  }
}
const libraryAddressDefault = "localhost";
const libraryPortDefault = "8003";

export {
  setConnectionState,
  setValidatedProxy,
  libraryAddressDefault,
  libraryPortDefault,
};
