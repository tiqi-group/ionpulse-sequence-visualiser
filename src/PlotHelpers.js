function getNumberOfEnabledChannels(channelEnabled) {
  return Object.keys(channelEnabled).reduce(
    (a, key) => {
      a[key[0] === "R" ? key.substring(0, 2) : key.substring(0, 3)] +=
        channelEnabled[key] == true;
      return a;
    },
    { RF: 0, TTL: 0, PMT: 0 },
  );
}

export const TTL_HEIGHT = 40;
export const RF_HEIGHT = 70;
export { getNumberOfEnabledChannels };
