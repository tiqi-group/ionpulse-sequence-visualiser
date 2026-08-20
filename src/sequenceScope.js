// Optional sequence scope requested via URL parameters (set by ICON's data
// view to inspect the sequence of a past experiment run):
//   ?jobId=<n>              last sequence of that job
//   ?jobId=<n>&datapoint=<i> sequence of a specific data point of that job
// Without parameters the latest executed sequence is shown.
const params = new URLSearchParams(window.location.search);

function intParam(name) {
  const value = params.get(name);
  return value !== null && value !== "" ? Number(value) : null;
}

export const sequenceScope = {
  jobId: intParam("jobId"),
  datapoint: intParam("datapoint"),
};

export const isScoped = sequenceScope.jobId !== null;
