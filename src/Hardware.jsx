import AOM from "./Aom";
let Hardware = function (input) {
  let ret = [];
  for (let [key, value] of Object.entries(input.aomConfiguration)) {
    ret.push(<AOM key={key} aomConfiguration={value} />);
  }

  return ret;
};

export { Hardware };
