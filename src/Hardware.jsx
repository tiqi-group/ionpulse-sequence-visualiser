import AOM from "./Aom";
let Hardware = function (input) {
  let ret = [];
  for (let [key, value] of Object.entries(input.channelDescription)) {
    if (value.group == "RF") {
      ret.push(<AOM key={key} aomConfiguration={value} />);
    }
  }

  return ret;
};

export { Hardware };
